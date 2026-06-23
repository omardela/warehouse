import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { CustomerForm } from "../new/CustomerForm";
import { updateCustomerAction, archiveCustomerAction } from "../actions";
import { ArchiveCustomerButton } from "./ArchiveCustomerButton";
import { getLocale } from "@/core/i18n/locale";
import { getDictionary, type Dictionary } from "@/core/i18n/get-dictionary";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ customerId: string }>;
}

function formatCurrency(val: number): string {
  return val.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function formatDate(d: Date, locale: "en" | "ar"): string {
  return d.toLocaleDateString(locale === "ar" ? "ar" : "en-US", { year: "numeric", month: "short", day: "numeric" });
}

function StatusBadge({ status, t }: { status: string; t: Dictionary }) {
  const map: Record<string, { bg: string; color: string }> = {
    DRAFT: { bg: "rgba(139,92,246,0.15)", color: "#a78bfa" },
    CONFIRMED: { bg: "rgba(98,223,125,0.1)", color: "#62df7d" },
    CANCELLED: { bg: "rgba(140,144,162,0.1)", color: "#8c90a2" },
  };
  const style = map[status] ?? { bg: "rgba(140,144,162,0.1)", color: "#8c90a2" };
  const label =
    status === "DRAFT" ? t.common.draft : status === "CONFIRMED" ? t.common.confirmed : t.common.cancelled;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "10px",
        background: style.bg,
        color: style.color,
        fontSize: "11px",
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "customers.customer.read");

  const locale = await getLocale();
  const t = getDictionary(locale);

  const { customerId } = await params;

  const customer = await db.customer.findUnique({
    where: { id: customerId },
    include: {
      invoices: {
        where: { type: "SALE" },
        include: {
          payments: { select: { id: true, amount: true, method: true, paidAt: true, notes: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer || customer.organizationId !== session.orgId) {
    notFound();
  }

  const confirmedInvoices = customer.invoices.filter((inv) => inv.status === "CONFIRMED");
  const totalInvoiced = confirmedInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
  const totalPaid = confirmedInvoices.reduce(
    (sum, inv) => sum + inv.payments.reduce((ps, p) => ps + Number(p.amount), 0),
    0
  );

  // Confirmed sales credit notes (returns) reduce the customer's outstanding balance.
  const confirmedCreditNotes = await db.creditNote.findMany({
    where: { type: "SALE", status: "CONFIRMED", originalInvoice: { customerId } },
    include: { lines: { select: { displayQuantity: true, unitPrice: true } } },
  });
  const totalCredited = confirmedCreditNotes.reduce(
    (sum, cn) => sum + cn.lines.reduce((ls, l) => ls + Number(l.displayQuantity) * Number(l.unitPrice), 0),
    0
  );

  const outstandingBalance = totalInvoiced - totalPaid - totalCredited;

  const creditLimit = customer.creditLimit != null ? Number(customer.creditLimit) : null;
  const availableCredit = creditLimit != null ? creditLimit - outstandingBalance : null;

  const PAYMENT_TERMS_LABELS: Record<string, string> = {
    COD: t.customers.form.paymentTermsCod,
    NET_15: t.customers.form.paymentTermsNet15,
    NET_30: t.customers.form.paymentTermsNet30,
    NET_60: t.customers.form.paymentTermsNet60,
    NET_90: t.customers.form.paymentTermsNet90,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Breadcrumb + header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Link href="/dashboard/customers" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>
              {t.customers.form.breadcrumb}
            </Link>
            <span style={{ color: "#4a5068" }}>/</span>
            <span style={{ color: "#8c90a2", fontSize: "13px" }}>{customer.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
                  {customer.name}
                </h1>
                {customer.archivedAt && (
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "10px", background: "rgba(140,144,162,0.1)", color: "#8c90a2", fontSize: "11px", fontWeight: 600 }}>
                    {t.customers.detail.archivedBadge}
                  </span>
                )}
              </div>
              {customer.email && <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "4px" }}>{customer.email}</p>}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {!customer.archivedAt && (
                <ArchiveCustomerButton customerId={customerId} action={archiveCustomerAction} />
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#8c90a2", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{t.customers.detail.totalInvoiced}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#dbe2fd" }}>{formatCurrency(totalInvoiced)}</div>
          </div>
          <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#8c90a2", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{t.customers.detail.totalPaid}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#62df7d" }}>{formatCurrency(totalPaid)}</div>
          </div>
          <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#8c90a2", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{t.customers.detail.outstandingBalance}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: outstandingBalance > 0 ? "#f59e0b" : "#62df7d" }}>
              {formatCurrency(outstandingBalance)}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#8c90a2", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{t.customers.detail.creditLimit}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#dbe2fd" }}>
              {creditLimit != null ? formatCurrency(creditLimit) : <span style={{ color: "#4a5068", fontSize: "14px", fontWeight: 500 }}>{t.customers.detail.noLimit}</span>}
            </div>
          </div>
          <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#8c90a2", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{t.customers.detail.availableCredit}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: availableCredit != null && availableCredit < 0 ? "#ffb4ab" : "#dbe2fd" }}>
              {availableCredit != null ? formatCurrency(availableCredit) : <span style={{ color: "#4a5068", fontSize: "14px", fontWeight: 500 }}>{t.customers.detail.notApplicable}</span>}
            </div>
          </div>
          <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "16px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#8c90a2", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{t.customers.detail.paymentTerms}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#dbe2fd" }}>
              {customer.paymentTerms ? PAYMENT_TERMS_LABELS[customer.paymentTerms] ?? customer.paymentTerms : <span style={{ color: "#4a5068", fontSize: "14px", fontWeight: 500 }}>{t.customers.detail.notSet}</span>}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "20px", alignItems: "start" }}>
          {/* Edit form */}
          <div>
            <CustomerForm
              mode="edit"
              action={updateCustomerAction}
              embedded
              initialValues={{
                id: customer.id,
                name: customer.name,
                email: customer.email ?? undefined,
                phone: customer.phone ?? undefined,
                address: customer.address ?? undefined,
                paymentTerms: customer.paymentTerms ?? undefined,
                creditLimit: customer.creditLimit != null ? customer.creditLimit.toString() : undefined,
              }}
            />
          </div>

          {/* Transaction history */}
          <div>
            <div
              style={{
                background: "#171f33",
                border: "1px solid #222a3e",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #222a3e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#dbe2fd", margin: 0 }}>{t.customers.detail.transactionHistory}</h2>
                <Link
                  href={`/dashboard/sales?customerId=${customerId}`}
                  style={{ fontSize: "12px", color: "#0062ff", textDecoration: "none" }}
                >
                  {t.customers.detail.viewAllInvoices}
                </Link>
              </div>

              {customer.invoices.length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center", color: "#8c90a2", fontSize: "13px" }}>
                  {t.customers.detail.noInvoicesYet}
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ background: "#0d1627" }}>
                        {[
                          t.customers.detail.columnInvoice,
                          t.customers.detail.columnStatus,
                          t.customers.detail.columnAmount,
                          t.customers.detail.columnPaid,
                          t.customers.detail.columnDate,
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "10px 14px",
                              textAlign: "start",
                              fontWeight: 600,
                              color: "#8c90a2",
                              fontSize: "10px",
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
                      {customer.invoices.map((inv) => {
                        const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
                        return (
                          <tr key={inv.id} style={{ borderBottom: "1px solid #1a2237" }}>
                            <td style={{ padding: "10px 14px" }}>
                              <Link
                                href={`/dashboard/sales/${inv.id}`}
                                style={{ color: "#0062ff", textDecoration: "none", fontFamily: "monospace", fontSize: "11px" }}
                              >
                                {inv.id.slice(0, 12)}…
                              </Link>
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              <StatusBadge status={inv.status} t={t} />
                            </td>
                            <td style={{ padding: "10px 14px", color: "#dbe2fd", fontWeight: 500 }}>
                              {formatCurrency(Number(inv.totalAmount))}
                            </td>
                            <td style={{ padding: "10px 14px", color: paid >= Number(inv.totalAmount) ? "#62df7d" : "#f59e0b", fontWeight: 500 }}>
                              {formatCurrency(paid)}
                            </td>
                            <td style={{ padding: "10px 14px", color: "#8c90a2" }}>
                              {formatDate(inv.createdAt, locale)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
