"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/require-permission";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import { Prisma } from "@prisma/client";
import { writeNotification } from "@/core/notifications/write-notification";
import { resolveBaseQuantity } from "@/core/inventory/resolve-base-quantity";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SalesActionState =
  | { success: true; invoiceId: string }
  | { success: true }
  | { error: string }
  | null;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const lineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  unitId: z.string().min(1, "Unit is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().min(0, "Unit price must be non-negative"),
  discount: z.coerce.number().min(0).max(100).optional(),
});

const createSalesInvoiceSchema = z.object({
  customerId: z.string().optional(),
  notes: z.string().max(1000).optional(),
  lines: z.array(lineSchema).min(1, "At least one line item is required"),
});

// ---------------------------------------------------------------------------
// createSalesInvoiceAction
// ---------------------------------------------------------------------------

export async function createSalesInvoiceAction(
  _prevState: SalesActionState,
  formData: FormData
): Promise<SalesActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "sales.invoice.create");
  } catch {
    return { error: "You do not have permission to create sales invoices." };
  }

  // Parse line count
  const lineCountRaw = formData.get("lineCount");
  const lineCount = parseInt(typeof lineCountRaw === "string" ? lineCountRaw : "0", 10);
  if (isNaN(lineCount) || lineCount < 1) {
    return { error: "At least one line item is required." };
  }

  const rawLines = Array.from({ length: lineCount }, (_, i) => ({
    productId: formData.get(`line_productId_${i}`),
    unitId: formData.get(`line_unitId_${i}`),
    quantity: formData.get(`line_quantity_${i}`),
    unitPrice: formData.get(`line_unitPrice_${i}`),
    discount: formData.get(`line_discount_${i}`) || undefined,
  }));

  const parsed = createSalesInvoiceSchema.safeParse({
    customerId: formData.get("customerId") || undefined,
    notes: formData.get("notes") || undefined,
    lines: rawLines,
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten();
    const firstFieldError = Object.values(errors.fieldErrors)[0]?.[0];
    const firstLineError = errors.fieldErrors.lines?.[0];
    return { error: firstFieldError ?? firstLineError ?? "Invalid form data." };
  }

  const { customerId, notes, lines } = parsed.data;

  // Verify customer belongs to org (if provided)
  if (customerId) {
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { organizationId: true },
    });
    if (!customer || customer.organizationId !== session.orgId) {
      return { error: "Selected customer not found." };
    }
  }

  // Calculate totals for each line and overall
  const lineData = lines.map((line) => {
    const discountFactor = line.discount ? 1 - line.discount / 100 : 1;
    const totalPrice = line.quantity * line.unitPrice * discountFactor;
    return {
      productId: line.productId,
      unitId: line.unitId,
      quantity: new Prisma.Decimal(line.quantity),
      unitPrice: new Prisma.Decimal(line.unitPrice.toFixed(2)),
      totalPrice: new Prisma.Decimal(totalPrice.toFixed(2)),
      discount: line.discount != null ? new Prisma.Decimal(line.discount.toFixed(2)) : null,
    };
  });

  const totalAmount = lineData.reduce((sum, l) => sum + Number(l.totalPrice), 0);

  const invoice = await db.invoice.create({
    data: {
      type: "SALE",
      status: "DRAFT",
      warehouseId: session.warehouseId,
      customerId: customerId ?? null,
      totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
      notes: notes ?? null,
      actorId: session.employeeId,
      lines: {
        create: lineData,
      },
    },
    select: { id: true },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "sales.invoice.create",
    entityType: "Invoice",
    entityId: invoice.id,
    after: {
      type: "SALE",
      status: "DRAFT",
      customerId: customerId ?? null,
      totalAmount: totalAmount.toFixed(2),
      lineCount: lines.length,
    },
  });

  revalidatePath("/dashboard/sales");

  return { success: true, invoiceId: invoice.id };
}

// ---------------------------------------------------------------------------
// confirmSalesInvoiceAction
// ---------------------------------------------------------------------------

