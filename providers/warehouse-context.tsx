"use client";

import { createContext, useContext } from "react";
import type { SessionPayload } from "@/core/auth/session";

export type AvailableWarehouse = { id: string; name: string };

export type WarehouseContextValue = {
  session: SessionPayload;
  permissions: string[];
  employeeName: string;
  employeeEmail: string;
  warehouseName: string;
  availableWarehouses: AvailableWarehouse[];
};

const WarehouseContext = createContext<WarehouseContextValue | null>(null);

export function WarehouseProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: WarehouseContextValue;
}) {
  return (
    <WarehouseContext.Provider value={value}>
      {children}
    </WarehouseContext.Provider>
  );
}

export function useWarehouseContext(): WarehouseContextValue {
  const ctx = useContext(WarehouseContext);
  if (!ctx) {
    throw new Error("useWarehouseContext must be used within a WarehouseProvider");
  }
  return ctx;
}
