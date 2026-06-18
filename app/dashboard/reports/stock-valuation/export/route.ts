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

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await requirePermission(session, "reports.stock.view");
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const warehouseIdParam = searchParams.get("warehouseId") ?? "";

  // Warehouses scoped to this org only — validate the filter against them.
  const warehouses = await db.warehouse.findMany({
    where: { organizationId: session.orgId, archivedAt: null },
    select: { id: true },
  });
  const validWarehouseIds = new Set(warehouses.map((w) => w.id));
  const effectiveWarehouseId =
    warehouseIdParam && validWarehouseIds.has(warehouseIdParam) ? warehouseIdParam : "";

  const balances = await db.inventoryBalance.findMany({
    where: {
      warehouse: { organizationId: session.orgId },
      ...(effectiveWarehouseId ? { warehouseId: effectiveWarehouseId } : {}),
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          defaultUnit: { select: { symbol: true } },
        },
      },
      warehouse: { select: { id: true, name: true } },
    },
    orderBy: [{ warehouse: { name: "asc" } }, { product: { name: "asc" } }],
  });

  const productIds = [...new Set(balances.map((b) => b.productId))];

  const purchaseLines =
    productIds.length > 0
      ? await db.invoiceLine.findMany({
          where: {
            productId: { in: productIds },
            invoice: {
              type: "PURCHASE",
              status: "CONFIRMED",
              warehouse: { organizationId: session.orgId },
            },
          },
          select: {
            productId: true,
            unitPrice: true,
            invoice: { select: { confirmedAt: true } },
          },
          orderBy: { invoice: { confirmedAt: "desc" } },
        })
      : [];

  const lastCostMap = new Map<string, number>();
  for (const line of purchaseLines) {
    if (!lastCostMap.has(line.productId)) {
      lastCostMap.set(line.productId, toNum(line.unitPrice));
    }
  }

  const rows = [
    buildCsvRow([
      "Product",
      "SKU",
      "Warehouse",
      "Unit",
      "Quantity on Hand",
      "Unit Cost",
      "Total Value",
    ]),
  ];

  let totalValue = 0;
  for (const b of balances) {
    const qty = toNum(b.currentQuantity);
    const cost = lastCostMap.get(b.productId);
    const unitCost = cost ?? 0;
    const value = qty * unitCost;
    totalValue += value;
    rows.push(
      buildCsvRow([
        b.product.name,
        b.product.sku,
        b.warehouse.name,
        b.product.defaultUnit.symbol,
        qty.toFixed(4),
        unitCost.toFixed(2),
        value.toFixed(2),
      ])
    );
  }

  rows.push(buildCsvRow(["", "", "", "", "", "Total", totalValue.toFixed(2)]));

  const csvContent = rows.join("\n");
  const filename = `stock-valuation-${new Date().toISOString().split("T")[0]}`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
