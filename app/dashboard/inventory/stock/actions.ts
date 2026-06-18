"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/require-permission";
import { writeAuditLog } from "@/core/audit/write-audit-log";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UpdateReorderSettingsState =
  | { success: true }
  | { error: string }
  | null;

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const nonNegativeIntOptional = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    if (typeof val === "string") {
      const n = Number(val);
      return Number.isNaN(n) ? val : n;
    }
    return val;
  },
  z
    .number()
    .int("Must be a whole number")
    .nonnegative("Must be zero or greater")
    .optional()
);

const updateReorderSettingsSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  reorderPoint: nonNegativeIntOptional,
  reorderQty: nonNegativeIntOptional,
});

// ---------------------------------------------------------------------------
// updateReorderSettingsAction
// ---------------------------------------------------------------------------

export async function updateReorderSettingsAction(
  _prevState: UpdateReorderSettingsState,
  formData: FormData
): Promise<UpdateReorderSettingsState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "inventory.stock.manage");
  } catch {
    return { error: "You do not have permission to manage reorder settings." };
  }

  const parsed = updateReorderSettingsSchema.safeParse({
    productId: formData.get("productId"),
    warehouseId: formData.get("warehouseId"),
    reorderPoint: formData.get("reorderPoint"),
    reorderQty: formData.get("reorderQty"),
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      error:
        errors.reorderPoint?.[0] ?? errors.reorderQty?.[0] ?? "Invalid form data",
    };
  }

  const { productId, warehouseId, reorderPoint, reorderQty } = parsed.data;

  // Validate the product and warehouse belong to this org.
  const [product, warehouse] = await Promise.all([
    db.product.findUnique({
      where: { id: productId },
      select: { id: true, organizationId: true, name: true },
    }),
    db.warehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true, organizationId: true },
    }),
  ]);

  if (!product || product.organizationId !== session.orgId) {
    return { error: "Product not found." };
  }
  if (!warehouse || warehouse.organizationId !== session.orgId) {
    return { error: "Warehouse not found." };
  }

  const existing = await db.inventoryBalance.findUnique({
    where: { warehouseId_productId: { warehouseId, productId } },
    select: { reorderPoint: true, reorderQty: true },
  });

  const balance = await db.inventoryBalance.upsert({
    where: { warehouseId_productId: { warehouseId, productId } },
    create: {
      warehouseId,
      productId,
      currentQuantity: 0,
      reorderPoint: reorderPoint ?? null,
      reorderQty: reorderQty ?? null,
    },
    update: {
      reorderPoint: reorderPoint ?? null,
      reorderQty: reorderQty ?? null,
    },
    select: { id: true },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "inventory.stock.reorder-settings.update",
    entityType: "InventoryBalance",
    entityId: balance.id,
    before: {
      reorderPoint: existing?.reorderPoint ?? null,
      reorderQty: existing?.reorderQty ?? null,
    },
    after: {
      reorderPoint: reorderPoint ?? null,
      reorderQty: reorderQty ?? null,
    },
  });

  revalidatePath("/dashboard/inventory/stock");
  revalidatePath("/dashboard/reports/low-stock");

  return { success: true };
}
