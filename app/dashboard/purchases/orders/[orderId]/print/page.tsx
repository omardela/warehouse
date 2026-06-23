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
  params: Promise<{ orderId: string }>;
}

export default async function PurchaseOrderPrintPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "purchases.orders.view");

  const { orderId } = await params;

  const locale = await getLocale();
  const dir = localeDir(locale);
  const dict = getDictionary(locale);
  const t = dict.documents;

  const po = await db.purchaseOrder.findUnique({
    where: { id: orderId },
    include: {
      supplier: { select: { id: true, name: true, email: true, phone: true, address: true } },
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

  if (!po || po.warehouseId !== session.warehouseId) {
    notFound();
  }

  const grandTotal = po.lines.reduce(
    (sum, line) => sum + Number(line.displayQuantity) * Number(line.unitCost),
    0
  );

  return (
    <PrintPageShell dir={dir} printLabel={t.print}>
      <div className="doc-header">
        <div>
          <div className="doc-org-name">{po.organization.name}</div>
          <div className="doc-org-meta">{po.warehouse.name}</div>
          {po.warehouse.address && <div className="doc-org-meta">{po.warehouse.address}</div>}
        </div>
        <div className="doc-title-block">
          <div className="doc-title">{t.titles.purchaseOrder}</div>
          <div className="doc-meta-row">
            <span className="doc-meta-label">{t.meta.documentNo}</span>
            <span>{po.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="doc-meta-row">
            <span className="doc-meta-label">{t.meta.date}</span>
            <span>{formatDate(po.createdAt, locale)}</span>
          </div>
          {po.expectedDeliveryDate && (
            <div className="doc-meta-row">
              <span className="doc-meta-label">{t.meta.expectedDeliveryDate}</span>
              <span>{formatDate(po.expectedDeliveryDate, locale)}</span>
            </div>
          )}
          <div className="doc-meta-row">
            <span className="doc-meta-label">{t.meta.status}</span>
            <span>{po.status}</span>
          </div>
        </div>
      </div>

      <div className="doc-parties">
        <div className="doc-party">
          <div className="doc-party-label">{t.parties.supplier}</div>
          <div className="doc-party-name">{po.supplier.name}</div>
          {po.supplier.email && <div className="doc-party-detail">{po.supplier.email}</div>}
          {po.supplier.phone && <div className="doc-party-detail">{po.supplier.phone}</div>}
          {po.supplier.address && <div className="doc-party-detail">{po.supplier.address}</div>}
        </div>
      </div>

      <table className="doc-table">
        <thead>
          <tr>
            <th>{t.columns.product}</th>
            <th>{t.columns.sku}</th>
            <th>{t.columns.orderedQuantity}</th>
            <th>{t.columns.unit}</th>
            <th>{t.columns.unitCost}</th>
            <th>{t.columns.lineTotal}</th>
          </tr>
        </thead>
        <tbody>
          {po.lines.length === 0 ? (
            <tr>
              <td colSpan={6}>{t.noLineItems}</td>
            </tr>
          ) : (
            po.lines.map((line) => {
              const lineTotal = Number(line.displayQuantity) * Number(line.unitCost);
              return (
                <tr key={line.id}>
                  <td>{line.product.name}</td>
                  <td>{line.product.sku}</td>
                  <td>{formatQty(Number(line.displayQuantity))}</td>
                  <td>{line.unit.symbol}</td>
                  <td>{formatCurrency(Number(line.unitCost), locale)}</td>
                  <td>{formatCurrency(lineTotal, locale)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div className="doc-totals">
        <div className="doc-totals-box">
          <div className="doc-totals-row grand-total">
            <span>{t.totals.grandTotal}</span>
            <span>{formatCurrency(grandTotal, locale)}</span>
          </div>
        </div>
      </div>

      {po.note && (
        <div className="doc-notes">
          <div className="doc-notes-label">{t.notes}</div>
          <div>{po.note}</div>
        </div>
      )}
    </PrintPageShell>
  );
}
