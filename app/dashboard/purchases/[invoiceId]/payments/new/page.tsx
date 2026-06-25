import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { PaymentForm } from "./PaymentForm";
import { createPurchasePaymentAction } from "../../../actions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ invoiceId: string }>;
}

export default async function NewPaymentPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "payments.payment.create");

  const { invoiceId } = await params;

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      warehouseId: true,
      type: true,
      status: true,
      totalAmount: true,
      payments: { select: { amount: true } },
    },
  });

  if (!invoice || invoice.warehouseId !== session.warehouseId || invoice.type !== "PURCHASE") {
    notFound();
  }

  if (invoice.status !== "CONFIRMED") {
    redirect(`/dashboard/purchases/${invoiceId}`);
  }

  const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Number(invoice.totalAmount) - totalPaid;

  // Already fully paid — nothing left to record a payment against.
  if (remaining <= 0.001) {
    redirect(`/dashboard/purchases/${invoiceId}`);
  }

  return (
    <PaymentForm
      invoiceId={invoiceId}
      invoiceTotal={Number(invoice.totalAmount)}
      totalPaid={totalPaid}
      remaining={remaining}
      action={createPurchasePaymentAction}
    />
  );
}
