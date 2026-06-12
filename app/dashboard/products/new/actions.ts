"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import type { ProductActionState } from "../ProductForm";

const conversionSchema = z.object({
  fromUnitId: z.string().min(1, "From unit is required"),
  toUnitId: z.string().min(1, "To unit is required"),
  factor: z.coerce
    .number({ message: "Factor must be a number" })
    .positive("Factor must be positive"),
});

const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  sku: z
    .string()
    .min(1, "SKU is required")
    .max(100)
    .regex(/^[a-zA-Z0-9\-_.]+$/, "SKU may only contain letters, numbers, hyphens, underscores, and dots"),
  description: z.string().max(2000).optional(),
  categoryId: z.string().optional(),
  defaultUnitId: z.string().min(1, "Base unit is required"),
  barcode: z.string().max(100).optional(),
  lowStockThreshold: z.coerce
    .number({ message: "Must be a number" })
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .default(10),
  conversions: z.array(conversionSchema).default([]),
});

export async function createProductAction(
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const conversionCount = parseInt(
    (formData.get("conversionCount") as string) ?? "0",
    10
  );
  const conversionsRaw: Array<{ fromUnitId: string; toUnitId: string; factor: string }> = [];

  for (let i = 0; i < conversionCount; i++) {
    const fromUnitId = formData.get(`conversion_fromUnitId_${i}`) as string;
    const toUnitId = formData.get(`conversion_toUnitId_${i}`) as string;
    const factor = formData.get(`conversion_factor_${i}`) as string;
    if (fromUnitId && toUnitId && factor) {
      conversionsRaw.push({ fromUnitId, toUnitId, factor });
    }
  }

  const rawBarcode = formData.get("barcode") as string;
  const rawCategoryId = formData.get("categoryId") as string;
  const rawDescription = formData.get("description") as string;

  const parsed = createProductSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    description: rawDescription?.trim() || undefined,
    categoryId: rawCategoryId?.trim() || undefined,
    defaultUnitId: formData.get("defaultUnitId"),
    barcode: rawBarcode?.trim() || undefined,
    lowStockThreshold: formData.get("lowStockThreshold") ?? 10,
    conversions: conversionsRaw,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    const firstMessage = Object.values(fieldErrors).flat()[0] ?? "Validation failed";
    return { error: firstMessage, fieldErrors };
  }

  const { name, sku, description, categoryId, defaultUnitId, barcode, lowStockThreshold, conversions } = parsed.data;

  if (barcode) {
    const existingBarcode = await db.product.findFirst({
      where: { barcode, organizationId: session.orgId },
      select: { id: true },
    });
    if (existingBarcode) {
      return {
        error: "A product with this barcode already exists in your organisation.",
        fieldErrors: { barcode: ["Barcode already in use"] },
      };
    }
  }

  if (categoryId) {
    const cat = await db.productCategory.findFirst({
      where: { id: categoryId, organizationId: session.orgId },
      select: { id: true },
    });
    if (!cat) return { error: "Invalid category" };
  }

  let product: { id: string };
  try {
    product = await db.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          name,
          sku,
          description,
          categoryId: categoryId || null,
          defaultUnitId,
          organizationId: session.orgId,
          barcode: barcode || null,
          lowStockThreshold,
        },
        select: { id: true },
      });

      if (conversions.length > 0) {
        await tx.productUnitConversion.createMany({
          data: conversions.map((c) => ({
            fromUnitId: c.fromUnitId,
            toUnitId: c.toUnitId,
            factor: c.factor,
            productId: p.id,
          })),
        });
      }

      return p;
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return {
        error: "A product with this SKU already exists.",
        fieldErrors: { sku: ["SKU already in use"] },
      };
    }
    throw err;
  }

  await writeAuditLog({
    actorId: session.employeeId,
    action: "inventory.product.create",
    entityType: "Product",
    entityId: product.id,
    after: { name, sku, barcode, lowStockThreshold, categoryId, defaultUnitId },
  });

  revalidatePath("/dashboard/products");

  return { success: true };
}
