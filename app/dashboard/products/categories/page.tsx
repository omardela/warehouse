import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { CategoryInlineForm } from "./CategoryInlineForm";
import { deleteCategoryAction } from "./actions";
import { requirePagePermission } from "@/core/auth/require-page-permission";

export const dynamic = "force-dynamic";

export default async function ProductCategoriesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "inventory.product.read");

  const categories = await db.productCategory.findMany({
    where: { organizationId: session.orgId },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <a href="/dashboard/products" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>Products</a>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#8c90a2", fontSize: "13px" }}>Categories</span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>Product Categories</h1>
            <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "4px" }}>Manage your inventory taxonomy and category structures.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Create form */}
          <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#dbe2fd", margin: "0 0 16px", paddingBottom: "12px", borderBottom: "1px solid #222a3e" }}>
              Create Category
            </h2>
            <CategoryInlineForm />
          </div>

          {/* Categories list */}
          <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #222a3e", background: "#0d1627", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#dbe2fd", margin: 0 }}>All Categories</h2>
              <span style={{ padding: "2px 8px", borderRadius: "10px", background: "rgba(0,98,255,0.12)", color: "#6b9fff", fontSize: "11px", fontWeight: 600 }}>
                {categories.length}
              </span>
            </div>

            {categories.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#4a5068", fontSize: "13px" }}>
                No categories yet. Create your first one.
              </div>
            ) : (
              <div>
                {categories.map((cat) => (
                  <div key={cat.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #1a2237" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(0,98,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M1 3H11M1 3L2.5 1H9.5L11 3M1 3V10C1 10.552 1.448 11 2 11H10C10.552 11 11 10.552 11 10V3" stroke="#0062ff" strokeWidth="1.2" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "#dbe2fd" }}>{cat.name}</div>
                        <div style={{ fontSize: "11px", color: "#4a5068" }}>{cat._count.products} product{cat._count.products !== 1 ? "s" : ""}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: "10px", background: "rgba(98,223,125,0.08)", color: "#62df7d", fontSize: "10px", fontWeight: 600 }}>ACTIVE</span>
                      {cat._count.products === 0 && (
                        <form action={deleteCategoryAction} style={{ display: "inline" }}>
                          <input type="hidden" name="categoryId" value={cat.id} />
                          <button
                            type="submit"
                            title="Delete category"
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "26px", height: "26px", borderRadius: "6px", border: "1px solid rgba(255,180,171,0.2)", background: "rgba(255,180,171,0.06)", color: "#ffb4ab", cursor: "pointer" }}
                          >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
