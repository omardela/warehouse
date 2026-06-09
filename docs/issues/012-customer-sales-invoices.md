---
title: "Customer & sales invoices"
type: AFK
blocked_by: "009"
user_stories: "18, 20, 26, 27"
---

## What to build

Let warehouse staff record sales to customers: manage the customer directory, create sales invoices, confirm them (which triggers stock deductions), and record payments against customer balances. Mirrors the purchase flow but in the outbound direction. Sales invoices are never hard-deleted.

## Acceptance criteria

- [ ] `app/dashboard/customers/page.tsx` — customer list (name, phone, outstanding balance); soft-delete (archive) supported
- [ ] `app/dashboard/customers/[customerId]/page.tsx` — customer details and transaction history (invoices + payments)
- [ ] `app/dashboard/sales/page.tsx` — sales invoice list with status filter (DRAFT, CONFIRMED, CANCELLED)
- [ ] `app/dashboard/sales/new/page.tsx` — create sales invoice: select customer, add line items (product, quantity, unit, unit price), apply discount if any
- [ ] Confirming a sales invoice (status → CONFIRMED) triggers `recordMovement()` for each line item with type `SALE_OUT`; atomic — all lines or none
- [ ] `recordMovement()` blocks the confirm if any line would drive a product's balance below zero (shows clear error identifying which product)
- [ ] `app/dashboard/sales/[invoiceId]/page.tsx` — invoice detail with lines, totals, payment history, and remaining balance
- [ ] `app/dashboard/sales/[invoiceId]/payments/new/page.tsx` — record a customer payment (amount, date, note)
- [ ] Cancelling a confirmed sales invoice requires `sales.invoices.cancel`; emits audit log; does NOT auto-reverse stock (manual adjustment required)
- [ ] Draft invoices are editable; confirmed invoices are immutable except cancellation
- [ ] All operations enforce backend permissions via `requirePermission()`

## Blocked by

- [009 — Inventory ledger](009-inventory-ledger.md)
