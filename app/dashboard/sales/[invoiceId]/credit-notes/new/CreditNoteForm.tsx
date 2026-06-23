"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { CreditNoteActionState } from "../../../credit-notes/actions";

type ReturnLine = {
  id: string;
  product: { id: string; name: string; sku: string };
  unit: { id: string; name: string; symbol: string };
  invoicedQuantity: number;
  alreadyReturned: number;
  availableQuantity: number;
  unitPrice: number;
};

interface CreditNoteFormProps {
  action: (state: CreditNoteActionState, formData: FormData) => Promise<CreditNoteActionState>;
  invoiceId: string;
  customerName: string;
  status: string;
  lines: ReturnLine[];
}

function formatQty(n: number): string {
  return n % 1 === 0 ? n.toString() : n.toFixed(4).replace(/\.?0+$/, "");
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CreditNoteForm({ action, invoiceId, customerName, status, lines }: CreditNoteFormProps) {
  const [state, formAction, pending] = useActionState<CreditNoteActionState, FormData>(
    action as (s: CreditNoteActionState, fd: FormData) => Promise<CreditNoteActionState>,
    null
  );

  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(lines.map((l) => [l.id, "0"]))
  );

  const updateQuantity = (id: string, value: string) => {
    setQuantities((prev) => ({ ...prev, [id]: value }));
  };

  const fieldError = (field: string) =>
    state && "fieldErrors" in state ? state.fieldErrors?.[field]?.[0] : undefined;

  const inputStyle: React.CSSProperties = {
    padding: "8px 10px",
    background: "#0d1627",
    border: "1px solid #2d3449",
    borderRadius: "8px",
    color: "#dbe2fd",
    fontSize: "13px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  const estimatedTotal = lines.reduce((sum, l) => {
    const q = parseFloat(quantities[l.id] ?? "0") || 0;
    return sum + q * l.unitPrice;
  }, 0);

  if (state && "success" in state) {
    return (
      <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
        <div style={{ maxWidth: "640px", margin: "80px auto", textAlign: "center" }}>
          <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "12px", padding: "40px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(98,223,125,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#62df7d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#dbe2fd", margin: "0 0 8px" }}>
              Credit Note Created
            </h2>
            <p style={{ fontSize: "13px", color: "#8c90a2", margin: "0 0 24px" }}>
              The credit note has been saved as a draft. Confirm it to restock the returned goods.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <Link
                href={`/dashboard/sales/credit-notes/${state.creditNoteId}`}
                style={{ padding: "10px 20px", borderRadius: "8px", background: "#0062ff", color: "#fff", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}
              >
                View Credit Note
              </Link>
              <Link
                href={`/dashboard/sales/${invoiceId}`}
                style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}
              >
                Back to Invoice
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
        <div style={{ maxWidth: "640px", margin: "80px auto", textAlign: "center" }}>
          <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "12px", padding: "40px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#dbe2fd", margin: "0 0 8px" }}>
              Nothing Left to Return
            </h2>
            <p style={{ fontSize: "13px", color: "#8c90a2", margin: "0 0 24px" }}>
              This invoice is not confirmed, or all quantities have already been credited.
            </p>
            <Link
              href={`/dashboard/sales/${invoiceId}`}
              style={{ padding: "10px 20px", borderRadius: "8px", background: "#0062ff", color: "#fff", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}
            >
              Back to Invoice
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "880px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <Link href="/dashboard/sales" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>
                Sales Invoices
              </Link>
              <span style={{ color: "#4a5068" }}>/</span>
              <Link href={`/dashboard/sales/${invoiceId}`} style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>
                {invoiceId.slice(0, 8).toUpperCase()}
              </Link>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#8c90a2", fontSize: "13px" }}>Return / Credit Note</span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
              Create Sales Credit Note
            </h1>
            <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "4px" }}>
              Customer: {customerName} · Invoice Status: {status}
            </p>
          </div>
          <Link
            href={`/dashboard/sales/${invoiceId}`}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}
          >
            Cancel
          </Link>
        </div>

        {state && "error" in state && (
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(147,0,10,0.15)", border: "1px solid rgba(147,0,10,0.3)", color: "#ffb4ab", fontSize: "13px", marginBottom: "16px" }}>
            {state.error}
          </div>
        )}

        <form action={formAction}>
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <input type="hidden" name="lineCount" value={lines.length} />

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#dbe2fd", margin: "0 0 16px", paddingBottom: "12px", borderBottom: "1px solid #222a3e" }}>
                Returnable Line Items
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 140px",
                  gap: "8px",
                  padding: "0 0 8px",
                  borderBottom: "1px solid #222a3e",
                  marginBottom: "4px",
                }}
              >
                {["Product", "Invoiced", "Already Returned", "Available", "Return Qty"].map((h) => (
                  <div key={h} style={{ fontSize: "11px", fontWeight: 600, color: "#8c90a2", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {h}
                  </div>
                ))}
              </div>

              {lines.map((line, i) => (
                <div
                  key={line.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 140px",
                    gap: "8px",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: "1px solid #1a2237",
                  }}
                >
                  <input type="hidden" name={`line_invoiceLineId_${i}`} value={line.id} />
                  <div>
                    <div style={{ color: "#dbe2fd", fontWeight: 500, fontSize: "13px" }}>{line.product.name}</div>
                    <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#8c90a2", background: "#0d1627", padding: "1px 5px", borderRadius: "4px" }}>
                      {line.product.sku}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#dbe2fd" }}>
                    {formatQty(line.invoicedQuantity)} {line.unit.symbol}
                  </div>
                  <div style={{ fontSize: "13px", color: "#8c90a2" }}>
                    {formatQty(line.alreadyReturned)} {line.unit.symbol}
                  </div>
                  <div style={{ fontSize: "13px", color: "#f59e0b" }}>
                    {formatQty(line.availableQuantity)} {line.unit.symbol}
                  </div>
                  <input
                    name={`line_quantity_${i}`}
                    type="number"
                    step="any"
                    min="0"
                    max={line.availableQuantity}
                    value={quantities[line.id] ?? "0"}
                    onChange={(e) => updateQuantity(line.id, e.target.value)}
                    style={inputStyle}
                  />
                </div>
              ))}

              {fieldError("lines") && (
                <p style={{ fontSize: "12px", color: "#ffb4ab", marginTop: "8px" }}>{fieldError("lines")}</p>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #222a3e" }}>
                <div style={{ fontSize: "13px", color: "#8c90a2" }}>
                  Estimated Credit:{" "}
                  <span style={{ color: "#dbe2fd", fontWeight: 700, fontSize: "15px" }}>${formatCurrency(estimatedTotal)}</span>
                </div>
              </div>
            </div>

            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <label htmlFor="note" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#c2c6d9", marginBottom: "6px" }}>
                Notes <span style={{ color: "#4a5068", fontSize: "11px", marginLeft: "4px" }}>(optional)</span>
              </label>
              <textarea
                id="note"
                name="note"
                placeholder="Reason for return (damaged goods, wrong item, etc.)…"
                rows={2}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#0d1627",
                  border: "1px solid #2d3449",
                  borderRadius: "8px",
                  color: "#dbe2fd",
                  fontSize: "13px",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button
                type="submit"
                disabled={pending}
                style={{
                  padding: "10px 24px",
                  borderRadius: "8px",
                  background: pending ? "#0044b8" : "#0062ff",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 600,
                  border: "none",
                  cursor: pending ? "not-allowed" : "pointer",
                  opacity: pending ? 0.8 : 1,
                }}
              >
                {pending ? "Creating…" : "Create Credit Note"}
              </button>
              <Link
                href={`/dashboard/sales/${invoiceId}`}
                style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}
              >
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
