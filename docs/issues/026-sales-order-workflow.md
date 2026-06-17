---
title: "Sales Order workflow — SO → Delivery Note → Sales Invoice + stock reservation + credit check"
type: AFK
blocked_by: "019, 022"
wave: "3"
---

## What to build

Introduce a Sales Order (SO) workflow upstream of the existing sales invoice. Staff create an SO when a customer places an order. Confirming the SO reserves stock. A Delivery Note is created when goods are dispatched (triggering the stock decrement). The Sales Invoice is raised from the Delivery Note. Credit limit is checked on SO confirmation — the action is blocked if the customer would exceed their limit.

SO statuses: `DRAFT → CONFIRMED → PARTIAL → FULFILLED | CANCELLED`

## Acceptance criteria

- [ ] `SalesOrder` model: `id`, `organisationId`, `warehouseId`, `customerId`, `status` (enum above), `expectedDeliveryDate` (nullable), `note` (nullable), `createdById`, `confirmedAt` (nullable), `fulfilledAt` (nullable), `createdAt`, `updatedAt`
- [ ] `SalesOrderLine` model: `salesOrderId`, `productId`, `unitId`, `displayQuantity`, `baseQuantity`, `unitPrice`, `discount` (Decimal, nullable), `deliveredBaseQuantity` (running total updated by delivery notes)
- [ ] `DeliveryNote` model: `id`, `salesOrderId`, `warehouseId`, `dispatchedById`, `note` (nullable), `createdAt`; with `DeliveryNoteLine`: `salesOrderLineId`, `productId`, `unitId`, `displayQuantity`, `baseQuantity`
- [ ] `app/dashboard/sales/orders/page.tsx` — SO list with status filter; columns: customer, warehouse, date, total value, status
- [ ] `app/dashboard/sales/orders/new/page.tsx` — create SO: select customer, warehouse, add lines (product, unit, quantity, unit price, discount)
- [ ] `app/dashboard/sales/orders/[orderId]/page.tsx` — SO detail with lines, status, delivery notes list; actions: Confirm, Create Delivery Note, Cancel
- [ ] On SO confirmation: check customer outstanding balance + SO value against `creditLimit`; if exceeded, block with a clear error showing current exposure and limit; if no credit limit set, allow
- [ ] `app/dashboard/sales/orders/[orderId]/deliver/page.tsx` — Delivery Note form pre-filled from SO lines; staff enter quantities being dispatched (may be partial); on confirm triggers `recordMovement()` with `SALE_OUT` for each line; SO status becomes `PARTIAL` or `FULFILLED`
- [ ] Delivery Note confirmation page offers a "Create Sales Invoice" action that pre-fills a new invoice from the delivery note lines and links them
- [ ] Existing sales invoice creation page gains an optional "link to Delivery Note" field
- [ ] Cancelled SO releases any implied stock reservation; stock is not actually reserved in the database — reservation is enforced by the credit + stock availability check at Delivery Note creation time
- [ ] All operations enforce permissions: `sales.orders.create`, `sales.orders.view`, `sales.deliverynotes.create`
- [ ] Audit log entries for every status transition

## Blocked by

- [019 — Purchase Order workflow](019-purchase-order-workflow.md)
- [022 — Customer AR metadata](022-customer-ar-metadata.md)
