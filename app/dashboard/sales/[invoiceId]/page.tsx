import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { InvoiceActionButtons } from "./InvoiceActionButtons";
import { confirmSalesInvoiceAction, cancelSalesInvoiceAction } from "../actions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ invoiceId: string }>;
}

function formatCurrency(val: number): string {
  return val.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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
        padding: "4px 10px",
        borderRadius: "10px",
        background: style.bg,
        color: style.color,
        fontSize: "12px",
        fontWeight: 600,
      }}
    >
      {status}
    </span>
  );
}

function OverdueBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: "10px",
        background: "rgba(147,0,10,0.15)",
        color: "#ffb4ab",
        fontSize: "12px",
        fontWeight: 600,
      }}
    >
      OVERDUE
    </span>
  );
}

function PaymentMethodBadge({ method }: { method: string }) {
  const labels: Record<string, string> = { CASH: "Cash", CARD: "Card", BANK_TRANSFER: "Bank Transfer" };
  return (
    <span style={{ fontSize: "11px", color: "#8c90a2", background: "#0d1627", padding: "2px 7px", borderRadius: "5px", border: "1px solid #222a3e" }}>
      {labels[method] ?? method}
    </span>
  );
}

export default async function SalesInvoiceDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "sales.invoice.read");

  const { invoiceId } = await params;

  // Check if current employee has cancel permission (for conditional rendering)
  const employeePerms = await db.employee.findUnique({
    where: { id: session.employeeId },
    select: {
      warehouseRole: {
        select: {
          permissions: { select: { permission: { select: { code: true } } } },
        },
      },
    },
  });

  const permCodes = employeePerms?.warehouseRole?.permissions.map((p) => p.permission.code) ?? [];
  const canCancel = permCodes.includes("sales.invoice.cancel");
  const canConfirm = permCodes.includes("sales.invoice.confirm");

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      lines: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          unit: { select: { id: true, name: true, symbol: true } },
        },
      },
      payments: {
        orderBy: { paidAt: "asc" },
        select: { id: true, amount: true, method: true, paidAt: true, notes: true },
      },
      actor: { select: { name: true } },
    },
  });

  if (!invoice || invoice.warehouseId !== session.warehouseId || invoice.type !== "SALE") {
    notFound();
  }

  const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Number(invoice.totalAmount) - totalPaid;
  const isOverdue =
    invoice.dueDate != null &&
    invoice.dueDate.getTime() < Date.now() &&
    invoice.status === "CONFIRMED" &&
    remaining > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Link href="/dashboard/sales" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>Sales</Link>
          <span style={{ color: "#4a5068" }}>/</span>
          <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#8c90a2" }}>{invoiceId.slice(0, 14)}…</span>
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#dbe2fd", margin: 0, fontFamily: "monospace" }}>
                {invoiceId}
              </h1>
              <StatusBadge status={invoice.status} />
              {isOverdue && <OverdueBadge />}
            </div>
            <p style={{ fontSize: "12px", color: "#4a5068", marginTop: "4px" }}>
              Created {formatDate(invoice.createdAt)} by {invoice.actor.name}
              {invoice.confirmedAt && ` · Confirmed ${formatDate(invoice.confirmedAt)}`}
              {invoice.cancelledAt && ` · Cancelled ${formatDate(invoice.cancelledAt)}`}
              {invoice.dueDate && ` · Due ${formatDate(invoice.dueDate)}`}
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", flexWrap: "wrap" }}>
            <Link
              href={`/dashboard/sales/${invoiceId}/print`}
              target="_blank"
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                background: "rgba(140,144,162,0.08)",
                border: "1px solid #2d3449",
                color: "#8c90a2",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Print
            </Link>
            {invoice.status === "CONFIRMED" && (
              <Link
                href={`/dashboard/sales/${invoiceId}/credit-notes/new`}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "rgba(245,158,11,0.12)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  color: "#f59e0b",
                  fontSize: "13px",
                  fontWeight: 500,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                Return / Credit Note
              </Link>
            )}
            <InvoiceActionButtons
              invoiceId={invoiceId}
              status={invoice.status}
              canConfirm={canConfirm}
              canCancel={canCancel}
              confirmAction={confirmSalesInvoiceAction}
              cancelAction={cancelSalesInvoiceAction}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#8c90a2", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Invoice Total</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#dbe2fd" }}>{formatCurrency(Number(invoice.totalAmount))}</div>
          </div>
          <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#8c90a2", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Amount Paid</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#62df7d" }}>{formatCurrency(totalPaid)}</div>
          </div>
          <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#8c90a2", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Remaining</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: remaining > 0 ? "#f59e0b" : "#62df7d" }}>
              {formatCurrency(remaining)}
            </div>
          </div>
        </div>

        {invoice.dueDate && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px", marginTop: "-8px" }}>
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#8c90a2", textTransform: "uppercase", letterSpacing: "0.06em" }}>Due Date</span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: isOverdue ? "#ffb4ab" : "#dbe2fd" }}>
                {formatDate(invoice.dueDate)}
              </span>
              {isOverdue && <OverdueBadge />}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Customer Info */}
            {invoice.customer && (
              <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#8c90a2", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>Customer</div>
                <Link href={`/dashboard/customers/${invoice.customer.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#dbe2fd" }}>{invoice.customer.name}</div>
                </Link>
                {invoice.customer.email && <div style={{ fontSize: "12px", color: "#8c90a2", marginTop: "3px" }}>{invoice.customer.email}</div>}
                {invoice.customer.phone && <div style={{ fontSize: "12px", color: "#8c90a2" }}>{invoice.customer.phone}</div>}
              </div>
            )}

            {/* Line Items */}
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #222a3e" }}>
                <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#dbe2fd", margin: 0 }}>Line Items</h2>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#0d1627" }}>
                    {["Product", "Unit", "Qty", "Unit Price", "Disc.", "Total"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#8c90a2", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line) => (
                    <tr key={line.id} style={{ borderBottom: "1px solid #1a2237" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 500, color: "#dbe2fd" }}>{line.product.name}</div>
                        <div style={{ fontSize: "10px", color: "#4a5068", fontFamily: "monospace" }}>{line.product.sku}</div>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#8c90a2" }}>{line.unit.symbol}</td>
                      <td style={{ padding: "10px 14px", color: "#dbe2fd", fontWeight: 500 }}>{Number(line.quantity).toFixed(2)}</td>
                      <td style={{ padding: "10px 14px", color: "#8c90a2" }}>{formatCurrency(Number(line.unitPrice))}</td>
                      <td style={{ padding: "10px 14px" }}>
                        {line.discount && Number(line.discount) > 0 ? (
                          <span style={{ color: "#62df7d" }}>{Number(line.discount)}%</span>
                        ) : (
                          <span style={{ color: "#4a5068" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: "#dbe2fd" }}>
                        {formatCurrency(Number(line.totalPrice))}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: "#0d1627" }}>
                    <td colSpan={5} style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#8c90a2", fontSize: "12px" }}>
                      TOTAL
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: "#dbe2fd", fontSize: "14px" }}>
                      {formatCurrency(Number(invoice.totalAmount))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#8c90a2", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Notes</div>
                <p style={{ fontSize: "13px", color: "#dbe2fd", margin: 0, lineHeight: 1.6 }}>{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Payments panel */}
          <div>
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #222a3e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#dbe2fd", margin: 0 }}>Payments</h2>
                {invoice.status === "CONFIRMED" && remaining > 0 && (
                  <Link
                    href={`/dashboard/sales/${invoiceId}/payments/new`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "5px 10px",
                      borderRadius: "6px",
                      background: "#0062ff",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M5 1.5V8.5M1.5 5H8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Record
                  </Link>
                )}
              </div>

              {invoice.payments.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "#4a5068", fontSize: "12px" }}>
                  No payments recorded.
                  {invoice.status === "CONFIRMED" && (
                    <div style={{ marginTop: "8px" }}>
                      <Link href={`/dashboard/sales/${invoiceId}/payments/new`} style={{ color: "#0062ff", textDecoration: "none", fontSize: "12px" }}>
                        Record first payment →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {invoice.payments.map((payment, idx) => (
                    <div
                      key={payment.id}
                      style={{
                        padding: "12px 16px",
                        borderBottom: idx < invoice.payments.length - 1 ? "1px solid #1a2237" : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 600, color: "#62df7d", fontSize: "13px" }}>
                          {formatCurrency(Number(payment.amount))}
                        </span>
                        <PaymentMethodBadge method={payment.method} />
                      </div>
                      <div style={{ fontSize: "11px", color: "#4a5068" }}>
                        {formatDate(payment.paidAt)}
                      </div>
                      {payment.notes && (
                        <div style={{ fontSize: "11px", color: "#8c90a2", marginTop: "3px" }}>{payment.notes}</div>
                      )}
                    </div>
                  ))}
                  {invoice.payments.length > 0 && (
                    <div style={{ padding: "10px 16px", background: "#0d1627", borderTop: "1px solid #222a3e" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span style={{ color: "#8c90a2" }}>Total paid</span>
                        <span style={{ color: "#62df7d", fontWeight: 600 }}>{formatCurrency(totalPaid)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginTop: "4px" }}>
                        <span style={{ color: "#8c90a2" }}>Remaining</span>
                        <span style={{ color: remaining > 0 ? "#f59e0b" : "#62df7d", fontWeight: 600 }}>
                          {formatCurrency(remaining)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
