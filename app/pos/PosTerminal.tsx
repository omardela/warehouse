"use client";

import { useState, useEffect, useRef, useActionState, startTransition } from "react";
import { completeSaleAction, type PosActionState } from "./actions";
import type { ProductForPos, UnitForPos } from "./page";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CartItem = {
  productId: string;
  productName: string;
  sku: string;
  unitId: string;
  unitSymbol: string;
  toBaseConversionFactor: number; // base units per 1 of the selected unit
  quantity: number;
  unitPrice: number;
  baseStockQty: number; // total available stock in base units
  availableUnits: UnitForPos[];
};

type SuccessPayload = {
  invoiceId: string;
  total: number;
  itemCount: number;
  lines: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(val: number): string {
  return val.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StockBadge({
  qty,
  threshold,
}: {
  qty: number;
  threshold: number | null;
}) {
  if (qty <= 0) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "2px 7px",
          borderRadius: "8px",
          background: "rgba(255,77,79,0.15)",
          color: "#ff4d4f",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.03em",
        }}
      >
        OUT
      </span>
    );
  }

  const isLow = threshold != null && qty <= threshold;

  if (isLow) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "2px 7px",
          borderRadius: "8px",
          background: "rgba(250,173,20,0.15)",
          color: "#faad14",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.03em",
        }}
      >
        LOW: {qty}
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 7px",
        borderRadius: "8px",
        background: "rgba(98,223,125,0.12)",
        color: "#62df7d",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.03em",
      }}
    >
      IN STOCK: {qty}
    </span>
  );
}

// ---------------------------------------------------------------------------
// PosTerminal
// ---------------------------------------------------------------------------

