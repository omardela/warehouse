---
title: "Schema foundation — OrganisationModule, payment metadata, tax hook, reorder fields"
type: AFK
blocked_by: "none"
wave: "1"
---

## What to build

Extend the Prisma schema with the structural fields that all Wave 2+ issues depend on. No UI is required — this is a pure schema migration that unblocks parallel work across modules, AR, reorder points, and CSV import.

Four additions:

1. **`OrganisationModule`** — join table enabling optional modules per organisation (`organisationId`, `moduleKey`, `enabledAt`, `enabledBy`). Module keys match the optional module names defined in CONTEXT.md (e.g., `TAX`, `BATCH_TRACKING`, `EXPIRY_TRACKING`).
2. **Customer payment metadata** — `paymentTerms` (enum: `COD`, `NET_15`, `NET_30`, `NET_60`, `NET_90`) and `creditLimit` (Decimal, nullable) on `Customer`.
3. **Supplier payment metadata** — `paymentTerms` (same enum) on `Supplier`.
4. **Invoice tax hook** — nullable `taxAmount` (Decimal) on `Invoice`. No tax logic — just a field the future Tax module can populate.
5. **Reorder fields** — `reorderPoint` (Int, nullable) and `reorderQty` (Int, nullable) on `InventoryBalance`.

## Acceptance criteria

- [ ] `OrganisationModule` model added to schema with `organisationId`, `moduleKey` (String), `enabledAt` (DateTime), `enabledBy` (FK to Employee); unique constraint on `(organisationId, moduleKey)`
- [ ] `Customer` has `paymentTerms` (enum, nullable, default null) and `creditLimit` (Decimal, nullable)
- [ ] `Supplier` has `paymentTerms` (enum, nullable, default null)
- [ ] `Invoice` has `taxAmount` (Decimal, nullable, default null)
- [ ] `InventoryBalance` has `reorderPoint` (Int, nullable) and `reorderQty` (Int, nullable)
- [ ] `PaymentTerms` enum defined: `COD`, `NET_15`, `NET_30`, `NET_60`, `NET_90`
- [ ] Migration runs cleanly against existing data with no breaking changes (all new fields are nullable or have defaults)
- [ ] Prisma client regenerated and TypeScript compiles with no errors

## Blocked by

None — can start immediately.
