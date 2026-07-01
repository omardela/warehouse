import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { confirmPurchaseInvoiceAction } from "../actions";
import { CancelInvoiceButton } from "./CancelInvoiceButton";
import { computeOutstandingBalance } from "@/core/billing/compute-outstanding-balance";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ invoiceId: string }>;
}

function formatCurrency(val: { toString(): string } | null | undefined): string {
  if (val == null) return "0.00";
  return Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatQty(val: { toString(): string } | null | undefined): string {
  if (val == null) return "0";
  const n = Number(val);
  return n % 1 === 0 ? n.toString() : n.toFixed(4).replace(/\.?0+$/, "");
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    DRAFT: { bg: "rgba(139,92,246,0.15)", color: "#a78bfa" },
    CONFIRMED: { bg: "rgba(98,223,125,0.12)", color: "#62df7d" },
    CANCELLED: { bg: "rgba(255,180,171,0.12)", color: "#ffb4ab" },
  };
  const s = map[status] ?? { bg: "rgba(140,144,162,0.1)", color: "#8c90a2" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: "12px", background: s.bg, color: s.color, fontSize: "12px", fontWeight: 600 }}>
      {status}
    </span>
  );
}

function PaymentMethodBadge({ method }: { method: string }) {
  const labels: Record<string, string> = {
    CASH: "Cash",
    CARD: "Card",
    BANK_TRANSFER: "Bank Transfer",
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "10px", background: "rgba(107,159,255,0.12)", color: "#6b9fff", fontSize: "11px", fontWeight: 500 }}>
      {labels[method] ?? method}
    </span>
  );
}

