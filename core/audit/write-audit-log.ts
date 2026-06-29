import { db } from "@/lib/db";

export type AuditAction =
  | "auth.login"
  | "auth.login_failed"
  | "auth.logout"
  | "inventory.product.create"
  | "inventory.product.update"
  | "inventory.product.delete"
  | "inventory.movement.create"
  | "inventory.transfers.create"
  | "inventory.stock.reorder-settings.update"
  | "sales.invoice.create"
  | "sales.invoice.confirm"
  | "sales.invoice.cancel"
  | "purchase.invoice.create"
  | "purchase.invoice.confirm"
  | "purchase.invoice.cancel"
  | "purchases.orders.create"
  | "purchases.orders.send"
  | "purchases.orders.cancel"
  | "purchases.orders.close"
  | "purchases.receipts.create"
  | "purchases.creditnotes.create"
  | "purchases.creditnotes.confirm"
  | "purchases.creditnotes.cancel"
  | "payments.payment.create"
  | "employees.employee.create"
  | "employees.employee.update"
  | "employees.employee.archive"
  | "customers.customer.create"
  | "customers.customer.update"
  | "customers.customer.archive"
  | "suppliers.supplier.create"
  | "suppliers.supplier.update"
  | "suppliers.supplier.archive"
  | "warehouse.create"
  | "warehouse.update"
  | "roles.role.create"
  | "roles.role.update"
  | "roles.role.delete"
  | "pos.sale.create"
  | "settings.import.products"
  | "settings.import.customers"
  | "settings.import.suppliers"
  | "sales.orders.create"
  | "sales.orders.confirm"
  | "sales.orders.cancel"
  | "sales.orders.close"
  | "sales.deliverynotes.create"
  | "sales.creditnotes.create"
  | "sales.creditnotes.confirm"
  | "sales.creditnotes.cancel";

export async function writeAuditLog(params: {
  actorId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  warehouseId?: string;
  ipAddress?: string;
}): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      before: params.before ?? undefined,
      after: params.after ?? undefined,
      ipAddress: params.ipAddress ?? undefined,
    },
  });
}
