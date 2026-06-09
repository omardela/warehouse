---
title: "Public marketing site (SEO-separated)"
type: AFK
blocked_by: None
user_stories: "36, 44"
---

## What to build

Build the public-facing marketing pages that are completely separate from the authenticated dashboard. These pages should be SEO-optimized (statically rendered or server-rendered), have no dependency on session state, and share no layout with the dashboard shell. The goal is a clean separation so that marketing copy, landing pages, and public content can evolve without touching the ERP.

## Acceptance criteria

- [ ] `app/(public)/layout.tsx` — public layout with a simple nav (logo, product name, login CTA) and footer; no sidebar, no session checks
- [ ] `app/(public)/page.tsx` — landing page with product hero, feature highlights, and a "Get started" or "Login" CTA; fully server-rendered for SEO
- [ ] `app/(public)/pricing/page.tsx` (or equivalent) — placeholder pricing or contact section; content can be minimal for MVP
- [ ] Public pages use `generateMetadata()` for correct `<title>` and `<meta description>` tags
- [ ] No authenticated API calls or session reads occur in the public layout or pages
- [ ] Navigating from a public page to `/dashboard` redirects to `/login` if not authenticated (handled by middleware from issue #002 — no duplicate logic needed here)
- [ ] The public site and the dashboard shell use separate root layouts with no shared state
- [ ] Lighthouse score for the landing page is ≥ 90 on performance and ≥ 95 on SEO in a production build

## Blocked by

None — can start immediately (parallel to issue #001).
