---
title: "Inventory refactor (4/4) — Purchase Invoice becomes financial-only; Goods Receipt is sole PURCHASE_IN source"
type: AFK
blocked_by: "019, 031"
wave: "6"
---

## Why

`confirmPurchaseInvoiceAction` (`app/dashboard/purchases/actions.ts`) moves stock
directly (`PURCHASE_IN`, duplicated upsert+insert logic, bypassing `recordMovement()`)
for invoices with no linked Purchase Order. Per the target architecture, Goods
Receipts should be the only thing that ever creates a `PURCHASE_IN` movement;
Purchase Invoices become purely financial documents, same as 032 on the sales side.

## What to build

- [ ] `confirmPurchaseInvoiceAction`: remove the inline balance-upsert +
      movement-insert block. Before marking the invoice `CONFIRMED`, create an
      implicit Goods Receipt (`purchaseOrderId: null`, `invoiceId: invoice.id`, lines
      copied from the invoice lines) and call `recordMovement()` (using 030's `tx`
      support) for each line, atomically with the invoice confirmation.
- [ ] Invoices that already have a `purchaseOrderId` (created from a PO) are
      unaffected by this issue — those already go through the PO→Goods Receipt flow
      from issue 019 and must not double-move stock. Confirm `confirmPurchaseInvoiceAction`
      correctly distinguishes "has a PO, receipt already happened" vs. "direct invoice,
      needs an implicit receipt" before implementing — today's code may not make this
      distinction cleanly since both cases currently share the same confirm path.
- [ ] Existing PO→Goods Receipt flow (`app/dashboard/purchases/orders/actions.ts`
      receive action) switches from inline duplicated logic to calling
      `recordMovement()` (with `tx`), matching the sales-side change in 032.
- [ ] Same insufficient-stock message reconciliation question as 032 — purchases
      don't currently check for insufficient stock (makes sense, stock is increasing),
      so this point is sales-specific and doesn't apply here. No action needed.
- [ ] No changes to `purchase.invoice.confirm` permission; implicit Goods Receipt
      creation is an internal step, not a separate `purchases.receipts.create` check —
      confirm this matches 032's permission decision for consistency.

## Open question for review

If an invoice already has a `purchaseOrderId` set (created from a PO, per issue 011's
optional PO link), does *confirming the invoice* still need to do anything inventory-
related, or has the goods receipt against that PO already happened earlier and the
invoice confirm is now purely "mark this PO's invoice as financially confirmed"? This
needs to be nailed down before implementation — it changes which invoices this issue
actually touches.

## Blocked by

- [019 — Purchase Order workflow](019-purchase-order-workflow.md)
- [031 — Schema support for direct/implicit Delivery Notes & Goods Receipts](031-direct-document-schema-support.md)
