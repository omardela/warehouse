# LogiCore — Domain Glossary

> This file is a glossary of resolved domain terms and architectural decisions.
> It contains NO implementation details, specs, or task lists.
> Updated inline as terms are resolved during design sessions.

---

## System Identity

**LogiCore** — A general-purpose warehouse and distribution ERP.
Target vertical: general distribution / wholesale.
Supports mixed product types in the same warehouse (merchandise, building materials, electronics, spare parts, food & beverage).
The core system is industry-agnostic; industry-specific behaviour is delivered via optional **Modules**.

---

## Core Modules (always on)

| Module | Description |
|---|---|
| Inventory | Stock tracking, movements, adjustments, balances |
| Products | Catalog, units, unit conversions |
| Sales | Sales Orders, Delivery Notes, Sales Invoices, Payments |
| Purchases | Purchase Orders, Goods Receipts, Purchase Invoices, Payments |
| Customers | Customer master data, credit metadata |
| Suppliers | Supplier master data, payment term metadata |
| POS | Point-of-sale terminal for counter/walk-in sales |
| Transfers | Stock transfers between warehouses |
| Returns | Sales returns and purchase returns via Credit Notes |
| Reporting | Operational reports: stock, sales, purchases, AR aging |
| RBAC | Role-based access control, per-warehouse permissions |
| Audit | Append-only audit trail |

---

## Optional Modules (disabled by default, enabled per organisation)

| Module | Description |
|---|---|
| Expiry Tracking | Expiry date per stock batch, FEFO rotation alerts |
| Batch / Lot Tracking | Batch/lot numbers on stock movements |
| Manufacturing | Bill of Materials, work orders, raw material consumption |
| Multi-Currency | Currency conversion on invoices and payments |
| Tax | VAT/GST rules, tax classes per product, per-jurisdiction rates |
| Accounting | Journal entries, chart of accounts, full AP/AR ledger |
| Price Lists | Named price lists assigned to customers |

---

## Key Terms

### Stock Transfer
A direct, atomic movement of stock from one Warehouse to another.
Emits one `TRANSFER_OUT` movement on the source and one `TRANSFER_IN` on the destination in the same transaction.
No in-transit state — both movements are recorded simultaneously.
Model: source warehouse, destination warehouse, transfer lines (product, unit, quantity), confirmed by, timestamp.

### Sales Order (SO)
A customer's commitment to purchase, created before goods are shipped.
Statuses: `DRAFT → CONFIRMED → PARTIAL → FULFILLED | CANCELLED`.
Confirmation reserves stock. Fulfilment is tracked via one or more **Delivery Notes**.
A **Sales Invoice** is raised against the Delivery Note, not the SO directly.

