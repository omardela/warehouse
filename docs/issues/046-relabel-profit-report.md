---
title: "Relabel profit report as Revenue vs. Spend (Operational Approximation)"
type: AFK
blocked_by: ""
wave: "8.1"
---

## What to build

The current "Gross Profit" report (`tab === "profit"` in
`app/dashboard/reports/export/route.ts` and its UI counterpart) compares confirmed sales
invoice revenue against confirmed purchase invoice costs in the same calendar period. This
is not gross profit — it does not match the cost of goods actually sold (COGS) to the
revenue from those goods. Goods bought in November and sold in December will show a loss
in November and an inflated gain in December.

Architectural decision (2026-07-01): true gross profit requires a COGS calculation tied to
the inventory costing method, which is deferred to the Accounting Module. Until then, the
report must not be presented as accounting-grade data.

Two changes only — no formula or data changes:

1. **Rename** the report everywhere it appears:
   - Tab label in the UI: "Revenue vs. Spend" (was "Profit" or "Gross Profit")
   - CSV filename: `revenue-vs-spend-{period}.csv` (was `profit-report-*`)
   - CSV column header: "Revenue vs. Spend" instead of "Gross Profit"

2. **Add a disclaimer** visible in the UI below the tab/report title:
   > "This report compares confirmed sales revenue against confirmed purchase costs in the
   > same period. It is not an accounting-grade gross profit report and does not reflect
   > the cost of goods sold (COGS). A true Gross Profit report will be available in the
   > Accounting Module."

## Acceptance criteria

- [ ] The UI tab is labelled "Revenue vs. Spend" — the word "Profit" does not appear
      as a tab name or report title.
- [ ] A disclaimer paragraph is visible on the report page, explaining the limitation.
- [ ] The CSV export filename is `revenue-vs-spend-{period}.csv`.
- [ ] The CSV column previously labelled "Gross Profit" is now labelled
      "Revenue vs. Spend".
- [ ] No change to the underlying query, formula, or data returned.
- [ ] No other report pages are affected.

## Blocked by

None — can start immediately.
