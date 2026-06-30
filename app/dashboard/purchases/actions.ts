"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/require-permission";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import { writeNotification } from "@/core/notifications/write-notification";
import { resolveBaseQuantity } from "@/core/inventory/resolve-base-quantity";
import { recordMovement } from "@/core/inventory/record-movement";
import { computeOutstandingBalance } from "@/core/billing/compute-outstanding-balance";
import { applyQuantityCapUpdate } from "@/core/inventory/apply-quantity-cap-update";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PurchaseInvoiceActionState =
  | { success: true; invoiceId?: string }
  | { error: string; fieldErrors?: Record<string, string[]> }
  | null;

export type PaymentActionState =
  | { success: true }
  | { error: string; fieldErrors?: Record<string, string[]> }
  | null;

// ─── Create Purchase Invoice ───────────────────────────────────────────────

const lineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  unitId: z.string().min(1, "Unit is required"),
  quantity: z.coerce.number({ message: "Quantity must be a number" }).positive("Quantity must be positive"),
  unitPrice: z.coerce.number({ message: "Unit price must be a number" }).min(0, "Unit price cannot be negative"),
});

const createInvoiceSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  purchaseOrderId: z.string().optional(),
  deliveryDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
  lines: z.array(lineSchema).min(1, "At least one line item is required"),
});

