---
title: "Stock Valuation report — current stock × cost price"
type: AFK
blocked_by: "none"
wave: "1"
---

## What to build

Add a Stock Valuation report that shows the total monetary value of inventory on hand. For each product, the report multiplies current stock (from `InventoryBalance`) by a cost price. The report is filterable by warehouse and exportable as CSV.

Cost price source: the most recent confirmed purchase invoice line for that product (last purchase price). If no purchase history exists for a product, its cost is shown as zero and flagged.

## Acceptance criteria

- [ ] `app/dashboard/reports/stock-valuation/page.tsx` — table: Product, SKU, Warehouse, Unit, Quantity on Hand, Unit Cost, Total Value; totals row at the bottom
- [ ] Warehouse filter: all warehouses or a single warehouse
- [ ] Cost price is derived from the most recent `CONFIRMED` purchase invoice line for each product (last purchase price method); products with no purchase history show cost = 0 and a "No cost data" badge
- [ ] Total inventory value displayed prominently at top of report
- [ ] CSV export downloads all rows with the same columns
- [ ] Report requires `reports.stock.view` permission
- [ ] Data is fetched server-side at request time (no stale cache)

## Blocked by

None — can start immediately.
