"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { GoodsReceiptActionState } from "../../actions";

type ReceiptLine = {
  id: string;
  product: { id: string; name: string; sku: string };
  unit: { id: string; name: string; symbol: string };
  orderedDisplay: number;
  receivedBase: number;
  outstandingBase: number;
  outstandingDisplay: number;
};

interface GoodsReceiptFormProps {
  action: (state: GoodsReceiptActionState, formData: FormData) => Promise<GoodsReceiptActionState>;
  purchaseOrderId: string;
  supplierName: string;
  status: string;
  lines: ReceiptLine[];
}

function formatQty(n: number): string {
  return n % 1 === 0 ? n.toString() : n.toFixed(4).replace(/\.?0+$/, "");
}

export function GoodsReceiptForm({ action, purchaseOrderId, supplierName, status, lines }: GoodsReceiptFormProps) {
  const [state, formAction, pending] = useActionState<GoodsReceiptActionState, FormData>(
    action as (s: GoodsReceiptActionState, fd: FormData) => Promise<GoodsReceiptActionState>,
    null
  );

  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(lines.map((l) => [l.id, String(l.outstandingDisplay)]))
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

  if (state && "success" in state) {
    return (
      <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
        <div style={{ maxWidth: "640px", margin: "80px auto", textAlign: "center" }}>
          <div
            style={{
              background: "#171f33",
              border: "1px solid #222a3e",
              borderRadius: "12px",
              padding: "40px",
            }}
          >
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
              Goods Receipt Recorded
            </h2>
            <p style={{ fontSize: "13px", color: "#8c90a2", margin: "0 0 24px" }}>
              Inventory balances have been updated for the received quantities.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <Link
                href={`/dashboard/purchases/orders/${purchaseOrderId}/receive/labels?receiptId=${state.goodsReceiptId}`}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  background: "#0062ff",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Print Labels
              </Link>
              <Link
                href={`/dashboard/purchases/orders/${purchaseOrderId}`}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "1px solid #2d3449",
                  color: "#8c90a2",
                  fontSize: "13px",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Back to Purchase Order
              </Link>
            </div>
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
              <Link href="/dashboard/purchases/orders" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>
                Purchase Orders
              </Link>
              <span style={{ color: "#4a5068" }}>/</span>
              <Link href={`/dashboard/purchases/orders/${purchaseOrderId}`} style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>
                {purchaseOrderId.slice(0, 8).toUpperCase()}
              </Link>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#8c90a2", fontSize: "13px" }}>Receive Goods</span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
              Create Goods Receipt
            </h1>
            <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "4px" }}>
              Supplier: {supplierName} · Status: {status}
            </p>
          </div>
          <Link
            href={`/dashboard/purchases/orders/${purchaseOrderId}`}
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
          <input type="hidden" name="purchaseOrderId" value={purchaseOrderId} />
          <input type="hidden" name="lineCount" value={lines.length} />

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#dbe2fd", margin: "0 0 16px", paddingBottom: "12px", borderBottom: "1px solid #222a3e" }}>
                Outstanding Line Items
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
                {["Product", "Ordered", "Already Received", "Outstanding", "Receive Now"].map((h) => (
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
                  <input type="hidden" name={`line_polId_${i}`} value={line.id} />
                  <div>
                    <div style={{ color: "#dbe2fd", fontWeight: 500, fontSize: "13px" }}>{line.product.name}</div>
                    <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#8c90a2", background: "#0d1627", padding: "1px 5px", borderRadius: "4px" }}>
                      {line.product.sku}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#dbe2fd" }}>
                    {formatQty(line.orderedDisplay)} {line.unit.symbol}
                  </div>
                  <div style={{ fontSize: "13px", color: "#62df7d" }}>
                    {formatQty(line.receivedBase)} {line.unit.symbol}
                  </div>
                  <div style={{ fontSize: "13px", color: "#f59e0b" }}>
                    {formatQty(line.outstandingDisplay)} {line.unit.symbol}
                  </div>
                  <input
                    name={`line_quantity_${i}`}
                    type="number"
                    step="any"
                    min="0"
                    max={line.outstandingDisplay}
                    value={quantities[line.id] ?? ""}
                    onChange={(e) => updateQuantity(line.id, e.target.value)}
                    style={inputStyle}
                  />
                </div>
              ))}

              {fieldError("lines") && (
                <p style={{ fontSize: "12px", color: "#ffb4ab", marginTop: "8px" }}>{fieldError("lines")}</p>
              )}
            </div>

            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <label htmlFor="note" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#c2c6d9", marginBottom: "6px" }}>
                Notes <span style={{ color: "#4a5068", fontSize: "11px", marginLeft: "4px" }}>(optional)</span>
              </label>
              <textarea
                id="note"
                name="note"
                placeholder="Any notes about this delivery (condition, discrepancies, etc.)…"
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
                {pending ? "Recording…" : "Record Goods Receipt"}
              </button>
              <Link
                href={`/dashboard/purchases/orders/${purchaseOrderId}`}
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
