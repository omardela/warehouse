import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { ProductForm } from "../ProductForm";
import { updateProductAction, archiveProductAction, unarchiveProductAction } from "./actions";
import { requirePagePermission } from "@/core/auth/require-page-permission";

interface PageProps {
  params: Promise<{ productId: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "inventory.product.update");

  const { productId } = await params;

  const [product, units, categories] = await Promise.all([
    db.product.findUnique({
      where: { id: productId },
      include: {
        category: { select: { id: true, name: true } },
        defaultUnit: { select: { id: true, name: true, symbol: true } },
        conversions: {
          include: {
            fromUnit: { select: { id: true, name: true, symbol: true } },
            toUnit: { select: { id: true, name: true, symbol: true } },
          },
        },
        inventoryBalances: {
          where: { warehouseId: session.warehouseId },
          select: { currentQuantity: true },
        },
      },
    }),
    db.productUnit.findMany({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, symbol: true },
    }),
    db.productCategory.findMany({
      where: { organizationId: session.orgId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!product || product.organizationId !== session.orgId) {
    notFound();
  }

  const stockQty = product.inventoryBalances[0]?.currentQuantity ?? null;
  const isArchived = !!product.archivedAt;

  const archiveButton = (
    <form action={isArchived ? unarchiveProductAction : archiveProductAction} style={{ display: "inline" }}>
      <input type="hidden" name="productId" value={product.id} />
      <button
        type="submit"
        style={{
          padding: "8px 16px",
          borderRadius: "8px",
          border: isArchived ? "1px solid rgba(98,223,125,0.3)" : "1px solid rgba(255,180,171,0.3)",
          background: isArchived ? "rgba(98,223,125,0.08)" : "rgba(255,180,171,0.08)",
          color: isArchived ? "#62df7d" : "#ffb4ab",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        {isArchived ? "Unarchive" : "Archive Product"}
      </button>
    </form>
  );

  const printLabelButton = (
    <a
      href={`/dashboard/products/${product.id}/label`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        padding: "8px 16px",
        borderRadius: "8px",
        border: "1px solid #2d3449",
        background: "rgba(0,98,255,0.08)",
        color: "#0062ff",
        fontSize: "13px",
        fontWeight: 500,
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      Print Label
    </a>
  );

  return (
    <div>
      {isArchived && (
        <div style={{ background: "rgba(140,144,162,0.08)", borderBottom: "1px solid #222a3e", padding: "10px 24px", fontSize: "13px", color: "#8c90a2", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1.5C3.96 1.5 1.5 3.96 1.5 7C1.5 10.04 3.96 12.5 7 12.5C10.04 12.5 12.5 10.04 12.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7 4.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="7" cy="9.5" r="0.5" fill="currentColor" />
          </svg>
          This product is archived and will not appear in active product selectors.
        </div>
      )}

      {stockQty !== null && (
        <div style={{ background: "#171f33", borderBottom: "1px solid #222a3e", padding: "10px 24px", display: "flex", gap: "16px", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: "#8c90a2" }}>Current Stock:</span>
          <span style={{ fontSize: "14px", fontWeight: 700, color: (product.lowStockThreshold != null && Number(stockQty) <= product.lowStockThreshold) ? "#f59e0b" : "#62df7d" }}>
            {Number(stockQty) % 1 === 0 ? Number(stockQty).toString() : Number(stockQty).toFixed(3)}{" "}{product.defaultUnit.symbol}
          </span>
          {product.lowStockThreshold != null && Number(stockQty) <= product.lowStockThreshold && (
            <span style={{ padding: "2px 8px", borderRadius: "10px", background: "rgba(245,158,11,0.12)", color: "#f59e0b", fontSize: "11px", fontWeight: 600, border: "1px solid rgba(245,158,11,0.2)" }}>
              LOW STOCK
            </span>
          )}
        </div>
      )}

      <ProductForm
        mode="edit"
        units={units}
        categories={categories}
        initialValues={{
          id: product.id,
          name: product.name,
          sku: product.sku,
          description: product.description ?? "",
          categoryId: product.categoryId ?? "",
          defaultUnitId: product.defaultUnitId,
          barcode: product.barcode ?? "",
          lowStockThreshold: product.lowStockThreshold ?? undefined,
          conversions: product.conversions.map((c) => ({
            fromUnitId: c.fromUnitId,
            toUnitId: c.toUnitId,
            factor: c.factor.toString(),
          })),
        }}
        action={updateProductAction}
        archiveButton={archiveButton}
        printLabelButton={printLabelButton}
      />
    </div>
  );
}