export async function createPurchaseInvoiceAction(
  _prevState: PurchaseInvoiceActionState,
  formData: FormData
): Promise<PurchaseInvoiceActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "purchase.invoice.create");
  } catch {
    return { error: "You do not have permission to create purchase invoices." };
  }

  const lineCount = parseInt((formData.get("lineCount") as string) ?? "0", 10);
  const linesRaw = [];
  for (let i = 0; i < lineCount; i++) {
    const productId = (formData.get(`line_productId_${i}`) as string)?.trim();
    const unitId = (formData.get(`line_unitId_${i}`) as string)?.trim();
    const quantity = formData.get(`line_quantity_${i}`) as string;
    const unitPrice = formData.get(`line_unitPrice_${i}`) as string;
    if (productId && unitId && quantity && unitPrice) {
      linesRaw.push({ productId, unitId, quantity, unitPrice });
    }
  }

  const rawDeliveryDate = (formData.get("deliveryDate") as string)?.trim();
  const rawNotes = (formData.get("notes") as string)?.trim();
  const rawPurchaseOrderId = (formData.get("purchaseOrderId") as string)?.trim();

  const parsed = createInvoiceSchema.safeParse({
    supplierId: formData.get("supplierId"),
    purchaseOrderId: rawPurchaseOrderId || undefined,
    deliveryDate: rawDeliveryDate || undefined,
    notes: rawNotes || undefined,
    lines: linesRaw,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    const firstMessage =
      (parsed.error.flatten().formErrors[0]) ||
      Object.values(fieldErrors).flat()[0] ||
      "Validation failed";
    return { error: firstMessage, fieldErrors };
  }

  const { supplierId, purchaseOrderId, deliveryDate, notes, lines } = parsed.data;

  // Validate supplier belongs to org
  const supplier = await db.supplier.findFirst({
    where: { id: supplierId, organizationId: session.orgId, archivedAt: null },
    select: { id: true },
  });
  if (!supplier) return { error: "Supplier not found or archived." };

  // Validate linked purchase order, if provided: must belong to this org/warehouse,
  // the same supplier, and be RECEIVED or PARTIAL (i.e. goods have actually arrived).
  // Per-line base-quantity increments to apply to PurchaseOrderLine.invoicedBaseQuantity
  // inside the creation transaction (only populated when a PO is linked).
  let poLineIncrements: Array<{ purchaseOrderLineId: string; baseQuantity: number }> = [];

  if (purchaseOrderId) {
    const po = await db.purchaseOrder.findFirst({
      where: {
        id: purchaseOrderId,
        organizationId: session.orgId,
        warehouseId: session.warehouseId,
        supplierId,
      },
      select: {
        id: true,
        status: true,
        lines: {
          select: {
            id: true,
            productId: true,
            unitId: true,
            displayQuantity: true,
            baseQuantity: true,
            receivedBaseQuantity: true,
            invoicedBaseQuantity: true,
            product: { select: { name: true } },
          },
        },
      },
    });
    if (!po) return { error: "Linked purchase order not found for this supplier." };
    if (po.status !== "RECEIVED" && po.status !== "PARTIAL") {
      return { error: "Purchase order must be partially or fully received before linking an invoice." };
    }

    // A PO may be invoiced over multiple Purchase Invoices (decided 2026-06-28 —
    // see CONTEXT.md "Purchase Order (PO)"): cumulative invoiced quantity per line
    // can never exceed cumulative received quantity, independent of Goods Receipt
    // boundaries. So lines that match a received PO line can't bill for more than
    // `receivedBaseQuantity - invoicedBaseQuantity` (remaining-to-invoice), not the
    // received quantity outright. Lines that don't match any PO line (e.g. a
    // freight/handling charge) are left unvalidated — they're treated as ordinary
    // manual lines.
    const remainingByProductUnit = new Map<
      string,
      { qty: number; productName: string; lineId: string; ratio: number }
    >();
    for (const poLine of po.lines) {
      const received = Number(poLine.receivedBaseQuantity);
      if (received <= 0) continue;
      const invoiced = Number(poLine.invoicedBaseQuantity);
      // Clamp at zero (never negative) — a line with nothing left to invoice
      // still needs to appear in the map so it's validated against (and any
      // positive invoice amount against it is rejected), rather than being
      // silently skipped and treated as an unvalidated manual line.
      const remainingBase = Math.max(0, received - invoiced);
      const baseQty = Number(poLine.baseQuantity);
      const ratio = baseQty > 0 ? Number(poLine.displayQuantity) / baseQty : 1;
      const key = `${poLine.productId}__${poLine.unitId}`;
      const existing = remainingByProductUnit.get(key);
      remainingByProductUnit.set(key, {
        qty: (existing?.qty ?? 0) + remainingBase * ratio,
        productName: poLine.product.name,
        lineId: poLine.id,
        ratio,
      });
    }

    const invoicedByProductUnit = new Map<string, number>();
    for (const l of lines) {
      const key = `${l.productId}__${l.unitId}`;
      invoicedByProductUnit.set(key, (invoicedByProductUnit.get(key) ?? 0) + l.quantity);
    }

    for (const [key, invoicedQty] of invoicedByProductUnit) {
      const remaining = remainingByProductUnit.get(key);
      if (!remaining) continue;
      if (invoicedQty > remaining.qty + 0.000001) {
        return {
          error: `Invoice quantity for ${remaining.productName} (${invoicedQty.toFixed(4)}) exceeds the remaining quantity to invoice from this purchase order (${remaining.qty.toFixed(4)}).`,
        };
      }
    }

    poLineIncrements = [...invoicedByProductUnit.entries()]
      .map(([key, invoicedQty]) => {
        const remaining = remainingByProductUnit.get(key);
        if (!remaining) return null;
        const baseQuantity = remaining.ratio > 0 ? invoicedQty / remaining.ratio : invoicedQty;
        return { purchaseOrderLineId: remaining.lineId, baseQuantity };
      })
      .filter((x): x is { purchaseOrderLineId: string; baseQuantity: number } => x !== null);
  }

  // Validate products belong to org
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const products = await db.product.findMany({
    where: { id: { in: productIds }, organizationId: session.orgId },
    select: { id: true },
  });
  if (products.length !== productIds.length) {
    return { error: "One or more products are invalid." };
  }

  // Compute totals
  const lineData = lines.map((l) => ({
    productId: l.productId,
    unitId: l.unitId,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    totalPrice: l.quantity * l.unitPrice,
  }));
  const totalAmount = lineData.reduce((sum, l) => sum + l.totalPrice, 0);

  const invoice = await db.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        type: "PURCHASE",
        status: "DRAFT",
        warehouseId: session.warehouseId,
        supplierId,
        purchaseOrderId: purchaseOrderId || null,
        totalAmount,
        notes: notes || null,
        actorId: session.employeeId,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      },
      select: { id: true },
    });

    await tx.invoiceLine.createMany({
      data: lineData.map((l) => ({
        invoiceId: inv.id,
        productId: l.productId,
        unitId: l.unitId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        totalPrice: l.totalPrice,
      })),
    });

    // Increment the running invoiced total on each linked PO line. The
    // pre-transaction check above is a fast-path UX check; this conditional
    // atomic update (issue 035) is the authoritative guard against two
    // concurrent invoices both passing the pre-check and over-invoicing past
    // receivedBaseQuantity.
    for (const increment of poLineIncrements) {
      await applyQuantityCapUpdate({
        table: "purchase_order_lines",
        id: increment.purchaseOrderLineId,
        column: "invoicedBaseQuantity",
        capColumn: "receivedBaseQuantity",
        amount: increment.baseQuantity,
        errorMessage:
          "Invoice quantity exceeds the remaining quantity to invoice for one or more lines.",
        tx,
      });
    }

    return inv;
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "purchase.invoice.create",
    entityType: "Invoice",
    entityId: invoice.id,
    after: { type: "PURCHASE", status: "DRAFT", supplierId, purchaseOrderId: purchaseOrderId ?? null, totalAmount, lines: lineData.length },
  });

  revalidatePath("/dashboard/purchases");
  return { success: true, invoiceId: invoice.id };
}

