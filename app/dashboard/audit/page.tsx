import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/core/auth/session";

const LIMIT = 20;

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Login",
  "auth.login_failed": "Login Failed",
  "auth.logout": "Logout",
  "inventory.product.create": "Product Created",
  "inventory.product.update": "Product Updated",
  "inventory.product.delete": "Product Deleted",
  "inventory.movement.create": "Movement Created",
  "sales.invoice.create": "Sale Invoice Created",
  "sales.invoice.confirm": "Sale Invoice Confirmed",
  "sales.invoice.cancel": "Sale Invoice Cancelled",
  "purchase.invoice.create": "Purchase Invoice Created",
  "purchase.invoice.confirm": "Purchase Invoice Confirmed",
  "purchase.invoice.cancel": "Purchase Invoice Cancelled",
  "payments.payment.create": "Payment Created",
  "employees.employee.create": "Employee Created",
  "employees.employee.update": "Employee Updated",
  "employees.employee.archive": "Employee Archived",
  "customers.customer.create": "Customer Created",
  "customers.customer.update": "Customer Updated",
  "customers.customer.archive": "Customer Archived",
  "suppliers.supplier.create": "Supplier Created",
  "suppliers.supplier.update": "Supplier Updated",
  "suppliers.supplier.archive": "Supplier Archived",
  "warehouse.create": "Warehouse Created",
  "warehouse.update": "Warehouse Updated",
  "roles.role.create": "Role Created",
  "roles.role.update": "Role Updated",
  "roles.role.delete": "Role Deleted",
};

const ACTION_BADGE_COLORS: Record<string, string> = {
  "auth.login": "bg-emerald-900/50 text-emerald-300 border border-emerald-700",
  "auth.login_failed": "bg-red-900/50 text-red-300 border border-red-700",
  "auth.logout": "bg-slate-700/50 text-slate-300 border border-slate-600",
  "inventory.product.create": "bg-blue-900/50 text-blue-300 border border-blue-700",
  "inventory.product.update": "bg-blue-900/50 text-blue-300 border border-blue-700",
  "inventory.product.delete": "bg-red-900/50 text-red-300 border border-red-700",
  "inventory.movement.create": "bg-cyan-900/50 text-cyan-300 border border-cyan-700",
  "sales.invoice.create": "bg-violet-900/50 text-violet-300 border border-violet-700",
  "sales.invoice.confirm": "bg-emerald-900/50 text-emerald-300 border border-emerald-700",
  "sales.invoice.cancel": "bg-red-900/50 text-red-300 border border-red-700",
  "purchase.invoice.create": "bg-amber-900/50 text-amber-300 border border-amber-700",
  "purchase.invoice.confirm": "bg-emerald-900/50 text-emerald-300 border border-emerald-700",
  "purchase.invoice.cancel": "bg-red-900/50 text-red-300 border border-red-700",
  "payments.payment.create": "bg-green-900/50 text-green-300 border border-green-700",
};

