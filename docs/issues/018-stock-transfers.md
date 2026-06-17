---
title: "Stock transfers between warehouses"
type: AFK
blocked_by: "none"
wave: "1"
---

## What to build

Allow warehouse staff to move stock from one warehouse to another in a single atomic operation. A transfer form lets the user pick a source warehouse, a destination warehouse, and one or more product lines (product, unit, quantity). On confirmation, the system emits a `TRANSFER_OUT` movement on the source and a `TRANSFER_IN` movement on the destination within a single database transaction. There is no in-transit state — both movements are recorded simultaneously.

## Acceptance criteria

- [ ] `StockTransfer` model: `id`, `sourceWarehouseId`, `destinationWarehouseId`, `transferredById` (Employee FK), `note` (nullable), `createdAt`; with `StockTransferLine` child: `productId`, `unitId`, `displayQuantity`, `baseQuantity`
- [ ] `app/dashboard/inventory/transfers/page.tsx` — list of past transfers (date, source, destination, line count, transferred by)
- [ ] `app/dashboard/inventory/transfers/new/page.tsx` — form: select source warehouse, destination warehouse (must differ), add lines (product, unit, quantity); validate source has sufficient stock before submitting
- [ ] On confirmation: `recordMovement()` called for each line — `TRANSFER_OUT` on source and `TRANSFER_IN` on destination — wrapped in one Prisma transaction; if any movement fails the entire transfer is rolled back
- [ ] Source balance is checked before commit; if any line would drive source balance negative the action is rejected with a clear error per line
- [ ] Transfer record links to both `InventoryMovement` records via `referenceId`
- [ ] Audit log entry written for each transfer with source, destination, and line summary
- [ ] Requires `inventory.transfers.create` permission (add to permission seed)
- [ ] Transfer list requires `inventory.transfers.view` permission

## Blocked by

None — can start immediately.
