import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { AutoPrint } from "@/components/labels/auto-print";
import { BarcodeLabel } from "@/components/labels/barcode-label";
import "@/components/labels/print-label.css";

interface PageProps {
  params: Promise<{ productId: string }>;
}

export default async function ProductLabelPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "inventory.product.read");

  const { productId } = await params;

  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      organizationId: true,
      defaultUnit: { select: { symbol: true } },
    },
  });

  if (!product || product.organizationId !== session.orgId) {
    notFound();
  }

  return (
    <div className="print-overlay">
      <AutoPrint />
      <div className="print-page">
        <BarcodeLabel
          barcode={product.barcode}
          productName={product.name}
          sku={product.sku}
          unitSymbol={product.defaultUnit.symbol}
        />
      </div>
    </div>
  );
}
