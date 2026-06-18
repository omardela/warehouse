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
  view?: string;
  customerId?: string;
  asOf?: string;
}>;

type AgingBucket = "current" | "b1_30" | "b31_60" | "b61_90" | "b90_plus";

interface OutstandingInvoiceRow {
  invoiceId: string;
  customerId: string;
  customerName: string;
  invoiceDate: Date | null;
  dueDate: Date | null;
  originalAmount: number;
  paidAmount: number;
  balance: number;
  daysOverdue: number;
  bucket: AgingBucket;
}

interface CustomerAgingRow {
  customerId: string;
  customerName: string;
  current: number;
  b1_30: number;
  b31_60: number;
  b61_90: number;
  b90_plus: number;
  total: number;
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

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = Number(v.toString());
  return isNaN(n) ? 0 : n;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Aging computation helpers (shared shape with export route)
// ─────────────────────────────────────────────────────────────────────────────

function daysOverdueFor(dueDate: Date | null, asOfDate: Date): number {
  if (!dueDate) return 0;
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.floor(
    (asOfDate.setHours(0, 0, 0, 0) - new Date(dueDate).setHours(0, 0, 0, 0)) / msPerDay
  );
  return Math.max(0, diff);
}

function bucketFor(daysOverdue: number): AgingBucket {
  if (daysOverdue === 0) return "current";
  if (daysOverdue <= 30) return "b1_30";
  if (daysOverdue <= 60) return "b31_60";
  if (daysOverdue <= 90) return "b61_90";
  return "b90_plus";
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

export default async function ArAgingReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "reports.ar.view");

  const params = await searchParams;
  const view = params.view === "invoice" ? "invoice" : "customer";
  const customerIdFilter = params.customerId ?? "";

  const todayStr = toDateStr(new Date());
  const asOfParam = params.asOf ?? "";
  const asOfDate = asOfParam && !isNaN(new Date(asOfParam).getTime())
    ? new Date(asOfParam)
    : new Date();
  const asOfStr = asOfParam && !isNaN(new Date(asOfParam).getTime()) ? asOfParam : todayStr;

