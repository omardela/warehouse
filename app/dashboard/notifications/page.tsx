import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { markNotificationReadAction, markAllNotificationsReadAction } from "./actions";
import { getPermittedNotificationTypes } from "@/core/notifications/notification-permissions";
import { getLocale } from "@/core/i18n/locale";
import { getDictionary, type Dictionary } from "@/core/i18n/get-dictionary";

export const dynamic = "force-dynamic";

function IconBell() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9 2C6.239 2 4 4.239 4 7V11L2.5 13H15.5L14 11V7C14 4.239 11.761 2 9 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7 13C7 14.105 7.895 15 9 15C10.105 15 11 14.105 11 13"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.5L14.5 13.5H1.5L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 6.5V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPayment() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.5 6.5H14.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 10H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function formatDate(date: Date, locale: "en" | "ar"): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

type NotificationPayload = {
  // LOW_STOCK
  productId?: string;
  productName?: string;
  currentQuantity?: number;
  threshold?: number;
  // SALE_INVOICE_CONFIRMED / PURCHASE_INVOICE_CONFIRMED
  invoiceId?: string;
  totalAmount?: number;
  // PAYMENT_RECORDED
  paymentId?: string;
  amount?: number;
  method?: string;
  invoiceType?: "SALE" | "PURCHASE";
  // GOODS_RECEIPT_CREATED
  purchaseOrderId?: string;
  goodsReceiptId?: string;
  // DELIVERY_NOTE_CREATED
  salesOrderId?: string;
  deliveryNoteId?: string;
};

