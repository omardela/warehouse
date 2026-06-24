-- DropForeignKey
ALTER TABLE "delivery_note_lines" DROP CONSTRAINT "delivery_note_lines_salesOrderLineId_fkey";

-- DropForeignKey
ALTER TABLE "delivery_notes" DROP CONSTRAINT "delivery_notes_salesOrderId_fkey";

-- DropForeignKey
ALTER TABLE "goods_receipt_lines" DROP CONSTRAINT "goods_receipt_lines_purchaseOrderLineId_fkey";

-- DropForeignKey
ALTER TABLE "goods_receipts" DROP CONSTRAINT "goods_receipts_purchaseOrderId_fkey";

-- AlterTable
ALTER TABLE "delivery_note_lines" ALTER COLUMN "salesOrderLineId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "delivery_notes" ADD COLUMN     "invoiceId" TEXT,
ALTER COLUMN "salesOrderId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "goods_receipt_lines" ALTER COLUMN "purchaseOrderLineId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "goods_receipts" ADD COLUMN     "invoiceId" TEXT,
ALTER COLUMN "purchaseOrderId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_purchaseOrderLineId_fkey" FOREIGN KEY ("purchaseOrderLineId") REFERENCES "purchase_order_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_notes" ADD CONSTRAINT "delivery_notes_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_notes" ADD CONSTRAINT "delivery_notes_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_note_lines" ADD CONSTRAINT "delivery_note_lines_salesOrderLineId_fkey" FOREIGN KEY ("salesOrderLineId") REFERENCES "sales_order_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
