---
title: "Supplier & purchase invoices"
type: AFK
blocked_by: "009"
user_stories: "19, 20, 27"
---

## What to build

Let warehouse staff record purchases from suppliers: manage the supplier directory, create purchase invoices (what the warehouse bought), receive goods against those invoices (which triggers stock movements), and record payments against supplier balances. Purchase invoices are never deleted — cancelled invoices retain their history.

## Acceptance criteria

- [ ] `app/dashboard/suppliers/page.tsx` — supplier list (name, phone, balance owed); soft-delete supported (archive)
- [ ] `app/dashboard/suppliers/[supplierId]/page.tsx` — supplier details and transaction history (invoices + payments)
- [ ] `app/dashboard/purchases/page.tsx` — purchase invoice list with status filter (DRAFT, CONFIRMED, CANCELLED)
- [ ] `app/dashboard/purchases/new/page.tsx` — create purchase invoice: select supplier, add line items (product, quantity, unit, unit cost), set expected delivery date
- [ ] Confirming a purchase invoice (status → CONFIRMED) triggers `recordMovement()` for each line item with type `PURCHASE_IN`; this is atomic — all lines succeed or none do
- [ ] `app/dashboard/purchases/[invoiceId]/page.tsx` — invoice detail showing lines, total, payments, and remaining balance
- [ ] `app/dashboard/purchases/[invoiceId]/payments/new/page.tsx` — record a payment (amount, date, note) against the invoice; reduces remaining balance
- [ ] Cancelling a confirmed invoice requires `purchases.invoices.cancel` permission; emits audit log with before/after status; does NOT reverse stock movements (a manual adjustment is required separately)
- [ ] Draft invoices can be edited; confirmed invoices are immutable except for the cancel action
- [ ] All invoice and payment operations enforce backend permissions via `requirePermission()`

## Blocked by

- [009 — Inventory ledger](009-inventory-ledger.md)
