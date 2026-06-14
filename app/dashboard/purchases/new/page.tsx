import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { PurchaseInvoiceForm } from "./PurchaseInvoiceForm";
import { createPurchaseInvoiceAction } from "../actions";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ supplierId?: string }>;
}

export default async function NewPurchaseInvoicePage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "purchase.invoice.create");

  const params = await searchParams;
  const defaultSupplierId = params.supplierId;

  const [suppliers, rawProducts] = await Promise.all([
    db.supplier.findMany({
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
      },
    }),
  ]);

  // Build per-product unit list: default unit + all units referenced in product-specific conversions
  const products = rawProducts.map((p) => {
    const unitMap = new Map<string, { id: string; name: string; symbol: string }>();
    unitMap.set(p.defaultUnit.id, p.defaultUnit);
    for (const conv of p.conversions) {
      unitMap.set(conv.fromUnit.id, conv.fromUnit);
      unitMap.set(conv.toUnit.id, conv.toUnit);
    }
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      defaultUnitId: p.defaultUnitId,
      units: Array.from(unitMap.values()),
    };
  });

  return (
    <PurchaseInvoiceForm
      action={createPurchaseInvoiceAction}
      suppliers={suppliers}
      products={products}
      defaultSupplierId={defaultSupplierId}
    />
  );
}
