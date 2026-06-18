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
      reorderPoint: { not: null },
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
  });

  const rows = balances
    .map((b) => {
      const qty = toNum(b.currentQuantity);
      const reorderPoint = b.reorderPoint as number;
      return {
        productName: b.product.name,
        sku: b.product.sku,
        warehouseName: b.warehouse.name,
        unitSymbol: b.product.defaultUnit.symbol,
        currentQuantity: qty,
        reorderPoint,
        reorderQty: b.reorderQty,
        shortfall: reorderPoint - qty,
      };
    })
    .filter((r) => r.currentQuantity <= r.reorderPoint)
    .sort((a, b) => b.shortfall - a.shortfall);

  const csvRows = [
    buildCsvRow([
      "Product",
      "SKU",
      "Warehouse",
      "Current Qty",
      "Reorder Point",
      "Reorder Qty",
      "Shortfall",
    ]),
  ];

  for (const row of rows) {
    csvRows.push(
      buildCsvRow([
        row.productName,
        row.sku,
        row.warehouseName,
        row.currentQuantity.toFixed(4),
        row.reorderPoint,
        row.reorderQty ?? "",
        row.shortfall.toFixed(4),
      ])
    );
  }

  const csvContent = csvRows.join("\n");
  const filename = `low-stock-${new Date().toISOString().split("T")[0]}`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
