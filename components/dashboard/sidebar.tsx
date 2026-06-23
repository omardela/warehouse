"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { hasPermission } from "@/core/auth/permissions";
import { useWarehouseContext } from "@/providers/warehouse-context";
import { useTranslations } from "@/providers/locale-context";

// ── Icons ────────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="9" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconProducts() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 5.5L8 2.5L14 5.5V10.5L8 13.5L2 10.5V5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 2.5V13.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 5.5L14 5.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconInventory() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 3.5V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 3.5V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.5 7.5H11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.5 9.5H8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconSales() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 11.5L5.5 7.5L8.5 9.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.5 4.5H13V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPurchases() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1.5 2H3L5 10H12.5L14 5H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="5.5" cy="12.5" r="1" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11.5" cy="12.5" r="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconCustomers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 13.5C2.5 11.015 5 9 8 9C11 9 13.5 11.015 13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconSuppliers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="6" width="9" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 9.5H12.5C13.052 9.5 13.5 9.948 13.5 10.5V14H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4.5 6V4C4.5 2.895 5.395 2 6.5 2H8.5C9.605 2 10.5 2.895 10.5 4V6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconEmployees() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 14C1 11.239 3.239 9 6 9C8.761 9 11 11.239 11 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 7.5L13.5 9L15.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconWarehouses() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1.5 14V7L8 2.5L14.5 7V14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="5.5" y="9" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconReports() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.5" y="1.5" width="11" height="13" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 5.5H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 8H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 10.5H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconAuditLogs() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5C4.41 1.5 1.5 4.41 1.5 8C1.5 11.59 4.41 14.5 8 14.5C11.59 14.5 14.5 11.59 14.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 4.5V8L10.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 1.5L13.5 4L11 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconRoles() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1.5V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 13V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M1.5 8H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 8H14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3.4 3.4L4.46 4.46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.54 11.54L12.6 12.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12.6 3.4L11.54 4.46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.46 11.54L3.4 12.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconMovements() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 5H11.5M11.5 5L8.5 2M11.5 5L8.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 11H4.5M4.5 11L7.5 8M4.5 11L7.5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTransfers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9.5" y="8.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 5H10.5C11.328 5 12 5.672 12 6.5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9.5 11H5.5C4.672 11 4 10.328 4 9.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.5 4L12 5.5L10.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 9L4 10.5L5.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconAdjustment() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 6V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 8H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconNotifications() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5C5.79 1.5 4 3.29 4 5.5V9L2.5 11H13.5L12 9V5.5C12 3.29 10.21 1.5 8 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6.5 11C6.5 12.105 7.21 13 8 13C8.79 13 9.5 12.105 9.5 11" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconPos() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="5" width="13" height="9.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 5V3.5C5 2.672 5.672 2 6.5 2H9.5C10.328 2 11 2.672 11 3.5V5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.5 8.5L11.5 9.5L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6.5 2H9.5L10 4.5C10.55 4.75 11.05 5.1 11.45 5.55L13.85 4.85L15.35 7.15L13.5 8.75C13.55 9 13.55 9.25 13.5 9.5L15.35 11.1L13.85 13.4L11.45 12.7C11.05 13.15 10.55 13.5 10 13.75L9.5 16.25H6.5L6 13.75C5.45 13.5 4.95 13.15 4.55 12.7L2.15 13.4L0.65 11.1L2.5 9.5C2.45 9.25 2.45 9 2.5 8.75L0.65 7.15L2.15 4.85L4.55 5.55C4.95 5.1 5.45 4.75 6 4.5L6.5 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="8" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// ── Nav data ─────────────────────────────────────────────────────────────────

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission: string | null;
};

type NavGroup = {
  heading: string;
  items: NavItem[];
};

