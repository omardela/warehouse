---
title: "Product catalog (multi-unit, barcode, soft delete)"
type: AFK
blocked_by: "005"
user_stories: "14, 32, 33"
---

## What to build

Build the product catalog for a warehouse: create, edit, and archive products. Each product has a base unit and can support alternate units with conversion factors (e.g. a product sold by bottle is also purchasable by carton = 24 bottles). Optional barcode fields support POS scanning. Products are soft-deleted (archived), never hard-deleted.

This is a foundational data slice — inventory movements, invoices, and POS all reference products.

## Acceptance criteria

- [ ] `app/dashboard/products/page.tsx` — product list with search, filter by category, and archived toggle; columns: name, SKU, base unit, current stock (from cached balance), barcode
- [ ] `app/dashboard/products/new/page.tsx` — create product form: name, SKU, description, base unit (select from `ProductUnit`), alternate units with conversion factors (dynamic row add/remove), barcode (optional), low-stock threshold
- [ ] `app/dashboard/products/[productId]/page.tsx` — edit product details; archive button with confirmation dialog
- [ ] `ProductUnit` is a warehouse-level lookup table (e.g. "bottle", "carton", "kg") seeded with common units; owners can add custom units
- [ ] `ProductUnitConversion` stores `fromUnitId`, `toUnitId`, `factor` — e.g. 1 carton = 24 bottles
- [ ] All stock quantities are stored and computed in the base unit; UI converts to display unit on read
- [ ] Archived products still appear in historical movements and invoices but disappear from active product selectors
- [ ] Barcode is an optional unique-per-warehouse string; searching by barcode in the product list works
- [ ] Product create/update/archive emits `writeAuditLog()` with before/after snapshots
- [ ] All write operations require `inventory.products.create` / `inventory.products.edit` / `inventory.products.archive` permissions respectively

## Blocked by

- [005 — Organization & Warehouse CRUD](005-organization-warehouse-crud.md)
