PRD: Modular Warehouse Operations Platform
Foundation PRD synthesized from the current conversation

Product vision: A modular monolith for warehouse operations with dynamic role-based permissions, inventory ledgering, accounting-lite workflows, and a simple POS foundation. The long-term platform vision also allows future knowledge and document modules, but this PRD scopes the first implementation to the operational core.
Repository note: No mounted codebase was available in the current workspace, so this PRD is synthesized from the active conversation and the agreed architectural direction.
Problem Statement
The user needs a practical system for managing warehouses, employees, roles, permissions, inventory, sales, purchases, and basic accounting in a way that stays understandable as the business grows. The system must support one warehouse owner who may own multiple warehouses, assign employees to exactly one warehouse account each, and let each warehouse owner define the permission matrix for the roles in that warehouse. The user also wants the platform to be modular so future capabilities such as knowledge trees, summaries, document generation, and public knowledge sharing can be added later without rewriting the core.
Solution
Build a Next.js frontend with a Next.js backend in a domain-driven modular monolith. Organize the product around organizations and warehouses, with warehouse-scoped employee accounts, role templates stored in the database, and structured permissions such as module.resource.action. Use an inventory movement ledger plus a cached current balance, soft delete for editable entities, append-only audit logs for important actions, and a simple POS flow for warehouse sales. Keep accounting lightweight in the first release, centered on invoices, payments, balances, and reports. Design the codebase so future modules can be added for knowledge management, summaries, formatted documents, and public sharing, but keep those out of the MVP.
User Stories

