"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CustomerActionState } from "../actions";

type CustomerFormAction = (
  prevState: CustomerActionState,
  formData: FormData
) => Promise<CustomerActionState>;

interface CustomerFormProps {
  mode: "create" | "edit";
  action: CustomerFormAction;
  initialValues?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  archiveButton?: React.ReactNode;
  /** When true, renders only the card body without the outer page chrome */
  embedded?: boolean;
}

function Label({ htmlFor, children, required, optional }: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#c2c6d9", marginBottom: "6px" }}
    >
      {children}
      {required && <span style={{ color: "#ffb4ab", marginLeft: "2px" }}>*</span>}
      {optional && <span style={{ color: "#4a5068", fontSize: "11px", marginLeft: "4px" }}>(optional)</span>}
    </label>
  );
}

function Input({
  id, name, type = "text", defaultValue, placeholder, required,
}: {
  id: string; name: string; type?: string; defaultValue?: string;
  placeholder?: string; required?: boolean;
}) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      required={required}
      style={{
        width: "100%",
        background: "#0d1627",
        border: "1px solid #2d3449",
        borderRadius: "8px",
        padding: "8px 12px",
        fontSize: "13px",
        color: "#dbe2fd",
        outline: "none",
        boxSizing: "border-box",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "#0062ff";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "#2d3449";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

export function CustomerForm({ mode, action, initialValues = {}, archiveButton, embedded }: CustomerFormProps) {
  const router = useRouter();

  const [state, formAction, pending] = useActionState<CustomerActionState, FormData>(
    action,
    null
  );

  useEffect(() => {
    if (state && "success" in state && "customerId" in state) {
      router.push(`/dashboard/customers/${(state as { customerId: string }).customerId}`);
    } else if (state && "success" in state && !embedded) {
      router.push("/dashboard/customers");
    }
  }, [state, router, embedded]);

  const formBody = (
    <>
      {state && "error" in state && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            background: "rgba(147,0,10,0.15)",
            border: "1px solid rgba(147,0,10,0.3)",
            color: "#ffb4ab",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          {state.error}
        </div>
      )}

      <form action={formAction}>
        {mode === "edit" && initialValues.id && (
          <input type="hidden" name="customerId" value={initialValues.id} />
        )}

        <div
          style={{
            background: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "10px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #222a3e" }}>
            <span style={{ color: "#0062ff", display: "flex" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2.5 13.5C2.5 11.015 5 9 8 9C11 9 13.5 11.015 13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#dbe2fd", margin: 0 }}>
              {embedded ? "Edit Details" : "Customer Information"}
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <Label htmlFor="name" required>Full Name / Company</Label>
              <Input id="name" name="name" defaultValue={initialValues.name} placeholder="e.g. TechNova Systems" required />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <Label htmlFor="email" optional>Email</Label>
                <Input id="email" name="email" type="email" defaultValue={initialValues.email ?? ""} placeholder="contact@company.com" />
              </div>
              <div>
                <Label htmlFor="phone" optional>Phone</Label>
                <Input id="phone" name="phone" type="tel" defaultValue={initialValues.phone ?? ""} placeholder="+1 (555) 000-0000" />
              </div>
            </div>

            <div>
              <Label htmlFor="address" optional>Address</Label>
              <textarea
                id="address"
                name="address"
                defaultValue={initialValues.address ?? ""}
                placeholder="Street address, city, state, zip code..."
                rows={3}
                style={{
                  width: "100%",
                  background: "#0d1627",
                  border: "1px solid #2d3449",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  color: "#dbe2fd",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#0062ff";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#2d3449";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "16px" }}>
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
            {pending ? "Saving…" : mode === "create" ? "Save Customer" : "Save Changes"}
          </button>
          {!embedded && (
            <a
              href="/dashboard/customers"
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid #2d3449",
                color: "#8c90a2",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Cancel
            </a>
          )}
        </div>
      </form>
    </>
  );

  if (embedded) {
    return formBody;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <a href="/dashboard/customers" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>Customers</a>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#8c90a2", fontSize: "13px" }}>{mode === "create" ? "New Customer" : "Edit Customer"}</span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
              {mode === "create" ? "Add New Customer" : "Edit Customer"}
            </h1>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {archiveButton}
            <a
              href="/dashboard/customers"
              style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}
            >
              Cancel
            </a>
          </div>
        </div>
        {formBody}
      </div>
    </div>
  );
}
