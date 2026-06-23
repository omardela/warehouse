import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { SalesCreditNoteActionButtons } from "./SalesCreditNoteActionButtons";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ creditNoteId: string }>;
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

export default async function SalesCreditNoteDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "sales.creditnotes.view");

  const { creditNoteId } = await params;

  const creditNote = await db.creditNote.findUnique({
    where: { id: creditNoteId },
    include: {
      originalInvoice: {
        select: {
          id: true,
          status: true,
          customer: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
      lines: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          unit: { select: { id: true, name: true, symbol: true } },
        },
      },
    },
  });

  if (!creditNote || creditNote.warehouseId !== session.warehouseId || creditNote.type !== "SALE") {
    notFound();
  }

  const totalValue = creditNote.lines.reduce(
    (sum, l) => sum + Number(l.displayQuantity) * Number(l.unitPrice),
    0
  );
  const isDraft = creditNote.status === "DRAFT";
  const isConfirmed = creditNote.status === "CONFIRMED";

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Breadcrumb + header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Link href="/dashboard/sales/credit-notes" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>
                Sales Credit Notes
              </Link>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#dbe2fd", fontSize: "13px", fontFamily: "monospace" }}>
                {creditNote.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
                Sales Credit Note
              </h1>
              <StatusBadge status={creditNote.status} />
            </div>
          </div>

          {/* Action buttons */}
          <SalesCreditNoteActionButtons creditNoteId={creditNote.id} isDraft={isDraft} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px", alignItems: "start" }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Customer & meta */}
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#8c90a2", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Credit Note Details
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Customer</div>
                  {creditNote.originalInvoice.customer ? (
                    <Link href={`/dashboard/customers/${creditNote.originalInvoice.customer.id}`} style={{ color: "#6b9fff", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>
                      {creditNote.originalInvoice.customer.name}
                    </Link>
                  ) : (
                    <span style={{ color: "#4a5068", fontSize: "13px" }}>—</span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Original Invoice</div>
                  <Link href={`/dashboard/sales/${creditNote.originalInvoice.id}`} style={{ color: "#6b9fff", textDecoration: "none", fontSize: "13px", fontWeight: 500, fontFamily: "monospace" }}>
                    {creditNote.originalInvoice.id.slice(0, 8).toUpperCase()}
                  </Link>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Created By</div>
                  <div style={{ fontSize: "13px", color: "#dbe2fd" }}>{creditNote.createdBy.name}</div>
                  <div style={{ fontSize: "12px", color: "#8c90a2", marginTop: "2px" }}>{formatDateTime(creditNote.createdAt)}</div>
                </div>
                {creditNote.confirmedAt && (
                  <div>
                    <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Confirmed At</div>
                    <div style={{ fontSize: "13px", color: "#62df7d" }}>{formatDateTime(creditNote.confirmedAt)}</div>
                  </div>
                )}
              </div>
              {creditNote.note && (
                <div style={{ marginTop: "14px", padding: "10px 12px", background: "#0d1627", borderRadius: "6px", border: "1px solid #1a2237" }}>
                  <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</div>
                  <div style={{ fontSize: "13px", color: "#8c90a2" }}>{creditNote.note}</div>
                </div>
              )}
            </div>

            {/* Line items */}
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: 600, color: "#8c90a2", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Returned Items ({creditNote.lines.length})
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
                    {creditNote.lines.map((line) => {
                      const lineTotal = Number(line.displayQuantity) * Number(line.unitPrice);
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
                          <td style={{ padding: "10px", color: "#dbe2fd" }}>
                            ${formatCurrency(line.unitPrice)}
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
                      <td colSpan={4} style={{ padding: "10px", textAlign: "right", fontWeight: 600, color: "#8c90a2", fontSize: "12px", textTransform: "uppercase" }}>
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
          </div>

          {/* Right column: summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#8c90a2", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Credit Summary
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#8c90a2" }}>Total Credit</span>
                  <span style={{ fontSize: "14px", color: "#dbe2fd", fontWeight: 500 }}>${formatCurrency(totalValue)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#8c90a2" }}>Line Items</span>
                  <span style={{ fontSize: "14px", color: "#dbe2fd", fontWeight: 500 }}>{creditNote.lines.length}</span>
                </div>
              </div>

              {isConfirmed && (
                <div style={{ marginTop: "16px", padding: "8px 12px", borderRadius: "8px", background: "rgba(98,223,125,0.08)", border: "1px solid rgba(98,223,125,0.2)", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#62df7d" }}>
                  STOCK RESTOCKED · IMMUTABLE
                </div>
              )}
              {creditNote.status === "CANCELLED" && (
                <div style={{ marginTop: "16px", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,180,171,0.08)", border: "1px solid rgba(255,180,171,0.2)", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#ffb4ab" }}>
                  CANCELLED
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
                  <span style={{ fontSize: "12px", color: "#4a5068" }}>Credit Note ID</span>
                  <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#8c90a2" }}>{creditNote.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
