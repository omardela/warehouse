import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { isOwnerRole } from "@/core/auth/owner-guard";
import { EmployeeForm } from "../EmployeeForm";

export default async function NewEmployeePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "employees.employee.create");

  const warehouseRoles = await db.warehouseRole.findMany({
    where: { warehouseId: session.warehouseId },
    include: { roleTemplate: { select: { name: true } } },
    orderBy: { roleTemplate: { name: "asc" } },
  });

  const roles = warehouseRoles
    .map((wr) => ({ id: wr.id, name: wr.roleTemplate.name }))
    .filter((r) => !isOwnerRole(r.name));

  return (
    <div
      style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}
    >
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        {/* Breadcrumb */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            color: "#8c90a2",
            marginBottom: "20px",
          }}
        >
          <Link
            href="/dashboard/employees"
            style={{ color: "#8c90a2", textDecoration: "none" }}
          >
            Employees
          </Link>
          <span style={{ color: "#4a5068" }}>›</span>
          <span style={{ color: "#dbe2fd" }}>Add Employee</span>
        </nav>

        {/* Page header */}
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#dbe2fd",
              margin: 0,
            }}
          >
            Add New Employee
          </h1>
          <p style={{ marginTop: "6px", fontSize: "13px", color: "#8c90a2" }}>
            Create a new employee account for this warehouse. They will be able
            to log in with the email and temporary password you set.
          </p>
        </div>

        <EmployeeForm roles={roles} />
      </div>
    </div>
  );
}
