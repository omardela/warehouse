# Atomic conditional updates for quantity-cap fields, not blind increments

`PurchaseOrderLine.receivedBaseQuantity`, `SalesOrderLine.deliveredBaseQuantity`, and the
new `invoicedBaseQuantity` fields all enforce a cap (received ≤ ordered, invoiced ≤
received/delivered). The existing code validates the cap by reading the row before
`db.$transaction`, then blindly does `{ increment: x }` inside it — under Postgres's
default `READ COMMITTED` isolation, two concurrent requests against the same line can
both pass the pre-check and both increment, pushing the total past the cap (e.g.
over-receiving past the ordered quantity).

Decided (2026-06-28): replace every such increment with a conditional update of the form
`UPDATE ... SET col = col + x WHERE col + x <= cap_col`, checked via affected-row-count
(0 rows = reject and roll back the transaction). Applied uniformly to Goods Receipt,
Delivery Note, and the new Purchase/Sales invoice quantity tracking — one shared pattern,
not just the new code — so the existing race is fixed rather than left in place next to
code that knows better.

**Rejected alternative:** fixing only the new `invoicedBaseQuantity` increments and
leaving `receivedBaseQuantity`/`deliveredBaseQuantity` as blind increments. Rejected
because it ships new code next to a known-bad pattern in the same file, and the fix is
the same shape in both places.
