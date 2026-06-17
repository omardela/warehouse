---
title: "CSV import — Products, Customers, Suppliers"
type: AFK
blocked_by: "017"
wave: "2"
---

## What to build

Allow organisation admins to bulk-import master data via CSV upload. Three independent import flows share the same UX pattern: upload CSV → auto-detect columns → preview rows with validation errors highlighted → commit (all-or-nothing transaction). This is the primary onboarding path for organisations migrating from spreadsheets or legacy systems.

## Acceptance criteria

**Shared import UX pattern (applied to all three entity types):**
- [ ] File upload accepts `.csv` only; max 5 MB; parsed client-side for preview before any server call
- [ ] Column mapping step: detected CSV headers mapped to system fields; required fields flagged; unmapped optional fields skipped
- [ ] Preview table shows first 10 rows with per-cell validation errors inline (e.g., "duplicate SKU", "invalid email", "unknown category")
- [ ] Summary before commit: X rows valid, Y rows with errors; option to skip errors and import valid rows only, or fix and re-upload
- [ ] Import runs in a single database transaction; if the transaction fails the entire import is rolled back
- [ ] Import result page shows: rows imported, rows skipped, per-row error details downloadable as CSV

**Product import (`app/dashboard/products/import/page.tsx`):**
- [ ] Required columns: `name`, `sku`; optional: `category`, `baseUnit`, `barcode`, `description`
- [ ] Duplicate SKU within the file or against existing products is flagged as an error per row
- [ ] Unknown `category` or `baseUnit` values are flagged; valid values listed in the error message

**Customer import (`app/dashboard/customers/import/page.tsx`):**
- [ ] Required columns: `name`; optional: `email`, `phone`, `address`, `paymentTerms`, `creditLimit`
- [ ] `paymentTerms` must match enum values (COD, NET_15, NET_30, NET_60, NET_90); invalid values flagged
- [ ] `creditLimit` must be a positive number if provided

**Supplier import (`app/dashboard/suppliers/import/page.tsx`):**
- [ ] Required columns: `name`; optional: `email`, `phone`, `address`, `paymentTerms`
- [ ] Same `paymentTerms` validation as customer import

**Access control:**
- [ ] All three import pages require `settings.import` permission (add to permission seed)

## Blocked by

- [017 — Schema foundation](017-schema-foundation-modules-metadata.md)
