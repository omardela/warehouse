import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

vi.mock("@/core/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { getSession } = await import("@/core/auth/session");
const { closeSalesOrderAction } = await import("./actions");

describe("closeSalesOrderAction", () => {
  let organizationId: string;
  let warehouseId: string;
  let unitId: string;
  let actorId: string;
  let customerId: string;
  let productId: string;

  beforeAll(async () => {
    const org = await db.organization.create({ data: { name: "Close SO Test Org" } });
    organizationId = org.id;

    const warehouse = await db.warehouse.create({
      data: { name: "Close SO Test Warehouse", organizationId },
    });
    warehouseId = warehouse.id;

    const unit = await db.productUnit.create({
      data: { name: "Close SO Test Unit", symbol: `cso-unit-${Date.now()}`, isBase: true },
    });
    unitId = unit.id;

    const permission = await db.permission.upsert({
      where: { code: "sales.orders.create" },
      update: {},
      create: { code: "sales.orders.create", description: "Create sales orders" },
    });

    const roleTemplate = await db.roleTemplate.create({
      data: { name: `Close SO Test Role ${Date.now()}` },
    });

    const warehouseRole = await db.warehouseRole.create({
      data: { warehouseId, roleTemplateId: roleTemplate.id },
    });

    await db.warehouseRolePermission.create({
      data: { warehouseRoleId: warehouseRole.id, permissionId: permission.id },
    });

    const employee = await db.employee.create({
      data: {
        name: "Close SO Test Actor",
        email: `close-so-actor-${Date.now()}@example.com`,
        passwordHash: "not-a-real-hash",
        warehouseId,
        warehouseRoleId: warehouseRole.id,
      },
    });
    actorId = employee.id;

    const customer = await db.customer.create({
      data: { name: "Close SO Test Customer", organizationId },
    });
    customerId = customer.id;

    const product = await db.product.create({
      data: {
        name: "Close SO Test Product",
        sku: `CLOSE-SO-${Date.now()}`,
        defaultUnitId: unitId,
        organizationId,
      },
    });
    productId = product.id;
  });

  beforeEach(() => {
    vi.mocked(getSession).mockResolvedValue({
      employeeId: actorId,
      warehouseId,
      orgId: organizationId,
      roleId: "n/a",
      warehouseRoleId: "n/a",
    });
  });

  afterAll(async () => {
    await db.auditLog.deleteMany({ where: { actorId } });
    await db.salesOrderLine.deleteMany({ where: { salesOrder: { warehouseId } } });
    await db.salesOrder.deleteMany({ where: { warehouseId } });
    await db.customer.deleteMany({ where: { organizationId } });
    await db.product.deleteMany({ where: { organizationId } });
    await db.employee.deleteMany({ where: { warehouseId } });
    await db.warehouseRolePermission.deleteMany({ where: { warehouseRole: { warehouseId } } });
    await db.warehouseRole.deleteMany({ where: { warehouseId } });
    await db.productUnit.deleteMany({ where: { id: unitId } });
    await db.warehouse.deleteMany({ where: { organizationId } });
    await db.organization.deleteMany({ where: { id: organizationId } });
    await db.$disconnect();
  });

  async function createSalesOrder(
    status: "DRAFT" | "CONFIRMED" | "PARTIAL" | "FULFILLED",
    deliveredBaseQuantity: number
  ) {
    return db.salesOrder.create({
      data: {
        organizationId,
        warehouseId,
        customerId,
        createdById: actorId,
        status,
        lines: {
          create: [
            {
              productId,
              unitId,
              displayQuantity: 24,
              baseQuantity: 24,
              unitPrice: 10,
              deliveredBaseQuantity,
            },
          ],
        },
      },
      include: { lines: true },
    });
  }

  function formDataFor(salesOrderId: string): FormData {
    const formData = new FormData();
    formData.set("salesOrderId", salesOrderId);
    return formData;
  }

  it("closes a PARTIAL sales order without touching deliveredBaseQuantity", async () => {
    const so = await createSalesOrder("PARTIAL", 18);

    const result = await closeSalesOrderAction(null, formDataFor(so.id));

    expect(result).not.toBeNull();
    expect(result && "success" in result ? result.success : false).toBe(true);

    const updated = await db.salesOrder.findUnique({
      where: { id: so.id },
      include: { lines: true },
    });
    expect(updated?.status).toBe("CLOSED");
    expect(Number(updated?.lines[0]?.deliveredBaseQuantity)).toBe(18);

    const auditEntry = await db.auditLog.findFirst({
      where: { entityType: "SalesOrder", entityId: so.id, action: "sales.orders.close" },
    });
    expect(auditEntry).not.toBeNull();
  });

  it("rejects closing a DRAFT sales order (nothing delivered, only cancel applies)", async () => {
    const so = await createSalesOrder("DRAFT", 0);

    const result = await closeSalesOrderAction(null, formDataFor(so.id));

    expect(result && "error" in result ? result.error : null).toBe(
      "Only partially fulfilled sales orders can be closed."
    );

    const unchanged = await db.salesOrder.findUnique({ where: { id: so.id } });
    expect(unchanged?.status).toBe("DRAFT");
  });

  it("rejects closing a CONFIRMED sales order (nothing delivered, only cancel applies)", async () => {
    const so = await createSalesOrder("CONFIRMED", 0);

    const result = await closeSalesOrderAction(null, formDataFor(so.id));

    expect(result && "error" in result ? result.error : null).toBe(
      "Only partially fulfilled sales orders can be closed."
    );

    const unchanged = await db.salesOrder.findUnique({ where: { id: so.id } });
    expect(unchanged?.status).toBe("CONFIRMED");
  });

  it("rejects closing a FULFILLED sales order (already terminal)", async () => {
    const so = await createSalesOrder("FULFILLED", 24);

    const result = await closeSalesOrderAction(null, formDataFor(so.id));

    expect(result && "error" in result ? result.error : null).toBe(
      "Only partially fulfilled sales orders can be closed."
    );

    const unchanged = await db.salesOrder.findUnique({ where: { id: so.id } });
    expect(unchanged?.status).toBe("FULFILLED");
  });
});
