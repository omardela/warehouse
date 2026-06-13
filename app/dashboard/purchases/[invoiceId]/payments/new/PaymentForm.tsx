"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PaymentActionState } from "../../../actions";

interface PaymentFormProps {
  invoiceId: string;
  invoiceTotal: number;
  totalPaid: number;
  remaining: number;
  action: (state: PaymentActionState, formData: FormData) => Promise<PaymentActionState>;
}

export function PaymentForm({ invoiceId, invoiceTotal, totalPaid, remaining, action }: PaymentFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<PaymentActionState, FormData>(
    action as (s: PaymentActionState, fd: FormData) => Promise<PaymentActionState>,
    null
  );

  useEffect(() => {
    if (state && "success" in state) {
      router.push(`/dashboard/purchases/${invoiceId}`);
    }
  }, [state, router, invoiceId]);

  const fieldError = (field: string) =>
    state && "fieldErrors" in state ? state.fieldErrors?.[field]?.[0] : undefined;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    background: "#0d1627",
    border: "1px solid #2d3449",
    borderRadius: "8px",
    color: "#dbe2fd",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: 500,
    color: "#c2c6d9",
    marginBottom: "6px",
  };

  // Today's date in YYYY-MM-DD for defaultValue
  const today = new Date().toISOString().split("T")[0];

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <a href={`/dashboard/purchases/${invoiceId}`} style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>
                Invoice
              </a>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#8c90a2", fontSize: "13px" }}>Record Payment</span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
              Record Payment
            </h1>
          </div>
          <a
            href={`/dashboard/purchases/${invoiceId}`}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}
          >
            Cancel
          </a>
        </div>

        {/* Balance summary card */}
        <div
          style={{
            background: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "10px",
            padding: "16px 20px",
            marginBottom: "16px",
            display: "flex",
            gap: "24px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: "#4a5068", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>Invoice Total</div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#dbe2fd" }}>${invoiceTotal.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#4a5068", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>Paid So Far</div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "#62df7d" }}>${totalPaid.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#4a5068", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>Remaining</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: remaining > 0 ? "#f59e0b" : "#62df7d" }}>${remaining.toFixed(2)}</div>
          </div>
        </div>

        {state && "error" in state && (
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(147,0,10,0.15)", border: "1px solid rgba(147,0,10,0.3)", color: "#ffb4ab", fontSize: "13px", marginBottom: "16px" }}>
            {state.error}
          </div>
        )}

        <form action={formAction}>
          <input type="hidden" name="invoiceId" value={invoiceId} />

          <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label htmlFor="amount" style={labelStyle}>
                Amount <span style={{ color: "#ffb4ab", marginLeft: "2px" }}>*</span>
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={remaining}
                defaultValue={remaining > 0 ? remaining.toFixed(2) : ""}
                required
                style={{ ...inputStyle, borderColor: fieldError("amount") ? "#ffb4ab" : "#2d3449" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = fieldError("amount") ? "#ffb4ab" : "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
              />
              {fieldError("amount") && <p style={{ fontSize: "12px", color: "#ffb4ab", marginTop: "4px" }}>{fieldError("amount")}</p>}
            </div>

            <div>
              <label htmlFor="method" style={labelStyle}>
                Payment Method <span style={{ color: "#ffb4ab", marginLeft: "2px" }}>*</span>
              </label>
              <select
                id="method"
                name="method"
                required
                style={{ ...inputStyle, borderColor: fieldError("method") ? "#ffb4ab" : "#2d3449" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = fieldError("method") ? "#ffb4ab" : "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <option value="">Select method…</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
              {fieldError("method") && <p style={{ fontSize: "12px", color: "#ffb4ab", marginTop: "4px" }}>{fieldError("method")}</p>}
            </div>

            <div>
              <label htmlFor="paidAt" style={labelStyle}>
                Payment Date <span style={{ color: "#ffb4ab", marginLeft: "2px" }}>*</span>
              </label>
              <input
                id="paidAt"
                name="paidAt"
                type="date"
                defaultValue={today}
                required
                style={{ ...inputStyle, borderColor: fieldError("paidAt") ? "#ffb4ab" : "#2d3449" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = fieldError("paidAt") ? "#ffb4ab" : "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
              />
              {fieldError("paidAt") && <p style={{ fontSize: "12px", color: "#ffb4ab", marginTop: "4px" }}>{fieldError("paidAt")}</p>}
            </div>

            <div>
              <label htmlFor="notes" style={labelStyle}>
                Notes <span style={{ color: "#4a5068", fontSize: "11px", marginLeft: "4px" }}>(optional)</span>
              </label>
              <textarea
                id="notes"
                name="notes"
                placeholder="e.g. Wire transfer ref #123…"
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
              />
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
              href={`/dashboard/purchases/${invoiceId}`}
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