// ─── Confirm Purchase Invoice ──────────────────────────────────────────────

export async function confirmPurchaseInvoiceAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const invoiceId = formData.get("invoiceId") as string;
  if (!invoiceId) return;

  try {
    await requirePermission(session, "purchase.invoice.confirm");
  } catch {
    throw new Error("You do not have permission to confirm purchase invoices.");
  }

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lines: {
        include: {
          product: { select: { id: true, defaultUnitId: true } },
        },
      },
    },
  });

  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.warehouseId !== session.warehouseId) throw new Error("Access denied.");
  if (invoice.status !== "DRAFT") throw new Error("Invoice is not in DRAFT status.");
  if (invoice.type !== "PURCHASE") throw new Error("Not a purchase invoice.");

  const beforeStatus = invoice.status;

  const pendingSideEffects: Array<() => Promise<unknown>> = [];

  await db.$transaction(async (tx) => {
    // Update invoice status first
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });

    // Direct purchase invoices (no linked PO) move stock here via an implicit
    // Goods Receipt. Invoices linked to a PO already had their stock moved
    // when the Goods Receipt was created against that PO (issue 019) — confirming
    // such an invoice is purely a financial status change.
    if (invoice.purchaseOrderId == null) {
      const receipt = await tx.goodsReceipt.create({
        data: {
          purchaseOrderId: null,
          invoiceId: invoiceId,
          warehouseId: session.warehouseId,
          receivedById: invoice.actorId,
          note: `Implicit goods receipt for invoice ${invoiceId}`,
        },
        select: { id: true },
      });

      for (const line of invoice.lines) {
        const qty = Number(line.quantity);
        const baseQty = await resolveBaseQuantity(
          tx,
          line.productId,
          line.product.defaultUnitId,
          line.unitId,
          qty
        );

        await tx.goodsReceiptLine.create({
          data: {
            goodsReceiptId: receipt.id,
            purchaseOrderLineId: null,
            productId: line.productId,
            unitId: line.unitId,
            displayQuantity: qty,
            baseQuantity: baseQty,
          },
        });

        const { runSideEffects } = await recordMovement({
          warehouseId: session.warehouseId,
          productId: line.productId,
          unitId: line.unitId,
          quantity: qty,
          baseQuantity: baseQty,
          movementType: "PURCHASE_IN",
          actorId: session.employeeId,
          referenceType: "GoodsReceipt",
          referenceId: receipt.id,
          notes: `Goods receipt ${receipt.id} for purchase invoice (invoice ${invoiceId})`,
          tx,
        });

        pendingSideEffects.push(runSideEffects);
      }
    }
  });

  for (const runSideEffects of pendingSideEffects) {
    await runSideEffects();
  }

  await writeAuditLog({
    actorId: session.employeeId,
    action: "purchase.invoice.confirm",
    entityType: "Invoice",
    entityId: invoiceId,
    before: { status: beforeStatus },
    after: { status: "CONFIRMED", confirmedAt: new Date().toISOString() },
  });

  await writeNotification({
    warehouseId: session.warehouseId,
    type: "PURCHASE_INVOICE_CONFIRMED",
    payload: { invoiceId, totalAmount: Number(invoice.totalAmount ?? 0) },
    summary: `Purchase invoice confirmed`,
  });

  revalidatePath("/dashboard/purchases");
  revalidatePath(`/dashboard/purchases/${invoiceId}`);
  redirect(`/dashboard/purchases/${invoiceId}`);
}

