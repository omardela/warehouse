import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { createSalesCreditNoteAction } from "../../../credit-notes/actions";
import { CreditNoteForm } from "./CreditNoteForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ invoiceId: string }>;
}

export default async function CreateSalesCreditNotePage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "sales.creditnotes.create");

  const { invoiceId } = await params;

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: { select: { id: true, name: true } },
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

  if (!invoice || invoice.warehouseId !== session.warehouseId || invoice.type !== "SALE") {
    notFound();
  }

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
      action={createSalesCreditNoteAction}
      invoiceId={invoice.id}
      customerName={invoice.customer?.name ?? "—"}
      status={invoice.status}
      lines={returnableLines}
    />
  );
}
