---
title: "Inventory refactor (1/4) — recordMovement() transaction support"
type: AFK
blocked_by: "009"
wave: "6"
---

## Why

`recordMovement()` (`core/inventory/record-movement.ts`) currently opens its own
`db.$transaction(...)` and cannot be called from inside a caller's own transaction.
Issues 031–033 need to call it atomically alongside other writes (e.g. create
Delivery Note row + record movement + increment `SalesOrderLine.deliveredBaseQuantity`
in one all-or-nothing operation). This is a prerequisite, not a behavior change.

## What to build

- [ ] Add an optional `tx` parameter to `RecordMovementParams` (a Prisma transaction
      client). When provided, use it instead of opening a new `db.$transaction`.
- [ ] When `tx` is provided, the balance-upsert + movement-insert run inside the
      caller's transaction. Side effects that must NOT be inside the DB transaction
      (audit log write, SSE emit, notification creation) still run after — decide here
      whether they run after the *outer* transaction commits (preferred, requires the
      caller to invoke a returned callback/promise after their own commit) or
      immediately after the inner write (simpler, but can log/notify for work that
      later rolls back if the outer transaction fails for an unrelated reason).
- [ ] No call sites change in this issue — this only adds the capability.
- [ ] Add a unit/integration test that calls `recordMovement()` both with and without
      an external `tx`, confirming balance + movement rows match in both modes.

## Open question for review

Should audit-log/SSE/notification side effects for a `tx`-mode call fire only after
the *outer* caller's transaction commits, or immediately? Inconsistent timing here
is exactly the kind of bug this refactor is trying to eliminate — needs an explicit
decision before 031–033 are implemented.

## Blocked by

- [009 — Inventory ledger](009-inventory-ledger.md)
