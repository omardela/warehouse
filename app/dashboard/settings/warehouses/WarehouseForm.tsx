"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createWarehouseAction,
  updateWarehouseAction,
  type WarehouseActionState,
} from "./actions";

interface WarehouseFormProps {
  mode: "create" | "edit";
  warehouseId?: string;
  initialName?: string;
  initialAddress?: string;
}

export function WarehouseForm({
  mode,
  warehouseId,
  initialName = "",
  initialAddress = "",
}: WarehouseFormProps) {
  const router = useRouter();

  const action = mode === "create" ? createWarehouseAction : updateWarehouseAction;

  const [state, formAction, pending] = useActionState<
    WarehouseActionState,
    FormData
  >(action, null);

  useEffect(() => {
    if (state && "success" in state) {
      router.push("/dashboard/settings/warehouses");
    }
  }, [state, router]);

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: "#0b1326" }}
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#dbe2fd" }}>
            {mode === "create" ? "New Warehouse" : "Edit Warehouse"}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#8c90a2" }}>
            {mode === "create"
              ? "Register a new warehouse facility for your organization."
              : "Update this warehouse facility's details."}
          </p>
        </div>

        <form action={formAction} className="space-y-6">
          {/* Hidden warehouseId for edit mode */}
          {mode === "edit" && warehouseId && (
            <input type="hidden" name="warehouseId" value={warehouseId} />
          )}

          {/* Facility Details card */}
          <div
            className="rounded-lg border p-6"
            style={{ background: "#171f33", borderColor: "#222a3e" }}
          >
            <div className="mb-6 flex items-center gap-3">
              <span className="text-xl">🏢</span>
              <h2
                className="text-base font-semibold"
                style={{ color: "#dbe2fd" }}
              >
                Facility Details
              </h2>
            </div>

            <div className="space-y-5">
              {/* Facility Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="name"
                  className="block text-[13px] font-medium"
                  style={{ color: "#c2c6d9" }}
                >
                  Facility Name <span style={{ color: "#ffb4ab" }}>*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  defaultValue={initialName}
                  maxLength={100}
                  placeholder="e.g. Main Distribution Center"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none placeholder:text-[#4a5068]"
                  style={{
                    background: "#0d1627",
                    borderColor: "#2d3449",
                    color: "#dbe2fd",
                    borderRadius: "8px",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#0062ff";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(0,98,255,0.2)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#2d3449";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label
                  htmlFor="address"
                  className="block text-[13px] font-medium"
                  style={{ color: "#c2c6d9" }}
                >
                  Address{" "}
                  <span className="text-xs" style={{ color: "#8c90a2" }}>
                    (optional)
                  </span>
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  defaultValue={initialAddress}
                  maxLength={255}
                  placeholder="e.g. 123 Industrial Ave, City, Country"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none placeholder:text-[#4a5068]"
                  style={{
                    background: "#0d1627",
                    borderColor: "#2d3449",
                    color: "#dbe2fd",
                    borderRadius: "8px",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#0062ff";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(0,98,255,0.2)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#2d3449";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>
          </div>

          {/* Error message */}
          {state && "error" in state && (
            <p
              className="rounded-lg px-4 py-3 text-sm"
              style={{
                background: "rgba(147,0,10,0.15)",
                color: "#ffb4ab",
                border: "1px solid rgba(147,0,10,0.3)",
              }}
            >
              {state.error}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg px-5 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
              style={{ background: "#0062ff", borderRadius: "8px" }}
            >
              {pending
                ? "Saving…"
                : mode === "create"
                ? "Save Warehouse"
                : "Save Changes"}
            </button>
            <a
              href="/dashboard/settings/warehouses"
              className="rounded-lg px-5 py-2 text-sm font-medium transition-colors"
              style={{
                border: "1px solid #2d3449",
                color: "#8c90a2",
                borderRadius: "8px",
              }}
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
