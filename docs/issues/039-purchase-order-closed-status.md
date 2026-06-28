---
title: "Purchase Order CLOSED status"
type: AFK
blocked_by: ""
wave: "7"
---

## Why

`PurchaseOrderStatus` has no terminal state for "partially fulfilled, but the supplier
can't deliver the rest and the business has agreed to stop." Today the only terminal
non-completion state is `CANCELLED`, which the existing `cancelPurchaseOrderAction`
already correctly restricts to `DRAFT`/`SENT` only (i.e. before any Goods Receipt
exists) — no change needed there.

Per the 2026-06-28 architecture review (`CONTEXT.md` → "Order Closure vs Cancellation"):
- **Cancelled** = no execution ever happened (already correctly enforced).
- **Closed** = execution started (at least one Goods Receipt exists), and the remaining
  quantity will never be fulfilled. History (Ordered/Received/Invoiced) is preserved
  unchanged.
- **Completed** (`RECEIVED`) = entire ordered quantity fulfilled; terminal, doesn't need
  closing.

Without this, a PO that will never be fully received (e.g. PO for 24, supplier delivers
18 and stops) is stuck `PARTIAL` forever, showing as "in progress" on every report
indefinitely.

## What to build

- [ ] Migration: add `CLOSED` to the `PurchaseOrderStatus` enum.
- [ ] New `closePurchaseOrderAction`, gated to `purchases.orders.create` permission
      (same gate as cancel), only callable when `status === "PARTIAL"`. Sets
      `status: "CLOSED"`. Does not modify `receivedBaseQuantity`/`invoicedBaseQuantity`
      on any line — closing never rewrites historical quantities.
- [ ] Add a "Close order" action to the PO detail page, visible only when status is
      `PARTIAL`, alongside the existing cancel action (visible only when
      `DRAFT`/`SENT`).
- [ ] Audit log entry for the closure (`purchases.orders.close`), matching the existing
      `purchases.orders.cancel` pattern.
- [ ] Update any report/list view filtering on `PurchaseOrderStatus` (e.g. "open
      orders," "on-order stock visibility") to treat `CLOSED` as terminal/excluded,
      same as `CANCELLED` and `RECEIVED`.
- [ ] Add a test: PO with `receivedBaseQuantity` partially filled can be closed; a
      `DRAFT`/`SENT` PO (nothing received) cannot be closed (only cancelled); a
      `RECEIVED` PO cannot be closed (already terminal).

## Blocked by

None — can start immediately.
