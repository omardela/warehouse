"use client";

import { useActionState, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PurchaseInvoiceActionState } from "../actions";
import { useTranslations } from "@/providers/locale-context";
import type { Dictionary } from "@/core/i18n/get-dictionary";

type Supplier = { id: string; name: string };
type ProductUnit = { id: string; name: string; symbol: string };
type Product = { id: string; name: string; sku: string; defaultUnitId: string; units: ProductUnit[] };
type PurchaseOrderLine = {
  productId: string;
  productName: string;
  sku: string;
  unitId: string;
  unitSymbol: string;
  quantity: number;
  unitPrice: number;
};
type EligiblePurchaseOrder = {
  id: string;
  supplierId: string;
  status: string;
  label: string;
  lines: PurchaseOrderLine[];
};

type LineRow = {
  id: string;
  productId: string;
  unitId: string;
  quantity: string;
  unitPrice: string;
  // Set when this row was auto-loaded from a linked PO's received line.
  // Locks productId/unitId and carries the figures used for the qty/price
  // validation hints (the PO's received quantity can't be exceeded; the
  // PO's agreed unit cost is shown as a reference, not enforced).
  locked?: { productName: string; sku: string; unitSymbol: string; receivedQty: number; agreedPrice: number };
};

interface PurchaseInvoiceFormProps {
  action: (state: PurchaseInvoiceActionState, formData: FormData) => Promise<PurchaseInvoiceActionState>;
  suppliers: Supplier[];
  products: Product[];
  purchaseOrders: EligiblePurchaseOrder[];
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
  const total = qty * price;
  const locked = row.locked;

  const qtyExceedsReceived = locked != null && qty > locked.receivedQty + 0.000001;
  const priceDiffersFromPO = locked != null && Math.abs(price - locked.agreedPrice) > 0.000001;

  const lockedTextStyle: React.CSSProperties = {
    padding: "8px 10px",
    fontSize: "13px",
    color: "#dbe2fd",
  };

