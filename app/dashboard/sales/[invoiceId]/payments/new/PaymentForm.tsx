"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { SalesActionState } from "../../../actions";

type PaymentAction = (
  prevState: SalesActionState,
  formData: FormData
) => Promise<SalesActionState>;

interface PaymentFormProps {
  invoiceId: string;
  invoiceTotal: number;
  totalPaid: number;
  action: PaymentAction;
}

function Label({ htmlFor, children, required, optional }: {
  htmlFor: string; children: React.ReactNode; required?: boolean; optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#c2c6d9", marginBottom: "6px" }}>
      {children}
      {required && <span style={{ color: "#ffb4ab", marginLeft: "2px" }}>*</span>}
      {optional && <span style={{ color: "#4a5068", fontSize: "11px", marginLeft: "4px" }}>(optional)</span>}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0d1627",
  border: "1px solid #2d3449",
  borderRadius: "8px",
  padding: "8px 12px",
  fontSize: "13px",
  color: "#dbe2fd",
  outline: "none",
  boxSizing: "border-box",
};

function formatCurrency(val: number): string {
  return val.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

export function PaymentForm({ invoiceId, invoiceTotal, totalPaid, action }: PaymentFormProps) {
  const router = useRouter();
  const remaining = invoiceTotal - totalPaid;

  const [state, formAction, pending] = useActionState<SalesActionState, FormData>(action, null);

  useEffect(() => {
    if (state && "success" in state) {
      router.push(`/dashboard/sales/${invoiceId}`);
    }
  }, [state, router, invoiceId]);

  // Format today's date as YYYY-MM-DD for default value
  const today = new Date().toISOString().split("T")[0];

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <a href={`/dashboard/sales/${invoiceId}`} style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>Invoice</a>
            <span style={{ color: "#4a5068" }}>/</span>
            <span style={{ color: "#8c90a2", fontSize: "13px" }}>Record Payment</span>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>Record Payment</h1>
        </div>

        {/* Balance summary */}
        <div
          style={{
            background: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "16px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#4a5068", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Invoice Total</div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#dbe2fd" }}>{formatCurrency(invoiceTotal)}</div>
          </div>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#4a5068", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Paid So Far</div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#62df7d" }}>{formatCurrency(totalPaid)}</div>
          </div>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#4a5068", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Remaining</div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#f59e0b" }}>{formatCurrency(remaining)}</div>
          </div>
        </div>

        {state && "error" in state && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              background: "rgba(147,0,10,0.15)",
              border: "1px solid rgba(147,0,10,0.3)",
              color: "#ffb4ab",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            {state.error}
          </div>
        )}

        <form action={formAction}>
          <input type="hidden" name="invoiceId" value={invoiceId} />

          <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #222a3e" }}>
              <span style={{ color: "#0062ff", display: "flex" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1.5" y="4.5" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 4.5V3C5 2.448 5.448 2 6 2H10C10.552 2 11 2.448 11 3V4.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5.5 9H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#dbe2fd", margin: 0 }}>Payment Details</h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <Label htmlFor="amount" required>Amount</Label>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={remaining > 0 ? remaining.toFixed(2) : ""}
                    placeholder="0.00"
                    required
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
                <div>
                  <Label htmlFor="method" required>Payment Method</Label>
                  <select
                    id="method"
                    name="method"
                    required
                    defaultValue="CASH"
                    style={{ ...inputStyle, cursor: "default" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="paidAt" required>Payment Date</Label>
                <input
                  id="paidAt"
                  name="paidAt"
                  type="date"
                  defaultValue={today}
                  required
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>

              <div>
                <Label htmlFor="notes" optional>Notes</Label>
                <textarea
                  id="notes"
                  name="notes"
                  placeholder="Optional notes about this payment..."
                  rows={2}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "20px" }}>
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
              {pending ? "Recording…" : "Record Payment"}
            </button>
            <a
              href={`/dashboard/sales/${invoiceId}`}
              style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
