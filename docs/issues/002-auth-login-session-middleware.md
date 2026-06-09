---
title: "Auth: Employee login, session & middleware"
type: AFK
blocked_by: "001"
user_stories: "3, 12, 25, 30"
---

## What to build

Implement the full authentication layer: the login page, session management, and Next.js middleware that protects every dashboard route. All employees (including warehouse owners) log in through the same entry point — the session carries enough context (employee ID, warehouse ID, org ID, role) to drive permission checks downstream.

Authentication is warehouse-scoped: an employee credential belongs to one warehouse account. There is no global user concept.

## Acceptance criteria

- [ ] `app/(auth)/login/page.tsx` renders a login form (email + password)
- [ ] Server action validates credentials against the `Employee` table (hashed password with bcrypt)
- [ ] On success, a signed session cookie is set containing `{ employeeId, warehouseId, orgId, roleId }`
- [ ] On failure, a clear error message is shown (no credential enumeration — same message for unknown email and wrong password)
- [ ] Next.js middleware (`middleware.ts`) intercepts all `/dashboard/*` routes and redirects unauthenticated requests to `/login`
- [ ] `core/auth/session.ts` exports `getSession()` — a server-side helper that reads and verifies the session cookie, returning the typed session payload or `null`
- [ ] Logout clears the session cookie and redirects to `/login`
- [ ] Login event is written to `AuditLog` with `action: "auth.login"` (uses audit utility from issue #003 once available — stub the call for now)
- [ ] Failed login attempts are logged to `AuditLog` with `action: "auth.login_failed"`
- [ ] Password is never stored in plaintext; bcrypt hash is used

## Blocked by

- [001 — Foundation: Prisma schema & DB setup](001-foundation-prisma-schema.md)