export default function PosTerminal({ products }: { products: ProductForPos[] }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [successData, setSuccessData] = useState<SuccessPayload | null>(null);
  const [priceErrors, setPriceErrors] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  const [actionState, formAction, isPending] = useActionState<
    PosActionState,
    FormData
  >(completeSaleAction, null);

  // Handle action state changes
  useEffect(() => {
    if (actionState && "success" in actionState && actionState.success) {
      setSuccessData({
        invoiceId: actionState.invoiceId,
        total: actionState.total,
        itemCount: actionState.itemCount,
        lines: actionState.lines,
      });
      setCart([]);
    }
  }, [actionState]);

  // F2 shortcut to focus search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Filtered product list
  const lowerSearch = search.toLowerCase();
  const filteredProducts = search
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerSearch) ||
          p.sku.toLowerCase().includes(lowerSearch) ||
          (p.barcode && p.barcode.toLowerCase().includes(lowerSearch))
      )
    : products;

  // Cart operations
  function addToCart(product: ProductForPos) {
    if (product.currentQuantity <= 0) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        const maxQty = Math.floor(existing.baseStockQty / existing.toBaseConversionFactor);
        return prev.map((c) =>
          c.productId === product.id
            ? { ...c, quantity: Math.min(c.quantity + 1, Math.max(1, maxQty)) }
            : c
        );
      }
      const defaultUnit = product.availableUnits.find((u) => u.id === product.defaultUnitId) ?? {
        id: product.defaultUnitId,
        name: "",
        symbol: product.defaultUnitSymbol,
        toBaseConversionFactor: 1,
      };
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          unitId: defaultUnit.id,
          unitSymbol: defaultUnit.symbol,
          toBaseConversionFactor: 1,
          quantity: 1,
          unitPrice: 0,
          baseStockQty: product.currentQuantity,
          availableUnits: product.availableUnits,
        },
      ];
    });
  }

  function updateCartQty(productId: string, qty: number) {
    setCart((prev) =>
      prev.map((c) => {
        if (c.productId !== productId) return c;
        const maxQty = Math.max(1, Math.floor(c.baseStockQty / c.toBaseConversionFactor));
        const safeQty = Math.max(1, Math.min(qty || 1, maxQty));
        return { ...c, quantity: safeQty };
      })
    );
  }

  function updateCartUnit(productId: string, unitId: string) {
    setCart((prev) =>
      prev.map((c) => {
        if (c.productId !== productId) return c;
        const unit = c.availableUnits.find((u) => u.id === unitId);
        if (!unit) return c;
        const maxQty = Math.max(1, Math.floor(c.baseStockQty / unit.toBaseConversionFactor));
        return {
          ...c,
          unitId: unit.id,
          unitSymbol: unit.symbol,
          toBaseConversionFactor: unit.toBaseConversionFactor,
          quantity: Math.min(c.quantity, maxQty),
        };
      })
    );
  }

  function updateCartPrice(productId: string, price: number) {
    setCart((prev) =>
      prev.map((c) =>
        c.productId === productId
          ? { ...c, unitPrice: isNaN(price) ? 0 : price }
          : c
      )
    );
    // Remove price error when user edits
    setPriceErrors((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
    setPriceErrors((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  }

  function clearCart() {
    setCart([]);
    setPriceErrors(new Set());
  }

  const subtotal = cart.reduce((s, c) => s + c.quantity * c.unitPrice, 0);
  const itemCount = cart.reduce((s, c) => s + c.quantity, 0);

  // Build form data and submit
  function handleCompleteSale() {
    // Validate all unit prices > 0
    const zeroPrice = cart.filter((c) => c.unitPrice <= 0);
    if (zeroPrice.length > 0) {
      setPriceErrors(new Set(zeroPrice.map((c) => c.productId)));
      return;
    }
    setPriceErrors(new Set());

    // Submit via hidden form
    const fd = new FormData();
    fd.set(
      "cart",
      JSON.stringify(
        cart.map((c) => ({
          productId: c.productId,
          unitId: c.unitId,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
        }))
      )
    );
    startTransition(() => formAction(fd));
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        background: "#0b1326",
        overflow: "hidden",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Left Panel — Product Search + Grid */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          flex: "0 0 65%",
          width: "65%",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #222a3e",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            background: "#171f33",
            borderBottom: "1px solid #222a3e",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(0,98,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect
                  x="1"
                  y="1"
                  width="6"
                  height="6"
                  rx="1.5"
                  stroke="#0062ff"
                  strokeWidth="1.5"
                />
                <rect
                  x="9"
                  y="1"
                  width="6"
                  height="6"
                  rx="1.5"
                  stroke="#0062ff"
                  strokeWidth="1.5"
                />
                <rect
                  x="1"
                  y="9"
                  width="6"
                  height="6"
                  rx="1.5"
                  stroke="#0062ff"
                  strokeWidth="1.5"
                />
                <rect
                  x="9"
                  y="9"
                  width="6"
                  height="6"
                  rx="1.5"
                  stroke="#0062ff"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <span
              style={{ fontSize: "15px", fontWeight: 700, color: "#dbe2fd" }}
            >
              POS Terminal
            </span>
          </div>
          <a
            href="/dashboard"
            style={{
              fontSize: "12px",
              color: "#8c90a2",
              textDecoration: "none",
              padding: "5px 10px",
              borderRadius: "6px",
              border: "1px solid #222a3e",
              background: "#0d1627",
            }}
          >
            Dashboard
          </a>
        </div>

        {/* Search Bar */}
        <div style={{ padding: "16px 20px 12px", background: "#0b1326" }}>
          <div style={{ position: "relative" }}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#4a5068",
                pointerEvents: "none",
              }}
            >
              <circle
                cx="6.5"
                cy="6.5"
                r="4.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M10 10L13.5 13.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU, or barcode… (F2)"
              style={{
                width: "100%",
                padding: "11px 14px 11px 40px",
                background: "#171f33",
                border: "1.5px solid #222a3e",
                borderRadius: "10px",
                color: "#dbe2fd",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "#0062ff")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "#222a3e")
              }
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#4a5068",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "2px",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2 2L12 12M12 2L2 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
          <div
            style={{
              marginTop: "8px",
              fontSize: "11px",
              color: "#4a5068",
            }}
          >
            {filteredProducts.length} product
            {filteredProducts.length !== 1 ? "s" : ""} found
            {search ? ` for "${search}"` : ""}
          </div>
        </div>

        {/* Product Grid */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 20px 20px",
            scrollbarWidth: "thin",
            scrollbarColor: "#222a3e transparent",
          }}
        >
          {filteredProducts.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "200px",
                color: "#4a5068",
                fontSize: "14px",
                gap: "8px",
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                style={{ opacity: 0.4 }}
              >
                <circle
                  cx="14"
                  cy="14"
                  r="9"
                  stroke="#8c90a2"
                  strokeWidth="2"
                />
                <path
                  d="M21 21L28 28"
                  stroke="#8c90a2"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span>No products found</span>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
              }}
            >
              {filteredProducts.map((product) => {
                const outOfStock = product.currentQuantity <= 0;
                const inCart = cart.find((c) => c.productId === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={outOfStock}
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "6px",
                      padding: "14px",
                      background: outOfStock
                        ? "#111827"
                        : inCart
                        ? "#0d1e3d"
                        : "#171f33",
                      border: `1.5px solid ${
                        inCart ? "#0062ff" : "#222a3e"
                      }`,
                      borderRadius: "10px",
                      cursor: outOfStock ? "not-allowed" : "pointer",
                      textAlign: "left",
                      opacity: outOfStock ? 0.55 : 1,
                      transition: "border-color 0.15s, background 0.15s",
                      width: "100%",
                    }}
                    onMouseEnter={(e) => {
                      if (!outOfStock)
                        e.currentTarget.style.borderColor = "#0062ff";
                    }}
                    onMouseLeave={(e) => {
                      if (!outOfStock)
                        e.currentTarget.style.borderColor = inCart
                          ? "#0062ff"
                          : "#222a3e";
                    }}
                  >
                    {/* Stock badge */}
                    <div
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                      }}
                    >
                      <StockBadge
                        qty={product.currentQuantity}
                        threshold={product.lowStockThreshold}
                      />
                    </div>

                    {/* Product name */}
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#dbe2fd",
                        lineHeight: "1.3",
                        paddingRight: "64px",
                        marginTop: "2px",
                      }}
                    >
                      {product.name}
                    </div>

                    {/* SKU */}
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#4a5068",
                        fontFamily: "monospace",
                      }}
                    >
                      {product.sku}
                    </div>

                    {/* Unit */}
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#8c90a2",
                      }}
                    >
                      Unit: {product.defaultUnitSymbol}
                    </div>

                    {/* Add to cart indicator */}
                    {inCart && (
                      <div
                        style={{
                          marginTop: "4px",
                          fontSize: "11px",
                          color: "#0062ff",
                          fontWeight: 600,
                        }}
                      >
                        In cart: {inCart.quantity}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Right Panel — Cart + Checkout */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          flex: "0 0 35%",
          width: "35%",
          display: "flex",
          flexDirection: "column",
          background: "#0f1729",
          overflow: "hidden",
        }}
      >
        {/* Cart Header */}
        <div
          style={{
            padding: "16px 20px",
            background: "#171f33",
            borderBottom: "1px solid #222a3e",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{ fontSize: "15px", fontWeight: 700, color: "#dbe2fd" }}
            >
              Current Sale
            </span>
            {cart.length > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "20px",
                  height: "20px",
                  padding: "0 6px",
                  borderRadius: "10px",
                  background: "#0062ff",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                {itemCount}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              disabled={isPending}
              style={{
                background: "none",
                border: "none",
                color: "#8c90a2",
                fontSize: "12px",
                cursor: isPending ? "not-allowed" : "pointer",
                padding: "4px 8px",
                borderRadius: "5px",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Error Banner */}
        {actionState && "error" in actionState && actionState.error && (
          <div
            style={{
              margin: "12px 16px 0",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(255,77,79,0.1)",
              border: "1px solid rgba(255,77,79,0.3)",
              color: "#ff4d4f",
              fontSize: "13px",
              lineHeight: "1.4",
            }}
          >
            {actionState.error}
          </div>
        )}

        {/* Price validation errors */}
        {priceErrors.size > 0 && (
          <div
            style={{
              margin: "12px 16px 0",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(255,77,79,0.1)",
              border: "1px solid rgba(255,77,79,0.3)",
              color: "#ff4d4f",
              fontSize: "13px",
              lineHeight: "1.4",
            }}
          >
            Please set a price greater than $0 for all items before completing
            the sale.
          </div>
        )}

        {/* Cart Items */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 16px",
            scrollbarWidth: "thin",
            scrollbarColor: "#222a3e transparent",
          }}
        >
          {cart.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "200px",
                color: "#4a5068",
                fontSize: "13px",
                gap: "10px",
              }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                style={{ opacity: 0.35 }}
              >
                <path
                  d="M5 8h30l-3.5 18H8.5L5 8Z"
                  stroke="#8c90a2"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <circle cx="14" cy="34" r="2" fill="#8c90a2" />
                <circle cx="27" cy="34" r="2" fill="#8c90a2" />
                <path
                  d="M5 8L3 4H1"
                  stroke="#8c90a2"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span>Cart is empty</span>
              <span style={{ fontSize: "11px", color: "#2d3449" }}>
                Click a product to add it
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {cart.map((item) => {
                const lineTotal = item.quantity * item.unitPrice;
                const hasError = priceErrors.has(item.productId);
                return (
                  <div
                    key={item.productId}
                    style={{
                      background: "#171f33",
                      border: `1px solid ${hasError ? "rgba(255,77,79,0.4)" : "#222a3e"}`,
                      borderRadius: "8px",
                      padding: "12px",
                    }}
                  >
                    {/* Product info row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        marginBottom: "10px",
                        gap: "8px",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#dbe2fd",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.productName}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#4a5068",
                            fontFamily: "monospace",
                            marginTop: "1px",
                          }}
                        >
                          {item.sku}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        disabled={isPending}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#4a5068",
                          cursor: isPending ? "not-allowed" : "pointer",
                          padding: "2px",
                          display: "flex",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                        title="Remove item"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <path
                            d="M2 2L12 12M12 2L2 12"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Inputs row */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "8px",
                      }}
                    >
                      {/* Quantity input */}
                      <div>
                        <label
                          style={{
                            fontSize: "10px",
                            color: "#4a5068",
                            fontWeight: 600,
                            display: "block",
                            marginBottom: "4px",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          Qty
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={Math.floor(item.baseStockQty / item.toBaseConversionFactor)}
                          value={item.quantity}
                          onChange={(e) =>
                            updateCartQty(
                              item.productId,
                              parseInt(e.target.value, 10)
                            )
                          }
                          disabled={isPending}
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            background: "#0d1627",
                            border: "1px solid #2d3449",
                            borderRadius: "6px",
                            color: "#dbe2fd",
                            fontSize: "13px",
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      {/* Unit selector + Unit Price */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {/* Unit selector */}
                        <div>
                          <label
                            style={{
                              fontSize: "10px",
                              color: "#4a5068",
                              fontWeight: 600,
                              display: "block",
                              marginBottom: "4px",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Unit
                          </label>
                          <select
                            value={item.unitId}
                            onChange={(e) => updateCartUnit(item.productId, e.target.value)}
                            disabled={isPending || item.availableUnits.length <= 1}
                            style={{
                              width: "100%",
                              padding: "7px 10px",
                              background: "#0d1627",
                              border: "1px solid #2d3449",
                              borderRadius: "6px",
                              color: "#dbe2fd",
                              fontSize: "13px",
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          >
                            {item.availableUnits.map((u) => (
                              <option key={u.id} value={u.id}>{u.symbol}</option>
                            ))}
                          </select>
                        </div>

                        {/* Unit Price */}
                        <div>
                          <label
                            style={{
                              fontSize: "10px",
                              color: hasError ? "#ff4d4f" : "#4a5068",
                              fontWeight: 600,
                              display: "block",
                              marginBottom: "4px",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Price ($){hasError && " — Required"}
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.unitPrice === 0 ? "" : item.unitPrice}
                            placeholder="0.00"
                            onChange={(e) =>
                              updateCartPrice(
                                item.productId,
                                parseFloat(e.target.value)
                              )
                            }
                            disabled={isPending}
                            style={{
                              width: "100%",
                              padding: "7px 10px",
                              background: "#0d1627",
                              border: `1px solid ${hasError ? "rgba(255,77,79,0.5)" : "#2d3449"}`,
                              borderRadius: "6px",
                              color: hasError ? "#ff4d4f" : "#dbe2fd",
                              fontSize: "13px",
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Line total */}
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        justifyContent: "flex-end",
                        fontSize: "13px",
                        color: "#8c90a2",
                      }}
                    >
                      Total:{" "}
                      <span
                        style={{
                          fontWeight: 700,
                          color: "#dbe2fd",
                          marginLeft: "6px",
                        }}
                      >
                        {formatCurrency(lineTotal)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Order Summary + Checkout */}
        <div
          style={{
            padding: "16px 16px 20px",
            background: "#171f33",
            borderTop: "1px solid #222a3e",
          }}
        >
          {/* Subtotal */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "6px",
            }}
          >
            <span style={{ fontSize: "13px", color: "#8c90a2" }}>
              Subtotal ({itemCount} item{itemCount !== 1 ? "s" : ""})
            </span>
            <span style={{ fontSize: "13px", color: "#8c90a2" }}>
              {formatCurrency(subtotal)}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              paddingTop: "10px",
              borderTop: "1px solid #222a3e",
            }}
          >
            <span
              style={{ fontSize: "18px", fontWeight: 700, color: "#dbe2fd" }}
            >
              Total
            </span>
            <span
              style={{ fontSize: "20px", fontWeight: 700, color: "#dbe2fd" }}
            >
              {formatCurrency(subtotal)}
            </span>
          </div>

          {/* Complete Sale button */}
          <button
            onClick={handleCompleteSale}
            disabled={isPending || cart.length === 0}
            style={{
              width: "100%",
              padding: "14px",
              background:
                cart.length === 0
                  ? "#1a2237"
                  : isPending
                  ? "#004acc"
                  : "#0062ff",
              border: "none",
              borderRadius: "10px",
              color: cart.length === 0 ? "#4a5068" : "#fff",
              fontSize: "15px",
              fontWeight: 700,
              cursor:
                isPending || cart.length === 0 ? "not-allowed" : "pointer",
              transition: "background 0.15s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            {isPending ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{ animation: "spin 1s linear infinite" }}
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="2"
                  />
                  <path
                    d="M8 2a6 6 0 0 1 6 6"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Processing…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 8l4 4 8-8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Complete Sale
              </>
            )}
          </button>

          {/* Clear Cart */}
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              disabled={isPending}
              style={{
                width: "100%",
                padding: "10px",
                background: "none",
                border: "1px solid #222a3e",
                borderRadius: "10px",
                color: "#8c90a2",
                fontSize: "13px",
                fontWeight: 500,
                cursor: isPending ? "not-allowed" : "pointer",
              }}
            >
              Clear Cart
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Success Receipt Modal */}
      {/* ------------------------------------------------------------------ */}
      {successData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11,19,38,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#171f33",
              border: "1px solid #222a3e",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "480px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            }}
          >
            {/* Success icon */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: "24px",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(98,223,125,0.15)",
                  border: "2px solid rgba(98,223,125,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 12l6 6L20 6"
                    stroke="#62df7d"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#dbe2fd",
                }}
              >
                Sale Complete!
              </h2>
            </div>

            {/* Invoice details */}
            <div
              style={{
                background: "#0d1627",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span style={{ fontSize: "13px", color: "#8c90a2" }}>
                  Invoice Ref
                </span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "12px",
                    color: "#dbe2fd",
                    background: "#1a2237",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    border: "1px solid #222a3e",
                  }}
                >
                  …{successData.invoiceId.slice(-8)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span style={{ fontSize: "13px", color: "#8c90a2" }}>
                  Items Sold
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "#dbe2fd",
                    fontWeight: 600,
                  }}
                >
                  {successData.itemCount}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: "10px",
                  borderTop: "1px solid #222a3e",
                }}
              >
                <span
                  style={{
                    fontSize: "15px",
                    color: "#dbe2fd",
                    fontWeight: 700,
                  }}
                >
                  Total Collected
                </span>
                <span
                  style={{
                    fontSize: "18px",
                    color: "#62df7d",
                    fontWeight: 700,
                  }}
                >
                  {formatCurrency(successData.total)}
                </span>
              </div>
            </div>

            {/* Line items summary */}
            <div
              style={{
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#4a5068",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "8px",
                }}
              >
                Items
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                {successData.lines.map((line) => (
                  <div
                    key={line.productId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      background: "#0d1627",
                      borderRadius: "6px",
                      fontSize: "13px",
                    }}
                  >
                    <div>
                      <span style={{ color: "#dbe2fd", fontWeight: 500 }}>
                        {line.productName}
                      </span>
                      <span style={{ color: "#4a5068", marginLeft: "8px" }}>
                        × {line.quantity}
                      </span>
                    </div>
                    <span style={{ color: "#dbe2fd" }}>
                      {formatCurrency(line.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  padding: "11px",
                  background: "#0d1627",
                  border: "1px solid #222a3e",
                  borderRadius: "8px",
                  color: "#8c90a2",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect
                    x="3"
                    y="1"
                    width="8"
                    height="5"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M1 6h12v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M4 9h6M4 11h4"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                Print Receipt
              </button>
              <button
                onClick={() => setSuccessData(null)}
                style={{
                  flex: 1,
                  padding: "11px",
                  background: "#0062ff",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 1.5V12.5M1.5 7H12.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spin animation */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
