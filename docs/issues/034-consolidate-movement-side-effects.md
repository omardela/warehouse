---
title: "Inventory refactor — consolidate remaining duplicated movement logic onto recordMovement()"
type: AFK
blocked_by: "030, 032, 033"
wave: "6"
---

## Why

Independent of the Sales/Purchase Invoice changes in 032/033, Stock Transfers
(`app/dashboard/inventory/transfers/actions.ts`) still duplicate the balance-upsert +
movement-insert logic inline instead of calling `recordMovement()`. This means
transfers today get no audit-log entry for the movement itself, no SSE realtime
stock-update event, and no low-stock/reorder-point check — unlike every other
movement type. This issue closes that last gap so `recordMovement()` is the single
implementation for every movement, with no exceptions.

## What to build

- [ ] `app/dashboard/inventory/transfers/actions.ts`: replace the two inline
      upsert+insert blocks (`TRANSFER_OUT` on the source warehouse, `TRANSFER_IN` on
      the destination warehouse) with two `recordMovement()` calls (using 030's `tx`
      support so both stay atomic with the `StockTransfer`/`StockTransferLine` rows).
- [ ] Confirm transfers correctly trigger low-stock notifications on the *source*
      warehouse if the transfer drops it below threshold — this is new behavior since
      the inline code never checked this; flag if it's unwanted noise for transfers
      specifically.
- [ ] After this issue + 032 + 033 land, audit (via `grep`) that `inventoryBalance.upsert`
      and `inventoryMovement.create` appear **only** inside `core/inventory/record-movement.ts`
      — zero other call sites anywhere in the codebase. This is the actual
      "single source of truth" acceptance bar for the whole refactor series.

## Open question for review

Low-stock/reorder-point notifications firing on transfer-out was never possible
before (transfers bypassed `recordMovement()`). Is this desired, or should
`recordMovement()` gain an option to skip notification checks for transfer movements
specifically (since the stock isn't leaving the org, just relocating)?

## Blocked by

- [030 — recordMovement() transaction support](030-recordmovement-transaction-support.md)
- [032 — Sales Invoice & POS financial-only](032-sales-invoice-financial-only.md)
- [033 — Purchase Invoice financial-only](033-purchase-invoice-financial-only.md)
