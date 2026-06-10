import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "LogiCore — Multi-Warehouse ERP for Modern Logistics",
  description:
    "LogiCore is a full-stack warehouse management ERP built for operations teams. Manage inventory, purchase & sales invoices, multi-warehouse transfers, and team roles — all in one platform.",
};

// ─── Feature data ──────────────────────────────────────────────────────────────

const features = [
  {
    title: "Inventory Management",
    description:
      "Track stock levels, movements, and valuations across every SKU in real time. Never oversell or run out of critical items.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
  },
  {
    title: "Multi-Warehouse",
    description:
      "Operate dozens of warehouse locations from a single dashboard. Transfer stock, monitor capacity, and assign warehouse-level permissions.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    title: "Purchase & Sales Invoices",
    description:
      "Create, edit, and track purchase orders and sales invoices end-to-end. Integrated with inventory to update stock automatically on confirmation.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    title: "Role-Based Access",
    description:
      "Define granular permissions per role and warehouse. Control exactly who can view, create, edit, or delete any resource across your organization.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: "Audit Logs",
    description:
      "Every action is recorded with timestamps, user identity, and before/after values. Meet compliance requirements and investigate issues instantly.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    title: "Real-time Analytics",
    description:
      "Monitor KPIs, sales trends, and inventory health from an executive dashboard. Export reports in seconds, no BI tool required.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
];

// ─── Stats data ────────────────────────────────────────────────────────────────

const stats = [
  { value: "10,000+", label: "SKUs managed per org" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "50+", label: "Warehouses per account" },
  { value: "< 100ms", label: "Real-time sync latency" },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="bg-[#faf8ff]">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
        {/* Subtle gradient blob */}
        <div
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#b4c5ff] to-[#0062ff] opacity-15 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{ clipPath: "polygon(74.1% 44.1%,100% 61.6%,97.5% 26.9%,85.5% 0.1%,80.7% 2%,72.5% 32.5%,60.2% 62.4%,52.4% 68.1%,47.5% 58.3%,45.2% 34.5%,27.5% 76.7%,0.1% 64.9%,17.9% 100%,27.6% 76.8%,76.1% 97.7%,74.1% 44.1%)" }}
          />
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dbe2fd] bg-white px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[#004cca] shadow-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#006c49]" />
              Warehouse Management ERP
            </div>

            {/* Headline */}
            <h1 className="text-[36px] font-bold leading-[44px] tracking-[-0.02em] text-[#131b2e] sm:text-5xl sm:leading-[58px]">
              Take full control of your{" "}
              <span className="text-[#0062ff]">warehouse operations</span>
            </h1>

            {/* Sub-headline */}
            <p className="mt-6 text-lg leading-8 text-[#424656]">
              LogiCore is an enterprise-grade ERP built for modern logistics teams.
              Manage inventory, invoices, transfers, and team access across every
              warehouse — from a single, unified platform.
            </p>

            {/* CTA buttons */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-[#0062ff] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#004cca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0062ff] focus-visible:ring-offset-2"
              >
                Get Started Free
              </Link>
              <Link
                href="/demo"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#c2c6d9] bg-white px-6 text-sm font-semibold text-[#131b2e] shadow-sm transition-colors hover:bg-[#f2f3ff] hover:border-[#004cca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0062ff] focus-visible:ring-offset-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10 8 16 12 10 16 10 8" />
                </svg>
                View Demo
              </Link>
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="overflow-hidden rounded-xl border border-[#dbe2fd] bg-white shadow-[0_4px_24px_rgba(0,76,202,0.08)]">
              {/* Browser chrome */}
              <div className="flex h-10 items-center gap-2 border-b border-[#eaedff] bg-[#f2f3ff] px-4">
                <div className="h-3 w-3 rounded-full bg-[#fca5a5]" />
                <div className="h-3 w-3 rounded-full bg-[#fcd34d]" />
                <div className="h-3 w-3 rounded-full bg-[#6ee7b7]" />
                <div className="ml-3 flex-1 rounded-md bg-white/80 px-3 py-1 text-xs text-[#737687]">
                  app.logicore.io/dashboard
                </div>
              </div>
              {/* Dashboard mock */}
              <div className="grid grid-cols-1 divide-y divide-[#eaedff] sm:grid-cols-[240px_1fr] sm:divide-x sm:divide-y-0">
                {/* Sidebar */}
                <div className="hidden space-y-1 bg-[#0b1326] p-4 sm:block">
                  {["Dashboard", "Inventory", "Warehouses", "Invoices", "Employees", "Reports"].map((item, i) => (
                    <div
                      key={item}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium ${
                        i === 0
                          ? "bg-[#0062ff] text-white"
                          : "text-[#94a3b8] hover:text-white"
                      }`}
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                      {item}
                    </div>
                  ))}
                </div>
                {/* Content area */}
                <div className="space-y-4 p-6">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Total SKUs", value: "8,241" },
                      { label: "Low Stock", value: "37" },
                      { label: "Pending Orders", value: "124" },
                      { label: "Warehouses", value: "12" },
                    ].map((kpi) => (
                      <div key={kpi.label} className="rounded-lg border border-[#eaedff] bg-[#faf8ff] p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#737687]">
                          {kpi.label}
                        </p>
                        <p className="mt-1 font-mono text-lg font-bold text-[#131b2e]">
                          {kpi.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  {/* Fake table */}
                  <div className="overflow-hidden rounded-lg border border-[#eaedff]">
                    <div className="flex items-center gap-4 border-b border-[#eaedff] bg-[#f2f3ff] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#737687]">
                      <span className="w-32">SKU</span>
                      <span className="flex-1">Product</span>
                      <span className="w-20 text-right">Stock</span>
                      <span className="w-20 text-right">Status</span>
                    </div>
                    {[
                      { sku: "WH-0041", name: "Steel Bearing 6205", stock: "1,240", status: "In Stock" },
                      { sku: "WH-0098", name: "Hydraulic Seal Kit", stock: "87", status: "Low" },
                      { sku: "WH-0133", name: "Drive Belt 5PK", stock: "560", status: "In Stock" },
                    ].map((row) => (
                      <div key={row.sku} className="flex items-center gap-4 border-b border-[#eaedff] px-4 py-2.5 text-xs last:border-0">
                        <span className="w-32 font-mono text-[#737687]">{row.sku}</span>
                        <span className="flex-1 font-medium text-[#131b2e]">{row.name}</span>
                        <span className="w-20 text-right font-mono text-[#131b2e]">{row.stock}</span>
                        <span className={`w-20 text-right text-[10px] font-semibold ${row.status === "Low" ? "text-[#ba1a1a]" : "text-[#006c49]"}`}>
                          {row.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-[#dbe2fd] bg-white py-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <dl className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <dt className="text-sm font-medium text-[#737687]">{stat.label}</dt>
                <dd className="mt-1 font-mono text-2xl font-bold tracking-tight text-[#004cca]">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          {/* Section header */}
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#004cca]">
              Everything you need
            </p>
            <h2 className="mt-2 text-[24px] font-semibold leading-[32px] tracking-[-0.01em] text-[#131b2e] sm:text-3xl">
              Built for operations teams at scale
            </h2>
            <p className="mt-4 text-base leading-7 text-[#424656]">
              From a single stockroom to a global distribution network, LogiCore
              adapts to your operational complexity without adding cognitive overhead.
            </p>
          </div>

          {/* Feature cards */}
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-xl border border-[#dbe2fd] bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(0,76,202,0.10)]"
              >
                {/* Icon */}
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#eaedff] text-[#004cca] transition-colors group-hover:bg-[#0062ff] group-hover:text-white">
                  {feature.icon}
                </div>
                <h3 className="text-[15px] font-semibold leading-6 text-[#131b2e]">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#424656]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-[#0062ff] px-8 py-16 text-center shadow-[0_8px_32px_rgba(0,98,255,0.3)]">
            {/* Decorative blob */}
            <div
              className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
              aria-hidden="true"
            >
              <div className="absolute -top-20 right-0 h-64 w-64 rounded-full bg-white opacity-5 blur-3xl" />
              <div className="absolute -bottom-20 left-0 h-64 w-64 rounded-full bg-[#b4c5ff] opacity-10 blur-3xl" />
            </div>

            <h2 className="text-[28px] font-bold leading-[36px] tracking-[-0.02em] text-white sm:text-4xl">
              Ready to streamline your warehouse?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#b4c5ff]">
              Join hundreds of operations teams already using LogiCore to eliminate
              spreadsheet chaos and gain real-time visibility into their supply chain.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-6 text-sm font-semibold text-[#004cca] shadow-sm transition-colors hover:bg-[#f2f3ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0062ff]"
              >
                Get Started Free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/30 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0062ff]"
              >
                View pricing
              </Link>
            </div>
            <p className="mt-5 text-xs text-[#b4c5ff]">
              No credit card required &middot; Free plan available &middot; Setup in minutes
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
