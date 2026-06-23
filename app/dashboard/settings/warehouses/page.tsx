import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { getLocale } from "@/core/i18n/locale";
import { getDictionary } from "@/core/i18n/get-dictionary";

export default async function WarehousesPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  await requirePagePermission(session, "settings.warehouse.read");

  const locale = await getLocale();
  const t = getDictionary(locale).employees.warehouses;

  const warehouses = await db.warehouse.findMany({
    where: { organizationId: session.orgId, archivedAt: null },
    include: { _count: { select: { employees: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen p-6" style={{ background: "#0b1326" }}>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#dbe2fd" }}>
              {t.pageTitle}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "#8c90a2" }}>
              {t.pageSubtitle}
            </p>
          </div>
          <Link
            href="/dashboard/settings/warehouses/new"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "#0062ff" }}
          >
            <span>+</span>
            {t.createWarehouse}
          </Link>
        </div>

        {/* Warehouses table */}
        <div
          className="overflow-hidden rounded-lg border"
          style={{ borderColor: "#222a3e" }}
        >
          {warehouses.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center px-6 py-16 text-center"
              style={{ background: "#171f33" }}
            >
              <p className="text-sm font-medium" style={{ color: "#dbe2fd" }}>
                {t.emptyTitle}
              </p>
              <p className="mt-1 text-xs" style={{ color: "#8c90a2" }}>
                {t.emptySubtitle}
              </p>
              <Link
                href="/dashboard/settings/warehouses/new"
                className="mt-4 inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: "#0062ff" }}
              >
                + {t.createWarehouse}
              </Link>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: "#171f33" }}>
                  {[t.colName, t.colAddress, t.colEmployees, t.colCreated, t.colActions].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                        style={{
                          color: "#8c90a2",
                          borderBottom: "1px solid #222a3e",
                        }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {warehouses.map((warehouse, idx) => (
                  <tr
                    key={warehouse.id}
                    className="transition-colors"
                    style={{
                      background: "#171f33",
                      borderBottom:
                        idx < warehouses.length - 1
                          ? "1px solid #222a3e"
                          : "none",
                    }}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="text-sm font-medium"
                        style={{ color: "#dbe2fd" }}
                      >
                        {warehouse.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm" style={{ color: "#8c90a2" }}>
                        {warehouse.address ?? (
                          <span style={{ color: "#4a5068" }}>—</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          background: "rgba(0,108,73,0.15)",
                          color: "#62df7d",
                        }}
                      >
                        {warehouse._count.employees}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm" style={{ color: "#8c90a2" }}>
                        {new Date(warehouse.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/settings/warehouses/${warehouse.id}`}
                        className="rounded px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                        style={{
                          border: "1px solid #2d3449",
                          color: "#8c90a2",
                        }}
                      >
                        {t.edit}
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
