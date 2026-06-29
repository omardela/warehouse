-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "deliveryNoteId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "invoices_deliveryNoteId_key" ON "invoices"("deliveryNoteId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "delivery_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
