"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

const updateProductSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  name: z.string().min(1, "Product name is required").max(200),
  description: z.string().max(2000).optional(),
  categoryId: z.string().optional(),
  barcode: z.string().max(100).optional(),
  lowStockThreshold: z.coerce
    .number({ message: "Must be a number" })
    .int("Must be a whole number")
    .min(0, "Cannot be negative")
    .default(10),
  conversions: z.array(conversionSchema).default([]),
});

export async function updateProductAction(
  _prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const conversionCount = parseInt((formData.get("conversionCount") as string) ?? "0", 10);
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

  const parsed = updateProductSchema.safeParse({
    productId: formData.get("productId"),
    name: formData.get("name"),
    description: rawDescription?.trim() || undefined,
    categoryId: rawCategoryId?.trim() || undefined,
    barcode: rawBarcode?.trim() || undefined,
    lowStockThreshold: formData.get("lowStockThreshold") ?? 10,
    conversions: conversionsRaw,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    const firstMessage = Object.values(fieldErrors).flat()[0] ?? "Validation failed";
    return { error: firstMessage, fieldErrors };
  }

  const { productId, name, description, categoryId, barcode, lowStockThreshold, conversions } = parsed.data;

  const existing = await db.product.findUnique({
    where: { id: productId },
    include: { conversions: true },
  });

  if (!existing || existing.organizationId !== session.orgId) {
    return { error: "Product not found" };
  }

  if (barcode && barcode !== existing.barcode) {
    const conflict = await db.product.findFirst({
      where: { barcode, organizationId: session.orgId, NOT: { id: productId } },
      select: { id: true },
    });
    if (conflict) {
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

  const before = {
    name: existing.name,
    description: existing.description,
    categoryId: existing.categoryId,
    barcode: existing.barcode,
    lowStockThreshold: existing.lowStockThreshold,
  };

  await db.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: { name, description: description || null, categoryId: categoryId || null, barcode: barcode || null, lowStockThreshold },
    });

    await tx.productUnitConversion.deleteMany({ where: { productId } });

    if (conversions.length > 0) {
      await tx.productUnitConversion.createMany({
        data: conversions.map((c) => ({ fromUnitId: c.fromUnitId, toUnitId: c.toUnitId, factor: c.factor, productId })),
      });
    }
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "inventory.product.update",
    entityType: "Product",
    entityId: productId,
    before: before as Record<string, unknown>,
    after: { name, description, categoryId, barcode, lowStockThreshold },
  });

  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${productId}`);

  return { success: true };
}

export async function archiveProductAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const productId = formData.get("productId") as string;
  if (!productId) return;

  const existing = await db.product.findUnique({
    where: { id: productId },
    select: { organizationId: true, archivedAt: true, name: true, sku: true },
  });

  if (!existing || existing.organizationId !== session.orgId || existing.archivedAt) return;

  await db.product.update({ where: { id: productId }, data: { archivedAt: new Date() } });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "inventory.product.delete",
    entityType: "Product",
    entityId: productId,
    before: { name: existing.name, sku: existing.sku, archivedAt: null },
    after: { archivedAt: new Date().toISOString() },
  });

  revalidatePath("/dashboard/products");
  redirect("/dashboard/products");
}

export async function unarchiveProductAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const productId = formData.get("productId") as string;
  if (!productId) return;

  const existing = await db.product.findUnique({
    where: { id: productId },
    select: { organizationId: true, name: true, sku: true },
  });

  if (!existing || existing.organizationId !== session.orgId) return;

  await db.product.update({ where: { id: productId }, data: { archivedAt: null } });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "inventory.product.update",
    entityType: "Product",
    entityId: productId,
    before: { archivedAt: "archived" },
    after: { archivedAt: null, name: existing.name },
  });

  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${productId}`);
  redirect(`/dashboard/products/${productId}`);
}
