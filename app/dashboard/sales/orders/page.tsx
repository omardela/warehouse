import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 20;

function formatCurrency(val: number): string {
  return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    DRAFT: { bg: "rgba(139,92,246,0.15)", color: "#a78bfa" },
    CONFIRMED: { bg: "rgba(0,98,255,0.15)", color: "#6b9fff" },
    PARTIAL: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    FULFILLED: { bg: "rgba(98,223,125,0.12)", color: "#62df7d" },
    CANCELLED: { bg: "rgba(255,180,171,0.12)", color: "#ffb4ab" },
    CLOSED: { bg: "rgba(140,144,162,0.15)", color: "#8c90a2" },
  };
  const s = map[status] ?? { bg: "rgba(140,144,162,0.1)", color: "#8c90a2" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: "10px", background: s.bg, color: s.color, fontSize: "11px", fontWeight: 600 }}>
      {status}
    </span>
  );
}

export default async function SalesOrdersPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "sales.orders.view");

  const params = await searchParams;
  const statusFilter = params.status ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const validStatuses = ["DRAFT", "CONFIRMED", "PARTIAL", "FULFILLED", "CANCELLED", "CLOSED"];

  const where = {
    warehouseId: session.warehouseId,
    ...(statusFilter && validStatuses.includes(statusFilter)
      ? { status: statusFilter as "DRAFT" | "CONFIRMED" | "PARTIAL" | "FULFILLED" | "CANCELLED" | "CLOSED" }
      : {}),
  };

  const [orders, total] = await Promise.all([
    db.salesOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        customer: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        lines: { select: { displayQuantity: true, unitPrice: true, discount: true } },
      },
    }),
    db.salesOrder.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

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
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Link href="/dashboard/sales" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>
                Sales
              </Link>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#8c90a2", fontSize: "13px" }}>Sales Orders</span>
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
              Sales Orders
            </h1>
            <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "4px" }}>
              Track customer orders from confirmation through delivery.
            </p>
          </div>
          <Link
            href="/dashboard/sales/orders/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              background: "#0062ff",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1.5V12.5M1.5 7H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            New Sales Order
          </Link>
        </div>

        {/* Filters */}
        <div
          style={{
            background: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "16px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {["", "DRAFT", "CONFIRMED", "PARTIAL", "FULFILLED", "CANCELLED", "CLOSED"].map((s) => (
            <Link
              key={s}
              href={s ? `?status=${s}` : "/dashboard/sales/orders"}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 500,
                textDecoration: "none",
                border: `1px solid ${statusFilter === s ? "#0062ff" : "#2d3449"}`,
                background: statusFilter === s ? "rgba(0,98,255,0.15)" : "transparent",
                color: statusFilter === s ? "#6b9fff" : "#8c90a2",
              }}
            >
              {s || "All"}
            </Link>
          ))}
        </div>

        {/* Table */}
        <style>{`
          .so-row:hover { background: #1a2237 !important; }
        `}</style>
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
                  {["SO ID", "Customer", "Warehouse", "Date", "Total Value", "Status", "Actions"].map((h) => (
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
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "48px 24px", textAlign: "center", color: "#8c90a2", fontSize: "14px" }}>
                      {statusFilter ? `No ${statusFilter.toLowerCase()} sales orders found.` : "No sales orders yet."}
                    </td>
                  </tr>
                ) : (
                  orders.map((so) => {
                    const totalValue = so.lines.reduce((sum, l) => {
                      const discountFactor = l.discount != null ? 1 - Number(l.discount) / 100 : 1;
                      return sum + Number(l.displayQuantity) * Number(l.unitPrice) * discountFactor;
                    }, 0);
                    return (
                      <tr key={so.id} className="so-row" style={{ borderBottom: "1px solid #1a2237" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#dbe2fd", background: "#0d1627", padding: "2px 6px", borderRadius: "4px", border: "1px solid #222a3e" }}>
                            {so.id.slice(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#dbe2fd" }}>
                          {so.customer.name}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#8c90a2", fontSize: "12px" }}>
                          {so.warehouse.name}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#8c90a2", fontSize: "12px" }}>
                          {formatDate(so.createdAt)}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#dbe2fd" }}>
                          ${formatCurrency(totalValue)}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <StatusBadge status={so.status} />
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <Link
                            href={`/dashboard/sales/orders/${so.id}`}
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "12px", fontWeight: 500, textDecoration: "none" }}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderTop: "1px solid #222a3e",
                background: "#0d1627",
              }}
            >
              <span style={{ fontSize: "13px", color: "#8c90a2" }}>
                Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                {page > 1 && (
                  <Link
                    href={`?status=${statusFilter}&page=${page - 1}`}
                    style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #2d3449", color: "#dbe2fd", fontSize: "13px", textDecoration: "none" }}
                  >
                    Previous
                  </Link>
                )}
                <span style={{ padding: "6px 12px", borderRadius: "6px", background: "#0062ff", color: "#fff", fontSize: "13px", fontWeight: 600 }}>
                  {page}
                </span>
                {page < totalPages && (
                  <Link
                    href={`?status=${statusFilter}&page=${page + 1}`}
                    style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #2d3449", color: "#dbe2fd", fontSize: "13px", textDecoration: "none" }}
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
        <div style={{ marginTop: "12px", fontSize: "12px", color: "#4a5068", textAlign: "right" }}>
          {total} sales order{total !== 1 ? "s" : ""} total
        </div>
      </div>
    </div>
  );
}
