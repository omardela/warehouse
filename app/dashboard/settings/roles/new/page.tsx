import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { CreateRoleForm } from "./CreateRoleForm";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { OWNER_ROLE_NAME } from "@/core/auth/owner-guard";
import { getLocale } from "@/core/i18n/locale";
import { getDictionary } from "@/core/i18n/get-dictionary";

export default async function NewRolePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  await requirePagePermission(session, "roles.role.create");

  const locale = await getLocale();
  const t = getDictionary(locale).employees.roles;

  const assignedRoles = await db.warehouseRole.findMany({
    where: { warehouseId: session.warehouseId },
    select: { roleTemplateId: true },
  });
  const assignedTemplateIds = assignedRoles.map((r) => r.roleTemplateId);

  const availableTemplates = await db.roleTemplate.findMany({
    where: {
      name: { not: OWNER_ROLE_NAME },
      ...(assignedTemplateIds.length > 0 ? { id: { notIn: assignedTemplateIds } } : {}),
    },
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
            {t.breadcrumbRoles}
          </Link>
          <span style={{ color: "#4a5068" }}>›</span>
          <span style={{ color: "#dbe2fd" }}>{t.breadcrumbAdd}</span>
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
            {t.newPageTitle}
          </h1>
          <p style={{ marginTop: "6px", fontSize: "13px", color: "#8c90a2" }}>
            {t.newPageSubtitle}
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
