---
title: "returnedBaseQuantity on InvoiceLine — atomic cap enforcement for credit note returns"
type: AFK
blocked_by: ""
wave: "8.1"
---

## What to build

Both `createSalesCreditNoteAction` (`app/dashboard/sales/credit-notes/actions.ts`) and
`createPurchaseCreditNoteAction` (`app/dashboard/purchases/credit-notes/actions.ts`)
validate return quantities by reading `invoice.creditNotes` **before** the transaction,
then create the credit note lines **inside** it. Under Postgres `READ COMMITTED`, two
concurrent return requests for the same invoice line can both read the same
`alreadyReturned = 0`, both pass validation, and together return more than the original
invoice quantity — the same race condition fixed by ADR-0001 for received, delivered, and
invoiced quantities.

Fix: add `returnedBaseQuantity` to `InvoiceLine` and increment it atomically using the
existing `applyQuantityCapUpdate` helper (introduced in issue 035), capped at the line's
`baseQuantity`. This is the fourth field in the same atomic counter pattern.

## Acceptance criteria

- [ ] `InvoiceLine` gains `returnedBaseQuantity Decimal @default(0) @db.Decimal(20, 6)`.
- [ ] Prisma migration generated and applied.
- [ ] `createSalesCreditNoteAction`: inside `db.$transaction`, after creating each
      `CreditNoteLine`, call `applyQuantityCapUpdate` on the corresponding `InvoiceLine`
      to increment `returnedBaseQuantity` by the line's `baseQuantity`, capped at the
      line's `baseQuantity`. If the cap is exceeded the transaction rolls back with a clear
      error.
- [ ] `createPurchaseCreditNoteAction`: identical treatment.
- [ ] The pre-transaction validation (`alreadyReturnedByProductUnit` check) is kept as a
      UX fast-path, exactly as today — the atomic update is the authoritative guard, not a
      replacement for the friendly pre-check.
- [ ] Test: two concurrent credit note creation requests against the same invoice line
      summing to more than the line quantity — exactly one succeeds, the other is rejected,
      and `returnedBaseQuantity` never exceeds `baseQuantity`.
- [ ] Existing single-request return flows continue to work correctly.

## Blocked by

None — can start immediately. Reuses `applyQuantityCapUpdate` from
[035](035-atomic-quantity-cap-updates.md) which is already implemented.
