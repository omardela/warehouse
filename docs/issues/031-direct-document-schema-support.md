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

- [x] Migration: make `DeliveryNote.salesOrderId` nullable.
- [x] Migration: make `GoodsReceipt.purchaseOrderId` nullable.
- [x] Add `DeliveryNote.invoiceId` (nullable FK to `Invoice`) — set when the delivery
      note was created implicitly for a direct sale/POS sale rather than dispatched
      against a Sales Order.
- [x] Add `GoodsReceipt.invoiceId` (nullable FK to `Invoice`) — same, for direct
      purchases with no PO.
- [x] **Correction to this issue's original claim**: `DeliveryNoteLine.salesOrderLineId`
      and `GoodsReceiptLine.purchaseOrderLineId` were also `NOT NULL` — a direct/implicit
      line has no SO/PO line to reference, so both were made nullable too (alongside the
      existing `productId`/`unitId` direct references, which needed no change).
- [x] Decided: for a direct/implicit Delivery Note or Goods Receipt, `dispatchedById`/
      `receivedById` is the invoice's `actorId` by default. No schema change required —
      this is a behavioral decision for 032/033 to apply when constructing the implicit
      document.
- [x] No behavior changes to existing SO/PO flows in this issue — `salesOrderId`/
      `purchaseOrderId` are still always populated by 018/019's existing flows; they're
      only nullable to allow the new direct case. (3 read sites that assumed `salesOrder`/
      `purchaseOrder` was always present were updated with null-safe guards to satisfy the
      stricter types — no behavior change for existing SO/PO-backed data.)

## Open question for review

Should a direct/implicit Delivery Note or Goods Receipt be visible in the regular
`/dashboard/sales/orders`-adjacent list views, or hidden/filtered out since it has no
parent order? **Decision: still listed**, with the order column showing "Direct Sale" /
"Direct Purchase" instead of an SO/PO link — keeps the ledger genuinely complete. (Applied
already to the `recentDeliveryNotes` label on `/dashboard/sales/new`; remaining list views
are addressed by 032/033 when direct documents start being created.)

## Blocked by

- [018 — Stock transfers](018-stock-transfers.md) *(schema precedent only, not a hard dependency)*
- [019 — Purchase Order workflow](019-purchase-order-workflow.md)
- [026 — Sales Order workflow](026-sales-order-workflow.md)
- [030 — recordMovement() transaction support](030-recordmovement-transaction-support.md)