### Delivery Note
Proof of what physically left the warehouse on a specific shipment.
Linked to a Sales Order. May cover partial fulfilment.
Triggers stock decrement (`SALE_OUT` movement) on confirmation.
A Sales Invoice is raised from the Delivery Note.
**Sales Invoice links to `deliveryNoteId`, never to `salesOrderId` directly** (decided
2026-06-28). The Delivery Note is the operational document that owns delivered quantities,
so invoice-quantity validation (`invoiced ≤ delivered`) is performed against the linked
Delivery Note's lines, not the Sales Order's. Preserves the
`Sales Order → Delivery Note → Sales Invoice` separation — Sales Invoice is never
re-coupled to Sales Order.
**One Delivery Note maps to at most one Sales Invoice** (`Invoice.deliveryNoteId` is
unique) — partial invoicing of a Sales Order is achieved only by creating multiple
Delivery Notes (DN#1→Invoice#1, DN#2→Invoice#2), each fully invoiced once. This means
sales-side partial invoicing is coarser-grained than purchase-side (which invoices at the
Purchase Order line level, ignoring Goods Receipt boundaries) — an accepted, intentional
asymmetry, not a bug.
There are two distinct, opposite-direction FKs between Invoice and DeliveryNote and they
are mutually exclusive per Invoice — enforced at the application level (no DB constraint),
consistent with this codebase's existing convention for cross-document quantity rules:
- `DeliveryNote.invoiceId` — set when the DN was created **implicitly because of** a
  direct/POS Sales Invoice (Invoice existed first; DN is the dependent record).
- `Invoice.deliveryNoteId` — set when the Invoice was **raised from** a pre-existing DN
  that came from a Sales Order (DN existed first; Invoice is the dependent record).
A DeliveryNote with `invoiceId` set (implicit) must never also be the target of an
`Invoice.deliveryNoteId`.

### Purchase Order (PO)
A commitment to buy from a supplier, sent before goods arrive.
Statuses: `DRAFT → SENT → PARTIAL → RECEIVED | CANCELLED | CLOSED`.
Enables "on order" stock visibility.
A PO may be invoiced over **multiple Purchase Invoices** (decided 2026-06-28, supersedes
the wave-6 "one PO, one invoice" constraint). Each `PurchaseOrderLine` tracks cumulative
`invoicedBaseQuantity` separately from `receivedBaseQuantity`; a new invoice may only bill
`receivedBaseQuantity - invoicedBaseQuantity` per line, never more.

### Order Closure vs Cancellation (PO and SO)
**Cancelled** — no execution ever happened (no Goods Receipt / Delivery Note exists yet).
Only reachable from `DRAFT` or `SENT`/pre-confirmation states.
**Closed** — execution started (at least one Goods Receipt / Delivery Note exists), and
the business has agreed the remaining quantity will never be fulfilled. Only reachable
from `PARTIAL`. History (Ordered/Received/Delivered/Invoiced/Returned) is preserved
unchanged — closing never rewrites past quantities, it only stops future fulfilment.
**Completed** (`RECEIVED` / `FULFILLED`) — the entire ordered quantity was fulfilled.
Terminal; does not need closing.

### Goods Receipt
Records what physically arrived from a supplier against a Purchase Order.
May be partial (not all PO lines received).
Triggers stock increment (`PURCHASE_IN` movement) on confirmation.
A **Purchase Invoice** is matched against the Goods Receipt.

### Credit Note
A financial document issued when goods are returned.
Always linked to an original Invoice (Sales or Purchase).
On confirmation: stock is restocked and the customer/supplier's balance is reduced.
Not a reversal — the original invoice remains immutable.

### Outstanding Balance
`Invoice Total − Payments − confirmed Credit Notes` (Sales and Purchase alike).
**Known gap (found 2026-06-28, not yet fixed):** `createSalesPaymentAction` and
`createPurchaseInvoicePaymentAction`-equivalent both currently compute remaining balance
as `totalAmount − totalPaid`, omitting Credit Notes. A confirmed return on a
partially-paid invoice currently lets the counterparty overpay relative to the true
balance. Fix is a straight formula correction, not a design decision — sum confirmed
Credit Note line totals for the invoice and subtract them too.

### Accounts Receivable (AR) — operational layer
Derived from confirmed Sales Invoices minus recorded Payments.
`Customer` carries `creditLimit` and `paymentTerms` as metadata.
Credit limit is checked on Sales Order confirmation — warn or block if exceeded.
AR aging report groups outstanding invoices by days overdue.
No journal entries or accounting engine — those belong to the future **Accounting Module**.

### Payment Terms
Metadata on `Customer` and `Supplier` indicating agreed settlement period.
Values: `COD`, `NET_15`, `NET_30`, `NET_60`, `NET_90`.
Used to calculate invoice due dates and drive aging reports.
Readable by the future Accounting Module without schema changes.

### Credit Limit
A cap on the total outstanding AR balance allowed for a Customer.
Stored on `Customer`. Enforced at Sales Order confirmation.
No equivalent on Supplier — AP management deferred to Accounting Module.

### Pricing
Product prices are entered manually per Sales Order / Invoice line.
No system-enforced price lists in the core system.
Price Lists are an optional Module.

### Reorder Point
The minimum stock level for a product in a specific warehouse that triggers a low stock alert.
Stored as `reorderPoint` and `reorderQty` on `InventoryBalance` (per product per warehouse).
When `quantity` falls below `reorderPoint`, a low stock notification fires and the product appears on the Low Stock report.
Different warehouses may have different thresholds for the same product.

### Module System
Optional features are enabled per Organisation via an `OrganisationModule` table: `{ organisationId, moduleKey, enabledAt, enabledBy }`.
Schema fields required by optional modules are nullable on the base tables — null when the module is off, populated when on.
The core application checks module enablement at runtime to show/hide module UI and enforce module-specific logic.

### Document Output
Sales Invoices, Purchase Orders, Delivery Notes, and Credit Notes have print-optimised views.
Staff use browser print → Save as PDF to produce documents. No server-side PDF generation in the core.
Server-side generation is deferred until email sending becomes a requirement.

### Barcode Label Printing
Products carry a `barcode` field. A "Print Label" action on the Product page and Goods Receipt page renders a print-optimised label (barcode, product name, SKU, unit) using a CSS print stylesheet.
No external label printing service in the core.

### Bulk Import
Organisations can import master data via CSV: Products, Customers, and Suppliers.
Import flow: upload CSV → map columns → preview errors → transactional commit (all-or-nothing).

### Employee Management
Employees are created by an admin who sets their password directly.
No email invite flow. No self-registration.
SaaS onboarding features (self-registration, email invites) are deferred.

---

## Accounting Boundary

LogiCore is **not** an accounting system. It is an operational warehouse ERP.
- Balances are **derived** (invoice totals minus payments), not ledger-posted.
- No journal entries, chart of accounts, or double-entry bookkeeping in the core.
- `Customer.paymentTerms`, `Customer.creditLimit`, `Supplier.paymentTerms` are metadata hooks for the future **Accounting Module**.
- The Accounting Module will extend the data model — it will not require major refactoring of existing tables.

---

## Invoice Immutability

All invoices (Sales, Purchase) are immutable once confirmed.
Corrections are made via **Credit Notes**, never by editing or reversing the original.
This applies equally to Sales Invoices, Purchase Invoices, Delivery Notes, and Goods Receipts.
