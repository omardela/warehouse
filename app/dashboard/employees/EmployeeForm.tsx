"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createEmployeeAction,
  type EmployeeActionState,
} from "./actions";

type RoleOption = {
  id: string;
  name: string;
};

interface EmployeeFormProps {
  roles: RoleOption[];
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 36px 9px 12px",
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
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "#0d1627",
  border: "1px solid #2d3449",
  borderRadius: "8px",
  color: "#dbe2fd",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 500,
  color: "#c2c6d9",
  marginBottom: "6px",
};

function onFocusField(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "#0062ff";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)";
}

function onBlurField(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "#2d3449";
  e.currentTarget.style.boxShadow = "none";
}

export function EmployeeForm({ roles }: EmployeeFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<
    EmployeeActionState,
    FormData
  >(createEmployeeAction, null);

  useEffect(() => {
    if (state && "success" in state && "employeeId" in state) {
      router.push(`/dashboard/employees/${state.employeeId}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Error */}
      {state && "error" in state && (
        <div
          style={{
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

      {/* Basic Information */}
      <div
        style={{
          backgroundColor: "#171f33",
          border: "1px solid #222a3e",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#dbe2fd",
            margin: "0 0 20px",
            paddingBottom: "12px",
            borderBottom: "1px solid #222a3e",
          }}
        >
          Basic Information
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label htmlFor="name" style={labelStyle}>
              Full Name <span style={{ color: "#ffb4ab" }}>*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={100}
              placeholder="e.g. John Smith"
              style={inputStyle}
              onFocus={onFocusField}
              onBlur={onBlurField}
            />
          </div>
          <div>
            <label htmlFor="email" style={labelStyle}>
              Email Address <span style={{ color: "#ffb4ab" }}>*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              maxLength={255}
              placeholder="e.g. john.smith@company.com"
              style={inputStyle}
              onFocus={onFocusField}
              onBlur={onBlurField}
            />
          </div>
        </div>
      </div>

      {/* Access & Permissions */}
      <div
        style={{
          backgroundColor: "#171f33",
          border: "1px solid #222a3e",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#dbe2fd",
            margin: "0 0 20px",
            paddingBottom: "12px",
            borderBottom: "1px solid #222a3e",
          }}
        >
          Access &amp; Permissions
        </h2>
        <div>
          <label htmlFor="warehouseRoleId" style={labelStyle}>
            Role{" "}
            <span style={{ fontSize: "12px", color: "#8c90a2", fontWeight: 400 }}>
              (optional)
            </span>
          </label>
          <select
            id="warehouseRoleId"
            name="warehouseRoleId"
            style={selectStyle}
            onFocus={onFocusField}
            onBlur={onBlurField}
          >
            <option value="">No role assigned</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <p style={{ marginTop: "6px", fontSize: "12px", color: "#4a5068" }}>
            Only roles configured for this warehouse are shown. You can change
            this later.
          </p>
        </div>
      </div>

      {/* Security */}
      <div
        style={{
          backgroundColor: "#171f33",
          border: "1px solid #222a3e",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#dbe2fd",
            margin: "0 0 20px",
            paddingBottom: "12px",
            borderBottom: "1px solid #222a3e",
          }}
        >
          Security
        </h2>
        <div>
          <label htmlFor="password" style={labelStyle}>
            Temporary Password <span style={{ color: "#ffb4ab" }}>*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            placeholder="Minimum 8 characters"
            style={inputStyle}
            onFocus={onFocusField}
            onBlur={onBlurField}
          />
          <p style={{ marginTop: "6px", fontSize: "12px", color: "#4a5068" }}>
            The employee should change this password on first login.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: "9px 22px",
            borderRadius: "8px",
            backgroundColor: isPending ? "#1a2237" : "#0062ff",
            color: isPending ? "#8c90a2" : "#fff",
            fontSize: "13px",
            fontWeight: 500,
            border: "none",
            cursor: isPending ? "not-allowed" : "pointer",
          }}
        >
          {isPending ? "Creating..." : "Create Employee"}
        </button>
        <a
          href="/dashboard/employees"
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
