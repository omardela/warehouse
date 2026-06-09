---
title: "Foundation: Prisma schema & DB setup"
type: AFK
blocked_by: None
user_stories: "41, 42, 43"
---

## What to build

Initialize Prisma and define the complete database schema that all other slices depend on. This includes every entity needed for the MVP: organizations, warehouses, employees, roles, permissions, products, units, inventory movements, invoices, payments, and audit logs. Getting the schema right here prevents costly migrations later.

The schema must encode the key invariants from the PRD:
- Organization is the top-level tenancy container; warehouses belong to organizations.
- Employees belong to exactly one warehouse (not the org directly).
- Permissions are structured as `module.resource.action` strings catalogued in a seed table.
- Inventory state is maintained as both a movement ledger (source of truth) and a cached balance (fast reads).
- Critical records (movements, invoices, payments, audit logs) must never be hard-deleted — no `onDelete: Cascade` on these.
- Soft-delete fields (`archivedAt`) on editable master data: products, customers, suppliers, employees.

## Acceptance criteria

- [ ] `prisma/schema.prisma` defines models: `Organization`, `Warehouse`, `Employee`, `RoleTemplate`, `WarehouseRole`, `Permission`, `WarehouseRolePermission`, `ProductUnit`, `Product`, `ProductUnitConversion`, `InventoryMovement`, `InventoryBalance`, `Customer`, `Supplier`, `Invoice`, `InvoiceLine`, `Payment`, `AuditLog`
- [ ] `Organization` has many `Warehouse`; `Warehouse` has many `Employee`
- [ ] `Employee` has a `warehouseId` FK (not nullable) — one employee per warehouse account
- [ ] `WarehouseRole` links a `RoleTemplate` to a `Warehouse` and carries its custom `WarehouseRolePermission[]`
- [ ] `Permission` is a seed table of valid `module.resource.action` strings
- [ ] `InventoryMovement` stores `baseQuantity` (in base unit) and is immutable (no soft delete, no cascade delete)
- [ ] `InventoryBalance` holds `currentQuantity` per product per warehouse — updated in the same transaction as movements
- [ ] `Invoice` has a `status` enum (`DRAFT`, `CONFIRMED`, `CANCELLED`) and is never hard-deleted
- [ ] All editable master data models have `archivedAt DateTime?`
- [ ] `AuditLog` is append-only: no update or delete operations, `actorId`, `action`, `entityType`, `entityId`, `before Json?`, `after Json?`, `createdAt`
- [ ] `prisma/seed.ts` seeds `RoleTemplate` (Owner, Manager, Cashier, Accountant) and the full `Permission` catalog
- [ ] `npx prisma migrate dev` runs cleanly and `npx prisma db seed` populates reference data
- [ ] Prisma client singleton exported from `core/database/client.ts`

## Blocked by

None — can start immediately.
