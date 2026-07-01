---
title: "Sequential document numbers on all business documents"
type: AFK
blocked_by: ""
wave: "8.1"
---

## What to build

All business documents currently use a `cuid()` as their only identifier. These are opaque
to users and cannot be quoted in supplier/customer correspondence or reconciled against
bank statements. Every document needs a permanent, human-readable sequential number
assigned at creation and immutable for its lifetime.

Architectural rule (resolved 2026-07-01): document numbers are assigned at document
**creation** (DRAFT), not at confirmation. The number is immutable — it never changes
regardless of status transitions.

### Schema changes

Add a `DocumentSequence` table:

```prisma
model DocumentSequence {
  id             String       @id @default(cuid())
  organizationId String
  documentType   String       // e.g. "SALES_INVOICE", "PURCHASE_ORDER"
  lastNumber     Int          @default(0)
  organization   Organization @relation(fields: [organizationId], references: [id])

  @@unique([organizationId, documentType])
  @@map("document_sequences")
}
```

Add a `number String @unique` field to each of these models:

| Model | Prefix | Example |
|---|---|---|
| `PurchaseOrder` | `PO` | `PO-2026-0001` |
| `SalesOrder` | `SO` | `SO-2026-0001` |
| `GoodsReceipt` | `GR` | `GR-2026-0001` |
| `DeliveryNote` | `DN` | `DN-2026-0001` |
| `Invoice` (type SALE) | `INV` | `INV-2026-0001` |
| `Invoice` (type PURCHASE) | `PINV` | `PINV-2026-0001` |
| `CreditNote` | `CN` | `CN-2026-0001` |
| `Payment` | `PAY` | `PAY-2026-0001` |

Format: `{PREFIX}-{YYYY}-{NNNN}` where `YYYY` is the year and `NNNN` is a zero-padded
4-digit counter per organisation per document type per year. The year resets the counter
(each new year starts at 0001).

### Utility function

Add `getNextDocumentNumber(organizationId, documentType, year, tx)` in a shared location
(e.g. `core/documents/get-next-document-number.ts`). It must:

- Run inside the caller's active transaction (`tx`)
- Atomically increment `DocumentSequence.lastNumber` using
  `UPDATE document_sequences SET last_number = last_number + 1 WHERE organization_id = ? AND document_type = ? RETURNING last_number`
  (or Prisma's `$executeRaw` + `findUnique` equivalent with `FOR UPDATE`)
- Upsert the row if it doesn't exist yet (first document of that type for the org)
- Return the formatted string

### Wiring

Call `getNextDocumentNumber` inside the creation transaction for every document type
listed above. The `number` field is passed to the `create` call alongside all other
fields. All creation actions are affected — purchase orders, sales orders, goods receipts,
delivery notes, invoices (both types), credit notes, and payments.

## Acceptance criteria

- [ ] `DocumentSequence` table exists with the schema above.
- [ ] `number` field added to all eight models; non-nullable with `@unique`.
- [ ] Prisma migration generated and applied.
- [ ] `getNextDocumentNumber` utility implemented and tested in isolation.
- [ ] Numbers are generated atomically — two concurrent document creations for the same
      org and type never produce the same number.
- [ ] Format is `{PREFIX}-{YYYY}-{NNNN}` (e.g. `INV-2026-0042`).
- [ ] Number is assigned at creation (DRAFT), not at confirmation.
- [ ] Number is immutable — no action in the codebase updates it after creation.
- [ ] Document numbers appear in the UI on all detail pages and list views.
- [ ] Document numbers appear in all CSV exports (AR aging, AP aging, stock valuation,
      sales/purchase reports).
- [ ] Test: create two invoices concurrently for the same org — assert unique sequential
      numbers are assigned with no gaps between them.
- [ ] Test: numbers reset to 0001 for a new year.

## Blocked by

None — can start immediately.
