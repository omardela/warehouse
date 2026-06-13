import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { SalesInvoiceForm } from "./SalesInvoiceForm";
import { createSalesInvoiceAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewSalesInvoicePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "sales.invoice.create");

  const [products, units, customers] = await Promise.all([
    db.product.findMany({
      where: { organizationId: session.orgId, archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true, defaultUnitId: true },
    }),
    db.productUnit.findMany({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, symbol: true },
    }),
    db.customer.findMany({
      where: { organizationId: session.orgId, archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <SalesInvoiceForm
      products={products}
      units={units}
      customers={customers}
      action={createSalesInvoiceAction}
    />
  );
}
