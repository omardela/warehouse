"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import { requirePermission } from "@/core/auth/require-permission";

const createRoleSchema = z.object({
  roleTemplateId: z.string().min(1, "Please select a role template"),
});

export type CreateRoleActionState =
  | { success: true; roleId: string }
  | { error: string }
  | null;

export async function createWarehouseRoleAction(
  _prevState: CreateRoleActionState,
  formData: FormData
): Promise<CreateRoleActionState> {
  const session = await getSession();
  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    await requirePermission(session, "roles.role.create");
  } catch {
    return { error: "You do not have permission to create roles" };
  }

  const parsed = createRoleSchema.safeParse({
    roleTemplateId: formData.get("roleTemplateId"),
  });

  if (!parsed.success) {
    const firstError =
      parsed.error.flatten().fieldErrors.roleTemplateId?.[0] ??
      "Invalid form data";
    return { error: firstError };
  }

  const { roleTemplateId } = parsed.data;

  const template = await db.roleTemplate.findUnique({
    where: { id: roleTemplateId },
    select: { id: true, name: true },
  });

  if (!template) {
    return { error: "Role template not found" };
  }

  const existing = await db.warehouseRole.findUnique({
    where: {
      warehouseId_roleTemplateId: {
        warehouseId: session.warehouseId,
        roleTemplateId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return { error: "This role template is already assigned to your warehouse" };
  }

  const warehouseRole = await db.warehouseRole.create({
    data: {
      warehouseId: session.warehouseId,
      roleTemplateId,
    },
    select: { id: true },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "roles.role.create",
    entityType: "WarehouseRole",
    entityId: warehouseRole.id,
    after: { roleTemplateName: template.name, roleTemplateId },
    warehouseId: session.warehouseId,
  });

  revalidatePath("/dashboard/settings/roles");

  return { success: true, roleId: warehouseRole.id };
}
