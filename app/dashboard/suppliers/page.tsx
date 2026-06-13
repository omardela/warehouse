import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    archived?: string;
  }>;
}

function formatCurrency(val: { toString(): string } | null | undefined): string {
  if (val == null) return "0.00";
  return Number(val).toFixed(2);
}

export default async function SuppliersPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "suppliers.supplier.read");

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const showArchived = params.archived === "1";

  const suppliers = await db.supplier.findMany({
    where: {
      organizationId: session.orgId,
      ...(showArchived ? {} : { archivedAt: null }),
      ...(q
        ? { name: { contains: q, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      invoices: {
        where: { type: "PURCHASE", status: "CONFIRMED" },
        select: {
          totalAmount: true,
          payments: { select: { amount: true } },
        },
      },
    },
  });

  // Compute balance for each supplier
  const suppliersWithBalance = suppliers.map((s) => {
    const totalInvoiced = s.invoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount),
      0
    );
    const totalPaid = s.invoices.reduce(
      (sum, inv) =>
        sum + inv.payments.reduce((ps, p) => ps + Number(p.amount), 0),
      0
    );
    return { ...s, balance: totalInvoiced - totalPaid };
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
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
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
              Suppliers
            </h1>
            <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "4px" }}>
              Manage your suppliers, track balances and purchase history.
            </p>
          </div>
          <Link
            href="/dashboard/suppliers/new"
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
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1.5V12.5M1.5 7H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add Supplier
          </Link>
        </div>

        {/* Filters */}
        <div
          style={{
            background: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "16px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <form method="GET" style={{ display: "flex", gap: "12px", flexWrap: "wrap", flex: 1 }}>
            <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
              <svg
                width="14" height="14" viewBox="0 0 14 14" fill="none"
                style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#4a5068", pointerEvents: "none" }}
              >
                <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                name="q"
                type="text"
                defaultValue={q}
                placeholder="Search by name..."
                style={{
                  width: "100%",
                  paddingLeft: "32px",
                  paddingRight: "12px",
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
              Show archived
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
              Search
            </button>
          </form>
        </div>

        {/* Table */}
        <style>{`
          .supplier-row:hover { background: #1a2237 !important; }
        `}</style>
        <div
          style={{
            background: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #222a3e", background: "#0d1627" }}>
                  {["Supplier", "Phone", "Email", "Balance Owed", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
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
                {suppliersWithBalance.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "48px 24px", textAlign: "center", color: "#8c90a2", fontSize: "14px" }}>
                      {q ? "No suppliers match your search." : "No suppliers yet. Add your first supplier to get started."}
                    </td>
                  </tr>
                ) : (
                  suppliersWithBalance.map((supplier) => {
                    const isArchived = !!supplier.archivedAt;
                    return (
                      <tr
                        key={supplier.id}
                        className="supplier-row"
                        style={{
                          borderBottom: "1px solid #1a2237",
                          background: isArchived ? "rgba(140,144,162,0.04)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 500, color: isArchived ? "#4a5068" : "#dbe2fd", textDecoration: isArchived ? "line-through" : "none" }}>
                            {supplier.name}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", color: isArchived ? "#4a5068" : "#8c90a2" }}>
                          {supplier.phone ?? <span style={{ color: "#4a5068" }}>—</span>}
                        </td>
                        <td style={{ padding: "12px 16px", color: isArchived ? "#4a5068" : "#8c90a2" }}>
                          {supplier.email ?? <span style={{ color: "#4a5068" }}>—</span>}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              fontWeight: 600,
                              color: isArchived ? "#4a5068" : supplier.balance > 0 ? "#f59e0b" : "#62df7d",
                              fontSize: "13px",
                            }}
                          >
                            ${formatCurrency(supplier.balance)}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {isArchived ? (
                            <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: "10px", background: "rgba(140,144,162,0.1)", color: "#8c90a2", fontSize: "11px", fontWeight: 600 }}>
                              ARCHIVED
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: "10px", background: "rgba(98,223,125,0.1)", color: "#62df7d", fontSize: "11px", fontWeight: 600 }}>
                              ACTIVE
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <Link
                            href={`/dashboard/suppliers/${supplier.id}`}
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "6px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "12px", fontWeight: 500, textDecoration: "none" }}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "12px 16px", borderTop: "1px solid #222a3e", background: "#0d1627" }}>
            <span style={{ fontSize: "12px", color: "#4a5068" }}>
              {suppliersWithBalance.length} supplier{suppliersWithBalance.length !== 1 ? "s" : ""} total
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
