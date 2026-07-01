import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/core/auth/session";
import { requirePermission } from "@/core/auth/require-permission";
import { db } from "@/lib/db";
import { computeOutstandingBalance } from "@/core/billing/compute-outstanding-balance";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AgingBucket = "current" | "b1_30" | "b31_60" | "b61_90" | "b90_plus";

interface OutstandingInvoiceRow {
  invoiceId: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  invoiceDate: Date | null;
  dueDate: Date | null;
  originalAmount: number;
  paidAmount: number;
  balance: number;
  daysOverdue: number;
  bucket: AgingBucket;
}

interface SupplierAgingRow {
  supplierId: string;
  supplierName: string;
  current: number;
  b1_30: number;
  b31_60: number;
  b61_90: number;
  b90_plus: number;
  total: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = Number(v.toString());
  return isNaN(n) ? 0 : n;
}

function escapeCsv(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvRow(values: (string | number | null | undefined)[]): string {
  return values.map(escapeCsv).join(",");
}

function fmtDateCsv(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().split("T")[0];
}

function daysOverdueFor(dueDate: Date | null, asOfDate: Date): number {
  if (!dueDate) return 0;
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.floor(
    (asOfDate.setHours(0, 0, 0, 0) -
      new Date(dueDate).setHours(0, 0, 0, 0)) /
      msPerDay,
  );
  return Math.max(0, diff);
}

function bucketFor(daysOverdue: number): AgingBucket {
  if (daysOverdue === 0) return "current";
  if (daysOverdue <= 30) return "b1_30";
  if (daysOverdue <= 60) return "b31_60";
  if (daysOverdue <= 90) return "b61_90";
  return "b90_plus";
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await requirePermission(session, "reports.ap.view");
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const view =
    searchParams.get("view") === "invoice" ? "invoice" : "supplier";
  const supplierIdParam = searchParams.get("supplierId") ?? "";
  const asOfParam = searchParams.get("asOf") ?? "";

  const asOfDate =
    asOfParam && !isNaN(new Date(asOfParam).getTime())
      ? new Date(asOfParam)
      : new Date();

  // Suppliers scoped to this org only — validate the filter against them.
  const suppliers = await db.supplier.findMany({
    where: { organizationId: session.orgId, archivedAt: null },
    select: { id: true },
  });
  const validSupplierIds = new Set(suppliers.map((s) => s.id));
  const effectiveSupplierId =
    supplierIdParam && validSupplierIds.has(supplierIdParam)
      ? supplierIdParam
      : "";

  const invoices = await db.invoice.findMany({
    where: {
      type: "PURCHASE",
      status: "CONFIRMED",
      warehouseId: session.warehouseId,
      supplierId: { not: null },
      ...(effectiveSupplierId ? { supplierId: effectiveSupplierId } : {}),
    },
    select: {
      id: true,
      number: true,
      supplierId: true,
      supplier: { select: { id: true, name: true } },
      totalAmount: true,
      dueDate: true,
      confirmedAt: true,
      createdAt: true,
      payments: { select: { amount: true } },
      creditNotes: {
        where: { status: "CONFIRMED" },
        include: { lines: true },
      },
    },
    orderBy: { confirmedAt: "asc" },
  });

  const outstandingRows: OutstandingInvoiceRow[] = [];

  for (const inv of invoices) {
    if (!inv.supplier) continue;
    const originalAmount = toNum(inv.totalAmount);
    const paidAmount = inv.payments.reduce(
      (acc, p) => acc + toNum(p.amount),
      0,
    );
    const balance = computeOutstandingBalance(inv);

    if (balance <= 0) continue;

    const daysOverdue = daysOverdueFor(inv.dueDate, new Date(asOfDate));
    const bucket = bucketFor(daysOverdue);

    outstandingRows.push({
      invoiceId: inv.id,
      invoiceNumber: inv.number,
      supplierId: inv.supplierId as string,
      supplierName: inv.supplier.name,
      invoiceDate: inv.confirmedAt ?? inv.createdAt,
      dueDate: inv.dueDate,
      originalAmount,
      paidAmount,
      balance,
      daysOverdue,
      bucket,
    });
  }

  const csvRows: string[] = [];

  if (view === "supplier") {
    const supplierMap = new Map<string, SupplierAgingRow>();
    for (const row of outstandingRows) {
      let agg = supplierMap.get(row.supplierId);
      if (!agg) {
        agg = {
          supplierId: row.supplierId,
          supplierName: row.supplierName,
          current: 0,
          b1_30: 0,
          b31_60: 0,
          b61_90: 0,
          b90_plus: 0,
          total: 0,
        };
        supplierMap.set(row.supplierId, agg);
      }
      if (row.bucket === "current") agg.current += row.balance;
      else if (row.bucket === "b1_30") agg.b1_30 += row.balance;
      else if (row.bucket === "b31_60") agg.b31_60 += row.balance;
      else if (row.bucket === "b61_90") agg.b61_90 += row.balance;
      else agg.b90_plus += row.balance;
      agg.total += row.balance;
    }

    const supplierRows = Array.from(supplierMap.values()).sort(
      (a, b) => b.total - a.total,
    );

    csvRows.push(
      buildCsvRow([
        "Supplier",
        "Current",
        "1-30 Days",
        "31-60 Days",
        "61-90 Days",
        "90+ Days",
        "Total Outstanding",
      ]),
    );

    let totalAll = 0;
    for (const row of supplierRows) {
      totalAll += row.total;
      csvRows.push(
        buildCsvRow([
          row.supplierName,
          row.current.toFixed(2),
          row.b1_30.toFixed(2),
          row.b31_60.toFixed(2),
          row.b61_90.toFixed(2),
          row.b90_plus.toFixed(2),
          row.total.toFixed(2),
        ]),
      );
    }
    csvRows.push(
      buildCsvRow(["", "", "", "", "", "Total", totalAll.toFixed(2)]),
    );
  } else {
    const invoiceRows = [...outstandingRows].sort(
      (a, b) => b.daysOverdue - a.daysOverdue,
    );

    csvRows.push(
      buildCsvRow([
        "Supplier",
        "Invoice #",
        "Invoice Date",
        "Due Date",
        "Original Amount",
        "Paid Amount",
        "Balance",
        "Days Overdue",
      ]),
    );

    let totalBalance = 0;
    for (const row of invoiceRows) {
      totalBalance += row.balance;
      csvRows.push(
        buildCsvRow([
          row.supplierName,
          row.invoiceNumber,
          fmtDateCsv(row.invoiceDate),
          fmtDateCsv(row.dueDate),
          row.originalAmount.toFixed(2),
          row.paidAmount.toFixed(2),
          row.balance.toFixed(2),
          row.daysOverdue,
        ]),
      );
    }
    csvRows.push(
      buildCsvRow([
        "",
        "",
        "",
        "",
        "",
        "",
        "Total",
        totalBalance.toFixed(2),
      ]),
    );
  }

  const csvContent = csvRows.join("\n");
  const filename = `ap-aging-${view}-${new Date().toISOString().split("T")[0]}`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
