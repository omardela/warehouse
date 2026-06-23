import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { MovementType } from "@prisma/client";
import { getLocale } from "@/core/i18n/locale";
import { getDictionary, type Dictionary } from "@/core/i18n/get-dictionary";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    type?: string;
    q?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 25;

function movementTypeLabel(type: MovementType, t: Dictionary): string {
  return t.inventory.movementTypes[type] ?? type;
}

function movementTypeBadgeStyle(type: MovementType): { background: string; color: string } {
  switch (type) {
    case "PURCHASE_IN":
      return { background: "rgba(0,108,73,0.15)", color: "#62df7d" };
    case "SALE_OUT":
      return { background: "rgba(127,29,29,0.15)", color: "#f87171" };
    case "TRANSFER_IN":
    case "TRANSFER_OUT":
      return { background: "rgba(0,98,255,0.12)", color: "#6699ff" };
    case "ADJUSTMENT":
      return { background: "rgba(120,90,0,0.15)", color: "#fbbf24" };
    case "RETURN_IN":
    case "RETURN_OUT":
      return { background: "rgba(91,33,182,0.12)", color: "#a78bfa" };
    default:
      return { background: "rgba(140,144,162,0.12)", color: "#8c90a2" };
  }
}

function isPositiveMovement(type: MovementType): boolean {
  return type === "PURCHASE_IN" || type === "TRANSFER_IN" || type === "RETURN_IN";
}

function isNegativeMovement(type: MovementType): boolean {
  return type === "SALE_OUT" || type === "TRANSFER_OUT" || type === "RETURN_OUT";
}

