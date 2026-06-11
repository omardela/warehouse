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

  // Query all roles for this warehouse and collect permission codes
  const warehouseRoles = await db.warehouseRole.findMany({
    where: { warehouseId: session.warehouseId },
    include: { permissions: { include: { permission: true } } },
  });

  const permissionCodes = warehouseRoles.flatMap((wr) =>
    wr.permissions.map((p) => p.permission.code)
  );

  // Query employee name/email
  const employee = await db.employee.findUnique({
    where: { id: session.employeeId },
    select: { name: true, email: true },
  });

  // Query warehouse name
  const warehouse = await db.warehouse.findUnique({
    where: { id: session.warehouseId },
    select: { name: true },
  });

  return (
    <DashboardShell
      session={session}
      permissionCodes={permissionCodes}
      employeeName={employee?.name ?? "User"}
      employeeEmail={employee?.email ?? ""}
      warehouseName={warehouse?.name ?? "Warehouse"}
    >
      {children}
    </DashboardShell>
  );
}
