---
title: "Sales Order CLOSED status"
type: AFK
blocked_by: ""
wave: "7"
---

## Why

Mirrors [039](039-purchase-order-closed-status.md) on the sales side.
`SalesOrderStatus` has no terminal state for "partially fulfilled, but the customer
refuses the remainder and the business has agreed to stop." Today the only terminal
non-completion state is `CANCELLED`, which the existing `cancelSalesOrderAction` already
correctly restricts to `DRAFT`/`CONFIRMED` only (i.e. before any Delivery Note exists) —
no change needed there.

Per the 2026-06-28 architecture review (`CONTEXT.md` → "Order Closure vs Cancellation"):
- **Cancelled** = no execution ever happened (already correctly enforced).
- **Closed** = execution started (at least one Delivery Note exists), and the remaining
  quantity will never be fulfilled. History (Ordered/Delivered/Invoiced/Returned) is
  preserved unchanged.
- **Completed** (`FULFILLED`) = entire ordered quantity delivered; terminal, doesn't
  need closing.

Example: SO for 24 units, 18 delivered, customer cancels the remaining 6 — the SO must
become `CLOSED`, not `CANCELLED` (goods already moved) and not left `PARTIAL` forever.

## What to build

- [ ] Migration: add `CLOSED` to the `SalesOrderStatus` enum.
- [ ] New `closeSalesOrderAction`, gated to `sales.orders.create` permission (same gate
      as cancel), only callable when `status === "PARTIAL"`. Sets `status: "CLOSED"`.
      Does not modify `deliveredBaseQuantity` on any line — closing never rewrites
      historical quantities.
- [ ] Add a "Close order" action to the SO detail page, visible only when status is
      `PARTIAL`, alongside the existing cancel action (visible only when
      `DRAFT`/`CONFIRMED`).
- [ ] Audit log entry for the closure (`sales.orders.close`), matching the existing
      `sales.orders.cancel` pattern.
- [ ] Update any report/list view filtering on `SalesOrderStatus` (e.g. "open orders")
      to treat `CLOSED` as terminal/excluded, same as `CANCELLED` and `FULFILLED`.
- [ ] Add a test: SO with `deliveredBaseQuantity` partially filled can be closed; a
      `DRAFT`/`CONFIRMED` SO (nothing delivered) cannot be closed (only cancelled); a
      `FULFILLED` SO cannot be closed (already terminal).

## Blocked by

None — can start immediately.
