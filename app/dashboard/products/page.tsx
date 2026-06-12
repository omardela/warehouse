import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    archived?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 20;

function formatQty(val: { toString(): string } | null | undefined): string {
  if (val == null) return "0";
  const n = Number(val);
  return n % 1 === 0 ? n.toString() : n.toFixed(2);
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "inventory.product.read");

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const categoryId = params.category ?? "";
  const showArchived = params.archived === "1";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    organizationId: session.orgId,
    ...(showArchived ? {} : { archivedAt: null as null }),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
            { barcode: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(categoryId ? { categoryId } : {}),
  };

  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        defaultUnit: { select: { id: true, name: true, symbol: true } },
        inventoryBalances: {
          where: { warehouseId: session.warehouseId },
          select: { currentQuantity: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.product.count({ where }),
    db.productCategory.findMany({
      where: { organizationId: session.orgId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
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
              Products
            </h1>
            <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "4px" }}>
              Manage products, inventory items, categories, and stock information across all warehouse locations.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Link
              href="/dashboard/products/categories"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #2d3449",
                background: "transparent",
                color: "#8c90a2",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Categories
            </Link>
            <Link
              href="/dashboard/products/new"
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
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 1.5V12.5M1.5 7H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Add Product
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
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <form method="GET" style={{ display: "flex", gap: "12px", flexWrap: "wrap", flex: 1 }}>
            <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
              <svg
                width="14" height="14" viewBox="0 0 14 14" fill="none"
                style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#4a5068", pointerEvents: "none" }}
              >
                <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                name="q"
                type="text"
                defaultValue={q}
                placeholder="Search by name, SKU, barcode..."
                style={{
                  width: "100%",
                  paddingLeft: "32px",
                  paddingRight: "12px",
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

            <select
              name="category"
              defaultValue={categoryId}
              style={{
                padding: "8px 12px",
                background: "#0d1627",
                border: "1px solid #2d3449",
                borderRadius: "8px",
                color: categoryId ? "#dbe2fd" : "#4a5068",
                fontSize: "13px",
                outline: "none",
                minWidth: "160px",
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                fontSize: "13px",
                color: "#8c90a2",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                name="archived"
                value="1"
                defaultChecked={showArchived}
                style={{ accentColor: "#0062ff" }}
              />
              Show archived
            </label>

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
              }}
            >
              Search
            </button>
          </form>
        </div>

        {/* Table */}
        <style>{`
          .product-row:hover { background: #1a2237 !important; }
          .product-row-archived:hover { background: rgba(140,144,162,0.07) !important; }
        `}</style>
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
                  {["Product", "SKU", "Base Unit", "Category", "Stock", "Barcode", "Status", "Actions"].map((h) => (
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
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "48px 24px", textAlign: "center", color: "#8c90a2", fontSize: "14px" }}>
                      {q || categoryId
                        ? "No products match your search."
                        : "No products yet. Add your first product to get started."}
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const balance = product.inventoryBalances[0]?.currentQuantity ?? null;
                    const qty = balance ? Number(balance) : 0;
                    const isLowStock = qty <= product.lowStockThreshold;
                    const isArchived = !!product.archivedAt;

                    return (
                      <tr
                        key={product.id}
                        className={isArchived ? "product-row-archived" : "product-row"}
                        style={{
                          borderBottom: "1px solid #1a2237",
                          background: isArchived ? "rgba(140,144,162,0.04)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 500, color: isArchived ? "#4a5068" : "#dbe2fd", textDecoration: isArchived ? "line-through" : "none" }}>
                            {product.name}
                          </div>
                          {product.description && (
                            <div style={{ fontSize: "11px", color: "#4a5068", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>
                              {product.description}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontFamily: "monospace", fontSize: "12px", color: isArchived ? "#4a5068" : "#8c90a2", background: "#0d1627", padding: "2px 6px", borderRadius: "4px", border: "1px solid #222a3e" }}>
                            {product.sku}
                          </span>
                        </td>

                        <td style={{ padding: "12px 16px", color: isArchived ? "#4a5068" : "#8c90a2" }}>
                          {product.defaultUnit.name}{" "}
                          <span style={{ color: "#4a5068" }}>({product.defaultUnit.symbol})</span>
                        </td>

                        <td style={{ padding: "12px 16px", color: isArchived ? "#4a5068" : "#8c90a2" }}>
                          {product.category ? (
                            <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "12px", background: "rgba(0,98,255,0.1)", color: isArchived ? "#4a5068" : "#6b9fff", fontSize: "11px", fontWeight: 500 }}>
                              {product.category.name}
                            </span>
                          ) : (
                            <span style={{ color: "#4a5068", fontSize: "12px" }}>—</span>
                          )}
                        </td>

                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontWeight: 600, color: isArchived ? "#4a5068" : isLowStock ? "#f59e0b" : "#62df7d", fontSize: "13px" }}>
                              {formatQty(balance)}
                            </span>
                            <span style={{ fontSize: "11px", color: "#4a5068" }}>
                              {product.defaultUnit.symbol}
                            </span>
                            {isLowStock && !isArchived && (
                              <span style={{ display: "inline-flex", alignItems: "center", padding: "1px 6px", borderRadius: "10px", background: "rgba(245,158,11,0.12)", color: "#f59e0b", fontSize: "10px", fontWeight: 600, border: "1px solid rgba(245,158,11,0.2)" }}>
                                LOW
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: "12px 16px" }}>
                          {product.barcode ? (
                            <span style={{ fontFamily: "monospace", fontSize: "11px", color: isArchived ? "#4a5068" : "#8c90a2" }}>
                              {product.barcode}
                            </span>
                          ) : (
                            <span style={{ color: "#4a5068", fontSize: "12px" }}>—</span>
                          )}
                        </td>

                        <td style={{ padding: "12px 16px" }}>
                          {isArchived ? (
                            <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: "10px", background: "rgba(140,144,162,0.1)", color: "#8c90a2", fontSize: "11px", fontWeight: 600 }}>
                              ARCHIVED
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: "10px", background: "rgba(98,223,125,0.1)", color: "#62df7d", fontSize: "11px", fontWeight: 600 }}>
                              ACTIVE
                            </span>
                          )}
                        </td>

                        <td style={{ padding: "12px 16px" }}>
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "12px", fontWeight: 500, textDecoration: "none" }}
                          >
                            Edit
                          </Link>
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
                Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total} results
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                {page > 1 && (
                  <Link
                    href={`?q=${encodeURIComponent(q)}&category=${encodeURIComponent(categoryId)}&archived=${showArchived ? "1" : ""}&page=${page - 1}`}
                    style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #2d3449", color: "#dbe2fd", fontSize: "13px", textDecoration: "none" }}
                  >
                    Previous
                  </Link>
                )}
                <span style={{ padding: "6px 12px", borderRadius: "6px", background: "#0062ff", color: "#fff", fontSize: "13px", fontWeight: 600 }}>
                  {page}
                </span>
                {page < totalPages && (
                  <Link
                    href={`?q=${encodeURIComponent(q)}&category=${encodeURIComponent(categoryId)}&archived=${showArchived ? "1" : ""}&page=${page + 1}`}
                    style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #2d3449", color: "#dbe2fd", fontSize: "13px", textDecoration: "none" }}
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: "12px", fontSize: "12px", color: "#4a5068", textAlign: "right" }}>
          {total} product{total !== 1 ? "s" : ""} total
        </div>
      </div>
    </div>
  );
}
