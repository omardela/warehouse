import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { getLocale } from "@/core/i18n/locale";
import { getDictionary } from "@/core/i18n/get-dictionary";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    archived?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 20;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic avatar color based on first letter
function getAvatarColor(name: string): { bg: string; color: string } {
  const first = name.trim()[0]?.toLowerCase() ?? "a";
  const colors: Record<string, { bg: string; color: string }> = {
    a: { bg: "rgba(0,98,255,0.18)", color: "#6b9fff" },
    b: { bg: "rgba(98,223,125,0.15)", color: "#62df7d" },
    c: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    d: { bg: "rgba(167,139,250,0.15)", color: "#a78bfa" },
    e: { bg: "rgba(244,63,94,0.15)", color: "#f43f5e" },
    f: { bg: "rgba(14,165,233,0.15)", color: "#0ea5e9" },
    g: { bg: "rgba(234,179,8,0.15)", color: "#eab308" },
    h: { bg: "rgba(168,85,247,0.15)", color: "#a855f7" },
    i: { bg: "rgba(20,184,166,0.15)", color: "#14b8a6" },
    j: { bg: "rgba(249,115,22,0.15)", color: "#f97316" },
    k: { bg: "rgba(0,98,255,0.18)", color: "#6b9fff" },
    l: { bg: "rgba(98,223,125,0.15)", color: "#62df7d" },
    m: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    n: { bg: "rgba(167,139,250,0.15)", color: "#a78bfa" },
    o: { bg: "rgba(244,63,94,0.15)", color: "#f43f5e" },
    p: { bg: "rgba(14,165,233,0.15)", color: "#0ea5e9" },
    q: { bg: "rgba(234,179,8,0.15)", color: "#eab308" },
    r: { bg: "rgba(168,85,247,0.15)", color: "#a855f7" },
    s: { bg: "rgba(20,184,166,0.15)", color: "#14b8a6" },
    t: { bg: "rgba(249,115,22,0.15)", color: "#f97316" },
    u: { bg: "rgba(0,98,255,0.18)", color: "#6b9fff" },
    v: { bg: "rgba(98,223,125,0.15)", color: "#62df7d" },
    w: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    x: { bg: "rgba(167,139,250,0.15)", color: "#a78bfa" },
    y: { bg: "rgba(244,63,94,0.15)", color: "#f43f5e" },
    z: { bg: "rgba(14,165,233,0.15)", color: "#0ea5e9" },
  };
  return colors[first] ?? { bg: "rgba(0,98,255,0.18)", color: "#6b9fff" };
}