1. As an organization owner, I want to create an organization profile, so that I can manage all of my warehouses under one business identity.
2. As an organization owner, I want to create multiple warehouses, so that I can operate more than one warehouse from the same platform.
3. As an organization owner, I want each warehouse to have its own employees and permissions, so that operational control stays warehouse-specific.
4. As an organization owner, I want to create warehouse-scoped employee accounts, so that an employee belongs to exactly one warehouse account.
5. As an organization owner, I want to archive employee accounts instead of deleting them, so that operational history is preserved.
6. As an organization owner, I want to assign a role to each employee, so that access rules can be managed consistently.
7. As an organization owner, I want to choose from role templates stored in the database, so that I do not need to define roles from scratch every time.
8. As an organization owner, I want to customize the permissions of each role per warehouse, so that the same role name can behave differently in different warehouses.
9. As an organization owner, I want permissions to be structured by module, resource, and action, so that authorization stays scalable and readable.
10. As an organization owner, I want to see available permissions as a multiple-choice list, so that role setup is fast and clear.
11. As an organization owner, I want the platform to enforce permissions on the frontend, so that users only see the actions they can perform.
12. As an organization owner, I want the backend to enforce permissions again on every request, so that unauthorized requests are always blocked.
13. As a warehouse manager, I want to view products, stock, and transactions only for my warehouse, so that I can operate my warehouse without cross-warehouse confusion.
14. As a warehouse manager, I want to add and edit products, so that I can keep the catalog current.
15. As a warehouse manager, I want to record stock movements instead of editing quantities directly, so that inventory history stays auditable.
16. As a warehouse manager, I want to view current stock balances quickly, so that I can make operational decisions without waiting for long calculations.
17. As a warehouse manager, I want to review inbound and outbound stock movements, so that I can trace how inventory changed over time.
18. As an accountant or owner, I want to create sales invoices, so that I can record revenue from warehouse sales.
19. As an accountant or owner, I want to create purchase invoices, so that I can record inventory purchases and supplier obligations.
20. As an accountant or owner, I want to record payments against invoices, so that customer and supplier balances stay correct.
21. As an accountant or owner, I want to see basic profit and sales reports, so that I can understand business performance.
22. As a cashier, I want a simple POS screen, so that I can sell items quickly at the warehouse counter.
23. As a cashier, I want to scan or enter product codes in the POS screen, so that checkout is fast and accurate.
24. As a cashier, I want the POS sale to automatically create stock movements, so that inventory is updated without manual correction.
25. As a cashier, I want the system to block a sale when I lack permission, so that sensitive actions stay controlled.
26. As a warehouse owner, I want soft delete and archiving for editable entities, so that I can retire records without losing history.
27. As a warehouse owner, I want critical financial and stock records to remain immutable, so that audit trails stay trustworthy.
28. As a warehouse owner, I want an audit log for important actions, so that I can review who changed what and when.
29. As a warehouse owner, I want audit logs to include old and new values for key fields, so that I can investigate mistakes quickly.
30. As a warehouse owner, I want login and permission changes to be logged, so that security-sensitive events are traceable.
31. As a warehouse owner, I want low-stock alerts, so that I can replenish items before they run out.
32. As a warehouse owner, I want product units with conversion factors, so that I can buy and sell in different units without breaking stock math.
33. As a warehouse owner, I want to support multi-unit products like carton and bottle, so that the system fits real warehouse workflows.
34. As a warehouse owner, I want each stock movement to store the base quantity, so that reports stay consistent even when multiple units are used.
35. As a warehouse owner, I want the user interface to be dashboard-style and straightforward, so that staff can learn it quickly.
36. As a warehouse owner, I want a public marketing site to remain separate from the dashboard, so that SEO can be handled without affecting internal workflows.
37. As a warehouse owner, I want realtime updates for critical events such as stock changes and notifications, so that multiple screens stay in sync.
38. As a warehouse owner, I want realtime to be limited to important business events, so that the system does not become hard to maintain.
39. As a future platform user, I want a module for knowledge trees, summaries, documents, and public sharing, so that the platform can grow beyond warehouse operations later.
40. As a future platform user, I want collaborative knowledge features to be isolated from the ERP core, so that future expansion does not destabilize the MVP.
41. As a developer, I want the backend organized by domain modules, so that each business area can evolve independently.
42. As a developer, I want inventory, sales, purchases, permissions, and audit to be testable as deep modules, so that business rules can be verified in isolation.
43. As a developer, I want the frontend to consume the backend through API-driven data fetching, so that dashboard screens stay responsive and maintainable.
44. As a developer, I want public pages and authenticated dashboard pages to use different rendering strategies, so that SEO and app performance are both preserved.
45. As a developer, I want future accounting depth to be possible without rewriting the inventory layer, so that the first release remains a stable foundation.
    Implementation Decisions
    • Architecture: modular monolith with clear domain modules rather than a microservice split.
    • • Full-stack framework: Next.js as the single framework for both frontend and backend, with:
    • - Frontend: App Router for the public website and dashboard shell, with a client-driven dashboard approach for the authenticated application.
    • - Backend (API Layer): Route Handlers (app/api/) as the business-logic layer, with:
    • - Route Handlers for request handling and routing.
    • - Server Actions for data mutations and complex business logic (especially forms and POS flows).
    • - Middleware for authentication, authorization, and request interception.
    • - Server Components for direct data fetching in dashboard pages without extra API calls when possible.
    • Database: PostgreSQL as the source of truth for all operational data.
    • ORM: Prisma for schema management, type safety, and relational modeling.
    • Root tenancy model: Organization is the top-level business container, and warehouses live underneath it.
    • Warehouse model: the warehouse is the primary operational context for employees, inventory, sales, and permissions.
    • Employee identity: each employee account belongs to exactly one warehouse account; moving an employee to another warehouse means creating a separate account.
    • Permissions model: roles come from the database, and each warehouse owner selects a role and assigns permissions from a structured permission catalog.
    • Permission format: structured permissions use a module.resource.action style such as warehouse.products.view or sales.invoices.cancel.
    • Authorization: enforce permissions in two layers, first in the frontend for visibility and second in the backend for security.
    • Role behavior: the same role name can have a different permission matrix in each warehouse.
    • Inventory model: use an inventory movement ledger as the source of operational history.
    • Inventory state: maintain a cached current balance for fast reads while preserving the full movement history.
    • Inventory updates: stock changes must be committed in a database transaction that creates the movement and updates the cached balance together.
    • Product model: support multi-unit products with conversion factors and optional barcodes, but avoid full ecommerce-style variant matrices in the MVP.
    • Accounting scope: keep accounting-lite in the MVP, centered on invoices, payments, balances, and basic reports.
    • Soft delete: use archival or soft delete for editable master data such as products, customers, suppliers, and employees.
    • Hard immutability: do not truly delete critical records such as invoices, payments, stock movements, or audit logs.
    • Audit logging: implement append-only logs for high-value operations such as logins, permission changes, inventory adjustments, invoice cancellations, and employee changes.
    • Realtime: use limited realtime events for business-critical updates such as stock changes and notifications, not collaborative editing.
    • Public vs private rendering: keep public pages SEO-friendly while rendering the authenticated dashboard as an app-like experience.
    • MVP scope: deliver core warehouse ERP plus a simple POS first; keep ecommerce and the knowledge platform as future modules.
    • Module boundaries: keep inventory, sales, purchases, permissions, audit, and notifications isolated so they can be tested and extended independently.
    • Future extensibility: preserve room for future modules for knowledge trees, research notes, summaries, formatted documents, and public sharing.

