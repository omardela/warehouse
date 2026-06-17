---
title: "Sales Returns — Credit Note linked to Sales Invoice"
type: AFK
blocked_by: "026, 023"
wave: "4"
---

## What to build

Allow staff to process customer returns by raising a Sales Credit Note against a confirmed Sales Invoice. On confirmation, the credit note restocks the returned goods (`RETURN_IN` movement) and reduces the customer's outstanding balance. Mirrors the purchase credit note flow from issue 023, applied to the sales side.

## Acceptance criteria

- [ ] Reuses the `CreditNote` and `CreditNoteLine` models introduced in issue 023 (type = `SALE`)
- [ ] `app/dashboard/sales/[invoiceId]/credit-notes/new/page.tsx` — create sales credit note from a confirmed sales invoice; lines pre-filled from invoice lines; staff reduce quantities to what the customer is actually returning
- [ ] `app/dashboard/sales/credit-notes/page.tsx` — list of all sales credit notes with status filter; columns: customer, original invoice, date, total, status
- [ ] `app/dashboard/sales/credit-notes/[creditNoteId]/page.tsx` — credit note detail with lines, original invoice link, confirm/cancel actions
- [ ] Confirming a sales credit note: triggers `recordMovement()` with `RETURN_IN` for each line (stock incremented back into warehouse); status → CONFIRMED
- [ ] Confirmed credit note reduces the customer's outstanding balance (visible on customer detail page from issue 022) — balance recalculation picks up credit notes automatically since it queries all financial documents against the customer
- [ ] Cancelling a draft credit note is allowed; confirmed credit notes are immutable
- [ ] Audit log entries for create, confirm, and cancel
- [ ] Requires `sales.creditnotes.create` and `sales.creditnotes.view` permissions (add to permission seed)

## Blocked by

- [026 — Sales Order workflow](026-sales-order-workflow.md)
- [023 — Purchase Returns](023-purchase-returns-credit-notes.md)
