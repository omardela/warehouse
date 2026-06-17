---
title: "AR Aging report — outstanding invoices grouped by overdue days"
type: AFK
blocked_by: "022"
wave: "3"
---

## What to build

Add an Accounts Receivable Aging report that shows all outstanding sales invoices grouped by how many days overdue they are. The report gives the finance team visibility into which customers owe money and for how long, enabling collections follow-up. Data is derived entirely from confirmed invoices and payments — no accounting engine.

## Acceptance criteria

- [ ] `app/dashboard/reports/ar-aging/page.tsx` — aging report with two views: **by customer** (one row per customer, columns: Current, 1–30 days, 31–60 days, 61–90 days, 90+ days, Total Outstanding) and **by invoice** (one row per outstanding invoice with customer, invoice number, invoice date, due date, original amount, paid amount, balance, days overdue)
- [ ] Toggle between "By Customer" and "By Invoice" views on the same page
- [ ] "Outstanding" means: confirmed sales invoices where `totalAmount - sum(payments.amount) > 0`
- [ ] Days overdue calculated as `max(0, today - dueDate)`; invoices with no `dueDate` are shown in the "Current" bucket
- [ ] Customer filter: all customers or a single customer
- [ ] As-of date filter: default today; allows generating historical aging snapshots
- [ ] CSV export of the active view
- [ ] Report requires `reports.ar.view` permission (add to permission seed)
- [ ] Zero-balance invoices (fully paid) are excluded

## Blocked by

- [022 — Customer AR metadata](022-customer-ar-metadata.md)
