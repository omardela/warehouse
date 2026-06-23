import notifications from "../en/notifications"; // VALUE import, not "import type"

const dict: typeof notifications = {
  title: "الإشعارات",
  unreadCountSingular: "{count} إشعار غير مقروء",
  unreadCountPlural: "{count} إشعارات غير مقروءة",
  allCaughtUp: "لا توجد إشعارات جديدة",
  markAllAsRead: "تعليم الكل كمقروء",
  markRead: "تعليم كمقروء",
  emptyTitle: "لا توجد إشعارات حتى الآن.",
  emptySubtitle: "ستظهر هنا تنبيهات نقص المخزون والفواتير المؤكدة والمدفوعات المسجلة.",
  unreadSection: "غير مقروء ({count})",
  readSection: "مقروء ({count})",
  triggered: "تم التنبيه: {date}",
  read: "تمت القراءة: {date}",
  types: {
    lowStock: {
      title: "تنبيه نقص المخزون",
      bodyRead: "كانت كمية {product} عند {quantity} وحدة (الحد الأدنى: {threshold} وحدة).",
      bodyUnread: "انخفضت كمية {product} إلى {quantity} وحدة — أقل من الحد الأدنى البالغ {threshold} وحدة.",
      unknownProduct: "منتج غير معروف",
    },
    saleInvoiceConfirmed: {
      title: "تم تأكيد فاتورة المبيعات",
    },
    purchaseInvoiceConfirmed: {
      title: "تم تأكيد فاتورة الشراء",
    },
    invoiceBody: "تم تأكيد الفاتورة {invoiceId}{amountPart}.",
    invoiceBodyAmountPart: " بمبلغ {amount}",
    paymentRecorded: {
      title: "تم تسجيل الدفعة",
      bodySale: "مسجلة على فاتورة المبيعات {invoiceId}.",
      bodyPurchase: "مسجلة على فاتورة الشراء {invoiceId}.",
      methodCash: "نقدًا",
      methodCard: "بطاقة",
      methodBankTransfer: "حوالة بنكية",
    },
    goodsReceiptCreated: {
      title: "تم تسجيل إذن استلام البضائع",
      body: "تم تسجيل إذن استلام بضائع مقابل أمر الشراء {purchaseOrderId}.",
    },
    deliveryNoteCreated: {
      title: "تم إنشاء إذن التسليم",
      body: "تم تسجيل إذن تسليم مقابل أمر البيع {salesOrderId}.",
    },
    fallbackBody: "تم استلام إشعار.",
  },
};

export default dict;
