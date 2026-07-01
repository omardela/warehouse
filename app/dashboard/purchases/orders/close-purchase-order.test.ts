import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

const session = {
  employeeId: "",
  warehouseId: "",
  orgId: "",
  roleId: "",
  warehouseRoleId: "",
};

vi.mock("@/core/auth/session", () => ({
  getSession: vi.fn(async () => session),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { closePurchaseOrderAction } from "./actions";

describe("closePurchaseOrderAction", () => {
  let organizationId: string;
  let warehouseId: string;
  let unitId: string;
  let supplierId: string;
  let productId: string;
  let employeeId: string;

  beforeAll(async () => {
    const org = await db.organization.create({ data: { name: "Close PO Test Org" } });
    organizationId = org.id;

    const warehouse = await db.warehouse.create({
      data: { name: "Close PO Test Warehouse", organizationId },
    });
    warehouseId = warehouse.id;

    const unit = await db.productUnit.create({
      data: { name: "Close PO Test Unit", symbol: `cpu-${Date.now()}`, isBase: true },
    });
    unitId = unit.id;

    const supplier = await db.supplier.create({
      data: { name: "Close PO Test Supplier", organizationId },
    });
    supplierId = supplier.id;

    const product = await db.product.create({
      data: {
        name: "Close PO Test Product",
        sku: `CPO-${Date.now()}`,
        defaultUnitId: unitId,
        organizationId,
      },
    });
    productId = product.id;

    const roleTemplate = await db.roleTemplate.create({
      data: { name: `Close PO Test Role ${Date.now()}` },
    });

    const warehouseRole = await db.warehouseRole.create({
      data: { warehouseId, roleTemplateId: roleTemplate.id },
    });

    const permission = await db.permission.upsert({
      where: { code: "purchases.orders.create" },
      update: {},
      create: { code: "purchases.orders.create", description: "Create purchase orders" },
    });

    await db.warehouseRolePermission.create({
      data: { warehouseRoleId: warehouseRole.id, permissionId: permission.id },
    });

    const employee = await db.employee.create({
      data: {
        name: "Close PO Test Actor",
        email: `close-po-test-${Date.now()}@example.com`,
        passwordHash: "not-a-real-hash",
        warehouseId,
        warehouseRoleId: warehouseRole.id,
      },
    });
    employeeId = employee.id;

    session.employeeId = employeeId;
    session.warehouseId = warehouseId;
    session.orgId = organizationId;
    session.roleId = roleTemplate.id;
    session.warehouseRoleId = warehouseRole.id;
  });

  afterAll(async () => {
    await db.auditLog.deleteMany({ where: { actorId: employeeId } });
    await db.purchaseOrderLine.deleteMany({ where: { purchaseOrder: { warehouseId } } });
    await db.purchaseOrder.deleteMany({ where: { warehouseId } });
    await db.employee.deleteMany({ where: { warehouseId } });
    await db.warehouseRolePermission.deleteMany({ where: { warehouseRole: { warehouseId } } });
    await db.warehouseRole.deleteMany({ where: { warehouseId } });
    await db.product.deleteMany({ where: { organizationId } });
    await db.supplier.deleteMany({ where: { organizationId } });
    await db.productUnit.deleteMany({ where: { id: unitId } });
    await db.warehouse.deleteMany({ where: { organizationId } });
    await db.organization.deleteMany({ where: { id: organizationId } });
    await db.$disconnect();
  });

  async function createOrder(status: "DRAFT" | "SENT" | "PARTIAL" | "RECEIVED") {
    return db.purchaseOrder.create({
      data: {
        number: `PO-TEST-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        organizationId,
        warehouseId,
        supplierId,
        createdById: employeeId,
        status,
        lines: {
          create: [
            {
              productId,
              unitId,
              displayQuantity: 24,
              baseQuantity: 24,
              unitCost: 10,
              receivedBaseQuantity: status === "RECEIVED" ? 24 : status === "PARTIAL" ? 18 : 0,
            },
          ],
        },
      },
      include: { lines: true },
    });
  }

  async function callClose(purchaseOrderId: string): Promise<void> {
    const formData = new FormData();
    formData.set("purchaseOrderId", purchaseOrderId);
    await expect(closePurchaseOrderAction(formData)).rejects.toThrow("NEXT_REDIRECT");
  }

  it("closes a PARTIAL purchase order without touching received/invoiced quantities", async () => {
    const po = await createOrder("PARTIAL");
    const lineBefore = po.lines[0];

    await callClose(po.id);

    const updated = await db.purchaseOrder.findUniqueOrThrow({
      where: { id: po.id },
      include: { lines: true },
    });

    expect(updated.status).toBe("CLOSED");
    expect(Number(updated.lines[0].receivedBaseQuantity)).toBe(Number(lineBefore.receivedBaseQuantity));
    expect(Number(updated.lines[0].baseQuantity)).toBe(Number(lineBefore.baseQuantity));

    const auditEntry = await db.auditLog.findFirst({
      where: { entityType: "PurchaseOrder", entityId: po.id, action: "purchases.orders.close" },
    });
    expect(auditEntry).not.toBeNull();
  });

  it("rejects closing a DRAFT purchase order (nothing received — cancel instead)", async () => {
    const po = await createOrder("DRAFT");

    const formData = new FormData();
    formData.set("purchaseOrderId", po.id);
    await expect(closePurchaseOrderAction(formData)).rejects.toThrow(
      "Only partially received purchase orders can be closed."
    );

    const unchanged = await db.purchaseOrder.findUniqueOrThrow({ where: { id: po.id } });
    expect(unchanged.status).toBe("DRAFT");
  });

  it("rejects closing a SENT purchase order (nothing received — cancel instead)", async () => {
    const po = await createOrder("SENT");

    const formData = new FormData();
    formData.set("purchaseOrderId", po.id);
    await expect(closePurchaseOrderAction(formData)).rejects.toThrow(
      "Only partially received purchase orders can be closed."
    );

    const unchanged = await db.purchaseOrder.findUniqueOrThrow({ where: { id: po.id } });
    expect(unchanged.status).toBe("SENT");
  });

  it("rejects closing a RECEIVED purchase order (already terminal)", async () => {
    const po = await createOrder("RECEIVED");

    const formData = new FormData();
    formData.set("purchaseOrderId", po.id);
    await expect(closePurchaseOrderAction(formData)).rejects.toThrow(
      "Only partially received purchase orders can be closed."
    );

    const unchanged = await db.purchaseOrder.findUniqueOrThrow({ where: { id: po.id } });
    expect(unchanged.status).toBe("RECEIVED");
  });
});
