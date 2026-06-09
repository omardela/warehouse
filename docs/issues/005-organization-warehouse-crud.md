---
title: "Organization & Warehouse CRUD"
type: AFK
blocked_by: "002"
user_stories: "1, 2, 3"
---

## What to build

Let an organization owner create and manage their organization profile and warehouses. This is the root tenancy setup — every other entity (employees, inventory, sales) lives under a warehouse, so warehouse creation must be solid and observable before building downstream slices.

## Acceptance criteria

- [ ] `app/dashboard/settings/organization/page.tsx` — edit organization name, contact info; only visible to roles with `org.settings.edit`
- [ ] `app/dashboard/settings/warehouses/page.tsx` — list all warehouses belonging to the current organization
- [ ] Warehouse list shows name, address, created date, and employee count
- [ ] `app/dashboard/settings/warehouses/new/page.tsx` — form to create a warehouse (name, address, timezone)
- [ ] `app/dashboard/settings/warehouses/[warehouseId]/page.tsx` — edit warehouse details
- [ ] Server actions handle create/update with full validation (Zod schemas); errors surface as inline form messages
- [ ] Creating a warehouse emits `writeAuditLog()` with `action: "warehouse.create"`
- [ ] Editing a warehouse emits `writeAuditLog()` with `action: "warehouse.update"` and before/after snapshots of changed fields
- [ ] Warehouses cannot be hard-deleted from the UI — only editable
- [ ] A warehouse owner only sees warehouses that belong to their organization (enforced on the backend query, not just the frontend)

## Blocked by

- [002 — Auth: Employee login, session & middleware](002-auth-login-session-middleware.md)
