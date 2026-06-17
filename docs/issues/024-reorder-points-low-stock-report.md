---
title: "Reorder points per product per warehouse + Low Stock report"
type: AFK
blocked_by: "017"
wave: "2"
---

## What to build

Allow warehouse managers to set a reorder point and reorder quantity per product per warehouse. When stock falls at or below the reorder point, a low stock notification fires. Replace the existing vague low-stock alert with a proper Low Stock report that shows all products below their reorder point alongside how much to order.

## Acceptance criteria

- [ ] `InventoryBalance` `reorderPoint` and `reorderQty` fields (added in 017) are exposed in the UI
- [ ] Stock page (`app/dashboard/inventory/stock/page.tsx`) gains an inline edit action per row to set `reorderPoint` and `reorderQty` for that product × warehouse combination; requires `inventory.stock.manage` permission
- [ ] `recordMovement()` checks after every balance update: if `newBalance <= reorderPoint` (and `reorderPoint` is set), calls `writeNotification()` with type `LOW_STOCK`, referencing the product and warehouse; deduplication: does not fire a second notification if one already exists and has not been dismissed
- [ ] `app/dashboard/reports/low-stock/page.tsx` — report table: Product, SKU, Warehouse, Current Qty, Reorder Point, Reorder Qty, Shortfall (reorderPoint - currentQty); sorted by shortfall descending
- [ ] Warehouse filter on the low stock report
- [ ] CSV export for the low stock report
- [ ] Products with no reorder point configured are excluded from the report (they are not "low stock" by definition)
- [ ] Report requires `reports.stock.view` permission

## Blocked by

- [017 — Schema foundation](017-schema-foundation-modules-metadata.md)
