-- CreateTable: document_sequences
CREATE TABLE "document_sequences" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- UniqueIndex on document_sequences
CREATE UNIQUE INDEX "document_sequences_organizationId_documentType_key" ON "document_sequences"("organizationId", "documentType");

-- AddForeignKey for document_sequences
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add nullable number column to invoices, backfill, then enforce NOT NULL + unique
ALTER TABLE "invoices" ADD COLUMN "number" TEXT;
UPDATE "invoices" SET "number" = 'LEGACY-' || "id" WHERE "number" IS NULL;
ALTER TABLE "invoices" ALTER COLUMN "number" SET NOT NULL;
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- Add nullable number column to payments, backfill, then enforce NOT NULL + unique
ALTER TABLE "payments" ADD COLUMN "number" TEXT;
UPDATE "payments" SET "number" = 'LEGACY-' || "id" WHERE "number" IS NULL;
ALTER TABLE "payments" ALTER COLUMN "number" SET NOT NULL;
CREATE UNIQUE INDEX "payments_number_key" ON "payments"("number");

-- Add nullable number column to purchase_orders, backfill, then enforce NOT NULL + unique
ALTER TABLE "purchase_orders" ADD COLUMN "number" TEXT;
UPDATE "purchase_orders" SET "number" = 'LEGACY-' || "id" WHERE "number" IS NULL;
ALTER TABLE "purchase_orders" ALTER COLUMN "number" SET NOT NULL;
CREATE UNIQUE INDEX "purchase_orders_number_key" ON "purchase_orders"("number");

-- Add nullable number column to goods_receipts, backfill, then enforce NOT NULL + unique
ALTER TABLE "goods_receipts" ADD COLUMN "number" TEXT;
UPDATE "goods_receipts" SET "number" = 'LEGACY-' || "id" WHERE "number" IS NULL;
ALTER TABLE "goods_receipts" ALTER COLUMN "number" SET NOT NULL;
CREATE UNIQUE INDEX "goods_receipts_number_key" ON "goods_receipts"("number");

-- Add nullable number column to credit_notes, backfill, then enforce NOT NULL + unique
ALTER TABLE "credit_notes" ADD COLUMN "number" TEXT;
UPDATE "credit_notes" SET "number" = 'LEGACY-' || "id" WHERE "number" IS NULL;
ALTER TABLE "credit_notes" ALTER COLUMN "number" SET NOT NULL;
CREATE UNIQUE INDEX "credit_notes_number_key" ON "credit_notes"("number");

-- Add nullable number column to sales_orders, backfill, then enforce NOT NULL + unique
ALTER TABLE "sales_orders" ADD COLUMN "number" TEXT;
UPDATE "sales_orders" SET "number" = 'LEGACY-' || "id" WHERE "number" IS NULL;
ALTER TABLE "sales_orders" ALTER COLUMN "number" SET NOT NULL;
CREATE UNIQUE INDEX "sales_orders_number_key" ON "sales_orders"("number");

-- Add nullable number column to delivery_notes, backfill, then enforce NOT NULL + unique
ALTER TABLE "delivery_notes" ADD COLUMN "number" TEXT;
UPDATE "delivery_notes" SET "number" = 'LEGACY-' || "id" WHERE "number" IS NULL;
ALTER TABLE "delivery_notes" ALTER COLUMN "number" SET NOT NULL;
CREATE UNIQUE INDEX "delivery_notes_number_key" ON "delivery_notes"("number");
