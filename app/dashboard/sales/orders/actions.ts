"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/require-permission";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import { writeNotification } from "@/core/notifications/write-notification";
import { resolveBaseQuantity } from "@/core/inventory/resolve-base-quantity";
import { recordMovement } from "@/core/inventory/record-movement";
import { applyQuantityCapUpdate } from "@/core/inventory/apply-quantity-cap-update";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SalesOrderActionState =
  | { success: true; salesOrderId?: string }
  | { error: string; fieldErrors?: Record<string, string[]> }
  | null;

export type DeliveryNoteActionState =
  | { success: true; deliveryNoteId?: string }
  | { error: string; fieldErrors?: Record<string, string[]> }
  | null;

// ─── Create Sales Order ─────────────────────────────────────────────────────

const lineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  unitId: z.string().min(1, "Unit is required"),
  quantity: z.coerce.number({ message: "Quantity must be a number" }).positive("Quantity must be positive"),
  unitPrice: z.coerce.number({ message: "Unit price must be a number" }).min(0, "Unit price cannot be negative"),
  discount: z.coerce.number().min(0).max(100).optional(),
});

const createOrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  expectedDeliveryDate: z.string().optional(),
  note: z.string().max(2000).optional(),
  lines: z.array(lineSchema).min(1, "At least one line item is required"),
});

export async function createSalesOrderAction(
  _prevState: SalesOrderActionState,
  formData: FormData
): Promise<SalesOrderActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "sales.orders.create");
  } catch {
    return { error: "You do not have permission to create sales orders." };
  }

  const lineCount = parseInt((formData.get("lineCount") as string) ?? "0", 10);
  const linesRaw = [];
  for (let i = 0; i < lineCount; i++) {
    const productId = (formData.get(`line_productId_${i}`) as string)?.trim();
    const unitId = (formData.get(`line_unitId_${i}`) as string)?.trim();
    const quantity = formData.get(`line_quantity_${i}`) as string;
    const unitPrice = formData.get(`line_unitPrice_${i}`) as string;
    const discount = (formData.get(`line_discount_${i}`) as string) || undefined;
    if (productId && unitId && quantity && unitPrice) {
      linesRaw.push({ productId, unitId, quantity, unitPrice, discount });
    }
  }

  const rawExpectedDeliveryDate = (formData.get("expectedDeliveryDate") as string)?.trim();
  const rawNote = (formData.get("note") as string)?.trim();

  const parsed = createOrderSchema.safeParse({
    customerId: formData.get("customerId"),
    warehouseId: formData.get("warehouseId") || session.warehouseId,
    expectedDeliveryDate: rawExpectedDeliveryDate || undefined,
    note: rawNote || undefined,
    lines: linesRaw,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    const firstMessage =
      parsed.error.flatten().formErrors[0] ||
      Object.values(fieldErrors).flat()[0] ||
      "Validation failed";
    return { error: firstMessage, fieldErrors };
  }

  const { customerId, warehouseId, expectedDeliveryDate, note, lines } = parsed.data;

  // Validate customer belongs to org
  const customer = await db.customer.findFirst({
    where: { id: customerId, organizationId: session.orgId, archivedAt: null },
    select: { id: true },
  });
  if (!customer) return { error: "Customer not found or archived." };

  // Validate warehouse belongs to org
  const warehouse = await db.warehouse.findFirst({
    where: { id: warehouseId, organizationId: session.orgId, archivedAt: null },
    select: { id: true },
  });
  if (!warehouse) return { error: "Warehouse not found or archived." };

  // Validate products belong to org
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const products = await db.product.findMany({
    where: { id: { in: productIds }, organizationId: session.orgId },
    select: { id: true, defaultUnitId: true },
  });
  if (products.length !== productIds.length) {
    return { error: "One or more products are invalid." };
  }
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Resolve base quantities for each line
  const lineData: {
    productId: string;
    unitId: string;
    displayQuantity: number;
    baseQuantity: number;
    unitPrice: number;
    discount: number | null;
  }[] = [];

  for (const l of lines) {
    const product = productMap.get(l.productId);
    if (!product) return { error: "One or more products are invalid." };
    try {
      const baseQuantity = await resolveBaseQuantity(
        db,
        l.productId,
        product.defaultUnitId,
        l.unitId,
        l.quantity
      );
      lineData.push({
        productId: l.productId,
        unitId: l.unitId,
        displayQuantity: l.quantity,
        baseQuantity,
        unitPrice: l.unitPrice,
        discount: l.discount ?? null,
      });
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to resolve unit conversion." };
    }
  }

  const salesOrder = await db.$transaction(async (tx) => {
    const so = await tx.salesOrder.create({
      data: {
        organizationId: session.orgId,
        warehouseId,
        customerId,
        status: "DRAFT",
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        note: note || null,
        createdById: session.employeeId,
      },
      select: { id: true },
    });

    await tx.salesOrderLine.createMany({
      data: lineData.map((l) => ({
        salesOrderId: so.id,
        productId: l.productId,
        unitId: l.unitId,
        displayQuantity: l.displayQuantity,
        baseQuantity: l.baseQuantity,
        unitPrice: l.unitPrice,
        discount: l.discount,
      })),
    });

    return so;
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "sales.orders.create",
    entityType: "SalesOrder",
    entityId: salesOrder.id,
    after: { status: "DRAFT", customerId, warehouseId, lines: lineData.length },
  });

  revalidatePath("/dashboard/sales/orders");
  return { success: true, salesOrderId: salesOrder.id };
}

