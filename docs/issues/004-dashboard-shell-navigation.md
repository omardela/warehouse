---
title: "Dashboard shell & role-based navigation"
type: AFK
blocked_by: "002"
user_stories: "11, 35, 36"
---

## What to build

Build the authenticated dashboard shell: the persistent sidebar, top bar, and layout wrapper that every dashboard page lives inside. Navigation items must be gated by the current user's permissions — a cashier must not see the accounting section, and a viewer must not see employee management.

This slice also establishes the pattern for frontend permission enforcement that all later slices follow.

## Acceptance criteria

- [ ] `app/dashboard/layout.tsx` wraps all dashboard pages with the shell; unauthenticated access is blocked by middleware (from issue #002)
- [ ] Sidebar renders navigation groups: Inventory, Sales, Purchases, POS, Employees, Roles & Permissions, Reports, Audit, Settings
- [ ] Each nav item is conditionally rendered based on the session's resolved permissions — items the user cannot access are hidden, not just disabled
- [ ] `core/auth/permissions.ts` exports `hasPermission(session, permission: string): boolean` used by both frontend and backend
- [ ] `hooks/use-permissions.ts` exposes the current session's permission set to client components
- [ ] Top bar shows the current warehouse name, the logged-in employee name, and a logout button
- [ ] Dark/light mode toggle is present and persisted via `next-themes`
- [ ] The shell is responsive; on small screens the sidebar collapses to an icon rail or drawer
- [ ] A warehouse-context provider wraps the layout so any child can read `warehouseId` and `orgId` without prop drilling

## Blocked by

- [002 — Auth: Employee login, session & middleware](002-auth-login-session-middleware.md)
