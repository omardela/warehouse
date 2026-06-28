---
title: "Sales Invoice <-> Delivery Note linkage + delivered-quantity validation"
type: AFK
blocked_by: ""
wave: "7"
---

## Why

`createSalesInvoiceAction` (`app/dashboard/sales/actions.ts`) takes only `customerId`,
`notes`, and manual `lines` — there is no `deliveryNoteId` or `salesOrderId` field in its
schema, and nothing persists a link from the created Invoice back to a Delivery Note or
Sales Order. The `/dashboard/sales/new?deliveryNoteId=X` page only **pre-fills the form**
from the DN's lines as a UX convenience; once submitted, that linkage is discarded.

This means nothing stops a Sales Invoice from billing more than was ever delivered —
unlike the purchase side, which validates against `receivedBaseQuantity`. This violates
the Global Rule "Invoice quantities may never exceed delivered (sales) quantities."

Decided during the 2026-06-28 architecture review: the link is `Invoice.deliveryNoteId`,
**not** `Invoice.salesOrderId` — the Delivery Note is the operational document that owns
delivered quantities, and the `Sales Order → Delivery Note → Sales Invoice` separation
must be preserved (Sales Invoice is never re-coupled to Sales Order). One Delivery Note
maps to **at most one** Sales Invoice — partial invoicing of an SO is achieved only by
creating multiple Delivery Notes, each fully invoiced once. See `CONTEXT.md` →
"Delivery Note" for the full resolved glossary entry, including the dual-FK invariant
with `DeliveryNote.invoiceId` (the existing, opposite-direction link used for
implicit/direct-sale Delivery Notes).

## What to build

- [ ] Migration: add `Invoice.deliveryNoteId` (nullable, **unique** FK to
      `DeliveryNote`). Uniqueness is what gives this concurrency-safety for free — no
      atomic-update helper needed here, unlike [036](036-purchase-order-multi-invoice.md).
- [ ] `createSalesInvoiceAction`: accept an optional `deliveryNoteId`. When present:
  - [ ] Validate the Delivery Note belongs to this org/warehouse and has no existing
        linked Invoice (the unique constraint is the authoritative guard; check first
        for a friendly error message).
  - [ ] Validate each invoice line's quantity against the corresponding Delivery Note
        line's `displayQuantity` for the same product/unit — invoiced quantity must not
        exceed delivered quantity, matching the existing purchase-side pattern in
        `app/dashboard/purchases/actions.ts`.
  - [ ] Persist `deliveryNoteId` on the created Invoice.
- [ ] Enforce the dual-FK invariant at the application level (no DB constraint, per
      existing codebase convention): reject creating an Invoice with `deliveryNoteId`
      pointing at a Delivery Note that already has `invoiceId` set (i.e. an implicit DN
      from a direct/POS sale can never also be the target of an explicit
      `Invoice.deliveryNoteId`).
- [ ] Update `/dashboard/sales/new?deliveryNoteId=X` to submit `deliveryNoteId` along
      with the prefilled lines, instead of discarding the linkage on submit.
- [ ] Add a test: DN delivers 12 units, Invoice billing 12 succeeds; a second Invoice
      attempting to link the same DN is rejected; an Invoice attempting to bill 13 units
      against a 12-unit DN is rejected.

## Blocked by

None — can start immediately.
