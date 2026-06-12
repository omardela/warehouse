import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch employee (with live role+permissions), warehouse, and available warehouses
  // in parallel. Permissions are resolved via employeeId so role reassignments
  // and permission changes apply immediately without requiring re-login.
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

  return (
    <DashboardShell
      session={session}
      permissionCodes={permissionCodes}
      employeeName={employee.name ?? "User"}
      employeeEmail={employee.email ?? ""}
      warehouseName={warehouse?.name ?? "Warehouse"}
      availableWarehouses={availableWarehouses}
    >
      {children}
    </DashboardShell>
  );
}
