---
title: "AP Aging report — outstanding purchase invoices grouped by overdue days"
type: AFK
blocked_by: "042"
wave: "8.2"
---

## What to build

Add an Accounts Payable Aging report that mirrors the existing AR Aging report
(`app/dashboard/reports/ar-aging/`) exactly, applied to the purchase side. The report
shows all outstanding confirmed Purchase Invoices grouped by how many days overdue they
are, giving the finance team visibility into what is owed to suppliers and when.

All required data already exists: confirmed Purchase Invoices, Suppliers, Payments, Credit
Notes, due dates, and `computeOutstandingBalance`. This is a structural mirror of issue
027 (AR aging) — same calculation rules, same bucket definitions, same views, same export
format.

### Pages and routes

- `app/dashboard/reports/ap-aging/page.tsx` — AP aging report UI
- `app/dashboard/reports/ap-aging/export/route.ts` — CSV export route

### Aging buckets

Same five buckets as AR aging: **Current** (not yet overdue), **1–30 days**,
**31–60 days**, **61–90 days**, **90+ days**.

Days overdue: `max(0, asOfDate − Invoice.dueDate)`. Invoices with no `dueDate` fall into
the Current bucket.

### Views

- **By Supplier**: one row per supplier — columns: Supplier, Current, 1–30, 31–60, 61–90,
  90+, Total Outstanding. Sorted by Total Outstanding descending.
- **By Invoice**: one row per outstanding invoice — columns: Supplier, Invoice #, Invoice
  Date, Due Date, Original Amount, Paid Amount, Balance, Days Overdue. Sorted by days
  overdue descending.

### Outstanding balance

Use `computeOutstandingBalance` with credit notes filtered to `status: "CONFIRMED"` only
(the fix applied in issue 042 — this is why 047 is blocked by 042).

## Acceptance criteria

- [ ] `app/dashboard/reports/ap-aging/page.tsx` renders the AP aging report with
      By Supplier and By Invoice views, toggled on the same page.
- [ ] Supplier filter: all suppliers or a single supplier.
- [ ] As-of date filter: default today; allows historical snapshots.
- [ ] Zero-balance invoices (fully paid or fully credit-noted) are excluded.
- [ ] CSV export of the active view via `app/dashboard/reports/ap-aging/export/route.ts`.
- [ ] CSV filename: `ap-aging-{view}-{date}.csv`.
- [ ] Credit notes included in balance use `status: "CONFIRMED"` filter only.
- [ ] Report requires a `reports.ap.view` permission (add to permission seed if not
      present; mirror the `reports.ar.view` permission).
- [ ] Navigation: AP aging is accessible from the same Reports section as AR aging.
- [ ] AP aging totals are consistent with what the payment actions compute for the same
      invoices (same formula, same credit note filter).
- [ ] Test: purchase invoice $500, payment $200, confirmed credit note $50 — AP aging
      balance shows $250, not $300.

## Blocked by

- [042 — Restrict credit note balance filter to CONFIRMED status only](042-confirmed-only-credit-note-balance-filter.md)
