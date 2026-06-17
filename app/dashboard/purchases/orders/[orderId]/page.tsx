import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { markPurchaseOrderSentAction } from "../actions";
import { CancelPurchaseOrderButton } from "./CancelPurchaseOrderButton";

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
    SENT: { bg: "rgba(0,98,255,0.15)", color: "#6b9fff" },
    PARTIAL: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    RECEIVED: { bg: "rgba(98,223,125,0.12)", color: "#62df7d" },
    CANCELLED: { bg: "rgba(255,180,171,0.12)", color: "#ffb4ab" },
  };
  const s = map[status] ?? { bg: "rgba(140,144,162,0.1)", color: "#8c90a2" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: "12px", background: s.bg, color: s.color, fontSize: "12px", fontWeight: 600 }}>
      {status}
    </span>
  );
}

export default async function PurchaseOrderDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "purchases.orders.view");

  const { orderId } = await params;

  const po = await db.purchaseOrder.findUnique({
    where: { id: orderId },
    include: {
      supplier: { select: { id: true, name: true, email: true, phone: true } },
      createdBy: { select: { id: true, name: true } },
      lines: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          unit: { select: { id: true, name: true, symbol: true } },
        },
      },
      receipts: {
        orderBy: { createdAt: "desc" },
        include: {
          receivedBy: { select: { id: true, name: true } },
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

  if (!po || po.warehouseId !== session.warehouseId) {
    notFound();
  }

  const totalValue = po.lines.reduce(
    (sum, l) => sum + Number(l.displayQuantity) * Number(l.unitCost),
    0
  );
  const isDraft = po.status === "DRAFT";
  const isSent = po.status === "SENT";
  const isPartial = po.status === "PARTIAL";
  const canReceive = isSent || isPartial;
  const canCancel = isDraft || isSent;

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Breadcrumb + header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Link href="/dashboard/purchases/orders" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>
                Purchase Orders
              </Link>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#dbe2fd", fontSize: "13px", fontFamily: "monospace" }}>
                {po.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
                Purchase Order
              </h1>
              <StatusBadge status={po.status} />
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {isDraft && (
              <form action={markPurchaseOrderSentAction} style={{ display: "inline" }}>
                <input type="hidden" name="purchaseOrderId" value={po.id} />
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
                  Mark Sent
                </button>
              </form>
            )}
            {canReceive && (
              <Link
                href={`/dashboard/purchases/orders/${po.id}/receive`}
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
                Create Goods Receipt
              </Link>
            )}
            {canCancel && <CancelPurchaseOrderButton purchaseOrderId={po.id} />}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px", alignItems: "start" }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Supplier & meta */}
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#8c90a2", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Order Details
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Supplier</div>
                  <Link href={`/dashboard/suppliers/${po.supplier.id}`} style={{ color: "#6b9fff", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>
                    {po.supplier.name}
                  </Link>
                  {po.supplier.phone && (
                    <div style={{ fontSize: "12px", color: "#8c90a2", marginTop: "2px" }}>{po.supplier.phone}</div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Created By</div>
                  <div style={{ fontSize: "13px", color: "#dbe2fd" }}>{po.createdBy.name}</div>
                  <div style={{ fontSize: "12px", color: "#8c90a2", marginTop: "2px" }}>{formatDateTime(po.createdAt)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Expected Delivery</div>
                  <div style={{ fontSize: "13px", color: "#dbe2fd" }}>{formatDate(po.expectedDeliveryDate)}</div>
                </div>
                {po.sentAt && (
                  <div>
                    <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Sent At</div>
                    <div style={{ fontSize: "13px", color: "#dbe2fd" }}>{formatDateTime(po.sentAt)}</div>
                  </div>
                )}
                {po.receivedAt && (
                  <div>
                    <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Received At</div>
                    <div style={{ fontSize: "13px", color: "#62df7d" }}>{formatDateTime(po.receivedAt)}</div>
                  </div>
                )}
              </div>
              {po.note && (
                <div style={{ marginTop: "14px", padding: "10px 12px", background: "#0d1627", borderRadius: "6px", border: "1px solid #1a2237" }}>
                  <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</div>
                  <div style={{ fontSize: "13px", color: "#8c90a2" }}>{po.note}</div>
                </div>
              )}
            </div>

            {/* Line items */}
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#8c90a2", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Line Items ({po.lines.length})
              </h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #222a3e" }}>
                      {["Product", "SKU", "Ordered", "Received", "Outstanding", "Unit Cost", "Total"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#8c90a2", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {po.lines.map((line) => {
                      const outstandingBase = Number(line.baseQuantity) - Number(line.receivedBaseQuantity);
                      const lineTotal = Number(line.displayQuantity) * Number(line.unitCost);
                      return (
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
                            {formatQty(line.displayQuantity)} {line.unit.symbol}
                          </td>
                          <td style={{ padding: "10px", color: "#62df7d" }}>
                            {formatQty(line.receivedBaseQuantity)} {line.unit.symbol}
                          </td>
                          <td style={{ padding: "10px", color: outstandingBase > 0 ? "#f59e0b" : "#4a5068" }}>
                            {formatQty(outstandingBase)} {line.unit.symbol}
                          </td>
                          <td style={{ padding: "10px", color: "#dbe2fd" }}>
                            ${formatCurrency(Number(line.unitCost))}
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
                      <td colSpan={6} style={{ padding: "10px", textAlign: "right", fontWeight: 600, color: "#8c90a2", fontSize: "12px", textTransform: "uppercase" }}>
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

            {/* Receipts */}
            {po.receipts.length > 0 && (
              <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
                <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#8c90a2", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Goods Receipts ({po.receipts.length})
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {po.receipts.map((receipt) => (
                    <div key={receipt.id} style={{ padding: "12px", background: "#0d1627", borderRadius: "8px", border: "1px solid #1a2237" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#dbe2fd" }}>
                          {receipt.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span style={{ fontSize: "12px", color: "#8c90a2" }}>
                          {formatDateTime(receipt.createdAt)} · {receipt.receivedBy.name}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {receipt.lines.map((rl) => (
                          <div key={rl.id} style={{ fontSize: "12px", color: "#8c90a2", display: "flex", justifyContent: "space-between" }}>
                            <span>{rl.product.name}</span>
                            <span style={{ color: "#62df7d" }}>+{formatQty(rl.displayQuantity)} {rl.unit.symbol}</span>
                          </div>
                        ))}
                      </div>
                      {receipt.note && (
                        <div style={{ marginTop: "8px", fontSize: "12px", color: "#8c90a2", fontStyle: "italic" }}>
                          {receipt.note}
                        </div>
                      )}
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
                  <span style={{ fontSize: "14px", color: "#dbe2fd", fontWeight: 500 }}>{po.lines.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#8c90a2" }}>Receipts</span>
                  <span style={{ fontSize: "14px", color: "#dbe2fd", fontWeight: 500 }}>{po.receipts.length}</span>
                </div>
              </div>

              {po.status === "RECEIVED" && (
                <div style={{ marginTop: "16px", padding: "8px 12px", borderRadius: "8px", background: "rgba(98,223,125,0.08)", border: "1px solid rgba(98,223,125,0.2)", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#62df7d" }}>
                  FULLY RECEIVED
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
                  <span style={{ fontSize: "12px", color: "#4a5068" }}>PO ID</span>
                  <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#8c90a2" }}>{po.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
