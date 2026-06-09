# Warehouse Platform — Issue Tracker

16 vertical slices for the MVP. Each slice is end-to-end (schema → API → UI → audit).

| # | Issue | Type | Blocked by |
|---|-------|------|-----------|
| 001 | [Foundation: Prisma schema & DB setup](001-foundation-prisma-schema.md) | AFK | — |
| 002 | [Auth: Employee login, session & middleware](002-auth-login-session-middleware.md) | AFK | 001 |
| 003 | [Audit logging](003-audit-logging.md) | AFK | 002 |
| 004 | [Dashboard shell & role-based navigation](004-dashboard-shell-navigation.md) | AFK | 002 |
| 005 | [Organization & Warehouse CRUD](005-organization-warehouse-crud.md) | AFK | 002 |
| 006 | [Roles & permission matrix](006-roles-permission-matrix.md) | AFK | 005 |
| 007 | [Employee management](007-employee-management.md) | AFK | 006 |
| 008 | [Product catalog](008-product-catalog.md) | AFK | 005 |
| 009 | [Inventory ledger](009-inventory-ledger.md) | AFK | 008 |
| 010 | [Low-stock alerts](010-low-stock-alerts.md) | AFK | 009 |
| 011 | [Supplier & purchase invoices](011-supplier-purchase-invoices.md) | AFK | 009 |
| 012 | [Customer & sales invoices](012-customer-sales-invoices.md) | AFK | 009 |
| 013 | [POS cashier flow](013-pos-cashier-flow.md) | AFK | 012 |
| 014 | [Basic profit & sales reports](014-basic-reports.md) | AFK | 012 |
| 015 | [Realtime events (SSE)](015-realtime-events.md) | AFK | 009 |
| 016 | [Public marketing site](016-public-marketing-site.md) | AFK | — |

## Dependency graph

```
001 ──► 002 ──► 003
              ├──► 004
              ├──► 005 ──► 006 ──► 007
              │         └──► 008 ──► 009 ──► 010
              │                         ├──► 011
              │                         ├──► 012 ──► 013
              │                         │         └──► 014
              │                         └──► 015
              └─────────────────────────────────────────────
016 (no blockers, parallel)
```

## Parallel start candidates

- **001** and **016** can start simultaneously on day one.
- After 002 lands, **003**, **004**, and **005** can all start in parallel.
- After 005 lands, **006** and **008** can run in parallel.
- After 009 lands, **010**, **011**, **012**, and **015** can all run in parallel.
