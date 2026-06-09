---
title: "Inventory ledger (movements + cached balance)"
type: AFK
blocked_by: "008"
user_stories: "15, 16, 17, 34, 44"
---

## What to build

Implement the inventory movement ledger and cached balance system. Every stock change — whether from a purchase receipt, a sale, a manual adjustment, or a POS transaction — must create an `InventoryMovement` record and update the `InventoryBalance` cache in the same database transaction. The ledger is the audit source of truth; the balance is for fast reads.

Manual adjustments (corrections) are also a movement type and are always attributed to an actor.

## Acceptance criteria

- [ ] `InventoryMovement` records: `productId`, `warehouseId`, `movementType` (PURCHASE_IN, SALE_OUT, ADJUSTMENT_IN, ADJUSTMENT_OUT, POS_SALE_OUT, RETURN_IN), `baseQuantity`, `unitId`, `displayQuantity`, `referenceId` (nullable FK to invoice/POS session), `actorId`, `note`, `createdAt`
- [ ] `core/inventory/record-movement.ts` exports `recordMovement({ ... })` — wraps the movement insert and balance upsert in a single Prisma transaction; throws if it would drive balance negative (configurable per business rule)
- [ ] `InventoryBalance` is upserted (not recalculated from scratch) on every movement commit
- [ ] `app/dashboard/inventory/movements/page.tsx` — paginated movement history for the warehouse; filterable by product, type, date range, actor
- [ ] `app/dashboard/inventory/adjustments/page.tsx` — form to record a manual stock adjustment (type, product, quantity, unit, reason note); requires `inventory.adjustments.create` permission
- [ ] `app/dashboard/inventory/stock/page.tsx` — current stock levels table from `InventoryBalance`; shows product, base quantity, and display quantities for each unit; highlights products below low-stock threshold
- [ ] `recordMovement()` emits `writeAuditLog()` with `action: "inventory.movement.create"` including movement type, quantity, and product
- [ ] No movement record can ever be updated or deleted — route handlers have no PATCH or DELETE for movements
- [ ] Unit conversion is applied before storing: the `baseQuantity` is always in the product's base unit regardless of which display unit was entered

## Blocked by

- [008 — Product catalog](008-product-catalog.md)
