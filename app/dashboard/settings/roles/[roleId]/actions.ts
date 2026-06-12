"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";
import { writeAuditLog } from "@/core/audit/write-audit-log";
import { requirePermission } from "@/core/auth/require-permission";

export type UpdateRolePermissionsState =
  | { success: true }
  | { error: string }
  | null;

export async function updateRolePermissionsAction(
  prevState: UpdateRolePermissionsState,
  formData: FormData
): Promise<UpdateRolePermissionsState> {
  const session = await getSession();
  if (!session) {
    return { error: "Unauthorized" };
  }

  try {
    await requirePermission(session, "roles.role.update");
  } catch {
    return { error: "You do not have permission to update role permissions" };
  }

  const roleId = formData.get("roleId");
  if (!roleId || typeof roleId !== "string") {
    return { error: "Role ID is required" };
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
    return { error: "Role not found or access denied" };
  }

  const checkedPermissionIds = formData.getAll("permissions") as string[];

  if (checkedPermissionIds.length > 0) {
    const validPermissions = await db.permission.findMany({
      where: { id: { in: checkedPermissionIds } },
      select: { id: true, code: true },
    });

    if (validPermissions.length !== checkedPermissionIds.length) {
      return { error: "One or more invalid permissions selected" };
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

  revalidatePath("/dashboard/settings/roles");
  revalidatePath(`/dashboard/settings/roles/${roleId}`);

  // Suppress unused warning
  void prevState;

  return { success: true };
}
