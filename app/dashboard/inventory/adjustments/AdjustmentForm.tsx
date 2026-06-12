"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createAdjustmentAction,
  type AdjustmentActionState,
} from "./actions";

interface Product {
  id: string;
  name: string;
  sku: string;
  defaultUnit: { id: string; name: string; symbol: string };
  currentBalance: number | null;
  lowStockThreshold: number;
}

interface AdjustmentFormProps {
  products: Product[];
}

export function AdjustmentForm({ products }: AdjustmentFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    AdjustmentActionState,
    FormData
  >(createAdjustmentAction, null);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"ADD" | "REMOVE">("ADD");
  const [quantity, setQuantity] = useState("");

  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;

  const currentBalance = selectedProduct?.currentBalance ?? null;
  const parsedQty = parseFloat(quantity) || 0;

  let newBalance: number | null = null;
  if (selectedProduct && parsedQty > 0) {
    const base = currentBalance ?? 0;
    newBalance = adjustmentType === "ADD" ? base + parsedQty : base - parsedQty;
  }

  useEffect(() => {
    if (state && "success" in state) {
      router.push("/dashboard/inventory/movements");
    }
  }, [state, router]);

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    background: "#0d1627",
    border: "1px solid #2d3449",
    borderRadius: "8px",
    color: "#dbe2fd",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block" as const,
    fontSize: "13px",
    fontWeight: 500 as const,
    color: "#c2c6d9",
    marginBottom: "6px",
  };

  const sectionStyle = {
    background: "#171f33",
    border: "1px solid #222a3e",
    borderRadius: "10px",
    padding: "20px 24px",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Header */}
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
            Stock Adjustment
          </h1>
          <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "4px" }}>
            Manually add or remove stock with a required justification note.
          </p>
        </div>

        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Section 1: Target */}
          <div style={sectionStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
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
                1
              </div>
              <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#dbe2fd", margin: 0 }}>
                Target Product
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label htmlFor="productId" style={labelStyle}>
                  Product <span style={{ color: "#ffb4ab" }}>*</span>
                </label>
                <select
                  id="productId"
                  name="productId"
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  style={{
                    ...inputStyle,
                    color: selectedProductId ? "#dbe2fd" : "#4a5068",
                  }}
                >
                  <option value="">— Select a product —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              {/* Hidden unitId */}
              <input
                type="hidden"
                name="unitId"
                value={selectedProduct?.defaultUnit.id ?? ""}
              />

              {/* Current balance preview */}
              {selectedProduct && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#0d1627",
                    border: "1px solid #222a3e",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "11px", color: "#8c90a2", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Current Stock
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#dbe2fd" }}>
                      {currentBalance != null
                        ? (currentBalance % 1 === 0 ? currentBalance.toString() : currentBalance.toFixed(4))
                        : "0"}
                      {" "}
                      <span style={{ fontSize: "13px", fontWeight: 400, color: "#8c90a2" }}>
                        {selectedProduct.defaultUnit.symbol}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "#8c90a2", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Low Stock At
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#fbbf24" }}>
                      {selectedProduct.lowStockThreshold} {selectedProduct.defaultUnit.symbol}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Adjustment */}
          <div style={sectionStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
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
                2
              </div>
              <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#dbe2fd", margin: 0 }}>
                Adjustment Details
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Adjustment type toggle */}
              <div>
                <label style={labelStyle}>
                  Adjustment Type <span style={{ color: "#ffb4ab" }}>*</span>
                </label>
                <input type="hidden" name="adjustmentType" value={adjustmentType} />
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["ADD", "REMOVE"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAdjustmentType(t)}
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        borderRadius: "8px",
                        border: "1px solid",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 600,
                        transition: "all 0.15s",
                        ...(adjustmentType === t
                          ? t === "ADD"
                            ? {
                                background: "rgba(0,108,73,0.2)",
                                borderColor: "rgba(98,223,125,0.4)",
                                color: "#62df7d",
                              }
                            : {
                                background: "rgba(127,29,29,0.2)",
                                borderColor: "rgba(248,113,113,0.4)",
                                color: "#f87171",
                              }
                          : {
                              background: "#0d1627",
                              borderColor: "#2d3449",
                              color: "#8c90a2",
                            }),
                      }}
                    >
                      {t === "ADD" ? "+ Add Stock" : "− Remove Stock"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="quantity" style={labelStyle}>
                  Quantity{" "}
                  {selectedProduct && (
                    <span style={{ color: "#4a5068", fontWeight: 400 }}>
                      (in {selectedProduct.defaultUnit.name}, {selectedProduct.defaultUnit.symbol})
                    </span>
                  )}{" "}
                  <span style={{ color: "#ffb4ab" }}>*</span>
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0.000001"
                  step="any"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  style={inputStyle}
                />
              </div>

              {/* New balance preview */}
              {selectedProduct && parsedQty > 0 && newBalance != null && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "rgba(0,98,255,0.05)",
                    border: "1px solid rgba(0,98,255,0.2)",
                    borderRadius: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "13px", color: "#8c90a2" }}>New Balance After Adjustment</span>
                  <span
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: newBalance < 0 ? "#f87171" : newBalance <= selectedProduct.lowStockThreshold ? "#fbbf24" : "#62df7d",
                    }}
                  >
                    {newBalance < 0
                      ? newBalance.toFixed(4)
                      : newBalance % 1 === 0
                      ? newBalance.toString()
                      : newBalance.toFixed(4)}{" "}
                    <span style={{ fontSize: "13px", fontWeight: 400, color: "#8c90a2" }}>
                      {selectedProduct.defaultUnit.symbol}
                    </span>
                  </span>
                </div>
              )}

              {newBalance != null && newBalance < 0 && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "rgba(147,0,10,0.12)",
                    border: "1px solid rgba(147,0,10,0.3)",
                    borderRadius: "8px",
                    fontSize: "13px",
                    color: "#ffb4ab",
                  }}
                >
                  Warning: This adjustment would result in a negative stock balance. It will be rejected.
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Justification */}
          <div style={sectionStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
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
                3
              </div>
              <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#dbe2fd", margin: 0 }}>
                Justification
              </h2>
            </div>

            <div>
              <label htmlFor="notes" style={labelStyle}>
                Reason / Notes <span style={{ color: "#ffb4ab" }}>*</span>
              </label>
              <textarea
                id="notes"
                name="notes"
                required
                maxLength={500}
                rows={4}
                placeholder="Explain why this stock adjustment is being made (e.g. damaged goods, physical count correction, supplier return)..."
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  minHeight: "100px",
                  fontFamily: "inherit",
                  lineHeight: "1.5",
                }}
              />
              <div style={{ fontSize: "11px", color: "#4a5068", marginTop: "4px", textAlign: "right" }}>
                Required — max 500 characters
              </div>
            </div>
          </div>

          {/* Error */}
          {state && "error" in state && (
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(147,0,10,0.15)",
                border: "1px solid rgba(147,0,10,0.3)",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#ffb4ab",
              }}
            >
              {state.error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="submit"
              disabled={pending || !selectedProductId}
              style={{
                padding: "10px 24px",
                background: "#0062ff",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: pending || !selectedProductId ? "not-allowed" : "pointer",
                opacity: pending || !selectedProductId ? 0.6 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {pending ? "Saving…" : "Save Adjustment"}
            </button>
            <a
              href="/dashboard/inventory/movements"
              style={{
                padding: "10px 20px",
                border: "1px solid #2d3449",
                borderRadius: "8px",
                color: "#8c90a2",
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