function buildNavGroups(t: ReturnType<typeof useTranslations>): NavGroup[] {
  return [
    {
      heading: t.sidebar.groups.dashboard,
      items: [
        { label: t.sidebar.items.overview, href: "/dashboard", icon: <IconDashboard />, permission: null },
        { label: t.sidebar.items.notifications, href: "/dashboard/notifications", icon: <IconNotifications />, permission: null },
      ],
    },
    {
      heading: t.sidebar.groups.catalog,
      items: [
        { label: t.sidebar.items.products, href: "/dashboard/products", icon: <IconProducts />, permission: "inventory.product.read" },
      ],
    },
    {
      heading: t.sidebar.groups.inventory,
      items: [
        { label: t.sidebar.items.stockLevels, href: "/dashboard/inventory/stock",       icon: <IconInventory />,  permission: "inventory.balance.read" },
        { label: t.sidebar.items.movements,    href: "/dashboard/inventory/movements",   icon: <IconMovements />,  permission: "inventory.balance.read" },
        { label: t.sidebar.items.adjustments,  href: "/dashboard/inventory/adjustments", icon: <IconAdjustment />, permission: "inventory.movement.create" },
        { label: t.sidebar.items.transfers,    href: "/dashboard/inventory/transfers",   icon: <IconTransfers />,  permission: "inventory.transfers.view" },
      ],
    },
    {
      heading: t.sidebar.groups.sales,
      items: [
        { label: t.sidebar.items.salesInvoices, href: "/dashboard/sales",        icon: <IconSales />,     permission: "sales.invoice.read" },
        { label: t.sidebar.items.salesOrders,   href: "/dashboard/sales/orders", icon: <IconSales />,     permission: "sales.orders.view" },
        { label: t.sidebar.items.salesCreditNotes, href: "/dashboard/sales/credit-notes", icon: <IconSales />, permission: "sales.creditnotes.view" },
        { label: t.sidebar.items.customers,      href: "/dashboard/customers",    icon: <IconCustomers />, permission: "customers.customer.read" },
      ],
    },
    {
      heading: t.sidebar.groups.purchases,
      items: [
        { label: t.sidebar.items.purchaseInvoices, href: "/dashboard/purchases",        icon: <IconPurchases />, permission: "purchase.invoice.read" },
        { label: t.sidebar.items.purchaseOrders,   href: "/dashboard/purchases/orders", icon: <IconPurchases />, permission: "purchases.orders.view" },
        { label: t.sidebar.items.creditNotes,      href: "/dashboard/purchases/credit-notes", icon: <IconPurchases />, permission: "purchases.creditnotes.view" },
        { label: t.sidebar.items.suppliers,         href: "/dashboard/suppliers",        icon: <IconSuppliers />, permission: "suppliers.supplier.read" },
      ],
    },
    {
      heading: t.sidebar.groups.administration,
      items: [
        { label: t.sidebar.items.employees, href: "/dashboard/employees",      icon: <IconEmployees />, permission: "employees.employee.read" },
        { label: t.sidebar.items.roles,     href: "/dashboard/settings/roles", icon: <IconRoles />,     permission: "roles.role.read" },
        { label: t.sidebar.items.auditLog, href: "/dashboard/audit",          icon: <IconAuditLogs />, permission: "audit.log.read" },
      ],
    },
    {
      heading: t.sidebar.groups.reports,
      items: [
        { label: t.sidebar.items.reports, href: "/dashboard/reports", icon: <IconReports />, permission: "reports.report.read" },
      ],
    },
    {
      heading: t.sidebar.groups.pos,
      items: [
        { label: t.sidebar.items.posTerminal, href: "/pos", icon: <IconPos />, permission: "pos.sales.create" },
      ],
    },
    {
      heading: t.sidebar.groups.settings,
      items: [
        { label: t.sidebar.items.organization, href: "/dashboard/settings/organization", icon: <IconSettings />,   permission: "settings.org.read" },
        { label: t.sidebar.items.warehouses,   href: "/dashboard/settings/warehouses",   icon: <IconWarehouses />, permission: "settings.warehouse.read" },
        { label: t.sidebar.items.preferences,  href: "/dashboard/settings/preferences",  icon: <IconSettings />,   permission: null },
      ],
    },
  ];
}

