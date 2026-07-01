---
title: "Guard CONFIRMED invoice cancellation (Sales + Purchase)"
type: AFK
blocked_by: ""
wave: "8.1"
---

## What to build

Both `cancelSalesInvoiceAction` (`app/dashboard/sales/actions.ts`) and
`cancelPurchaseInvoiceAction` (`app/dashboard/purchases/actions.ts`) currently allow
cancelling a CONFIRMED invoice. A CONFIRMED invoice has already triggered stock movements
and may carry payment records — cancelling it without reversal produces ghost inventory
movements and orphaned payments.

Architectural rule (resolved 2026-07-01): a CONFIRMED invoice is immutable. Only DRAFT
invoices may be cancelled. Any correction to a confirmed invoice must go through a Credit
Note.

Add a status guard to both cancel actions: if the invoice is CONFIRMED, return a clear
error directing staff to issue a Credit Note instead. DRAFT invoices remain freely
cancellable — no other behaviour changes.

## Acceptance criteria

- [ ] `cancelSalesInvoiceAction`: returns an error (not a thrown exception) when
      `invoice.status === "CONFIRMED"`, with the message
      "Confirmed invoices cannot be cancelled. Issue a Credit Note to reverse."
- [ ] `cancelPurchaseInvoiceAction`: same guard and same error message shape.
- [ ] Cancelling a DRAFT sales invoice still works.
- [ ] Cancelling a DRAFT purchase invoice still works.
- [ ] Attempting to cancel a CONFIRMED invoice via the UI shows the error message inline
      (not a crash or redirect).
- [ ] Audit log entry is NOT written when the guard rejects (no-op on rejection).
- [ ] Test: confirm a sales invoice, attempt to cancel it, assert the error is returned
      and the invoice status remains CONFIRMED.
- [ ] Test: confirm a purchase invoice, attempt to cancel it, assert the same.

## Blocked by

None — can start immediately.