• ## Tech Stack Specifics

- Next.js 16 App Router with React Server Components. Prefer server actions and route handlers over client-side fetching where appropriate.
- Prisma 7 as the ORM. Client is a singleton in core/database/.
- shadcn/ui (radix-nova style) + Tailwind CSS v4 for all UI. Add components via npx shadcn add <component>.
- Framer Motion (motion package) only when animation meaningfully improves UX — not for decorative motion.
- Lucide icons (configured as the icon library in components.json).
- Recharts for analytics/charts.
- Sonner for toast notifications.
- next-themes for dark/light mode.

Testing Decisions
Good tests should verify external behavior and business rules, not implementation details. The highest-value tests for this product are the ones that prove permission checks, stock integrity, invoice behavior, audit logging, and role customization work across modules.
• Test the permissions module to confirm that warehouse-specific role matrices allow and deny the correct actions.
• Test backend authorization guards to ensure every protected action is blocked when the permission is missing.
• Test the inventory module to confirm that every stock change creates a movement record and updates the cached balance in the same transaction.
• Test the inventory module to ensure base-unit conversions are applied correctly when sales or purchases use alternate units.
• Test the sales module to confirm that invoice creation produces the expected stock movements and audit entries.
• Test the purchases module to confirm that incoming stock updates inventory correctly and preserves the movement history.
• Test the POS flow to ensure fast sales create invoices, adjust stock, and respect permissions.
• Test soft delete behavior to ensure archived records remain queryable for history while disappearing from normal active lists.
• Test audit logging to confirm that important actions create immutable log entries with before and after values where relevant.
• Test warehouse isolation to confirm that one warehouse cannot read or mutate another warehouse's operational data.
• Test role template selection to confirm that owners can choose database roles and customize permissions per warehouse.
• Test reports to confirm they derive from the expected operational data and do not break when older records are archived.
• Test public versus authenticated page behavior to ensure dashboards are protected while public pages remain indexable and separate.
• Test realtime event emission to confirm that committed business events produce notifications without becoming the source of truth.
Out of Scope
• Full ecommerce storefront functionality, including public checkout, shipping, and customer self-service ordering.
• The full knowledge platform for memorization, research, think-maps, team study, document generation, and public knowledge trees.
• Collaborative document editing with live cursors and Google Docs-style syncing.
• Enterprise double-entry accounting, journal entries, ledgers, and full financial statements for the first release.
• Branch-centric modeling and complex multi-branch cash management in the MVP.
• Advanced ecommerce-style product variants such as color and size matrices.
• Microservice decomposition.
• Mobile-first native applications.
• Heavy AI automation in the initial ERP release.
Further Notes
• The current architecture is strong enough for a production-minded MVP, but the main risk is feature creep rather than technical design.
• The preferred MVP direction is core ERP plus simple POS; the knowledge platform should remain a future module so the core can ship sooner.
• Because the backend is modular, future modules can be added without disturbing the warehouse, inventory, and permission foundations.
• The previous conversation established that the system should remain warehouse-centric, not branch-centric, for the first release.
• If the team later wants to expand into a knowledge or research platform, the same modular structure can support that as a separate domain.
