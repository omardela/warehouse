"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createWarehouseRoleAction,
  type CreateRoleActionState,
} from "./actions";

type RoleTemplateOption = {
  id: string;
  name: string;
  description: string | null;
};

export function CreateRoleForm({
  availableTemplates,
}: {
  availableTemplates: RoleTemplateOption[];
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<
    CreateRoleActionState,
    FormData
  >(createWarehouseRoleAction, null);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      router.push("/dashboard/settings/roles");
    }
  }, [state, router]);

  return (
    <form action={formAction}>
      {state && "error" in state && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: "rgba(255,180,171,0.1)",
            border: "1px solid rgba(255,180,171,0.3)",
            color: "#ffb4ab",
            fontSize: "13px",
          }}
        >
          {state.error}
        </div>
      )}

      <div style={{ marginBottom: "24px" }}>
        <label
          htmlFor="roleTemplateId"
          style={{
            display: "block",
            fontSize: "13px",
            fontWeight: 500,
            color: "#dbe2fd",
            marginBottom: "8px",
          }}
        >
          Role Template{" "}
          <span style={{ color: "#ffb4ab" }}>*</span>
        </label>

        {availableTemplates.length === 0 ? (
          <div
            style={{
              padding: "16px",
              borderRadius: "8px",
              backgroundColor: "rgba(255,180,171,0.08)",
              border: "1px solid rgba(255,180,171,0.2)",
              color: "#ffb4ab",
              fontSize: "13px",
            }}
          >
            All available role templates have already been assigned to this
            warehouse. No new templates to add.
          </div>
        ) : (
          <>
            <select
              id="roleTemplateId"
              name="roleTemplateId"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #2d3449",
                backgroundColor: "#0d1627",
                color: "#dbe2fd",
                fontSize: "13px",
                outline: "none",
                cursor: "pointer",
                appearance: "none",
                WebkitAppearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%238c90a2' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                paddingRight: "36px",
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
            >
              <option value="" style={{ color: "#8c90a2" }}>
                Select a role template...
              </option>
              {availableTemplates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                  {tpl.description ? ` — ${tpl.description}` : ""}
                </option>
              ))}
            </select>
            <p
              style={{
                marginTop: "6px",
                fontSize: "12px",
                color: "#8c90a2",
              }}
            >
              Only templates not yet assigned to this warehouse are shown.
            </p>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="submit"
          disabled={isPending || availableTemplates.length === 0}
          style={{
            padding: "9px 20px",
            borderRadius: "8px",
            backgroundColor:
              isPending || availableTemplates.length === 0
                ? "#1a2237"
                : "#0062ff",
            color:
              isPending || availableTemplates.length === 0
                ? "#8c90a2"
                : "#fff",
            fontSize: "13px",
            fontWeight: 500,
            border: "none",
            cursor:
              isPending || availableTemplates.length === 0
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isPending ? "Creating..." : "Create Role"}
        </button>
        <a
          href="/dashboard/settings/roles"
          style={{
            padding: "9px 20px",
            borderRadius: "8px",
            border: "1px solid #2d3449",
            color: "#8c90a2",
            fontSize: "13px",
            fontWeight: 500,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
