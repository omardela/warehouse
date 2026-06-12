import { MovementType } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/core/audit/write-audit-log";

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
  const movement = await db.$transaction(async (tx) => {
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
    return tx.inventoryMovement.create({
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

  return movement;
}
