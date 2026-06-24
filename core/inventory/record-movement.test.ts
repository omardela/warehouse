import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { recordMovement } from "@/core/inventory/record-movement";

describe("recordMovement", () => {
  let organizationId: string;
  let warehouseId: string;
  let unitId: string;
  let actorId: string;
  let productNoTxId: string;
  let productTxId: string;

  beforeAll(async () => {
    const org = await db.organization.create({ data: { name: "RM Test Org" } });
    organizationId = org.id;

    const warehouse = await db.warehouse.create({
      data: { name: "RM Test Warehouse", organizationId },
    });
    warehouseId = warehouse.id;

    const unit = await db.productUnit.create({
      data: { name: "RM Test Unit", symbol: `rmtu-${Date.now()}`, isBase: true },
    });
    unitId = unit.id;

    const employee = await db.employee.create({
      data: {
        name: "RM Test Actor",
        email: `rm-test-actor-${Date.now()}@example.com`,
        passwordHash: "not-a-real-hash",
        warehouseId,
      },
    });
    actorId = employee.id;

    const productNoTx = await db.product.create({
      data: {
        name: "RM Test Product (no tx)",
        sku: `RM-NOTX-${Date.now()}`,
        defaultUnitId: unitId,
        organizationId,
      },
    });
    productNoTxId = productNoTx.id;

    const productTx = await db.product.create({
      data: {
        name: "RM Test Product (tx)",
        sku: `RM-TX-${Date.now()}`,
        defaultUnitId: unitId,
        organizationId,
      },
    });
    productTxId = productTx.id;
  });

  afterAll(async () => {
    await db.auditLog.deleteMany({ where: { actorId } });
    await db.inventoryMovement.deleteMany({ where: { warehouseId } });
    await db.inventoryBalance.deleteMany({ where: { warehouseId } });
    await db.notification.deleteMany({ where: { warehouseId } });
    await db.product.deleteMany({ where: { organizationId } });
    await db.employee.deleteMany({ where: { warehouseId } });
    await db.productUnit.deleteMany({ where: { id: unitId } });
    await db.warehouse.deleteMany({ where: { organizationId } });
    await db.organization.deleteMany({ where: { id: organizationId } });
    await db.$disconnect();
  });

  it("without tx: updates balance, inserts movement, and writes audit log immediately", async () => {
    const result = await recordMovement({
      warehouseId,
      productId: productNoTxId,
      unitId,
      quantity: 10,
      baseQuantity: 10,
      movementType: "PURCHASE_IN",
      actorId,
    });

    expect(result.lowStockTriggered).toBe(false);
    expect(result.movement.warehouseId).toBe(warehouseId);

    const balance = await db.inventoryBalance.findUnique({
      where: { warehouseId_productId: { warehouseId, productId: productNoTxId } },
    });
    expect(Number(balance?.currentQuantity)).toBe(10);

    const movements = await db.inventoryMovement.findMany({
      where: { warehouseId, productId: productNoTxId },
    });
    expect(movements).toHaveLength(1);

    const auditEntry = await db.auditLog.findFirst({
      where: { entityType: "InventoryMovement", entityId: result.movement.id },
    });
    expect(auditEntry).not.toBeNull();
  });

  it("with tx: participates in the caller's transaction and defers side effects until runSideEffects() is invoked", async () => {
    let movementId = "";

    const { movement, runSideEffects } = await db.$transaction(async (tx) => {
      return recordMovement({
        warehouseId,
        productId: productTxId,
        unitId,
        quantity: 5,
        baseQuantity: 5,
        movementType: "PURCHASE_IN",
        actorId,
        tx,
      });
    });
    movementId = movement.id;

    // Balance + movement rows are committed as soon as the outer transaction commits.
    const balanceAfterCommit = await db.inventoryBalance.findUnique({
      where: { warehouseId_productId: { warehouseId, productId: productTxId } },
    });
    expect(Number(balanceAfterCommit?.currentQuantity)).toBe(5);

    const movementAfterCommit = await db.inventoryMovement.findUnique({
      where: { id: movementId },
    });
    expect(movementAfterCommit).not.toBeNull();

    // Side effects must not have fired yet.
    const auditBeforeSideEffects = await db.auditLog.findFirst({
      where: { entityType: "InventoryMovement", entityId: movementId },
    });
    expect(auditBeforeSideEffects).toBeNull();

    const { lowStockTriggered } = await runSideEffects();
    expect(lowStockTriggered).toBe(false);

    const auditAfterSideEffects = await db.auditLog.findFirst({
      where: { entityType: "InventoryMovement", entityId: movementId },
    });
    expect(auditAfterSideEffects).not.toBeNull();
  });

  it("with tx: rolling back the outer transaction leaves no balance or movement row", async () => {
    const productRollback = await db.product.create({
      data: {
        name: "RM Test Product (rollback)",
        sku: `RM-ROLLBACK-${Date.now()}`,
        defaultUnitId: unitId,
        organizationId,
      },
    });

    await expect(
      db.$transaction(async (tx) => {
        await recordMovement({
          warehouseId,
          productId: productRollback.id,
          unitId,
          quantity: 5,
          baseQuantity: 5,
          movementType: "PURCHASE_IN",
          actorId,
          tx,
        });
        throw new Error("force rollback");
      })
    ).rejects.toThrow("force rollback");

    const balance = await db.inventoryBalance.findUnique({
      where: { warehouseId_productId: { warehouseId, productId: productRollback.id } },
    });
    expect(balance).toBeNull();

    const movements = await db.inventoryMovement.findMany({
      where: { warehouseId, productId: productRollback.id },
    });
    expect(movements).toHaveLength(0);
  });
});
