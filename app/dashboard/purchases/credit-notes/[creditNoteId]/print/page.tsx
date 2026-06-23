import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { getLocale, localeDir } from "@/core/i18n/locale";
import { getDictionary } from "@/core/i18n/get-dictionary";
import { formatCurrency, formatDate, formatQty } from "@/lib/format";
import { PrintPageShell } from "@/components/documents/print-page-shell";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ creditNoteId: string }>;
}

export default async function PurchaseCreditNotePrintPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "purchases.creditnotes.view");

  const { creditNoteId } = await params;

  const locale = await getLocale();
  const dir = localeDir(locale);
  const dict = getDictionary(locale);
  const t = dict.documents;

  const creditNote = await db.creditNote.findUnique({
    where: { id: creditNoteId },
    include: {
      originalInvoice: {
        select: {
          id: true,
          supplier: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
      lines: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          unit: { select: { id: true, name: true, symbol: true } },
        },
      },
      organization: { select: { name: true } },
      warehouse: { select: { name: true, address: true } },
    },
  });

  if (!creditNote || creditNote.warehouseId !== session.warehouseId || creditNote.type !== "PURCHASE") {
    notFound();
  }

  const totalCredit = creditNote.lines.reduce(
    (sum, line) => sum + Number(line.displayQuantity) * Number(line.unitPrice),
    0
  );

  const supplier = creditNote.originalInvoice.supplier;

  return (
    <PrintPageShell dir={dir} printLabel={t.print}>
      <div className="doc-header">
        <div>
          <div className="doc-org-name">{creditNote.organization.name}</div>
          {creditNote.warehouse.address && (
            <div className="doc-org-meta">{creditNote.warehouse.address}</div>
          )}
        </div>
        <div className="doc-title-block">
          <div className="doc-title">{t.titles.purchaseCreditNote}</div>
          <div className="doc-meta-row">
            <span className="doc-meta-label">{t.meta.documentNo}</span>
            <span>{creditNote.id}</span>
          </div>
          <div className="doc-meta-row">
            <span className="doc-meta-label">{t.meta.date}</span>
            <span>{formatDate(creditNote.createdAt, locale)}</span>
          </div>
          <div className="doc-meta-row">
            <span className="doc-meta-label">{t.meta.originalInvoice}</span>
            <span>{creditNote.originalInvoice.id}</span>
          </div>
          <div className="doc-meta-row">
            <span className="doc-meta-label">{t.meta.status}</span>
            <span>{creditNote.status}</span>
          </div>
        </div>
      </div>

      <div className="doc-parties">
        <div className="doc-party">
          <div className="doc-party-label">{t.parties.supplier}</div>
          {supplier ? (
            <>
              <div className="doc-party-name">{supplier.name}</div>
              {supplier.email && <div className="doc-party-detail">{supplier.email}</div>}
              {supplier.phone && <div className="doc-party-detail">{supplier.phone}</div>}
            </>
          ) : (
            <div className="doc-party-detail">—</div>
          )}
        </div>
      </div>

      {creditNote.lines.length > 0 ? (
        <table className="doc-table">
          <thead>
            <tr>
              <th>{t.columns.product}</th>
              <th>{t.columns.sku}</th>
              <th>{t.columns.unit}</th>
              <th>{t.columns.quantityReturned}</th>
              <th>{t.columns.unitPrice}</th>
              <th>{t.columns.lineCredit}</th>
            </tr>
          </thead>
          <tbody>
            {creditNote.lines.map((line) => {
              const lineCredit = Number(line.displayQuantity) * Number(line.unitPrice);
              return (
                <tr key={line.id}>
                  <td>{line.product.name}</td>
                  <td>{line.product.sku}</td>
                  <td>{line.unit.symbol}</td>
                  <td>{formatQty(Number(line.displayQuantity))}</td>
                  <td>{formatCurrency(Number(line.unitPrice), locale)}</td>
                  <td>{formatCurrency(lineCredit, locale)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p>{t.noLineItems}</p>
      )}

      <div className="doc-totals">
        <div className="doc-totals-box">
          <div className="doc-totals-row grand-total">
            <span>{t.totals.totalCredit}</span>
            <span>{formatCurrency(totalCredit, locale)}</span>
          </div>
        </div>
      </div>

      {creditNote.note && (
        <div className="doc-notes">
          <div className="doc-notes-label">{t.notes}</div>
          <div>{creditNote.note}</div>
        </div>
      )}
    </PrintPageShell>
  );
}
