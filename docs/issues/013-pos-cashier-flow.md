---
title: "POS cashier flow"
type: AFK
blocked_by: "012"
user_stories: "22, 23, 24, 25"
---

## What to build

Build the simple point-of-sale screen for warehouse counter sales. A cashier enters or scans product codes, builds a cart, and completes the sale — which atomically creates a confirmed sales invoice and stock movements. The POS screen must be fast, keyboard-friendly, and respect the cashier's permissions before allowing the sale to proceed.

## Acceptance criteria

- [ ] `app/dashboard/pos/page.tsx` — full-width POS layout distinct from the standard dashboard shell (no sidebar); accessible only with `pos.sales.create` permission
- [ ] Product lookup by barcode or SKU via a search input; matching product name and current stock are shown immediately
- [ ] Adding a product to the cart shows line item rows with editable quantity and computed line total
- [ ] Removing a line item from the cart is supported before confirming
- [ ] "Complete sale" button triggers a server action that in a single transaction: creates a `CONFIRMED` `Invoice` of type SALE, creates `InventoryMovement` records (`POS_SALE_OUT`) for each line, and updates `InventoryBalance`
- [ ] If any product would go below zero, the entire transaction is rolled back and the cashier sees a clear error naming the out-of-stock item
- [ ] After a successful sale, the screen resets to empty cart and shows a success summary (invoice number, total, items sold)
- [ ] A receipt-style summary can be printed (browser print dialog) or dismissed
- [ ] The POS action is blocked at the server action level if the session lacks `pos.sales.create` — the UI also hides the confirm button in this case
- [ ] POS sale events emit `writeAuditLog()` with `action: "pos.sale.create"` and invoice reference

## Blocked by

- [012 — Customer & sales invoices](012-customer-sales-invoices.md)
