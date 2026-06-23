---
title: "Inventory refactor (2/4) — schema support for direct/implicit Delivery Notes & Goods Receipts"
type: AFK
blocked_by: "018, 019, 026, 030"
wave: "6"
---

## Why

`DeliveryNote.salesOrderId` and `GoodsReceipt.purchaseOrderId` are both required
(`NOT NULL`) today, because both documents were designed only for the SO→Delivery
Note and PO→Goods Receipt flows. POS sales and direct (no-PO) purchase invoices have
no Sales Order / Purchase Order to attach to, so they cannot use these documents as-is.

This issue makes the schema able to represent a Delivery Note / Goods Receipt that
exists for a direct sale or purchase, with no upstream order — a prerequisite for
032 and 033, which stop Invoice confirmation from moving stock directly.

## What to build

- [ ] Migration: make `DeliveryNote.salesOrderId` nullable.
- [ ] Migration: make `GoodsReceipt.purchaseOrderId` nullable.
- [ ] Add `DeliveryNote.invoiceId` (nullable FK to `Invoice`) — set when the delivery
      note was created implicitly for a direct sale/POS sale rather than dispatched
      against a Sales Order.
- [ ] Add `GoodsReceipt.invoiceId` (nullable FK to `Invoice`) — same, for direct
      purchases with no PO.
- [ ] `DeliveryNoteLine`/`GoodsReceiptLine` already reference `productId`/`unitId`
      directly, so no change needed there — confirm in review.
- [ ] Decide and document: for a direct/implicit Delivery Note or Goods Receipt, is
      `dispatchedById`/`receivedById` just the invoice's `actorId`? (Yes, by default —
      flag if this needs to differ.)
- [ ] No behavior changes to existing SO/PO flows in this issue — `salesOrderId`/
      `purchaseOrderId` are still always populated by 018/019's existing flows; they're
      only nullable to allow the new direct case.

## Open question for review

Should a direct/implicit Delivery Note or Goods Receipt be visible in the regular
`/dashboard/sales/orders`-adjacent list views, or hidden/filtered out since it has no
parent order? (Recommend: still listed, with the order column showing "Direct Sale" /
"Direct Purchase" instead of an SO/PO link — keeps the ledger genuinely complete.)

## Blocked by

- [018 — Stock transfers](018-stock-transfers.md) *(schema precedent only, not a hard dependency)*
- [019 — Purchase Order workflow](019-purchase-order-workflow.md)
- [026 — Sales Order workflow](026-sales-order-workflow.md)
- [030 — recordMovement() transaction support](030-recordmovement-transaction-support.md)
