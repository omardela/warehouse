import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { applyQuantityCapUpdate } from "@/core/inventory/apply-quantity-cap-update";

describe("applyQuantityCapUpdate", () => {
  let organizationId: string;
  let warehouseId: string;
  let unitId: string;
  let actorId: string;
  let supplierId: string;
  let customerId: string;
  let productId: string;

  beforeAll(async () => {
    const org = await db.organization.create({ data: { name: "ACU Test Org" } });
    organizationId = org.id;

    const warehouse = await db.warehouse.create({
      data: { name: "ACU Test Warehouse", organizationId },
    });
    warehouseId = warehouse.id;

    const unit = await db.productUnit.create({
      data: { name: "ACU Test Unit", symbol: `acutu-${Date.now()}`, isBase: true },
    });
    unitId = unit.id;

    const employee = await db.employee.create({
      data: {
        name: "ACU Test Actor",
        email: `acu-test-actor-${Date.now()}@example.com`,
        passwordHash: "not-a-real-hash",
        warehouseId,
      },
    });
    actorId = employee.id;

    const supplier = await db.supplier.create({
      data: { name: "ACU Test Supplier", organizationId },
    });
    supplierId = supplier.id;

    const customer = await db.customer.create({
      data: { name: "ACU Test Customer", organizationId },
    });
    customerId = customer.id;

    const product = await db.product.create({
      data: {
        name: "ACU Test Product",
        sku: `ACU-${Date.now()}`,
        defaultUnitId: unitId,
        organizationId,
      },
    });
    productId = product.id;
  });

  afterAll(async () => {
    await db.purchaseOrderLine.deleteMany({ where: { purchaseOrder: { organizationId } } });
    await db.purchaseOrder.deleteMany({ where: { organizationId } });
    await db.salesOrderLine.deleteMany({ where: { salesOrder: { organizationId } } });
    await db.salesOrder.deleteMany({ where: { organizationId } });
    await db.product.deleteMany({ where: { organizationId } });
    await db.supplier.deleteMany({ where: { organizationId } });
    await db.customer.deleteMany({ where: { organizationId } });
    await db.employee.deleteMany({ where: { warehouseId } });
    await db.productUnit.deleteMany({ where: { id: unitId } });
    await db.warehouse.deleteMany({ where: { organizationId } });
    await db.organization.deleteMany({ where: { id: organizationId } });
    await db.$disconnect();
  });

  it("applies the increment when the result stays at or under the cap", async () => {
    const po = await db.purchaseOrder.create({
      data: {
        organizationId,
        warehouseId,
        supplierId,
        createdById: actorId,
        status: "SENT",
      },
    });
    const poLine = await db.purchaseOrderLine.create({
      data: {
        purchaseOrderId: po.id,
        productId,
        unitId,
        displayQuantity: 10,
        baseQuantity: 10,
        unitCost: 1,
      },
    });

    await applyQuantityCapUpdate({
      table: "purchase_order_lines",
      id: poLine.id,
      column: "receivedBaseQuantity",
      capColumn: "baseQuantity",
      amount: 10,
      errorMessage: "Received quantity exceeds outstanding quantity for one or more lines.",
    });

    const refreshed = await db.purchaseOrderLine.findUnique({ where: { id: poLine.id } });
    expect(Number(refreshed?.receivedBaseQuantity)).toBe(10);
  });

  it("rejects an increment that would push the running total past the cap", async () => {
    const po = await db.purchaseOrder.create({
      data: {
        organizationId,
        warehouseId,
        supplierId,
        createdById: actorId,
        status: "SENT",
      },
    });
    const poLine = await db.purchaseOrderLine.create({
      data: {
        purchaseOrderId: po.id,
        productId,
        unitId,
        displayQuantity: 10,
        baseQuantity: 10,
        unitCost: 1,
      },
    });

    await expect(
      applyQuantityCapUpdate({
        table: "purchase_order_lines",
        id: poLine.id,
        column: "receivedBaseQuantity",
        capColumn: "baseQuantity",
        amount: 11,
        errorMessage: "Received quantity exceeds outstanding quantity for one or more lines.",
      })
    ).rejects.toThrow("Received quantity exceeds outstanding quantity for one or more lines.");

    const refreshed = await db.purchaseOrderLine.findUnique({ where: { id: poLine.id } });
    expect(Number(refreshed?.receivedBaseQuantity)).toBe(0);
  });

  it("rolls back the caller's transaction when the cap check fails inside it", async () => {
    const po = await db.purchaseOrder.create({
      data: {
        organizationId,
        warehouseId,
        supplierId,
        createdById: actorId,
        status: "SENT",
      },
    });
    const poLine = await db.purchaseOrderLine.create({
      data: {
        purchaseOrderId: po.id,
        productId,
        unitId,
        displayQuantity: 5,
        baseQuantity: 5,
        unitCost: 1,
      },
    });

    await expect(
      db.$transaction(async (tx) => {
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { note: "should be rolled back" },
        });
        await applyQuantityCapUpdate({
          table: "purchase_order_lines",
          id: poLine.id,
          column: "receivedBaseQuantity",
          capColumn: "baseQuantity",
          amount: 6,
          errorMessage: "Received quantity exceeds outstanding quantity for one or more lines.",
          tx,
        });
      })
    ).rejects.toThrow("Received quantity exceeds outstanding quantity for one or more lines.");

    const refreshedPo = await db.purchaseOrder.findUnique({ where: { id: po.id } });
    expect(refreshedPo?.note).toBeNull();
  });

  it("PO race: two concurrent receipts summing past baseQuantity — exactly one succeeds and the total never exceeds the cap", async () => {
    const po = await db.purchaseOrder.create({
      data: {
        organizationId,
        warehouseId,
        supplierId,
        createdById: actorId,
        status: "SENT",
      },
    });
    const poLine = await db.purchaseOrderLine.create({
      data: {
        purchaseOrderId: po.id,
        productId,
        unitId,
        displayQuantity: 10,
        baseQuantity: 10,
        unitCost: 1,
      },
    });

    // Each receipt alone is within the outstanding quantity (10), but the two
    // together (6 + 6 = 12) exceed it. Under the old blind-increment pattern,
    // both could read receivedBaseQuantity = 0 before either commits and both
    // would succeed, over-receiving past baseQuantity.
    const attempt = () =>
      db.$transaction((tx) =>
        applyQuantityCapUpdate({
          table: "purchase_order_lines",
          id: poLine.id,
          column: "receivedBaseQuantity",
          capColumn: "baseQuantity",
          amount: 6,
          errorMessage: "Received quantity exceeds outstanding quantity for one or more lines.",
          tx,
        })
      );

    const results = await Promise.allSettled([attempt(), attempt()]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason.message).toContain(
      "Received quantity exceeds outstanding quantity for one or more lines."
    );

    const refreshed = await db.purchaseOrderLine.findUnique({ where: { id: poLine.id } });
    expect(Number(refreshed?.receivedBaseQuantity)).toBe(6);
    expect(Number(refreshed?.receivedBaseQuantity)).toBeLessThanOrEqual(
      Number(refreshed?.baseQuantity)
    );
  });

  it("SO race: two concurrent deliveries summing past baseQuantity — exactly one succeeds and the total never exceeds the cap", async () => {
    const so = await db.salesOrder.create({
      data: {
        organizationId,
        warehouseId,
        customerId,
        createdById: actorId,
        status: "CONFIRMED",
      },
    });
    const soLine = await db.salesOrderLine.create({
      data: {
        salesOrderId: so.id,
        productId,
        unitId,
        displayQuantity: 10,
        baseQuantity: 10,
        unitPrice: 1,
      },
    });

    const attempt = () =>
      db.$transaction((tx) =>
        applyQuantityCapUpdate({
          table: "sales_order_lines",
          id: soLine.id,
          column: "deliveredBaseQuantity",
          capColumn: "baseQuantity",
          amount: 6,
          errorMessage: "Dispatched quantity exceeds remaining quantity for one or more lines.",
          tx,
        })
      );

    const results = await Promise.allSettled([attempt(), attempt()]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason.message).toContain(
      "Dispatched quantity exceeds remaining quantity for one or more lines."
    );

    const refreshed = await db.salesOrderLine.findUnique({ where: { id: soLine.id } });
    expect(Number(refreshed?.deliveredBaseQuantity)).toBe(6);
    expect(Number(refreshed?.deliveredBaseQuantity)).toBeLessThanOrEqual(
      Number(refreshed?.baseQuantity)
    );
  });
});
