import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 20;

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function StockTransfersPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "inventory.transfers.view");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    sourceWarehouse: { organizationId: session.orgId },
  };

  const [transfers, total] = await Promise.all([
    db.stockTransfer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        sourceWarehouse: { select: { id: true, name: true } },
        destinationWarehouse: { select: { id: true, name: true } },
        transferredBy: { select: { id: true, name: true } },
        lines: { select: { id: true } },
      },
    }),
    db.stockTransfer.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
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
              Stock Transfers
            </h1>
            <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "4px" }}>
              Move stock between warehouses in a single atomic transfer.
            </p>
          </div>
          <Link
            href="/dashboard/inventory/transfers/new"
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
            New Transfer
          </Link>
        </div>

        {/* Table */}
        <style>{`
          .transfer-row:hover { background: #1a2237 !important; }
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
                  {["Date", "Source", "Destination", "Lines", "Transferred By", "Note"].map((h) => (
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
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "48px 24px", textAlign: "center", color: "#8c90a2", fontSize: "14px" }}>
                      No stock transfers yet.
                    </td>
                  </tr>
                ) : (
                  transfers.map((t) => (
                    <tr key={t.id} className="transfer-row" style={{ borderBottom: "1px solid #1a2237" }}>
                      <td style={{ padding: "12px 16px", color: "#8c90a2", fontSize: "12px" }}>
                        {formatDate(t.createdAt)}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#dbe2fd" }}>
                        {t.sourceWarehouse.name}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#dbe2fd" }}>
                        {t.destinationWarehouse.name}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#dbe2fd" }}>
                        {t.lines.length}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#dbe2fd" }}>
                        {t.transferredBy.name}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#8c90a2", fontSize: "12px" }}>
                        {t.note ?? "—"}
                      </td>
                    </tr>
                  ))
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
                Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                {page > 1 && (
                  <Link
                    href={`?page=${page - 1}`}
                    style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #2d3449", color: "#dbe2fd", fontSize: "13px", textDecoration: "none" }}
                  >
                    Previous
                  </Link>
                )}
                <span style={{ padding: "6px 12px", borderRadius: "6px", background: "#0062ff", color: "#fff", fontSize: "13px", fontWeight: 600 }}>
                  {page}
                </span>
                {page < totalPages && (
                  <Link
                    href={`?page=${page + 1}`}
                    style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #2d3449", color: "#dbe2fd", fontSize: "13px", textDecoration: "none" }}
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
        <div style={{ marginTop: "12px", fontSize: "12px", color: "#4a5068", textAlign: "right" }}>
          {total} transfer{total !== 1 ? "s" : ""} total
        </div>
      </div>
    </div>
  );
}
