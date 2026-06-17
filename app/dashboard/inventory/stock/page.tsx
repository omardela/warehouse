import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { StockRealtimeWrapper } from "./StockRealtimeWrapper";

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

  // "On Order" = outstanding (not-yet-received) base quantity across open
  // purchase order lines (SENT or PARTIAL) for this warehouse, summed per product.
  const openPurchaseOrderLines = await db.purchaseOrderLine.findMany({
    where: {
      purchaseOrder: {
        warehouseId: session.warehouseId,
        status: { in: ["SENT", "PARTIAL"] },
      },
    },
    select: { productId: true, baseQuantity: true, receivedBaseQuantity: true },
  });
  const onOrderByProduct = new Map<string, number>();
  for (const line of openPurchaseOrderLines) {
    const outstanding = Number(line.baseQuantity) - Number(line.receivedBaseQuantity);
    if (outstanding <= 0) continue;
    onOrderByProduct.set(line.productId, (onOrderByProduct.get(line.productId) ?? 0) + outstanding);
  }

  // Enrich with computed status
  const enriched = products
    .map((p) => {
      const rawQty = p.inventoryBalances[0]?.currentQuantity ?? null;
      const qty = rawQty != null ? parseFloat(rawQty.toString()) : 0;
      const onOrder = onOrderByProduct.get(p.id) ?? 0;
      const status: "out" | "low" | "healthy" =
        qty <= 0
          ? "out"
          : p.lowStockThreshold != null && qty <= p.lowStockThreshold
          ? "low"
          : "healthy";
      return { ...p, qty, onOrder, status };
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
    (p) => p.lowStockThreshold != null && p.qty > 0 && p.qty <= p.lowStockThreshold
  ).length;
  const outOfStockCount = allForStats.filter((p) => p.qty <= 0).length;
  const healthyCount = allForStats.filter(
    (p) => p.qty > 0 && (p.lowStockThreshold == null || p.qty > p.lowStockThreshold)
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

        {/* Table — realtime wrapper handles live qty updates */}
        <StockRealtimeWrapper
          initialRows={enriched.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            archivedAt: p.archivedAt,
            lowStockThreshold: p.lowStockThreshold,
            qty: p.qty,
            onOrder: p.onOrder,
            status: p.status,
            defaultUnit: p.defaultUnit,
            category: p.category,
          }))}
          warehouseId={session.warehouseId}
        />
      </div>
    </div>
  );
}
