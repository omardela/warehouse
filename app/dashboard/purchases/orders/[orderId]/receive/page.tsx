import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { createGoodsReceiptAction } from "../../actions";
import { GoodsReceiptForm } from "./GoodsReceiptForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function CreateGoodsReceiptPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "purchases.receipts.create");

  const { orderId } = await params;

  const po = await db.purchaseOrder.findUnique({
    where: { id: orderId },
    include: {
      supplier: { select: { id: true, name: true } },
      lines: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          unit: { select: { id: true, name: true, symbol: true } },
        },
      },
    },
  });

  if (!po || po.warehouseId !== session.warehouseId) {
    notFound();
  }

  if (po.status !== "SENT" && po.status !== "PARTIAL") {
    notFound();
  }

  // Only lines with outstanding quantity remaining can be received against.
  const outstandingLines = po.lines
    .map((line) => {
      const outstandingBase = Number(line.baseQuantity) - Number(line.receivedBaseQuantity);
      // displayQuantity / baseQuantity share the same ratio, so outstanding
      // display qty scales the same way as outstanding base qty.
      const ratio = Number(line.baseQuantity) > 0 ? Number(line.displayQuantity) / Number(line.baseQuantity) : 1;
      const outstandingDisplay = outstandingBase * ratio;
      return {
        id: line.id,
        product: line.product,
        unit: line.unit,
        orderedDisplay: Number(line.displayQuantity),
        receivedBase: Number(line.receivedBaseQuantity),
        outstandingBase,
        outstandingDisplay,
      };
    })
    .filter((line) => line.outstandingBase > 0.000001);

  if (outstandingLines.length === 0) {
    notFound();
  }

  return (
    <GoodsReceiptForm
      action={createGoodsReceiptAction}
      purchaseOrderId={po.id}
      supplierName={po.supplier.name}
      status={po.status}
      lines={outstandingLines}
    />
  );
}
