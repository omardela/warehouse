---
title: "Roles & permission matrix (templates + custom per warehouse)"
type: AFK
blocked_by: "005"
user_stories: "6, 7, 8, 9, 10, 12"
---

## What to build

Implement the full role and permission management system. Warehouse owners pick from seeded role templates (Owner, Manager, Cashier, Accountant) and then customize which permissions each role has for their specific warehouse. The same role name can have a different permission set in different warehouses.

Permissions use the `module.resource.action` format (e.g. `inventory.products.view`, `sales.invoices.cancel`). The full permission catalog comes from the seeded `Permission` table.

This slice also completes the backend authorization guard pattern — every protected route handler calls `requirePermission()` before executing any business logic.

## Acceptance criteria

- [ ] `app/dashboard/settings/roles/page.tsx` — lists all `WarehouseRole` records for the current warehouse; each row shows role name and a summary of assigned permissions
- [ ] `app/dashboard/settings/roles/[roleId]/page.tsx` — shows the full permission matrix for the role, grouped by module; each permission is a checkbox
- [ ] Owner can enable/disable any permission from the catalog for any role in their warehouse
- [ ] Saving the permission matrix updates `WarehouseRolePermission` records in a single transaction (delete-then-insert pattern to avoid stale entries)
- [ ] `core/auth/require-permission.ts` exports `requirePermission(session, permission)` — throws a 403 response if the permission is absent; used at the top of every protected route handler and server action
- [ ] Permission changes emit `writeAuditLog()` with `action: "role.permissions.update"` and a before/after snapshot of the full permission list for that role
- [ ] The permission selection UI displays permissions as a grouped multi-select list organized by module (not free-text input)
- [ ] A role with no permissions assigned is valid — it simply cannot do anything
- [ ] Backend enforces warehouse isolation: only the warehouse owner (or someone with `roles.manage`) can modify roles for their warehouse

## Blocked by

- [005 — Organization & Warehouse CRUD](005-organization-warehouse-crud.md)
