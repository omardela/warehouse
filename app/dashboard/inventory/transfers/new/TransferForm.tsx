"use client";

import { useActionState, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createStockTransferAction, type StockTransferActionState } from "../actions";

type Warehouse = { id: string; name: string };
type ProductUnit = { id: string; name: string; symbol: string };
type Product = {
  id: string;
  name: string;
  sku: string;
  defaultUnitId: string;
  units: ProductUnit[];
  balances: Record<string, number>;
};

type LineRow = {
  id: string;
  productId: string;
  unitId: string;
  quantity: string;
};

interface TransferFormProps {
  warehouses: Warehouse[];
  products: Product[];
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
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

const sectionStyle: React.CSSProperties = {
  background: "#171f33",
  border: "1px solid #222a3e",
  borderRadius: "10px",
  padding: "20px 24px",
};

function StepBadge({ n }: { n: number }) {
  return (
    <div
      style={{
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        background: "rgba(0,98,255,0.15)",
        border: "1px solid rgba(0,98,255,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: 700,
        color: "#6699ff",
        flexShrink: 0,
      }}
    >
      {n}
    </div>
  );
}

function LineItem({
  row,
  index,
  products,
  sourceWarehouseId,
  onRemove,
  onChange,
}: {
  row: LineRow;
  index: number;
  products: Product[];
  sourceWarehouseId: string;
  onRemove: (id: string) => void;
  onChange: (id: string, field: keyof LineRow, value: string) => void;
}) {
  const selectedProduct = products.find((p) => p.id === row.productId);
  const availableUnits = selectedProduct?.units ?? [];
  const sourceBalance =
    selectedProduct && sourceWarehouseId
      ? selectedProduct.balances[sourceWarehouseId] ?? 0
      : null;

  const qty = parseFloat(row.quantity) || 0;
  const insufficientStock =
    sourceBalance != null && qty > 0 && qty > sourceBalance && row.unitId === selectedProduct?.defaultUnitId;

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
  const lineInputStyle: React.CSSProperties = {
    padding: "8px 10px",
    background: "#0d1627",
    border: `1px solid ${insufficientStock ? "#ffb4ab" : "#2d3449"}`,
    borderRadius: "8px",
    color: "#dbe2fd",
    fontSize: "13px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 100px 120px 32px",
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
          <option key={p.id} value={p.id}>
            {p.name} ({p.sku})
          </option>
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
          <option value="">Select product first…</option>
        ) : (
          availableUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.symbol})
            </option>
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
        placeholder="Qty"
        style={lineInputStyle}
      />

      <div style={{ fontSize: "12px", color: insufficientStock ? "#ffb4ab" : "#8c90a2", textAlign: "right" }}>
        {selectedProduct && sourceWarehouseId
          ? `Avail: ${sourceBalance != null ? sourceBalance.toFixed(2) : "0"}`
          : ""}
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

export function TransferForm({ warehouses, products }: TransferFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<StockTransferActionState, FormData>(
    createStockTransferAction,
    null
  );

  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [lines, setLines] = useState<LineRow[]>([
    { id: "line-0", productId: "", unitId: "", quantity: "" },
  ]);

  useEffect(() => {
    if (state && "success" in state) {
      router.push("/dashboard/inventory/transfers");
    }
  }, [state, router]);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, { id: `line-${Date.now()}`, productId: "", unitId: "", quantity: "" }]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateLine = useCallback(
    (id: string, field: keyof LineRow, value: string) => {
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
    },
    [products]
  );

  const sameWarehouse =
    sourceWarehouseId !== "" && sourceWarehouseId === destinationWarehouseId;

  const hasInsufficientStock = useMemo(() => {
    return lines.some((row) => {
      const product = products.find((p) => p.id === row.productId);
      if (!product || !sourceWarehouseId) return false;
      const qty = parseFloat(row.quantity) || 0;
      if (qty <= 0) return false;
      // Only a precise client-side check when using the default unit (server re-validates with conversions regardless)
      if (row.unitId !== product.defaultUnitId) return false;
      const balance = product.balances[sourceWarehouseId] ?? 0;
      return qty > balance;
    });
  }, [lines, products, sourceWarehouseId]);

  const fieldError = (field: string) =>
    state && "fieldErrors" in state ? state.fieldErrors?.[field]?.[0] : undefined;

