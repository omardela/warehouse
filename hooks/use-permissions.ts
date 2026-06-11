"use client";

import { useWarehouseContext } from "@/providers/warehouse-context";

export function usePermissions(): string[] {
  return useWarehouseContext().permissions;
}

export function useHasPermission(code: string): boolean {
  return usePermissions().includes(code);
}
