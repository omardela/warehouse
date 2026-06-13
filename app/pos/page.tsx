import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { db } from "@/lib/db";
import PosTerminal from "./PosTerminal";

export const dynamic = "force-dynamic";

export type ProductForPos = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  lowStockThreshold: number | null;
  defaultUnitId: string;
  defaultUnitName: string;
  defaultUnitSymbol: string;
  currentQuantity: number;
};

export default async function PosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await requirePagePermission(session, "pos.sales.create");

  // Fetch all inventory balances for this warehouse, including product and unit data
  const balances = await db.inventoryBalance.findMany({
    where: {
      warehouseId: session.warehouseId,
      product: { archivedAt: null },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          lowStockThreshold: true,
          defaultUnitId: true,
          defaultUnit: {
            select: {
              id: true,
              name: true,
              symbol: true,
            },
          },
        },
      },
    },
    orderBy: {
      product: { name: "asc" },
    },
  });

  const products: ProductForPos[] = balances.map((b) => ({
    id: b.product.id,
    name: b.product.name,
    sku: b.product.sku,
    barcode: b.product.barcode,
    lowStockThreshold: b.product.lowStockThreshold,
    defaultUnitId: b.product.defaultUnitId,
    defaultUnitName: b.product.defaultUnit.name,
    defaultUnitSymbol: b.product.defaultUnit.symbol,
    currentQuantity: Number(b.currentQuantity),
  }));

  return <PosTerminal products={products} />;
}
