"use client";

import { useActionState, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SalesActionState } from "../actions";

type ProductUnit = { id: string; name: string; symbol: string };
type Product = { id: string; name: string; sku: string; defaultUnitId: string; units: ProductUnit[] };
type Customer = { id: string; name: string };

interface SalesInvoiceFormProps {
  products: Product[];
  customers: Customer[];
  action: (prevState: SalesActionState, formData: FormData) => Promise<SalesActionState>;
}

type LineItem = {
  id: string;
  productId: string;
  unitId: string;
  quantity: string;
  unitPrice: string;
  discount: string;
};

function newLine(products: Product[]): LineItem {
  return {
    id: `line-${Date.now()}-${Math.random()}`,
    productId: products[0]?.id ?? "",
    unitId: products[0]?.defaultUnitId ?? "",
    quantity: "1",
    unitPrice: "0",
    discount: "",
  };
}

function calcLineTotal(line: LineItem): number {
  const qty = parseFloat(line.quantity) || 0;
  const price = parseFloat(line.unitPrice) || 0;
  const disc = parseFloat(line.discount) || 0;
  return qty * price * (1 - disc / 100);
}

function formatCurrency(val: number): string {
  return val.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function Label({ htmlFor, children, required, optional }: {
  htmlFor: string; children: React.ReactNode; required?: boolean; optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#c2c6d9", marginBottom: "5px" }}>
      {children}
      {required && <span style={{ color: "#ffb4ab", marginLeft: "2px" }}>*</span>}
      {optional && <span style={{ color: "#4a5068", fontSize: "10px", marginLeft: "4px" }}>(optional)</span>}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0d1627",
  border: "1px solid #2d3449",
  borderRadius: "7px",
  padding: "7px 10px",
  fontSize: "13px",
  color: "#dbe2fd",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "default",
};

export function SalesInvoiceForm({ products, customers, action }: SalesInvoiceFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SalesActionState, FormData>(action, null);

  const [lines, setLines] = useState<LineItem[]>(() => [newLine(products)]);
  const [customerId, setCustomerId] = useState("");

  useEffect(() => {
    if (state && "success" in state && "invoiceId" in state) {
      router.push(`/dashboard/sales/${(state as { invoiceId: string }).invoiceId}`);
    }
  }, [state, router]);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, newLine(products)]);
  }, [products]);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateLine = useCallback((id: string, field: keyof LineItem, value: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        // Auto-set unit when product changes
        if (field === "productId") {
          const product = products.find((p) => p.id === value);
          if (product) updated.unitId = product.defaultUnitId;
        }
        return updated;
      })
    );
  }, [products]);

  const grandTotal = lines.reduce((sum, l) => sum + calcLineTotal(l), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <a href="/dashboard/sales" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>Sales</a>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#8c90a2", fontSize: "13px" }}>New Invoice</span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>Create Sales Invoice</h1>
          </div>
          <a href="/dashboard/sales" style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
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
          {lines.map((line, i) => (
            <div key={line.id}>
              <input type="hidden" name={`line_productId_${i}`} value={line.productId} />
              <input type="hidden" name={`line_unitId_${i}`} value={line.unitId} />
              <input type="hidden" name={`line_quantity_${i}`} value={line.quantity} />
              <input type="hidden" name={`line_unitPrice_${i}`} value={line.unitPrice} />
              <input type="hidden" name={`line_discount_${i}`} value={line.discount} />
            </div>
          ))}

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Customer & Notes */}
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #222a3e" }}>
                <span style={{ color: "#0062ff", display: "flex" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M2.5 13.5C2.5 11.015 5 9 8 9C11 9 13.5 11.015 13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#dbe2fd", margin: 0 }}>Invoice Details</h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <Label htmlFor="customerId" optional>Customer</Label>
                  <select
                    id="customerId"
                    name="customerId"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    style={selectStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <option value="">No customer (walk-in)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="notes" optional>Notes</Label>
                  <input
                    id="notes"
                    name="notes"
                    type="text"
                    placeholder="Internal notes..."
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #222a3e" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ color: "#0062ff", display: "flex" }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="1.5" y="2.5" width="13" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M5 2.5V13.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M9 6H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M9 9H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#dbe2fd", margin: 0 }}>Line Items</h2>
                  <span style={{ fontSize: "12px", color: "#8c90a2" }}>{lines.length} item{lines.length !== 1 ? "s" : ""}</span>
                </div>
                <button
                  type="button"
                  onClick={addLine}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "6px", border: "1px dashed #2d3449", background: "transparent", color: "#8c90a2", fontSize: "12px", cursor: "pointer" }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Add Line
                </button>
              </div>

              {/* Column headers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr auto",
                  gap: "8px",
                  marginBottom: "8px",
                  padding: "0 4px",
                }}
              >
                {["Product", "Unit", "Qty", "Unit Price", "Discount %", ""].map((h) => (
                  <div key={h} style={{ fontSize: "10px", fontWeight: 600, color: "#4a5068", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {h}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {lines.map((line, index) => (
                  <LineRow
                    key={line.id}
                    line={line}
                    index={index}
                    products={products}
                    onChange={updateLine}
                    onRemove={removeLine}
                    canRemove={lines.length > 1}
                  />
                ))}
              </div>

              {/* Total */}
              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: "1px solid #222a3e",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "16px",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "13px", color: "#8c90a2", fontWeight: 500 }}>Grand Total:</span>
                <span style={{ fontSize: "20px", fontWeight: 700, color: "#dbe2fd" }}>
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            {/* Submit */}
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
              <a
                href="/dashboard/sales"
                style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}
              >
                Cancel
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function LineRow({
  line, index, products, onChange, onRemove, canRemove,
}: {
  line: LineItem;
  index: number;
  products: Product[];
  onChange: (id: string, field: keyof LineItem, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const lineTotal = calcLineTotal(line);
  const selectedProduct = products.find((p) => p.id === line.productId);
  const availableUnits = selectedProduct?.units ?? [];

  return (
    <div
      style={{
        background: "#0d1627",
        border: "1px solid #1e2a42",
        borderRadius: "8px",
        padding: "10px 12px",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr auto", gap: "8px", alignItems: "center" }}>
        {/* Product */}
        <select
          value={line.productId}
          onChange={(e) => onChange(line.id, "productId", e.target.value)}
          style={{ ...selectStyle, fontSize: "12px" }}
        >
          <option value="">Select product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
          ))}
        </select>

        {/* Unit */}
        <select
          value={line.unitId}
          onChange={(e) => onChange(line.id, "unitId", e.target.value)}
          style={{ ...selectStyle, fontSize: "12px" }}
          disabled={availableUnits.length === 0}
        >
          {availableUnits.length === 0 ? (
            <option value="">—</option>
          ) : (
            availableUnits.map((u) => (
              <option key={u.id} value={u.id}>{u.symbol}</option>
            ))
          )}
        </select>

        {/* Quantity */}
        <input
          type="number"
          min="0.000001"
          step="any"
          value={line.quantity}
          onChange={(e) => onChange(line.id, "quantity", e.target.value)}
          style={{ ...inputStyle, fontSize: "12px" }}
        />

        {/* Unit Price */}
        <input
          type="number"
          min="0"
          step="0.01"
          value={line.unitPrice}
          onChange={(e) => onChange(line.id, "unitPrice", e.target.value)}
          placeholder="0.00"
          style={{ ...inputStyle, fontSize: "12px" }}
        />

        {/* Discount % */}
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={line.discount}
          onChange={(e) => onChange(line.id, "discount", e.target.value)}
          placeholder="0"
          style={{ ...inputStyle, fontSize: "12px" }}
        />

        {/* Remove button */}
        <button
          type="button"
          disabled={!canRemove}
          onClick={() => onRemove(line.id)}
          title="Remove line"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            border: "1px solid rgba(255,180,171,0.2)",
            background: "rgba(255,180,171,0.06)",
            color: canRemove ? "#ffb4ab" : "#2d3449",
            cursor: canRemove ? "pointer" : "not-allowed",
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Line total */}
      <div style={{ marginTop: "6px", textAlign: "right", fontSize: "11px", color: "#8c90a2" }}>
        Line total:{" "}
        <span style={{ color: "#dbe2fd", fontWeight: 600 }}>
          {formatCurrency(lineTotal)}
        </span>
        {line.discount && Number(line.discount) > 0 && (
          <span style={{ color: "#62df7d", marginLeft: "6px" }}>
            ({line.discount}% off)
          </span>
        )}
      </div>
    </div>
  );
}
