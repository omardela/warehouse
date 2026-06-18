"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRealtime } from "@/hooks/use-realtime";
import { updateReorderSettingsAction, type UpdateReorderSettingsState } from "./actions";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StockRow {
  id: string;
  name: string;
  sku: string;
  archivedAt: Date | null;
  lowStockThreshold: number | null;
  qty: number;
  onOrder: number;
  status: "out" | "low" | "healthy";
  defaultUnit: { id: string; name: string; symbol: string };
  category: { id: string; name: string } | null;
  reorderPoint: number | null;
  reorderQty: number | null;
}

interface Props {
  initialRows: StockRow[];
  warehouseId: string;
  canManageReorderSettings: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatQty(n: number): string {
  return n % 1 === 0 ? n.toString() : n.toFixed(4);
}

function deriveStatus(
  qty: number,
  lowStockThreshold: number | null
): "out" | "low" | "healthy" {
  if (qty <= 0) return "out";
  if (lowStockThreshold != null && qty <= lowStockThreshold) return "low";
  return "healthy";
}

// ── Reorder Settings inline editor ──────────────────────────────────────────

interface ReorderSettingsFormProps {
  productId: string;
  warehouseId: string;
  reorderPoint: number | null;
  reorderQty: number | null;
  unitSymbol: string;
  onDone: (updated: { reorderPoint: number | null; reorderQty: number | null } | null) => void;
}

function ReorderSettingsForm({
  productId,
  warehouseId,
  reorderPoint,
  reorderQty,
  unitSymbol,
  onDone,
}: ReorderSettingsFormProps) {
  const [state, formAction, isPending] = useActionState<UpdateReorderSettingsState, FormData>(
    updateReorderSettingsAction,
    null
  );
  const [pointInput, setPointInput] = useState(reorderPoint != null ? String(reorderPoint) : "");
  const [qtyInput, setQtyInput] = useState(reorderQty != null ? String(reorderQty) : "");

  useEffect(() => {
    if (state && "success" in state && state.success) {
      onDone({
        reorderPoint: pointInput.trim() === "" ? null : Number(pointInput),
        reorderQty: qtyInput.trim() === "" ? null : Number(qtyInput),
      });
    }
    // Only react to state changes — input values are read at the time state resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "200px" }}
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="warehouseId" value={warehouseId} />
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <label style={{ fontSize: "11px", color: "#8c90a2", width: "70px" }}>Point</label>
        <input
          name="reorderPoint"
          type="number"
          min={0}
          step={1}
          value={pointInput}
          onChange={(e) => setPointInput(e.target.value)}
          placeholder="—"
          style={{
            width: "70px",
            padding: "4px 6px",
            background: "#0d1627",
            border: "1px solid #2d3449",
            borderRadius: "6px",
            color: "#dbe2fd",
            fontSize: "12px",
            outline: "none",
          }}
        />
        <span style={{ fontSize: "11px", color: "#4a5068" }}>{unitSymbol}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <label style={{ fontSize: "11px", color: "#8c90a2", width: "70px" }}>Reorder Qty</label>
        <input
          name="reorderQty"
          type="number"
          min={0}
          step={1}
          value={qtyInput}
          onChange={(e) => setQtyInput(e.target.value)}
          placeholder="—"
          style={{
            width: "70px",
            padding: "4px 6px",
            background: "#0d1627",
            border: "1px solid #2d3449",
            borderRadius: "6px",
            color: "#dbe2fd",
            fontSize: "12px",
            outline: "none",
          }}
        />
        <span style={{ fontSize: "11px", color: "#4a5068" }}>{unitSymbol}</span>
      </div>
      {state && "error" in state && state.error && (
        <div style={{ fontSize: "11px", color: "#f87171" }}>{state.error}</div>
      )}
      <div style={{ display: "flex", gap: "6px" }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: "4px 10px",
            fontSize: "11px",
            color: "#fff",
            background: "#0062ff",
            border: "none",
            borderRadius: "6px",
            cursor: isPending ? "default" : "pointer",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => onDone(null)}
          disabled={isPending}
          style={{
            padding: "4px 10px",
            fontSize: "11px",
            color: "#8c90a2",
            background: "transparent",
            border: "1px solid #2d3449",
            borderRadius: "6px",
            cursor: isPending ? "default" : "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StockRealtimeWrapper({ initialRows, warehouseId, canManageReorderSettings }: Props) {
  const [rows, setRows] = useState<StockRow[]>(initialRows);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const { lastEvent } = useRealtime();

  // Apply realtime stock updates
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type !== "stock.updated") return;
    const { payload } = lastEvent;
    if (payload.warehouseId !== warehouseId) return;

    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== payload.productId) return row;
        const newQty = payload.newBalance;
        const newStatus = deriveStatus(newQty, row.lowStockThreshold);
        return { ...row, qty: newQty, status: newStatus };
      })
    );
  }, [lastEvent, warehouseId]);

  return (
    <div
      style={{
        background: "#171f33",
        border: "1px solid #222a3e",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid #222a3e",
                background: "#0d1627",
              }}
            >
              {[
                "Product",
                "SKU",
                "Category",
                "Current Qty",
                "On Order",
                "Low Stock Threshold",
                "Reorder Settings",
                "Status",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "#8c90a2",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: "56px 24px",
                    textAlign: "center",
                    color: "#8c90a2",
                    fontSize: "14px",
                  }}
                >
                  No products found for this warehouse.
                </td>
              </tr>
            ) : (
              rows.map((product, idx) => {
                const isArchived = !!product.archivedAt;

                const statusBadge =
                  product.status === "out"
                    ? {
                        label: "Out of Stock",
                        color: "#f87171",
                        bg: "rgba(127,29,29,0.15)",
                      }
                    : product.status === "low"
                    ? {
                        label: "Low Stock",
                        color: "#fbbf24",
                        bg: "rgba(120,90,0,0.15)",
                      }
                    : {
                        label: "Healthy",
                        color: "#62df7d",
                        bg: "rgba(0,108,73,0.15)",
                      };

                return (
                  <tr
                    key={product.id}
                    style={{
                      borderBottom:
                        idx < rows.length - 1
                          ? "1px solid #1a2237"
                          : "none",
                      background: isArchived
                        ? "rgba(140,144,162,0.03)"
                        : "transparent",
                    }}
                  >
                    {/* Product */}
                    <td style={{ padding: "12px 16px" }}>
                      <div
                        style={{
                          fontWeight: 500,
                          color: isArchived ? "#4a5068" : "#dbe2fd",
                          textDecoration: isArchived ? "line-through" : "none",
                        }}
                      >
                        {product.name}
                      </div>
                      {isArchived && (
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#4a5068",
                            marginTop: "2px",
                          }}
                        >
                          ARCHIVED
                        </div>
                      )}
                    </td>

                    {/* SKU */}
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: "12px",
                          color: isArchived ? "#4a5068" : "#8c90a2",
                          background: "#0d1627",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          border: "1px solid #222a3e",
                        }}
                      >
                        {product.sku}
                      </span>
                    </td>

                    {/* Category */}
                    <td style={{ padding: "12px 16px" }}>
                      {product.category ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            background: "rgba(0,98,255,0.1)",
                            color: isArchived ? "#4a5068" : "#6b9fff",
                            fontSize: "11px",
                            fontWeight: 500,
                          }}
                        >
                          {product.category.name}
                        </span>
                      ) : (
                        <span style={{ color: "#4a5068", fontSize: "12px" }}>
                          —
                        </span>
                      )}
                    </td>

                    {/* Current Qty */}
                    <td style={{ padding: "12px 16px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "15px",
                            color: isArchived
                              ? "#4a5068"
                              : product.status === "out"
                              ? "#f87171"
                              : product.status === "low"
                              ? "#fbbf24"
                              : "#62df7d",
                            transition: "color 0.3s ease",
                          }}
                        >
                          {formatQty(product.qty)}
                        </span>
                        <span style={{ fontSize: "11px", color: "#4a5068" }}>
                          {product.defaultUnit.symbol}
                        </span>
                      </div>
                    </td>

                    {/* On Order */}
                    <td style={{ padding: "12px 16px" }}>
                      {product.onOrder > 0 ? (
                        <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                          <span style={{ fontWeight: 600, fontSize: "13px", color: "#a78bfa" }}>
                            {formatQty(product.onOrder)}
                          </span>
                          <span style={{ fontSize: "11px", color: "#4a5068" }}>
                            {product.defaultUnit.symbol}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "#4a5068", fontSize: "12px" }}>—</span>
                      )}
                    </td>

                    {/* Low Stock Threshold */}
                    <td style={{ padding: "12px 16px" }}>
                      {product.lowStockThreshold != null ? (
                        <span style={{ color: "#8c90a2", fontSize: "13px" }}>
                          {product.lowStockThreshold}{" "}
                          <span style={{ color: "#4a5068", fontSize: "11px" }}>
                            {product.defaultUnit.symbol}
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: "#4a5068", fontSize: "12px", fontStyle: "italic" }}>
                          No threshold
                        </span>
                      )}
                    </td>

                    {/* Reorder Settings */}
                    <td style={{ padding: "12px 16px" }}>
                      {editingProductId === product.id ? (
                        <ReorderSettingsForm
                          productId={product.id}
                          warehouseId={warehouseId}
                          reorderPoint={product.reorderPoint}
                          reorderQty={product.reorderQty}
                          unitSymbol={product.defaultUnit.symbol}
                          onDone={(updated) => {
                            setEditingProductId(null);
                            if (updated) {
                              setRows((prev) =>
                                prev.map((row) =>
                                  row.id === product.id
                                    ? {
                                        ...row,
                                        reorderPoint: updated.reorderPoint,
                                        reorderQty: updated.reorderQty,
                                      }
                                    : row
                                )
                              );
                            }
                          }}
                        />
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {product.reorderPoint != null || product.reorderQty != null ? (
                            <span style={{ color: "#8c90a2", fontSize: "12px" }}>
                              Point: {product.reorderPoint ?? "—"} / Qty: {product.reorderQty ?? "—"}
                            </span>
                          ) : (
                            <span style={{ color: "#4a5068", fontSize: "12px", fontStyle: "italic" }}>
                              Not set
                            </span>
                          )}
                          {canManageReorderSettings && (
                            <button
                              type="button"
                              onClick={() => setEditingProductId(product.id)}
                              style={{
                                padding: "2px 8px",
                                fontSize: "11px",
                                color: "#6699ff",
                                background: "transparent",
                                border: "1px solid #2d3449",
                                borderRadius: "6px",
                                cursor: "pointer",
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "3px 8px",
                          borderRadius: "10px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: isArchived
                            ? "rgba(140,144,162,0.1)"
                            : statusBadge.bg,
                          color: isArchived ? "#8c90a2" : statusBadge.color,
                          transition: "background 0.3s ease, color 0.3s ease",
                        }}
                      >
                        {isArchived
                          ? "ARCHIVED"
                          : statusBadge.label.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <div
        style={{
          padding: "10px 16px",
          borderTop: "1px solid #222a3e",
          background: "#0d1627",
          fontSize: "12px",
          color: "#4a5068",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>
          {rows.length} product{rows.length !== 1 ? "s" : ""} shown
        </span>
        <Link
          href="/dashboard/inventory/movements"
          style={{ color: "#6699ff", textDecoration: "none", fontSize: "12px" }}
        >
          View movement history →
        </Link>
      </div>
    </div>
  );
}
