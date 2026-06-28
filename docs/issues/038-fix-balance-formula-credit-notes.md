---
title: "Fix outstanding balance formula to include Credit Notes (sales + purchase)"
type: AFK
blocked_by: ""
wave: "7"
---

## Why

`createSalesPaymentAction` and the equivalent purchase-side payment action (both in
`app/dashboard/sales/actions.ts` and `app/dashboard/purchases/actions.ts`) compute the
outstanding balance as:

```ts
const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
const remaining = Number(invoice.totalAmount) - totalPaid;
```

This omits confirmed Credit Notes entirely. The correct formula, per the 2026-06-28
architecture review (`CONTEXT.md` → "Outstanding Balance") and matching standard AR/AP
practice, is:

```
remaining = invoice.totalAmount - totalPaid - totalConfirmedCreditNotes
```

Concrete failure today: a $1000 invoice with a confirmed $200 return (Credit Note) still
reports $1000 as payable — the system allows overpayment by exactly the returned amount.
This is a live bug affecting both Sales and Purchase payment flows identically.

## What to build

- [ ] `createSalesPaymentAction`: include the invoice's confirmed Credit Notes
      (`status: { not: "CANCELLED" }` — same filter already used in the credit-note
      validation code) in the balance calculation, summing each Credit Note's line
      totals (`displayQuantity * unitPrice` per line, or however the Credit Note's total
      is otherwise derived — check whether `CreditNote` already exposes a computed
      total elsewhere in the codebase before re-deriving it here).
- [ ] Apply the identical fix to the purchase-side payment action.
- [ ] Consider extracting a single shared `computeOutstandingBalance(invoice)` helper
      used by both Sales and Purchase payment actions (and anywhere else balance is
      displayed, e.g. invoice detail pages, AR aging report) so this formula has exactly
      one implementation — avoids the next person fixing it in one place and not the
      other, as happened here.
- [ ] Audit `app/dashboard/sales/[invoiceId]/page.tsx`,
      `app/dashboard/purchases/[invoiceId]/page.tsx`, and the AR aging report
      (issue 027) for any other place that independently re-derives "remaining balance"
      without Credit Notes, and point them at the new shared helper too.
- [ ] Add a test: invoice $1000, confirmed Credit Note $200, payment of $800 succeeds,
      payment of $801 is rejected, invoice reports balance $0 after the $800 payment
      (not $200).

## Blocked by

None — can start immediately.