function getBadgeColor(action: string): string {
  return (
    ACTION_BADGE_COLORS[action] ??
    "bg-slate-700/50 text-slate-300 border border-slate-600"
  );
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

type SearchParams = Promise<{
  page?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}>;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;

  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const actionFilter = params.action ?? "";
  const dateFrom = params.dateFrom ?? "";
  const dateTo = params.dateTo ?? "";

  const where: Record<string, unknown> = {};
  if (actionFilter) {
    where.action = actionFilter;
  }
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {};
    if (dateFrom) createdAt.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    where.createdAt = createdAt;
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * LIMIT,
      take: LIMIT,
    }),
    db.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const buildUrl = (updates: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (actionFilter) p.set("action", actionFilter);
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    p.set("page", String(page));
    Object.entries(updates).forEach(([k, v]) => {
      if (v === "" || v === undefined) {
        p.delete(k);
      } else {
        p.set(k, String(v));
      }
    });
    const qs = p.toString();
    return `/dashboard/audit${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0b1326" }}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Audit Log</h1>
          <p className="mt-1 text-sm" style={{ color: "#8896b3" }}>
            Immutable record of all system events
          </p>
        </div>

        {/* Filters Bar */}
        <div
          className="mb-6 rounded-lg p-4"
          style={{ backgroundColor: "#171f33", border: "1px solid #222a3e" }}
        >
          <form method="GET" className="flex flex-wrap items-end gap-4">
            {/* Action Dropdown */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="action"
                className="text-xs font-medium"
                style={{ color: "#8896b3" }}
              >
                Action
              </label>
              <select
                id="action"
                name="action"
                defaultValue={actionFilter}
                className="rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: "#0b1326",
                  border: "1px solid #222a3e",
                  color: "#e2e8f0",
                  minWidth: "200px",
                }}
              >
                <option value="">All Actions</option>
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="dateFrom"
                className="text-xs font-medium"
                style={{ color: "#8896b3" }}
              >
                From
              </label>
              <input
                type="date"
                id="dateFrom"
                name="dateFrom"
                defaultValue={dateFrom}
                className="rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: "#0b1326",
                  border: "1px solid #222a3e",
                  color: "#e2e8f0",
                }}
              />
            </div>

            {/* Date To */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="dateTo"
                className="text-xs font-medium"
                style={{ color: "#8896b3" }}
              >
                To
              </label>
              <input
                type="date"
                id="dateTo"
                name="dateTo"
                defaultValue={dateTo}
                className="rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: "#0b1326",
                  border: "1px solid #222a3e",
                  color: "#e2e8f0",
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="rounded-md px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: "#2563eb" }}
            >
              Filter
            </button>

            {/* Clear */}
            {(actionFilter || dateFrom || dateTo) && (
              <a
                href="/dashboard/audit"
                className="rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-700"
                style={{
                  color: "#8896b3",
                  border: "1px solid #222a3e",
                }}
              >
                Clear
              </a>
            )}

            {/* Export CSV — UI only */}
            <div className="ml-auto">
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-md px-4 py-2 text-sm font-medium opacity-50 transition-colors"
                style={{
                  backgroundColor: "#171f33",
                  border: "1px solid #222a3e",
                  color: "#8896b3",
                }}
                title="CSV export coming soon"
              >
                Export CSV
              </button>
            </div>
          </form>
        </div>

        {/* Table */}
        <div
          className="overflow-hidden rounded-lg"
          style={{ border: "1px solid #222a3e" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#171f33" }}>
                  {[
                    "Timestamp",
                    "Actor",
                    "Action",
                    "Entity Type",
                    "Entity ID",
                    "Diff",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{
                        color: "#8896b3",
                        borderBottom: "1px solid #222a3e",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-sm"
                      style={{ color: "#8896b3", backgroundColor: "#0b1326" }}
                    >
                      No audit log entries found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log, idx) => (
                    <tr
                      key={log.id}
                      style={{
                        backgroundColor:
                          idx % 2 === 0 ? "#0b1326" : "#0e1729",
                        borderBottom: "1px solid #222a3e",
                      }}
                    >
                      {/* Timestamp */}
                      <td
                        className="whitespace-nowrap px-4 py-3 font-mono text-xs"
                        style={{ color: "#94a3b8" }}
                      >
                        {formatDateTime(log.createdAt)}
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-white">
                          {log.actor.name}
                        </div>
                        <div className="text-xs" style={{ color: "#8896b3" }}>
                          {log.actor.email}
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getBadgeColor(log.action)}`}
                        >
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>

                      {/* Entity Type */}
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: "#cbd5e1" }}
                      >
                        {log.entityType}
                      </td>

                      {/* Entity ID */}
                      <td
                        className="px-4 py-3 font-mono text-xs"
                        style={{ color: "#94a3b8" }}
                      >
                        <span title={log.entityId}>
                          {log.entityId.length > 12
                            ? `${log.entityId.slice(0, 12)}…`
                            : log.entityId}
                        </span>
                      </td>

                      {/* Before / After Diff */}
                      <td className="px-4 py-3">
                        {log.before || log.after ? (
                          <details className="group">
                            <summary
                              className="cursor-pointer select-none text-xs font-medium transition-colors hover:text-blue-300"
                              style={{ color: "#60a5fa" }}
                            >
                              View diff
                            </summary>
                            <div className="mt-2 space-y-2">
                              {log.before && (
                                <div>
                                  <div
                                    className="mb-1 text-xs font-semibold uppercase"
                                    style={{ color: "#f87171" }}
                                  >
                                    Before
                                  </div>
                                  <pre
                                    className="max-w-xs overflow-x-auto rounded p-2 text-xs"
                                    style={{
                                      backgroundColor: "#1a0a0a",
                                      border: "1px solid #3f1a1a",
                                      color: "#fca5a5",
                                    }}
                                  >
                                    {JSON.stringify(log.before, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.after && (
                                <div>
                                  <div
                                    className="mb-1 text-xs font-semibold uppercase"
                                    style={{ color: "#4ade80" }}
                                  >
                                    After
                                  </div>
                                  <pre
                                    className="max-w-xs overflow-x-auto rounded p-2 text-xs"
                                    style={{
                                      backgroundColor: "#0a1a0a",
                                      border: "1px solid #1a3f1a",
                                      color: "#86efac",
                                    }}
                                  >
                                    {JSON.stringify(log.after, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </details>
                        ) : (
                          <span className="text-xs" style={{ color: "#4a5568" }}>
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm" style={{ color: "#8896b3" }}>
            Showing{" "}
            <span className="font-medium text-white">
              {total === 0 ? 0 : (page - 1) * LIMIT + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-white">
              {Math.min(page * LIMIT, total)}
            </span>{" "}
            of <span className="font-medium text-white">{total}</span> entries
          </p>

          <div className="flex items-center gap-2">
            <a
              href={page > 1 ? buildUrl({ page: page - 1 }) : "#"}
              aria-disabled={page <= 1}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                page <= 1
                  ? "cursor-not-allowed opacity-40"
                  : "hover:bg-slate-700"
              }`}
              style={{
                backgroundColor: "#171f33",
                border: "1px solid #222a3e",
                color: "#e2e8f0",
              }}
            >
              Previous
            </a>

            <span className="text-sm" style={{ color: "#8896b3" }}>
              Page {page} of {totalPages}
            </span>

            <a
              href={page < totalPages ? buildUrl({ page: page + 1 }) : "#"}
              aria-disabled={page >= totalPages}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                page >= totalPages
                  ? "cursor-not-allowed opacity-40"
                  : "hover:bg-slate-700"
              }`}
              style={{
                backgroundColor: "#171f33",
                border: "1px solid #222a3e",
                color: "#e2e8f0",
              }}
            >
              Next
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
