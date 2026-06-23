"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import { requirePermission } from "@/core/auth/require-permission";
import { isOwnerRole } from "@/core/auth/owner-guard";
import { getLocale } from "@/core/i18n/locale";
import { getDictionary } from "@/core/i18n/get-dictionary";

export type CreateRoleActionState =
  | { success: true; roleId: string }
  | { error: string }
  | null;

export async function createWarehouseRoleAction(
  _prevState: CreateRoleActionState,
  formData: FormData
): Promise<CreateRoleActionState> {
  const session = await getSession();
  const dict = getDictionary(await getLocale()).employees.roles;
  if (!session) {
    return { error: dict.unauthorized };
  }

  try {
    await requirePermission(session, "roles.role.create");
  } catch {
    return { error: dict.noPermissionCreate };
  }

  const createRoleSchema = z.object({
    roleTemplateId: z.string().min(1, dict.templateRequired),
  });

  const parsed = createRoleSchema.safeParse({
    roleTemplateId: formData.get("roleTemplateId"),
  });

  if (!parsed.success) {
    const firstError =
      parsed.error.flatten().fieldErrors.roleTemplateId?.[0] ??
      dict.invalidFormData;
    return { error: firstError };
  }

  const { roleTemplateId } = parsed.data;

  const template = await db.roleTemplate.findUnique({
    where: { id: roleTemplateId },
    select: { id: true, name: true },
  });

  if (!template) {
    return { error: dict.templateNotFound };
  }

  if (isOwnerRole(template.name)) {
    return { error: dict.ownerTemplateProtected };
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
    return { error: dict.templateAlreadyAssigned };
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
