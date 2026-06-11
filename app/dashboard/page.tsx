import { getSession } from "@/core/auth/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function StatCard({
  label,
  value,
  description,
  accent,
}: {
  label: string;
  value: string | number;
  description?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "#171f33",
        border: "1px solid #222a3e",
        borderRadius: "10px",
        padding: "20px 24px",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 500,
          color: "#8c90a2",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "10px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "32px",
          fontWeight: 700,
          color: accent ?? "#dbe2fd",
          lineHeight: 1.1,
          marginBottom: "4px",
        }}
      >
        {value}
      </div>
      {description && (
        <div style={{ fontSize: "12px", color: "#8c90a2", marginTop: "4px" }}>
          {description}
        </div>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Fetch employee name for greeting
  const employee = await db.employee.findUnique({
    where: { id: session.employeeId },
    select: { name: true },
  });

  // KPI 1: Total products (org-wide, not archived)
  const totalProducts = await db.product.count({
    where: {
      organizationId: session.orgId,
      archivedAt: null,
    },
  });

  // KPI 2: Low stock items (currentQuantity < 10 in this warehouse)
  const lowStockItems = await db.inventoryBalance.count({
    where: {
      warehouseId: session.warehouseId,
      currentQuantity: { lt: 10 },
    },
  });

  // KPI 3: Pending (DRAFT) invoices for this warehouse
  const pendingInvoices = await db.invoice.count({
    where: {
      warehouseId: session.warehouseId,
      status: "DRAFT",
    },
  });

  const greeting = getGreeting();
  const firstName = employee?.name?.split(" ")[0] ?? "there";

  return (
    <div style={{ maxWidth: "1200px" }}>
      {/* Greeting card */}
      <div
        style={{
          backgroundColor: "#171f33",
          border: "1px solid #222a3e",
          borderRadius: "10px",
          padding: "24px 28px",
          marginBottom: "24px",
          background:
            "linear-gradient(135deg, #171f33 0%, #0d1627 100%)",
          borderLeft: "3px solid #0062ff",
        }}
      >
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 600,
            color: "#dbe2fd",
            margin: "0 0 6px",
            letterSpacing: "-0.01em",
          }}
        >
          {greeting}, {firstName}!
        </h1>
        <p style={{ fontSize: "14px", color: "#8c90a2", margin: 0 }}>
          Here&apos;s a summary of your warehouse activity.
        </p>
      </div>

      {/* KPI stat cards */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <StatCard
          label="Total Products"
          value={totalProducts.toLocaleString()}
          description="Active products in catalogue"
        />
        <StatCard
          label="Low Stock Items"
          value={lowStockItems.toLocaleString()}
          description="Below 10 units in this warehouse"
          accent={lowStockItems > 0 ? "#f59e0b" : "#dbe2fd"}
        />
        <StatCard
          label="Pending Invoices"
          value={pendingInvoices.toLocaleString()}
          description="Draft invoices awaiting confirmation"
          accent={pendingInvoices > 0 ? "#0062ff" : "#dbe2fd"}
        />
      </div>

      {/* Chart placeholder */}
      <div
        style={{
          backgroundColor: "#171f33",
          border: "1px solid #222a3e",
          borderRadius: "10px",
          padding: "24px",
          minHeight: "240px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#dbe2fd" }}>
          Activity Overview
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "8px",
            border: "1px dashed #2d3449",
            minHeight: "180px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              style={{ margin: "0 auto 10px", display: "block", opacity: 0.4 }}
            >
              <rect x="4" y="28" width="6" height="8" rx="1" fill="#8c90a2" />
              <rect x="13" y="20" width="6" height="16" rx="1" fill="#8c90a2" />
              <rect x="22" y="12" width="6" height="24" rx="1" fill="#8c90a2" />
              <rect x="31" y="16" width="6" height="20" rx="1" fill="#8c90a2" />
            </svg>
            <p style={{ fontSize: "13px", color: "#8c90a2", margin: 0 }}>
              Chart coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