  const canSubmit =
    !pending &&
    sourceWarehouseId !== "" &&
    destinationWarehouseId !== "" &&
    !sameWarehouse &&
    lines.some((l) => l.productId && l.unitId && parseFloat(l.quantity) > 0) &&
    !hasInsufficientStock;

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <a href="/dashboard/inventory/transfers" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>
                Stock Transfers
              </a>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#8c90a2", fontSize: "13px" }}>New Transfer</span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
              New Stock Transfer
            </h1>
            <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "4px" }}>
              Move stock from one warehouse to another. Both movements are recorded atomically.
            </p>
          </div>
          <a
            href="/dashboard/inventory/transfers"
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #2d3449",
              color: "#8c90a2",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Cancel
          </a>
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
          <input type="hidden" name="lineCount" value={lines.length} />

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Section 1: Warehouses */}
            <div style={sectionStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <StepBadge n={1} />
                <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#dbe2fd", margin: 0 }}>
                  Source &amp; Destination
                </h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label htmlFor="sourceWarehouseId" style={labelStyle}>
                    Source Warehouse <span style={{ color: "#ffb4ab" }}>*</span>
                  </label>
                  <select
                    id="sourceWarehouseId"
                    name="sourceWarehouseId"
                    required
                    value={sourceWarehouseId}
                    onChange={(e) => setSourceWarehouseId(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select source warehouse…</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  {fieldError("sourceWarehouseId") && (
                    <p style={{ fontSize: "12px", color: "#ffb4ab", marginTop: "4px" }}>
                      {fieldError("sourceWarehouseId")}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="destinationWarehouseId" style={labelStyle}>
                    Destination Warehouse <span style={{ color: "#ffb4ab" }}>*</span>
                  </label>
                  <select
                    id="destinationWarehouseId"
                    name="destinationWarehouseId"
                    required
                    value={destinationWarehouseId}
                    onChange={(e) => setDestinationWarehouseId(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select destination warehouse…</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  {fieldError("destinationWarehouseId") && (
                    <p style={{ fontSize: "12px", color: "#ffb4ab", marginTop: "4px" }}>
                      {fieldError("destinationWarehouseId")}
                    </p>
                  )}
                </div>
              </div>

              {sameWarehouse && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "10px 14px",
                    background: "rgba(147,0,10,0.12)",
                    border: "1px solid rgba(147,0,10,0.3)",
                    borderRadius: "8px",
                    fontSize: "13px",
                    color: "#ffb4ab",
                  }}
                >
                  Source and destination warehouses must be different.
                </div>
              )}

              <div style={{ marginTop: "16px" }}>
                <label htmlFor="note" style={labelStyle}>
                  Note <span style={{ color: "#4a5068", fontSize: "11px", marginLeft: "4px" }}>(optional)</span>
                </label>
                <textarea
                  id="note"
                  name="note"
                  placeholder="Any additional context for this transfer…"
                  rows={2}
                  maxLength={2000}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
            </div>

            {/* Section 2: Line Items */}
            <div style={sectionStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <StepBadge n={2} />
                <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#dbe2fd", margin: 0 }}>
                  Line Items
                </h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 100px 120px 32px",
                  gap: "8px",
                  padding: "0 0 8px",
                  borderBottom: "1px solid #222a3e",
                  marginBottom: "4px",
                }}
              >
                {["Product", "Unit", "Quantity", "Source Stock", ""].map((h) => (
                  <div
                    key={h}
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#8c90a2",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
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
                  sourceWarehouseId={sourceWarehouseId}
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
              </div>

              {hasInsufficientStock && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "10px 14px",
                    background: "rgba(147,0,10,0.12)",
                    border: "1px solid rgba(147,0,10,0.3)",
                    borderRadius: "8px",
                    fontSize: "13px",
                    color: "#ffb4ab",
                  }}
                >
                  One or more lines exceed the available stock in the source warehouse.
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  padding: "10px 24px",
                  borderRadius: "8px",
                  background: canSubmit ? "#0062ff" : "#0044b8",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 600,
                  border: "none",
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  opacity: canSubmit ? 1 : 0.6,
                }}
              >
                {pending ? "Transferring…" : "Confirm Transfer"}
              </button>
              <a
                href="/dashboard/inventory/transfers"
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
                Cancel
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