export default async function EmployeesPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "employees.employee.read");

  const locale = await getLocale();
  const t = getDictionary(locale).employees.list;

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const showArchived = params.archived === "1";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const baseWhere = {
    warehouseId: session.warehouseId,
    ...(showArchived ? {} : { archivedAt: null as null }),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [employees, total, totalActive, recentCount] = await Promise.all([
    db.employee.findMany({
      where: baseWhere,
      include: {
        warehouseRole: {
          include: { roleTemplate: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.employee.count({ where: baseWhere }),
    db.employee.count({
      where: { warehouseId: session.warehouseId, archivedAt: null },
    }),
    db.employee.count({
      where: {
        warehouseId: session.warehouseId,
        archivedAt: null,
        createdAt: { gte: sevenDaysAgo },
      },
    }),
  ]);

  const totalAll = await db.employee.count({
    where: { warehouseId: session.warehouseId },
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <style>{`
        .emp-row:hover { background: #1a2237 !important; }
        .emp-row-archived:hover { background: rgba(140,144,162,0.06) !important; }
      `}</style>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "24px",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "#dbe2fd",
                margin: 0,
              }}
            >
              {t.title}
            </h1>
            <p
              style={{
                fontSize: "13px",
                color: "#8c90a2",
                marginTop: "4px",
              }}
            >
              {t.subtitle}
            </p>
          </div>
          <Link
            href="/dashboard/employees/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              background: "#0062ff",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
              flexShrink: 0,
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
            {t.addEmployee}
          </Link>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          {[
            { label: t.statTotalEmployees, value: totalAll },
            { label: t.statActive, value: totalActive },
            { label: t.statRecentlyAdded, value: recentCount, sub: t.statLast7Days },
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
              <p
                style={{
                  fontSize: "11px",
                  color: "#8c90a2",
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                }}
              >
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
              {stat.sub && (
                <p
                  style={{
                    fontSize: "11px",
                    color: "#4a5068",
                    margin: "4px 0 0",
                  }}
                >
                  {stat.sub}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div
          style={{
            background: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "14px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <form
            method="GET"
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              flex: 1,
              alignItems: "center",
            }}
          >
            <div
              style={{ position: "relative", flex: "1", minWidth: "200px" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                style={{
                  position: "absolute",
                  insetInlineStart: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#4a5068",
                  pointerEvents: "none",
                }}
              >
                <circle
                  cx="6"
                  cy="6"
                  r="4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M9.5 9.5L12.5 12.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <input
                name="q"
                type="text"
                defaultValue={q}
                placeholder={t.searchPlaceholder}
                style={{
                  width: "100%",
                  paddingInlineStart: "32px",
                  paddingInlineEnd: "12px",
                  paddingTop: "8px",
                  paddingBottom: "8px",
                  background: "#0d1627",
                  border: "1px solid #2d3449",
                  borderRadius: "8px",
                  color: "#dbe2fd",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                fontSize: "13px",
                color: "#8c90a2",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                name="archived"
                value="1"
                defaultChecked={showArchived}
                style={{ accentColor: "#0062ff" }}
              />
              {t.showArchived}
            </label>

            <button
              type="submit"
              style={{
                padding: "8px 16px",
                background: "#0062ff",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {t.search}
            </button>
          </form>
        </div>

        {/* Table */}
        <div
          style={{
            background: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #222a3e",
                    background: "#0d1627",
                  }}
                >
                  {[
                    t.colEmployee,
                    t.colEmail,
                    t.colRole,
                    t.colStatus,
                    t.colJoined,
                    t.colActions,
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: "start",
                        fontWeight: 600,
                        color: "#8c90a2",
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: "48px 24px",
                        textAlign: "center",
                        color: "#8c90a2",
                        fontSize: "14px",
                      }}
                    >
                      {q
                        ? t.emptyNoMatch
                        : showArchived
                        ? t.emptyNoArchived
                        : t.emptyNoEmployees}
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => {
                    const isArchived = !!employee.archivedAt;
                    const avatar = getAvatarColor(employee.name);
                    const initials = getInitials(employee.name);

                    return (
                      <tr
                        key={employee.id}
                        className={
                          isArchived ? "emp-row-archived" : "emp-row"
                        }
                        style={{
                          borderBottom: "1px solid #1a2237",
                          background: isArchived
                            ? "rgba(140,144,162,0.03)"
                            : "transparent",
                        }}
                      >
                        {/* Employee */}
                        <td style={{ padding: "12px 16px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <div
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "50%",
                                backgroundColor: isArchived
                                  ? "rgba(74,80,104,0.3)"
                                  : avatar.bg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                fontSize: "12px",
                                fontWeight: 700,
                                color: isArchived ? "#4a5068" : avatar.color,
                              }}
                            >
                              {initials}
                            </div>
                            <span
                              style={{
                                fontWeight: 500,
                                color: isArchived ? "#4a5068" : "#dbe2fd",
                              }}
                            >
                              {employee.name}
                            </span>
                          </div>
                        </td>

                        {/* Email */}
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              color: isArchived ? "#4a5068" : "#8c90a2",
                            }}
                          >
                            {employee.email}
                          </span>
                        </td>

                        {/* Role */}
                        <td style={{ padding: "12px 16px" }}>
                          {employee.warehouseRole ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "3px 10px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: 500,
                                backgroundColor: isArchived
                                  ? "rgba(74,80,104,0.15)"
                                  : "rgba(0,98,255,0.12)",
                                color: isArchived ? "#4a5068" : "#6b9fff",
                              }}
                            >
                              {employee.warehouseRole.roleTemplate.name}
                            </span>
                          ) : (
                            <span
                              style={{ color: "#4a5068", fontSize: "12px" }}
                            >
                              {t.noRole}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: "12px 16px" }}>
                          {isArchived ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "3px 10px",
                                borderRadius: "20px",
                                fontSize: "11px",
                                fontWeight: 600,
                                backgroundColor: "rgba(140,144,162,0.1)",
                                color: "#8c90a2",
                              }}
                            >
                              {t.archived}
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
                              {t.active}
                            </span>
                          )}
                        </td>

                        {/* Joined */}
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              color: isArchived ? "#4a5068" : "#8c90a2",
                              fontSize: "12px",
                            }}
                          >
                            {new Date(employee.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "12px 16px" }}>
                          <Link
                            href={`/dashboard/employees/${employee.id}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "5px 12px",
                              borderRadius: "6px",
                              border: "1px solid #2d3449",
                              color: "#8c90a2",
                              fontSize: "12px",
                              fontWeight: 500,
                              textDecoration: "none",
                            }}
                          >
                            {isArchived ? t.view : t.edit}
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderTop: "1px solid #222a3e",
                background: "#0d1627",
              }}
            >
              <span style={{ fontSize: "13px", color: "#8c90a2" }}>
                {t.showingResults
                  .replace("{from}", String(skip + 1))
                  .replace("{to}", String(Math.min(skip + PAGE_SIZE, total)))
                  .replace("{total}", String(total))}
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                {page > 1 && (
                  <Link
                    href={`?q=${encodeURIComponent(q)}&archived=${showArchived ? "1" : ""}&page=${page - 1}`}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #2d3449",
                      color: "#dbe2fd",
                      fontSize: "13px",
                      textDecoration: "none",
                    }}
                  >
                    {t.previous}
                  </Link>
                )}
                <span
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: "#0062ff",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  {page}
                </span>
                {page < totalPages && (
                  <Link
                    href={`?q=${encodeURIComponent(q)}&archived=${showArchived ? "1" : ""}&page=${page + 1}`}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #2d3449",
                      color: "#dbe2fd",
                      fontSize: "13px",
                      textDecoration: "none",
                    }}
                  >
                    {t.next}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: "12px",
            fontSize: "12px",
            color: "#4a5068",
            textAlign: "end",
          }}
        >
          {total} {total !== 1 ? t.footerCountPlural : t.footerCountSingular}
          {showArchived ? t.footerIncludingArchived : ""}
        </div>
      </div>
    </div>
  );
}