// ─── Confirm Sales Order ─────────────────────────────────────────────────────

export async function confirmSalesOrderAction(
  _prevState: SalesOrderActionState,
  formData: FormData
): Promise<SalesOrderActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const salesOrderId = formData.get("salesOrderId") as string;
  if (!salesOrderId) return { error: "Sales order ID is required." };

  try {
    await requirePermission(session, "sales.orders.create");
  } catch {
    return { error: "You do not have permission to confirm sales orders." };
  }

  const so = await db.salesOrder.findUnique({
    where: { id: salesOrderId },
    include: {
      lines: true,
      customer: { select: { id: true, creditLimit: true } },
    },
  });

  if (!so) return { error: "Sales order not found." };
  if (so.warehouseId !== session.warehouseId) return { error: "Access denied." };
  if (so.status !== "DRAFT") return { error: "Only draft sales orders can be confirmed." };

  // Credit check: current outstanding balance + this SO's value vs creditLimit
  const creditLimit = so.customer.creditLimit != null ? Number(so.customer.creditLimit) : null;

  if (creditLimit != null) {
    const confirmedInvoices = await db.invoice.findMany({
      where: { customerId: so.customer.id, type: "SALE", status: "CONFIRMED" },
      include: { payments: { select: { amount: true } } },
    });
    const totalInvoiced = confirmedInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const totalPaid = confirmedInvoices.reduce(
      (sum, inv) => sum + inv.payments.reduce((ps, p) => ps + Number(p.amount), 0),
      0
    );

    // Confirmed sales credit notes (returns) reduce the customer's outstanding balance.
    const confirmedCreditNotes = await db.creditNote.findMany({
      where: { type: "SALE", status: "CONFIRMED", originalInvoice: { customerId: so.customer.id } },
      include: { lines: { select: { displayQuantity: true, unitPrice: true } } },
    });
    const totalCredited = confirmedCreditNotes.reduce(
      (sum, cn) => sum + cn.lines.reduce((ls, l) => ls + Number(l.displayQuantity) * Number(l.unitPrice), 0),
      0
    );

    const outstandingBalance = totalInvoiced - totalPaid - totalCredited;

    const soTotalValue = so.lines.reduce((sum, l) => {
      const discountFactor = l.discount != null ? 1 - Number(l.discount) / 100 : 1;
      return sum + Number(l.displayQuantity) * Number(l.unitPrice) * discountFactor;
    }, 0);

    const projectedExposure = outstandingBalance + soTotalValue;

    if (projectedExposure > creditLimit) {
      return {
        error:
          `Confirming this sales order would exceed the customer's credit limit. ` +
          `Current outstanding balance: $${outstandingBalance.toFixed(2)}, this order: $${soTotalValue.toFixed(2)}, ` +
          `projected exposure: $${projectedExposure.toFixed(2)}, credit limit: $${creditLimit.toFixed(2)}.`,
      };
    }
  }

  const beforeStatus = so.status;
  const confirmedAt = new Date();

  await db.salesOrder.update({
    where: { id: salesOrderId },
    data: { status: "CONFIRMED", confirmedAt },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "sales.orders.confirm",
    entityType: "SalesOrder",
    entityId: salesOrderId,
    before: { status: beforeStatus },
    after: { status: "CONFIRMED", confirmedAt: confirmedAt.toISOString() },
  });

  revalidatePath("/dashboard/sales/orders");
  revalidatePath(`/dashboard/sales/orders/${salesOrderId}`);
  return { success: true, salesOrderId };
}

