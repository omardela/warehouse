import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { createPurchaseCreditNoteAction } from "../../../credit-notes/actions";
import { CreditNoteForm } from "./CreditNoteForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ invoiceId: string }>;
}

export default async function CreatePurchaseCreditNotePage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "purchases.creditnotes.create");

  const { invoiceId } = await params;

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      supplier: { select: { id: true, name: true } },
      lines: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          unit: { select: { id: true, name: true, symbol: true } },
        },
      },
      creditNotes: {
        where: { status: { not: "CANCELLED" } },
        include: { lines: true },
      },
    },
  });

  if (!invoice || invoice.warehouseId !== session.warehouseId || invoice.type !== "PURCHASE") {
    notFound();
  }

  // Note: do not notFound() based on status here. A successful submission
  // redirects away from this route immediately, so there's no risk of the
  // form unmounting into a 404 mid-flow — but for consistency with the
  // receive-goods pattern we still avoid hard-gating the data fetch.
  const canReturn = invoice.status === "CONFIRMED";

  // Sum already-returned quantities per product+unit from prior non-cancelled credit notes.
  const alreadyReturnedByProductUnit = new Map<string, number>();
  for (const cn of invoice.creditNotes) {
    for (const cnLine of cn.lines) {
      const key = `${cnLine.productId}__${cnLine.unitId}`;
      alreadyReturnedByProductUnit.set(
        key,
        (alreadyReturnedByProductUnit.get(key) ?? 0) + Number(cnLine.displayQuantity)
      );
    }
  }

  const returnableLines = canReturn
    ? invoice.lines
        .map((line) => {
          const key = `${line.productId}__${line.unitId}`;
          const alreadyReturned = alreadyReturnedByProductUnit.get(key) ?? 0;
          const available = Number(line.quantity) - alreadyReturned;
          return {
            id: line.id,
            product: line.product,
            unit: line.unit,
            invoicedQuantity: Number(line.quantity),
            alreadyReturned,
            availableQuantity: available,
            unitPrice: Number(line.unitPrice),
          };
        })
        .filter((line) => line.availableQuantity > 0.000001)
    : [];

  return (
    <CreditNoteForm
      action={createPurchaseCreditNoteAction}
      invoiceId={invoice.id}
      supplierName={invoice.supplier?.name ?? "—"}
      status={invoice.status}
      lines={returnableLines}
    />
  );
}