  return (
    <div style={{ borderBottom: "1px solid #1a2237" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 100px 120px 80px 32px",
          gap: "8px",
          alignItems: "center",
          padding: "10px 0",
        }}
      >
        {locked ? (
          <div style={lockedTextStyle}>
            {locked.productName} ({locked.sku})
            <input type="hidden" name={`line_productId_${index}`} value={row.productId} />
          </div>
        ) : (
          <select
            name={`line_productId_${index}`}
            value={row.productId}
            onChange={(e) => onChange(row.id, "productId", e.target.value)}
            style={selectStyle}
          >
            <option value="">{t.purchases.invoices.selectProduct}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        )}

        {locked ? (
          <div style={lockedTextStyle}>
            {locked.unitSymbol}
            <input type="hidden" name={`line_unitId_${index}`} value={row.unitId} />
          </div>
        ) : (
          <select
            name={`line_unitId_${index}`}
            value={row.unitId}
            onChange={(e) => onChange(row.id, "unitId", e.target.value)}
            style={selectStyle}
            disabled={availableUnits.length === 0}
          >
            {availableUnits.length === 0 ? (
              <option value="">{t.purchases.invoices.selectProductFirst}</option>
            ) : (
              availableUnits.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
              ))
            )}
          </select>
        )}

        <input
          name={`line_quantity_${index}`}
          type="number"
          step="any"
          min="0.000001"
          value={row.quantity}
          onChange={(e) => onChange(row.id, "quantity", e.target.value)}
          placeholder={t.purchases.invoices.qtyPlaceholder}
          style={{ ...inputStyle, borderColor: qtyExceedsReceived ? "#ffb4ab" : "#2d3449" }}
        />

        <input
          name={`line_unitPrice_${index}`}
          type="number"
          step="any"
          min="0"
          value={row.unitPrice}
          onChange={(e) => onChange(row.id, "unitPrice", e.target.value)}
          placeholder={t.purchases.invoices.unitPricePlaceholder}
          style={inputStyle}
        />

        <div style={{ fontSize: "13px", fontWeight: 500, color: "#dbe2fd", textAlign: "end" }}>
          ${total.toFixed(2)}
        </div>

        <button
          type="button"
          onClick={() => onRemove(row.id)}
          disabled={!!locked}
          title={locked ? t.purchases.invoices.cannotRemoveLockedLine : t.purchases.invoices.removeLine}
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
            cursor: locked ? "not-allowed" : "pointer",
            opacity: locked ? 0.35 : 1,
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {locked && (qtyExceedsReceived || priceDiffersFromPO) && (
        <div style={{ display: "flex", gap: "16px", paddingBottom: "10px", fontSize: "11px" }}>
          {qtyExceedsReceived && (
            <span style={{ color: "#ffb4ab" }}>
              {t.purchases.invoices.qtyExceedsReceived.replace("{qty}", String(locked.receivedQty))}
            </span>
          )}
          {priceDiffersFromPO && (
            <span style={{ color: "#f5c451" }}>
              {t.purchases.invoices.poAgreedPrice.replace("{price}", locked.agreedPrice.toFixed(2))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function PurchaseInvoiceForm({ action, suppliers, products, purchaseOrders, defaultSupplierId }: PurchaseInvoiceFormProps) {
  const router = useRouter();
  const t = useTranslations();
  const [state, formAction, pending] = useActionState<PurchaseInvoiceActionState, FormData>(
    action as (s: PurchaseInvoiceActionState, fd: FormData) => Promise<PurchaseInvoiceActionState>,
    null
  );

  const [lines, setLines] = useState<LineRow[]>([
    { id: "line-0", productId: "", unitId: "", quantity: "1", unitPrice: "" },
  ]);

  const [supplierId, setSupplierId] = useState<string>(defaultSupplierId ?? "");
  const [purchaseOrderId, setPurchaseOrderId] = useState<string>("");

  const availablePurchaseOrders = purchaseOrders.filter((po) => po.supplierId === supplierId);

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
    // Locked (PO-derived) rows can't be removed via this path — the remove
    // button is disabled for them, this is just a safety net.
    setLines((prev) => prev.filter((r) => r.locked || r.id !== id));
  }, []);

  // Selecting a PO auto-loads its received lines (quantity = received qty,
  // price = the PO's agreed unitCost) as locked rows — productId/unitId can't
  // be changed since they come straight from what was actually received.
  // Deselecting resets back to a single blank manual line.
  const handlePurchaseOrderChange = useCallback((poId: string) => {
    setPurchaseOrderId(poId);
    const po = purchaseOrders.find((p) => p.id === poId);
    if (po && po.lines.length > 0) {
      setLines(
        po.lines.map((l, i) => ({
          id: `po-line-${i}`,
          productId: l.productId,
          unitId: l.unitId,
          quantity: String(l.quantity),
          unitPrice: String(l.unitPrice),
          locked: {
            productName: l.productName,
            sku: l.sku,
            unitSymbol: l.unitSymbol,
            receivedQty: l.quantity,
            agreedPrice: l.unitPrice,
          },
        }))
      );
    } else {
      setLines([{ id: `line-${Date.now()}`, productId: "", unitId: "", quantity: "1", unitPrice: "" }]);
    }
  }, [purchaseOrders]);

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
              <a href="/dashboard/purchases" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>{t.purchases.invoices.title}</a>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#8c90a2", fontSize: "13px" }}>{t.purchases.invoices.newInvoice}</span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
              {t.purchases.invoices.createTitle}
            </h1>
          </div>
          <a href="/dashboard/purchases" style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
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
            <SectionCard title={t.purchases.invoices.detailsSection}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                <Field label={t.purchases.invoices.supplier} name="supplier-label" required error={fieldError("supplierId")} optionalLabel={t.common.optional}>
                  <select
                    id="supplierId"
                    name="supplierId"
                    value={supplierId}
                    required
                    style={selectStyle}
                    onChange={(e) => {
                      setSupplierId(e.target.value);
                      handlePurchaseOrderChange("");
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = fieldError("supplierId") ? "#ffb4ab" : "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <option value="">{t.purchases.invoices.selectSupplier}</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </Field>

                <Field
                  label={t.purchases.invoices.expectedDeliveryDate}
                  name="deliveryDate"
                  type="date"
                  error={fieldError("deliveryDate")}
                  optionalLabel={t.common.optional}
                />

                <Field label={t.purchases.invoices.linkToPurchaseOrder} name="purchaseOrderId-label" error={fieldError("purchaseOrderId")} optionalLabel={t.common.optional}>
                  <select
                    id="purchaseOrderId"
                    name="purchaseOrderId"
                    value={purchaseOrderId}
                    disabled={!supplierId || availablePurchaseOrders.length === 0}
                    style={selectStyle}
                    onChange={(e) => handlePurchaseOrderChange(e.target.value)}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <option value="">
                      {!supplierId
                        ? t.purchases.invoices.selectSupplierFirst
                        : availablePurchaseOrders.length === 0
                        ? t.purchases.invoices.noReceivedOrdersForSupplier
                        : t.purchases.invoices.noneNotLinked}
                    </option>
                    {availablePurchaseOrders.map((po) => (
                      <option key={po.id} value={po.id}>{po.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div style={{ marginTop: "16px" }}>
                <label htmlFor="notes" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#c2c6d9", marginBottom: "6px" }}>
                  {t.purchases.invoices.notes} <span style={{ color: "#4a5068", fontSize: "11px", marginInlineStart: "4px" }}>({t.common.optional})</span>
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  placeholder={t.purchases.invoices.notesPlaceholder}
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
            <SectionCard title={t.purchases.invoices.lineItemsSection}>
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
                {[
                  t.purchases.invoices.columnsLine.product,
                  t.purchases.invoices.columnsLine.unit,
                  t.purchases.invoices.columnsLine.quantity,
                  t.purchases.invoices.columnsLine.unitPrice,
                  t.purchases.invoices.columnsLine.total,
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
                  {t.purchases.invoices.addLineItem}
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "13px", color: "#8c90a2" }}>{t.purchases.invoices.totalAmountLabel}</span>
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
                {pending ? t.purchases.invoices.creating : t.purchases.invoices.createDraftInvoice}
              </button>
              <a href="/dashboard/purchases" style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
                {t.common.cancel}
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
