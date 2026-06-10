import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — LogiCore",
  description:
    "Simple, transparent pricing for every stage of growth. Start free, scale to Pro, or get a custom Enterprise plan with dedicated support.",
};

// ─── Plan data ─────────────────────────────────────────────────────────────────

const plans = [
  {
    name: "Starter",
    price: "Free",
    priceNote: "Forever",
    description:
      "Perfect for small teams getting started with warehouse management.",
    cta: { label: "Get started free", href: "/register", primary: false },
    features: [
      "1 warehouse",
      "Up to 500 SKUs",
      "5 team members",
      "Purchase & sales invoices",
      "Basic inventory tracking",
      "7-day audit log history",
      "Email support",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$49",
    priceNote: "per month",
    description:
      "For growing operations that need multi-warehouse visibility and advanced controls.",
    cta: { label: "Start free trial", href: "/register?plan=pro", primary: true },
    features: [
      "Up to 10 warehouses",
      "Unlimited SKUs",
      "Unlimited team members",
      "Role-based access control",
      "Advanced analytics & reports",
      "90-day audit log history",
      "Inventory transfers",
      "CSV import / export",
      "Priority email support",
    ],
    highlighted: true,
    badge: "Most popular",
  },
  {
    name: "Enterprise",
    price: "Custom",
    priceNote: "Contact sales",
    description:
      "For large-scale logistics networks requiring custom integrations and SLAs.",
    cta: { label: "Contact sales", href: "/contact", primary: false },
    features: [
      "Unlimited warehouses",
      "Unlimited SKUs & users",
      "Custom role permissions",
      "Full audit log history",
      "Dedicated onboarding",
      "SLA & uptime guarantee",
      "API access & webhooks",
      "SSO / SAML",
      "Dedicated account manager",
    ],
    highlighted: false,
  },
];

// ─── Check icon ────────────────────────────────────────────────────────────────

function CheckIcon({ highlighted }: { highlighted: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={highlighted ? "#b4c5ff" : "#006c49"}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-0.5 shrink-0"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="bg-[#faf8ff]">
      {/* ── Header ── */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#004cca]">
              Pricing
            </p>
            <h1 className="mt-2 text-[36px] font-bold leading-[44px] tracking-[-0.02em] text-[#131b2e] sm:text-5xl sm:leading-[58px]">
              Plans that grow with you
            </h1>
            <p className="mt-5 text-lg leading-8 text-[#424656]">
              Start free and upgrade when you need more power. No hidden fees,
              no long-term lock-in.
            </p>
          </div>

          {/* ── Pricing cards ── */}
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-xl p-8 ${
                  plan.highlighted
                    ? "bg-[#0062ff] shadow-[0_8px_32px_rgba(0,98,255,0.35)]"
                    : "border border-[#dbe2fd] bg-white shadow-[0_2px_4px_rgba(0,0,0,0.04)]"
                }`}
              >
                {/* Badge */}
                {"badge" in plan && plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-[#131b2e] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Plan name */}
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.05em] ${
                    plan.highlighted ? "text-[#b4c5ff]" : "text-[#004cca]"
                  }`}
                >
                  {plan.name}
                </p>

                {/* Price */}
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span
                    className={`text-[36px] font-bold leading-none tracking-[-0.02em] ${
                      plan.highlighted ? "text-white" : "text-[#131b2e]"
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`text-sm ${
                      plan.highlighted ? "text-[#b4c5ff]" : "text-[#737687]"
                    }`}
                  >
                    {plan.priceNote}
                  </span>
                </div>

                {/* Description */}
                <p
                  className={`mt-3 text-sm leading-6 ${
                    plan.highlighted ? "text-[#dbe2fd]" : "text-[#424656]"
                  }`}
                >
                  {plan.description}
                </p>

                {/* CTA */}
                <Link
                  href={plan.cta.href}
                  className={`mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    plan.highlighted
                      ? "bg-white text-[#004cca] hover:bg-[#f2f3ff] focus-visible:ring-white focus-visible:ring-offset-[#0062ff]"
                      : plan.cta.primary
                      ? "bg-[#0062ff] text-white hover:bg-[#004cca] focus-visible:ring-[#0062ff]"
                      : "border border-[#c2c6d9] bg-white text-[#131b2e] hover:bg-[#f2f3ff] hover:border-[#004cca] focus-visible:ring-[#0062ff]"
                  }`}
                >
                  {plan.cta.label}
                </Link>

                {/* Divider */}
                <div
                  className={`my-6 h-px ${
                    plan.highlighted ? "bg-white/20" : "bg-[#eaedff]"
                  }`}
                />

                {/* Feature list */}
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <CheckIcon highlighted={plan.highlighted} />
                      <span
                        className={`text-sm leading-5 ${
                          plan.highlighted ? "text-[#eef0ff]" : "text-[#424656]"
                        }`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* ── FAQ prompt ── */}
          <p className="mt-12 text-center text-sm text-[#737687]">
            Have questions?{" "}
            <Link
              href="/contact"
              className="font-medium text-[#004cca] underline-offset-4 hover:underline"
            >
              Talk to our team
            </Link>{" "}
            &mdash; we&apos;re happy to help you find the right plan.
          </p>
        </div>
      </section>

      {/* ── Feature comparison table ── */}
      <section className="border-t border-[#dbe2fd] bg-white py-20">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <h2 className="text-center text-[20px] font-semibold leading-[28px] tracking-[-0.01em] text-[#131b2e]">
            Compare plans
          </h2>

          <div className="mt-10 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-1/2 py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-[#737687]">
                    Feature
                  </th>
                  {plans.map((plan) => (
                    <th
                      key={plan.name}
                      className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide ${
                        plan.highlighted ? "text-[#0062ff]" : "text-[#737687]"
                      }`}
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eaedff]">
                {[
                  { feature: "Warehouses", values: ["1", "Up to 10", "Unlimited"] },
                  { feature: "SKUs", values: ["500", "Unlimited", "Unlimited"] },
                  { feature: "Team members", values: ["5", "Unlimited", "Unlimited"] },
                  { feature: "Invoices (purchase & sales)", values: ["yes", "yes", "yes"] },
                  { feature: "Role-based access control", values: ["no", "yes", "yes"] },
                  { feature: "Inventory transfers", values: ["no", "yes", "yes"] },
                  { feature: "Analytics & reports", values: ["Basic", "Advanced", "Advanced"] },
                  { feature: "Audit log retention", values: ["7 days", "90 days", "Unlimited"] },
                  { feature: "API access", values: ["no", "no", "yes"] },
                  { feature: "SSO / SAML", values: ["no", "no", "yes"] },
                  { feature: "SLA guarantee", values: ["no", "no", "yes"] },
                ].map((row) => (
                  <tr key={row.feature}>
                    <td className="py-3 pr-4 font-medium text-[#131b2e]">{row.feature}</td>
                    {row.values.map((val, i) => (
                      <td key={i} className="px-4 py-3 text-center">
                        {val === "yes" ? (
                          <span className="inline-flex justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#006c49" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-label="Included">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        ) : val === "no" ? (
                          <span className="text-[#c2c6d9]">&mdash;</span>
                        ) : (
                          <span className={`text-sm ${i === 1 ? "font-medium text-[#0062ff]" : "text-[#424656]"}`}>{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-[#0062ff] px-8 py-14 text-center shadow-[0_8px_32px_rgba(0,98,255,0.25)]">
            <h2 className="text-[24px] font-bold leading-[32px] tracking-[-0.01em] text-white sm:text-3xl">
              Start managing smarter today
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#b4c5ff]">
              Get started in minutes with our free plan — no credit card required.
              Upgrade any time as your operations grow.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-[#004cca] shadow-sm transition-colors hover:bg-[#f2f3ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0062ff]"
              >
                Get started free
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-white/30 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0062ff]"
              >
                Contact sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
