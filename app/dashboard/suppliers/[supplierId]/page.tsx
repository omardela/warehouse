import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { updateSupplierAction, archiveSupplierAction } from "../actions";
import { SupplierEditForm } from "./SupplierEditForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ supplierId: string }>;
}

function formatCurrency(val: { toString(): string } | null | undefined): string {
  if (val == null) return "0.00";
  return Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    DRAFT: { bg: "rgba(139,92,246,0.15)", color: "#a78bfa" },
    CONFIRMED: { bg: "rgba(98,223,125,0.12)", color: "#62df7d" },
    CANCELLED: { bg: "rgba(255,180,171,0.12)", color: "#ffb4ab" },
  };
  const s = map[status] ?? { bg: "rgba(140,144,162,0.1)", color: "#8c90a2" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "10px", background: s.bg, color: s.color, fontSize: "11px", fontWeight: 600 }}>
      {status}
    </span>
  );
}

export default async function SupplierDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "suppliers.supplier.read");

  const { supplierId } = await params;

  const supplier = await db.supplier.findUnique({
    where: { id: supplierId },
    include: {
      invoices: {
        where: { type: "PURCHASE" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          confirmedAt: true,
          payments: { select: { amount: true } },
        },
      },
    },
  });

  if (!supplier || supplier.organizationId !== session.orgId) {
    notFound();
  }

  const confirmedInvoices = supplier.invoices.filter((inv) => inv.status === "CONFIRMED");
  const totalInvoiced = confirmedInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
  const totalPaid = confirmedInvoices.reduce(
    (sum, inv) => sum + inv.payments.reduce((ps, p) => ps + Number(p.amount), 0),
    0
  );
  const balance = totalInvoiced - totalPaid;
  const isArchived = !!supplier.archivedAt;

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Breadcrumb + header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Link href="/dashboard/suppliers" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>Suppliers</Link>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#dbe2fd", fontSize: "13px" }}>{supplier.name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>{supplier.name}</h1>
              {isArchived && (
                <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: "10px", background: "rgba(140,144,162,0.1)", color: "#8c90a2", fontSize: "11px", fontWeight: 600 }}>
                  ARCHIVED
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <form action={archiveSupplierAction} style={{ display: "inline" }}>
              <input type="hidden" name="supplierId" value={supplier.id} />
              <button
                type="submit"
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: isArchived ? "1px solid rgba(98,223,125,0.3)" : "1px solid rgba(255,180,171,0.3)",
                  background: isArchived ? "rgba(98,223,125,0.08)" : "rgba(255,180,171,0.08)",
                  color: isArchived ? "#62df7d" : "#ffb4ab",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {isArchived ? "Unarchive" : "Archive"}
              </button>
            </form>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" }}>
          {/* Left: edit form */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <SupplierEditForm
              supplierId={supplier.id}
              initialValues={{
                name: supplier.name,
                email: supplier.email ?? "",
                phone: supplier.phone ?? "",
                address: supplier.address ?? "",
              }}
              action={updateSupplierAction}
            />

            {/* Invoice history */}
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#8c90a2", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Purchase Invoices ({supplier.invoices.length})
                </h3>
                <Link
                  href={`/dashboard/purchases/new?supplierId=${supplier.id}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "6px", background: "#0062ff", color: "#fff", fontSize: "12px", fontWeight: 500, textDecoration: "none" }}
                >
                  + New Invoice
                </Link>
              </div>
              {supplier.invoices.length === 0 ? (
                <p style={{ fontSize: "13px", color: "#4a5068", margin: 0 }}>No purchase invoices yet for this supplier.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #222a3e" }}>
                        {["Invoice ID", "Total", "Status", "Date", ""].map((h) => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#8c90a2", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {supplier.invoices.map((inv) => (
                        <tr key={inv.id} style={{ borderBottom: "1px solid #1a2237" }}>
                          <td style={{ padding: "8px 10px" }}>
                            <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#dbe2fd", background: "#0d1627", padding: "2px 6px", borderRadius: "4px", border: "1px solid #1a2237" }}>
                              {inv.id.slice(0, 8).toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: "8px 10px", fontWeight: 600, color: "#dbe2fd" }}>
                            ${formatCurrency(inv.totalAmount)}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <StatusBadge status={inv.status} />
                          </td>
                          <td style={{ padding: "8px 10px", color: "#8c90a2", fontSize: "12px" }}>
                            {formatDate(inv.createdAt)}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <Link
                              href={`/dashboard/purchases/${inv.id}`}
                              style={{ color: "#6b9fff", textDecoration: "none", fontSize: "12px" }}
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right: balance summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#8c90a2", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Balance Summary
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#8c90a2" }}>Total Invoiced</span>
                  <span style={{ fontSize: "13px", color: "#dbe2fd", fontWeight: 500 }}>${formatCurrency(totalInvoiced)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#8c90a2" }}>Total Paid</span>
                  <span style={{ fontSize: "13px", color: "#62df7d", fontWeight: 500 }}>${formatCurrency(totalPaid)}</span>
                </div>
                <div style={{ borderTop: "1px solid #222a3e", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#dbe2fd" }}>Balance Owed</span>
                  <span style={{ fontSize: "20px", fontWeight: 700, color: balance > 0 ? "#f59e0b" : "#62df7d" }}>
                    ${formatCurrency(balance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact details */}
            <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#8c90a2", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Contact Info
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { label: "Email", value: supplier.email },
                  { label: "Phone", value: supplier.phone },
                  { label: "Address", value: supplier.address },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: "11px", color: "#4a5068", marginBottom: "2px" }}>{label}</div>
                    <div style={{ fontSize: "13px", color: value ? "#dbe2fd" : "#4a5068" }}>
                      {value ?? "Not provided"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
