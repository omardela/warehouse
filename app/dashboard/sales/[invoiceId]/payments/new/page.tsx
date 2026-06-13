import { redirect, notFound } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { PaymentForm } from "./PaymentForm";
import { createSalesPaymentAction } from "../../../actions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ invoiceId: string }>;
}

export default async function NewPaymentPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "sales.payments.create");

  const { invoiceId } = await params;

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      payments: { select: { amount: true } },
    },
  });

  if (!invoice || invoice.warehouseId !== session.warehouseId || invoice.type !== "SALE") {
    notFound();
  }

  if (invoice.status !== "CONFIRMED") {
    redirect(`/dashboard/sales/${invoiceId}`);
  }

  const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <PaymentForm
      invoiceId={invoiceId}
      invoiceTotal={Number(invoice.totalAmount)}
      totalPaid={totalPaid}
      action={createSalesPaymentAction}
    />
  );
}
