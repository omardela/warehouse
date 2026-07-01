import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/core/auth/session";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { db } from "@/lib/db";
import Link from "next/link";
import { getLocale } from "@/core/i18n/locale";
import { getDictionary } from "@/core/i18n/get-dictionary";
import { ReportTabs } from "./components/ReportTabs";
import { DateRangePicker } from "./components/DateRangePicker";
import { SalesChart } from "./components/SalesChart";
import { DataTable } from "./components/DataTable";
import type { ChartDataPoint } from "./components/SalesChart";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SearchParams = Promise<{
  tab?: string;
  from?: string;
  to?: string;
  preset?: string;
}>;

// ─────────────────────────────────────────────────────────────────────────────
// Date range helpers
// ─────────────────────────────────────────────────────────────────────────────

function getDateRange(
  from: string | undefined,
  to: string | undefined,
  preset: string | undefined
): { fromDate: Date; toDate: Date; fromStr: string; toStr: string; preset: string } {
  const now = new Date();

  if (from && to) {
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    return { fromDate, toDate, fromStr: from, toStr: to, preset: "custom" };
  }

  const resolvedPreset = preset ?? "month";

  if (resolvedPreset === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const s = toDateStr(start);
    const e = toDateStr(end);
    return { fromDate: start, toDate: end, fromStr: s, toStr: e, preset: "today" };
  }

  if (resolvedPreset === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return {
      fromDate: start,
      toDate: end,
      fromStr: toDateStr(start),
      toStr: toDateStr(end),
      preset: "week",
    };
  }

  if (resolvedPreset === "year") {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return {
      fromDate: start,
      toDate: end,
      fromStr: toDateStr(start),
      toStr: toDateStr(end),
      preset: "year",
    };
  }

  // default: month
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return {
    fromDate: start,
    toDate: end,
    fromStr: toDateStr(start),
    toStr: toDateStr(end),
    preset: "month",
  };
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = Number(v.toString());
  return isNaN(n) ? 0 : n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Grouping helper — group invoice totals by day or by week
// ─────────────────────────────────────────────────────────────────────────────

function groupByPeriod(
  invoices: { totalAmount: { toString(): string }; createdAt: Date }[],
  useWeeks: boolean
): ChartDataPoint[] {
  const map = new Map<string, number>();

  for (const inv of invoices) {
    const date = inv.createdAt;
    let key: string;

    if (useWeeks) {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    } else {
      key = `${date.getMonth() + 1}/${date.getDate()}`;
    }

    map.set(key, (map.get(key) ?? 0) + toNum(inv.totalAmount));
  }

  return Array.from(map.entries()).map(([date, value]) => ({ date, value }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat card component (server)
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "#171f33",
        border: "1px solid #222a3e",
        borderRadius: "10px",
        padding: "20px 24px",
      }}
    >
      <p
        style={{
          fontSize: "11px",
          color: "#8c90a2",
          margin: "0 0 8px",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: valueColor ?? "#dbe2fd",
          margin: 0,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: "12px", color: "#8c90a2", margin: "6px 0 0" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "#171f33",
        border: "1px solid #222a3e",
        borderRadius: "10px",
        padding: "20px 24px",
        marginBottom: "20px",
      }}
    >
      {title && (
        <p
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#8c90a2",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: "0 0 16px",
          }}
        >
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "reports.report.read");

  const locale = await getLocale();
  const t = getDictionary(locale);

  const params = await searchParams;
  const tab = params.tab ?? "sales";
  const { fromDate, toDate, fromStr, toStr, preset } = getDateRange(
    params.from,
    params.to,
    params.preset
  );

  const rangeLabel = `${toDateStr(fromDate)} ${t.reports.dateRange.to} ${toDateStr(toDate)}`;

  // Build export URL for the current tab and date range
  const exportParams = new URLSearchParams({ tab, from: fromStr, to: toStr });
  const exportUrl = `/dashboard/reports/export?${exportParams.toString()}`;

  // ─── Sales Tab ─────────────────────────────────────────────────────────────
  let salesContent: React.ReactNode = null;
  if (tab === "sales") {
    const [invoices, salesLines] = await Promise.all([
      db.invoice.findMany({
        where: {
          type: "SALE",
          status: "CONFIRMED",
          warehouseId: session.warehouseId,
          createdAt: { gte: fromDate, lte: toDate },
        },
        select: { totalAmount: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      db.invoiceLine.groupBy({
        by: ["productId"],
        where: {
          invoice: {
            type: "SALE",
            status: "CONFIRMED",
            warehouseId: session.warehouseId,
            createdAt: { gte: fromDate, lte: toDate },
          },
        },
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { totalPrice: "desc" } },
        take: 10,
      }),
    ]);

    const totalRevenue = invoices.reduce(
      (acc, inv) => acc + toNum(inv.totalAmount),
      0
    );
    const invoiceCount = invoices.length;

    // Days span to decide grouping
    const daySpan =
      (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    const useWeeks = daySpan > 31;
    const chartData = groupByPeriod(invoices, useWeeks);

    // Product names
    const productIds = salesLines.map((l) => l.productId);
    const products =
      productIds.length > 0
        ? await db.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, sku: true },
          })
        : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const tableRows = salesLines.map((line) => {
      const product = productMap.get(line.productId);
      return {
        product: product?.name ?? "Unknown",
        sku: product?.sku ?? "—",
        qty: fmtNumber(Math.round(toNum(line._sum.quantity))),
        revenue: fmtMoney(toNum(line._sum.totalPrice)),
      };
    });

    salesContent = (
      <>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <StatCard label={t.reports.stats.totalRevenue} value={fmtMoney(totalRevenue)} />
          <StatCard
            label={t.reports.stats.invoiceCount}
            value={fmtNumber(invoiceCount)}
            sub={t.reports.stats.confirmedSaleInvoices}
          />
          <StatCard
            label={t.reports.stats.avgPerInvoice}
            value={invoiceCount > 0 ? fmtMoney(totalRevenue / invoiceCount) : "$0.00"}
          />
        </div>

        <SectionCard title={useWeeks ? t.reports.chart.revenueByWeek : t.reports.chart.revenueByDay}>
          <Suspense fallback={null}>
            <SalesChart
              data={chartData}
              label={t.reports.chart.revenue}
              color="#0062ff"
            />
          </Suspense>
        </SectionCard>

        <DataTable
          columns={[
            { key: "product", label: t.reports.table.product },
            { key: "sku", label: t.reports.table.sku },
            { key: "qty", label: t.reports.table.qtySold, align: "right" },
            { key: "revenue", label: t.reports.table.revenue, align: "right" },
          ]}
          rows={tableRows}
          exportUrl={exportUrl}
          emptyMessage={t.reports.table.noSalesInPeriod}
        />
      </>
    );
  }

  // ─── Purchases Tab ─────────────────────────────────────────────────────────
  let purchasesContent: React.ReactNode = null;
  if (tab === "purchases") {
    const [invoices, purchaseLines] = await Promise.all([
      db.invoice.findMany({
        where: {
          type: "PURCHASE",
          status: "CONFIRMED",
          warehouseId: session.warehouseId,
          createdAt: { gte: fromDate, lte: toDate },
        },
        select: { totalAmount: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      db.invoiceLine.groupBy({
        by: ["productId"],
        where: {
          invoice: {
            type: "PURCHASE",
            status: "CONFIRMED",
            warehouseId: session.warehouseId,
            createdAt: { gte: fromDate, lte: toDate },
          },
        },
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { totalPrice: "desc" } },
        take: 10,
      }),
    ]);

    const totalSpend = invoices.reduce(
      (acc, inv) => acc + toNum(inv.totalAmount),
      0
    );
    const invoiceCount = invoices.length;

    const daySpan =
      (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    const useWeeks = daySpan > 31;
    const chartData = groupByPeriod(invoices, useWeeks);

    const productIds = purchaseLines.map((l) => l.productId);
    const products =
      productIds.length > 0
        ? await db.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, sku: true },
          })
        : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const tableRows = purchaseLines.map((line) => {
      const product = productMap.get(line.productId);
      return {
        product: product?.name ?? "Unknown",
        sku: product?.sku ?? "—",
        qty: fmtNumber(Math.round(toNum(line._sum.quantity))),
        spend: fmtMoney(toNum(line._sum.totalPrice)),
      };
    });

    purchasesContent = (
      <>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <StatCard label={t.reports.stats.totalSpend} value={fmtMoney(totalSpend)} />
          <StatCard
            label={t.reports.stats.invoiceCount}
            value={fmtNumber(invoiceCount)}
            sub={t.reports.stats.confirmedPurchaseInvoices}
          />
          <StatCard
            label={t.reports.stats.avgPerInvoice}
            value={invoiceCount > 0 ? fmtMoney(totalSpend / invoiceCount) : "$0.00"}
          />
        </div>

        <SectionCard title={useWeeks ? t.reports.chart.spendByWeek : t.reports.chart.spendByDay}>
          <Suspense fallback={null}>
            <SalesChart
              data={chartData}
              label={t.reports.chart.spend}
              color="#f59e0b"
            />
          </Suspense>
        </SectionCard>

        <DataTable
          columns={[
            { key: "product", label: t.reports.table.product },
            { key: "sku", label: t.reports.table.sku },
            { key: "qty", label: t.reports.table.qtyPurchased, align: "right" },
            { key: "spend", label: t.reports.table.spend, align: "right" },
          ]}
          rows={tableRows}
          exportUrl={exportUrl}
          emptyMessage={t.reports.table.noPurchasesInPeriod}
        />
      </>
    );
  }

  // ─── Profit Tab ────────────────────────────────────────────────────────────
  let profitContent: React.ReactNode = null;
  if (tab === "profit") {
    const [salesInvoices, purchaseInvoices, salesLinesByProduct, purchaseLinesByProduct] =
      await Promise.all([
        db.invoice.findMany({
          where: {
            type: "SALE",
            status: "CONFIRMED",
            warehouseId: session.warehouseId,
            createdAt: { gte: fromDate, lte: toDate },
          },
          select: { totalAmount: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
        db.invoice.findMany({
          where: {
            type: "PURCHASE",
            status: "CONFIRMED",
            warehouseId: session.warehouseId,
            createdAt: { gte: fromDate, lte: toDate },
          },
          select: { totalAmount: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
        db.invoiceLine.groupBy({
          by: ["productId"],
          where: {
            invoice: {
              type: "SALE",
              status: "CONFIRMED",
              warehouseId: session.warehouseId,
              createdAt: { gte: fromDate, lte: toDate },
            },
          },
          _sum: { totalPrice: true },
        }),
        db.invoiceLine.groupBy({
          by: ["productId"],
          where: {
            invoice: {
              type: "PURCHASE",
              status: "CONFIRMED",
              warehouseId: session.warehouseId,
              createdAt: { gte: fromDate, lte: toDate },
            },
          },
          _sum: { totalPrice: true },
        }),
      ]);

    const totalSales = salesInvoices.reduce(
      (acc, inv) => acc + toNum(inv.totalAmount),
      0
    );
    const totalPurchases = purchaseInvoices.reduce(
      (acc, inv) => acc + toNum(inv.totalAmount),
      0
    );
    const grossProfit = totalSales - totalPurchases;
    const margin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

    // Chart: revenue vs cost by week
    const daySpan =
      (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    const useWeeks = daySpan > 14;

    const salesByPeriod = groupByPeriod(salesInvoices, useWeeks);
    const purchaseByPeriod = groupByPeriod(purchaseInvoices, useWeeks);

    // Merge into grouped chart data
    const periodMap = new Map<string, { value: number; value2: number }>();
    for (const item of salesByPeriod) {
      periodMap.set(item.date, { value: item.value, value2: 0 });
    }
    for (const item of purchaseByPeriod) {
      const existing = periodMap.get(item.date);
      if (existing) {
        existing.value2 = item.value;
      } else {
        periodMap.set(item.date, { value: 0, value2: item.value });
      }
    }
    const chartData: ChartDataPoint[] = Array.from(periodMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { value, value2 }]) => ({ date, value, value2 }));

    // Top products by profit
    const salesMap = new Map(
      salesLinesByProduct.map((l) => [l.productId, toNum(l._sum.totalPrice)])
    );
    const purchaseMap = new Map(
      purchaseLinesByProduct.map((l) => [l.productId, toNum(l._sum.totalPrice)])
    );

    const allProductIds = [
      ...new Set([...salesMap.keys(), ...purchaseMap.keys()]),
    ];
    const products =
      allProductIds.length > 0
        ? await db.product.findMany({
            where: { id: { in: allProductIds } },
            select: { id: true, name: true, sku: true },
          })
        : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    const profitRows = allProductIds
      .map((id) => {
        const sales = salesMap.get(id) ?? 0;
        const cost = purchaseMap.get(id) ?? 0;
        const profit = sales - cost;
        const product = productMap.get(id);
        return {
          product: product?.name ?? "Unknown",
          sku: product?.sku ?? "—",
          sales: fmtMoney(sales),
          cost: fmtMoney(cost),
          profit: fmtMoney(profit),
          _profit: profit,
        };
      })
      .sort((a, b) => b._profit - a._profit)
      .slice(0, 10)
      .map(({ _profit: _, ...rest }) => rest);

    profitContent = (
      <>
        <div
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "16px",
            color: "#d4a017",
            fontSize: "13px",
            lineHeight: "1.6",
          }}
        >
          {t.reports.profitDisclaimer}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <StatCard label={t.reports.stats.totalSalesRevenue} value={fmtMoney(totalSales)} />
          <StatCard label={t.reports.stats.totalPurchaseCost} value={fmtMoney(totalPurchases)} />
          <StatCard
            label={t.reports.stats.grossProfit}
            value={fmtMoney(grossProfit)}
            valueColor={grossProfit >= 0 ? "#62df7d" : "#ff4d4f"}
          />
          <StatCard
            label={t.reports.stats.grossMargin}
            value={`${margin.toFixed(1)}%`}
            valueColor={margin >= 0 ? "#62df7d" : "#ff4d4f"}
          />
        </div>

        <SectionCard title={useWeeks ? t.reports.chart.revenueVsCostByWeek : t.reports.chart.revenueVsCostByDay}>
          <Suspense fallback={null}>
            <SalesChart
              data={chartData}
              label={t.reports.chart.revenue}
              label2={t.reports.chart.cost}
              color="#0062ff"
              color2="#f59e0b"
            />
          </Suspense>
        </SectionCard>

        <DataTable
          columns={[
            { key: "product", label: t.reports.table.product },
            { key: "sku", label: t.reports.table.sku },
            { key: "sales", label: t.reports.table.salesRevenue, align: "right" },
            { key: "cost", label: t.reports.table.purchaseCost, align: "right" },
            { key: "profit", label: t.reports.table.grossProfit, align: "right" },
          ]}
          rows={profitRows}
          exportUrl={exportUrl}
          emptyMessage={t.reports.table.noDataInPeriod}
        />
      </>
    );
  }

  // ─── Stock Valuation Tab ───────────────────────────────────────────────────
  let stockContent: React.ReactNode = null;
  if (tab === "stock") {
    const [balances, purchaseLines] = await Promise.all([
      db.inventoryBalance.findMany({
        where: { warehouseId: session.warehouseId },
        include: { product: { select: { name: true, sku: true } } },
      }),
      db.invoiceLine.groupBy({
        by: ["productId"],
        where: {
          invoice: {
            type: "PURCHASE",
            status: "CONFIRMED",
            warehouseId: session.warehouseId,
          },
        },
        _sum: { quantity: true, totalPrice: true },
      }),
    ]);

    // Build avg cost map: totalPrice / quantity
    const avgCostMap = new Map<string, number>();
    for (const line of purchaseLines) {
      const qty = toNum(line._sum.quantity);
      const total = toNum(line._sum.totalPrice);
      if (qty > 0) {
        avgCostMap.set(line.productId, total / qty);
      }
    }

    const stockRows = balances
      .map((b) => {
        const qty = toNum(b.currentQuantity);
        const avgCost = avgCostMap.get(b.productId) ?? 0;
        const totalValue = qty * avgCost;
        return {
          product: b.product.name,
          sku: b.product.sku,
          qty: fmtNumber(Math.round(qty * 1000) / 1000),
          avgCost: avgCost > 0 ? fmtMoney(avgCost) : "—",
          totalValue: fmtMoney(totalValue),
          _totalValue: totalValue,
          _qty: qty,
        };
      })
      .sort((a, b) => b._totalValue - a._totalValue);

    const totalPortfolioValue = stockRows.reduce(
      (acc, r) => acc + r._totalValue,
      0
    );
    const productsWithStock = stockRows.filter((r) => r._qty > 0).length;
    const productsAtZero = stockRows.filter((r) => r._qty <= 0).length;

    const tableRows = stockRows.map(
      ({ _totalValue: _, _qty: __, ...rest }) => rest
    );

    stockContent = (
      <>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <StatCard
            label={t.reports.stats.totalPortfolioValue}
            value={fmtMoney(totalPortfolioValue)}
          />
          <StatCard
            label={t.reports.stats.productsWithStock}
            value={fmtNumber(productsWithStock)}
            sub={t.reports.stats.currentOnHand}
          />
          <StatCard
            label={t.reports.stats.productsAtZero}
            value={fmtNumber(productsAtZero)}
            valueColor={productsAtZero > 0 ? "#ff4d4f" : "#dbe2fd"}
          />
        </div>

        <DataTable
          columns={[
            { key: "product", label: t.reports.table.product },
            { key: "sku", label: t.reports.table.sku },
            { key: "qty", label: t.reports.table.currentQty, align: "right" },
            { key: "avgCost", label: t.reports.table.avgCost, align: "right" },
            { key: "totalValue", label: t.reports.table.totalValue, align: "right" },
          ]}
          rows={tableRows}
          exportUrl={exportUrl}
          emptyMessage={t.reports.table.noInventoryRecords}
        />
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", padding: "24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Page header */}
        <div style={{ marginBottom: "24px" }}>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#dbe2fd",
              margin: "0 0 4px",
            }}
          >
            {t.reports.title}
          </h1>
          <p style={{ fontSize: "13px", color: "#8c90a2", margin: 0 }}>
            {tab !== "stock"
              ? `${t.reports.showingDataFor} ${rangeLabel}`
              : t.reports.currentInventorySnapshot}
          </p>
        </div>

        {/* Other standalone reports */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          <Link
            href="/dashboard/reports/ar-aging"
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #222a3e",
              backgroundColor: "#171f33",
              color: "#8c90a2",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            {t.reports.links.arAgingReport}
          </Link>
          <Link
            href="/dashboard/reports/stock-valuation"
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #222a3e",
              backgroundColor: "#171f33",
              color: "#8c90a2",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            {t.reports.links.stockValuation}
          </Link>
          <Link
            href="/dashboard/reports/low-stock"
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #222a3e",
              backgroundColor: "#171f33",
              color: "#8c90a2",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            {t.reports.links.lowStockReport}
          </Link>
        </div>

        {/* Tabs */}
        <Suspense fallback={null}>
          <ReportTabs activeTab={tab} />
        </Suspense>

        {/* Date range picker (hidden for stock tab) */}
        {tab !== "stock" && (
          <Suspense fallback={null}>
            <DateRangePicker
              currentFrom={fromStr}
              currentTo={toStr}
              currentPreset={preset}
            />
          </Suspense>
        )}

        {/* Tab content */}
        {tab === "sales" && salesContent}
        {tab === "purchases" && purchasesContent}
        {tab === "profit" && profitContent}
        {tab === "stock" && stockContent}
      </div>
    </div>
  );
}
