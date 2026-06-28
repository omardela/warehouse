---
title: "Atomic conditional updates for Goods Receipt & Delivery Note quantity caps"
type: AFK
blocked_by: ""
wave: "7"
---

## Why

`createGoodsReceiptAction` (`app/dashboard/purchases/orders/actions.ts`) validates
`receivedBaseQuantity` against a `purchaseOrderLine` row read **before**
`db.$transaction` starts, then blindly does `{ increment: baseQty }` inside it. Under
Postgres's default `READ COMMITTED` isolation, two concurrent Goods Receipts against the
same PO line can both pass the pre-check (each reads the value before the other commits)
and both increment — pushing `receivedBaseQuantity` past `baseQuantity`, i.e. over-receiving
past what was ordered. The same pattern exists for `deliveredBaseQuantity` on the sales
side. This is a live race condition, not a hypothetical edge case — see
[ADR-0001](../adr/0001-atomic-conditional-updates-for-quantity-caps.md) for the decision
record.

This issue is foundational for [036](036-purchase-order-multi-invoice.md), which adds a
new quantity-cap field (`invoicedBaseQuantity`) that needs the same safe-increment pattern
from day one rather than repeating the race.

## What to build

- [ ] Add a shared helper (suggested location: `core/inventory/` alongside
      `recordMovement()`, or a new `core/documents/` module) that performs a conditional
      atomic update of the shape:
      `UPDATE <table> SET <col> = <col> + x WHERE id = ? AND <col> + x <= <cap_col>`,
      executed as a raw query inside the active `tx`, returning the affected row count.
      If 0 rows are affected, throw inside the transaction so the whole operation rolls
      back with a clear "quantity exceeds outstanding amount" error (same user-facing
      message as today, not a generic transaction failure).
- [ ] Replace the blind `tx.purchaseOrderLine.update({ data: { receivedBaseQuantity:
      { increment: baseQty } } })` in the Goods Receipt flow with the new helper.
- [ ] Replace the equivalent blind increment for `deliveredBaseQuantity` in the Delivery
      Note flow (`app/dashboard/sales/orders/actions.ts` / wherever the SO→DN increment
      lives) with the same helper.
- [ ] Keep the existing pre-transaction validation as a fast-path user-facing check (so
      the common case still gets a friendly error before hitting the DB) — the new
      atomic update is the authoritative guard, not a replacement for the UX-friendly
      pre-check.
- [ ] Add a test that simulates two concurrent receipts against the same PO line summing
      to more than the outstanding quantity, asserting exactly one succeeds and the
      other is rejected with `receivedBaseQuantity` never exceeding `baseQuantity`.

## Blocked by

None — can start immediately.
