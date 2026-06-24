---
title: "Inventory refactor (3/4) — Sales Invoice & POS become financial-only; Delivery Note is sole SALE_OUT source"
type: AFK
blocked_by: "026, 031"
wave: "6"
---

## Why

Today `confirmSalesInvoiceAction` (`app/dashboard/sales/actions.ts`) moves stock
directly (`SALE_OUT`, duplicated upsert+insert logic, bypassing `recordMovement()`),
and POS checkout (`app/pos/actions.ts`) creates an already-`CONFIRMED` Invoice and
*separately* loops `recordMovement()` per line. Both bypass Delivery Notes. Per the
target architecture, Delivery Notes should be the only thing that ever creates a
`SALE_OUT` movement; Sales Invoices (including POS) become purely financial documents.

## What to build

- [x] `confirmSalesInvoiceAction`: removed the inline balance-upsert + movement-insert
      block entirely. Before marking the invoice `CONFIRMED`, creates an implicit
      Delivery Note (`salesOrderId: null`, `invoiceId: invoice.id`, `dispatchedById:
      invoice.actorId`, lines copied from the invoice lines) and calls `recordMovement()`
      (using 030's `tx` support) for each line from inside the same transaction that
      confirms the invoice. Deferred `runSideEffects()` callbacks are awaited after the
      transaction commits.
- [x] POS checkout (`app/pos/actions.ts`): same change — the whole flow (Invoice create +
      implicit Delivery Note + per-line `recordMovement()`) is now one `db.$transaction`,
      replacing the old separate per-line loop that ran before the Invoice even existed.
      POS sales now get a real Delivery Note record for the first time.
  - [x] `referenceType: "POS_SALE"` is now `referenceType: "DeliveryNote", referenceId:
        <implicit delivery note id>`. Verified via repo-wide grep: no other code (reports,
        audit readers) referenced the literal string `"POS_SALE"` — safe to change.
- [x] Existing SO→Delivery Note flow (`createDeliveryNoteAction` in
      `app/dashboard/sales/orders/actions.ts`) now calls `recordMovement()` (with `tx`)
      instead of its inline duplicated logic — all three sales paths share one
      implementation.
- [x] Resolved: kept the existing friendly per-product "Insufficient stock for product: X"
      pre-check in `confirmSalesInvoiceAction` (and POS's per-line try/catch rebuilding the
      same friendly i18n messages) rather than relying on `recordMovement()`'s generic
      message. `recordMovement()`'s own check now just acts as a redundant safety net inside
      the same transaction.
- [x] No permission changes — implicit Delivery Note creation is gated only by
      `sales.invoice.confirm` / `pos.sales.create`, not a separate `sales.deliverynotes.create`
      check.
- [x] Accepted: confirming an invoice now produces two audit entries (invoice confirm +
      the movement's own `inventory.movement.create` from `recordMovement()`'s deferred
      side effects).

## Open questions for review

1. **Decision**: implicit Delivery Notes are internal bookkeeping for now — no dedicated
   customer-facing print view was built for them in this issue. They're listed in regular
   list views per 031's "Direct Sale" label decision.
2. **Decision**: kept the existing friendly per-product message at the call sites (see above)
   rather than extending `recordMovement()` to accept a product name.

## Blocked by

- [026 — Sales Order workflow](026-sales-order-workflow.md)
- [031 — Schema support for direct/implicit Delivery Notes & Goods Receipts](031-direct-document-schema-support.md)
