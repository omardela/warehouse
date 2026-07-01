const documents = {
  print: "Print",
  printDocument: "Print Document",
  openPrintView: "Print",

  titles: {
    salesInvoice: "Sales Invoice",
    purchaseOrder: "Purchase Order",
    deliveryNote: "Delivery Note",
    salesCreditNote: "Sales Credit Note",
    purchaseCreditNote: "Purchase Credit Note",
  },

  meta: {
    documentNo: "Document No.",
    documentNumber: "Document #",
    issueDate: "Issue Date",
    dueDate: "Due Date",
    expectedDeliveryDate: "Expected Delivery Date",
    dispatchDate: "Dispatch Date",
    date: "Date",
    status: "Status",
    originalInvoice: "Original Invoice",
    linkedSalesOrder: "Linked Sales Order",
    linkedPurchaseOrder: "Linked Purchase Order",
    paymentTerms: "Payment Terms",
  },

  parties: {
    billTo: "Bill To",
    shipTo: "Ship To",
    deliverTo: "Deliver To",
    supplier: "Supplier",
    customer: "Customer",
  },

  columns: {
    product: "Product",
    sku: "SKU",
    unit: "Unit",
    quantity: "Quantity",
    orderedQuantity: "Ordered Qty",
    quantityDispatched: "Qty Dispatched",
    quantityReturned: "Qty Returned",
    unitPrice: "Unit Price",
    unitCost: "Unit Cost",
    discount: "Discount",
    lineTotal: "Line Total",
    lineCredit: "Line Credit",
  },

  totals: {
    subtotal: "Subtotal",
    taxAmount: "Tax",
    grandTotal: "Grand Total",
    amountPaid: "Amount Paid",
    balanceDue: "Balance Due",
    totalCredit: "Total Credit",
  },

  notes: "Notes",

  signature: {
    customerAcknowledgement: "Customer Acknowledgement",
    signatureLine: "Signature & Date",
    preparedBy: "Prepared by {name}",
    dispatchedBy: "Dispatched by {name}",
  },

  paymentTermsLabels: {
    COD: "Cash on Delivery",
    NET_15: "Net 15",
    NET_30: "Net 30",
    NET_60: "Net 60",
    NET_90: "Net 90",
  },

  noLineItems: "No line items.",
};

export default documents;
