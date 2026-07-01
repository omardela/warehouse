---
title: "Restrict credit note balance filter to CONFIRMED status only"
type: AFK
blocked_by: ""
wave: "8.1"
---

## What to build

Three callers fetch an invoice's credit notes with `status: { not: "CANCELLED" }` when
computing the outstanding balance. This filter includes DRAFT credit notes, which have not
been approved or confirmed — they have no financial effect yet. A DRAFT credit note
immediately reduces the payable balance, allowing a customer to under-pay before a return
is approved. If the DRAFT is later cancelled, the accepted payment no longer covers the
invoice.

The correct filter is `status: "CONFIRMED"`. Only a CONFIRMED credit note represents an
approved, stock-reversed financial reduction.

The three callers to fix:

1. `createSalesPaymentAction` — `app/dashboard/sales/actions.ts`, the `db.invoice.findUnique`
   call that includes `creditNotes`.
2. `createPurchasePaymentAction` — `app/dashboard/purchases/actions.ts`, same pattern.
3. AR aging export — `app/dashboard/reports/ar-aging/export/route.ts`, the
   `db.invoice.findMany` that includes `creditNotes`.

`computeOutstandingBalance` itself (`core/billing/compute-outstanding-balance.ts`) does not
filter — it trusts its input. Only the callers change.

## Acceptance criteria

- [ ] All three callers pass `where: { status: "CONFIRMED" }` (not `{ not: "CANCELLED" }`)
      when fetching credit notes for balance computation.
- [ ] A DRAFT credit note on a confirmed invoice does NOT reduce the outstanding balance
      returned by any of the three callers.
- [ ] A CONFIRMED credit note still reduces the balance correctly.
- [ ] A CANCELLED credit note still has no effect on the balance.
- [ ] AR aging report balance matches payment action balance for the same invoice.
- [ ] Test: invoice $1,000 with a DRAFT credit note for $200 — outstanding balance is
      $1,000, not $800.
- [ ] Test: same invoice with the credit note confirmed — outstanding balance is $800.
- [ ] `computeOutstandingBalance` itself is unchanged.

## Blocked by

None — can start immediately.
