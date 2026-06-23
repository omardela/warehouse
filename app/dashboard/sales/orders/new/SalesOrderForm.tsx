"use client";

import { useActionState, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SalesOrderActionState } from "../actions";
import { useTranslations } from "@/providers/locale-context";
import type { Dictionary } from "@/core/i18n/get-dictionary";

type Customer = { id: string; name: string };
type Warehouse = { id: string; name: string };
type ProductUnit = { id: string; name: string; symbol: string };
type Product = { id: string; name: string; sku: string; defaultUnitId: string; units: ProductUnit[] };

type LineRow = {
  id: string;
  productId: string;
  unitId: string;
  quantity: string;
  unitPrice: string;
  discount: string;
};

interface SalesOrderFormProps {
  action: (state: SalesOrderActionState, formData: FormData) => Promise<SalesOrderActionState>;
  customers: Customer[];
  warehouses: Warehouse[];
  products: Product[];
  defaultCustomerId?: string;
  defaultWarehouseId?: string;
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
  optionalLabel,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  children?: React.ReactNode;
  optionalLabel: string;
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
        {required && <span style={{ color: "#ffb4ab", marginInlineStart: "2px" }}>*</span>}
        {!required && <span style={{ color: "#4a5068", fontSize: "11px", marginInlineStart: "4px" }}>({optionalLabel})</span>}
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
  onRemove,
  onChange,
  t,
}: {
  row: LineRow;
  index: number;
  products: Product[];
  onRemove: (id: string) => void;
  onChange: (id: string, field: keyof LineRow, value: string) => void;
  t: Dictionary;
}) {
  const selectedProduct = products.find((p) => p.id === row.productId);
  const availableUnits = selectedProduct?.units ?? [];
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
  const discount = parseFloat(row.discount) || 0;
  const total = qty * price * (1 - discount / 100);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 90px 100px 90px 100px 32px",
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
        <option value="">{t.sales.newOrder.selectProduct}</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
        ))}
      </select>

      <select
        name={`line_unitId_${index}`}
        value={row.unitId}
        onChange={(e) => onChange(row.id, "unitId", e.target.value)}
        style={selectStyle}
        disabled={availableUnits.length === 0}
      >
        {availableUnits.length === 0 ? (
          <option value="">{t.sales.newOrder.selectProductFirst}</option>
        ) : (
          availableUnits.map((u) => (
            <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
          ))
        )}
      </select>

      <input
        name={`line_quantity_${index}`}
        type="number"
        step="any"
        min="0.000001"
        value={row.quantity}
        onChange={(e) => onChange(row.id, "quantity", e.target.value)}
        placeholder={t.sales.newOrder.qtyPlaceholder}
        style={inputStyle}
      />

      <input
        name={`line_unitPrice_${index}`}
        type="number"
        step="any"
        min="0"
        value={row.unitPrice}
        onChange={(e) => onChange(row.id, "unitPrice", e.target.value)}
        placeholder={t.sales.newOrder.unitPricePlaceholder}
        style={inputStyle}
      />

      <input
        name={`line_discount_${index}`}
        type="number"
        step="any"
        min="0"
        max="100"
        value={row.discount}
        onChange={(e) => onChange(row.id, "discount", e.target.value)}
        placeholder={t.sales.newOrder.discPlaceholder}
        style={inputStyle}
      />

      <div style={{ fontSize: "13px", fontWeight: 500, color: "#dbe2fd", textAlign: "end" }}>
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
        title={t.sales.newOrder.removeLine}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function SalesOrderForm({ action, customers, warehouses, products, defaultCustomerId, defaultWarehouseId }: SalesOrderFormProps) {
  const router = useRouter();
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<SalesOrderActionState, FormData>(
    action as (s: SalesOrderActionState, fd: FormData) => Promise<SalesOrderActionState>,
    null
  );

  const [lines, setLines] = useState<LineRow[]>([
    { id: "line-0", productId: "", unitId: "", quantity: "1", unitPrice: "", discount: "" },
  ]);

  useEffect(() => {
    if (state && "success" in state) {
      if (state.salesOrderId) {
        router.push(`/dashboard/sales/orders/${state.salesOrderId}`);
      } else {
        router.push("/dashboard/sales/orders");
      }
    }
  }, [state, router]);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, { id: `line-${Date.now()}`, productId: "", unitId: "", quantity: "1", unitPrice: "", discount: "" }]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateLine = useCallback((id: string, field: keyof LineRow, value: string) => {
    setLines((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        if (field === "productId") {
          const product = products.find((p) => p.id === value);
          updated.unitId = product?.defaultUnitId ?? "";
        }
        return updated;
      })
    );
  }, [products]);

  const totalAmount = lines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    const discount = parseFloat(l.discount) || 0;
    return sum + qty * price * (1 - discount / 100);
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
      <div style={{ maxWidth: "1040px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <a href="/dashboard/sales/orders" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>{t.sales.newOrder.breadcrumbParent}</a>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#8c90a2", fontSize: "13px" }}>{t.sales.newOrder.breadcrumbCurrent}</span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
              {t.sales.newOrder.title}
            </h1>
          </div>
          <a href="/dashboard/sales/orders" style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
            {t.common.cancel}
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
            <SectionCard title={t.sales.newOrder.sectionDetails}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <Field label={t.sales.newOrder.customerLabel} name="customer-label" required error={fieldError("customerId")} optionalLabel={t.common.optional}>
                  <select
                    id="customerId"
                    name="customerId"
                    defaultValue={defaultCustomerId ?? ""}
                    required
                    style={selectStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = fieldError("customerId") ? "#ffb4ab" : "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <option value="">{t.sales.newOrder.selectCustomer}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>

                <Field label={t.sales.newOrder.warehouseLabel} name="warehouse-label" required error={fieldError("warehouseId")} optionalLabel={t.common.optional}>
                  <select
                    id="warehouseId"
                    name="warehouseId"
                    defaultValue={defaultWarehouseId ?? ""}
                    required
                    style={selectStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = fieldError("warehouseId") ? "#ffb4ab" : "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <option value="">{t.sales.newOrder.selectWarehouse}</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div style={{ marginTop: "16px" }}>
                <Field
                  label={t.sales.newOrder.expectedDeliveryDateLabel}
                  name="expectedDeliveryDate"
                  type="date"
                  error={fieldError("expectedDeliveryDate")}
                  optionalLabel={t.common.optional}
                />
              </div>

              <div style={{ marginTop: "16px" }}>
                <label htmlFor="note" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#c2c6d9", marginBottom: "6px" }}>
                  {t.sales.newOrder.notesLabel} <span style={{ color: "#4a5068", fontSize: "11px", marginInlineStart: "4px" }}>({t.common.optional})</span>
                </label>
                <textarea
                  id="note"
                  name="note"
                  placeholder={t.sales.newOrder.notesPlaceholder}
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
            <SectionCard title={t.sales.newOrder.sectionLineItems}>
              {/* Header row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 90px 100px 90px 100px 32px",
                  gap: "8px",
                  padding: "0 0 8px",
                  borderBottom: "1px solid #222a3e",
                  marginBottom: "4px",
                }}
              >
                {[
                  t.sales.newOrder.columns.product,
                  t.sales.newOrder.columns.unit,
                  t.sales.newOrder.columns.quantity,
                  t.sales.newOrder.columns.unitPrice,
                  t.sales.newOrder.columns.discountPercent,
                  t.sales.newOrder.columns.total,
                  "",
                ].map((h) => (
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
                  onRemove={removeLine}
                  onChange={updateLine}
                  t={t}
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
                  {t.sales.newOrder.addLineItem}
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "13px", color: "#8c90a2" }}>{t.sales.newOrder.totalValue}</span>
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
                {pending ? t.sales.newOrder.submitting : t.sales.newOrder.submit}
              </button>
              <a href="/dashboard/sales/orders" style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
                {t.common.cancel}
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
