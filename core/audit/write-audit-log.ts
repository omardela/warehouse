import { db } from "@/lib/db";

export type AuditAction =
  | "auth.login"
  | "auth.login_failed"
  | "auth.logout"
  | "inventory.product.create"
  | "inventory.product.update"
  | "inventory.product.delete"
  | "inventory.movement.create"
  | "sales.invoice.create"
  | "sales.invoice.confirm"
  | "sales.invoice.cancel"
  | "purchase.invoice.create"
  | "purchase.invoice.confirm"
  | "purchase.invoice.cancel"
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
  | "roles.role.delete";

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
