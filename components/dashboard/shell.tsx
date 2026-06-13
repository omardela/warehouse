"use client";

import { useState } from "react";
import type { SessionPayload } from "@/core/auth/session";
import type { AvailableWarehouse } from "@/providers/warehouse-context";
import { WarehouseProvider } from "@/providers/warehouse-context";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

type DashboardShellProps = {
  children: React.ReactNode;
  session: SessionPayload;
  permissionCodes: string[];
  employeeName: string;
  employeeEmail: string;
  warehouseName: string;
  availableWarehouses: AvailableWarehouse[];
  unreadNotificationCount: number;
};

export function DashboardShell({
  children,
  session,
  permissionCodes,
  employeeName,
  employeeEmail,
  warehouseName,
  availableWarehouses,
  unreadNotificationCount,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <WarehouseProvider
      value={{
        session,
        permissions: permissionCodes,
        employeeName,
        employeeEmail,
        warehouseName,
        availableWarehouses,
      }}
    >
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          backgroundColor: "#0b1326",
        }}
      >
        <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar onMenuClick={() => setMobileOpen(true)} initialNotificationCount={unreadNotificationCount} />
          <main style={{ flex: 1, padding: "24px" }}>
            {children}
          </main>
        </div>
      </div>
    </WarehouseProvider>
  );
}
