import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { SalesInvoiceForm } from "./SalesInvoiceForm";
import { createSalesInvoiceAction } from "../actions";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ deliveryNoteId?: string }>;
}

export default async function NewSalesInvoicePage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "sales.invoice.create");

  const params = await searchParams;
  const deliveryNoteId = params.deliveryNoteId;

  const [rawProducts, customers, recentDeliveryNotes] = await Promise.all([
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
    db.customer.findMany({
      where: { organizationId: session.orgId, archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.deliveryNote.findMany({
      where: { warehouseId: session.warehouseId },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        createdAt: true,
        salesOrder: { select: { id: true, customer: { select: { id: true, name: true } } } },
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

  // If a deliveryNoteId is provided, fetch its lines to pre-fill the invoice form.
  let prefill: {
    deliveryNoteId: string;
    customerId: string;
    lines: { productId: string; unitId: string; quantity: number; unitPrice: number }[];
  } | null = null;

  if (deliveryNoteId) {
    const deliveryNote = await db.deliveryNote.findUnique({
      where: { id: deliveryNoteId },
      include: {
        salesOrder: {
          select: {
            customerId: true,
            warehouseId: true,
            lines: { select: { id: true, unitPrice: true, discount: true } },
          },
        },
        lines: {
          select: {
            productId: true,
            unitId: true,
            displayQuantity: true,
            salesOrderLineId: true,
          },
        },
      },
    });

    if (deliveryNote && deliveryNote.salesOrder?.warehouseId === session.warehouseId) {
      const soLineMap = new Map(deliveryNote.salesOrder.lines.map((l) => [l.id, l]));
      prefill = {
        deliveryNoteId: deliveryNote.id,
        customerId: deliveryNote.salesOrder.customerId,
        lines: deliveryNote.lines.map((line) => {
          const soLine = line.salesOrderLineId
            ? soLineMap.get(line.salesOrderLineId)
            : undefined;
          return {
            productId: line.productId,
            unitId: line.unitId,
            quantity: Number(line.displayQuantity),
            unitPrice: soLine ? Number(soLine.unitPrice) : 0,
          };
        }),
      };
    }
  }

  return (
    <SalesInvoiceForm
      products={products}
      customers={customers}
      action={createSalesInvoiceAction}
      recentDeliveryNotes={recentDeliveryNotes.map((dn) => ({
        id: dn.id,
        label: `${dn.id.slice(0, 8).toUpperCase()} · ${dn.salesOrder?.customer.name ?? "Direct Sale"} · ${dn.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`,
      }))}
      prefill={prefill}
    />
  );
}
