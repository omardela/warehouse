import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/require-permission";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = Number(v.toString());
  return isNaN(n) ? 0 : n;
}

function escapeCsv(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvRow(values: (string | number | null | undefined)[]): string {
  return values.map(escapeCsv).join(",");
}

function getDateRange(from: string | null, to: string | null): { fromDate: Date; toDate: Date } {
  if (from && to) {
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    return { fromDate, toDate };
  }
  // Default: current month
  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const toDate = new Date(now);
  toDate.setHours(23, 59, 59, 999);
  return { fromDate, toDate };
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await requirePermission(session, "reports.report.read");
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const tab = searchParams.get("tab") ?? "sales";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const { fromDate, toDate } = getDateRange(from, to);

  let csvContent = "";
  let filename = `report-${tab}`;

  if (tab === "sales") {
    const salesLines = await db.invoiceLine.groupBy({
      by: ["productId"],
      where: {
        invoice: {
          type: "SALE",
          status: "CONFIRMED",
          warehouseId: session.warehouseId,
          createdAt: { gte: fromDate, lte: toDate },
        },
      },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: "desc" } },
    });

    const productIds = salesLines.map((l) => l.productId);
    const products =
      productIds.length > 0
        ? await db.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, sku: true },
          })
        : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const rows = [buildCsvRow(["Product", "SKU", "Qty Sold", "Revenue"])];
    for (const line of salesLines) {
      const product = productMap.get(line.productId);
      rows.push(
        buildCsvRow([
          product?.name ?? "Unknown",
          product?.sku ?? "",
          Math.round(toNum(line._sum.quantity)),
          toNum(line._sum.totalPrice).toFixed(2),
        ])
      );
    }
    csvContent = rows.join("\n");
    filename = `sales-report-${from ?? "current-month"}`;
  } else if (tab === "purchases") {
    const purchaseLines = await db.invoiceLine.groupBy({
      by: ["productId"],
      where: {
        invoice: {
          type: "PURCHASE",
          status: "CONFIRMED",
          warehouseId: session.warehouseId,
          createdAt: { gte: fromDate, lte: toDate },
        },
      },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: "desc" } },
    });

    const productIds = purchaseLines.map((l) => l.productId);
    const products =
      productIds.length > 0
        ? await db.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, sku: true },
          })
        : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const rows = [buildCsvRow(["Product", "SKU", "Qty Purchased", "Spend"])];
    for (const line of purchaseLines) {
      const product = productMap.get(line.productId);
      rows.push(
        buildCsvRow([
          product?.name ?? "Unknown",
          product?.sku ?? "",
          Math.round(toNum(line._sum.quantity)),
          toNum(line._sum.totalPrice).toFixed(2),
        ])
      );
    }
    csvContent = rows.join("\n");
    filename = `purchases-report-${from ?? "current-month"}`;
  } else if (tab === "profit") {
    const [salesLinesByProduct, purchaseLinesByProduct] = await Promise.all([
      db.invoiceLine.groupBy({
        by: ["productId"],
        where: {
          invoice: {
            type: "SALE",
            status: "CONFIRMED",
            warehouseId: session.warehouseId,
            createdAt: { gte: fromDate, lte: toDate },
          },
        },
        _sum: { totalPrice: true },
      }),
      db.invoiceLine.groupBy({
        by: ["productId"],
        where: {
          invoice: {
            type: "PURCHASE",
            status: "CONFIRMED",
            warehouseId: session.warehouseId,
            createdAt: { gte: fromDate, lte: toDate },
          },
        },
        _sum: { totalPrice: true },
      }),
    ]);

    const salesMap = new Map(
      salesLinesByProduct.map((l) => [l.productId, toNum(l._sum.totalPrice)])
    );
    const purchaseMap = new Map(
      purchaseLinesByProduct.map((l) => [l.productId, toNum(l._sum.totalPrice)])
    );
    const allProductIds = [
      ...new Set([...salesMap.keys(), ...purchaseMap.keys()]),
    ];

    const products =
      allProductIds.length > 0
        ? await db.product.findMany({
            where: { id: { in: allProductIds } },
            select: { id: true, name: true, sku: true },
          })
        : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const rows = [
      buildCsvRow(["Product", "SKU", "Sales Revenue", "Purchase Cost", "Revenue vs. Spend"]),
    ];
    const profitData = allProductIds
      .map((id) => {
        const sales = salesMap.get(id) ?? 0;
        const cost = purchaseMap.get(id) ?? 0;
        return { id, sales, cost, profit: sales - cost };
      })
      .sort((a, b) => b.profit - a.profit);

    for (const item of profitData) {
      const product = productMap.get(item.id);
      rows.push(
        buildCsvRow([
          product?.name ?? "Unknown",
          product?.sku ?? "",
          item.sales.toFixed(2),
          item.cost.toFixed(2),
          item.profit.toFixed(2),
        ])
      );
    }
    csvContent = rows.join("\n");
    filename = `revenue-vs-spend-${from ?? "current-month"}`;
  } else if (tab === "stock") {
    const [balances, purchaseLines] = await Promise.all([
      db.inventoryBalance.findMany({
        where: { warehouseId: session.warehouseId },
        include: { product: { select: { name: true, sku: true } } },
      }),
      db.invoiceLine.groupBy({
        by: ["productId"],
        where: {
          invoice: {
            type: "PURCHASE",
            status: "CONFIRMED",
            warehouseId: session.warehouseId,
          },
        },
        _sum: { quantity: true, totalPrice: true },
      }),
    ]);

    const avgCostMap = new Map<string, number>();
    for (const line of purchaseLines) {
      const qty = toNum(line._sum.quantity);
      const total = toNum(line._sum.totalPrice);
      if (qty > 0) {
        avgCostMap.set(line.productId, total / qty);
      }
    }

    const rows = [
      buildCsvRow(["Product", "SKU", "Current Qty", "Avg Cost", "Total Value"]),
    ];
    const sorted = balances
      .map((b) => {
        const qty = toNum(b.currentQuantity);
        const avgCost = avgCostMap.get(b.productId) ?? 0;
        return {
          name: b.product.name,
          sku: b.product.sku,
          qty,
          avgCost,
          totalValue: qty * avgCost,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue);

    for (const item of sorted) {
      rows.push(
        buildCsvRow([
          item.name,
          item.sku,
          item.qty.toFixed(4),
          item.avgCost.toFixed(2),
          item.totalValue.toFixed(2),
        ])
      );
    }
    csvContent = rows.join("\n");
    filename = "stock-valuation";
  } else {
    return new NextResponse("Invalid tab parameter", { status: 400 });
  }

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
