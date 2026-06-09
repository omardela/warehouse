---
title: "Employee management (create, assign role, archive)"
type: AFK
blocked_by: "006"
user_stories: "4, 5, 6"
---

## What to build

Let warehouse owners and managers create employee accounts scoped to their warehouse, assign a role to each employee, and archive employees without destroying historical records. An employee account belongs to exactly one warehouse — moving someone to a different warehouse means creating a new account there.

## Acceptance criteria

- [ ] `app/dashboard/employees/page.tsx` — paginated employee list showing name, email, role, status (active/archived), and joined date; archived employees are hidden by default with a toggle to show them
- [ ] `app/dashboard/employees/new/page.tsx` — form to create an employee (full name, email, temporary password, role selection from warehouse roles)
- [ ] `app/dashboard/employees/[employeeId]/page.tsx` — view/edit employee details and role assignment
- [ ] Role assignment dropdown shows only `WarehouseRole` records for the current warehouse
- [ ] Archiving an employee sets `archivedAt` and immediately invalidates their session (next request returns 401)
- [ ] Archived employees remain in all historical records (invoices, movements, audit logs) — they are not scrubbed
- [ ] Hard delete is not available from any UI or API route for employees
- [ ] Employee creation requires `employees.create` permission; role change requires `employees.role.assign`; archive requires `employees.archive`
- [ ] Employee creation, role changes, and archive events each emit an audit log entry with before/after values
- [ ] Passwords are stored as bcrypt hashes; the create form sends a temporary password that the employee should change on first login (first-login prompt is a stretch goal for this slice)

## Blocked by

- [006 — Roles & permission matrix](006-roles-permission-matrix.md)
