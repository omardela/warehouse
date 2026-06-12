import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { ProductForm } from "../ProductForm";
import { createProductAction } from "./actions";
import { requirePagePermission } from "@/core/auth/require-page-permission";

export default async function NewProductPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "inventory.product.create");

  const [units, categories] = await Promise.all([
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

  return (
    <ProductForm
      mode="create"
      units={units}
      categories={categories}
      action={createProductAction}
    />
  );
}
