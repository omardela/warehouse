import type { PrismaClient } from "@prisma/client";

type QueryClient = Pick<PrismaClient, "productUnitConversion">;

/**
 * Converts an invoice line quantity from its recorded unit to the product's
 * default unit (the unit InventoryBalance.currentQuantity is stored in).
 *
 * Lookup order:
 *  1. Direct product-specific conversion:  lineUnit  → defaultUnit  (multiply)
 *  2. Direct global conversion:            lineUnit  → defaultUnit  (multiply)
 *  3. Inverse product-specific conversion: defaultUnit → lineUnit   (divide)
 *  4. Inverse global conversion:           defaultUnit → lineUnit   (divide)
 *
 * Returns quantity unchanged when lineUnitId === defaultUnitId.
 * Throws if no conversion path is configured.
 */
export async function resolveBaseQuantity(
  client: QueryClient,
  productId: string,
  defaultUnitId: string,
  lineUnitId: string,
  quantity: number
): Promise<number> {
  if (lineUnitId === defaultUnitId) return quantity;

  // Direct: lineUnit → defaultUnit (product-specific)
  let conv = await client.productUnitConversion.findFirst({
    where: { fromUnitId: lineUnitId, toUnitId: defaultUnitId, productId },
    select: { factor: true },
  });
  if (conv) return quantity * Number(conv.factor);

  // Direct: lineUnit → defaultUnit (global fallback)
  conv = await client.productUnitConversion.findFirst({
    where: { fromUnitId: lineUnitId, toUnitId: defaultUnitId, productId: null },
    select: { factor: true },
  });
  if (conv) return quantity * Number(conv.factor);

  // Inverse: defaultUnit → lineUnit (product-specific) — divide to get base qty
  conv = await client.productUnitConversion.findFirst({
    where: { fromUnitId: defaultUnitId, toUnitId: lineUnitId, productId },
    select: { factor: true },
  });
  if (conv && Number(conv.factor) !== 0) return quantity / Number(conv.factor);

  // Inverse: defaultUnit → lineUnit (global fallback)
  conv = await client.productUnitConversion.findFirst({
    where: { fromUnitId: defaultUnitId, toUnitId: lineUnitId, productId: null },
    select: { factor: true },
  });
  if (conv && Number(conv.factor) !== 0) return quantity / Number(conv.factor);

  throw new Error(
    `No unit conversion configured from unit "${lineUnitId}" to default unit "${defaultUnitId}" ` +
      `for product "${productId}". Configure the conversion in the product settings.`
  );
}
