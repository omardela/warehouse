---
title: "Customer AR metadata — credit limit, payment terms, invoice due dates"
type: AFK
blocked_by: "017"
wave: "2"
---

## What to build

Extend the Customer form and detail page to expose the `creditLimit` and `paymentTerms` fields added in issue 017. Wire payment terms to invoice due date calculation on Sales Invoices. This is the operational AR layer — no accounting engine, no journal entries. Outstanding balance is derived from confirmed invoices minus payments.

## Acceptance criteria

- [ ] Customer create and edit forms include `paymentTerms` (dropdown: COD, Net 15, Net 30, Net 60, Net 90) and `creditLimit` (currency input, nullable — blank means no limit)
- [ ] Customer detail page shows: outstanding balance (sum of confirmed sales invoice totals minus payments for this customer), credit limit, available credit (limit minus outstanding), and payment terms
- [ ] Outstanding balance is computed at request time from `Invoice` and `Payment` records — no separate balance field
- [ ] Sales Invoice confirm action calculates and stores `dueDate` on the invoice based on `customer.paymentTerms` and `invoice.confirmedAt` (e.g., Net 30 → dueDate = confirmedAt + 30 days; COD → dueDate = confirmedAt)
- [ ] `Invoice` model gains `dueDate` (DateTime, nullable) field (migration)
- [ ] Invoice detail page displays due date and a "Overdue" badge if `dueDate < now` and invoice is not fully paid
- [ ] Customer list page shows outstanding balance column
- [ ] Credit limit enforcement is added in issue 026 (SO confirmation) — this issue only exposes the fields and computes balance

## Blocked by

- [017 — Schema foundation](017-schema-foundation-modules-metadata.md)
