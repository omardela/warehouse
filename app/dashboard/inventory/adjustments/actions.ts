"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/require-permission";
import { recordMovement } from "@/core/inventory/record-movement";

const adjustmentSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  unitId: z.string().min(1, "Unit is required"),
  adjustmentType: z.enum(["ADD", "REMOVE"], {
    required_error: "Adjustment type is required",
  }),
  quantity: z
    .string()
    .min(1, "Quantity is required")
    .transform((v) => parseFloat(v))
    .pipe(z.number().positive("Quantity must be greater than 0")),
  notes: z.string().min(1, "Reason / justification is required").max(500),
});

export type AdjustmentActionState =
  | { success: true }
  | { error: string }
  | null;

export async function createAdjustmentAction(
  _prevState: AdjustmentActionState,
  formData: FormData
): Promise<AdjustmentActionState> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    await requirePermission(session, "inventory.movement.create");
  } catch {
    return { error: "You do not have permission to create stock adjustments." };
  }

  const raw = {
    productId: formData.get("productId"),
    unitId: formData.get("unitId"),
    adjustmentType: formData.get("adjustmentType"),
    quantity: formData.get("quantity"),
    notes: formData.get("notes"),
  };

  const parsed = adjustmentSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const firstError =
      errors.productId?.[0] ??
      errors.unitId?.[0] ??
      errors.adjustmentType?.[0] ??
      errors.quantity?.[0] ??
      errors.notes?.[0] ??
      "Invalid form data";
    return { error: firstError };
  }

  const { productId, unitId, adjustmentType, quantity, notes } = parsed.data;

  // For adjustments the display unit IS the default unit (we only allow default unit adjustments).
  // baseQuantity = quantity (since unit === defaultUnit).
  // For REMOVE, quantity is negative in the ledger.
  const signedBaseQty = adjustmentType === "ADD" ? quantity : -quantity;

  try {
    await recordMovement({
      warehouseId: session.warehouseId,
      productId,
      unitId,
      quantity: signedBaseQty, // display qty with sign
      baseQuantity: signedBaseQty, // same unit as default
      movementType: "ADJUSTMENT",
      actorId: session.employeeId,
      notes,
      allowNegative: false,
    });
  } catch (err: unknown) {
    if (err instanceof Error) return { error: err.message };
    return { error: "Failed to record adjustment. Please try again." };
  }

  revalidatePath("/dashboard/inventory/movements");
  revalidatePath("/dashboard/inventory/stock");

  return { success: true };
}
