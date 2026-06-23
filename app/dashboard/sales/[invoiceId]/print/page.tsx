import { redirect, notFound } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { getLocale, localeDir } from "@/core/i18n/locale";
import { getDictionary } from "@/core/i18n/get-dictionary";
import { formatCurrency, formatDate, formatQty } from "@/lib/format";
import { PrintPageShell } from "@/components/documents/print-page-shell";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ invoiceId: string }>;
}

export default async function SalesInvoicePrintPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "sales.invoice.read");

  const { invoiceId } = await params;

  const locale = await getLocale();
  const dir = localeDir(locale);
  const dict = getDictionary(locale);
  const t = dict.documents;

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: {
        select: { id: true, name: true, email: true, phone: true, paymentTerms: true },
      },
      lines: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          unit: { select: { id: true, name: true, symbol: true } },
        },
      },
      payments: { select: { amount: true } },
      warehouse: {
        select: { name: true, address: true, organization: { select: { name: true } } },
      },
    },
  });

  if (!invoice || invoice.warehouseId !== session.warehouseId || invoice.type !== "SALE") {
    notFound();
  }

  const totalAmount = Number(invoice.totalAmount);
  const taxAmount = invoice.taxAmount != null ? Number(invoice.taxAmount) : null;
  const subtotal = totalAmount - (taxAmount ?? 0);
  const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = totalAmount - totalPaid;

  const paymentTerms = invoice.customer?.paymentTerms ?? null;

  return (
    <PrintPageShell dir={dir} printLabel={t.print}>
      <div className="doc-header">
        <div>
          <div className="doc-org-name">{invoice.warehouse.organization.name}</div>
          {invoice.warehouse.address && <div className="doc-org-meta">{invoice.warehouse.address}</div>}
        </div>
        <div className="doc-title-block">
          <div className="doc-title">{t.titles.salesInvoice}</div>
          <div className="doc-meta-row">
            <span className="doc-meta-label">{t.meta.documentNo}</span>
            <span>{invoice.id}</span>
          </div>
          <div className="doc-meta-row">
            <span className="doc-meta-label">{t.meta.issueDate}</span>
            <span>{formatDate(invoice.createdAt, locale)}</span>
          </div>
          {invoice.dueDate && (
            <div className="doc-meta-row">
              <span className="doc-meta-label">{t.meta.dueDate}</span>
              <span>{formatDate(invoice.dueDate, locale)}</span>
            </div>
          )}
          <div className="doc-meta-row">
            <span className="doc-meta-label">{t.meta.status}</span>
            <span>{invoice.status}</span>
          </div>
          {paymentTerms && (
            <div className="doc-meta-row">
              <span className="doc-meta-label">{t.meta.paymentTerms}</span>
              <span>{t.paymentTermsLabels[paymentTerms]}</span>
            </div>
          )}
        </div>
      </div>

      <div className="doc-parties">
        <div className="doc-party">
          <div className="doc-party-label">{t.parties.billTo}</div>
          {invoice.customer ? (
            <>
              <div className="doc-party-name">{invoice.customer.name}</div>
              {invoice.customer.email && <div className="doc-party-detail">{invoice.customer.email}</div>}
              {invoice.customer.phone && <div className="doc-party-detail">{invoice.customer.phone}</div>}
            </>
          ) : (
            <div className="doc-party-detail">—</div>
          )}
        </div>
      </div>

      <table className="doc-table">
        <thead>
          <tr>
            <th>{t.columns.product}</th>
            <th>{t.columns.sku}</th>
            <th>{t.columns.quantity}</th>
            <th>{t.columns.unit}</th>
            <th>{t.columns.unitPrice}</th>
            <th>{t.columns.discount}</th>
            <th>{t.columns.lineTotal}</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.length === 0 ? (
            <tr>
              <td colSpan={7}>{t.noLineItems}</td>
            </tr>
          ) : (
            invoice.lines.map((line) => (
              <tr key={line.id}>
                <td>{line.product.name}</td>
                <td>{line.product.sku}</td>
                <td>{formatQty(Number(line.quantity))}</td>
                <td>{line.unit.symbol}</td>
                <td>{formatCurrency(Number(line.unitPrice), locale)}</td>
                <td>{line.discount != null ? `${Number(line.discount)}%` : "—"}</td>
                <td>{formatCurrency(Number(line.totalPrice), locale)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="doc-totals">
        <div className="doc-totals-box">
          <div className="doc-totals-row">
            <span>{t.totals.subtotal}</span>
            <span>{formatCurrency(subtotal, locale)}</span>
          </div>
          {taxAmount != null && (
            <div className="doc-totals-row">
              <span>{t.totals.taxAmount}</span>
              <span>{formatCurrency(taxAmount, locale)}</span>
            </div>
          )}
          <div className="doc-totals-row grand-total">
            <span>{t.totals.grandTotal}</span>
            <span>{formatCurrency(totalAmount, locale)}</span>
          </div>
          <div className="doc-totals-row">
            <span>{t.totals.amountPaid}</span>
            <span>{formatCurrency(totalPaid, locale)}</span>
          </div>
          <div className="doc-totals-row">
            <span>{t.totals.balanceDue}</span>
            <span>{formatCurrency(balanceDue, locale)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div className="doc-notes">
          <div className="doc-notes-label">{t.notes}</div>
          <div>{invoice.notes}</div>
        </div>
      )}
    </PrintPageShell>
  );
}
