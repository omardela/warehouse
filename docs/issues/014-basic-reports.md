---
title: "Basic profit & sales reports"
type: AFK
blocked_by: "012"
user_stories: "21, 45"
---

## What to build

Provide warehouse owners and accountants with a small set of operational reports derived from confirmed invoices and inventory movements. Reports are read-only and should work correctly even when older records are archived. No custom report builder — just the fixed set defined here.

## Acceptance criteria

- [ ] `app/dashboard/reports/page.tsx` — report hub with links to each report type; requires `reports.view` permission
- [ ] **Sales summary report** — total revenue, number of invoices, and top 10 products by quantity sold for a selectable date range; derived from confirmed SALE invoices
- [ ] **Purchase summary report** — total spend, number of purchase invoices, and top 10 products by quantity purchased for a selectable date range; derived from confirmed PURCHASE invoices
- [ ] **Profit report** — gross profit = sales revenue minus purchase cost for the same products in the same period; uses cost captured on purchase invoice lines as cost basis
- [ ] **Stock valuation report** — current stock quantity × average purchase cost per product; snapshot at "now"
- [ ] All reports have a date-range picker (preset: today, this week, this month, this year, custom)
- [ ] Each report renders a Recharts chart (bar or line as appropriate) and a data table below it
- [ ] Report queries include confirmed and cancelled (for audit) but exclude drafts; archived products still appear in historical reports
- [ ] Reports are backend-computed via route handlers — no heavy computation on the client
- [ ] CSV export is available for each report table

## Blocked by

- [012 — Customer & sales invoices](012-customer-sales-invoices.md)
