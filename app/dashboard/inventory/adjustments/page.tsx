import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { AdjustmentForm } from "./AdjustmentForm";

export default async function AdjustmentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "inventory.movement.create");

  // Fetch all active products for this org with their default unit and current balance
  const products = await db.product.findMany({
    where: { organizationId: session.orgId, archivedAt: null },
    include: {
      defaultUnit: { select: { id: true, name: true, symbol: true } },
      inventoryBalances: {
        where: { warehouseId: session.warehouseId },
        select: { currentQuantity: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const productData = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    defaultUnit: p.defaultUnit,
    currentBalance:
      p.inventoryBalances[0] != null
        ? parseFloat(p.inventoryBalances[0].currentQuantity.toString())
        : null,
    lowStockThreshold: p.lowStockThreshold,
  }));

  return <AdjustmentForm products={productData} />;
}