export async function confirmSalesInvoiceAction(
  _prevState: SalesActionState,
  formData: FormData
): Promise<SalesActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "sales.invoice.confirm");
  } catch {
    return { error: "You do not have permission to confirm sales invoices." };
  }

  const invoiceId = formData.get("invoiceId");
  if (!invoiceId || typeof invoiceId !== "string") {
    return { error: "Invoice ID is required." };
  }

  let confirmedAt: Date;

  try {
    await db.$transaction(async (tx) => {
      // 1. Fetch invoice with lines
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          lines: {
            include: {
              product: { select: { name: true, defaultUnitId: true } },
            },
          },
        },
      });

      if (!invoice) throw new Error("Invoice not found.");
      if (invoice.warehouseId !== session.warehouseId) throw new Error("Invoice not found.");
      if (invoice.type !== "SALE") throw new Error("This is not a sales invoice.");
      if (invoice.status !== "DRAFT") throw new Error(`Invoice is already ${invoice.status.toLowerCase()}.`);

      // 2. Precompute base quantities for all lines (convert from invoice unit to default unit)
      const baseQtys: number[] = [];
      for (const line of invoice.lines) {
        const baseQty = await resolveBaseQuantity(
          tx,
          line.productId,
          line.product.defaultUnitId,
          line.unitId,
          Number(line.quantity)
        );
        baseQtys.push(baseQty);
      }

      // 3. Pre-check: verify sufficient stock for all lines (balance is stored in default unit)
      for (let i = 0; i < invoice.lines.length; i++) {
        const line = invoice.lines[i];
        const baseRequested = baseQtys[i];

        const balance = await tx.inventoryBalance.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: session.warehouseId,
              productId: line.productId,
            },
          },
          select: { currentQuantity: true },
        });

        const available = balance ? Number(balance.currentQuantity) : 0;

        if (available < baseRequested) {
          throw new Error(
            `Insufficient stock for product: ${line.product.name} (available: ${available.toFixed(4)}, requested: ${baseRequested.toFixed(4)})`
          );
        }
      }

      // 4. Apply stock movements for each line (inline, atomic)
      for (let i = 0; i < invoice.lines.length; i++) {
        const line = invoice.lines[i];
        const qty = Number(line.quantity);
        const baseQty = baseQtys[i];
        const delta = -Math.abs(baseQty); // SALE_OUT decreases stock in base units

        // Upsert balance
        await tx.inventoryBalance.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: session.warehouseId,
              productId: line.productId,
            },
          },
          create: {
            warehouseId: session.warehouseId,
            productId: line.productId,
            currentQuantity: new Prisma.Decimal(delta.toFixed(6)),
          },
          update: {
            currentQuantity: {
              increment: new Prisma.Decimal(delta.toFixed(6)),
            },
          },
        });

        // Insert movement record
        await tx.inventoryMovement.create({
          data: {
            warehouseId: session.warehouseId,
            productId: line.productId,
            unitId: line.unitId,
            quantity: qty,
            baseQuantity: baseQty,
            movementType: "SALE_OUT",
            actorId: session.employeeId,
            referenceId: invoiceId,
            referenceType: "Invoice",
            notes: `Sale invoice ${invoiceId}`,
          },
        });
      }

      // 5. Confirm invoice
      confirmedAt = new Date();
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: "CONFIRMED", confirmedAt },
      });
    });

    // 6. Audit log after transaction
    await writeAuditLog({
      actorId: session.employeeId,
      action: "sales.invoice.confirm",
      entityType: "Invoice",
      entityId: invoiceId,
      before: { status: "DRAFT" },
      after: { status: "CONFIRMED", confirmedAt: confirmedAt!.toISOString() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to confirm invoice.";
    return { error: message };
  }

  await writeNotification({
    warehouseId: session.warehouseId,
    type: "SALE_INVOICE_CONFIRMED",
    payload: { invoiceId },
    summary: `Sales invoice confirmed`,
  });

  revalidatePath("/dashboard/sales");
  revalidatePath(`/dashboard/sales/${invoiceId}`);

  return { success: true };
}

// ---------------------------------------------------------------------------
// cancelSalesInvoiceAction
// ---------------------------------------------------------------------------

export async function cancelSalesInvoiceAction(
  _prevState: SalesActionState,
  formData: FormData
): Promise<SalesActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "sales.invoice.cancel");
  } catch {
    return { error: "You do not have permission to cancel sales invoices." };
  }

  const invoiceId = formData.get("invoiceId");
  if (!invoiceId || typeof invoiceId !== "string") {
    return { error: "Invoice ID is required." };
  }

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true, warehouseId: true, type: true },
  });

  if (!invoice || invoice.warehouseId !== session.warehouseId) {
    return { error: "Invoice not found." };
  }

  if (invoice.type !== "SALE") {
    return { error: "This is not a sales invoice." };
  }

  if (invoice.status === "CANCELLED") {
    return { error: "Invoice is already cancelled." };
  }

  const prevStatus = invoice.status;
  const now = new Date();

  await db.invoice.update({
    where: { id: invoiceId },
    data: { status: "CANCELLED", cancelledAt: now },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "sales.invoice.cancel",
    entityType: "Invoice",
    entityId: invoiceId,
    before: { status: prevStatus },
    after: { status: "CANCELLED", cancelledAt: now.toISOString() },
  });

  revalidatePath("/dashboard/sales");
  revalidatePath(`/dashboard/sales/${invoiceId}`);

  return { success: true };
}

