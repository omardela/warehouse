import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { createDeliveryNoteAction } from "../../actions";
import { DeliveryNoteForm } from "./DeliveryNoteForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function CreateDeliveryNotePage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "sales.deliverynotes.create");

  const { orderId } = await params;

  const so = await db.salesOrder.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { id: true, name: true } },
      lines: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          unit: { select: { id: true, name: true, symbol: true } },
        },
      },
    },
  });

  if (!so || so.warehouseId !== session.warehouseId) {
    notFound();
  }

  // Note: do not notFound() based on status/remaining quantity here. A
  // successful submission flips the SO to PARTIAL/FULFILLED and Next.js
  // refreshes this route's server data immediately after, which would
  // otherwise unmount the form (and its inline success state) into a 404.
  // Instead, pass an empty line list and let the form render an appropriate state.
  const canDeliverAgainst = so.status === "CONFIRMED" || so.status === "PARTIAL";

  // Only lines with remaining undelivered quantity can be delivered against.
  const remainingLines = canDeliverAgainst
    ? so.lines
        .map((line) => {
          const remainingBase = Number(line.baseQuantity) - Number(line.deliveredBaseQuantity);
          // displayQuantity / baseQuantity share the same ratio, so remaining
          // display qty scales the same way as remaining base qty.
          const ratio = Number(line.baseQuantity) > 0 ? Number(line.displayQuantity) / Number(line.baseQuantity) : 1;
          const remainingDisplay = remainingBase * ratio;
          return {
            id: line.id,
            product: line.product,
            unit: line.unit,
            orderedDisplay: Number(line.displayQuantity),
            deliveredBase: Number(line.deliveredBaseQuantity),
            remainingBase,
            remainingDisplay,
          };
        })
        .filter((line) => line.remainingBase > 0.000001)
    : [];

  return (
    <DeliveryNoteForm
      action={createDeliveryNoteAction}
      salesOrderId={so.id}
      customerName={so.customer.name}
      status={so.status}
      lines={remainingLines}
    />
  );
}
