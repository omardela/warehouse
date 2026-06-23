import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { getLocale, localeDir } from "@/core/i18n/locale";
import { getDictionary } from "@/core/i18n/get-dictionary";
import { formatDate, formatQty } from "@/lib/format";
import { PrintPageShell } from "@/components/documents/print-page-shell";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderId: string; deliveryNoteId: string }>;
}

export default async function DeliveryNotePrintPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "sales.orders.view");

  const { orderId, deliveryNoteId } = await params;

  const locale = await getLocale();
  const dir = localeDir(locale);
  const dict = getDictionary(locale);
  const t = dict.documents;

  const note = await db.deliveryNote.findUnique({
    where: { id: deliveryNoteId },
    include: {
      lines: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          unit: { select: { id: true, name: true, symbol: true } },
        },
      },
      dispatchedBy: { select: { id: true, name: true } },
      salesOrder: {
        select: {
          id: true,
          customerId: true,
          customer: { select: { id: true, name: true, address: true, phone: true } },
        },
      },
      warehouse: {
        select: { name: true, address: true, organization: { select: { name: true } } },
      },
    },
  });

  if (!note || note.salesOrderId !== orderId || note.warehouseId !== session.warehouseId) {
    notFound();
  }

  const customer = note.salesOrder.customer;

  return (
    <PrintPageShell dir={dir} printLabel={t.print}>
      <div className="doc-header">
        <div>
          <div className="doc-org-name">{note.warehouse.organization.name}</div>
          {note.warehouse.address && <div className="doc-org-meta">{note.warehouse.address}</div>}
        </div>
        <div className="doc-title-block">
          <div className="doc-title">{t.titles.deliveryNote}</div>
          <div className="doc-meta-row">
            <span className="doc-meta-label">{t.meta.documentNo}</span>
            <span>{note.id}</span>
          </div>
          <div className="doc-meta-row">
            <span className="doc-meta-label">{t.meta.dispatchDate}</span>
            <span>{formatDate(note.createdAt, locale)}</span>
          </div>
          <div className="doc-meta-row">
            <span className="doc-meta-label">{t.meta.linkedSalesOrder}</span>
            <span>{note.salesOrderId}</span>
          </div>
        </div>
      </div>

      <div className="doc-parties">
        <div className="doc-party">
          <div className="doc-party-label">{t.parties.deliverTo}</div>
          <div className="doc-party-name">{customer.name}</div>
          {customer.address && <div className="doc-party-detail">{customer.address}</div>}
          {customer.phone && <div className="doc-party-detail">{customer.phone}</div>}
        </div>
      </div>

      <table className="doc-table">
        <thead>
          <tr>
            <th>{t.columns.product}</th>
            <th>{t.columns.sku}</th>
            <th>{t.columns.unit}</th>
            <th>{t.columns.quantityDispatched}</th>
          </tr>
        </thead>
        <tbody>
          {note.lines.length === 0 ? (
            <tr>
              <td colSpan={4}>{t.noLineItems}</td>
            </tr>
          ) : (
            note.lines.map((line) => (
              <tr key={line.id}>
                <td>{line.product.name}</td>
                <td>{line.product.sku}</td>
                <td>{line.unit.symbol}</td>
                <td>{formatQty(Number(line.displayQuantity))}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="doc-signature">
        <div className="doc-signature-block">
          <div className="doc-signature-line">{t.signature.customerAcknowledgement}</div>
        </div>
        <div className="doc-signature-block">
          <div className="doc-signature-line">
            {t.signature.dispatchedBy.replace("{name}", note.dispatchedBy.name)}
          </div>
        </div>
      </div>
    </PrintPageShell>
  );
}
