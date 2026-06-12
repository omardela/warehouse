import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";

export default async function RolesPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  await requirePagePermission(session, "roles.role.read");

  const warehouseRoles = await db.warehouseRole.findMany({
    where: { warehouseId: session.warehouseId },
    include: {
      roleTemplate: true,
      _count: { select: { permissions: true } },
    },
    orderBy: { roleTemplate: { name: "asc" } },
  });

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
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
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#dbe2fd",
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              Roles &amp; Permissions
            </h1>
            <p style={{ marginTop: "6px", fontSize: "13px", color: "#8c90a2" }}>
              Manage system access, functional restrictions, and security
              parameters for your warehouse.
            </p>
          </div>
          <Link
            href="/dashboard/settings/roles/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              backgroundColor: "#0062ff",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "opacity 0.15s",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7 1.5V12.5M1.5 7H12.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Add Role
          </Link>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          {[
            { label: "Total Roles", value: warehouseRoles.length },
            {
              label: "Total Permissions",
              value: warehouseRoles.reduce(
                (acc, r) => acc + r._count.permissions,
                0
              ),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                backgroundColor: "#171f33",
                border: "1px solid #222a3e",
                borderRadius: "10px",
                padding: "16px 20px",
              }}
            >
              <p style={{ fontSize: "11px", color: "#8c90a2", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                {stat.label}
              </p>
              <p
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  color: "#dbe2fd",
                  margin: "4px 0 0",
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Roles table */}
        <div
          style={{
            backgroundColor: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          {warehouseRoles.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "64px 24px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(0,98,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M12 2L4 6V12C4 16.418 7.582 20.418 12 22C16.418 20.418 20 16.418 20 12V6L12 2Z"
                    stroke="#0062ff"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 12L11 14L15 10"
                    stroke="#0062ff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#dbe2fd",
                  margin: 0,
                }}
              >
                No roles configured
              </p>
              <p
                style={{
                  marginTop: "6px",
                  fontSize: "13px",
                  color: "#8c90a2",
                }}
              >
                Add a role from the available templates to get started.
              </p>
              <Link
                href="/dashboard/settings/roles/new"
                style={{
                  marginTop: "16px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  backgroundColor: "#0062ff",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                + Add Role from Template
              </Link>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Role Name", "Description", "Permissions", "Actions"].map(
                    (col) => (
                      <th
                        key={col}
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          fontSize: "11px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: "#8c90a2",
                          borderBottom: "1px solid #222a3e",
                          backgroundColor: "#171f33",
                        }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {warehouseRoles.map((role, idx) => (
                  <tr
                    key={role.id}
                    style={{
                      borderBottom:
                        idx < warehouseRoles.length - 1
                          ? "1px solid #222a3e"
                          : "none",
                    }}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            backgroundColor: "rgba(0,98,255,0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                          >
                            <circle
                              cx="8"
                              cy="8"
                              r="2"
                              stroke="#0062ff"
                              strokeWidth="1.5"
                            />
                            <path
                              d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5"
                              stroke="#0062ff"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#dbe2fd",
                          }}
                        >
                          {role.roleTemplate.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#8c90a2",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {role.roleTemplate.description ?? (
                          <span style={{ color: "#4a5068" }}>
                            No description
                          </span>
                        )}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "3px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: 600,
                          backgroundColor: "rgba(0,98,255,0.12)",
                          color: "#6699ff",
                        }}
                      >
                        {role._count.permissions}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <Link
                        href={`/dashboard/settings/roles/${role.id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "1px solid #2d3449",
                          color: "#8c90a2",
                          fontSize: "12px",
                          fontWeight: 500,
                          textDecoration: "none",
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Edit Permissions
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
