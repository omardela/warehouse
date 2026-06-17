---
title: "Print views — Sales Invoice, Purchase Order, Delivery Note, Credit Note"
type: AFK
blocked_by: "019, 026, 023, 028"
wave: "5"
---

## What to build

Add print-optimised views for all four key distribution documents: Sales Invoice, Purchase Order, Delivery Note, and Credit Note (both sales and purchase). Each view is a dedicated route that hides all dashboard chrome and renders a clean, professional document layout. Staff use browser print → Save as PDF to produce shareable documents. No server-side PDF generation.

## Acceptance criteria

**Shared print view rules:**
- [ ] All print routes are under a `/print` sub-path (e.g., `/dashboard/sales/[invoiceId]/print`)
- [ ] CSS `@media print` hides sidebar, topbar, and all interactive elements
- [ ] Organisation name and logo (if set in org settings) appear in the document header
- [ ] `window.print()` fires automatically on page load
- [ ] A "Print" button is visible on screen for manual re-trigger

**Sales Invoice print view (`app/dashboard/sales/[invoiceId]/print/page.tsx`):**
- [ ] Header: organisation info, invoice number, issue date, due date, customer name and address
- [ ] Line items table: product name, SKU, quantity, unit, unit price, discount, line total
- [ ] Totals section: subtotal, tax amount (shown only if non-null), grand total, amount paid, balance due
- [ ] Payment terms displayed

**Purchase Order print view (`app/dashboard/purchases/orders/[orderId]/print/page.tsx`):**
- [ ] Header: organisation info, PO number, issue date, expected delivery date, supplier name and address
- [ ] Line items table: product name, SKU, ordered quantity, unit, unit cost, line total
- [ ] Grand total and note field

**Delivery Note print view (`app/dashboard/sales/orders/[orderId]/deliveries/[deliveryNoteId]/print/page.tsx`):**
- [ ] Header: organisation info, delivery note number, dispatch date, customer name and delivery address, linked SO number
- [ ] Line items table: product name, SKU, quantity dispatched, unit
- [ ] Signature line for customer acknowledgement

**Credit Note print view (sales and purchase):**
- [ ] Sales: `app/dashboard/sales/credit-notes/[creditNoteId]/print/page.tsx`
- [ ] Purchase: `app/dashboard/purchases/credit-notes/[creditNoteId]/print/page.tsx`
- [ ] Header: organisation info, credit note number, date, customer/supplier name, original invoice reference
- [ ] Line items table: product, quantity returned, unit, unit price, line credit
- [ ] Total credit amount

**Navigation:**
- [ ] Each source document's detail page has a "Print" button that opens the print view in a new tab

## Blocked by

- [019 — Purchase Order workflow](019-purchase-order-workflow.md)
- [026 — Sales Order workflow](026-sales-order-workflow.md)
- [023 — Purchase Returns](023-purchase-returns-credit-notes.md)
- [028 — Sales Returns](028-sales-returns-credit-notes.md)
