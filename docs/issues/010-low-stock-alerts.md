---
title: "Low-stock alerts"
type: AFK
blocked_by: "009"
user_stories: "31"
---

## What to build

Notify warehouse staff when a product's current stock falls at or below its configured low-stock threshold. Alerts are triggered by inventory movements (checked inside `recordMovement()`) and surfaced as in-app notifications. This slice does not require email or push — in-app is sufficient for the MVP.

## Acceptance criteria

- [ ] `Product` schema has `lowStockThreshold Int?` — null means no alert configured
- [ ] After every successful `recordMovement()` call, a check compares the new `InventoryBalance.currentQuantity` against `Product.lowStockThreshold`
- [ ] When stock falls to or below the threshold, a `Notification` record is created for the warehouse (one per product per crossing event — not one per movement)
- [ ] `Notification` model: `id`, `warehouseId`, `type` (`LOW_STOCK`), `payload Json`, `readAt DateTime?`, `createdAt`
- [ ] `app/dashboard/notifications/page.tsx` — lists unread and recent notifications; each low-stock alert shows product name, current quantity, and threshold
- [ ] Top bar (from issue #004) shows an unread notification badge count
- [ ] Notifications can be marked as read individually or all-at-once
- [ ] The stock overview page (issue #009) highlights below-threshold products in a warning color
- [ ] Setting a product's threshold to `null` disables alerts for that product without losing existing notification history

## Blocked by

- [009 — Inventory ledger](009-inventory-ledger.md)
