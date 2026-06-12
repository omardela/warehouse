import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { CreateRoleForm } from "./CreateRoleForm";

export default async function NewRolePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const assignedRoles = await db.warehouseRole.findMany({
    where: { warehouseId: session.warehouseId },
    select: { roleTemplateId: true },
  });
  const assignedTemplateIds = assignedRoles.map((r) => r.roleTemplateId);

  const availableTemplates = await db.roleTemplate.findMany({
    where:
      assignedTemplateIds.length > 0
        ? { id: { notIn: assignedTemplateIds } }
        : {},
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true },
  });

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
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
            href="/dashboard/settings/roles"
            style={{ color: "#8c90a2", textDecoration: "none" }}
          >
            Roles
          </Link>
          <span style={{ color: "#4a5068" }}>›</span>
          <span style={{ color: "#dbe2fd" }}>Add Role from Template</span>
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
            Add Role from Template
          </h1>
          <p style={{ marginTop: "6px", fontSize: "13px", color: "#8c90a2" }}>
            Select a predefined role template to assign to this warehouse.
            You&apos;ll be able to configure its permissions after creation.
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            backgroundColor: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "12px",
            padding: "24px",
          }}
        >
          <CreateRoleForm availableTemplates={availableTemplates} />
        </div>
      </div>
    </div>
  );
}
