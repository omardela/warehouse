---
title: "Purchase Order: multi-invoice support (invoicedBaseQuantity)"
type: AFK
blocked_by: "035"
wave: "7"
---

## Why

Today a Purchase Order can be linked to **exactly one** Purchase Invoice, ever —
enforced by the `invoices: { none: {} }` eligibility filter in
`app/dashboard/purchases/new/page.tsx`. There is no `invoicedBaseQuantity` field
anywhere in the schema, only `receivedBaseQuantity` on `PurchaseOrderLine`.

This blocks a core ERP scenario, decided during the 2026-06-28 architecture review: one
PO may be invoiced over multiple Purchase Invoices, with the system remembering "already
invoiced" / "remaining to invoice" per line, independent of Goods Receipt boundaries
(e.g. PO with two Goods Receipts of 10 and 14 units may still be invoiced as 8 + 16, any
split, as long as cumulative invoiced never exceeds cumulative received). See
`CONTEXT.md` → "Purchase Order (PO)" for the resolved glossary entry.

## What to build

- [ ] Migration: add `invoicedBaseQuantity` (decimal, default 0) to `PurchaseOrderLine`,
      mirroring `receivedBaseQuantity`.
- [ ] Remove the `invoices: { none: {} }` eligibility filter in
      `app/dashboard/purchases/new/page.tsx` — a PO with an existing invoice remains
      eligible for another as long as `received - invoiced > 0` on at least one line.
- [ ] Rewrite the purchase-invoice quantity validation in
      `app/dashboard/purchases/actions.ts` (`createPurchaseInvoiceAction`) to check each
      line against `receivedBaseQuantity - invoicedBaseQuantity` (remaining-to-invoice),
      not `receivedBaseQuantity` outright.
- [ ] On invoice creation, increment `PurchaseOrderLine.invoicedBaseQuantity` using
      [035](035-atomic-quantity-cap-updates.md)'s atomic conditional-update helper,
      capped at `receivedBaseQuantity`, inside the same transaction that creates the
      invoice.
- [ ] Update the "new invoice from PO" page to show, per line, Ordered / Received /
      Already Invoiced / Remaining to Invoice, and default the quantity field to the
      remaining-to-invoice amount.
- [ ] Add a test: PO with `receivedBaseQuantity = 24`, Invoice #1 bills 8, Invoice #2
      bills 6, Invoice #3 bills 10 (total 24) — all succeed; a 4th invoice attempting to
      bill any positive amount is rejected (nothing remaining).

## Blocked by

- [035 — Atomic conditional updates for Goods Receipt & Delivery Note quantity caps](035-atomic-quantity-cap-updates.md)
