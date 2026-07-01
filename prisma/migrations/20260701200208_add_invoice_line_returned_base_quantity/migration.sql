-- AlterTable
ALTER TABLE "invoice_lines" ADD COLUMN     "returnedBaseQuantity" DECIMAL(20,6) NOT NULL DEFAULT 0;
