import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { RolePermissionForm } from "./RolePermissionForm";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { isOwnerRole } from "@/core/auth/owner-guard";
import { getLocale } from "@/core/i18n/locale";
import { getDictionary } from "@/core/i18n/get-dictionary";

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;

  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  await requirePagePermission(session, "roles.role.update");

  const locale = await getLocale();
  const t = getDictionary(locale).employees.roles;

  const warehouseRole = await db.warehouseRole.findUnique({
    where: { id: roleId },
    include: {
      roleTemplate: true,
      permissions: {
        include: { permission: true },
      },
    },
  });

  if (!warehouseRole || warehouseRole.warehouseId !== session.warehouseId) {
    notFound();
  }

  const allPermissions = await db.permission.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, description: true },
  });

  const assignedPermissionIds = warehouseRole.permissions.map(
    (p) => p.permissionId
  );

  const isOwner = isOwnerRole(warehouseRole.roleTemplate.name);

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
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
          <span style={{ color: "#dbe2fd" }}>
            {warehouseRole.roleTemplate.name}
          </span>
        </nav>

        {/* Page header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "24px",
            gap: "16px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h1
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "#dbe2fd",
                  margin: 0,
                }}
              >
                {warehouseRole.roleTemplate.name}
              </h1>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(0,98,255,0.15)",
                  color: "#6699ff",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                {t.permissionsCount.replace("{count}", String(warehouseRole.permissions.length))}
              </span>
              {isOwner && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    backgroundColor: "rgba(245,158,11,0.15)",
                    color: "#f59e0b",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  {t.systemProtected}
                </span>
              )}
            </div>
            {warehouseRole.roleTemplate.description && (
              <p
                style={{
                  marginTop: "6px",
                  fontSize: "13px",
                  color: "#8c90a2",
                  maxWidth: "540px",
                }}
              >
                {warehouseRole.roleTemplate.description}
              </p>
            )}
          </div>
        </div>

        <RolePermissionForm
          roleId={roleId}
          roleName={warehouseRole.roleTemplate.name}
          isOwner={isOwner}
          allPermissions={allPermissions}
          assignedPermissionIds={assignedPermissionIds}
        />
      </div>
    </div>
  );
}