// ─── Cancel Sales Order ──────────────────────────────────────────────────────

export async function cancelSalesOrderAction(
  _prevState: SalesOrderActionState,
  formData: FormData
): Promise<SalesOrderActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const salesOrderId = formData.get("salesOrderId") as string;
  if (!salesOrderId) return { error: "Sales order ID is required." };

  try {
    await requirePermission(session, "sales.orders.create");
  } catch {
    return { error: "You do not have permission to cancel sales orders." };
  }

  const so = await db.salesOrder.findUnique({
    where: { id: salesOrderId },
    select: { id: true, status: true, warehouseId: true },
  });

  if (!so) return { error: "Sales order not found." };
  if (so.warehouseId !== session.warehouseId) return { error: "Access denied." };
  if (so.status !== "DRAFT" && so.status !== "CONFIRMED") {
    return { error: "Only draft or confirmed sales orders can be cancelled." };
  }

  const beforeStatus = so.status;

  await db.salesOrder.update({
    where: { id: salesOrderId },
    data: { status: "CANCELLED" },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "sales.orders.cancel",
    entityType: "SalesOrder",
    entityId: salesOrderId,
    before: { status: beforeStatus },
    after: { status: "CANCELLED" },
  });

  revalidatePath("/dashboard/sales/orders");
  revalidatePath(`/dashboard/sales/orders/${salesOrderId}`);
  return { success: true, salesOrderId };
}

// ─── Close Sales Order ───────────────────────────────────────────────────────

export async function closeSalesOrderAction(
  _prevState: SalesOrderActionState,
  formData: FormData
): Promise<SalesOrderActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const salesOrderId = formData.get("salesOrderId") as string;
  if (!salesOrderId) return { error: "Sales order ID is required." };

  try {
    await requirePermission(session, "sales.orders.create");
  } catch {
    return { error: "You do not have permission to close sales orders." };
  }

  const so = await db.salesOrder.findUnique({
    where: { id: salesOrderId },
    select: { id: true, status: true, warehouseId: true },
  });

  if (!so) return { error: "Sales order not found." };
  if (so.warehouseId !== session.warehouseId) return { error: "Access denied." };
  if (so.status !== "PARTIAL") {
    return { error: "Only partially fulfilled sales orders can be closed." };
  }

  const beforeStatus = so.status;

  await db.salesOrder.update({
    where: { id: salesOrderId },
    data: { status: "CLOSED" },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "sales.orders.close",
    entityType: "SalesOrder",
    entityId: salesOrderId,
    before: { status: beforeStatus },
    after: { status: "CLOSED" },
  });

  revalidatePath("/dashboard/sales/orders");
  revalidatePath(`/dashboard/sales/orders/${salesOrderId}`);
  return { success: true, salesOrderId };
}

