"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/require-permission";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import { MovementType } from "@prisma/client";
import { writeNotification } from "@/core/notifications/write-notification";
import { resolveBaseQuantity } from "@/core/inventory/resolve-base-quantity";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PurchaseOrderActionState =
  | { success: true; purchaseOrderId?: string }
  | { error: string; fieldErrors?: Record<string, string[]> }
  | null;

export type GoodsReceiptActionState =
  | { success: true; goodsReceiptId?: string }
  | { error: string; fieldErrors?: Record<string, string[]> }
  | null;

// ─── Create Purchase Order ─────────────────────────────────────────────────

const lineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  unitId: z.string().min(1, "Unit is required"),
  quantity: z.coerce.number({ message: "Quantity must be a number" }).positive("Quantity must be positive"),
  unitCost: z.coerce.number({ message: "Unit cost must be a number" }).min(0, "Unit cost cannot be negative"),
});

const createOrderSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  expectedDeliveryDate: z.string().optional(),
  note: z.string().max(2000).optional(),
  lines: z.array(lineSchema).min(1, "At least one line item is required"),
});

export async function createPurchaseOrderAction(
  _prevState: PurchaseOrderActionState,
  formData: FormData
): Promise<PurchaseOrderActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "purchases.orders.create");
  } catch {
    return { error: "You do not have permission to create purchase orders." };
  }

  const lineCount = parseInt((formData.get("lineCount") as string) ?? "0", 10);
  const linesRaw = [];
  for (let i = 0; i < lineCount; i++) {
    const productId = (formData.get(`line_productId_${i}`) as string)?.trim();
    const unitId = (formData.get(`line_unitId_${i}`) as string)?.trim();
    const quantity = formData.get(`line_quantity_${i}`) as string;
    const unitCost = formData.get(`line_unitCost_${i}`) as string;
    if (productId && unitId && quantity && unitCost) {
      linesRaw.push({ productId, unitId, quantity, unitCost });
    }
  }

  const rawExpectedDeliveryDate = (formData.get("expectedDeliveryDate") as string)?.trim();
  const rawNote = (formData.get("note") as string)?.trim();

  const parsed = createOrderSchema.safeParse({
    supplierId: formData.get("supplierId"),
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

  const { supplierId, expectedDeliveryDate, note, lines } = parsed.data;

  // Validate supplier belongs to org
  const supplier = await db.supplier.findFirst({
    where: { id: supplierId, organizationId: session.orgId, archivedAt: null },
    select: { id: true },
  });
  if (!supplier) return { error: "Supplier not found or archived." };

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
    unitCost: number;
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
        unitCost: l.unitCost,
      });
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to resolve unit conversion." };
    }
  }

  const purchaseOrder = await db.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.create({
      data: {
        organizationId: session.orgId,
        warehouseId: session.warehouseId,
        supplierId,
        status: "DRAFT",
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        note: note || null,
        createdById: session.employeeId,
      },
      select: { id: true },
    });

    await tx.purchaseOrderLine.createMany({
      data: lineData.map((l) => ({
        purchaseOrderId: po.id,
        productId: l.productId,
        unitId: l.unitId,
        displayQuantity: l.displayQuantity,
        baseQuantity: l.baseQuantity,
        unitCost: l.unitCost,
      })),
    });

    return po;
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "purchases.orders.create",
    entityType: "PurchaseOrder",
    entityId: purchaseOrder.id,
    after: { status: "DRAFT", supplierId, lines: lineData.length },
  });

  revalidatePath("/dashboard/purchases/orders");
  return { success: true, purchaseOrderId: purchaseOrder.id };
}

// ─── Mark Purchase Order Sent ───────────────────────────────────────────────

export async function markPurchaseOrderSentAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const purchaseOrderId = formData.get("purchaseOrderId") as string;
  if (!purchaseOrderId) return;

  try {
    await requirePermission(session, "purchases.orders.create");
  } catch {
    throw new Error("You do not have permission to update purchase orders.");
  }

  const po = await db.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    select: { id: true, status: true, warehouseId: true },
  });

  if (!po) throw new Error("Purchase order not found.");
  if (po.warehouseId !== session.warehouseId) throw new Error("Access denied.");
  if (po.status !== "DRAFT") throw new Error("Only draft purchase orders can be marked as sent.");

  const beforeStatus = po.status;

  await db.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: { status: "SENT", sentAt: new Date() },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "purchases.orders.send",
    entityType: "PurchaseOrder",
    entityId: purchaseOrderId,
    before: { status: beforeStatus },
    after: { status: "SENT", sentAt: new Date().toISOString() },
  });

  revalidatePath("/dashboard/purchases/orders");
  revalidatePath(`/dashboard/purchases/orders/${purchaseOrderId}`);
  redirect(`/dashboard/purchases/orders/${purchaseOrderId}`);
}