// ── SidebarContent ────────────────────────────────────────────────────────────

function SidebarContent({
  permissions,
  employeeName,
  employeeEmail,
  onNav,
}: {
  permissions: string[];
  employeeName: string;
  employeeEmail: string;
  onNav?: () => void;
}) {
  const pathname = usePathname();
  const t = useTranslations();
  const navGroups = buildNavGroups(t);

  const visibleGroups = navGroups.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => item.permission === null || hasPermission(permissions, item.permission)
    ),
  })).filter((group) => group.items.length > 0);

  const activeHref = visibleGroups
    .flatMap((group) => group.items)
    .map((item) => item.href)
    .filter((href) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/")))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#0b1326",
        width: "240px",
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "20px 16px 16px",
          borderBottom: "1px solid #222a3e",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "34px",
            height: "34px",
            borderRadius: "9px",
            backgroundColor: "#0062ff",
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <rect x="2" y="8" width="14" height="8" rx="1.5" fill="white" opacity="0.9" />
            <rect x="5" y="2" width="8" height="7" rx="1.5" fill="white" />
            <rect x="7.5" y="4.5" width="3" height="3" rx="0.5" fill="#0062ff" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 600, color: "#dbe2fd", lineHeight: 1.2 }}>
            {t.common.appName}
          </div>
          <div style={{ fontSize: "11px", color: "#8c90a2", marginTop: "2px" }}>
            {t.sidebar.brandTagline}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav
        style={{ flex: 1, overflowY: "auto", padding: "8px" }}
        aria-label="Main navigation"
      >
        {visibleGroups.map((group, gi) => (
          <div key={group.heading} style={{ marginBottom: gi < visibleGroups.length - 1 ? "8px" : 0 }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#4a5068",
                padding: "6px 10px 4px",
              }}
            >
              {group.heading}
            </div>
            {group.items.map((item) => {
              const isActive = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNav}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    marginBottom: "2px",
                    fontSize: "13px",
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? "#dbe2fd" : "#8c90a2",
                    backgroundColor: isActive ? "#1a2237" : "transparent",
                    borderInlineStart: isActive ? "2px solid #0062ff" : "2px solid transparent",
                    textDecoration: "none",
                    transition: "background-color 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "#171f33";
                      (e.currentTarget as HTMLElement).style.color = "#c2c6d9";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "#8c90a2";
                    }
                  }}
                >
                  <span style={{ flexShrink: 0, display: "flex" }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: "1px solid #222a3e", padding: "12px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#0062ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 600,
              color: "white",
              flexShrink: 0,
            }}
          >
            {employeeName.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#dbe2fd",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {employeeName}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#8c90a2",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {employeeEmail}
            </div>
          </div>
          <a
            href="/logout"
            title={t.common.signOut}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#8c90a2", flexShrink: 0 }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#dbe2fd")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#8c90a2")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 14H3C2.448 14 2 13.552 2 13V3C2 2.448 2.448 2 3 2H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10.5 11L14 8L10.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar (exported) ────────────────────────────────────────────────────────

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { permissions, employeeName, employeeEmail } = useWarehouseContext();

  return (
    <>
      {/* Desktop: always visible, participates in flex layout */}
      <div
        className="hidden lg:flex"
        style={{ height: "100vh", position: "sticky", top: 0, flexShrink: 0 }}
      >
        <SidebarContent
          permissions={permissions}
          employeeName={employeeName}
          employeeEmail={employeeEmail}
        />
      </div>

      {/* Mobile/tablet: full-screen drawer, only below lg */}
      {isOpen && (
        <div
          className="lg:hidden"
          style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex" }}
        >
          {/* Backdrop */}
          <div
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)" }}
            onClick={onClose}
          />
          {/* Drawer panel */}
          <div style={{ position: "relative", zIndex: 1, height: "100%" }}>
            <SidebarContent
              permissions={permissions}
              employeeName={employeeName}
              employeeEmail={employeeEmail}
              onNav={onClose}
            />
          </div>
        </div>
      )}
    </>
  );
}
