---
title: "POS auto-payment — record Payment record inside the sale transaction"
type: AFK
blocked_by: ""
wave: "8.1"
---

## What to build

`completeSaleAction` (`app/pos/actions.ts`) creates a CONFIRMED Sales Invoice immediately
but records no Payment. Every POS sale therefore sits in the database as a confirmed,
unpaid receivable. POS sales are always settled at the point of sale (cash or card) —
there is no deferred payment scenario on a walk-in counter transaction.

Two changes:

1. **POS form**: add a `paymentMethod` selector (CASH / CARD / BANK_TRANSFER) that the
   cashier chooses before completing the sale.
2. **`completeSaleAction`**: inside the existing `db.$transaction` (after the invoice and
   delivery note are created), create a `Payment` record:
   `{ invoiceId, amount: totalAmount, method: paymentMethod, paidAt: new Date(), actorId: session.employeeId }`.

POS invoices must be born fully paid — outstanding balance is zero from the moment of
creation.

## Acceptance criteria

- [ ] POS form includes a payment method selector (CASH / CARD / BANK_TRANSFER) before
      the "Complete Sale" button. Default: CASH.
- [ ] `completeSaleAction` validates `paymentMethod` from `formData` (must be one of the
      three enum values).
- [ ] A `Payment` record is created inside the same `db.$transaction` as the invoice and
      delivery note. If any part of the transaction fails, no payment is created.
- [ ] `Payment.amount` equals `Invoice.totalAmount` exactly.
- [ ] `Payment.paidAt` is set to the transaction timestamp (server-side `new Date()`).
- [ ] The POS receipt (returned in the action response) includes the payment method used.
- [ ] `computeOutstandingBalance` on a completed POS invoice returns 0.
- [ ] AR aging report does not show POS invoices (they have `customerId: null` — existing
      filter already handles this, verify it still holds after payment is added).
- [ ] Audit log records the payment alongside the invoice creation.
- [ ] Test: complete a POS sale with CASH — assert `Invoice.status = CONFIRMED` and a
      `Payment` record exists with matching amount and method.
- [ ] Test: complete a POS sale with CARD — same assertions.

## Blocked by

None — can start immediately.
