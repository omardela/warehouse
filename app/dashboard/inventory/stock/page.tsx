import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    status?: string; // "low" | "out" | "" (all)
    archived?: string; // "1"
    q?: string;
  }>;
}

function formatQty(n: number): string {
  return n % 1 === 0 ? n.toString() : n.toFixed(4);
}

export default async function StockPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "inventory.balance.read");

  const params = await searchParams;
  const statusFilter = params.status ?? "";
  const showArchived = params.archived === "1";
  const q = params.q?.trim() ?? "";

  // Fetch all products for this org (with optional archive filter)
  const products = await db.product.findMany({
    where: {
      organizationId: session.orgId,
      ...(showArchived ? {} : { archivedAt: null }),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      defaultUnit: { select: { id: true, name: true, symbol: true } },
      category: { select: { id: true, name: true } },
      inventoryBalances: {
        where: { warehouseId: session.warehouseId },
        select: { currentQuantity: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Enrich with computed status
  const enriched = products
    .map((p) => {
      const rawQty = p.inventoryBalances[0]?.currentQuantity ?? null;
      const qty = rawQty != null ? parseFloat(rawQty.toString()) : 0;
      const status: "out" | "low" | "healthy" =
        qty <= 0 ? "out" : qty <= p.lowStockThreshold ? "low" : "healthy";
      return { ...p, qty, status };
    })
    .filter((p) => {
      if (statusFilter === "low") return p.status === "low";
      if (statusFilter === "out") return p.status === "out";
      return true;
    });

  // Stats over the full (unfiltered-by-status) dataset for the current warehouse
  const allForStats = products.map((p) => {
    const rawQty = p.inventoryBalances[0]?.currentQuantity ?? null;
    const qty = rawQty != null ? parseFloat(rawQty.toString()) : 0;
    return { qty, lowStockThreshold: p.lowStockThreshold };
  });

  const totalStockQty = allForStats.reduce((sum, p) => sum + p.qty, 0);
  const activeProductCount = products.filter((p) => !p.archivedAt).length;
  const lowStockCount = allForStats.filter(
    (p) => p.qty > 0 && p.qty <= p.lowStockThreshold
  ).length;
  const outOfStockCount = allForStats.filter((p) => p.qty <= 0).length;
  const healthyCount = allForStats.filter(
    (p) => p.qty > p.lowStockThreshold
  ).length;

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
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
              Inventory Overview
            </h1>
            <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "4px" }}>
              Current stock levels across all products in this warehouse.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Link
              href="/dashboard/inventory/adjustments"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #2d3449",
                color: "#8c90a2",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              + Adjustment
            </Link>
            <Link
              href="/dashboard/inventory/movements"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #2d3449",
                color: "#8c90a2",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              View Movements
            </Link>
          </div>
        </div>

        {/* Stats + Health row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr)) 280px",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          {/* Stats cards */}
          {[
            {
              label: "Total Stock Qty",
              value: formatQty(totalStockQty),
              sub: "base units across all products",
              color: "#dbe2fd",
            },
            {
              label: "Active Products",
              value: activeProductCount.toString(),
              sub: "in this warehouse",
              color: "#dbe2fd",
            },
            {
              label: "Low Stock",
              value: lowStockCount.toString(),
              sub: "products below threshold",
              color: lowStockCount > 0 ? "#fbbf24" : "#62df7d",
            },
            {
              label: "Out of Stock",
              value: outOfStockCount.toString(),
              sub: "products at zero",
              color: outOfStockCount > 0 ? "#f87171" : "#62df7d",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "#171f33",
                border: "1px solid #222a3e",
                borderRadius: "10px",
                padding: "18px 20px",
              }}
            >
              <div style={{ fontSize: "11px", color: "#8c90a2", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                {stat.label}
              </div>
              <div style={{ fontSize: "26px", fontWeight: 700, color: stat.color, marginBottom: "4px" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "11px", color: "#4a5068" }}>{stat.sub}</div>
            </div>
          ))}

          {/* Inventory Health card */}
          <div
            style={{
              background: "#171f33",
              border: "1px solid #222a3e",
              borderRadius: "10px",
              padding: "18px 20px",
              gridColumn: "span 1",
            }}
          >
            <div style={{ fontSize: "11px", color: "#8c90a2", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>
              Inventory Health
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { label: "Healthy", count: healthyCount, color: "#62df7d", bg: "rgba(0,108,73,0.15)" },
                { label: "Low Stock", count: lowStockCount, color: "#fbbf24", bg: "rgba(120,90,0,0.15)" },
                { label: "Out of Stock", count: outOfStockCount, color: "#f87171", bg: "rgba(127,29,29,0.15)" },
              ].map((item) => {
                const total = healthyCount + lowStockCount + outOfStockCount;
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", color: item.color, fontWeight: 500 }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: "12px", color: "#8c90a2" }}>
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: "6px", borderRadius: "3px", background: "#0d1627", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: item.color,
                          borderRadius: "3px",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            background: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "16px",
          }}
        >
          <form method="GET" style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            {/* Search */}
            <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
              <svg
                width="14" height="14" viewBox="0 0 14 14" fill="none"
                style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#4a5068", pointerEvents: "none" }}
              >
                <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                name="q"
                type="text"
                defaultValue={q}
                placeholder="Search by product name or SKU..."
                style={{
                  width: "100%",
                  paddingLeft: "32px",
                  paddingRight: "12px",
                  paddingTop: "8px",
                  paddingBottom: "8px",
                  background: "#0d1627",
                  border: "1px solid #2d3449",
                  borderRadius: "8px",
                  color: "#dbe2fd",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Status filter */}
            <select
              name="status"
              defaultValue={statusFilter}
              style={{
                padding: "8px 12px",
                background: "#0d1627",
                border: "1px solid #2d3449",
                borderRadius: "8px",
                color: statusFilter ? "#dbe2fd" : "#4a5068",
                fontSize: "13px",
                outline: "none",
                minWidth: "160px",
              }}
            >
              <option value="">All Status</option>
              <option value="low">Low Stock Only</option>
              <option value="out">Out of Stock Only</option>
            </select>

            {/* Archived toggle */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                fontSize: "13px",
                color: "#8c90a2",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                name="archived"
                value="1"
                defaultChecked={showArchived}
                style={{ accentColor: "#0062ff" }}
              />
              Show archived
            </label>

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

            {(q || statusFilter || showArchived) && (
              <Link
                href="/dashboard/inventory/stock"
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
            background: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #222a3e", background: "#0d1627" }}>
                  {["Product", "SKU", "Category", "Current Qty", "Low Stock Threshold", "Status"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 600,
                        color: "#8c90a2",
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enriched.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ padding: "56px 24px", textAlign: "center", color: "#8c90a2", fontSize: "14px" }}
                    >
                      {q || statusFilter
                        ? "No products match your filters."
                        : "No products found for this warehouse."}
                    </td>
                  </tr>
                ) : (
                  enriched.map((product, idx) => {
                    const isArchived = !!product.archivedAt;

                    const statusBadge =
                      product.status === "out"
                        ? {
                            label: "Out of Stock",
                            color: "#f87171",
                            bg: "rgba(127,29,29,0.15)",
                          }
                        : product.status === "low"
                        ? {
                            label: "Low Stock",
                            color: "#fbbf24",
                            bg: "rgba(120,90,0,0.15)",
                          }
                        : {
                            label: "Healthy",
                            color: "#62df7d",
                            bg: "rgba(0,108,73,0.15)",
                          };

                    return (
                      <tr
                        key={product.id}
                        style={{
                          borderBottom: idx < enriched.length - 1 ? "1px solid #1a2237" : "none",
                          background: isArchived ? "rgba(140,144,162,0.03)" : "transparent",
                        }}
                      >
                        {/* Product */}
                        <td style={{ padding: "12px 16px" }}>
                          <div
                            style={{
                              fontWeight: 500,
                              color: isArchived ? "#4a5068" : "#dbe2fd",
                              textDecoration: isArchived ? "line-through" : "none",
                            }}
                          >
                            {product.name}
                          </div>
                          {isArchived && (
                            <div style={{ fontSize: "10px", color: "#4a5068", marginTop: "2px" }}>
                              ARCHIVED
                            </div>
                          )}
                        </td>

                        {/* SKU */}
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "12px",
                              color: isArchived ? "#4a5068" : "#8c90a2",
                              background: "#0d1627",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              border: "1px solid #222a3e",
                            }}
                          >
                            {product.sku}
                          </span>
                        </td>

                        {/* Category */}
                        <td style={{ padding: "12px 16px" }}>
                          {product.category ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                background: "rgba(0,98,255,0.1)",
                                color: isArchived ? "#4a5068" : "#6b9fff",
                                fontSize: "11px",
                                fontWeight: 500,
                              }}
                            >
                              {product.category.name}
                            </span>
                          ) : (
                            <span style={{ color: "#4a5068", fontSize: "12px" }}>—</span>
                          )}
                        </td>

                        {/* Current Qty */}
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: "15px",
                                color: isArchived
                                  ? "#4a5068"
                                  : product.status === "out"
                                  ? "#f87171"
                                  : product.status === "low"
                                  ? "#fbbf24"
                                  : "#62df7d",
                              }}
                            >
                              {formatQty(product.qty)}
                            </span>
                            <span style={{ fontSize: "11px", color: "#4a5068" }}>
                              {product.defaultUnit.symbol}
                            </span>
                          </div>
                        </td>

                        {/* Low Stock Threshold */}
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ color: "#8c90a2", fontSize: "13px" }}>
                            {product.lowStockThreshold}{" "}
                            <span style={{ color: "#4a5068", fontSize: "11px" }}>
                              {product.defaultUnit.symbol}
                            </span>
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "3px 8px",
                              borderRadius: "10px",
                              fontSize: "11px",
                              fontWeight: 600,
                              background: isArchived ? "rgba(140,144,162,0.1)" : statusBadge.bg,
                              color: isArchived ? "#8c90a2" : statusBadge.color,
                            }}
                          >
                            {isArchived ? "ARCHIVED" : statusBadge.label.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid #222a3e",
              background: "#0d1627",
              fontSize: "12px",
              color: "#4a5068",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              {enriched.length} product{enriched.length !== 1 ? "s" : ""} shown
            </span>
            <Link
              href="/dashboard/inventory/movements"
              style={{ color: "#6699ff", textDecoration: "none", fontSize: "12px" }}
            >
              View movement history →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
