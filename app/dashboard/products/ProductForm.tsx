"use client";

import { useActionState, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { createProductAction } from "./new/actions";
import type { updateProductAction } from "./[productId]/actions";

export type ProductUnit = {
  id: string;
  name: string;
  symbol: string;
};

export type ProductCategory = {
  id: string;
  name: string;
};

export type ConversionRow = {
  id: string;
  fromUnitId: string;
  toUnitId: string;
  factor: string;
};

export type ProductFormInitialValues = {
  id?: string;
  name?: string;
  sku?: string;
  description?: string;
  categoryId?: string;
  defaultUnitId?: string;
  barcode?: string;
  lowStockThreshold?: number;
  conversions?: Array<{ fromUnitId: string; toUnitId: string; factor: string }>;
};

export type ProductActionState =
  | { success: true }
  | { error: string; fieldErrors?: Record<string, string[]> }
  | null;

interface ProductFormProps {
  mode: "create" | "edit";
  units: ProductUnit[];
  categories: ProductCategory[];
  initialValues?: ProductFormInitialValues;
  action: typeof createProductAction | typeof updateProductAction;
  archiveButton?: React.ReactNode;
}

function Input({
  id, name, type = "text", defaultValue, placeholder, required, readOnly, min, error,
}: {
  id: string; name: string; type?: string; defaultValue?: string | number;
  placeholder?: string; required?: boolean; readOnly?: boolean; min?: number; error?: string;
}) {
  return (
    <div>
      <input
        id={id} name={name} type={type} defaultValue={defaultValue}
        placeholder={placeholder} required={required} readOnly={readOnly} min={min}
        style={{
          background: readOnly ? "#111827" : "#0d1627",
          border: `1px solid ${error ? "#ffb4ab" : "#2d3449"}`,
          borderRadius: "8px",
          padding: "8px 12px",
          fontSize: "13px",
          color: readOnly ? "#4a5068" : "#dbe2fd",
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
          cursor: readOnly ? "not-allowed" : "text",
        }}
        onFocus={(e) => {
          if (!readOnly) {
            e.currentTarget.style.borderColor = "#0062ff";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)";
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? "#ffb4ab" : "#2d3449";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
      {error && <p style={{ fontSize: "12px", color: "#ffb4ab", marginTop: "4px" }}>{error}</p>}
    </div>
  );
}

function Select({
  id, name, defaultValue, children, disabled, error,
}: {
  id: string; name: string; defaultValue?: string; children: React.ReactNode; disabled?: boolean; error?: string;
}) {
  return (
    <div>
      <select
        id={id} name={name} defaultValue={defaultValue} disabled={disabled}
        style={{
          background: disabled ? "#111827" : "#0d1627",
          border: `1px solid ${error ? "#ffb4ab" : "#2d3449"}`,
          borderRadius: "8px",
          padding: "8px 12px",
          fontSize: "13px",
          color: disabled ? "#4a5068" : "#dbe2fd",
          outline: "none",
          width: "100%",
          cursor: disabled ? "not-allowed" : "default",
        }}
        onFocus={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = "#0062ff";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)";
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? "#ffb4ab" : "#2d3449";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {children}
      </select>
      {error && <p style={{ fontSize: "12px", color: "#ffb4ab", marginTop: "4px" }}>{error}</p>}
    </div>
  );
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

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #222a3e" }}>
        <span style={{ color: "#0062ff", display: "flex" }}>{icon}</span>
        <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#dbe2fd", margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ConversionRowItem({ row, units, index, onRemove, onChange }: {
  row: ConversionRow; units: ProductUnit[]; index: number;
  onRemove: (id: string) => void; onChange: (id: string, field: keyof ConversionRow, value: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: "8px", alignItems: "center" }}>
      <select
        name={`conversion_fromUnitId_${index}`}
        value={row.fromUnitId}
        onChange={(e) => onChange(row.id, "fromUnitId", e.target.value)}
        style={{ background: "#0d1627", border: "1px solid #2d3449", borderRadius: "8px", padding: "7px 10px", fontSize: "13px", color: "#dbe2fd", outline: "none" }}
      >
        <option value="">From unit…</option>
        {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
      </select>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
        <span style={{ color: "#4a5068", fontSize: "12px" }}>=</span>
        <input
          name={`conversion_factor_${index}`}
          type="number" step="any" min="0.0000000001"
          value={row.factor}
          onChange={(e) => onChange(row.id, "factor", e.target.value)}
          placeholder="Factor"
          style={{ background: "#0d1627", border: "1px solid #2d3449", borderRadius: "8px", padding: "7px 10px", fontSize: "13px", color: "#dbe2fd", outline: "none", width: "80px" }}
        />
      </div>

      <select
        name={`conversion_toUnitId_${index}`}
        value={row.toUnitId}
        onChange={(e) => onChange(row.id, "toUnitId", e.target.value)}
        style={{ background: "#0d1627", border: "1px solid #2d3449", borderRadius: "8px", padding: "7px 10px", fontSize: "13px", color: "#dbe2fd", outline: "none" }}
      >
        <option value="">To unit…</option>
        {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
      </select>

      <button
        type="button"
        onClick={() => onRemove(row.id)}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", borderRadius: "6px", border: "1px solid rgba(255,180,171,0.2)", background: "rgba(255,180,171,0.06)", color: "#ffb4ab", cursor: "pointer", flexShrink: 0 }}
        title="Remove conversion"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function ProductForm({ mode, units, categories, initialValues = {}, action, archiveButton }: ProductFormProps) {
  const router = useRouter();

  const [state, formAction, pending] = useActionState<ProductActionState, FormData>(
    action as (s: ProductActionState, fd: FormData) => Promise<ProductActionState>,
    null
  );

  const [conversions, setConversions] = useState<ConversionRow[]>(() =>
    (initialValues.conversions ?? []).map((c, i) => ({
      id: `init-${i}`,
      fromUnitId: c.fromUnitId,
      toUnitId: c.toUnitId,
      factor: c.factor,
    }))
  );

  useEffect(() => {
    if (state && "success" in state) {
      router.push("/dashboard/products");
    }
  }, [state, router]);

  const addConversion = useCallback(() => {
    setConversions((prev) => [...prev, { id: `new-${Date.now()}-${Math.random()}`, fromUnitId: "", toUnitId: "", factor: "1" }]);
  }, []);

  const removeConversion = useCallback((id: string) => {
    setConversions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateConversion = useCallback((id: string, field: keyof ConversionRow, value: string) => {
    setConversions((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }, []);

  const fieldError = (field: string) =>
    state && "fieldErrors" in state ? state.fieldErrors?.[field]?.[0] : undefined;

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <a href="/dashboard/products" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>Products</a>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#8c90a2", fontSize: "13px" }}>{mode === "create" ? "New Product" : "Edit Product"}</span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
              {mode === "create" ? "Add New Product" : "Edit Product"}
            </h1>
            {mode === "edit" && initialValues.sku && (
              <p style={{ fontSize: "12px", color: "#8c90a2", margin: "2px 0 0", fontFamily: "monospace" }}>
                {initialValues.sku}{initialValues.name ? ` · ${initialValues.name}` : ""}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {archiveButton}
            <a href="/dashboard/products" style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
              Cancel
            </a>
          </div>
        </div>

        {state && "error" in state && (
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(147,0,10,0.15)", border: "1px solid rgba(147,0,10,0.3)", color: "#ffb4ab", fontSize: "13px", marginBottom: "16px" }}>
            {state.error}
          </div>
        )}

        <form action={formAction}>
          {mode === "edit" && initialValues.id && (
            <input type="hidden" name="productId" value={initialValues.id} />
          )}
          <input type="hidden" name="conversionCount" value={conversions.length} />

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <SectionCard title="Basic Information" icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="8" cy="5" r="0.75" fill="currentColor" />
              </svg>
            }>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Label htmlFor="name" required>Product Name</Label>
                  <Input id="name" name="name" defaultValue={initialValues.name} placeholder="e.g. Industrial Steel Shelving Unit" required error={fieldError("name")} />
                </div>
                <div>
                  <Label htmlFor="sku" required={mode === "create"}>
                    SKU
                    {mode === "edit" && <span style={{ fontSize: "11px", color: "#4a5068", marginLeft: "6px" }}>(read-only)</span>}
                  </Label>
                  <Input id="sku" name="sku" defaultValue={initialValues.sku} placeholder="e.g. STL-001-42" required={mode === "create"} readOnly={mode === "edit"} error={fieldError("sku")} />
                </div>
                <div>
                  <Label htmlFor="barcode" optional>Barcode (UPC/EAN)</Label>
                  <Input id="barcode" name="barcode" defaultValue={initialValues.barcode ?? ""} placeholder="Scan or enter barcode" error={fieldError("barcode")} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Label htmlFor="description" optional>Description</Label>
                  <textarea
                    id="description" name="description" defaultValue={initialValues.description ?? ""} placeholder="Detailed product description…" rows={3}
                    style={{ width: "100%", background: "#0d1627", border: "1px solid #2d3449", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "#dbe2fd", outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Classification" icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4.5H14M2 8H10M2 11.5H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            }>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <Label htmlFor="categoryId" optional>Category</Label>
                  <Select id="categoryId" name="categoryId" defaultValue={initialValues.categoryId ?? ""} error={fieldError("categoryId")}>
                    <option value="">No Category</option>
                    {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="defaultUnitId" required={mode === "create"}>
                    Base Unit
                    {mode === "edit" && <span style={{ fontSize: "11px", color: "#4a5068", marginLeft: "6px" }}>(read-only)</span>}
                  </Label>
                  <Select id="defaultUnitId" name="defaultUnitId" defaultValue={initialValues.defaultUnitId ?? ""} disabled={mode === "edit"} error={fieldError("defaultUnitId")}>
                    <option value="">Select unit…</option>
                    {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                  </Select>
                  {mode === "edit" && initialValues.defaultUnitId && (
                    <input type="hidden" name="defaultUnitId" value={initialValues.defaultUnitId} />
                  )}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Inventory Settings" icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="3.5" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 3.5V2M11 3.5V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M4.5 7.5H11.5M4.5 9.5H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            }>
              <div style={{ maxWidth: "240px" }}>
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                <Input id="lowStockThreshold" name="lowStockThreshold" type="number" min={0} defaultValue={initialValues.lowStockThreshold ?? 10} placeholder="10" error={fieldError("lowStockThreshold")} />
                <p style={{ fontSize: "11px", color: "#4a5068", marginTop: "6px" }}>Warn when stock falls at or below this quantity.</p>
              </div>
            </SectionCard>

            <SectionCard title="Alternate Unit Conversions" icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8H14M10 4L14 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {conversions.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "#4a5068", margin: "0 0 8px" }}>
                    No unit conversions defined. Add one to enable selling in alternate units.
                  </p>
                ) : (
                  conversions.map((row, i) => (
                    <ConversionRowItem key={row.id} row={row} units={units} index={i} onRemove={removeConversion} onChange={updateConversion} />
                  ))
                )}
                <button
                  type="button"
                  onClick={addConversion}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", border: "1px dashed #2d3449", background: "transparent", color: "#8c90a2", fontSize: "13px", cursor: "pointer", alignSelf: "flex-start", marginTop: conversions.length > 0 ? "4px" : 0 }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M6 1.5V10.5M1.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Add Conversion
                </button>
              </div>
            </SectionCard>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button
                type="submit"
                disabled={pending}
                style={{ padding: "10px 24px", borderRadius: "8px", background: pending ? "#0044b8" : "#0062ff", color: "#fff", fontSize: "14px", fontWeight: 600, border: "none", cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.8 : 1 }}
              >
                {pending ? "Saving…" : mode === "create" ? "Save Product" : "Save Changes"}
              </button>
              <a href="/dashboard/products" style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
                Cancel
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
