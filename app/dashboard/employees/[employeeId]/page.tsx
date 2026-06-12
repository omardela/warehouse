import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { EmployeeDetailForm } from "./EmployeeDetailForm";
import { isOwnerRole } from "@/core/auth/owner-guard";

interface PageProps {
  params: Promise<{ employeeId: string }>;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function EmployeeDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "employees.employee.read");

  const { employeeId } = await params;

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: {
      warehouseRole: {
        include: { roleTemplate: { select: { name: true } } },
      },
    },
  });

  if (!employee || employee.warehouseId !== session.warehouseId) {
    notFound();
  }

  // Fetch roles for this warehouse
  const warehouseRoles = await db.warehouseRole.findMany({
    where: { warehouseId: session.warehouseId },
    include: { roleTemplate: { select: { name: true } } },
    orderBy: { roleTemplate: { name: "asc" } },
  });

  const roles = warehouseRoles.map((wr) => ({
    id: wr.id,
    name: wr.roleTemplate.name,
  }));

  // Check permissions live from DB
  const sessionRole = await db.warehouseRole.findUnique({
    where: { id: session.warehouseRoleId },
    include: { permissions: { include: { permission: true } } },
  });
  const permCodes =
    sessionRole?.permissions.map((p) => p.permission.code) ?? [];

  const isOwnerEmployee = isOwnerRole(employee.warehouseRole?.roleTemplate.name);
  const canAssignRole = !isOwnerEmployee && permCodes.includes("employees.employee.update");
  const canArchive = !isOwnerEmployee && permCodes.includes("employees.employee.archive");

  const isArchived = employee.archivedAt !== null;
  const isSelf = employee.id === session.employeeId;
  const initials = getInitials(employee.name);

  return (
    <div
      style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}
    >
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
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
          <span style={{ color: "#dbe2fd" }}>{employee.name}</span>
        </nav>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "28px",
            flexWrap: "wrap",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              backgroundColor: isArchived
                ? "rgba(74,80,104,0.3)"
                : "rgba(0,98,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "18px",
              fontWeight: 700,
              color: isArchived ? "#4a5068" : "#6b9fff",
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <h1
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: isArchived ? "#8c90a2" : "#dbe2fd",
                  margin: 0,
                }}
              >
                {employee.name}
              </h1>
              {isArchived ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 600,
                    backgroundColor: "rgba(140,144,162,0.12)",
                    color: "#8c90a2",
                  }}
                >
                  Archived
                </span>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 600,
                    backgroundColor: "rgba(98,223,125,0.1)",
                    color: "#62df7d",
                  }}
                >
                  Active
                </span>
              )}
              {isSelf && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 600,
                    backgroundColor: "rgba(0,98,255,0.12)",
                    color: "#6b9fff",
                  }}
                >
                  You
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: "13px",
                color: "#8c90a2",
                margin: "4px 0 0",
              }}
            >
              {employee.email}
            </p>
          </div>
        </div>

        {/* Personal Information (read-only) */}
        <div
          style={{
            backgroundColor: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#dbe2fd",
              margin: "0 0 20px",
              paddingBottom: "12px",
              borderBottom: "1px solid #222a3e",
            }}
          >
            Personal Information
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#8c90a2",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  margin: "0 0 6px",
                }}
              >
                Full Name
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "#dbe2fd",
                  margin: 0,
                  fontWeight: 500,
                }}
              >
                {employee.name}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#8c90a2",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  margin: "0 0 6px",
                }}
              >
                Email Address
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "#dbe2fd",
                  margin: 0,
                  fontFamily: "monospace",
                }}
              >
                {employee.email}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#8c90a2",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  margin: "0 0 6px",
                }}
              >
                Joined
              </p>
              <p style={{ fontSize: "14px", color: "#8c90a2", margin: 0 }}>
                {new Date(employee.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            {isArchived && employee.archivedAt && (
              <div>
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#8c90a2",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    margin: "0 0 6px",
                  }}
                >
                  Archived On
                </p>
                <p style={{ fontSize: "14px", color: "#f43f5e", margin: 0 }}>
                  {new Date(employee.archivedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Interactive forms (role + archive) */}
        <EmployeeDetailForm
          employeeId={employee.id}
          currentRoleId={employee.warehouseRoleId}
          roles={roles}
          isArchived={isArchived}
          canAssignRole={canAssignRole}
          canArchive={canArchive}
          isSelf={isSelf}
          isOwner={isOwnerEmployee}
        />
      </div>
    </div>
  );
}
