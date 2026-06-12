import { db } from "@/lib/db";
import type { SessionPayload } from "@/core/auth/session";

export async function requirePermission(
  session: SessionPayload,
  permission: string
): Promise<void> {
  const warehouseRoles = await db.warehouseRole.findMany({
    where: { warehouseId: session.warehouseId },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  const permissionCodes = warehouseRoles.flatMap((wr) =>
    wr.permissions.map((p) => p.permission.code)
  );

  if (!permissionCodes.includes(permission)) {
    throw new Response("Forbidden", { status: 403 });
  }
}
