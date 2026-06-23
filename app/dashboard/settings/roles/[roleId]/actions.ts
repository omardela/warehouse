"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import { requirePermission } from "@/core/auth/require-permission";
import { isOwnerRole } from "@/core/auth/owner-guard";
import { getLocale } from "@/core/i18n/locale";
import { getDictionary } from "@/core/i18n/get-dictionary";

export type UpdateRolePermissionsState =
  | { success: true }
  | { error: string }
  | null;

export type UpdateRoleNameState =
  | { success: true; name: string }
  | { error: string }
  | null;

export async function updateRolePermissionsAction(
  prevState: UpdateRolePermissionsState,
  formData: FormData
): Promise<UpdateRolePermissionsState> {
  const session = await getSession();
  const dict = getDictionary(await getLocale()).employees.roles;
  if (!session) {
    return { error: dict.unauthorized };
  }

  try {
    await requirePermission(session, "roles.role.update");
  } catch {
    return { error: dict.noPermissionUpdate };
  }

  const roleId = formData.get("roleId");
  if (!roleId || typeof roleId !== "string") {
    return { error: dict.roleIdRequired };
  }

  const warehouseRole = await db.warehouseRole.findUnique({
    where: { id: roleId },
    include: {
      permissions: {
        include: { permission: true },
      },
      roleTemplate: { select: { name: true } },
    },
  });

  if (!warehouseRole || warehouseRole.warehouseId !== session.warehouseId) {
    return { error: dict.roleNotFound };
  }

  if (isOwnerRole(warehouseRole.roleTemplate.name)) {
    return { error: dict.ownerPermissionsProtected };
  }

  const checkedPermissionIds = formData.getAll("permissions") as string[];

  if (checkedPermissionIds.length > 0) {
    const validPermissions = await db.permission.findMany({
      where: { id: { in: checkedPermissionIds } },
      select: { id: true, code: true },
    });

    if (validPermissions.length !== checkedPermissionIds.length) {
      return { error: dict.invalidPermissionsSelected };
    }
  }

  const beforeCodes = warehouseRole.permissions.map((p) => p.permission.code);

  let afterCodes: string[] = [];
  if (checkedPermissionIds.length > 0) {
    const afterPerms = await db.permission.findMany({
      where: { id: { in: checkedPermissionIds } },
      select: { code: true },
    });
    afterCodes = afterPerms.map((p) => p.code);
  }

  await db.$transaction([
    db.warehouseRolePermission.deleteMany({
      where: { warehouseRoleId: roleId },
    }),
    ...(checkedPermissionIds.length > 0
      ? [
          db.warehouseRolePermission.createMany({
            data: checkedPermissionIds.map((permissionId) => ({
              warehouseRoleId: roleId,
              permissionId,
            })),
          }),
        ]
      : []),
  ]);

  await writeAuditLog({
    actorId: session.employeeId,
    action: "roles.role.update",
    entityType: "WarehouseRole",
    entityId: roleId,
    before: { permissions: beforeCodes, roleName: warehouseRole.roleTemplate.name },
    after: { permissions: afterCodes, roleName: warehouseRole.roleTemplate.name },
    warehouseId: session.warehouseId,
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings/roles");
  revalidatePath(`/dashboard/settings/roles/${roleId}`);

  // Suppress unused warning
  void prevState;

  return { success: true };
}

export async function updateRoleNameAction(
  _prevState: UpdateRoleNameState,
  formData: FormData
): Promise<UpdateRoleNameState> {
  const session = await getSession();
  const dict = getDictionary(await getLocale()).employees.roles;
  if (!session) return { error: dict.unauthorized };

  try {
    await requirePermission(session, "roles.role.update");
  } catch {
    return { error: dict.noPermissionUpdateRoles };
  }

  const roleId = formData.get("roleId");
  if (!roleId || typeof roleId !== "string") return { error: dict.roleIdRequiredDot };

  const rawName = formData.get("roleName");
  if (!rawName || typeof rawName !== "string" || rawName.trim().length === 0) {
    return { error: dict.roleNameRequired };
  }
  const trimmedName = rawName.trim();
  if (trimmedName.length > 50) return { error: dict.roleNameTooLong };

  if (isOwnerRole(trimmedName)) {
    return { error: dict.ownerNameReserved };
  }

  const warehouseRole = await db.warehouseRole.findUnique({
    where: { id: roleId },
    include: { roleTemplate: { select: { id: true, name: true } } },
  });

  if (!warehouseRole || warehouseRole.warehouseId !== session.warehouseId) {
    return { error: dict.roleNotFoundDot };
  }

  if (isOwnerRole(warehouseRole.roleTemplate.name)) {
    return { error: dict.ownerNameProtected };
  }

  const conflict = await db.roleTemplate.findUnique({ where: { name: trimmedName } });
  if (conflict && conflict.id !== warehouseRole.roleTemplate.id) {
    return { error: dict.roleNameConflict.replace("{name}", trimmedName) };
  }

  const beforeName = warehouseRole.roleTemplate.name;

  await db.roleTemplate.update({
    where: { id: warehouseRole.roleTemplate.id },
    data: { name: trimmedName },
  });

  await writeAuditLog({
    actorId: session.employeeId,
    action: "roles.role.update",
    entityType: "RoleTemplate",
    entityId: warehouseRole.roleTemplate.id,
    before: { name: beforeName },
    after: { name: trimmedName },
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings/roles");
  revalidatePath(`/dashboard/settings/roles/${roleId}`);

  return { success: true, name: trimmedName };
}
