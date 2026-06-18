import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { confirmSalesOrderAction } from "../actions";
import { CancelSalesOrderButton } from "./CancelSalesOrderButton";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

function formatCurrency(val: number): string {
  return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    CONFIRMED: { bg: "rgba(0,98,255,0.15)", color: "#6b9fff" },
    PARTIAL: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    FULFILLED: { bg: "rgba(98,223,125,0.12)", color: "#62df7d" },
    CANCELLED: { bg: "rgba(255,180,171,0.12)", color: "#ffb4ab" },
  };
  const s = map[status] ?? { bg: "rgba(140,144,162,0.1)", color: "#8c90a2" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: "12px", background: s.bg, color: s.color, fontSize: "12px", fontWeight: 600 }}>
      {status}
    </span>
  );
}

export default async function SalesOrderDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "sales.orders.view");

  const { orderId } = await params;

  const so = await db.salesOrder.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      createdBy: { select: { id: true, name: true } },
      lines: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          unit: { select: { id: true, name: true, symbol: true } },
        },
      },
      deliveryNotes: {
        orderBy: { createdAt: "desc" },
        include: {
          dispatchedBy: { select: { id: true, name: true } },
          lines: {
            include: {
              product: { select: { id: true, name: true } },
              unit: { select: { id: true, symbol: true } },
            },
          },
        },
      },
    },
  });

  if (!so || so.warehouseId !== session.warehouseId) {
    notFound();
  }

  const totalValue = so.lines.reduce((sum, l) => {
    const discountFactor = l.discount != null ? 1 - Number(l.discount) / 100 : 1;
    return sum + Number(l.displayQuantity) * Number(l.unitPrice) * discountFactor;
  }, 0);

  const isDraft = so.status === "DRAFT";
  const isConfirmed = so.status === "CONFIRMED";
  const isPartial = so.status === "PARTIAL";
  const hasRemaining = so.lines.some(
    (l) => Number(l.baseQuantity) - Number(l.deliveredBaseQuantity) > 0.000001
  );
  const canDeliver = (isConfirmed || isPartial) && hasRemaining;
  const canCancel = (isDraft || isConfirmed) && so.deliveryNotes.length === 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Breadcrumb + header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Link href="/dashboard/sales/orders" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>
                Sales Orders
              </Link>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#dbe2fd", fontSize: "13px", fontFamily: "monospace" }}>
                {so.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
                Sales Order
              </h1>
              <StatusBadge status={so.status} />
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {isDraft && (
              <form action={confirmSalesOrderAction} style={{ display: "inline" }}>
                <input type="hidden" name="salesOrderId" value={so.id} />
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
                  Confirm Order
                </button>
              </form>
            )}
            {canDeliver && (
              <Link
                href={`/dashboard/sales/orders/${so.id}/deliver`}
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
                Create Delivery Note
              </Link>
            )}
            {canCancel && <CancelSalesOrderButton salesOrderId={so.id} />}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px", alignItems: "start" }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Customer & meta */}
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#8c90a2", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Order Details
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Customer</div>
                  <Link href={`/dashboard/customers/${so.customer.id}`} style={{ color: "#6b9fff", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>
                    {so.customer.name}
                  </Link>
                  {so.customer.phone && (
                    <div style={{ fontSize: "12px", color: "#8c90a2", marginTop: "2px" }}>{so.customer.phone}</div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Created By</div>
                  <div style={{ fontSize: "13px", color: "#dbe2fd" }}>{so.createdBy.name}</div>
                  <div style={{ fontSize: "12px", color: "#8c90a2", marginTop: "2px" }}>{formatDateTime(so.createdAt)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Expected Delivery</div>
                  <div style={{ fontSize: "13px", color: "#dbe2fd" }}>{formatDate(so.expectedDeliveryDate)}</div>
                </div>
                {so.confirmedAt && (
                  <div>
                    <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Confirmed At</div>
                    <div style={{ fontSize: "13px", color: "#dbe2fd" }}>{formatDateTime(so.confirmedAt)}</div>
                  </div>
                )}
                {so.fulfilledAt && (
                  <div>
                    <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Fulfilled At</div>
                    <div style={{ fontSize: "13px", color: "#62df7d" }}>{formatDateTime(so.fulfilledAt)}</div>
                  </div>
                )}
              </div>
              {so.note && (
                <div style={{ marginTop: "14px", padding: "10px 12px", background: "#0d1627", borderRadius: "6px", border: "1px solid #1a2237" }}>
                  <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</div>
                  <div style={{ fontSize: "13px", color: "#8c90a2" }}>{so.note}</div>
                </div>
              )}
            </div>

            {/* Line items */}
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#8c90a2", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Line Items ({so.lines.length})
              </h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #222a3e" }}>
                      {["Product", "SKU", "Ordered", "Delivered", "Remaining", "Unit Price", "Disc %", "Total"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#8c90a2", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {so.lines.map((line) => {
                      const remainingBase = Number(line.baseQuantity) - Number(line.deliveredBaseQuantity);
                      const discountFactor = line.discount != null ? 1 - Number(line.discount) / 100 : 1;
                      const lineTotal = Number(line.displayQuantity) * Number(line.unitPrice) * discountFactor;
                      return (
                        <tr key={line.id} style={{ borderBottom: "1px solid #1a2237" }}>
                          <td style={{ padding: "10px", color: "#dbe2fd", fontWeight: 500 }}>
                            {line.product.name}
                          </td>
                          <td style={{ padding: "10px" }}>
                            <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#8c90a2", background: "#0d1627", padding: "2px 6px", borderRadius: "4px" }}>
                              {line.product.sku}
                            </span>
                          </td>
                          <td style={{ padding: "10px", color: "#dbe2fd" }}>
                            {formatQty(line.displayQuantity)} {line.unit.symbol}
                          </td>
                          <td style={{ padding: "10px", color: "#62df7d" }}>
                            {formatQty(line.deliveredBaseQuantity)} {line.unit.symbol}
                          </td>
                          <td style={{ padding: "10px", color: remainingBase > 0 ? "#f59e0b" : "#4a5068" }}>
                            {formatQty(remainingBase)} {line.unit.symbol}
                          </td>
                          <td style={{ padding: "10px", color: "#dbe2fd" }}>
                            ${formatCurrency(Number(line.unitPrice))}
                          </td>
                          <td style={{ padding: "10px", color: "#8c90a2" }}>
                            {line.discount != null ? `${Number(line.discount)}%` : "—"}
                          </td>
                          <td style={{ padding: "10px", color: "#dbe2fd", fontWeight: 600 }}>
                            ${formatCurrency(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "1px solid #222a3e" }}>
                      <td colSpan={7} style={{ padding: "10px", textAlign: "right", fontWeight: 600, color: "#8c90a2", fontSize: "12px", textTransform: "uppercase" }}>
                        Total
                      </td>
                      <td style={{ padding: "10px", fontWeight: 700, color: "#dbe2fd", fontSize: "15px" }}>
                        ${formatCurrency(totalValue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Delivery Notes */}
            {so.deliveryNotes.length > 0 && (
              <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
                <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#8c90a2", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Delivery Notes ({so.deliveryNotes.length})
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {so.deliveryNotes.map((note) => (
                    <div key={note.id} style={{ padding: "12px", background: "#0d1627", borderRadius: "8px", border: "1px solid #1a2237" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#dbe2fd" }}>
                          {note.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span style={{ fontSize: "12px", color: "#8c90a2" }}>
                          {formatDateTime(note.createdAt)} · {note.dispatchedBy.name}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {note.lines.map((nl) => (
                          <div key={nl.id} style={{ fontSize: "12px", color: "#8c90a2", display: "flex", justifyContent: "space-between" }}>
                            <span>{nl.product.name}</span>
                            <span style={{ color: "#f59e0b" }}>-{formatQty(nl.displayQuantity)} {nl.unit.symbol}</span>
                          </div>
                        ))}
                      </div>
                      {note.note && (
                        <div style={{ marginTop: "8px", fontSize: "12px", color: "#8c90a2", fontStyle: "italic" }}>
                          {note.note}
                        </div>
                      )}
                      <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #1a2237" }}>
                        <Link
                          href={`/dashboard/sales/new?deliveryNoteId=${note.id}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            background: "rgba(0,98,255,0.12)",
                            border: "1px solid rgba(0,98,255,0.3)",
                            color: "#6b9fff",
                            fontSize: "12px",
                            fontWeight: 500,
                            textDecoration: "none",
                          }}
                        >
                          Create Sales Invoice
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column: summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#8c90a2", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Order Summary
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#8c90a2" }}>Total Value</span>
                  <span style={{ fontSize: "14px", color: "#dbe2fd", fontWeight: 500 }}>${formatCurrency(totalValue)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#8c90a2" }}>Line Items</span>
                  <span style={{ fontSize: "14px", color: "#dbe2fd", fontWeight: 500 }}>{so.lines.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#8c90a2" }}>Delivery Notes</span>
                  <span style={{ fontSize: "14px", color: "#dbe2fd", fontWeight: 500 }}>{so.deliveryNotes.length}</span>
                </div>
              </div>

              {so.status === "FULFILLED" && (
                <div style={{ marginTop: "16px", padding: "8px 12px", borderRadius: "8px", background: "rgba(98,223,125,0.08)", border: "1px solid rgba(98,223,125,0.2)", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#62df7d" }}>
                  FULLY DELIVERED
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
                  <span style={{ fontSize: "12px", color: "#4a5068" }}>SO ID</span>
                  <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#8c90a2" }}>{so.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
