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

- [x] `confirmPurchaseInvoiceAction`: removed the inline balance-upsert +
      movement-insert block. When `invoice.purchaseOrderId == null`, creates an
      implicit Goods Receipt (`purchaseOrderId: null`, `invoiceId: invoice.id`,
      `receivedById: invoice.actorId`, lines copied from the invoice lines) and calls
      `recordMovement()` (using 030's `tx` support) for each line, atomically with the
      invoice confirmation. Deferred `runSideEffects()` callbacks are awaited after the
      transaction commits.
- [x] Invoices that already have a `purchaseOrderId` set are now explicitly skipped —
      `confirmPurchaseInvoiceAction` branches on `invoice.purchaseOrderId == null` and
      does nothing inventory-related for PO-linked invoices (only the status update
      runs). This also fixes a pre-existing double-counting bug where such invoices
      moved stock a second time on top of the Goods Receipt from issue 019.
- [x] Existing PO→Goods Receipt flow (`app/dashboard/purchases/orders/actions.ts`
      receive action) now calls `recordMovement()` (with `tx`) instead of its inline
      duplicated logic, matching the sales-side change in 032. `referenceType:
      "PurchaseOrder"` / `referenceId: po.id` kept unchanged.
- [x] Confirmed: no insufficient-stock check needed (stock only increases here).
- [x] No permission changes — implicit Goods Receipt creation is gated only by
      `purchase.invoice.confirm`, consistent with 032's decision.

## Open question for review

**Resolved**: if `invoice.purchaseOrderId` is set, confirming the invoice is purely
"mark this PO's invoice as financially confirmed" — no inventory action. Only invoices
with `purchaseOrderId == null` (direct purchases) get an implicit Goods Receipt +
`recordMovement()` calls.

## Blocked by

- [019 — Purchase Order workflow](019-purchase-order-workflow.md)
- [031 — Schema support for direct/implicit Delivery Notes & Goods Receipts](031-direct-document-schema-support.md)
