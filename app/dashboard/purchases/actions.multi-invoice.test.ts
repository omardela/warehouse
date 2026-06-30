import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

// createPurchaseInvoiceAction reads the session via getSession() (next/headers cookies + JWT)
// and checks RBAC via requirePermission() (employee.warehouseRole.permissions). Both are
// mocked here so the test can focus on the multi-invoice remaining-to-invoice validation
// logic itself, rather than on cookie/JWT plumbing or RBAC fixture setup — consistent with
// the delivery-note-link test for sales invoices (app/dashboard/sales/actions.delivery-note-link.test.ts).
vi.mock("@/core/auth/session", () => ({
  getSession: vi.fn(),
}));
vi.mock("@/core/auth/require-permission", () => ({
  requirePermission: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getSession } from "@/core/auth/session";
import { createPurchaseInvoiceAction } from "./actions";

describe("createPurchaseInvoiceAction — multi-invoice PO billing", () => {
  let organizationId: string;
  let warehouseId: string;
  let unitId: string;
  let actorId: string;
  let supplierId: string;
  let productId: string;

  beforeAll(async () => {
    const org = await db.organization.create({ data: { name: "PO Multi-Invoice Test Org" } });
    organizationId = org.id;

    const warehouse = await db.warehouse.create({
      data: { name: "PO Multi-Invoice Test Warehouse", organizationId },
    });
    warehouseId = warehouse.id;

    const unit = await db.productUnit.create({
      data: { name: "PO Multi-Invoice Test Unit", symbol: `pomi-${Date.now()}`, isBase: true },
    });
    unitId = unit.id;

    const employee = await db.employee.create({
      data: {
        name: "PO Multi-Invoice Test Actor",
        email: `po-multi-invoice-test-actor-${Date.now()}@example.com`,
        passwordHash: "not-a-real-hash",
        warehouseId,
      },
    });
    actorId = employee.id;

    const supplier = await db.supplier.create({
      data: { name: "PO Multi-Invoice Test Supplier", organizationId },
    });
    supplierId = supplier.id;

    const product = await db.product.create({
      data: {
        name: "PO Multi-Invoice Test Product",
        sku: `POMI-${Date.now()}`,
        defaultUnitId: unitId,
        organizationId,
      },
    });
    productId = product.id;

    vi.mocked(getSession).mockResolvedValue({
      employeeId: actorId,
      warehouseId,
      orgId: organizationId,
      roleId: "n/a",
      warehouseRoleId: "n/a",
    });
  });

  afterAll(async () => {
    await db.invoiceLine.deleteMany({ where: { invoice: { warehouseId } } });
    await db.invoice.deleteMany({ where: { warehouseId } });
    await db.purchaseOrderLine.deleteMany({ where: { purchaseOrder: { warehouseId } } });
    await db.purchaseOrder.deleteMany({ where: { warehouseId } });
    await db.auditLog.deleteMany({ where: { actorId } });
    await db.supplier.deleteMany({ where: { organizationId } });
    await db.product.deleteMany({ where: { organizationId } });
    await db.employee.deleteMany({ where: { warehouseId } });
    await db.productUnit.deleteMany({ where: { id: unitId } });
    await db.warehouse.deleteMany({ where: { organizationId } });
    await db.organization.deleteMany({ where: { id: organizationId } });
    await db.$disconnect();
  });

  async function createReceivedPurchaseOrder(receivedBaseQuantity: number) {
    const po = await db.purchaseOrder.create({
      data: {
        organizationId,
        warehouseId,
        supplierId,
        status: "RECEIVED",
        createdById: actorId,
      },
    });
    const line = await db.purchaseOrderLine.create({
      data: {
        purchaseOrderId: po.id,
        productId,
        unitId,
        displayQuantity: receivedBaseQuantity,
        baseQuantity: receivedBaseQuantity,
        unitCost: 10,
        receivedBaseQuantity,
      },
    });
    return { po, line };
  }

  function buildFormData(opts: { purchaseOrderId: string; quantity: number }): FormData {
    const fd = new FormData();
    fd.set("supplierId", supplierId);
    fd.set("purchaseOrderId", opts.purchaseOrderId);
    fd.set("lineCount", "1");
    fd.set("line_productId_0", productId);
    fd.set("line_unitId_0", unitId);
    fd.set("line_quantity_0", String(opts.quantity));
    fd.set("line_unitPrice_0", "10");
    return fd;
  }

  it("bills a 24-unit received PO across three invoices (8 + 6 + 10), then rejects a 4th", async () => {
    const { po, line } = await createReceivedPurchaseOrder(24);

    const first = await createPurchaseInvoiceAction(null, buildFormData({ purchaseOrderId: po.id, quantity: 8 }));
    expect(first && "error" in first ? first.error : null).toBeNull();
    expect(first && "invoiceId" in first ? first.invoiceId : undefined).toBeDefined();

    let updatedLine = await db.purchaseOrderLine.findUniqueOrThrow({ where: { id: line.id } });
    expect(Number(updatedLine.invoicedBaseQuantity)).toBe(8);

    const second = await createPurchaseInvoiceAction(null, buildFormData({ purchaseOrderId: po.id, quantity: 6 }));
    expect(second && "error" in second ? second.error : null).toBeNull();
    expect(second && "invoiceId" in second ? second.invoiceId : undefined).toBeDefined();

    updatedLine = await db.purchaseOrderLine.findUniqueOrThrow({ where: { id: line.id } });
    expect(Number(updatedLine.invoicedBaseQuantity)).toBe(14);

    const third = await createPurchaseInvoiceAction(null, buildFormData({ purchaseOrderId: po.id, quantity: 10 }));
    expect(third && "error" in third ? third.error : null).toBeNull();
    expect(third && "invoiceId" in third ? third.invoiceId : undefined).toBeDefined();

    updatedLine = await db.purchaseOrderLine.findUniqueOrThrow({ where: { id: line.id } });
    expect(Number(updatedLine.invoicedBaseQuantity)).toBe(24);

    const invoiceCount = await db.invoice.count({ where: { purchaseOrderId: po.id } });
    expect(invoiceCount).toBe(3);

    // Nothing remains to invoice — a 4th invoice attempting to bill any positive amount is rejected.
    const fourth = await createPurchaseInvoiceAction(null, buildFormData({ purchaseOrderId: po.id, quantity: 1 }));
    expect(fourth && "error" in fourth).toBe(true);

    const finalLine = await db.purchaseOrderLine.findUniqueOrThrow({ where: { id: line.id } });
    expect(Number(finalLine.invoicedBaseQuantity)).toBe(24);

    const finalInvoiceCount = await db.invoice.count({ where: { purchaseOrderId: po.id } });
    expect(finalInvoiceCount).toBe(3);
  });

  it("rejects a single invoice attempting to bill more than the remaining-to-invoice amount", async () => {
    const { po, line } = await createReceivedPurchaseOrder(10);

    const first = await createPurchaseInvoiceAction(null, buildFormData({ purchaseOrderId: po.id, quantity: 7 }));
    expect(first && "invoiceId" in first ? first.invoiceId : undefined).toBeDefined();

    const updatedLine = await db.purchaseOrderLine.findUniqueOrThrow({ where: { id: line.id } });
    expect(Number(updatedLine.invoicedBaseQuantity)).toBe(7);

    // Only 3 remains (10 received - 7 invoiced); billing 4 should be rejected.
    const second = await createPurchaseInvoiceAction(null, buildFormData({ purchaseOrderId: po.id, quantity: 4 }));
    expect(second && "error" in second).toBe(true);

    const unchangedLine = await db.purchaseOrderLine.findUniqueOrThrow({ where: { id: line.id } });
    expect(Number(unchangedLine.invoicedBaseQuantity)).toBe(7);
  });
});
