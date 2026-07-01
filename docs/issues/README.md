# Warehouse Platform — Issue Tracker

16 vertical slices for the MVP. Each slice is end-to-end (schema → API → UI → audit).

| # | Issue | Type | Blocked by |
| --- | ------- | ------ | ---------- |
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

```text
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

## Wave 7 — purchasing/sales architecture review fixes (2026-06-28)

Resolved during the ERP architecture grilling session (`CONTEXT.md`, ADR-0001). All six
are AFK — every open design question was already resolved before these were written.

| # | Issue | Type | Blocked by |
| --- | ------- | ------ | ---------- |
| 035 | [Atomic conditional updates for Goods Receipt & Delivery Note quantity caps](035-atomic-quantity-cap-updates.md) | AFK | — |
| 036 | [Purchase Order: multi-invoice support (invoicedBaseQuantity)](036-purchase-order-multi-invoice.md) | AFK | 035 |
| 037 | [Sales Invoice ↔ Delivery Note linkage + delivered-quantity validation](037-sales-invoice-delivery-note-linkage.md) | AFK | — |
| 038 | [Fix outstanding balance formula to include Credit Notes (sales + purchase)](038-fix-balance-formula-credit-notes.md) | AFK | — |
| 039 | [Purchase Order CLOSED status](039-purchase-order-closed-status.md) | AFK | — |
| 040 | [Sales Order CLOSED status](040-sales-order-closed-status.md) | AFK | — |

### Wave 7 dependency graph

```text
035 ──► 036
037 (parallel, no blockers)
038 (parallel, no blockers)
039 (parallel, no blockers)
040 (parallel, no blockers)
```

### Wave 7 parallel start candidates

- **035**, **037**, **038**, **039**, and **040** can all start simultaneously.
- **036** waits on **035** landing (reuses its atomic-update helper for the new
  `invoicedBaseQuantity` increment).

---

## Wave 8 — accounting architecture review fixes (2026-07-01)

Resolved during the accounting architecture grilling session. All decisions recorded in
`CONTEXT.md` and flagged as ADR candidates. Wave 8.1 issues are fully parallel with no
inter-dependencies. Wave 8.2 waits on one Wave 8.1 issue landing.

### Wave 8.1 — all parallel, no blockers

| # | Issue | Type | Blocked by |
| --- | ------- | ------ | ---------- |
| 041 | [Guard CONFIRMED invoice cancellation (Sales + Purchase)](041-guard-confirmed-invoice-cancellation.md) | AFK | — |
| 042 | [Restrict credit note balance filter to CONFIRMED status only](042-confirmed-only-credit-note-balance-filter.md) | AFK | — |
| 043 | [returnedBaseQuantity on InvoiceLine — atomic cap enforcement for credit note returns](043-invoice-line-returned-base-quantity.md) | AFK | — |
| 044 | [POS auto-payment — record Payment inside sale transaction](044-pos-auto-payment.md) | AFK | — |
| 045 | [Sequential document numbers on all business documents](045-sequential-document-numbers.md) | AFK | — |
| 046 | [Relabel profit report as Revenue vs. Spend (Operational Approximation)](046-relabel-profit-report.md) | AFK | — |

### Wave 8.2 — after 042 lands

| # | Issue | Type | Blocked by |
| --- | ------- | ------ | ---------- |
| 047 | [AP Aging report](047-ap-aging-report.md) | AFK | 042 |

### Wave 8 dependency graph

```text
041 (parallel, no blockers)
042 ──► 047
043 (parallel, no blockers)
044 (parallel, no blockers)
045 (parallel, no blockers)
046 (parallel, no blockers)
```

### Wave 8 parallel start candidates

- **041**, **042**, **043**, **044**, **045**, and **046** can all start simultaneously on
  day one.
- **047** waits on **042** landing so it inherits the correct CONFIRMED-only credit note
  filter from the start rather than introducing a divergent implementation.