  // Customers scoped to this org only (for the filter dropdown).
  const customers = await db.customer.findMany({
    where: { organizationId: session.orgId, archivedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const validCustomerIds = new Set(customers.map((c) => c.id));
  const effectiveCustomerId =
    customerIdFilter && validCustomerIds.has(customerIdFilter) ? customerIdFilter : "";

  // Confirmed sale invoices, scoped to this warehouse session, with payments.
  const invoices = await db.invoice.findMany({
    where: {
      type: "SALE",
      status: "CONFIRMED",
      warehouseId: session.warehouseId,
      customerId: { not: null },
      ...(effectiveCustomerId ? { customerId: effectiveCustomerId } : {}),
    },
    select: {
      id: true,
      customerId: true,
      customer: { select: { id: true, name: true } },
      totalAmount: true,
      dueDate: true,
      confirmedAt: true,
      createdAt: true,
      payments: { select: { amount: true } },
    },
    orderBy: { confirmedAt: "asc" },
  });

  const outstandingRows: OutstandingInvoiceRow[] = [];

  for (const inv of invoices) {
    if (!inv.customer) continue;
    const originalAmount = toNum(inv.totalAmount);
    const paidAmount = inv.payments.reduce((acc, p) => acc + toNum(p.amount), 0);
    const balance = originalAmount - paidAmount;

    if (balance <= 0) continue; // exclude fully paid / zero-balance invoices

    const daysOverdue = daysOverdueFor(inv.dueDate, new Date(asOfDate));
    const bucket = bucketFor(daysOverdue);

    outstandingRows.push({
      invoiceId: inv.id,
      customerId: inv.customerId as string,
      customerName: inv.customer.name,
      invoiceDate: inv.confirmedAt ?? inv.createdAt,
      dueDate: inv.dueDate,
      originalAmount,
      paidAmount,
      balance,
      daysOverdue,
      bucket,
    });
  }

  // ─── By customer aggregation ────────────────────────────────────────────
  const customerMap = new Map<string, CustomerAgingRow>();
  for (const row of outstandingRows) {
    let agg = customerMap.get(row.customerId);
    if (!agg) {
      agg = {
        customerId: row.customerId,
        customerName: row.customerName,
        current: 0,
        b1_30: 0,
        b31_60: 0,
        b61_90: 0,
        b90_plus: 0,
        total: 0,
      };
      customerMap.set(row.customerId, agg);
    }
    if (row.bucket === "current") agg.current += row.balance;
    else if (row.bucket === "b1_30") agg.b1_30 += row.balance;
    else if (row.bucket === "b31_60") agg.b31_60 += row.balance;
    else if (row.bucket === "b61_90") agg.b61_90 += row.balance;
    else agg.b90_plus += row.balance;
    agg.total += row.balance;
  }

  const customerRows = Array.from(customerMap.values()).sort(
    (a, b) => b.total - a.total
  );

  const invoiceRows = [...outstandingRows].sort(
    (a, b) => b.daysOverdue - a.daysOverdue
  );

  const totalOutstanding = outstandingRows.reduce((acc, r) => acc + r.balance, 0);
  const totalCurrent = outstandingRows
    .filter((r) => r.bucket === "current")
    .reduce((acc, r) => acc + r.balance, 0);
  const totalOverdue = totalOutstanding - totalCurrent;
  const customersWithBalance = customerRows.length;

  // Build export URL preserving the current filters and active view.
  const exportParams = new URLSearchParams();
  exportParams.set("view", view);
  if (effectiveCustomerId) exportParams.set("customerId", effectiveCustomerId);
  exportParams.set("asOf", asOfStr);
  const exportUrl = `/dashboard/reports/ar-aging/export?${exportParams.toString()}`;

  function viewUrl(targetView: "customer" | "invoice"): string {
    const p = new URLSearchParams();
    p.set("view", targetView);
    if (effectiveCustomerId) p.set("customerId", effectiveCustomerId);
    p.set("asOf", asOfStr);
    return `/dashboard/reports/ar-aging?${p.toString()}`;
  }

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
              AR Aging Report
            </h1>
            <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "4px" }}>
              Outstanding sales invoices grouped by how many days overdue, as of {fmtDate(asOfDate)}.
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
            label="Total Outstanding"
            value={fmtMoney(totalOutstanding)}
            sub={effectiveCustomerId ? "Selected customer" : "All customers"}
            prominent
          />
          <StatCard
            label="Current (Not Overdue)"
            value={fmtMoney(totalCurrent)}
          />
          <StatCard
            label="Overdue"
            value={fmtMoney(totalOverdue)}
            valueColor={totalOverdue > 0 ? "#f87171" : "#dbe2fd"}
          />
          <StatCard
            label="Customers with Balance"
            value={customersWithBalance.toString()}
          />
        </div>

        {/* View toggle + filters */}
        <div
          style={{
            background: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "16px",
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Toggle */}
          <div style={{ display: "flex", gap: "8px" }}>
            <Link
              href={viewUrl("customer")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: view === "customer" ? "1px solid #0062ff" : "1px solid #2d3449",
                background: view === "customer" ? "rgba(0,98,255,0.12)" : "#0d1627",
                color: view === "customer" ? "#7da6ff" : "#8c90a2",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              By Customer
            </Link>
            <Link
              href={viewUrl("invoice")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: view === "invoice" ? "1px solid #0062ff" : "1px solid #2d3449",
                background: view === "invoice" ? "rgba(0,98,255,0.12)" : "#0d1627",
                color: view === "invoice" ? "#7da6ff" : "#8c90a2",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              By Invoice
            </Link>
          </div>

          {/* Filters form */}
          <form
            method="GET"
            style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}
          >
            <input type="hidden" name="view" value={view} />

            <select
              name="customerId"
              defaultValue={effectiveCustomerId}
              style={{
                padding: "8px 12px",
                background: "#0d1627",
                border: "1px solid #2d3449",
                borderRadius: "8px",
                color: effectiveCustomerId ? "#dbe2fd" : "#4a5068",
                fontSize: "13px",
                outline: "none",
                minWidth: "200px",
              }}
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              name="asOf"
              defaultValue={asOfStr}
              style={{
                padding: "8px 12px",
                background: "#0d1627",
                border: "1px solid #2d3449",
                borderRadius: "8px",
                color: "#dbe2fd",
                fontSize: "13px",
                outline: "none",
              }}
            />

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

            {(effectiveCustomerId || asOfStr !== todayStr) && (
              <Link
                href={`/dashboard/reports/ar-aging?view=${view}`}
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
            {view === "customer" ? (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #222a3e" }}>
                    {[
                      { label: "Customer", align: "left" as const },
                      { label: "Current", align: "right" as const },
                      { label: "1-30 Days", align: "right" as const },
                      { label: "31-60 Days", align: "right" as const },
                      { label: "61-90 Days", align: "right" as const },
                      { label: "90+ Days", align: "right" as const },
                      { label: "Total Outstanding", align: "right" as const },
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
                  {customerRows.length === 0 ? (
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
                        No outstanding invoices found.
                      </td>
                    </tr>
                  ) : (
                    customerRows.map((row) => (
                      <tr
                        key={row.customerId}
                        style={{ borderBottom: "1px solid #1a2237", backgroundColor: "transparent" }}
                      >
                        <td style={{ padding: "12px 16px", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                          {row.customerName}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                          {row.current > 0 ? fmtMoney(row.current) : "—"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                          {row.b1_30 > 0 ? fmtMoney(row.b1_30) : "—"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#fbbf24", whiteSpace: "nowrap" }}>
                          {row.b31_60 > 0 ? fmtMoney(row.b31_60) : "—"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#fb923c", whiteSpace: "nowrap" }}>
                          {row.b61_90 > 0 ? fmtMoney(row.b61_90) : "—"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#f87171", whiteSpace: "nowrap" }}>
                          {row.b90_plus > 0 ? fmtMoney(row.b90_plus) : "—"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {fmtMoney(row.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {customerRows.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: "1px solid #222a3e", backgroundColor: "#0d1627" }}>
                      <td
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
                        {fmtMoney(customerRows.reduce((a, r) => a + r.current, 0))}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", fontWeight: 700 }}>
                        {fmtMoney(customerRows.reduce((a, r) => a + r.b1_30, 0))}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", fontWeight: 700 }}>
                        {fmtMoney(customerRows.reduce((a, r) => a + r.b31_60, 0))}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", fontWeight: 700 }}>
                        {fmtMoney(customerRows.reduce((a, r) => a + r.b61_90, 0))}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", fontWeight: 700 }}>
                        {fmtMoney(customerRows.reduce((a, r) => a + r.b90_plus, 0))}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", fontWeight: 700 }}>
                        {fmtMoney(totalOutstanding)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #222a3e" }}>
                    {[
                      { label: "Customer", align: "left" as const },
                      { label: "Invoice #", align: "left" as const },
                      { label: "Invoice Date", align: "left" as const },
                      { label: "Due Date", align: "left" as const },
                      { label: "Original Amount", align: "right" as const },
                      { label: "Paid Amount", align: "right" as const },
                      { label: "Balance", align: "right" as const },
                      { label: "Days Overdue", align: "right" as const },
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
                  {invoiceRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          padding: "48px 24px",
                          textAlign: "center",
                          color: "#4a5068",
                          fontSize: "13px",
                        }}
                      >
                        No outstanding invoices found.
                      </td>
                    </tr>
                  ) : (
                    invoiceRows.map((row) => (
                      <tr
                        key={row.invoiceId}
                        style={{ borderBottom: "1px solid #1a2237", backgroundColor: "transparent" }}
                      >
                        <td style={{ padding: "12px 16px", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                          {row.customerName}
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
                            {row.invoiceId}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                          {fmtDate(row.invoiceDate)}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                          {fmtDate(row.dueDate)}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                          {fmtMoney(row.originalAmount)}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", whiteSpace: "nowrap" }}>
                          {fmtMoney(row.paidAmount)}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {fmtMoney(row.balance)}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                          {row.daysOverdue === 0 ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "3px 8px",
                                borderRadius: "10px",
                                fontSize: "11px",
                                fontWeight: 600,
                                background: "rgba(98,223,125,0.12)",
                                color: "#62df7d",
                              }}
                            >
                              Current
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "3px 8px",
                                borderRadius: "10px",
                                fontSize: "11px",
                                fontWeight: 600,
                                background: "rgba(248,113,113,0.12)",
                                color: "#f87171",
                              }}
                            >
                              {row.daysOverdue} days
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {invoiceRows.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: "1px solid #222a3e", backgroundColor: "#0d1627" }}>
                      <td
                        colSpan={6}
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
                        {fmtMoney(totalOutstanding)}
                      </td>
                      <td style={{ padding: "12px 16px" }} />
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