// ---------------------------------------------------------------------------
// createSalesPaymentAction
// ---------------------------------------------------------------------------

export async function createSalesPaymentAction(
  _prevState: SalesActionState,
  formData: FormData
): Promise<SalesActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "payments.payment.create");
  } catch {
    return { error: "You do not have permission to record payments." };
  }

  const invoiceId = formData.get("invoiceId");
  if (!invoiceId || typeof invoiceId !== "string") {
    return { error: "Invoice ID is required." };
  }

  const amountRaw = formData.get("amount");
  const method = formData.get("method");
  const paidAtRaw = formData.get("paidAt");
  const notes = formData.get("notes");

  const parsed = z.object({
    amount: z.coerce.number().positive("Amount must be positive"),
    method: z.enum(["CASH", "CARD", "BANK_TRANSFER"], { error: "Invalid payment method" }),
    paidAt: z.string().min(1, "Payment date is required"),
    notes: z.string().max(500).optional(),
  }).safeParse({ amount: amountRaw, method, paidAt: paidAtRaw, notes: notes || undefined });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return { error: errors.amount?.[0] ?? errors.method?.[0] ?? errors.paidAt?.[0] ?? "Invalid form data." };
  }

  const { amount, method: payMethod, paidAt, notes: payNotes } = parsed.data;

  // Verify invoice belongs to this warehouse and is confirmed
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: { warehouseId: true, status: true, type: true },
  });

  if (!invoice || invoice.warehouseId !== session.warehouseId) {
    return { error: "Invoice not found." };
  }

  if (invoice.type !== "SALE") {
    return { error: "This is not a sales invoice." };
  }

  if (invoice.status !== "CONFIRMED") {
    return { error: "Payments can only be recorded on confirmed invoices." };
  }

  const payment = await db.payment.create({
    data: {
      invoiceId,
      amount: new Prisma.Decimal(amount.toFixed(2)),
      method: payMethod,
      paidAt: new Date(paidAt),
      notes: payNotes ?? null,
      actorId: session.employeeId,
    },
    select: { id: true },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "payments.payment.create",
    entityType: "Payment",
    entityId: payment.id,
    after: {
      invoiceId,
      amount: amount.toFixed(2),
      method: payMethod,
      paidAt,
    },
  });

  await writeNotification({
    warehouseId: session.warehouseId,
    type: "PAYMENT_RECORDED",
    payload: { invoiceId, paymentId: payment.id, amount, method: payMethod, invoiceType: "SALE" },
    summary: `Payment of $${amount.toFixed(2)} recorded on sales invoice`,
  });

  revalidatePath(`/dashboard/sales/${invoiceId}`);
  revalidatePath("/dashboard/sales");

  return { success: true };
}
