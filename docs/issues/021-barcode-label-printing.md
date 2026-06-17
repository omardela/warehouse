---
title: "Barcode label printing — Product page and Goods Receipt"
type: AFK
blocked_by: "none"
wave: "1"
---

## What to build

Add a "Print Label" action on the Product detail page and the Goods Receipt confirmation page. Clicking the action opens a print-optimised view that renders a label containing the product barcode, product name, SKU, and base unit. Staff use browser print → Save as PDF or send directly to a label printer with a browser driver. No external printing service is required.

## Acceptance criteria

- [ ] `app/dashboard/products/[productId]/label/page.tsx` — print-optimised label view; hides all navigation chrome via CSS (`@media print`); renders: barcode (displayed as the barcode string value — use a lightweight barcode renderer library or CSS font), product name, SKU, unit
- [ ] "Print Label" button on `app/dashboard/products/[productId]/page.tsx` that opens the label page in a new tab
- [ ] Goods Receipt confirmation page (`app/dashboard/purchases/orders/[orderId]/receive/`) shows a "Print Labels" action after a receipt is confirmed; opens a multi-label print view with one label per received line item
- [ ] Label layout fits standard 50mm × 30mm label paper when printed at 100% scale
- [ ] Print view has no scrollbars, no interactive elements, and auto-triggers `window.print()` on load
- [ ] If a product has no barcode value, the barcode area is hidden and a "No barcode" note is shown instead of erroring

## Blocked by

None — can start immediately.
