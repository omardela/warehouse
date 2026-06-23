const notifications = {
  title: "Notifications",
  unreadCountSingular: "{count} unread notification",
  unreadCountPlural: "{count} unread notifications",
  allCaughtUp: "All caught up",
  markAllAsRead: "Mark all as read",
  markRead: "Mark read",
  emptyTitle: "No notifications yet.",
  emptySubtitle: "Alerts for low stock, confirmed invoices, and recorded payments will appear here.",
  unreadSection: "Unread ({count})",
  readSection: "Read ({count})",
  triggered: "Triggered: {date}",
  read: "Read: {date}",
  types: {
    lowStock: {
      title: "Low Stock Alert",
      bodyRead: "{product} was at {quantity} units (threshold: {threshold} units).",
      bodyUnread: "{product} has fallen to {quantity} units — below the threshold of {threshold} units.",
      unknownProduct: "Unknown product",
    },
    saleInvoiceConfirmed: {
      title: "Sales Invoice Confirmed",
    },
    purchaseInvoiceConfirmed: {
      title: "Purchase Invoice Confirmed",
    },
    invoiceBody: "Invoice {invoiceId}{amountPart} has been confirmed.",
    invoiceBodyAmountPart: " for {amount}",
    paymentRecorded: {
      title: "Payment Recorded",
      bodySale: "recorded on sales invoice {invoiceId}.",
      bodyPurchase: "recorded on purchase invoice {invoiceId}.",
      methodCash: "Cash",
      methodCard: "Card",
      methodBankTransfer: "Bank Transfer",
    },
    goodsReceiptCreated: {
      title: "Goods Receipt Recorded",
      body: "A goods receipt was recorded against purchase order {purchaseOrderId}.",
    },
    deliveryNoteCreated: {
      title: "Delivery Note Created",
      body: "A delivery note was recorded against sales order {salesOrderId}.",
    },
    fallbackBody: "Notification received.",
  },
};

export default notifications;
