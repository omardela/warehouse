"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { SupplierActionState } from "../actions";

type SupplierFormProps = {
  mode: "create" | "edit";
  action: (state: SupplierActionState, formData: FormData) => Promise<SupplierActionState>;
  initialValues?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  archiveButton?: React.ReactNode;
};

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  error,
  multiline,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  multiline?: boolean;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    background: "#0d1627",
    border: `1px solid ${error ? "#ffb4ab" : "#2d3449"}`,
    borderRadius: "8px",
    color: "#dbe2fd",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    resize: multiline ? "vertical" : undefined,
  };

  return (
    <div>
      <label
        htmlFor={name}
        style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#c2c6d9", marginBottom: "6px" }}
      >
        {label}
        {required && <span style={{ color: "#ffb4ab", marginLeft: "2px" }}>*</span>}
        {!required && <span style={{ color: "#4a5068", fontSize: "11px", marginLeft: "4px" }}>(optional)</span>}
      </label>
      {multiline ? (
        <textarea
          id={name}
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={3}
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = error ? "#ffb4ab" : "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = error ? "#ffb4ab" : "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
        />
      )}
      {error && <p style={{ fontSize: "12px", color: "#ffb4ab", marginTop: "4px" }}>{error}</p>}
    </div>
  );
}

export function SupplierForm({ mode, action, initialValues = {}, archiveButton }: SupplierFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SupplierActionState, FormData>(
    action as (s: SupplierActionState, fd: FormData) => Promise<SupplierActionState>,
    null
  );

  useEffect(() => {
    if (state && "success" in state) {
      if (state.supplierId) {
        router.push(`/dashboard/suppliers/${state.supplierId}`);
      } else {
        router.push("/dashboard/suppliers");
      }
    }
  }, [state, router]);

  const fieldError = (field: string) =>
    state && "fieldErrors" in state ? state.fieldErrors?.[field]?.[0] : undefined;

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <a href="/dashboard/suppliers" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>Suppliers</a>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#8c90a2", fontSize: "13px" }}>{mode === "create" ? "New Supplier" : "Edit Supplier"}</span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
              {mode === "create" ? "Add New Supplier" : "Edit Supplier"}
            </h1>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {archiveButton}
            <a href="/dashboard/suppliers" style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
              Cancel
            </a>
          </div>
        </div>

        {state && "error" in state && (
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(147,0,10,0.15)", border: "1px solid rgba(147,0,10,0.3)", color: "#ffb4ab", fontSize: "13px", marginBottom: "16px" }}>
            {state.error}
          </div>
        )}

        <form action={formAction}>
          {mode === "edit" && initialValues.id && (
            <input type="hidden" name="supplierId" value={initialValues.id} />
          )}

          <div
            style={{
              background: "#171f33",
              border: "1px solid #222a3e",
              borderRadius: "10px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "12px", borderBottom: "1px solid #222a3e" }}>
              <span style={{ color: "#0062ff", display: "flex" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M2 13c0-2.761 2.686-5 6-5s6 2.239 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#dbe2fd", margin: 0 }}>Supplier Details</h2>
            </div>

            <Field
              label="Supplier Name"
              name="name"
              defaultValue={initialValues.name}
              placeholder="e.g. Global Parts Foundry Ltd."
              required
              error={fieldError("name")}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Field
                label="Email"
                name="email"
                type="email"
                defaultValue={initialValues.email ?? ""}
                placeholder="supplier@example.com"
                error={fieldError("email")}
              />
              <Field
                label="Phone"
                name="phone"
                type="tel"
                defaultValue={initialValues.phone ?? ""}
                placeholder="+1 (555) 000-0000"
                error={fieldError("phone")}
              />
            </div>

            <Field
              label="Address"
              name="address"
              defaultValue={initialValues.address ?? ""}
              placeholder="123 Main St, City, Country"
              multiline
              error={fieldError("address")}
            />
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "20px" }}>
            <button
              type="submit"
              disabled={pending}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                background: pending ? "#0044b8" : "#0062ff",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                border: "none",
                cursor: pending ? "not-allowed" : "pointer",
                opacity: pending ? 0.8 : 1,
              }}
            >
              {pending ? "Saving…" : mode === "create" ? "Create Supplier" : "Save Changes"}
            </button>
            <a href="/dashboard/suppliers" style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}>
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
