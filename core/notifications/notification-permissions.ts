/**
 * Maps each notification type to the permission code required to see it.
 * If a type has no entry, it is not shown to anyone (safe default).
 */
export const NOTIFICATION_PERMISSION_MAP: Record<string, string> = {
  LOW_STOCK: "inventory.balance.read",
  SALE_INVOICE_CONFIRMED: "sales.invoice.read",
  PURCHASE_INVOICE_CONFIRMED: "purchase.invoice.read",
  PAYMENT_RECORDED: "payments.payment.read",
};

export function getNotificationPermission(type: string): string | null {
  return NOTIFICATION_PERMISSION_MAP[type] ?? null;
}

/** Returns the subset of notification types the user is permitted to see. */
export function getPermittedNotificationTypes(permissionCodes: string[]): string[] {
  return Object.entries(NOTIFICATION_PERMISSION_MAP)
    .filter(([, perm]) => permissionCodes.includes(perm))
    .map(([type]) => type);
}
