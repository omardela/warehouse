import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    customerId?: string;
    q?: string;
  }>;
}

function formatCurrency(val: number): string {
  return val.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    DRAFT: { bg: "rgba(139,92,246,0.15)", color: "#a78bfa" },
    CONFIRMED: { bg: "rgba(98,223,125,0.1)", color: "#62df7d" },
    CANCELLED: { bg: "rgba(140,144,162,0.1)", color: "#8c90a2" },
  };
  const style = map[status] ?? { bg: "rgba(140,144,162,0.1)", color: "#8c90a2" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: "10px",
        background: style.bg,
        color: style.color,
        fontSize: "11px",
        fontWeight: 600,
      }}
    >
      {status}
    </span>
  );
}

export default async function SalesPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "sales.invoices.read");

  const params = await searchParams;
  const statusFilter = params.status ?? "ALL";
  const customerIdFilter = params.customerId ?? "";
  const q = params.q?.trim() ?? "";

  const invoices = await db.invoice.findMany({
    where: {
      warehouseId: session.warehouseId,
      type: "SALE" as const,
      ...(statusFilter !== "ALL" ? { status: statusFilter as "DRAFT" | "CONFIRMED" | "CANCELLED" } : {}),
      ...(customerIdFilter ? { customerId: customerIdFilter } : {}),
    },
    include: {
      customer: { select: { id: true, name: true } },
      lines: { select: { discount: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Filter by customer name search client-side (via DB ILIKE if customerId not specified)
  const filteredInvoices = q
    ? invoices.filter((inv) =>
        inv.customer?.name.toLowerCase().includes(q.toLowerCase()) ||
        inv.id.toLowerCase().includes(q.toLowerCase())
      )
    : invoices;

  const statusOptions = ["ALL", "DRAFT", "CONFIRMED", "CANCELLED"];

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
              Sales Invoices
            </h1>
            <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "4px" }}>
              Track and manage all sales invoices, customer payments, and outstanding balances.
            </p>
          </div>
          <Link
            href="/dashboard/sales/new"
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
            New Sale
          </Link>
        </div>

        {/* Filters */}
        <div
          style={{
            background: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "16px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <form method="GET" style={{ display: "flex", gap: "12px", flexWrap: "wrap", flex: 1, alignItems: "center" }}>
            {/* Status tabs */}
            <div style={{ display: "flex", gap: "4px" }}>
              {statusOptions.map((s) => (
                <Link
                  key={s}
                  href={`?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 500,
                    textDecoration: "none",
                    background: statusFilter === s ? "#0062ff" : "#0d1627",
                    color: statusFilter === s ? "#fff" : "#8c90a2",
                    border: `1px solid ${statusFilter === s ? "#0062ff" : "#2d3449"}`,
                  }}
                >
                  {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </Link>
              ))}
            </div>

            <div style={{ position: "relative", flex: "1", minWidth: "180px" }}>
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
                placeholder="Search by customer or ID..."
                style={{
                  width: "100%",
                  paddingLeft: "32px",
                  paddingRight: "12px",
                  paddingTop: "7px",
                  paddingBottom: "7px",
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
            <input type="hidden" name="status" value={statusFilter} />
            <button
              type="submit"
              style={{
                padding: "7px 14px",
                background: "#0062ff",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Search
            </button>
          </form>
        </div>

        {/* Table */}
        <style>{`
          .invoice-row:hover { background: #1a2237 !important; }
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
                  {["Invoice ID", "Customer", "Total Amount", "Discount", "Status", "Created", "Confirmed", "Actions"].map((h) => (
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
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "48px 24px", textAlign: "center", color: "#8c90a2", fontSize: "14px" }}>
                      {q || statusFilter !== "ALL"
                        ? "No invoices match your filters."
                        : "No sales invoices yet. Create your first sale to get started."}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const hasDiscount = invoice.lines.some((l) => l.discount && Number(l.discount) > 0);

                    return (
                      <tr
                        key={invoice.id}
                        className="invoice-row"
                        style={{ borderBottom: "1px solid #1a2237" }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#8c90a2", background: "#0d1627", padding: "2px 6px", borderRadius: "4px", border: "1px solid #222a3e" }}>
                            {invoice.id.slice(0, 14)}…
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#dbe2fd", fontWeight: 500 }}>
                          {invoice.customer ? (
                            <Link
                              href={`/dashboard/customers/${invoice.customer.id}`}
                              style={{ color: "#dbe2fd", textDecoration: "none" }}
                            >
                              {invoice.customer.name}
                            </Link>
                          ) : (
                            <span style={{ color: "#4a5068" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#dbe2fd" }}>
                          {formatCurrency(Number(invoice.totalAmount))}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {hasDiscount ? (
                            <span style={{ fontSize: "11px", color: "#62df7d", background: "rgba(98,223,125,0.08)", padding: "2px 6px", borderRadius: "4px" }}>
                              Yes
                            </span>
                          ) : (
                            <span style={{ color: "#4a5068" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <StatusBadge status={invoice.status} />
                        </td>
                        <td style={{ padding: "12px 16px", color: "#8c90a2" }}>
                          {formatDate(invoice.createdAt)}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#8c90a2" }}>
                          {invoice.confirmedAt ? formatDate(invoice.confirmedAt) : <span style={{ color: "#4a5068" }}>—</span>}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <Link
                            href={`/dashboard/sales/${invoice.id}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "5px 12px",
                              borderRadius: "6px",
                              border: "1px solid #2d3449",
                              color: "#8c90a2",
                              fontSize: "12px",
                              fontWeight: 500,
                              textDecoration: "none",
                            }}
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

          <div style={{ padding: "10px 16px", borderTop: "1px solid #222a3e", background: "#0d1627", fontSize: "12px", color: "#4a5068", textAlign: "right" }}>
            {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
