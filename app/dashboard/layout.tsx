import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/shell";
import { getPermittedNotificationTypes } from "@/core/notifications/notification-permissions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch employee (with live role+permissions), warehouse, and available warehouses.
  // Notification count is fetched separately so it can be scoped to permitted types.
  const [employee, warehouse, availableWarehouses] = await Promise.all([
    db.employee.findUnique({
      where: { id: session.employeeId },
      select: {
        name: true,
        email: true,
        archivedAt: true,
        warehouseRole: {
          select: {
            permissions: {
              select: { permission: { select: { code: true } } },
            },
          },
        },
      },
    }),
    db.warehouse.findUnique({
      where: { id: session.warehouseId },
      select: { name: true },
    }),
    db.warehouse.findMany({
      where: { organizationId: session.orgId, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!employee || employee.archivedAt) {
    redirect("/login");
  }

  const permissionCodes = employee.warehouseRole?.permissions.map((p) => p.permission.code) ?? [];

  // Only count notifications whose type the current user has permission to see.
  const permittedTypes = getPermittedNotificationTypes(permissionCodes);
  const unreadNotificationCount =
    permittedTypes.length === 0
      ? 0
      : await db.notification.count({
          where: { warehouseId: session.warehouseId, readAt: null, type: { in: permittedTypes } },
        });

  return (
    <DashboardShell
      session={session}
      permissionCodes={permissionCodes}
      employeeName={employee.name ?? "User"}
      employeeEmail={employee.email ?? ""}
      warehouseName={warehouse?.name ?? "Warehouse"}
      availableWarehouses={availableWarehouses}
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </DashboardShell>
  );
}
