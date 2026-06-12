import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { SessionPayload } from "@/core/auth/session";

/**
 * Server-component permission guard.
 * Fetches live permissions from the DB via employeeId on every call, so role
 * reassignments and permission changes take effect immediately without re-login.
 * Redirects archived employees to /login, unauthorised employees to /dashboard.
 *
 * Use requirePermission() (throws Response) for server actions instead.
 */
export async function requirePagePermission(
  session: SessionPayload,
  permission: string
): Promise<void> {
  const employee = await db.employee.findUnique({
    where: { id: session.employeeId },
    select: {
      archivedAt: true,
      warehouseRole: {
        select: {
          permissions: {
            select: { permission: { select: { code: true } } },
          },
        },
      },
    },
  });

  if (!employee || employee.archivedAt) {
    redirect("/login");
  }

  const permissionCodes = employee.warehouseRole?.permissions.map((p) => p.permission.code) ?? [];

  if (!permissionCodes.includes(permission)) {
    redirect("/dashboard");
  }
}
