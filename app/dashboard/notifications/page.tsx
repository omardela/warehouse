import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { markNotificationReadAction, markAllNotificationsReadAction } from "./actions";

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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

type NotificationPayload = {
  productId?: string;
  productName?: string;
  currentQuantity?: number;
  threshold?: number;
};

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const notifications = await db.notification.findMany({
    where: { warehouseId: session.warehouseId },
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
                Notifications
              </h1>
              <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "2px" }}>
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                  : "All caught up"}
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
                Mark all as read
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
              No notifications yet.
            </p>
            <p style={{ color: "#4a5068", fontSize: "12px", marginTop: "6px" }}>
              Low-stock alerts will appear here when products fall below their threshold.
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
                return (
                  <div
                    key={notification.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "14px",
                      padding: "16px 18px",
                      borderBottom:
                        idx < unreadNotifications.length - 1
                          ? "1px solid #1a2237"
                          : "none",
                      background: "rgba(251,191,36,0.03)",
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "8px",
                        background: "rgba(251,191,36,0.1)",
                        border: "1px solid rgba(251,191,36,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fbbf24",
                        flexShrink: 0,
                        marginTop: "1px",
                      }}
                    >
                      <IconWarning />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#dbe2fd",
                          marginBottom: "4px",
                        }}
                      >
                        Low Stock Alert
                      </div>
                      <div style={{ fontSize: "13px", color: "#8c90a2", lineHeight: "1.5" }}>
                        <span style={{ color: "#dbe2fd", fontWeight: 500 }}>
                          {payload.productName ?? "Unknown product"}
                        </span>{" "}
                        has fallen to{" "}
                        <span style={{ color: "#fbbf24", fontWeight: 600 }}>
                          {payload.currentQuantity ?? 0} units
                        </span>{" "}
                        — below the threshold of{" "}
                        <span style={{ color: "#8c90a2" }}>
                          {payload.threshold ?? 0} units
                        </span>
                        .
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#4a5068",
                          marginTop: "6px",
                        }}
                      >
                        {formatDate(notification.createdAt)}
                      </div>
                    </div>

                    {/* Unread dot + mark read */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "#0062ff",
                          flexShrink: 0,
                        }}
                      />
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
                return (
                  <div
                    key={notification.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "14px",
                      padding: "14px 18px",
                      borderBottom:
                        idx < readNotifications.length - 1
                          ? "1px solid #1a2237"
                          : "none",
                      opacity: 0.6,
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "8px",
                        background: "rgba(140,144,162,0.08)",
                        border: "1px solid #222a3e",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#4a5068",
                        flexShrink: 0,
                        marginTop: "1px",
                      }}
                    >
                      <IconWarning />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "#8c90a2",
                          marginBottom: "4px",
                        }}
                      >
                        Low Stock Alert
                      </div>
                      <div style={{ fontSize: "13px", color: "#4a5068", lineHeight: "1.5" }}>
                        <span style={{ fontWeight: 500 }}>
                          {payload.productName ?? "Unknown product"}
                        </span>{" "}
                        was at{" "}
                        <span style={{ fontWeight: 600 }}>
                          {payload.currentQuantity ?? 0} units
                        </span>{" "}
                        (threshold: {payload.threshold ?? 0} units).
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#3a4058",
                          marginTop: "6px",
                          display: "flex",
                          gap: "12px",
                        }}
                      >
                        <span>Triggered: {formatDate(notification.createdAt)}</span>
                        {notification.readAt && (
                          <span>Read: {formatDate(notification.readAt)}</span>
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