// ─── Cancel Purchase Order ──────────────────────────────────────────────────

export async function cancelPurchaseOrderAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const purchaseOrderId = formData.get("purchaseOrderId") as string;
  if (!purchaseOrderId) return;

  try {
    await requirePermission(session, "purchases.orders.create");
  } catch {
    throw new Error("You do not have permission to cancel purchase orders.");
  }

  const po = await db.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    select: { id: true, status: true, warehouseId: true },
  });

  if (!po) throw new Error("Purchase order not found.");
  if (po.warehouseId !== session.warehouseId) throw new Error("Access denied.");
  if (po.status !== "DRAFT" && po.status !== "SENT") {
    throw new Error("Only draft or sent purchase orders can be cancelled.");
  }

  const beforeStatus = po.status;

  await db.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: { status: "CANCELLED" },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "purchases.orders.cancel",
    entityType: "PurchaseOrder",
    entityId: purchaseOrderId,
    before: { status: beforeStatus },
    after: { status: "CANCELLED" },
  });

  revalidatePath("/dashboard/purchases/orders");
  revalidatePath(`/dashboard/purchases/orders/${purchaseOrderId}`);
  redirect(`/dashboard/purchases/orders/${purchaseOrderId}`);
}

// ─── Create Goods Receipt ───────────────────────────────────────────────────

const receiptLineSchema = z.object({
  purchaseOrderLineId: z.string().min(1),
  quantity: z.coerce.number({ message: "Quantity must be a number" }).min(0, "Quantity cannot be negative"),
});

const createReceiptSchema = z.object({
  purchaseOrderId: z.string().min(1),
  note: z.string().max(2000).optional(),
  lines: z.array(receiptLineSchema).min(1, "At least one line item is required"),
});

