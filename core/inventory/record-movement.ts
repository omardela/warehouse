import { MovementType } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import { emitter } from "@/core/realtime/emitter";
import { getNotificationPermission } from "@/core/notifications/notification-permissions";
import { writeNotification } from "@/core/notifications/write-notification";

export interface RecordMovementParams {
  warehouseId: string;
  productId: string;
  unitId: string;
  quantity: number; // display quantity in the given unit
  baseQuantity: number; // in product's default unit (caller must convert)
  movementType: MovementType;
  actorId: string;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
  allowNegative?: boolean; // default false — throws if balance would go negative
}

/**
 * Returns the signed delta to apply to InventoryBalance.currentQuantity.
 * - Positive movements (IN): add to balance
 * - Negative movements (OUT): subtract from balance
 * - ADJUSTMENT: sign follows baseQuantity
 */
function getBalanceDelta(
  movementType: MovementType,
  baseQuantity: number
): number {
  switch (movementType) {
    case MovementType.PURCHASE_IN:
    case MovementType.TRANSFER_IN:
    case MovementType.RETURN_IN:
      return Math.abs(baseQuantity);
    case MovementType.SALE_OUT:
    case MovementType.TRANSFER_OUT:
    case MovementType.RETURN_OUT:
      return -Math.abs(baseQuantity);
    case MovementType.ADJUSTMENT:
      // Positive baseQuantity adds stock, negative removes
      return baseQuantity;
    default:
      throw new Error(`Unknown movement type: ${movementType}`);
  }
}

export async function recordMovement(
  params: RecordMovementParams
) {
  const {
    warehouseId,
    productId,
    unitId,
    quantity,
    baseQuantity,
    movementType,
    actorId,
    referenceId,
    referenceType,
    notes,
    allowNegative = false,
  } = params;

  const delta = getBalanceDelta(movementType, baseQuantity);

  // Run the balance upsert + movement insert atomically
  const { movement, newQty } = await db.$transaction(async (tx) => {
    // Fetch current balance to validate the new quantity
    const existing = await tx.inventoryBalance.findUnique({
      where: { warehouseId_productId: { warehouseId, productId } },
      select: { currentQuantity: true },
    });

    const currentQty = existing
      ? parseFloat(existing.currentQuantity.toString())
      : 0;
    const newQty = currentQty + delta;

    if (!allowNegative && newQty < 0) {
      throw new Error(
        `Insufficient stock: current balance is ${currentQty.toFixed(4)}, ` +
          `adjustment would result in ${newQty.toFixed(4)}`
      );
    }

    // Upsert the balance record
    await tx.inventoryBalance.upsert({
      where: { warehouseId_productId: { warehouseId, productId } },
      create: {
        warehouseId,
        productId,
        currentQuantity: newQty,
      },
      update: {
        currentQuantity: newQty,
      },
    });

    // Create the immutable movement record
    const movement = await tx.inventoryMovement.create({
      data: {
        warehouseId,
        productId,
        unitId,
        quantity,
        baseQuantity,
        movementType,
        actorId,
        referenceId: referenceId ?? null,
        referenceType: referenceType ?? null,
        notes: notes ?? null,
      },
    });

    return { movement, newQty };
  });

  // Write audit log after the transaction commits so it is only written on success
  await writeAuditLog({
    actorId,
    action: "inventory.movement.create",
    entityType: "InventoryMovement",
    entityId: movement.id,
    after: {
      movementType,
      quantity,
      baseQuantity,
      productId,
      warehouseId,
      referenceId: referenceId ?? null,
      referenceType: referenceType ?? null,
    },
  });

  // Emit realtime event — wrapped in try/catch so SSE failure never breaks the movement
  try {
    emitter.emit(warehouseId, {
      type: "stock.updated",
      payload: { productId, warehouseId, newBalance: newQty },
    });
  } catch {
    // SSE emit failure must not propagate
  }

  // Low-stock notification check — runs after transaction and audit log
  let lowStockTriggered = false;
  try {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { name: true, lowStockThreshold: true },
    });

    if (product && product.lowStockThreshold != null && newQty <= product.lowStockThreshold) {
      // Only create if no unread LOW_STOCK notification already exists for this product+warehouse
      const existing = await db.notification.findFirst({
        where: {
          warehouseId,
          type: "LOW_STOCK",
          readAt: null,
          payload: { path: ["productId"], equals: productId },
        },
      });

      if (!existing) {
        const notification = await db.notification.create({
          data: {
            warehouseId,
            type: "LOW_STOCK",
            payload: {
              productId,
              productName: product.name,
              currentQuantity: newQty,
              threshold: product.lowStockThreshold,
            },
          },
        });
        lowStockTriggered = true;

        // Emit notification.new SSE event — wrapped so it never throws
        try {
          emitter.emit(warehouseId, {
            type: "notification.new",
            payload: {
              notificationId: notification.id,
              type: "LOW_STOCK",
              summary: `Low stock: ${product.name}`,
              requiredPermission: getNotificationPermission("LOW_STOCK"),
            },
          });
        } catch {
          // SSE emit failure must not propagate
        }
      }
    }
  } catch {
    // Low-stock notification failure must never break the movement creation
  }

  // Per-warehouse reorder point check — additive to the Product.lowStockThreshold
  // check above. Operates on InventoryBalance.reorderPoint/reorderQty (set via the
  // Stock page's reorder settings editor). Kept separate and independent so a
  // failure here never affects the existing lowStockThreshold logic.
  try {
    const balance = await db.inventoryBalance.findUnique({
      where: { warehouseId_productId: { warehouseId, productId } },
      select: { reorderPoint: true, reorderQty: true },
    });

    if (balance && balance.reorderPoint != null && newQty <= balance.reorderPoint) {
      const existingReorderNotification = await db.notification.findFirst({
        where: {
          warehouseId,
          type: "LOW_STOCK",
          readAt: null,
          payload: { path: ["productId"], equals: productId },
          AND: [{ payload: { path: ["reason"], equals: "reorder_point" } }],
        },
      });

      if (!existingReorderNotification) {
        const product = await db.product.findUnique({
          where: { id: productId },
          select: { name: true },
        });

        await writeNotification({
          warehouseId,
          type: "LOW_STOCK",
          payload: {
            reason: "reorder_point",
            productId,
            productName: product?.name ?? "",
            warehouseId,
            currentQuantity: newQty,
            reorderPoint: balance.reorderPoint,
            reorderQty: balance.reorderQty,
          },
          summary: `Reorder point reached: ${product?.name ?? "Product"}`,
        });
      }
    }
  } catch {
    // Reorder-point notification failure must never break the movement creation
  }

  return { movement, lowStockTriggered };
}
