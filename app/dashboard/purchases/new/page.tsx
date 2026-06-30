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

  const [suppliers, rawProducts, eligiblePurchaseOrders] = await Promise.all([
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
    // Purchase orders eligible to be linked to a new invoice: goods have
    // arrived (RECEIVED or PARTIAL). A PO may be invoiced over multiple
    // Purchase Invoices (decided 2026-06-28 — see CONTEXT.md "Purchase Order
    // (PO)"), so a PO with an existing invoice remains eligible as long as at
    // least one line still has `receivedBaseQuantity - invoicedBaseQuantity > 0`.
    db.purchaseOrder.findMany({
      where: {
        organizationId: session.orgId,
        warehouseId: session.warehouseId,
        status: { in: ["RECEIVED", "PARTIAL"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        supplierId: true,
        status: true,
        createdAt: true,
        lines: {
          select: {
            productId: true,
            unitId: true,
            unitCost: true,
            displayQuantity: true,
            baseQuantity: true,
            receivedBaseQuantity: true,
            invoicedBaseQuantity: true,
            product: { select: { name: true, sku: true } },
            unit: { select: { name: true, symbol: true } },
          },
        },
      },
    }),
  ]);

  const purchaseOrders = eligiblePurchaseOrders
    .map((po) => ({
      id: po.id,
      supplierId: po.supplierId,
      status: po.status,
      label: `${po.id.slice(0, 8).toUpperCase()} · ${po.status} · ${new Date(po.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`,
      lines: po.lines
        .filter((l) => Number(l.receivedBaseQuantity) - Number(l.invoicedBaseQuantity) > 0.000001)
        .map((l) => {
          const baseQty = Number(l.baseQuantity);
          const ratio = baseQty > 0 ? Number(l.displayQuantity) / baseQty : 1;
          const orderedDisplayQty = Number(l.displayQuantity);
          const receivedDisplayQty = Number(l.receivedBaseQuantity) * ratio;
          const invoicedDisplayQty = Number(l.invoicedBaseQuantity) * ratio;
          const remainingDisplayQty = receivedDisplayQty - invoicedDisplayQty;
          return {
            productId: l.productId,
            productName: l.product.name,
            sku: l.product.sku,
            unitId: l.unitId,
            unitSymbol: l.unit.symbol,
            ordered: orderedDisplayQty,
            received: receivedDisplayQty,
            alreadyInvoiced: invoicedDisplayQty,
            quantity: remainingDisplayQty,
            unitPrice: Number(l.unitCost),
          };
        }),
    }))
    // A PO whose remaining-to-invoice is zero on every line has nothing left
    // to bill and shouldn't appear in the dropdown even though its status is
    // still RECEIVED/PARTIAL.
    .filter((po) => po.lines.length > 0);

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
      purchaseOrders={purchaseOrders}
      defaultSupplierId={defaultSupplierId}
    />
  );
}
