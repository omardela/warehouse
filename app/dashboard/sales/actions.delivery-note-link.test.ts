import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

// createSalesInvoiceAction reads the session via getSession() (next/headers cookies + JWT)
// and checks RBAC via requirePermission() (employee.warehouseRole.permissions). Both are
// mocked here so the test can focus on the deliveryNoteId linkage/validation logic itself,
// rather than on cookie/JWT plumbing or RBAC fixture setup — consistent with this being a
// unit test of the action's business logic, not an end-to-end request test.
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
import { createSalesInvoiceAction } from "./actions";

describe("createSalesInvoiceAction — delivery note linkage", () => {
  let organizationId: string;
  let warehouseId: string;
  let unitId: string;
  let actorId: string;
  let customerId: string;
  let productId: string;

  beforeAll(async () => {
    const org = await db.organization.create({ data: { name: "DN-Link Test Org" } });
    organizationId = org.id;

    const warehouse = await db.warehouse.create({
      data: { name: "DN-Link Test Warehouse", organizationId },
    });
    warehouseId = warehouse.id;

    const unit = await db.productUnit.create({
      data: { name: "DN-Link Test Unit", symbol: `dnlu-${Date.now()}`, isBase: true },
    });
    unitId = unit.id;

    const employee = await db.employee.create({
      data: {
        name: "DN-Link Test Actor",
        email: `dn-link-test-actor-${Date.now()}@example.com`,
        passwordHash: "not-a-real-hash",
        warehouseId,
      },
    });
    actorId = employee.id;

    const customer = await db.customer.create({
      data: { name: "DN-Link Test Customer", organizationId },
    });
    customerId = customer.id;

    const product = await db.product.create({
      data: {
        name: "DN-Link Test Product",
        sku: `DNL-${Date.now()}`,
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
    await db.deliveryNoteLine.deleteMany({ where: { deliveryNote: { warehouseId } } });
    await db.deliveryNote.deleteMany({ where: { warehouseId } });
    await db.auditLog.deleteMany({ where: { actorId } });
    await db.customer.deleteMany({ where: { organizationId } });
    await db.product.deleteMany({ where: { organizationId } });
    await db.employee.deleteMany({ where: { warehouseId } });
    await db.productUnit.deleteMany({ where: { id: unitId } });
    await db.warehouse.deleteMany({ where: { organizationId } });
    await db.organization.deleteMany({ where: { id: organizationId } });
    await db.$disconnect();
  });

  async function createDeliveryNote(deliveredQty: number) {
    const dn = await db.deliveryNote.create({
      data: {
        salesOrderId: null,
        invoiceId: null,
        warehouseId,
        dispatchedById: actorId,
        note: "Test delivery note",
      },
    });
    await db.deliveryNoteLine.create({
      data: {
        deliveryNoteId: dn.id,
        salesOrderLineId: null,
        productId,
        unitId,
        displayQuantity: deliveredQty,
        baseQuantity: deliveredQty,
      },
    });
    return dn;
  }

  function buildFormData(opts: { deliveryNoteId: string; quantity: number }): FormData {
    const fd = new FormData();
    fd.set("customerId", customerId);
    fd.set("deliveryNoteId", opts.deliveryNoteId);
    fd.set("lineCount", "1");
    fd.set("line_productId_0", productId);
    fd.set("line_unitId_0", unitId);
    fd.set("line_quantity_0", String(opts.quantity));
    fd.set("line_unitPrice_0", "10");
    return fd;
  }

  it("invoicing the full delivered quantity (12) succeeds and persists deliveryNoteId", async () => {
    const dn = await createDeliveryNote(12);

    const result = await createSalesInvoiceAction(null, buildFormData({ deliveryNoteId: dn.id, quantity: 12 }));

    expect(result).not.toBeNull();
    expect(result && "error" in result ? result.error : null).toBeNull();
    expect(result && "invoiceId" in result ? result.invoiceId : undefined).toBeDefined();

    const invoiceId = (result as { invoiceId: string }).invoiceId;
    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
    expect(invoice?.deliveryNoteId).toBe(dn.id);
  });

  it("a second invoice attempting to link the same delivery note is rejected", async () => {
    const dn = await createDeliveryNote(12);

    const first = await createSalesInvoiceAction(null, buildFormData({ deliveryNoteId: dn.id, quantity: 12 }));
    expect(first && "invoiceId" in first ? first.invoiceId : undefined).toBeDefined();

    const second = await createSalesInvoiceAction(null, buildFormData({ deliveryNoteId: dn.id, quantity: 12 }));
    expect(second && "error" in second).toBe(true);
  });

  it("invoicing more than was delivered (13 against a 12-unit delivery note) is rejected", async () => {
    const dn = await createDeliveryNote(12);

    const result = await createSalesInvoiceAction(null, buildFormData({ deliveryNoteId: dn.id, quantity: 13 }));

    expect(result && "error" in result).toBe(true);

    const invoiceCount = await db.invoice.count({ where: { deliveryNoteId: dn.id } });
    expect(invoiceCount).toBe(0);
  });

  it("a delivery note created implicitly for a direct sale (invoiceId already set) cannot be linked", async () => {
    // Simulate the implicit-DN case: an Invoice exists first, DN.invoiceId points to it.
    const implicitInvoice = await db.invoice.create({
      data: {
        type: "SALE",
        status: "CONFIRMED",
        warehouseId,
        customerId,
        totalAmount: 10,
        actorId,
      },
    });
    const dn = await db.deliveryNote.create({
      data: {
        salesOrderId: null,
        invoiceId: implicitInvoice.id,
        warehouseId,
        dispatchedById: actorId,
        note: "Implicit delivery note",
      },
    });
    await db.deliveryNoteLine.create({
      data: {
        deliveryNoteId: dn.id,
        salesOrderLineId: null,
        productId,
        unitId,
        displayQuantity: 12,
        baseQuantity: 12,
      },
    });

    const result = await createSalesInvoiceAction(null, buildFormData({ deliveryNoteId: dn.id, quantity: 5 }));

    expect(result && "error" in result).toBe(true);
  });
});
