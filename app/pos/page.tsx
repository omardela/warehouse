import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { db } from "@/lib/db";
import PosTerminal from "./PosTerminal";

export const dynamic = "force-dynamic";

export type UnitForPos = {
  id: string;
  name: string;
  symbol: string;
  toBaseConversionFactor: number; // 1 for the default unit; >1 or <1 for others
};

export type ProductForPos = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  lowStockThreshold: number | null;
  defaultUnitId: string;
  defaultUnitSymbol: string;
  currentQuantity: number; // always in base units
  availableUnits: UnitForPos[];
};

export default async function PosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await requirePagePermission(session, "pos.sales.create");

  // Fetch all inventory balances for this warehouse, including product, unit, and conversion data
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
          defaultUnit: { select: { id: true, name: true, symbol: true } },
          conversions: {
            select: {
              fromUnitId: true,
              toUnitId: true,
              factor: true,
              fromUnit: { select: { id: true, name: true, symbol: true } },
              toUnit: { select: { id: true, name: true, symbol: true } },
            },
          },
        },
      },
    },
    orderBy: { product: { name: "asc" } },
  });

  const products: ProductForPos[] = balances.map((b) => {
    const p = b.product;
    const unitMap = new Map<string, UnitForPos>();

    // Default unit always has factor 1
    unitMap.set(p.defaultUnit.id, { ...p.defaultUnit, toBaseConversionFactor: 1 });

    for (const conv of p.conversions) {
      if (conv.toUnitId === p.defaultUnitId) {
        // fromUnit → defaultUnit: 1 fromUnit = factor defaultUnits
        if (!unitMap.has(conv.fromUnit.id)) {
          unitMap.set(conv.fromUnit.id, { ...conv.fromUnit, toBaseConversionFactor: Number(conv.factor) });
        }
      } else if (conv.fromUnitId === p.defaultUnitId) {
        // defaultUnit → toUnit: 1 defaultUnit = factor toUnits → 1 toUnit = 1/factor defaultUnits
        const f = Number(conv.factor);
        if (f !== 0 && !unitMap.has(conv.toUnit.id)) {
          unitMap.set(conv.toUnit.id, { ...conv.toUnit, toBaseConversionFactor: 1 / f });
        }
      }
    }

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      lowStockThreshold: p.lowStockThreshold,
      defaultUnitId: p.defaultUnitId,
      defaultUnitSymbol: p.defaultUnit.symbol,
      currentQuantity: Number(b.currentQuantity),
      availableUnits: Array.from(unitMap.values()),
    };
  });

  return <PosTerminal products={products} />;
}
