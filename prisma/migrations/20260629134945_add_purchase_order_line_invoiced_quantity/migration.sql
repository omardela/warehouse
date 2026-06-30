-- AlterTable
ALTER TABLE "purchase_order_lines" ADD COLUMN     "invoicedBaseQuantity" DECIMAL(20,6) NOT NULL DEFAULT 0;
