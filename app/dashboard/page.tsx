import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SalesPurchasesChart, type ChartPoint } from "./SalesPurchasesChart";
import { getLocale } from "@/core/i18n/locale";
import { getDictionary } from "@/core/i18n/get-dictionary";
import type { Dictionary } from "@/core/i18n/get-dictionary";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function relativeTime(date: Date | string | null, t: Dictionary["employees"]["dashboard"]): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return t.justNow;
  if (diffMins < 60) return t.minutesAgo.replace("{minutes}", String(diffMins));
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return t.hoursAgo.replace("{hours}", String(diffHrs));
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return t.yesterday;
  if (diffDays < 30) return t.daysAgo.replace("{days}", String(diffDays));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getGreeting(t: Dictionary["employees"]["dashboard"]): string {
  const hour = new Date().getHours();
  if (hour < 12) return t.goodMorning;
  if (hour < 18) return t.goodAfternoon;
  return t.goodEvening;
}

function truncateId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function movementBadge(
  type: string,
  t: Dictionary["employees"]["dashboard"]
): { label: string; color: string; bg: string } {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    PURCHASE_IN:  { label: t.movementPurchase,    color: "#60a5fa", bg: "rgba(96,165,250,0.12)"  },
    SALE_OUT:     { label: t.movementSale,         color: "#62df7d", bg: "rgba(98,223,125,0.12)"  },
    ADJUSTMENT:   { label: t.movementAdjustment,   color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
    TRANSFER_IN:  { label: t.movementTransferIn,  color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
    TRANSFER_OUT: { label: t.movementTransferOut, color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
    RETURN_IN:    { label: t.movementReturnIn,    color: "#fb923c", bg: "rgba(251,146,60,0.12)"  },
    RETURN_OUT:   { label: t.movementReturnOut,   color: "#fb923c", bg: "rgba(251,146,60,0.12)"  },
  };
  return map[type] ?? { label: type, color: "#8c90a2", bg: "rgba(140,144,162,0.12)" };
}

function notificationMessage(type: string, payload: unknown, t: Dictionary["employees"]["dashboard"]): string {
  try {
    const p = payload as Record<string, unknown>;
    if (type === "LOW_STOCK") {
      const name = p.productName ?? p.product_name ?? "";
      const qty = p.currentQuantity ?? p.current_quantity ?? "";
      if (name) {
        return t.lowStockNotification
          .replace("{name}", String(name))
          .replace("{quantity}", qty !== "" ? String(qty) : "0");
      }
    }
  } catch {
    // fall through
  }
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function notificationBadge(type: string): { color: string; bg: string } {
  if (type === "LOW_STOCK") return { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
  return { color: "#8c90a2", bg: "rgba(140,144,162,0.12)" };
}

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

const IconRevenue = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 12L6 8L9 11L14 4" stroke="#62df7d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11 4H14V7" stroke="#62df7d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconCollected = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.5" stroke="#60a5fa" strokeWidth="1.5" />
    <path d="M8 5v3l2 2" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const IconProfit = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="10" width="3" height="4" rx="0.5" fill="#a78bfa" />
    <rect x="6.5" y="6" width="3" height="8" rx="0.5" fill="#a78bfa" />
    <rect x="11" y="2" width="3" height="12" rx="0.5" fill="#a78bfa" />
  </svg>
);
const IconPurchase = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="5" width="12" height="9" rx="1.5" stroke="#60a5fa" strokeWidth="1.5" />
    <path d="M5 5V4a3 3 0 016 0v1" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const IconOutOfStock = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.5" stroke="#ff4d4f" strokeWidth="1.5" />
    <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#ff4d4f" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const IconLowStock = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2L14 13H2L8 2Z" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M8 6V9" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="8" cy="11" r="0.75" fill="#f59e0b" />
  </svg>
);
const IconCustomers = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="5" r="2.5" stroke="#0062ff" strokeWidth="1.5" />
    <path d="M1 13c0-2.76 2.24-5 5-5" stroke="#0062ff" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="6" r="2" stroke="#0062ff" strokeWidth="1.5" />
    <path d="M10 13c0-2.21 1.79-4 4-4" stroke="#0062ff" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const IconSuppliers = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="8" width="9" height="6" rx="1" stroke="#0062ff" strokeWidth="1.5" />
    <path d="M10 10h3l2-3H10V5l-1-3H5L4 5v3" stroke="#0062ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="4" cy="13.5" r="1" fill="#0062ff" />
    <circle cx="11" cy="13.5" r="1" fill="#0062ff" />
  </svg>
);
const IconChevron = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5 3l4 4-4 4" stroke="#4a5068" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ---------------------------------------------------------------------------
// Layout components
// ---------------------------------------------------------------------------

function KpiCard({
  label, value, description, accent, bgAccent, trendCurrent, trendPrevious, sub, icon,
}: {
  label: string;
  value: string;
  description?: string;
  accent: string;
  bgAccent?: string;
  trendCurrent?: number;
  trendPrevious?: number;
  sub?: string;
  icon: React.ReactNode;
}) {
  let trendEl: React.ReactNode = null;
  if (trendCurrent !== undefined && trendPrevious !== undefined && trendPrevious > 0) {
    const pct = ((trendCurrent - trendPrevious) / trendPrevious) * 100;
    if (Math.abs(pct) >= 0.5) {
      const up = pct > 0;
      trendEl = (
        <span style={{
          fontSize: "11px", fontWeight: 600,
          color: up ? "#62df7d" : "#ff4d4f",
          backgroundColor: up ? "rgba(98,223,125,0.1)" : "rgba(255,77,79,0.1)",
          borderRadius: "4px", padding: "2px 6px",
        }}>
          {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
        </span>
      );
    }
  }

  return (
    <div style={{
      backgroundColor: "#171f33",
      border: "1px solid #222a3e",
      borderRadius: "10px",
      padding: "18px 20px",
      flex: "1 1 150px",
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "#8c90a2", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
        <span style={{
          width: "30px", height: "30px", borderRadius: "8px",
          backgroundColor: bgAccent ?? "rgba(0,98,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {icon}
        </span>
      </div>
      <div>
        <div style={{ fontSize: "26px", fontWeight: 700, color: accent, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          {value}
        </div>
        <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {description && <span style={{ fontSize: "12px", color: "#8c90a2" }}>{description}</span>}
          {trendEl}
          {sub && <span style={{ fontSize: "11px", color: "#4a5068" }}>{sub}</span>}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title, children, href, hrefLabel,
}: {
  title: string;
  children: React.ReactNode;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div style={{
      backgroundColor: "#171f33",
      border: "1px solid #222a3e",
      borderRadius: "10px",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{
        padding: "13px 20px",
        borderBottom: "1px solid #222a3e",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#dbe2fd" }}>{title}</span>
        {href && (
          <Link href={href} style={{ fontSize: "12px", color: "#0062ff", textDecoration: "none", fontWeight: 500 }}>
            {hrefLabel ?? "View all"}
          </Link>
        )}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: "28px 20px", textAlign: "center", color: "#4a5068", fontSize: "13px" }}>
      {text}
    </div>
  );
}

function TableHead({ cols }: { cols: Array<{ label: string; align?: "start" | "end" }> }) {
  return (
    <thead>
      <tr>
        {cols.map((c) => (
          <th key={c.label} style={{
            padding: "9px 20px",
            textAlign: c.align ?? "start",
            fontSize: "11px", fontWeight: 600, color: "#4a5068",
            textTransform: "uppercase", letterSpacing: "0.05em",
            borderBottom: "1px solid #1a2236", whiteSpace: "nowrap",
          }}>
            {c.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const locale = await getLocale();
  const t = getDictionary(locale).employees.dashboard;

  const employee = await db.employee.findUnique({
    where: { id: session.employeeId },
    select: {
      name: true,
      warehouseRole: {
        select: { permissions: { select: { permission: { select: { code: true } } } } },
      },
    },
  });

  const perms = employee?.warehouseRole?.permissions.map((p) => p.permission.code) ?? [];
  const can = (code: string) => perms.includes(code);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const canSales     = can("sales.invoice.read");
  const canPurchases = can("purchase.invoice.read");
  const canPayments  = can("payments.payment.read");
  const canInventory = can("inventory.balance.read");
  const canCustomers = can("customers.customer.read");
  const canSuppliers = can("suppliers.supplier.read");

  const [
    salesAggrThisMonth,
    salesAggrLastMonth,
    purchasesAggrThisMonth,
    purchasesAggrLastMonth,
    collectedThisMonth,
    outOfStockCount,
    lowStockCandidates,
    customerCount,
    supplierCount,
    recentNotifications,
    salesLast30,
    purchasesLast30,
    salesWithPayments,
    purchasesWithPayments,
    salesLinesThisMonth,
    draftSalesCount,
    draftPurchasesCount,
    recentActivity,
  ] = await Promise.all([
    // Sales aggregates
    canSales
      ? db.invoice.aggregate({ _sum: { totalAmount: true }, where: { type: "SALE", status: "CONFIRMED", warehouseId: session.warehouseId, confirmedAt: { gte: monthStart } } })
      : null,
    canSales
      ? db.invoice.aggregate({ _sum: { totalAmount: true }, where: { type: "SALE", status: "CONFIRMED", warehouseId: session.warehouseId, confirmedAt: { gte: lastMonthStart, lte: lastMonthEnd } } })
      : null,
    // Purchase aggregates
    canPurchases
      ? db.invoice.aggregate({ _sum: { totalAmount: true }, where: { type: "PURCHASE", status: "CONFIRMED", warehouseId: session.warehouseId, confirmedAt: { gte: monthStart } } })
      : null,
    canPurchases
      ? db.invoice.aggregate({ _sum: { totalAmount: true }, where: { type: "PURCHASE", status: "CONFIRMED", warehouseId: session.warehouseId, confirmedAt: { gte: lastMonthStart, lte: lastMonthEnd } } })
      : null,
    // Collected this month (payments)
    canPayments
      ? db.payment.aggregate({ _sum: { amount: true }, where: { invoice: { warehouseId: session.warehouseId }, paidAt: { gte: monthStart } } })
      : null,
    // Inventory KPIs
    canInventory
      ? db.inventoryBalance.count({ where: { warehouseId: session.warehouseId, currentQuantity: { lte: 0 }, product: { archivedAt: null } } })
      : null,
    canInventory
      ? db.inventoryBalance.findMany({
          where: { warehouseId: session.warehouseId, product: { lowStockThreshold: { not: null }, archivedAt: null } },
          select: { currentQuantity: true, product: { select: { id: true, name: true, sku: true, lowStockThreshold: true, defaultUnit: { select: { symbol: true } } } } },
          orderBy: { currentQuantity: "asc" },
        })
      : null,
    // Customers & Suppliers
    canCustomers ? db.customer.count({ where: { organizationId: session.orgId, archivedAt: null } }) : null,
    canSuppliers ? db.supplier.count({ where: { organizationId: session.orgId, archivedAt: null } }) : null,
    // Notifications preview (last 5 unread)
    db.notification.findMany({
      where: { warehouseId: session.warehouseId, readAt: null },
      select: { id: true, type: true, payload: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // Chart data — last 30 days of sales (also used for top customers)
    canSales
      ? db.invoice.findMany({
          where: { type: "SALE", status: "CONFIRMED", warehouseId: session.warehouseId, confirmedAt: { gte: thirtyDaysAgo } },
          select: { confirmedAt: true, totalAmount: true, customerId: true, customer: { select: { name: true } } },
        })
      : null,
    // Chart data — last 30 days of purchases
    canPurchases
      ? db.invoice.findMany({
          where: { type: "PURCHASE", status: "CONFIRMED", warehouseId: session.warehouseId, confirmedAt: { gte: thirtyDaysAgo } },
          select: { confirmedAt: true, totalAmount: true },
        })
      : null,
    // Receivables (confirmed sales with payments, all time)
    canSales && canPayments
      ? db.invoice.findMany({
          where: { type: "SALE", status: "CONFIRMED", warehouseId: session.warehouseId },
          select: { id: true, totalAmount: true, confirmedAt: true, customer: { select: { name: true } }, payments: { select: { amount: true } } },
          orderBy: { confirmedAt: "asc" },
        })
      : null,
    // Payables (confirmed purchases with payments, all time)
    canPurchases && canPayments
      ? db.invoice.findMany({
          where: { type: "PURCHASE", status: "CONFIRMED", warehouseId: session.warehouseId },
          select: { id: true, totalAmount: true, confirmedAt: true, supplier: { select: { name: true } }, payments: { select: { amount: true } } },
          orderBy: { confirmedAt: "asc" },
        })
      : null,
    // Top products (InvoiceLines from confirmed sales this month)
    canSales
      ? db.invoiceLine.findMany({
          where: { invoice: { type: "SALE", status: "CONFIRMED", warehouseId: session.warehouseId, confirmedAt: { gte: monthStart } } },
          select: { productId: true, totalPrice: true, product: { select: { name: true } } },
        })
      : null,
    // Pending actions
    canSales    ? db.invoice.count({ where: { type: "SALE",     status: "DRAFT", warehouseId: session.warehouseId } }) : null,
    canPurchases? db.invoice.count({ where: { type: "PURCHASE", status: "DRAFT", warehouseId: session.warehouseId } }) : null,
    // Recent inventory activity
    canInventory
      ? db.inventoryMovement.findMany({
          where: { warehouseId: session.warehouseId },
          select: { id: true, movementType: true, quantity: true, createdAt: true, product: { select: { name: true } }, actor: { select: { name: true } }, unit: { select: { symbol: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : null,
  ]);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const revenueThisMonth  = Number(salesAggrThisMonth?._sum?.totalAmount ?? 0);
  const revenueLastMonth  = Number(salesAggrLastMonth?._sum?.totalAmount ?? 0);
  const spendThisMonth    = Number(purchasesAggrThisMonth?._sum?.totalAmount ?? 0);
  const spendLastMonth    = Number(purchasesAggrLastMonth?._sum?.totalAmount ?? 0);
  const collectedAmount   = Number(collectedThisMonth?._sum?.amount ?? 0);
  const grossProfit       = revenueThisMonth - spendThisMonth;
  const grossMargin       = revenueThisMonth > 0 ? (grossProfit / revenueThisMonth) * 100 : 0;

  // Low stock split
  const lowStockPositive = lowStockCandidates
    ? lowStockCandidates.filter(
        (b) => b.product.lowStockThreshold !== null &&
               Number(b.currentQuantity) > 0 &&
               Number(b.currentQuantity) <= b.product.lowStockThreshold!
      )
    : null;
  const lowStockCount = lowStockPositive?.length ?? null;
  const lowStockTable = lowStockPositive?.slice(0, 5) ?? null;

  // Top customers (from last 30 days; but we'll show this month's data)
  type CustomerRow = { name: string; revenue: number };
  const topCustomers: CustomerRow[] = [];
  if (salesLast30) {
    const map = new Map<string, CustomerRow>();
    for (const inv of salesLast30) {
      if (!inv.customerId || !inv.customer || !inv.confirmedAt) continue;
      if (inv.confirmedAt < monthStart) continue; // only this month
      const existing = map.get(inv.customerId);
      if (existing) existing.revenue += Number(inv.totalAmount);
      else map.set(inv.customerId, { name: inv.customer.name, revenue: Number(inv.totalAmount) });
    }
    topCustomers.push(...Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5));
  }

  // Top products (this month)
  type ProductRow = { name: string; revenue: number };
  const topProducts: ProductRow[] = [];
  if (salesLinesThisMonth) {
    const map = new Map<string, ProductRow>();
    for (const line of salesLinesThisMonth) {
      const existing = map.get(line.productId);
      if (existing) existing.revenue += Number(line.totalPrice);
      else map.set(line.productId, { name: line.product.name, revenue: Number(line.totalPrice) });
    }
    topProducts.push(...Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5));
  }

  // Receivables
  type OutstandingRow = { id: string; label: string | null; total: number; outstanding: number; confirmedAt: Date | null; invoiceType: "SALE" | "PURCHASE" };
  const receivables: OutstandingRow[] = [];
  if (salesWithPayments) {
    for (const inv of salesWithPayments) {
      const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
      const outstanding = Number(inv.totalAmount) - paid;
      if (outstanding > 0.001) {
        receivables.push({ id: inv.id, label: inv.customer?.name ?? null, total: Number(inv.totalAmount), outstanding, confirmedAt: inv.confirmedAt, invoiceType: "SALE" });
      }
    }
  }

  // Payables
  const payables: OutstandingRow[] = [];
  if (purchasesWithPayments) {
    for (const inv of purchasesWithPayments) {
      const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
      const outstanding = Number(inv.totalAmount) - paid;
      if (outstanding > 0.001) {
        payables.push({ id: inv.id, label: inv.supplier?.name ?? null, total: Number(inv.totalAmount), outstanding, confirmedAt: inv.confirmedAt, invoiceType: "PURCHASE" });
      }
    }
  }

  // Awaiting Payment — combined, oldest first
  const awaitingPayment = [...receivables, ...payables]
    .sort((a, b) => (a.confirmedAt?.getTime() ?? 0) - (b.confirmedAt?.getTime() ?? 0))
    .slice(0, 8);

  const totalReceivables = receivables.reduce((s, r) => s + r.outstanding, 0);
  const totalPayables    = payables.reduce((s, p) => s + p.outstanding, 0);

  // Chart data — build 30-day array
  const chartData: ChartPoint[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { label, sales: 0, purchases: 0 };
  });
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (salesLast30) {
    for (const inv of salesLast30) {
      if (!inv.confirmedAt) continue;
      const daysBack = Math.floor((todayMidnight.getTime() - new Date(inv.confirmedAt.getFullYear(), inv.confirmedAt.getMonth(), inv.confirmedAt.getDate()).getTime()) / 86_400_000);
      const idx = 29 - daysBack;
      if (idx >= 0 && idx < 30) chartData[idx].sales += Number(inv.totalAmount);
    }
  }
  if (purchasesLast30) {
    for (const inv of purchasesLast30) {
      if (!inv.confirmedAt) continue;
      const daysBack = Math.floor((todayMidnight.getTime() - new Date(inv.confirmedAt.getFullYear(), inv.confirmedAt.getMonth(), inv.confirmedAt.getDate()).getTime()) / 86_400_000);
      const idx = 29 - daysBack;
      if (idx >= 0 && idx < 30) chartData[idx].purchases += Number(inv.totalAmount);
    }
  }

  const unreadCount = recentNotifications.length; // approximate; exact count would need a separate query
  const greeting  = getGreeting(t);
  const firstName = employee?.name?.split(" ")[0] ?? "there";
  const monthName = now.toLocaleString("en-US", { month: "long" });

  const hasPendingActions =
    (draftSalesCount ?? 0) > 0 ||
    (draftPurchasesCount ?? 0) > 0 ||
    (outOfStockCount ?? 0) > 0 ||
    (lowStockCount ?? 0) > 0;

  const showChart = canSales || canPurchases;

  // Row visibility
  const showReceivablesPayables = (canSales && canPayments) || (canPurchases && canPayments);
  const showTopCustomers = canSales && canCustomers && topCustomers.length > 0;
  const showTopProducts  = canSales && topProducts.length > 0;
  const showTopRow       = showTopCustomers || showTopProducts;
  const showNotifications = recentNotifications.length > 0;
  const showAwaitingPayment = canPayments && awaitingPayment.length > 0;
  const showNotifAwaitRow = showNotifications || showAwaitingPayment;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ maxWidth: "1200px", display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div style={{
        background: "linear-gradient(135deg, #0d1627 0%, #101828 100%)",
        border: "1px solid #222a3e",
        borderInlineStart: "3px solid #0062ff",
        borderRadius: "10px",
        padding: "20px 28px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
      }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 600, color: "#dbe2fd", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
            {greeting}, {firstName}!
          </h1>
          <p style={{ fontSize: "13px", color: "#8c90a2", margin: 0 }}>
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        {unreadCount > 0 && (
          <Link href="/dashboard/notifications" style={{
            display: "flex", alignItems: "center", gap: "8px",
            backgroundColor: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: "8px", padding: "8px 14px", textDecoration: "none", color: "#f59e0b",
            fontSize: "13px", fontWeight: 500,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5A4 4 0 003 5.5v2L2 9h10l-1-1.5v-2A4 4 0 007 1.5z" stroke="#f59e0b" strokeWidth="1.25" strokeLinejoin="round" />
              <path d="M5.5 9.5a1.5 1.5 0 003 0" stroke="#f59e0b" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
            {unreadCount !== 1
              ? t.unreadNotificationPlural.replace("{count}", String(unreadCount))
              : t.unreadNotificationSingular.replace("{count}", String(unreadCount))}
          </Link>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* KPI Row                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {canSales && (
          <KpiCard
            label={t.revenue}
            value={fmtCurrency(revenueThisMonth)}
            description={monthName}
            accent="#62df7d"
            bgAccent="rgba(98,223,125,0.1)"
            trendCurrent={revenueThisMonth}
            trendPrevious={revenueLastMonth}
            icon={<IconRevenue />}
          />
        )}
        {canPayments && (
          <KpiCard
            label={t.collected}
            value={fmtCurrency(collectedAmount)}
            description={monthName}
            accent="#60a5fa"
            bgAccent="rgba(96,165,250,0.1)"
            sub={revenueThisMonth > 0 && canSales ? t.percentOfRevenue.replace("{percent}", ((collectedAmount / revenueThisMonth) * 100).toFixed(0)) : undefined}
            icon={<IconCollected />}
          />
        )}
        {canSales && canPurchases && (
          <KpiCard
            label={t.grossProfit}
            value={fmtCurrency(grossProfit)}
            description={monthName}
            accent={grossProfit >= 0 ? "#a78bfa" : "#ff4d4f"}
            bgAccent="rgba(167,139,250,0.1)"
            sub={`${fmtPct(grossMargin)} ${t.marginSuffix}`}
            icon={<IconProfit />}
          />
        )}
        {canPurchases && (
          <KpiCard
            label={t.purchases}
            value={fmtCurrency(spendThisMonth)}
            description={monthName}
            accent="#60a5fa"
            bgAccent="rgba(96,165,250,0.1)"
            trendCurrent={spendThisMonth}
            trendPrevious={spendLastMonth}
            icon={<IconPurchase />}
          />
        )}
        {canInventory && outOfStockCount !== null && (
          <KpiCard
            label={t.outOfStock}
            value={outOfStockCount.toLocaleString()}
            description={t.outOfStockDescription}
            accent={outOfStockCount > 0 ? "#ff4d4f" : "#4a5068"}
            bgAccent={outOfStockCount > 0 ? "rgba(255,77,79,0.1)" : "rgba(74,80,104,0.1)"}
            icon={<IconOutOfStock />}
          />
        )}
        {canInventory && lowStockCount !== null && (
          <KpiCard
            label={t.lowStock}
            value={lowStockCount.toLocaleString()}
            description={t.lowStockDescription}
            accent={lowStockCount > 0 ? "#f59e0b" : "#4a5068"}
            bgAccent={lowStockCount > 0 ? "rgba(245,158,11,0.1)" : "rgba(74,80,104,0.1)"}
            icon={<IconLowStock />}
          />
        )}
        {canCustomers && customerCount !== null && (
          <KpiCard
            label={t.customers}
            value={customerCount.toLocaleString()}
            description={t.active}
            accent="#dbe2fd"
            bgAccent="rgba(0,98,255,0.1)"
            icon={<IconCustomers />}
          />
        )}
        {canSuppliers && supplierCount !== null && (
          <KpiCard
            label={t.suppliers}
            value={supplierCount.toLocaleString()}
            description={t.active}
            accent="#dbe2fd"
            bgAccent="rgba(0,98,255,0.1)"
            icon={<IconSuppliers />}
          />
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Pending Actions                                                       */}
      {/* ------------------------------------------------------------------ */}
      {(canSales || canPurchases || canInventory) && (
        <SectionCard title={t.pendingActions}>
          <div style={{ padding: "6px 0" }}>
            {canSales && draftSalesCount !== null && (
              <Link href="/dashboard/sales?status=DRAFT" style={{ textDecoration: "none", display: "block" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 20px", borderBottom: "1px solid #1a2236" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "30px", height: "30px", borderRadius: "8px", backgroundColor: draftSalesCount > 0 ? "rgba(98,223,125,0.1)" : "rgba(74,80,104,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 10L5.5 6.5L8 9L12 3" stroke={draftSalesCount > 0 ? "#62df7d" : "#4a5068"} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#dbe2fd" }}>{t.draftSalesInvoices}</div>
                      <div style={{ fontSize: "11px", color: "#8c90a2", marginTop: "1px" }}>{t.awaitingConfirmation}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: draftSalesCount > 0 ? "#62df7d" : "#4a5068" }}>{draftSalesCount}</span>
                    <IconChevron />
                  </div>
                </div>
              </Link>
            )}
            {canPurchases && draftPurchasesCount !== null && (
              <Link href="/dashboard/purchases?status=DRAFT" style={{ textDecoration: "none", display: "block" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 20px", borderBottom: "1px solid #1a2236" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "30px", height: "30px", borderRadius: "8px", backgroundColor: draftPurchasesCount > 0 ? "rgba(96,165,250,0.1)" : "rgba(74,80,104,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="2" y="5" width="10" height="8" rx="1" stroke={draftPurchasesCount > 0 ? "#60a5fa" : "#4a5068"} strokeWidth="1.4" />
                        <path d="M4.5 5V4a2.5 2.5 0 015 0v1" stroke={draftPurchasesCount > 0 ? "#60a5fa" : "#4a5068"} strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#dbe2fd" }}>{t.draftPurchaseInvoices}</div>
                      <div style={{ fontSize: "11px", color: "#8c90a2", marginTop: "1px" }}>{t.awaitingConfirmation}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: draftPurchasesCount > 0 ? "#60a5fa" : "#4a5068" }}>{draftPurchasesCount}</span>
                    <IconChevron />
                  </div>
                </div>
              </Link>
            )}
            {canInventory && outOfStockCount !== null && outOfStockCount > 0 && (
              <Link href="/dashboard/inventory/stock" style={{ textDecoration: "none", display: "block" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 20px", borderBottom: "1px solid #1a2236" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "30px", height: "30px", borderRadius: "8px", backgroundColor: "rgba(255,77,79,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="5.5" stroke="#ff4d4f" strokeWidth="1.4" />
                        <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="#ff4d4f" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#dbe2fd" }}>{t.outOfStockTitle}</div>
                      <div style={{ fontSize: "11px", color: "#8c90a2", marginTop: "1px" }}>{t.outOfStockSubtitle}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#ff4d4f" }}>{outOfStockCount}</span>
                    <IconChevron />
                  </div>
                </div>
              </Link>
            )}
            {canInventory && lowStockCount !== null && lowStockCount > 0 && (
              <Link href="/dashboard/inventory/stock" style={{ textDecoration: "none", display: "block" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 20px", borderBottom: "1px solid #1a2236" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "30px", height: "30px", borderRadius: "8px", backgroundColor: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 2L13 12H1L7 2Z" stroke="#f59e0b" strokeWidth="1.4" strokeLinejoin="round" />
                        <path d="M7 5.5V8" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round" />
                        <circle cx="7" cy="9.5" r="0.6" fill="#f59e0b" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#dbe2fd" }}>{t.lowStockItemsTitle}</div>
                      <div style={{ fontSize: "11px", color: "#8c90a2", marginTop: "1px" }}>{t.lowStockItemsSubtitle}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#f59e0b" }}>{lowStockCount}</span>
                    <IconChevron />
                  </div>
                </div>
              </Link>
            )}
            {!hasPendingActions && (
              <div style={{ padding: "20px", display: "flex", alignItems: "center", gap: "10px", color: "#62df7d" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke="#62df7d" strokeWidth="1.4" />
                  <path d="M5.5 8l1.5 1.5 3.5-3.5" stroke="#62df7d" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: "13px" }}>{t.allCaughtUp}</span>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 30-Day Trend Chart                                                   */}
      {/* ------------------------------------------------------------------ */}
      {showChart && (
        <SectionCard title={t.salesVsPurchases}>
          <div style={{ padding: "16px 20px 8px" }}>
            <SalesPurchasesChart
              data={chartData}
              showSales={canSales}
              showPurchases={canPurchases}
            />
          </div>
        </SectionCard>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Receivables | Payables                                               */}
      {/* ------------------------------------------------------------------ */}
      {showReceivablesPayables && (
        <div style={{ display: "grid", gridTemplateColumns: (canSales && canPayments) && (canPurchases && canPayments) ? "1fr 1fr" : "1fr", gap: "14px" }}>
          {canSales && canPayments && (
            <SectionCard
              title={`${t.receivablesOutstanding}${totalReceivables > 0 ? ` — ${fmtCurrency(totalReceivables)}` : ""}`}
              href="/dashboard/sales"
              hrefLabel={t.allSales}
            >
              {receivables.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <TableHead cols={[{ label: t.colInvoice }, { label: t.colCustomer }, { label: t.colTotal, align: "end" }, { label: t.colOutstanding, align: "end" }, { label: t.colAge }]} />
                  <tbody>
                    {receivables.slice(0, 6).map((r, i) => (
                      <tr key={r.id}>
                        <td style={{ padding: "10px 20px", color: "#0062ff", fontFamily: "monospace", fontSize: "12px", borderBottom: i < Math.min(receivables.length, 6) - 1 ? "1px solid #1a2236" : "none" }}>
                          #{truncateId(r.id)}
                        </td>
                        <td style={{ padding: "10px 20px", color: "#dbe2fd", maxWidth: "110px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderBottom: i < Math.min(receivables.length, 6) - 1 ? "1px solid #1a2236" : "none" }}>
                          {r.label ?? <span style={{ color: "#4a5068", fontStyle: "italic" }}>{t.walkIn}</span>}
                        </td>
                        <td style={{ padding: "10px 20px", textAlign: "end", color: "#8c90a2", borderBottom: i < Math.min(receivables.length, 6) - 1 ? "1px solid #1a2236" : "none" }}>
                          {fmtCurrency(r.total)}
                        </td>
                        <td style={{ padding: "10px 20px", textAlign: "end", fontWeight: 600, color: "#ff4d4f", borderBottom: i < Math.min(receivables.length, 6) - 1 ? "1px solid #1a2236" : "none" }}>
                          {fmtCurrency(r.outstanding)}
                        </td>
                        <td style={{ padding: "10px 20px", color: "#8c90a2", fontSize: "12px", whiteSpace: "nowrap", borderBottom: i < Math.min(receivables.length, 6) - 1 ? "1px solid #1a2236" : "none" }}>
                          {relativeTime(r.confirmedAt, t)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState text={t.noOutstandingReceivables} />
              )}
            </SectionCard>
          )}
          {canPurchases && canPayments && (
            <SectionCard
              title={`${t.payablesOutstanding}${totalPayables > 0 ? ` — ${fmtCurrency(totalPayables)}` : ""}`}
              href="/dashboard/purchases"
              hrefLabel={t.allPurchases}
            >
              {payables.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <TableHead cols={[{ label: t.colInvoice }, { label: t.colSupplier }, { label: t.colTotal, align: "end" }, { label: t.colOutstanding, align: "end" }, { label: t.colAge }]} />
                  <tbody>
                    {payables.slice(0, 6).map((r, i) => (
                      <tr key={r.id}>
                        <td style={{ padding: "10px 20px", color: "#0062ff", fontFamily: "monospace", fontSize: "12px", borderBottom: i < Math.min(payables.length, 6) - 1 ? "1px solid #1a2236" : "none" }}>
                          #{truncateId(r.id)}
                        </td>
                        <td style={{ padding: "10px 20px", color: "#dbe2fd", maxWidth: "110px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderBottom: i < Math.min(payables.length, 6) - 1 ? "1px solid #1a2236" : "none" }}>
                          {r.label ?? <span style={{ color: "#4a5068", fontStyle: "italic" }}>{t.unknown}</span>}
                        </td>
                        <td style={{ padding: "10px 20px", textAlign: "end", color: "#8c90a2", borderBottom: i < Math.min(payables.length, 6) - 1 ? "1px solid #1a2236" : "none" }}>
                          {fmtCurrency(r.total)}
                        </td>
                        <td style={{ padding: "10px 20px", textAlign: "end", fontWeight: 600, color: "#f59e0b", borderBottom: i < Math.min(payables.length, 6) - 1 ? "1px solid #1a2236" : "none" }}>
                          {fmtCurrency(r.outstanding)}
                        </td>
                        <td style={{ padding: "10px 20px", color: "#8c90a2", fontSize: "12px", whiteSpace: "nowrap", borderBottom: i < Math.min(payables.length, 6) - 1 ? "1px solid #1a2236" : "none" }}>
                          {relativeTime(r.confirmedAt, t)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState text={t.noOutstandingPayables} />
              )}
            </SectionCard>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Top Customers | Top Products                                         */}
      {/* ------------------------------------------------------------------ */}
      {showTopRow && (
        <div style={{ display: "grid", gridTemplateColumns: showTopCustomers && showTopProducts ? "1fr 1fr" : "1fr", gap: "14px" }}>
          {showTopCustomers && (
            <SectionCard title={`${t.topCustomers} — ${monthName}`} href="/dashboard/customers" hrefLabel={t.allCustomers}>
              {topCustomers.length > 0 ? (
                <div>
                  {topCustomers.map((c, i) => {
                    const barPct = topCustomers[0].revenue > 0 ? (c.revenue / topCustomers[0].revenue) * 100 : 0;
                    return (
                      <div key={i} style={{ padding: "11px 20px", borderBottom: i < topCustomers.length - 1 ? "1px solid #1a2236" : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                          <span style={{ fontSize: "13px", color: "#dbe2fd", fontWeight: 500, maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {i + 1}. {c.name}
                          </span>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#62df7d" }}>{fmtCurrency(c.revenue)}</span>
                        </div>
                        <div style={{ height: "3px", backgroundColor: "#222a3e", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${barPct}%`, backgroundColor: "#62df7d", borderRadius: "2px", opacity: 0.6 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text={t.noSalesThisMonth.replace("{month}", monthName)} />
              )}
            </SectionCard>
          )}
          {showTopProducts && (
            <SectionCard title={`${t.topProducts} — ${monthName}`} href="/dashboard/reports" hrefLabel={t.reports}>
              {topProducts.length > 0 ? (
                <div>
                  {topProducts.map((p, i) => {
                    const barPct = topProducts[0].revenue > 0 ? (p.revenue / topProducts[0].revenue) * 100 : 0;
                    return (
                      <div key={i} style={{ padding: "11px 20px", borderBottom: i < topProducts.length - 1 ? "1px solid #1a2236" : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                          <span style={{ fontSize: "13px", color: "#dbe2fd", fontWeight: 500, maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {i + 1}. {p.name}
                          </span>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#a78bfa" }}>{fmtCurrency(p.revenue)}</span>
                        </div>
                        <div style={{ height: "3px", backgroundColor: "#222a3e", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${barPct}%`, backgroundColor: "#a78bfa", borderRadius: "2px", opacity: 0.6 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text={t.noProductSalesThisMonth.replace("{month}", monthName)} />
              )}
            </SectionCard>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Notifications Preview | Awaiting Payment                            */}
      {/* ------------------------------------------------------------------ */}
      {showNotifAwaitRow && (
        <div style={{ display: "grid", gridTemplateColumns: showNotifications && showAwaitingPayment ? "1fr 1fr" : "1fr", gap: "14px" }}>
          {showNotifications && (
            <SectionCard title={t.unreadNotifications} href="/dashboard/notifications" hrefLabel={t.viewAll}>
              <div>
                {recentNotifications.map((n, i) => {
                  const badge = notificationBadge(n.type);
                  return (
                    <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 20px", borderBottom: i < recentNotifications.length - 1 ? "1px solid #1a2236" : "none" }}>
                      <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, color: badge.color, backgroundColor: badge.bg, whiteSpace: "nowrap", flexShrink: 0, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                        {n.type.replace(/_/g, " ")}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", color: "#dbe2fd", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {notificationMessage(n.type, n.payload, t)}
                        </div>
                        <div style={{ fontSize: "11px", color: "#4a5068", marginTop: "2px" }}>{relativeTime(n.createdAt, t)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}
          {showAwaitingPayment && (
            <SectionCard title={t.awaitingPayment} href="/dashboard/payments" hrefLabel={t.allPayments}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <TableHead cols={[{ label: t.colInvoice }, { label: t.colParty }, { label: t.colType }, { label: t.colOutstanding, align: "end" }, { label: t.colAge }]} />
                <tbody>
                  {awaitingPayment.map((r, i) => (
                    <tr key={r.id}>
                      <td style={{ padding: "10px 20px", color: "#0062ff", fontFamily: "monospace", fontSize: "12px", borderBottom: i < awaitingPayment.length - 1 ? "1px solid #1a2236" : "none" }}>
                        #{truncateId(r.id)}
                      </td>
                      <td style={{ padding: "10px 20px", color: "#dbe2fd", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderBottom: i < awaitingPayment.length - 1 ? "1px solid #1a2236" : "none" }}>
                        {r.label ?? <span style={{ color: "#4a5068", fontStyle: "italic" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 20px", borderBottom: i < awaitingPayment.length - 1 ? "1px solid #1a2236" : "none" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 7px", borderRadius: "4px", color: r.invoiceType === "SALE" ? "#62df7d" : "#60a5fa", backgroundColor: r.invoiceType === "SALE" ? "rgba(98,223,125,0.1)" : "rgba(96,165,250,0.1)" }}>
                          {r.invoiceType === "SALE" ? t.sale : t.purchase}
                        </span>
                      </td>
                      <td style={{ padding: "10px 20px", textAlign: "end", fontWeight: 600, color: r.invoiceType === "SALE" ? "#ff4d4f" : "#f59e0b", borderBottom: i < awaitingPayment.length - 1 ? "1px solid #1a2236" : "none" }}>
                        {fmtCurrency(r.outstanding)}
                      </td>
                      <td style={{ padding: "10px 20px", color: "#8c90a2", fontSize: "12px", whiteSpace: "nowrap", borderBottom: i < awaitingPayment.length - 1 ? "1px solid #1a2236" : "none" }}>
                        {relativeTime(r.confirmedAt, t)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Low Stock Alert table                                                */}
      {/* ------------------------------------------------------------------ */}
      {canInventory && lowStockTable && lowStockTable.length > 0 && (
        <SectionCard title={t.lowStockAlerts} href="/dashboard/inventory/stock" hrefLabel={t.viewInventory}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <TableHead cols={[{ label: t.colProduct }, { label: t.colSku }, { label: t.colStock, align: "end" }, { label: t.colMin, align: "end" }, { label: "" }]} />
            <tbody>
              {lowStockTable.map((b, i) => {
                const qty = Number(b.currentQuantity);
                const threshold = b.product.lowStockThreshold!;
                const pct = threshold > 0 ? Math.min(1, qty / threshold) : 0;
                const barColor = qty === 0 ? "#ff4d4f" : pct < 0.4 ? "#f59e0b" : "#62df7d";
                return (
                  <tr key={b.product.id}>
                    <td style={{ padding: "11px 20px", color: "#dbe2fd", fontWeight: 500, borderBottom: i < lowStockTable.length - 1 ? "1px solid #1a2236" : "none", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.product.name}</td>
                    <td style={{ padding: "11px 20px", color: "#8c90a2", fontSize: "12px", fontFamily: "monospace", borderBottom: i < lowStockTable.length - 1 ? "1px solid #1a2236" : "none" }}>{b.product.sku}</td>
                    <td style={{ padding: "11px 20px", textAlign: "end", fontWeight: 600, color: qty === 0 ? "#ff4d4f" : pct < 0.4 ? "#f59e0b" : "#dbe2fd", borderBottom: i < lowStockTable.length - 1 ? "1px solid #1a2236" : "none" }}>
                      {qty.toLocaleString()} <span style={{ fontWeight: 400, fontSize: "11px", color: "#8c90a2" }}>{b.product.defaultUnit.symbol}</span>
                    </td>
                    <td style={{ padding: "11px 20px", textAlign: "end", color: "#8c90a2", borderBottom: i < lowStockTable.length - 1 ? "1px solid #1a2236" : "none" }}>{threshold.toLocaleString()}</td>
                    <td style={{ padding: "11px 20px", width: "100px", borderBottom: i < lowStockTable.length - 1 ? "1px solid #1a2236" : "none" }}>
                      <div style={{ height: "4px", backgroundColor: "#222a3e", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.round(pct * 100)}%`, backgroundColor: barColor, borderRadius: "2px" }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SectionCard>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Recent Activity — last 5 movements                                   */}
      {/* ------------------------------------------------------------------ */}
      {canInventory && recentActivity && recentActivity.length > 0 && (
        <SectionCard title={t.recentInventoryActivity} href="/dashboard/inventory/movements" hrefLabel={t.viewAll}>
          <div>
            {recentActivity.map((mov, i) => {
              const badge = movementBadge(mov.movementType, t);
              const qty   = Number(mov.quantity);
              const isOut = mov.movementType === "SALE_OUT" || mov.movementType === "TRANSFER_OUT" || mov.movementType === "RETURN_OUT";
              return (
                <div key={mov.id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "11px 20px", borderBottom: i < recentActivity.length - 1 ? "1px solid #1a2236" : "none" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: "5px", fontSize: "11px", fontWeight: 600, color: badge.color, backgroundColor: badge.bg, whiteSpace: "nowrap", flexShrink: 0, minWidth: "84px", justifyContent: "center" }}>
                    {badge.label}
                  </span>
                  <span style={{ fontSize: "13px", color: "#dbe2fd", fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {mov.product.name}
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: isOut ? "#ff4d4f" : "#62df7d", flexShrink: 0, minWidth: "70px", textAlign: "end" }}>
                    {isOut ? "−" : "+"}{qty.toLocaleString()} <span style={{ fontWeight: 400, fontSize: "11px", color: "#8c90a2" }}>{mov.unit.symbol}</span>
                  </span>
                  <span style={{ fontSize: "12px", color: "#8c90a2", flexShrink: 0, minWidth: "90px", textAlign: "end", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {mov.actor.name}
                  </span>
                  <span style={{ fontSize: "12px", color: "#4a5068", flexShrink: 0, minWidth: "64px", textAlign: "end", whiteSpace: "nowrap" }}>
                    {relativeTime(mov.createdAt, t)}
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* No permissions fallback */}
      {!canSales && !canPurchases && !canInventory && !canCustomers && !canSuppliers && !canPayments && recentNotifications.length === 0 && (
        <div style={{ backgroundColor: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "48px 24px", textAlign: "center" }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ margin: "0 auto 14px", display: "block", opacity: 0.4 }}>
            <circle cx="20" cy="20" r="18" stroke="#8c90a2" strokeWidth="2" />
            <path d="M20 13v8" stroke="#8c90a2" strokeWidth="2" strokeLinecap="round" />
            <circle cx="20" cy="26" r="1.5" fill="#8c90a2" />
          </svg>
          <p style={{ fontSize: "14px", color: "#8c90a2", margin: 0 }}>{t.limitedPermissions}</p>
        </div>
      )}
    </div>
  );
}
