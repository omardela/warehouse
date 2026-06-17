---
title: "Purchase Returns — Credit Note linked to Purchase Invoice"
type: AFK
blocked_by: "019"
wave: "2"
---

## What to build

Allow staff to return goods to a supplier by raising a Purchase Credit Note against a confirmed Purchase Invoice. On confirmation, the credit note decrements stock (`RETURN_OUT` movement) and reduces the supplier's outstanding balance. The original invoice is never modified — the credit note is a separate immutable document.

## Acceptance criteria

- [ ] `CreditNote` model: `id`, `type` (enum: `PURCHASE`, `SALE`), `organisationId`, `warehouseId`, `originalInvoiceId` (FK to Invoice), `status` (enum: `DRAFT`, `CONFIRMED`, `CANCELLED`), `note` (nullable), `createdById`, `confirmedAt` (nullable), `createdAt`, `updatedAt`
- [ ] `CreditNoteLine` model: `creditNoteId`, `productId`, `unitId`, `displayQuantity`, `baseQuantity`, `unitPrice`
- [ ] `app/dashboard/purchases/[invoiceId]/credit-notes/new/page.tsx` — create purchase credit note from a confirmed invoice; lines are pre-filled from invoice lines (staff reduce quantities to what is being returned); requires at least one line with quantity > 0
- [ ] `app/dashboard/purchases/credit-notes/page.tsx` — list of all purchase credit notes with status filter
- [ ] `app/dashboard/purchases/credit-notes/[creditNoteId]/page.tsx` — credit note detail with lines, original invoice link, and confirm/cancel actions
- [ ] Confirming a credit note: triggers `recordMovement()` with `RETURN_OUT` for each line (stock decremented from warehouse); status → CONFIRMED; original invoice's `creditNoteId` reference updated
- [ ] Cancelling a draft credit note is allowed; cancelling a confirmed credit note is not (immutable once confirmed)
- [ ] Audit log entries for create, confirm, and cancel actions
- [ ] Requires `purchases.creditnotes.create` and `purchases.creditnotes.view` permissions (add to permission seed)

## Blocked by

- [019 — Purchase Order workflow](019-purchase-order-workflow.md)
