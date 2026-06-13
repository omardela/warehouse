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

  const [suppliers, products, units] = await Promise.all([
    db.supplier.findMany({
      where: { organizationId: session.orgId, archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.product.findMany({
      where: { organizationId: session.orgId, archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true },
    }),
    db.productUnit.findMany({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, symbol: true },
    }),
  ]);

  return (
    <PurchaseInvoiceForm
      action={createPurchaseInvoiceAction}
      suppliers={suppliers}
      products={products}
      units={units}
      defaultSupplierId={defaultSupplierId}
    />
  );
}