// ─── Create Delivery Note ───────────────────────────────────────────────────

const deliveryLineSchema = z.object({
  salesOrderLineId: z.string().min(1),
  quantity: z.coerce.number({ message: "Quantity must be a number" }).min(0, "Quantity cannot be negative"),
});

const createDeliveryNoteSchema = z.object({
  salesOrderId: z.string().min(1),
  note: z.string().max(2000).optional(),
  lines: z.array(deliveryLineSchema).min(1, "At least one line item is required"),
});

export async function createDeliveryNoteAction(
  _prevState: DeliveryNoteActionState,
  formData: FormData
): Promise<DeliveryNoteActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "sales.deliverynotes.create");
  } catch {
    return { error: "You do not have permission to create delivery notes." };
  }

  const salesOrderId = (formData.get("salesOrderId") as string)?.trim();
  const lineCount = parseInt((formData.get("lineCount") as string) ?? "0", 10);
  const linesRaw = [];
  for (let i = 0; i < lineCount; i++) {
    const salesOrderLineId = (formData.get(`line_solId_${i}`) as string)?.trim();
    const quantity = formData.get(`line_quantity_${i}`) as string;
    if (salesOrderLineId && quantity) {
      linesRaw.push({ salesOrderLineId, quantity });
    }
  }

  const rawNote = (formData.get("note") as string)?.trim();

  const parsed = createDeliveryNoteSchema.safeParse({
    salesOrderId,
    note: rawNote || undefined,
    lines: linesRaw,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    const firstMessage =
      parsed.error.flatten().formErrors[0] ||
      Object.values(fieldErrors).flat()[0] ||
      "Validation failed";
    return { error: firstMessage, fieldErrors };
  }

  const { lines, note } = parsed.data;

  // Filter out zero-quantity lines (partial delivery allowed, but skip lines with nothing entered)
  const nonZeroLines = lines.filter((l) => l.quantity > 0);
  if (nonZeroLines.length === 0) {
    return { error: "Enter a quantity to dispatch for at least one line." };
  }

  const so = await db.salesOrder.findUnique({
    where: { id: parsed.data.salesOrderId },
    include: {
      lines: {
        include: {
          product: { select: { id: true, defaultUnitId: true } },
        },
      },
    },
  });

  if (!so) return { error: "Sales order not found." };
  if (so.warehouseId !== session.warehouseId) return { error: "Access denied." };
  if (so.status !== "CONFIRMED" && so.status !== "PARTIAL") {
    return { error: "Delivery notes can only be created against a CONFIRMED or PARTIAL sales order." };
  }

  const soLineMap = new Map(so.lines.map((l) => [l.id, l]));

  // Validate each delivery line against remaining undelivered quantity
  for (const dl of nonZeroLines) {
    const soLine = soLineMap.get(dl.salesOrderLineId);
    if (!soLine) return { error: "One or more lines do not belong to this sales order." };
    const remaining = Number(soLine.baseQuantity) - Number(soLine.deliveredBaseQuantity);
    const baseQty = await resolveBaseQuantity(
      db,
      soLine.productId,
      soLine.product.defaultUnitId,
      soLine.unitId,
      dl.quantity
    );
    if (baseQty > remaining + 0.000001) {
      return { error: `Dispatched quantity exceeds remaining quantity for one or more lines.` };
    }
  }

  const beforeStatus = so.status;
  const sideEffectCallbacks: Array<() => Promise<{ lowStockTriggered: boolean }>> = [];

  const deliveryNote = await db.$transaction(async (tx) => {
    const dn = await tx.deliveryNote.create({
      data: {
        salesOrderId: so.id,
        warehouseId: session.warehouseId,
        dispatchedById: session.employeeId,
        note: note || null,
      },
      select: { id: true },
    });

    for (const dl of nonZeroLines) {
      const soLine = soLineMap.get(dl.salesOrderLineId)!;
      const baseQty = await resolveBaseQuantity(
        tx,
        soLine.productId,
        soLine.product.defaultUnitId,
        soLine.unitId,
        dl.quantity
      );

      await tx.deliveryNoteLine.create({
        data: {
          deliveryNoteId: dn.id,
          salesOrderLineId: soLine.id,
          productId: soLine.productId,
          unitId: soLine.unitId,
          displayQuantity: dl.quantity,
          baseQuantity: baseQty,
        },
      });

      // Decrement stock via recordMovement (balance upsert + movement insert,
      // participating in this same transaction). The SO-specific "exceeds
      // remaining quantity" check already ran above; recordMovement's own
      // generic insufficient-stock check acts as a redundant safety net.
      const { runSideEffects } = await recordMovement({
        warehouseId: session.warehouseId,
        productId: soLine.productId,
        unitId: soLine.unitId,
        quantity: dl.quantity,
        baseQuantity: baseQty,
        movementType: "SALE_OUT",
        actorId: session.employeeId,
        referenceId: dn.id,
        referenceType: "DeliveryNote",
        notes: `Delivery note ${dn.id} against sales order ${so.id}`,
        allowNegative: false,
        tx,
      });
      sideEffectCallbacks.push(runSideEffects);

      // Increment running delivered total on the SO line. The pre-transaction
      // check above is a fast-path UX check; this conditional atomic update
      // is the authoritative guard against two concurrent deliveries both
      // passing the pre-check and over-delivering past baseQuantity (see
      // docs/adr/0001-atomic-conditional-updates-for-quantity-caps.md).
      await applyQuantityCapUpdate({
        table: "sales_order_lines",
        id: soLine.id,
        column: "deliveredBaseQuantity",
        capColumn: "baseQuantity",
        amount: baseQty,
        errorMessage: "Dispatched quantity exceeds remaining quantity for one or more lines.",
        tx,
      });
    }

    // Recompute SO status
    const refreshedLines = await tx.salesOrderLine.findMany({
      where: { salesOrderId: so.id },
      select: { baseQuantity: true, deliveredBaseQuantity: true },
    });
    const fullyDelivered = refreshedLines.every(
      (l) => Number(l.deliveredBaseQuantity) >= Number(l.baseQuantity) - 0.000001
    );
    const anyDelivered = refreshedLines.some((l) => Number(l.deliveredBaseQuantity) > 0);

    const newStatus = fullyDelivered ? "FULFILLED" : anyDelivered ? "PARTIAL" : so.status;

    await tx.salesOrder.update({
      where: { id: so.id },
      data: {
        status: newStatus,
        fulfilledAt: fullyDelivered ? new Date() : so.fulfilledAt,
      },
    });

    return dn;
  });

  // Run deferred recordMovement side effects now that the transaction has committed
  for (const runSideEffects of sideEffectCallbacks) {
    await runSideEffects();
  }

  await writeAuditLog({
    actorId: session.employeeId,
    action: "sales.deliverynotes.create",
    entityType: "DeliveryNote",
    entityId: deliveryNote.id,
    before: { salesOrderStatus: beforeStatus },
    after: { salesOrderId: so.id, lines: nonZeroLines.length },
  });

  await writeNotification({
    warehouseId: session.warehouseId,
    type: "DELIVERY_NOTE_CREATED",
    payload: { salesOrderId: so.id, deliveryNoteId: deliveryNote.id },
    summary: `Delivery note recorded against sales order`,
  });

  revalidatePath("/dashboard/sales/orders");
  revalidatePath(`/dashboard/sales/orders/${so.id}`);
  revalidatePath("/dashboard/inventory/stock");
  return { success: true, deliveryNoteId: deliveryNote.id };
}
