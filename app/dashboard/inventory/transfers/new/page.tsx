import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { TransferForm } from "./TransferForm";

export const dynamic = "force-dynamic";

export default async function NewStockTransferPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "inventory.transfers.create");

  const [warehouses, rawProducts] = await Promise.all([
    db.warehouse.findMany({
      where: { organizationId: session.orgId, archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.product.findMany({
      where: { organizationId: session.orgId, archivedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        defaultUnitId: true,
        defaultUnit: { select: { id: true, name: true, symbol: true } },
        conversions: {
          select: {
            fromUnitId: true,
            toUnitId: true,
            fromUnit: { select: { id: true, name: true, symbol: true } },
            toUnit: { select: { id: true, name: true, symbol: true } },
          },
        },
        inventoryBalances: {
          select: { warehouseId: true, currentQuantity: true },
        },
      },
    }),
  ]);

  // Build per-product unit list: default unit + all units referenced in product-specific conversions,
  // plus a per-warehouse balance map for source-stock validation in the UI.
  const products = rawProducts.map((p) => {
    const unitMap = new Map<string, { id: string; name: string; symbol: string }>();
    unitMap.set(p.defaultUnit.id, p.defaultUnit);
    for (const conv of p.conversions) {
      unitMap.set(conv.fromUnit.id, conv.fromUnit);
      unitMap.set(conv.toUnit.id, conv.toUnit);
    }
    const balances: Record<string, number> = {};
    for (const b of p.inventoryBalances) {
      balances[b.warehouseId] = Number(b.currentQuantity);
    }
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      defaultUnitId: p.defaultUnitId,
      units: Array.from(unitMap.values()),
      balances,
    };
  });

  return <TransferForm warehouses={warehouses} products={products} />;
}
