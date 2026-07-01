import { Prisma } from "@prisma/client";

const PREFIXES: Record<string, string> = {
  PURCHASE_ORDER: "PO",
  SALES_ORDER: "SO",
  GOODS_RECEIPT: "GR",
  DELIVERY_NOTE: "DN",
  SALES_INVOICE: "INV",
  PURCHASE_INVOICE: "PINV",
  CREDIT_NOTE: "CN",
  PAYMENT: "PAY",
};

export async function getNextDocumentNumber(
  organizationId: string,
  documentType: string,
  year: number,
  tx: Prisma.TransactionClient
): Promise<string> {
  const prefix = PREFIXES[documentType];
  if (!prefix) throw new Error(`Unknown document type: ${documentType}`);

  // Ensure the sequence row exists (upsert with lastNumber=0 if new)
  await tx.$executeRaw`
    INSERT INTO document_sequences ("id", "organizationId", "documentType", "lastNumber")
    VALUES (gen_random_uuid()::text, ${organizationId}, ${documentType}, 0)
    ON CONFLICT ("organizationId", "documentType") DO NOTHING
  `;

  // Atomically increment and return the new value
  const rows = await tx.$queryRaw<{ lastNumber: number }[]>`
    UPDATE document_sequences
    SET "lastNumber" = "lastNumber" + 1
    WHERE "organizationId" = ${organizationId} AND "documentType" = ${documentType}
    RETURNING "lastNumber" as "lastNumber"
  `;

  const lastNumber = rows[0]?.lastNumber;
  if (!lastNumber) throw new Error(`Failed to generate sequence for ${documentType}`);

  const num = lastNumber.toString().padStart(4, "0");
  return `${prefix}-${year}-${num}`;
}
