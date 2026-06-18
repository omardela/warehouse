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

interface LowStockRow {
  productId: string;
  productName: string;
  sku: string;
  warehouseId: string;
  warehouseName: string;
  unitSymbol: string;
  currentQuantity: number;
  reorderPoint: number;
  reorderQty: number | null;
  shortfall: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

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
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function LowStockReportPage({
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

  // Only balances with a reorder point configured AND currently at/below it.
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

  const rows: LowStockRow[] = balances
    .map((b) => {
      const qty = toNum(b.currentQuantity);
      const reorderPoint = b.reorderPoint as number;
      return {
        productId: b.productId,
        productName: b.product.name,
        sku: b.product.sku,
        warehouseId: b.warehouseId,
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

  const totalShortfall = rows.reduce((acc, r) => acc + Math.max(r.shortfall, 0), 0);
  const warehousesAffected = new Set(rows.map((r) => r.warehouseId)).size;

  // Build export URL preserving the current filter.
  const exportParams = new URLSearchParams();
  if (effectiveWarehouseId) exportParams.set("warehouseId", effectiveWarehouseId);
  const exportUrl = `/dashboard/reports/low-stock/export${
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
              Low Stock Report
            </h1>
            <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "4px" }}>
              Products at or below their configured reorder point, by warehouse.
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
            label="Products Below Reorder Point"
            value={rows.length.toString()}
            sub={effectiveWarehouseId ? "Selected warehouse" : "All warehouses"}
            valueColor={rows.length > 0 ? "#fbbf24" : "#dbe2fd"}
            prominent
          />
          <StatCard
            label="Total Shortfall"
            value={fmtQty(totalShortfall)}
            sub="Units below reorder point, summed"
          />
          <StatCard
            label="Warehouses Affected"
            value={warehousesAffected.toString()}
            sub="With at least one low stock item"
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
                href="/dashboard/reports/low-stock"
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
                    { label: "Current Qty", align: "right" as const },
                    { label: "Reorder Point", align: "right" as const },
                    { label: "Reorder Qty", align: "right" as const },
                    { label: "Shortfall", align: "right" as const },
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
                      No products are currently at or below their reorder point.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr
                      key={`${row.productId}-${row.warehouseId}-${idx}`}
                      style={{
                        borderBottom: "1px solid #1a2237",
                        backgroundColor: "transparent",
                      }}
                    >
                      <td style={{ padding: "12px 16px", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                        {row.productName}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "12px",
                            color: "#8c90a2",
                            background: "#0d1627",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            border: "1px solid #222a3e",
                          }}
                        >
                          {row.sku}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                        {row.warehouseName}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#f87171", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {fmtQty(row.currentQuantity)}{" "}
                        <span style={{ color: "#4a5068", fontSize: "11px", fontWeight: 400 }}>
                          {row.unitSymbol}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                        {row.reorderPoint}{" "}
                        <span style={{ color: "#4a5068", fontSize: "11px" }}>{row.unitSymbol}</span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                        {row.reorderQty != null ? (
                          <>
                            {row.reorderQty}{" "}
                            <span style={{ color: "#4a5068", fontSize: "11px" }}>{row.unitSymbol}</span>
                          </>
                        ) : (
                          <span style={{ color: "#4a5068", fontSize: "12px", fontStyle: "italic" }}>
                            Not set
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "3px 8px",
                            borderRadius: "10px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: "rgba(120,90,0,0.15)",
                            color: "#fbbf24",
                          }}
                        >
                          {fmtQty(row.shortfall)} {row.unitSymbol}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
