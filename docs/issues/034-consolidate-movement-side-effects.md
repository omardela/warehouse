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

- [x] `app/dashboard/inventory/transfers/actions.ts`: replaced the two inline
      upsert+insert blocks (`TRANSFER_OUT` on the source warehouse, `TRANSFER_IN` on
      the destination warehouse) with two `recordMovement()` calls (using 030's `tx`
      support), both atomic with the `StockTransfer`/`StockTransferLine` rows in the
      same transaction. Deferred `runSideEffects()` callbacks are awaited after the
      transaction commits, before the existing audit log write.
- [x] Decision: low-stock/reorder-point notifications now firing on transfer-out is
      accepted as correct, not noise — it makes transfers consistent with every other
      movement type, which is this issue's whole point ("single source of truth, no
      exceptions"). No option to skip notification checks was added.
- [x] Ran the acceptance-bar grep: `inventoryBalance.upsert` / `inventoryMovement.create`
      now appear in exactly two places — `core/inventory/record-movement.ts` (the intended
      single source of truth) and `app/dashboard/inventory/stock/actions.ts`
      (`updateReorderSettingsAction`). The latter is **not a movement** — it only edits the
      `reorderPoint`/`reorderQty` threshold metadata on `InventoryBalance`, never changes
      `currentQuantity` meaningfully, and never creates an `InventoryMovement` row.
      Routing it through `recordMovement()` would require a fabricated `movementType` and
      would pollute the ledger with a spurious zero-quantity entry, so it's intentionally
      left untouched. The acceptance bar is met for everything that actually moves stock.

## Open question for review

**Resolved**: low-stock/reorder-point notifications firing on transfer-out is desired
behavior — see decision above.

## Blocked by

- [030 — recordMovement() transaction support](030-recordmovement-transaction-support.md)
- [032 — Sales Invoice & POS financial-only](032-sales-invoice-financial-only.md)
- [033 — Purchase Invoice financial-only](033-purchase-invoice-financial-only.md)
