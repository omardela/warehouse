---
title: "Purchase Order workflow — PO → Goods Receipt → Purchase Invoice"
type: AFK
blocked_by: "none"
wave: "1"
---

## What to build

Introduce a Purchase Order (PO) workflow that sits upstream of the existing purchase invoice. Staff create a PO to record what they intend to buy from a supplier before goods arrive. When goods arrive, a Goods Receipt is created against the PO. The existing purchase invoice is then matched to the Goods Receipt. This gives the warehouse visibility into what is "on order" and what has physically arrived vs. what was invoiced.

PO statuses: `DRAFT → SENT → PARTIAL → RECEIVED | CANCELLED`

## Acceptance criteria

- [ ] `PurchaseOrder` model: `id`, `organisationId`, `warehouseId`, `supplierId`, `status` (enum above), `expectedDeliveryDate` (nullable), `note` (nullable), `createdById`, `sentAt` (nullable), `receivedAt` (nullable), `createdAt`, `updatedAt`
- [ ] `PurchaseOrderLine` model: `purchaseOrderId`, `productId`, `unitId`, `displayQuantity`, `baseQuantity`, `unitCost`, `receivedBaseQuantity` (running total updated by receipts)
- [ ] `GoodsReceipt` model: `id`, `purchaseOrderId`, `warehouseId`, `receivedById`, `note` (nullable), `createdAt`; with `GoodsReceiptLine`: `purchaseOrderLineId`, `productId`, `unitId`, `displayQuantity`, `baseQuantity`
- [ ] `app/dashboard/purchases/orders/page.tsx` — PO list with status filter; shows supplier, expected delivery, total value, status
- [ ] `app/dashboard/purchases/orders/new/page.tsx` — create PO: select supplier, warehouse, add lines (product, unit, quantity, unit cost), set expected delivery date
- [ ] `app/dashboard/purchases/orders/[orderId]/page.tsx` — PO detail with lines, status, and list of receipts; actions: Mark Sent, Create Goods Receipt, Cancel
- [ ] `app/dashboard/purchases/orders/[orderId]/receive/page.tsx` — Goods Receipt form pre-filled from PO lines; staff enter actual quantities received (may be partial); on confirm triggers `recordMovement()` with `PURCHASE_IN` for each line and updates `receivedBaseQuantity` on PO lines; PO status becomes `PARTIAL` or `RECEIVED` accordingly
- [ ] Existing purchase invoice creation page gains an optional "link to PO" field (select from `RECEIVED` or `PARTIAL` POs for the same supplier)
- [ ] "On order" quantity visible on stock page: sum of `baseQuantity - receivedBaseQuantity` across open PO lines per product per warehouse
- [ ] All PO and receipt operations enforce backend permissions (`purchases.orders.create`, `purchases.orders.view`, `purchases.receipts.create`)
- [ ] Audit log entries for every status transition and receipt creation

## Blocked by

None — can start immediately.