// ─── Cancel Purchase Invoice ───────────────────────────────────────────────

export async function cancelPurchaseInvoiceAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const invoiceId = formData.get("invoiceId") as string;
  if (!invoiceId) return;

  try {
    await requirePermission(session, "purchase.invoice.cancel");
  } catch {
    throw new Error("You do not have permission to cancel purchase invoices.");
  }

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, status: true, warehouseId: true, type: true },
  });

  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.warehouseId !== session.warehouseId) throw new Error("Access denied.");
  if (invoice.status === "CANCELLED") throw new Error("Invoice is already cancelled.");
  if (invoice.type !== "PURCHASE") throw new Error("Not a purchase invoice.");

  const beforeStatus = invoice.status;

  await db.invoice.update({
    where: { id: invoiceId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "purchase.invoice.cancel",
    entityType: "Invoice",
    entityId: invoiceId,
    before: { status: beforeStatus },
    after: { status: "CANCELLED", cancelledAt: new Date().toISOString() },
  });

  revalidatePath("/dashboard/purchases");
  revalidatePath(`/dashboard/purchases/${invoiceId}`);
  redirect(`/dashboard/purchases/${invoiceId}`);
}

// ─── Create Purchase Payment ───────────────────────────────────────────────

const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number({ message: "Amount must be a number" }).positive("Amount must be positive"),
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER"], { message: "Invalid payment method" }),
  paidAt: z.string().min(1, "Payment date is required"),
  notes: z.string().max(500).optional(),
});

export async function createPurchasePaymentAction(
  _prevState: PaymentActionState,
  formData: FormData
): Promise<PaymentActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "payments.payment.create");
  } catch {
    return { error: "You do not have permission to record payments." };
  }

  const rawNotes = (formData.get("notes") as string)?.trim();
  const parsed = paymentSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    paidAt: formData.get("paidAt"),
    notes: rawNotes || undefined,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    const firstMessage = Object.values(fieldErrors).flat()[0] ?? "Validation failed";
    return { error: firstMessage, fieldErrors };
  }

  const { invoiceId, amount, method, paidAt, notes } = parsed.data;

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      warehouseId: true,
      type: true,
      status: true,
      totalAmount: true,
      payments: { select: { amount: true } },
      creditNotes: {
        where: { status: { not: "CANCELLED" } },
        include: { lines: true },
      },
    },
  });

  if (!invoice) return { error: "Invoice not found." };
  if (invoice.warehouseId !== session.warehouseId) return { error: "Access denied." };
  if (invoice.type !== "PURCHASE") return { error: "Not a purchase invoice." };
  if (invoice.status !== "CONFIRMED") return { error: "Payments can only be recorded on confirmed invoices." };

  // Reject payments that would drive the remaining balance below zero.
  const remaining = computeOutstandingBalance(invoice);
  if (remaining <= 0.001) {
    return { error: "This invoice has already been fully paid." };
  }
  if (amount > remaining + 0.001) {
    return {
      error: `Payment amount exceeds the outstanding balance. ($${amount.toFixed(2)} entered, $${remaining.toFixed(2)} remaining)`,
    };
  }

  const payment = await db.payment.create({
    data: {
      invoiceId,
      amount,
      method: method as "CASH" | "CARD" | "BANK_TRANSFER",
      paidAt: new Date(paidAt),
      notes: notes || null,
      actorId: session.employeeId,
    },
    select: { id: true },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "payments.payment.create",
    entityType: "Payment",
    entityId: payment.id,
    after: { invoiceId, amount, method, paidAt },
  });

  await writeNotification({
    warehouseId: session.warehouseId,
    type: "PAYMENT_RECORDED",
    payload: { invoiceId, paymentId: payment.id, amount, method, invoiceType: "PURCHASE" },
    summary: `Payment of $${amount.toFixed(2)} recorded on purchase invoice`,
  });

  revalidatePath(`/dashboard/purchases/${invoiceId}`);
  return { success: true };
}