function formatQty(val: { toString(): string } | number | null | undefined): string {
  if (val == null) return "0";
  const n = typeof val === "number" ? val : Number(val.toString());
  return n % 1 === 0 ? Math.abs(n).toString() : Math.abs(n).toFixed(4);
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const ALL_MOVEMENT_TYPES: MovementType[] = [
  "PURCHASE_IN",
  "SALE_OUT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "ADJUSTMENT",
  "RETURN_IN",
  "RETURN_OUT",
];

export default async function MovementsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "inventory.balance.read");

  const locale = await getLocale();
  const t = getDictionary(locale);

  const params = await searchParams;
  const fromDate = params.from ?? "";
  const toDate = params.to ?? "";
  const typeFilter = (params.type ?? "") as MovementType | "";
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  // Build where clause
  const where: Parameters<typeof db.inventoryMovement.findMany>[0]["where"] = {
    warehouseId: session.warehouseId,
  };

  if (fromDate) {
    where.createdAt = { ...((where.createdAt as object) ?? {}), gte: new Date(fromDate) };
  }
  if (toDate) {
    // End of day for the "to" date
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { ...((where.createdAt as object) ?? {}), lte: end };
  }
  if (typeFilter && ALL_MOVEMENT_TYPES.includes(typeFilter)) {
    where.movementType = typeFilter;
  }
  if (q) {
    where.product = {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
      ],
    };
  }

  const [movements, total] = await Promise.all([
    db.inventoryMovement.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, sku: true, defaultUnit: { select: { symbol: true } } },
        },
        warehouse: { select: { id: true, name: true } },
        unit: { select: { symbol: true } },
        actor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.inventoryMovement.count({ where }),
  ]);

  // Fetch current balances for products in this page (for the Balance column)
  const productIds = [...new Set(movements.map((m) => m.productId))];
  const balances = productIds.length > 0
    ? await db.inventoryBalance.findMany({
        where: {
          warehouseId: session.warehouseId,
          productId: { in: productIds },
        },
        select: { productId: true, currentQuantity: true },
      })
    : [];

  const balanceMap = new Map(
    balances.map((b) => [b.productId, parseFloat(b.currentQuantity.toString())])
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildUrl(overrides: Record<string, string>) {
    const p = {
      from: fromDate,
      to: toDate,
      type: typeFilter,
      q,
      page: page.toString(),
      ...overrides,
    };
    const qs = new URLSearchParams(
      Object.entries(p).filter(([, v]) => v !== "")
    ).toString();
    return qs ? `?${qs}` : "?";
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "24px",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
              {t.inventory.movements.pageTitle}
            </h1>
            <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "4px" }}>
              {t.inventory.movements.pageSubtitle}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Link
              href="/dashboard/inventory/adjustments"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "8px",
                background: "#0062ff",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              {t.inventory.movements.addAdjustment}
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            background: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          <form method="GET" style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
            {/* Product search */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "1", minWidth: "180px" }}>
              <label style={{ fontSize: "11px", color: "#8c90a2", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t.inventory.movements.labelProduct}
              </label>
              <div style={{ position: "relative" }}>
                <svg
                  width="14" height="14" viewBox="0 0 14 14" fill="none"
                  style={{ position: "absolute", insetInlineStart: "10px", top: "50%", transform: "translateY(-50%)", color: "#4a5068", pointerEvents: "none" }}
                >
                  <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  name="q"
                  type="text"
                  defaultValue={q}
                  placeholder={t.inventory.movements.searchPlaceholder}
                  style={{
                    width: "100%",
                    paddingInlineStart: "32px",
                    paddingInlineEnd: "12px",
                    paddingTop: "8px",
                    paddingBottom: "8px",
                    background: "#0d1627",
                    border: "1px solid #2d3449",
                    borderRadius: "8px",
                    color: "#dbe2fd",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Movement type */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "160px" }}>
              <label style={{ fontSize: "11px", color: "#8c90a2", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t.inventory.movements.labelType}
              </label>
              <select
                name="type"
                defaultValue={typeFilter}
                style={{
                  padding: "8px 12px",
                  background: "#0d1627",
                  border: "1px solid #2d3449",
                  borderRadius: "8px",
                  color: typeFilter ? "#dbe2fd" : "#4a5068",
                  fontSize: "13px",
                  outline: "none",
                }}
              >
                <option value="">{t.inventory.movements.allTypes}</option>
                {ALL_MOVEMENT_TYPES.map((mt) => (
                  <option key={mt} value={mt}>{movementTypeLabel(mt, t)}</option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "150px" }}>
              <label style={{ fontSize: "11px", color: "#8c90a2", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t.inventory.movements.labelFromDate}
              </label>
              <input
                name="from"
                type="date"
                defaultValue={fromDate}
                style={{
                  padding: "8px 12px",
                  background: "#0d1627",
                  border: "1px solid #2d3449",
                  borderRadius: "8px",
                  color: fromDate ? "#dbe2fd" : "#4a5068",
                  fontSize: "13px",
                  outline: "none",
                  colorScheme: "dark",
                }}
              />
            </div>

            {/* Date to */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "150px" }}>
              <label style={{ fontSize: "11px", color: "#8c90a2", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t.inventory.movements.labelToDate}
              </label>
              <input
                name="to"
                type="date"
                defaultValue={toDate}
                style={{
                  padding: "8px 12px",
                  background: "#0d1627",
                  border: "1px solid #2d3449",
                  borderRadius: "8px",
                  color: toDate ? "#dbe2fd" : "#4a5068",
                  fontSize: "13px",
                  outline: "none",
                  colorScheme: "dark",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <button
                type="submit"
                style={{
                  padding: "8px 16px",
                  background: "#0062ff",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  height: "36px",
                }}
              >
                {t.inventory.movements.filter}
              </button>
              {(q || typeFilter || fromDate || toDate) && (
                <Link
                  href="/dashboard/inventory/movements"
                  style={{
                    padding: "8px 12px",
                    background: "transparent",
                    border: "1px solid #2d3449",
                    borderRadius: "8px",
                    color: "#8c90a2",
                    fontSize: "13px",
                    textDecoration: "none",
                    height: "36px",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {t.inventory.movements.clear}
                </Link>
              )}
            </div>
          </form>
        </div>

        {/* Table */}
        <div
          style={{
            background: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #222a3e", background: "#0d1627" }}>
                  {[
                    t.inventory.movements.columnDateTime,
                    t.inventory.movements.columnMovementNumber,
                    t.inventory.movements.columnProduct,
                    t.inventory.movements.columnWarehouse,
                    t.inventory.movements.columnType,
                    t.inventory.movements.columnQty,
                    t.inventory.movements.columnBalance,
                    t.inventory.movements.columnActor,
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
                {movements.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ padding: "56px 24px", textAlign: "center", color: "#8c90a2", fontSize: "14px" }}
                    >
                      {q || typeFilter || fromDate || toDate
                        ? t.inventory.movements.noMovementsFiltered
                        : t.inventory.movements.noMovementsEmpty}
                    </td>
                  </tr>
                ) : (
                  movements.map((mv, idx) => {
                    const isPositive = isPositiveMovement(mv.movementType);
                    const isNegative = isNegativeMovement(mv.movementType);
                    const isAdjustment = mv.movementType === "ADJUSTMENT";
                    const baseQty = parseFloat(mv.baseQuantity.toString());
                    const adjIsPositive = isAdjustment && baseQty >= 0;

                    const qtyColor = isPositive || adjIsPositive
                      ? "#62df7d"
                      : "#f87171";
                    const qtyPrefix = isPositive || adjIsPositive ? "+" : "-";

                    const currentBalance = balanceMap.get(mv.productId);
                    const badgeStyle = movementTypeBadgeStyle(mv.movementType);

                    return (
                      <tr
                        key={mv.id}
                        style={{
                          borderBottom: idx < movements.length - 1 ? "1px solid #1a2237" : "none",
                          background: "transparent",
                        }}
                      >
                        {/* Date / Time */}
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                          <span style={{ color: "#8c90a2", fontSize: "12px" }}>
                            {formatDate(mv.createdAt)}
                          </span>
                        </td>

                        {/* Movement # */}
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "11px",
                              color: "#6699ff",
                              background: "rgba(0,98,255,0.08)",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              border: "1px solid rgba(0,98,255,0.15)",
                            }}
                          >
                            #{mv.id.slice(-8).toUpperCase()}
                          </span>
                        </td>

                        {/* Product */}
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 500, color: "#dbe2fd" }}>{mv.product.name}</div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#4a5068",
                              fontFamily: "monospace",
                              marginTop: "2px",
                            }}
                          >
                            {mv.product.sku}
                          </div>
                        </td>

                        {/* Warehouse */}
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ color: "#8c90a2", fontSize: "12px" }}>
                            {mv.warehouse.name}
                          </span>
                        </td>

                        {/* Type badge */}
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "3px 8px",
                              borderRadius: "10px",
                              fontSize: "11px",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                              ...badgeStyle,
                            }}
                          >
                            {movementTypeLabel(mv.movementType, t)}
                          </span>
                        </td>

                        {/* Qty */}
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                          <span style={{ fontWeight: 700, fontSize: "14px", color: qtyColor }}>
                            {qtyPrefix}{formatQty(mv.quantity)}
                          </span>
                          <span style={{ fontSize: "11px", color: "#4a5068", marginInlineStart: "4px" }}>
                            {mv.unit.symbol}
                          </span>
                        </td>

                        {/* Balance */}
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                          {currentBalance != null ? (
                            <span style={{ color: "#dbe2fd", fontSize: "13px", fontWeight: 500 }}>
                              {currentBalance % 1 === 0
                                ? currentBalance.toString()
                                : currentBalance.toFixed(4)}{" "}
                              <span style={{ color: "#4a5068", fontSize: "11px" }}>
                                {mv.product.defaultUnit.symbol}
                              </span>
                            </span>
                          ) : (
                            <span style={{ color: "#4a5068" }}>—</span>
                          )}
                        </td>

                        {/* Actor */}
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ color: "#8c90a2", fontSize: "12px" }}>
                            {mv.actor.name}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderTop: "1px solid #222a3e",
                background: "#0d1627",
              }}
            >
              <span style={{ fontSize: "13px", color: "#8c90a2" }}>
                Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total} movements
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                {page > 1 && (
                  <Link
                    href={buildUrl({ page: String(page - 1) })}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #2d3449",
                      color: "#dbe2fd",
                      fontSize: "13px",
                      textDecoration: "none",
                    }}
                  >
                    Previous
                  </Link>
                )}
                <span
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: "#0062ff",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  {page}
                </span>
                {page < totalPages && (
                  <Link
                    href={buildUrl({ page: String(page + 1) })}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #2d3449",
                      color: "#dbe2fd",
                      fontSize: "13px",
                      textDecoration: "none",
                    }}
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: "12px", fontSize: "12px", color: "#4a5068", textAlign: "right" }}>
          {total} movement{total !== 1 ? "s" : ""} total
        </div>
      </div>
    </div>
  );
}
