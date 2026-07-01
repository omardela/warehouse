import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { db } from "@/lib/db";
import { computeOutstandingBalance } from "@/core/billing/compute-outstanding-balance";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SearchParams = Promise<{
  type?: string;
}>;

type InvoiceKind = "SALE" | "PURCHASE";

interface OutstandingInvoiceRow {
  invoiceId: string;
  invoiceNumber: string;
  invoiceType: InvoiceKind;
  partyName: string;
  invoiceDate: Date | null;
  dueDate: Date | null;
  originalAmount: number;
  paidAmount: number;
  balance: number;
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

export default async function AllPaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "payments.payment.read");

  const params = await searchParams;
  const typeFilter =
    params.type === "SALE" || params.type === "PURCHASE" ? params.type : "ALL";

  const [salesInvoices, purchaseInvoices] = await Promise.all([
    typeFilter !== "PURCHASE"
      ? db.invoice.findMany({
          where: { type: "SALE", status: "CONFIRMED", warehouseId: session.warehouseId },
          select: {
            id: true,
            number: true,
            totalAmount: true,
            dueDate: true,
            confirmedAt: true,
            createdAt: true,
            customer: { select: { name: true } },
            payments: { select: { amount: true } },
            creditNotes: { where: { status: "CONFIRMED" }, include: { lines: true } },
          },
          orderBy: { confirmedAt: "asc" },
        })
      : Promise.resolve([]),
    typeFilter !== "SALE"
      ? db.invoice.findMany({
          where: { type: "PURCHASE", status: "CONFIRMED", warehouseId: session.warehouseId },
          select: {
            id: true,
            number: true,
            totalAmount: true,
            dueDate: true,
            confirmedAt: true,
            createdAt: true,
            supplier: { select: { name: true } },
            payments: { select: { amount: true } },
            creditNotes: { where: { status: "CONFIRMED" }, include: { lines: true } },
          },
          orderBy: { confirmedAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const rows: OutstandingInvoiceRow[] = [];

  for (const inv of salesInvoices) {
    if (!inv.customer) continue;
    const balance = computeOutstandingBalance(inv);
    if (balance <= 0.001) continue;
    rows.push({
      invoiceId: inv.id,
      invoiceNumber: inv.number,
      invoiceType: "SALE",
      partyName: inv.customer.name,
      invoiceDate: inv.confirmedAt ?? inv.createdAt,
      dueDate: inv.dueDate,
      originalAmount: toNum(inv.totalAmount),
      paidAmount: inv.payments.reduce((acc, p) => acc + toNum(p.amount), 0),
      balance,
    });
  }

  for (const inv of purchaseInvoices) {
    if (!inv.supplier) continue;
    const balance = computeOutstandingBalance(inv);
    if (balance <= 0.001) continue;
    rows.push({
      invoiceId: inv.id,
      invoiceNumber: inv.number,
      invoiceType: "PURCHASE",
      partyName: inv.supplier.name,
      invoiceDate: inv.confirmedAt ?? inv.createdAt,
      dueDate: inv.dueDate,
      originalAmount: toNum(inv.totalAmount),
      paidAmount: inv.payments.reduce((acc, p) => acc + toNum(p.amount), 0),
      balance,
    });
  }

  rows.sort((a, b) => (a.invoiceDate?.getTime() ?? 0) - (b.invoiceDate?.getTime() ?? 0));

  const totalReceivable = rows.filter((r) => r.invoiceType === "SALE").reduce((s, r) => s + r.balance, 0);
  const totalPayable = rows.filter((r) => r.invoiceType === "PURCHASE").reduce((s, r) => s + r.balance, 0);
  const totalOutstanding = totalReceivable + totalPayable;

  function filterUrl(target: "ALL" | "SALE" | "PURCHASE"): string {
    return target === "ALL" ? "/dashboard/payments" : `/dashboard/payments?type=${target}`;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
            All Payments
          </h1>
          <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "4px" }}>
            Confirmed invoices with an outstanding balance, oldest first.
          </p>
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
          <StatCard label="Total Outstanding" value={fmtMoney(totalOutstanding)} prominent />
          <StatCard label="Receivables (Sales)" value={fmtMoney(totalReceivable)} valueColor="#62df7d" />
          <StatCard label="Payables (Purchases)" value={fmtMoney(totalPayable)} valueColor="#f59e0b" />
          <StatCard label="Open Invoices" value={rows.length.toString()} />
        </div>

        {/* Type filter */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {(["ALL", "SALE", "PURCHASE"] as const).map((option) => (
            <Link
              key={option}
              href={filterUrl(option)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: typeFilter === option ? "1px solid #0062ff" : "1px solid #2d3449",
                background: typeFilter === option ? "rgba(0,98,255,0.12)" : "#171f33",
                color: typeFilter === option ? "#7da6ff" : "#8c90a2",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {option === "ALL" ? "All" : option === "SALE" ? "Receivables" : "Payables"}
            </Link>
          ))}
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
                    { label: "Invoice #", align: "left" as const },
                    { label: "Party", align: "left" as const },
                    { label: "Type", align: "left" as const },
                    { label: "Invoice Date", align: "left" as const },
                    { label: "Due Date", align: "left" as const },
                    { label: "Original Amount", align: "right" as const },
                    { label: "Paid Amount", align: "right" as const },
                    { label: "Balance", align: "right" as const },
                    { label: "", align: "right" as const },
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
                    <td colSpan={9} style={{ padding: "48px 24px", textAlign: "center", color: "#4a5068", fontSize: "13px" }}>
                      No outstanding invoices found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const detailHref = row.invoiceType === "SALE" ? `/dashboard/sales/${row.invoiceId}` : `/dashboard/purchases/${row.invoiceId}`;
                    const payHref = row.invoiceType === "SALE" ? `/dashboard/sales/${row.invoiceId}/payments/new` : `/dashboard/purchases/${row.invoiceId}/payments/new`;
                    return (
                      <tr key={row.invoiceId} style={{ borderBottom: "1px solid #1a2237" }}>
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                          <Link href={detailHref} style={{ color: "#0062ff", textDecoration: "none", fontFamily: "monospace", fontSize: "12px" }}>
                            {row.invoiceNumber}
                          </Link>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#dbe2fd", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.partyName}
                        </td>
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: "4px",
                              color: row.invoiceType === "SALE" ? "#62df7d" : "#60a5fa",
                              backgroundColor: row.invoiceType === "SALE" ? "rgba(98,223,125,0.1)" : "rgba(96,165,250,0.1)",
                            }}
                          >
                            {row.invoiceType === "SALE" ? "Sale" : "Purchase"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#dbe2fd", whiteSpace: "nowrap" }}>{fmtDate(row.invoiceDate)}</td>
                        <td style={{ padding: "12px 16px", color: "#dbe2fd", whiteSpace: "nowrap" }}>{fmtDate(row.dueDate)}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", whiteSpace: "nowrap" }}>{fmtMoney(row.originalAmount)}</td>
                        <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", whiteSpace: "nowrap" }}>{fmtMoney(row.paidAmount)}</td>
                        <td
                          style={{
                            padding: "12px 16px",
                            textAlign: "right",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            color: row.invoiceType === "SALE" ? "#ff4d4f" : "#f59e0b",
                          }}
                        >
                          {fmtMoney(row.balance)}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <Link
                            href={payHref}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "5px 12px",
                              borderRadius: "6px",
                              border: "1px solid #2d3449",
                              color: "#7da6ff",
                              fontSize: "12px",
                              fontWeight: 600,
                              textDecoration: "none",
                            }}
                          >
                            Record Payment
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: "1px solid #222a3e", backgroundColor: "#0d1627" }}>
                    <td colSpan={7} style={{ padding: "12px 16px", color: "#8c90a2", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Total
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#dbe2fd", fontWeight: 700 }}>
                      {fmtMoney(totalOutstanding)}
                    </td>
                    <td style={{ padding: "12px 16px" }} />
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