export default async function PurchaseInvoiceDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "purchase.invoice.read");

  const { invoiceId } = await params;

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      supplier: { select: { id: true, name: true, email: true, phone: true } },
      actor: { select: { id: true, name: true } },
      purchaseOrder: { select: { id: true, status: true } },
      lines: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          unit: { select: { id: true, name: true, symbol: true } },
        },
      },
      payments: {
        orderBy: { paidAt: "desc" },
        include: {
          actor: { select: { id: true, name: true } },
        },
      },
      creditNotes: {
        where: { status: { not: "CANCELLED" } },
        include: { lines: true },
      },
    },
  });

  if (!invoice || invoice.warehouseId !== session.warehouseId || invoice.type !== "PURCHASE") {
    notFound();
  }

  const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = computeOutstandingBalance(invoice);
  const isDraft = invoice.status === "DRAFT";
  const isConfirmed = invoice.status === "CONFIRMED";

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Breadcrumb + header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Link href="/dashboard/purchases" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>
                Purchase Invoices
              </Link>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#dbe2fd", fontSize: "13px", fontFamily: "monospace" }}>
                {invoice.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
                {invoice.number}
              </h1>
              <StatusBadge status={invoice.status} />
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {isDraft && (
              <>
                <Link
                  href={`/dashboard/purchases/new?edit=${invoice.id}`}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid #2d3449",
                    color: "#8c90a2",
                    fontSize: "13px",
                    fontWeight: 500,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  Edit
                </Link>
                <form action={confirmPurchaseInvoiceAction} style={{ display: "inline" }}>
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <button
                    type="submit"
                    style={{
                      padding: "8px 20px",
                      borderRadius: "8px",
                      background: "#0062ff",
                      border: "none",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Confirm Invoice
                  </button>
                </form>
              </>
            )}
            {isConfirmed && (
              <>
                {remaining > 0 && (
                  <Link
                    href={`/dashboard/purchases/${invoice.id}/payments/new`}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      background: "rgba(98,223,125,0.12)",
                      border: "1px solid rgba(98,223,125,0.3)",
                      color: "#62df7d",
                      fontSize: "13px",
                      fontWeight: 500,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    Record Payment
                  </Link>
                )}
                <Link
                  href={`/dashboard/purchases/${invoice.id}/credit-notes/new`}
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
                <CancelInvoiceButton invoiceId={invoice.id} />
              </>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px", alignItems: "start" }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Supplier & meta */}
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#8c90a2", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Invoice Details
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Supplier</div>
                  {invoice.supplier ? (
                    <Link href={`/dashboard/suppliers/${invoice.supplier.id}`} style={{ color: "#6b9fff", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>
                      {invoice.supplier.name}
                    </Link>
                  ) : (
                    <span style={{ color: "#4a5068", fontSize: "13px" }}>—</span>
                  )}
                  {invoice.supplier?.phone && (
                    <div style={{ fontSize: "12px", color: "#8c90a2", marginTop: "2px" }}>{invoice.supplier.phone}</div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Created By</div>
                  <div style={{ fontSize: "13px", color: "#dbe2fd" }}>{invoice.actor.name}</div>
                  <div style={{ fontSize: "12px", color: "#8c90a2", marginTop: "2px" }}>{formatDateTime(invoice.createdAt)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Expected Delivery</div>
                  <div style={{ fontSize: "13px", color: "#dbe2fd" }}>{formatDate(invoice.deliveryDate)}</div>
                </div>
                {invoice.purchaseOrder && (
                  <div>
                    <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Linked Purchase Order</div>
                    <Link href={`/dashboard/purchases/orders/${invoice.purchaseOrder.id}`} style={{ color: "#6b9fff", textDecoration: "none", fontSize: "13px", fontWeight: 500, fontFamily: "monospace" }}>
                      {invoice.purchaseOrder.id.slice(0, 8).toUpperCase()}
                    </Link>
                  </div>
                )}
                {invoice.confirmedAt && (
                  <div>
                    <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Confirmed At</div>
                    <div style={{ fontSize: "13px", color: "#dbe2fd" }}>{formatDateTime(invoice.confirmedAt)}</div>
                  </div>
                )}
                {invoice.cancelledAt && (
                  <div>
                    <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cancelled At</div>
                    <div style={{ fontSize: "13px", color: "#ffb4ab" }}>{formatDateTime(invoice.cancelledAt)}</div>
                  </div>
                )}
              </div>
              {invoice.notes && (
                <div style={{ marginTop: "14px", padding: "10px 12px", background: "#0d1627", borderRadius: "6px", border: "1px solid #1a2237" }}>
                  <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</div>
                  <div style={{ fontSize: "13px", color: "#8c90a2" }}>{invoice.notes}</div>
                </div>
              )}
            </div>

            {/* Line items */}
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#8c90a2", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Line Items ({invoice.lines.length})
              </h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #222a3e" }}>
                      {["Product", "SKU", "Quantity", "Unit Price", "Total"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#8c90a2", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines.map((line) => (
                      <tr key={line.id} style={{ borderBottom: "1px solid #1a2237" }}>
                        <td style={{ padding: "10px", color: "#dbe2fd", fontWeight: 500 }}>
                          <Link href={`/dashboard/products/${line.product.id}`} style={{ color: "#dbe2fd", textDecoration: "none" }}>
                            {line.product.name}
                          </Link>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#8c90a2", background: "#0d1627", padding: "2px 6px", borderRadius: "4px" }}>
                            {line.product.sku}
                          </span>
                        </td>
                        <td style={{ padding: "10px", color: "#dbe2fd" }}>
                          {formatQty(line.quantity)} {line.unit.symbol}
                        </td>
                        <td style={{ padding: "10px", color: "#dbe2fd" }}>
                          ${formatCurrency(line.unitPrice)}
                        </td>
                        <td style={{ padding: "10px", color: "#dbe2fd", fontWeight: 600 }}>
                          ${formatCurrency(line.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "1px solid #222a3e" }}>
                      <td colSpan={4} style={{ padding: "10px", textAlign: "right", fontWeight: 600, color: "#8c90a2", fontSize: "12px", textTransform: "uppercase" }}>
                        Total
                      </td>
                      <td style={{ padding: "10px", fontWeight: 700, color: "#dbe2fd", fontSize: "15px" }}>
                        ${formatCurrency(invoice.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Payments */}
            {invoice.payments.length > 0 && (
              <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
                <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#8c90a2", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Payment History
                </h2>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #222a3e" }}>
                        {["Date", "Amount", "Method", "Recorded By", "Notes"].map((h) => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#8c90a2", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.payments.map((payment) => (
                        <tr key={payment.id} style={{ borderBottom: "1px solid #1a2237" }}>
                          <td style={{ padding: "10px", color: "#dbe2fd", fontSize: "12px" }}>
                            {formatDate(payment.paidAt)}
                          </td>
                          <td style={{ padding: "10px", fontWeight: 600, color: "#62df7d" }}>
                            ${formatCurrency(payment.amount)}
                          </td>
                          <td style={{ padding: "10px" }}>
                            <PaymentMethodBadge method={payment.method} />
                          </td>
                          <td style={{ padding: "10px", color: "#8c90a2", fontSize: "12px" }}>
                            {payment.actor.name}
                          </td>
                          <td style={{ padding: "10px", color: "#8c90a2", fontSize: "12px" }}>
                            {payment.notes ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right column: summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#8c90a2", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Payment Summary
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#8c90a2" }}>Invoice Total</span>
                  <span style={{ fontSize: "14px", color: "#dbe2fd", fontWeight: 500 }}>${formatCurrency(invoice.totalAmount)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#8c90a2" }}>Amount Paid</span>
                  <span style={{ fontSize: "14px", color: "#62df7d", fontWeight: 500 }}>${formatCurrency(totalPaid)}</span>
                </div>
                <div style={{ borderTop: "1px solid #222a3e", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#dbe2fd" }}>Remaining</span>
                  <span style={{ fontSize: "18px", fontWeight: 700, color: remaining > 0 ? "#f59e0b" : "#62df7d" }}>
                    ${formatCurrency(remaining)}
                  </span>
                </div>
              </div>

              {isConfirmed && remaining > 0 && (
                <Link
                  href={`/dashboard/purchases/${invoice.id}/payments/new`}
                  style={{
                    display: "block",
                    marginTop: "16px",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    background: "#0062ff",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 600,
                    textDecoration: "none",
                    textAlign: "center",
                  }}
                >
                  Record Payment
                </Link>
              )}
              {isConfirmed && remaining <= 0 && (
                <div style={{ marginTop: "16px", padding: "8px 12px", borderRadius: "8px", background: "rgba(98,223,125,0.08)", border: "1px solid rgba(98,223,125,0.2)", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#62df7d" }}>
                  FULLY PAID
                </div>
              )}
            </div>

            {/* Quick info */}
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#8c90a2", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Quick Info
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "#4a5068" }}>Invoice ID</span>
                  <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#8c90a2" }}>{invoice.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "#4a5068" }}>Line Items</span>
                  <span style={{ fontSize: "12px", color: "#8c90a2" }}>{invoice.lines.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "#4a5068" }}>Payments</span>
                  <span style={{ fontSize: "12px", color: "#8c90a2" }}>{invoice.payments.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
