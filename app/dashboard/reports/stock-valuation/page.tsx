import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SearchParams = Promise<{
  warehouseId?: string;
}>;

interface StockValuationRow {
  productId: string;
  productName: string;
  sku: string;
  warehouseName: string;
  unitSymbol: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  hasCostData: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtQty(n: number): string {
  return n % 1 === 0 ? n.toString() : n.toFixed(3);
}

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = Number(v.toString());
  return isNaN(n) ? 0 : n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  valueColor,
  prominent,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  prominent?: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: "#171f33",
        border: prominent ? "1px solid #0062ff" : "1px solid #222a3e",
        borderRadius: "10px",
        padding: prominent ? "24px 28px" : "20px 24px",
      }}
    >
      <p
        style={{
          fontSize: "11px",
          color: "#8c90a2",
          margin: "0 0 8px",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: prominent ? "36px" : "28px",
          fontWeight: 700,
          color: valueColor ?? "#dbe2fd",
          margin: 0,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: "12px", color: "#8c90a2", margin: "6px 0 0" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// No cost data badge (styled like the LOW STOCK badge)
// ─────────────────────────────────────────────────────────────────────────────

function NoCostDataBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "10px",
        background: "rgba(245,158,11,0.12)",
        color: "#f59e0b",
        fontSize: "11px",
        fontWeight: 600,
        border: "1px solid rgba(245,158,11,0.2)",
        marginLeft: "8px",
        whiteSpace: "nowrap",
      }}
    >
      No cost data
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function StockValuationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "reports.stock.view");

  const params = await searchParams;
  const warehouseIdFilter = params.warehouseId ?? "";

  // Warehouses scoped to this org only.
  const warehouses = await db.warehouse.findMany({
    where: { organizationId: session.orgId, archivedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const validWarehouseIds = new Set(warehouses.map((w) => w.id));
  const effectiveWarehouseId =
    warehouseIdFilter && validWarehouseIds.has(warehouseIdFilter)
      ? warehouseIdFilter
      : "";

  // Inventory balances scoped to org's warehouses (and optional single warehouse filter).
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

  // Most recent CONFIRMED purchase invoice line per product (last purchase price),
  // scoped to this org via warehouse.organizationId.
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

  // Keep only the most recent line per product (first occurrence due to ordering).
  const lastCostMap = new Map<string, number>();
  for (const line of purchaseLines) {
    if (!lastCostMap.has(line.productId)) {
      lastCostMap.set(line.productId, toNum(line.unitPrice));
    }
  }

  const rows: StockValuationRow[] = balances.map((b) => {
    const qty = toNum(b.currentQuantity);
    const cost = lastCostMap.get(b.productId);
    const unitCost = cost ?? 0;
    const hasCostData = cost != null;
    return {
      productId: b.productId,
      productName: b.product.name,
      sku: b.product.sku,
      warehouseName: b.warehouse.name,
      unitSymbol: b.product.defaultUnit.symbol,
      quantity: qty,
      unitCost,
      totalValue: qty * unitCost,
      hasCostData,
    };
  });

  const totalInventoryValue = rows.reduce((acc, r) => acc + r.totalValue, 0);
  const totalQuantity = rows.reduce((acc, r) => acc + r.quantity, 0);
  const productsWithoutCost = rows.filter((r) => !r.hasCostData).length;

  // Build export URL preserving the current filter.
  const exportParams = new URLSearchParams();
  if (effectiveWarehouseId) exportParams.set("warehouseId", effectiveWarehouseId);
  const exportUrl = `/dashboard/reports/stock-valuation/export${
    exportParams.toString() ? `?${exportParams.toString()}` : ""
  }`;

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "24px",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
              Stock Valuation
            </h1>
            <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "4px" }}>
              Current inventory value based on the most recent confirmed purchase price.
            </p>
          </div>
          <Link
            href={exportUrl}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #222a3e",
              backgroundColor: "#171f33",
              color: "#8c90a2",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path
                d="M6.5 1V9M6.5 9L3.5 6M6.5 9L9.5 6"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M1.5 10.5H11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Export CSV
          </Link>
        </div>

        {/* Stat cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <StatCard
            label="Total Inventory Value"
            value={fmtMoney(totalInventoryValue)}
            sub={effectiveWarehouseId ? "Selected warehouse" : "All warehouses"}
            prominent
          />
          <StatCard
            label="Total Quantity on Hand"
            value={fmtQty(totalQuantity)}
            sub={`${rows.length} product / warehouse line${rows.length === 1 ? "" : "s"}`}
          />
          <StatCard
            label="Products Missing Cost Data"
            value={productsWithoutCost.toString()}
            valueColor={productsWithoutCost > 0 ? "#f59e0b" : "#dbe2fd"}
            sub="No confirmed purchase history"
          />
        </div>

        {/* Warehouse filter */}
        <div
          style={{
            background: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "16px",
          }}
        >
          <form
            method="GET"
            style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}
          >
            <select
              name="warehouseId"
              defaultValue={effectiveWarehouseId}
              style={{
                padding: "8px 12px",
                background: "#0d1627",
                border: "1px solid #2d3449",
                borderRadius: "8px",
                color: effectiveWarehouseId ? "#dbe2fd" : "#4a5068",
                fontSize: "13px",
                outline: "none",
                minWidth: "220px",
              }}
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              style={{
                padding: "8px 16px",
                background: "#0062ff",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Filter
            </button>

            {effectiveWarehouseId && (
              <Link
                href="/dashboard/reports/stock-valuation"
                style={{
                  padding: "8px 12px",
                  border: "1px solid #2d3449",
                  borderRadius: "8px",
                  color: "#8c90a2",
                  fontSize: "13px",
                  textDecoration: "none",
                }}
              >
                Clear
              </Link>
            )}
          </form>
        </div>

        {/* Table */}
        <div
          style={{
            backgroundColor: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #222a3e" }}>
                  {[
                    { label: "Product", align: "left" as const },
                    { label: "SKU", align: "left" as const },
                    { label: "Warehouse", align: "left" as const },
                    { label: "Unit", align: "left" as const },
                    { label: "Quantity on Hand", align: "right" as const },
                    { label: "Unit Cost", align: "right" as const },
                    { label: "Total Value", align: "right" as const },
                  ].map((col) => (
                    <th
                      key={col.label}
                      style={{
                        padding: "10px 16px",
                        textAlign: col.align,
                        fontSize: "11px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "#8c90a2",
                        backgroundColor: "#0d1627",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding: "48px 24px",
                        textAlign: "center",
                        color: "#4a5068",
                        fontSize: "13px",
                      }}
                    >
                      No inventory records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr
                      key={`${row.productId}-${row.warehouseName}-${idx}`}
                      style={{
                        borderBottom: "1px solid #1a2237",
                        backgroundColor: "transparent",
                      }}
                    >
                      <td style={{ padding: "12px 16px", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                        {row.productName}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                        {row.sku}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                        {row.warehouseName}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                        {row.unitSymbol}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                        {fmtQty(row.quantity)}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end" }}>
                          {fmtMoney(row.unitCost)}
                          {!row.hasCostData && <NoCostDataBadge />}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", whiteSpace: "nowrap", fontWeight: 600 }}>
                        {fmtMoney(row.totalValue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: "1px solid #222a3e", backgroundColor: "#0d1627" }}>
                    <td
                      colSpan={4}
                      style={{
                        padding: "12px 16px",
                        color: "#8c90a2",
                        fontWeight: 600,
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Totals
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", fontWeight: 700 }}>
                      {fmtQty(totalQuantity)}
                    </td>
                    <td style={{ padding: "12px 16px" }} />
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", fontWeight: 700 }}>
                      {fmtMoney(totalInventoryValue)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
