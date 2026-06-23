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

- [ ] `confirmSalesInvoiceAction`: remove the inline balance-upsert + movement-insert
      block entirely. Before marking the invoice `CONFIRMED`, create an implicit
      Delivery Note (`salesOrderId: null`, `invoiceId: invoice.id`, lines copied from
      the invoice lines) and call `recordMovement()` (using 030's `tx` support) for
      each line from inside the same transaction that confirms the invoice.
- [ ] POS checkout (`app/pos/actions.ts`): same change — create the implicit Delivery
      Note + call `recordMovement()` per cart line as part of the same flow that
      creates the `CONFIRMED` Invoice, instead of the current separate per-line loop.
      This also gives POS sales a real Delivery Note record for the first time
      (today there's no document at all besides the Invoice + bare movements).
  - [ ] Existing `referenceType: "POS_SALE"` on the movement should become
        `referenceType: "DeliveryNote", referenceId: <implicit delivery note id>` for
        consistency with every other `SALE_OUT` movement. Confirm nothing downstream
        (reports, audit log readers) depends on the literal string `"POS_SALE"` before
        changing it.
- [ ] Existing SO→Delivery Note flow (`createDeliveryNoteAction` in
      `app/dashboard/sales/orders/actions.ts`) switches from its inline duplicated
      logic to calling `recordMovement()` (with `tx`), so all three sales paths now
      share one implementation.
- [ ] Stock-insufficiency check (currently duplicated in the invoice-confirm path)
      is no longer needed there — `recordMovement()` already throws on insufficient
      stock (`allowNegative: false` by default). Confirm error message wording stays
      user-friendly after this change (today's invoice-confirm path has a custom
      "Insufficient stock for product: X" message — `recordMovement()`'s generic
      message doesn't include the product name; needs reconciling).
- [ ] No changes to `sales.invoice.confirm` permission — it still gates invoice
      confirmation. Implicit Delivery Note creation does NOT require
      `sales.deliverynotes.create` separately (it's an internal step of invoice
      confirmation, not a user-facing action) — confirm this is the intended
      permission model before implementing.
- [ ] Audit log: confirming an invoice now produces two audit entries (invoice
      confirm + the movement's own audit entry from `recordMovement()`) — confirm
      this is acceptable / desired rather than noise.

## Open questions for review

1. Should the implicit Delivery Note for a direct invoice/POS sale be visible to
   the customer/on a print view, or purely internal bookkeeping?
2. `recordMovement()`'s generic insufficient-stock message vs. the current
   product-name-specific one — which wins, or do we extend `recordMovement()` to
   accept a product name for error messages?

## Blocked by

- [026 — Sales Order workflow](026-sales-order-workflow.md)
- [031 — Schema support for direct/implicit Delivery Notes & Goods Receipts](031-direct-document-schema-support.md)