export async function createGoodsReceiptAction(
  _prevState: GoodsReceiptActionState,
  formData: FormData
): Promise<GoodsReceiptActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "purchases.receipts.create");
  } catch {
    return { error: "You do not have permission to create goods receipts." };
  }

  const purchaseOrderId = (formData.get("purchaseOrderId") as string)?.trim();
  const lineCount = parseInt((formData.get("lineCount") as string) ?? "0", 10);
  const linesRaw = [];
  for (let i = 0; i < lineCount; i++) {
    const purchaseOrderLineId = (formData.get(`line_polId_${i}`) as string)?.trim();
    const quantity = formData.get(`line_quantity_${i}`) as string;
    if (purchaseOrderLineId && quantity) {
      linesRaw.push({ purchaseOrderLineId, quantity });
    }
  }

  const rawNote = (formData.get("note") as string)?.trim();

  const parsed = createReceiptSchema.safeParse({
    purchaseOrderId,
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

  // Filter out zero-quantity lines (partial receipt allowed, but skip lines with nothing entered)
  const nonZeroLines = lines.filter((l) => l.quantity > 0);
  if (nonZeroLines.length === 0) {
    return { error: "Enter a received quantity for at least one line." };
  }

  const po = await db.purchaseOrder.findUnique({
    where: { id: parsed.data.purchaseOrderId },
    include: {
      lines: {
        include: {
          product: { select: { id: true, defaultUnitId: true } },
        },
      },
    },
  });

  if (!po) return { error: "Purchase order not found." };
  if (po.warehouseId !== session.warehouseId) return { error: "Access denied." };
  if (po.status !== "SENT" && po.status !== "PARTIAL") {
    return { error: "Goods can only be received against a SENT or PARTIAL purchase order." };
  }

  const poLineMap = new Map(po.lines.map((l) => [l.id, l]));

  // Validate each receipt line against outstanding quantity
  for (const rl of nonZeroLines) {
    const poLine = poLineMap.get(rl.purchaseOrderLineId);
    if (!poLine) return { error: "One or more lines do not belong to this purchase order." };
    const outstanding = Number(poLine.baseQuantity) - Number(poLine.receivedBaseQuantity);
    // rl.quantity is in display units of the PO line's unit; resolve to base for comparison
    const baseQty = await resolveBaseQuantity(
      db,
      poLine.productId,
      poLine.product.defaultUnitId,
      poLine.unitId,
      rl.quantity
    );
    if (baseQty > outstanding + 0.000001) {
      return { error: `Received quantity exceeds outstanding quantity for one or more lines.` };
    }
  }

  const beforeStatus = po.status;

  const goodsReceipt = await db.$transaction(async (tx) => {
    const receipt = await tx.goodsReceipt.create({
      data: {
        purchaseOrderId: po.id,
        warehouseId: session.warehouseId,
        receivedById: session.employeeId,
        note: note || null,
      },
      select: { id: true },
    });

    for (const rl of nonZeroLines) {
      const poLine = poLineMap.get(rl.purchaseOrderLineId)!;
      const baseQty = await resolveBaseQuantity(
        tx,
        poLine.productId,
        poLine.product.defaultUnitId,
        poLine.unitId,
        rl.quantity
      );

      await tx.goodsReceiptLine.create({
        data: {
          goodsReceiptId: receipt.id,
          purchaseOrderLineId: poLine.id,
          productId: poLine.productId,
          unitId: poLine.unitId,
          displayQuantity: rl.quantity,
          baseQuantity: baseQty,
        },
      });

      // Upsert inventory balance
      const existing = await tx.inventoryBalance.findUnique({
        where: { warehouseId_productId: { warehouseId: session.warehouseId, productId: poLine.productId } },
        select: { currentQuantity: true },
      });
      const currentQty = existing ? Number(existing.currentQuantity) : 0;
      const newQty = currentQty + baseQty;

      await tx.inventoryBalance.upsert({
        where: { warehouseId_productId: { warehouseId: session.warehouseId, productId: poLine.productId } },
        create: { warehouseId: session.warehouseId, productId: poLine.productId, currentQuantity: newQty },
        update: { currentQuantity: newQty },
      });

      // Immutable inventory movement
      await tx.inventoryMovement.create({
        data: {
          warehouseId: session.warehouseId,
          productId: poLine.productId,
          unitId: poLine.unitId,
          quantity: rl.quantity,
          baseQuantity: baseQty,
          movementType: MovementType.PURCHASE_IN,
          actorId: session.employeeId,
          referenceId: po.id,
          referenceType: "PurchaseOrder",
          notes: `Goods receipt ${receipt.id} against purchase order`,
        },
      });

      // Increment running received total on the PO line
      await tx.purchaseOrderLine.update({
        where: { id: poLine.id },
        data: { receivedBaseQuantity: { increment: baseQty } },
      });
    }

    // Recompute PO status
    const refreshedLines = await tx.purchaseOrderLine.findMany({
      where: { purchaseOrderId: po.id },
      select: { baseQuantity: true, receivedBaseQuantity: true },
    });
    const fullyReceived = refreshedLines.every(
      (l) => Number(l.receivedBaseQuantity) >= Number(l.baseQuantity) - 0.000001
    );
    const anyReceived = refreshedLines.some((l) => Number(l.receivedBaseQuantity) > 0);

    const newStatus = fullyReceived ? "RECEIVED" : anyReceived ? "PARTIAL" : po.status;

    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: newStatus,
        receivedAt: fullyReceived ? new Date() : po.receivedAt,
      },
    });

    return receipt;
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "purchases.receipts.create",
    entityType: "GoodsReceipt",
    entityId: goodsReceipt.id,
    before: { purchaseOrderStatus: beforeStatus },
    after: { purchaseOrderId: po.id, lines: nonZeroLines.length },
  });

  await writeNotification({
    warehouseId: session.warehouseId,
    type: "GOODS_RECEIPT_CREATED",
    payload: { purchaseOrderId: po.id, goodsReceiptId: goodsReceipt.id },
    summary: `Goods receipt recorded against purchase order`,
  });

  revalidatePath("/dashboard/purchases/orders");
  revalidatePath(`/dashboard/purchases/orders/${po.id}`);
  revalidatePath("/dashboard/inventory/stock");
  return { success: true, goodsReceiptId: goodsReceipt.id };
}
