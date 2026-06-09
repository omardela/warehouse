---
title: "Realtime events (stock changes & notifications)"
type: AFK
blocked_by: "009"
user_stories: "37, 38"
---

## What to build

Add limited realtime updates for business-critical events so that multiple open dashboard screens stay in sync. Scope is deliberately narrow: stock balance changes and new in-app notifications. This is not collaborative editing — it is one-way server-to-client push for committed business events.

Use Server-Sent Events (SSE) as the transport — it is simpler than WebSocket, works with Next.js Route Handlers, and sufficient for the read-only push use case.

## Acceptance criteria

- [ ] `app/api/realtime/events/route.ts` — SSE endpoint; requires a valid session; streams events to the connected client
- [ ] Events pushed over SSE are typed: `{ type: "stock.updated", payload: { productId, warehouseId, newBalance } }` and `{ type: "notification.new", payload: { notificationId, type, summary } }`
- [ ] `recordMovement()` (issue #009) triggers a stock update event after the transaction commits — never before
- [ ] Low-stock alert creation (issue #010) triggers a `notification.new` event after the notification record is persisted
- [ ] `hooks/use-realtime.ts` — client hook that opens the SSE connection, parses events, and exposes them; reconnects automatically on drop
- [ ] The stock overview page (issue #009) updates the balance for the affected product row in place when a `stock.updated` event arrives, without a full page reload
- [ ] The notification badge in the top bar (issue #004) increments when a `notification.new` event arrives
- [ ] SSE connection is scoped to the current warehouse — a client only receives events for their warehouse
- [ ] The SSE endpoint is the only realtime mechanism in the MVP; no WebSocket, no polling loops in components

## Blocked by

- [009 — Inventory ledger](009-inventory-ledger.md)
