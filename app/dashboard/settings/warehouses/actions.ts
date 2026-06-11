"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { writeAuditLog } from "@/core/audit/write-audit-log";

const warehouseSchema = z.object({
  name: z.string().min(1, "Facility name is required").max(100),
  address: z.string().max(255).optional(),
});

export type WarehouseActionState =
  | { success: true; warehouseId: string }
  | { success: true }
  | { error: string }
  | null;

export async function createWarehouseAction(
  _prevState: WarehouseActionState,
  formData: FormData
): Promise<WarehouseActionState> {
  const session = await getSession();
  if (!session) {
    return { error: "Unauthorized" };
  }

  const rawAddress = formData.get("address");
  const parsed = warehouseSchema.safeParse({
    name: formData.get("name"),
    address:
      typeof rawAddress === "string" && rawAddress.trim() !== ""
        ? rawAddress.trim()
        : undefined,
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const firstError =
      errors.name?.[0] ?? errors.address?.[0] ?? "Invalid form data";
    return { error: firstError };
  }

  const { name, address } = parsed.data;

  const warehouse = await db.warehouse.create({
    data: {
      name,
      address,
      organizationId: session.orgId,
    },
    select: { id: true },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "warehouse.create",
    entityType: "Warehouse",
    entityId: warehouse.id,
    after: { name, address },
  });

  revalidatePath("/dashboard/settings/warehouses");

  return { success: true, warehouseId: warehouse.id };
}

export async function updateWarehouseAction(
  _prevState: WarehouseActionState,
  formData: FormData
): Promise<WarehouseActionState> {
  const session = await getSession();
  if (!session) {
    return { error: "Unauthorized" };
  }

  const warehouseId = formData.get("warehouseId");
  if (!warehouseId || typeof warehouseId !== "string") {
    return { error: "Warehouse ID is required" };
  }

  const rawAddress = formData.get("address");
  const parsed = warehouseSchema.safeParse({
    name: formData.get("name"),
    address:
      typeof rawAddress === "string" && rawAddress.trim() !== ""
        ? rawAddress.trim()
        : undefined,
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const firstError =
      errors.name?.[0] ?? errors.address?.[0] ?? "Invalid form data";
    return { error: firstError };
  }

  const { name, address } = parsed.data;

  // Verify warehouse belongs to session's org
  const existing = await db.warehouse.findUnique({
    where: { id: warehouseId },
    select: { organizationId: true, name: true, address: true },
  });

  if (!existing || existing.organizationId !== session.orgId) {
    return { error: "Warehouse not found" };
  }

  await db.warehouse.update({
    where: { id: warehouseId },
    data: { name, address },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "warehouse.update",
    entityType: "Warehouse",
    entityId: warehouseId,
    before: { name: existing.name, address: existing.address },
    after: { name, address },
  });

  revalidatePath("/dashboard/settings/warehouses");

  return { success: true };
}
