---
title: "Audit logging (append-only, before/after values)"
type: AFK
blocked_by: "002"
user_stories: "28, 29, 30, 44"
---

## What to build

Build the audit logging utility that all subsequent slices will call. This is a thin server-side module — a single `writeAuditLog()` function that inserts an immutable record into the `AuditLog` table. Moving this up early means every feature built after this point can emit audit events without revisiting old code.

Audit logs must capture who did what, to which entity, and what changed. They are never updated or deleted.

## Acceptance criteria

- [ ] `core/audit/write-audit-log.ts` exports `writeAuditLog({ actorId, action, entityType, entityId, before?, after?, warehouseId? })` — async, returns `void`
- [ ] All parameters are strictly typed; `action` is a string union derived from the permission catalog (`"auth.login"`, `"inventory.movement.create"`, etc.)
- [ ] `before` and `after` accept any JSON-serializable object — callers pass the relevant field snapshot, not the full row
- [ ] The function performs a single `prisma.auditLog.create()` — no update or upsert — preserving append-only semantics
- [ ] `app/dashboard/audit/page.tsx` renders a paginated, read-only audit log table for the current warehouse, showing actor, action, entity, timestamp, and a diff view of before/after when present
- [ ] Audit log entries are filterable by action type and date range
- [ ] The audit log page is only visible to roles with `audit.logs.view` permission
- [ ] The auth login and login_failed stubs from issue #002 are wired up to call `writeAuditLog()` for real
- [ ] No audit log record can be deleted or modified via any API route — route handlers must have no DELETE or UPDATE path for `AuditLog`

## Blocked by

- [002 — Auth: Employee login, session & middleware](002-auth-login-session-middleware.md)
