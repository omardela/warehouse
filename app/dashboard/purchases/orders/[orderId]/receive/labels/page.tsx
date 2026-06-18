import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { AutoPrint } from "@/components/labels/auto-print";
import { BarcodeLabel } from "@/components/labels/barcode-label";
import "@/components/labels/print-label.css";

interface PageProps {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ receiptId?: string }>;
}

// Multi-label print view: one label per line item on a Goods Receipt for the
// given Purchase Order. Reached from the receive page's "Print Labels"
// action once a receipt has been confirmed (?receiptId=<id>).
//
// NOTE: GoodsReceipt / GoodsReceiptLine are currently a schema stub (see
// prisma/schema.prisma) added only so this page compiles in isolation while
// issue 019 (Purchase Order workflow) is built in parallel. The real
// "Print Labels" button on receive/page.tsx still needs to be wired up once
// that page exists for real — that wiring is out of scope here.
export default async function GoodsReceiptLabelsPage({ params, searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "inventory.product.read");

  const { orderId } = await params;
  const { receiptId } = await searchParams;

  if (!receiptId) {
    notFound();
  }

  const receipt = await db.goodsReceipt.findUnique({
    where: { id: receiptId },
    select: {
      id: true,
      purchaseOrderId: true,
      purchaseOrder: { select: { id: true, organizationId: true } },
      lines: {
        select: {
          id: true,
          product: {
            select: { name: true, sku: true, barcode: true },
          },
          unit: { select: { symbol: true } },
        },
      },
    },
  });

  if (
    !receipt ||
    receipt.purchaseOrderId !== orderId ||
    receipt.purchaseOrder.organizationId !== session.orgId
  ) {
    notFound();
  }

  return (
    <div className="print-overlay">
      <AutoPrint />
      <div className="print-page">
        {receipt.lines.map((line) => (
          <BarcodeLabel
            key={line.id}
            barcode={line.product.barcode}
            productName={line.product.name}
            sku={line.product.sku}
            unitSymbol={line.unit.symbol}
          />
        ))}
      </div>
    </div>
  );
}
