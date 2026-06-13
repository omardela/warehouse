"use client";

import { useActionState, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PurchaseInvoiceActionState } from "../actions";

type Supplier = { id: string; name: string };
type Product = { id: string; name: string; sku: string };
type Unit = { id: string; name: string; symbol: string };

type LineRow = {
  id: string;
  productId: string;
  unitId: string;
  quantity: string;
  unitPrice: string;
};

interface PurchaseInvoiceFormProps {
  action: (state: PurchaseInvoiceActionState, formData: FormData) => Promise<PurchaseInvoiceActionState>;
  suppliers: Supplier[];
  products: Product[];
  units: Unit[];
  defaultSupplierId?: string;
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  error,
  children,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  children?: React.ReactNode;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    background: "#0d1627",
    border: `1px solid ${error ? "#ffb4ab" : "#2d3449"}`,
    borderRadius: "8px",
    color: "#dbe2fd",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div>
      <label
        htmlFor={name}
        style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#c2c6d9", marginBottom: "6px" }}
      >
        {label}
        {required && <span style={{ color: "#ffb4ab", marginLeft: "2px" }}>*</span>}
        {!required && <span style={{ color: "#4a5068", fontSize: "11px", marginLeft: "4px" }}>(optional)</span>}
      </label>
      {children ?? (
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = error ? "#ffb4ab" : "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
        />
      )}
      {error && <p style={{ fontSize: "12px", color: "#ffb4ab", marginTop: "4px" }}>{error}</p>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
      <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#dbe2fd", margin: "0 0 16px", paddingBottom: "12px", borderBottom: "1px solid #222a3e" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function LineItem({
  row,
  index,
  products,
  units,
  onRemove,
  onChange,
}: {
  row: LineRow;
  index: number;
  products: Product[];
  units: Unit[];
  onRemove: (id: string) => void;
  onChange: (id: string, field: keyof LineRow, value: string) => void;
}) {
  const selectStyle: React.CSSProperties = {
    padding: "8px 10px",
    background: "#0d1627",
    border: "1px solid #2d3449",
    borderRadius: "8px",
    color: "#dbe2fd",
    fontSize: "13px",
    outline: "none",
    width: "100%",
  };
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

  const qty = parseFloat(row.quantity) || 0;
  const price = parseFloat(row.unitPrice) || 0;
  const total = qty * price;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 100px 120px 80px 32px",
        gap: "8px",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: "1px solid #1a2237",
      }}
    >
      <select
        name={`line_productId_${index}`}
        value={row.productId}
        onChange={(e) => onChange(row.id, "productId", e.target.value)}
        style={selectStyle}
      >
        <option value="">Select product…</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
        ))}
      </select>

      <select
        name={`line_unitId_${index}`}
        value={row.unitId}
        onChange={(e) => onChange(row.id, "unitId", e.target.value)}
        style={selectStyle}
      >
        <option value="">Unit…</option>
        {units.map((u) => (
          <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
        ))}
      </select>

      <input
        name={`line_quantity_${index}`}
        type="number"
        step="any"
        min="0.000001"
        value={row.quantity}
        onChange={(e) => onChange(row.id, "quantity", e.target.value)}
        placeholder="Qty"
        style={inputStyle}
      />

      <input
        name={`line_unitPrice_${index}`}
        type="number"
        step="any"
        min="0"
        value={row.unitPrice}
        onChange={(e) => onChange(row.id, "unitPrice", e.target.value)}
        placeholder="Unit price"
        style={inputStyle}
      />

      <div style={{ fontSize: "13px", fontWeight: 500, color: "#dbe2fd", textAlign: "right" }}>
        ${total.toFixed(2)}
      </div>

      <button
        type="button"
        onClick={() => onRemove(row.id)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "30px",
          height: "30px",
          borderRadius: "6px",
          border: "1px solid rgba(255,180,171,0.2)",
          background: "rgba(255,180,171,0.06)",
          color: "#ffb4ab",
          cursor: "pointer",
          flexShrink: 0,
        }}
        title="Remove line"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function PurchaseInvoiceForm({ action, suppliers, products, units, defaultSupplierId }: PurchaseInvoiceFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<PurchaseInvoiceActionState, FormData>(
    action as (s: PurchaseInvoiceActionState, fd: FormData) => Promise<PurchaseInvoiceActionState>,
    null
  );

  const [lines, setLines] = useState<LineRow[]>([
    { id: "line-0", productId: "", unitId: "", quantity: "1", unitPrice: "" },
  ]);

  useEffect(() => {
    if (state && "success" in state) {
      if (state.invoiceId) {
        router.push(`/dashboard/purchases/${state.invoiceId}`);
      } else {
        router.push("/dashboard/purchases");
      }
    }
  }, [state, router]);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, { id: `line-${Date.now()}`, productId: "", unitId: "", quantity: "1", unitPrice: "" }]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateLine = useCallback((id: string, field: keyof LineRow, value: string) => {
    setLines((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }, []);

  const totalAmount = lines.reduce((sum, l) => {
    return sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0);
  }, 0);

  const fieldError = (field: string) =>
    state && "fieldErrors" in state ? state.fieldErrors?.[field]?.[0] : undefined;

  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    background: "#0d1627",
    border: "1px solid #2d3449",
    borderRadius: "8px",
    color: "#dbe2fd",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <a href="/dashboard/purchases" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>Purchase Invoices</a>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#8c90a2", fontSize: "13px" }}>New Invoice</span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
              Create Purchase Invoice
            </h1>
          </div>
          <a href="/dashboard/purchases" style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
            Cancel
          </a>
        </div>

        {state && "error" in state && (
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(147,0,10,0.15)", border: "1px solid rgba(147,0,10,0.3)", color: "#ffb4ab", fontSize: "13px", marginBottom: "16px" }}>
            {state.error}
          </div>
        )}

        <form action={formAction}>
          <input type="hidden" name="lineCount" value={lines.length} />

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Header Info */}
            <SectionCard title="Invoice Details">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <Field label="Supplier" name="supplier-label" required error={fieldError("supplierId")}>
                  <select
                    id="supplierId"
                    name="supplierId"
                    defaultValue={defaultSupplierId ?? ""}
                    required
                    style={selectStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = fieldError("supplierId") ? "#ffb4ab" : "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <option value="">Select supplier…</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Expected Delivery Date"
                  name="deliveryDate"
                  type="date"
                  error={fieldError("deliveryDate")}
                />
              </div>

              <div style={{ marginTop: "16px" }}>
                <label htmlFor="notes" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#c2c6d9", marginBottom: "6px" }}>
                  Notes <span style={{ color: "#4a5068", fontSize: "11px", marginLeft: "4px" }}>(optional)</span>
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  placeholder="Any additional notes for this purchase…"
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
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
            </SectionCard>

            {/* Line Items */}
            <SectionCard title="Line Items">
              {/* Header row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 100px 120px 80px 32px",
                  gap: "8px",
                  padding: "0 0 8px",
                  borderBottom: "1px solid #222a3e",
                  marginBottom: "4px",
                }}
              >
                {["Product", "Unit", "Quantity", "Unit Price", "Total", ""].map((h) => (
                  <div key={h} style={{ fontSize: "11px", fontWeight: 600, color: "#8c90a2", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {h}
                  </div>
                ))}
              </div>

              {lines.map((row, i) => (
                <LineItem
                  key={row.id}
                  row={row}
                  index={i}
                  products={products}
                  units={units}
                  onRemove={removeLine}
                  onChange={updateLine}
                />
              ))}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={addLine}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    border: "1px dashed #2d3449",
                    background: "transparent",
                    color: "#8c90a2",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Add Line Item
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "13px", color: "#8c90a2" }}>Total Amount:</span>
                  <span style={{ fontSize: "18px", fontWeight: 700, color: "#dbe2fd" }}>
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </SectionCard>

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
                {pending ? "Creating…" : "Create Draft Invoice"}
              </button>
              <a href="/dashboard/purchases" style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
                Cancel
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
