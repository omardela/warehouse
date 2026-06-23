const documents = {
  print: "طباعة",
  printDocument: "طباعة المستند",
  openPrintView: "طباعة",

  titles: {
    salesInvoice: "فاتورة مبيعات",
    purchaseOrder: "أمر شراء",
    deliveryNote: "إذن تسليم",
    salesCreditNote: "إشعار دائن مبيعات",
    purchaseCreditNote: "إشعار دائن مشتريات",
  },

  meta: {
    documentNo: "رقم المستند",
    issueDate: "تاريخ الإصدار",
    dueDate: "تاريخ الاستحقاق",
    expectedDeliveryDate: "تاريخ التسليم المتوقع",
    dispatchDate: "تاريخ الشحن",
    date: "التاريخ",
    status: "الحالة",
    originalInvoice: "الفاتورة الأصلية",
    linkedSalesOrder: "أمر البيع المرتبط",
    linkedPurchaseOrder: "أمر الشراء المرتبط",
    paymentTerms: "شروط الدفع",
  },

  parties: {
    billTo: "إرسال الفاتورة إلى",
    shipTo: "الشحن إلى",
    deliverTo: "التسليم إلى",
    supplier: "المورد",
    customer: "العميل",
  },

  columns: {
    product: "المنتج",
    sku: "رمز المنتج",
    unit: "الوحدة",
    quantity: "الكمية",
    orderedQuantity: "الكمية المطلوبة",
    quantityDispatched: "الكمية المشحونة",
    quantityReturned: "الكمية المرتجعة",
    unitPrice: "سعر الوحدة",
    unitCost: "تكلفة الوحدة",
    discount: "الخصم",
    lineTotal: "إجمالي السطر",
    lineCredit: "رصيد السطر",
  },

  totals: {
    subtotal: "الإجمالي الفرعي",
    taxAmount: "الضريبة",
    grandTotal: "الإجمالي الكلي",
    amountPaid: "المبلغ المدفوع",
    balanceDue: "المبلغ المستحق",
    totalCredit: "إجمالي الرصيد الدائن",
  },

  notes: "ملاحظات",

  signature: {
    customerAcknowledgement: "إقرار العميل",
    signatureLine: "التوقيع والتاريخ",
    preparedBy: "تم الإعداد من قبل {name}",
    dispatchedBy: "تم الشحن من قبل {name}",
  },

  paymentTermsLabels: {
    COD: "الدفع عند التسليم",
    NET_15: "صافي 15 يومًا",
    NET_30: "صافي 30 يومًا",
    NET_60: "صافي 60 يومًا",
    NET_90: "صافي 90 يومًا",
  },

  noLineItems: "لا توجد عناصر.",
};

export default documents;