function formatCurrency(val: number): string {
  return val.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function getNotificationMeta(
  type: string,
  payload: NotificationPayload,
  isRead: boolean,
  t: Dictionary["notifications"]
): {
  icon: React.ReactNode;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  rowBg: string;
  title: string;
  body: React.ReactNode;
} {
  const dim = isRead;

  if (type === "LOW_STOCK") {
    return {
      icon: <IconWarning />,
      iconBg: dim ? "rgba(140,144,162,0.08)" : "rgba(251,191,36,0.1)",
      iconBorder: dim ? "#222a3e" : "rgba(251,191,36,0.2)",
      iconColor: dim ? "#4a5068" : "#fbbf24",
      rowBg: dim ? "transparent" : "rgba(251,191,36,0.03)",
      title: t.types.lowStock.title,
      body: dim ? (
        <span>
          <span style={{ fontWeight: 500 }}>{payload.productName ?? t.types.lowStock.unknownProduct}</span>
          {" "}
          {t.types.lowStock.bodyRead
            .split(/(\{product\}|\{quantity\}|\{threshold\})/)
            .map((part, i) => {
              if (part === "{product}") return null;
              if (part === "{quantity}") return <span key={i} style={{ fontWeight: 600 }}>{payload.currentQuantity ?? 0}</span>;
              if (part === "{threshold}") return payload.threshold ?? 0;
              return part;
            })}
        </span>
      ) : (
        <span>
          <span style={{ color: "#dbe2fd", fontWeight: 500 }}>{payload.productName ?? t.types.lowStock.unknownProduct}</span>
          {" "}
          {t.types.lowStock.bodyUnread
            .split(/(\{product\}|\{quantity\}|\{threshold\})/)
            .map((part, i) => {
              if (part === "{product}") return null;
              if (part === "{quantity}") return <span key={i} style={{ color: "#fbbf24", fontWeight: 600 }}>{payload.currentQuantity ?? 0}</span>;
              if (part === "{threshold}") return <span key={i} style={{ color: "#8c90a2" }}>{payload.threshold ?? 0}</span>;
              return part;
            })}
        </span>
      ),
    };
  }

  if (type === "SALE_INVOICE_CONFIRMED" || type === "PURCHASE_INVOICE_CONFIRMED") {
    const title = type === "SALE_INVOICE_CONFIRMED" ? t.types.saleInvoiceConfirmed.title : t.types.purchaseInvoiceConfirmed.title;
    const shortId = payload.invoiceId ? payload.invoiceId.slice(0, 14) + "…" : "—";
    return {
      icon: <IconCheck />,
      iconBg: dim ? "rgba(140,144,162,0.08)" : "rgba(98,223,125,0.1)",
      iconBorder: dim ? "#222a3e" : "rgba(98,223,125,0.2)",
      iconColor: dim ? "#4a5068" : "#62df7d",
      rowBg: dim ? "transparent" : "rgba(98,223,125,0.02)",
      title,
      body: (
        <span>
          {t.types.invoiceBody
            .split(/(\{invoiceId\}|\{amountPart\})/)
            .map((part, i) => {
              if (part === "{invoiceId}") {
                return (
                  <span key={i} style={{ fontFamily: "monospace", fontSize: "11px", color: dim ? "#4a5068" : "#8c90a2" }}>
                    {shortId}
                  </span>
                );
              }
              if (part === "{amountPart}") {
                if (payload.totalAmount == null) return null;
                return (
                  <span key={i}>
                    {t.types.invoiceBodyAmountPart.replace("{amount}", "")}
                    <span style={{ fontWeight: 600, color: dim ? undefined : "#62df7d" }}>{formatCurrency(payload.totalAmount)}</span>
                  </span>
                );
              }
              return part;
            })}
        </span>
      ),
    };
  }

  if (type === "PAYMENT_RECORDED") {
    const isPurchase = payload.invoiceType === "PURCHASE";
    const methodLabel: Record<string, string> = {
      CASH: t.types.paymentRecorded.methodCash,
      CARD: t.types.paymentRecorded.methodCard,
      BANK_TRANSFER: t.types.paymentRecorded.methodBankTransfer,
    };
    const shortId = payload.invoiceId ? payload.invoiceId.slice(0, 14) + "…" : "—";
    const bodyTemplate = isPurchase ? t.types.paymentRecorded.bodyPurchase : t.types.paymentRecorded.bodySale;
    return {
      icon: <IconPayment />,
      iconBg: dim ? "rgba(140,144,162,0.08)" : "rgba(0,98,255,0.1)",
      iconBorder: dim ? "#222a3e" : "rgba(0,98,255,0.2)",
      iconColor: dim ? "#4a5068" : "#6b9fff",
      rowBg: dim ? "transparent" : "rgba(0,98,255,0.02)",
      title: t.types.paymentRecorded.title,
      body: (
        <span>
          {payload.amount != null && (
            <><span style={{ fontWeight: 600, color: dim ? undefined : "#6b9fff" }}>{formatCurrency(payload.amount)}</span>{" "}</>
          )}
          {payload.method && <>{methodLabel[payload.method] ?? payload.method} · </>}
          {bodyTemplate
            .split(/(\{invoiceId\})/)
            .map((part, i) => {
              if (part === "{invoiceId}") {
                return (
                  <span key={i} style={{ fontFamily: "monospace", fontSize: "11px", color: dim ? "#4a5068" : "#8c90a2" }}>
                    {shortId}
                  </span>
                );
              }
              return part;
            })}
        </span>
      ),
    };
  }

  if (type === "GOODS_RECEIPT_CREATED") {
    const shortId = payload.purchaseOrderId ? payload.purchaseOrderId.slice(0, 14) + "…" : "—";
    return {
      icon: <IconCheck />,
      iconBg: dim ? "rgba(140,144,162,0.08)" : "rgba(98,223,125,0.1)",
      iconBorder: dim ? "#222a3e" : "rgba(98,223,125,0.2)",
      iconColor: dim ? "#4a5068" : "#62df7d",
      rowBg: dim ? "transparent" : "rgba(98,223,125,0.02)",
      title: t.types.goodsReceiptCreated.title,
      body: (
        <span>
          {t.types.goodsReceiptCreated.body
            .split(/(\{purchaseOrderId\})/)
            .map((part, i) => {
              if (part === "{purchaseOrderId}") {
                return (
                  <span key={i} style={{ fontFamily: "monospace", fontSize: "11px", color: dim ? "#4a5068" : "#8c90a2" }}>
                    {shortId}
                  </span>
                );
              }
              return part;
            })}
        </span>
      ),
    };
  }

  if (type === "DELIVERY_NOTE_CREATED") {
    const shortId = payload.salesOrderId ? payload.salesOrderId.slice(0, 14) + "…" : "—";
    return {
      icon: <IconCheck />,
      iconBg: dim ? "rgba(140,144,162,0.08)" : "rgba(0,98,255,0.1)",
      iconBorder: dim ? "#222a3e" : "rgba(0,98,255,0.2)",
      iconColor: dim ? "#4a5068" : "#6b9fff",
      rowBg: dim ? "transparent" : "rgba(0,98,255,0.02)",
      title: t.types.deliveryNoteCreated.title,
      body: (
        <span>
          {t.types.deliveryNoteCreated.body
            .split(/(\{salesOrderId\})/)
            .map((part, i) => {
              if (part === "{salesOrderId}") {
                return (
                  <span key={i} style={{ fontFamily: "monospace", fontSize: "11px", color: dim ? "#4a5068" : "#8c90a2" }}>
                    {shortId}
                  </span>
                );
              }
              return part;
            })}
        </span>
      ),
    };
  }

  // Fallback for unknown types
  return {
    icon: <IconBell />,
    iconBg: dim ? "rgba(140,144,162,0.08)" : "rgba(140,144,162,0.1)",
    iconBorder: dim ? "#222a3e" : "#2d3449",
    iconColor: dim ? "#4a5068" : "#8c90a2",
    rowBg: "transparent",
    title: type.replace(/_/g, " "),
    body: <span>{t.types.fallbackBody}</span>,
  };
}

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.notifications;

  // Resolve which notification types this user is allowed to see.
  const employee = await db.employee.findUnique({
    where: { id: session.employeeId },
    select: {
      warehouseRole: {
        select: { permissions: { select: { permission: { select: { code: true } } } } },
      },
    },
  });
  const permissionCodes = employee?.warehouseRole?.permissions.map((p) => p.permission.code) ?? [];
  const permittedTypes = getPermittedNotificationTypes(permissionCodes);

  const notifications =
    permittedTypes.length === 0
      ? []
      : await db.notification.findMany({
          where: { warehouseId: session.warehouseId, type: { in: permittedTypes } },
          orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
        });

  const unreadNotifications = notifications.filter((n) => n.readAt === null);
  const readNotifications = notifications.filter((n) => n.readAt !== null);
  const unreadCount = unreadNotifications.length;

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "rgba(0,98,255,0.1)",
                border: "1px solid rgba(0,98,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6b9fff",
              }}
            >
              <IconBell />
            </div>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
                {t.title}
              </h1>
              <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "2px" }}>
                {unreadCount > 0
                  ? (unreadCount !== 1 ? t.unreadCountPlural : t.unreadCountSingular).replace(
                      "{count}",
                      String(unreadCount)
                    )
                  : t.allCaughtUp}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <form action={markAllNotificationsReadAction}>
              <button
                type="submit"
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  border: "1px solid #2d3449",
                  borderRadius: "8px",
                  color: "#8c90a2",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {t.markAllAsRead}
              </button>
            </form>
          )}
        </div>

        {/* Empty state */}
        {notifications.length === 0 && (
          <div
            style={{
              background: "#171f33",
              border: "1px solid #222a3e",
              borderRadius: "10px",
              padding: "56px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(140,144,162,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: "#4a5068",
              }}
            >
              <IconBell />
            </div>
            <p style={{ color: "#8c90a2", fontSize: "14px", margin: 0 }}>
              {t.emptyTitle}
            </p>
            <p style={{ color: "#4a5068", fontSize: "12px", marginTop: "6px" }}>
              {t.emptySubtitle}
            </p>
          </div>
        )}

        {/* Unread section */}
        {unreadNotifications.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#4a5068",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "10px",
                paddingLeft: "2px",
              }}
            >
              Unread ({unreadCount})
            </div>
            <div
              style={{
                background: "#171f33",
                border: "1px solid #222a3e",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              {unreadNotifications.map((notification, idx) => {
                const payload = notification.payload as NotificationPayload;
                const meta = getNotificationMeta(notification.type, payload, false, t);
                return (
                  <div
                    key={notification.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "14px",
                      padding: "16px 18px",
                      borderBottom: idx < unreadNotifications.length - 1 ? "1px solid #1a2237" : "none",
                      background: meta.rowBg,
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "8px",
                        background: meta.iconBg,
                        border: `1px solid ${meta.iconBorder}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: meta.iconColor,
                        flexShrink: 0,
                        marginTop: "1px",
                      }}
                    >
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#dbe2fd", marginBottom: "4px" }}>
                        {meta.title}
                      </div>
                      <div style={{ fontSize: "13px", color: "#8c90a2", lineHeight: "1.5" }}>
                        {meta.body}
                      </div>
                      <div style={{ fontSize: "11px", color: "#4a5068", marginTop: "6px" }}>
                        {formatDate(notification.createdAt, locale)}
                      </div>
                    </div>

                    {/* Unread dot + mark read */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0062ff", flexShrink: 0 }} />
                      <form action={markNotificationReadAction.bind(null, notification.id)}>
                        <button
                          type="submit"
                          style={{
                            padding: "4px 10px",
                            background: "transparent",
                            border: "1px solid #2d3449",
                            borderRadius: "6px",
                            color: "#8c90a2",
                            fontSize: "11px",
                            fontWeight: 500,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Mark read
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Read section */}
        {readNotifications.length > 0 && (
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#4a5068",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "10px",
                paddingLeft: "2px",
              }}
            >
              Read ({readNotifications.length})
            </div>
            <div
              style={{
                background: "#171f33",
                border: "1px solid #222a3e",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              {readNotifications.map((notification, idx) => {
                const payload = notification.payload as NotificationPayload;
                const meta = getNotificationMeta(notification.type, payload, true, t);
                return (
                  <div
                    key={notification.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "14px",
                      padding: "14px 18px",
                      borderBottom: idx < readNotifications.length - 1 ? "1px solid #1a2237" : "none",
                      opacity: 0.6,
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "8px",
                        background: meta.iconBg,
                        border: `1px solid ${meta.iconBorder}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: meta.iconColor,
                        flexShrink: 0,
                        marginTop: "1px",
                      }}
                    >
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#8c90a2", marginBottom: "4px" }}>
                        {meta.title}
                      </div>
                      <div style={{ fontSize: "13px", color: "#4a5068", lineHeight: "1.5" }}>
                        {meta.body}
                      </div>
                      <div style={{ fontSize: "11px", color: "#3a4058", marginTop: "6px", display: "flex", gap: "12px" }}>
                        <span>{t.triggered.replace("{date}", formatDate(notification.createdAt, locale))}</span>
                        {notification.readAt && (
                          <span>{t.read.replace("{date}", formatDate(notification.readAt, locale))}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
