import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { computeOutstandingBalance } from "@/core/billing/compute-outstanding-balance";

describe("computeOutstandingBalance", () => {
  let organizationId: string;
  let warehouseId: string;
  let unitId: string;
  let actorId: string;
  let customerId: string;
  let productId: string;
  let invoiceId: string;

  beforeAll(async () => {
    const org = await db.organization.create({ data: { name: "Balance Test Org" } });
    organizationId = org.id;

    const warehouse = await db.warehouse.create({
      data: { name: "Balance Test Warehouse", organizationId },
    });
    warehouseId = warehouse.id;

    const unit = await db.productUnit.create({
      data: { name: "Balance Test Unit", symbol: `btu-${Date.now()}`, isBase: true },
    });
    unitId = unit.id;

    const employee = await db.employee.create({
      data: {
        name: "Balance Test Actor",
        email: `balance-test-actor-${Date.now()}@example.com`,
        passwordHash: "not-a-real-hash",
        warehouseId,
      },
    });
    actorId = employee.id;

    const customer = await db.customer.create({
      data: { name: "Balance Test Customer", organizationId },
    });
    customerId = customer.id;

    const product = await db.product.create({
      data: {
        name: "Balance Test Product",
        sku: `BAL-${Date.now()}`,
        defaultUnitId: unitId,
        organizationId,
      },
    });
    productId = product.id;

    // $1000 confirmed sales invoice: 10 units @ $100.
    const invoice = await db.invoice.create({
      data: {
        type: "SALE",
        status: "CONFIRMED",
        warehouseId,
        customerId,
        totalAmount: new Prisma.Decimal("1000.00"),
        actorId,
        confirmedAt: new Date(),
        lines: {
          create: [
            {
              productId,
              unitId,
              quantity: new Prisma.Decimal(10),
              unitPrice: new Prisma.Decimal("100.00"),
              totalPrice: new Prisma.Decimal("1000.00"),
            },
          ],
        },
      },
      select: { id: true },
    });
    invoiceId = invoice.id;

    // Confirmed credit note for $200: 2 units @ $100 returned.
    await db.creditNote.create({
      data: {
        type: "SALE",
        status: "CONFIRMED",
        organizationId,
        warehouseId,
        originalInvoiceId: invoiceId,
        createdById: actorId,
        confirmedAt: new Date(),
        lines: {
          create: [
            {
              productId,
              unitId,
              displayQuantity: new Prisma.Decimal(2),
              baseQuantity: new Prisma.Decimal(2),
              unitPrice: new Prisma.Decimal("100.00"),
            },
          ],
        },
      },
    });

    // A cancelled credit note for $50 must NOT affect the balance.
    await db.creditNote.create({
      data: {
        type: "SALE",
        status: "CANCELLED",
        organizationId,
        warehouseId,
        originalInvoiceId: invoiceId,
        createdById: actorId,
        lines: {
          create: [
            {
              productId,
              unitId,
              displayQuantity: new Prisma.Decimal(0.5),
              baseQuantity: new Prisma.Decimal(0.5),
              unitPrice: new Prisma.Decimal("100.00"),
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await db.payment.deleteMany({ where: { invoiceId } });
    await db.creditNoteLine.deleteMany({ where: { creditNote: { originalInvoiceId: invoiceId } } });
    await db.creditNote.deleteMany({ where: { originalInvoiceId: invoiceId } });
    await db.invoiceLine.deleteMany({ where: { invoiceId } });
    await db.invoice.deleteMany({ where: { id: invoiceId } });
    await db.customer.deleteMany({ where: { organizationId } });
    await db.product.deleteMany({ where: { organizationId } });
    await db.employee.deleteMany({ where: { warehouseId } });
    await db.productUnit.deleteMany({ where: { id: unitId } });
    await db.warehouse.deleteMany({ where: { organizationId } });
    await db.organization.deleteMany({ where: { id: organizationId } });
    await db.$disconnect();
  });

  async function loadInvoiceForBalance() {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        totalAmount: true,
        payments: { select: { amount: true } },
        creditNotes: {
          where: { status: { not: "CANCELLED" } },
          include: { lines: true },
        },
      },
    });
    if (!invoice) throw new Error("invoice not found");
    return invoice;
  }

  it("subtracts confirmed Credit Notes from the outstanding balance, ignoring cancelled ones", async () => {
    const invoice = await loadInvoiceForBalance();
    // $1000 total - $0 paid - $200 confirmed credit note = $800. The cancelled $50
    // credit note must not be counted.
    expect(computeOutstandingBalance(invoice)).toBeCloseTo(800, 2);
  });

  it("allows a payment of exactly the true remaining balance ($800) and rejects an overpayment ($801)", async () => {
    const beforePayment = await loadInvoiceForBalance();
    const remainingBefore = computeOutstandingBalance(beforePayment);

    // The same validation createSalesPaymentAction / createPurchasePaymentAction perform:
    // reject if the entered amount exceeds the true remaining balance.
    expect(801 > remainingBefore + 0.001).toBe(true); // $801 would be rejected
    expect(800 > remainingBefore + 0.001).toBe(false); // $800 is accepted

    await db.payment.create({
      data: {
        invoiceId,
        amount: new Prisma.Decimal("800.00"),
        method: "CASH",
        paidAt: new Date(),
        actorId,
      },
    });

    const invoice = await loadInvoiceForBalance();
    // $1000 total - $800 paid - $200 confirmed credit note = $0 (not $200, which is what
    // the old totalAmount - totalPaid formula would have reported).
    expect(computeOutstandingBalance(invoice)).toBeCloseTo(0, 2);
  });
});
