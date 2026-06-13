"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { SupplierActionState } from "../actions";

interface SupplierEditFormProps {
  supplierId: string;
  initialValues: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  action: (state: SupplierActionState, formData: FormData) => Promise<SupplierActionState>;
}

export function SupplierEditForm({ supplierId, initialValues, action }: SupplierEditFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SupplierActionState, FormData>(
    action as (s: SupplierActionState, fd: FormData) => Promise<SupplierActionState>,
    null
  );

  useEffect(() => {
    if (state && "success" in state) {
      router.refresh();
    }
  }, [state, router]);

  const fieldError = (field: string) =>
    state && "fieldErrors" in state ? state.fieldErrors?.[field]?.[0] : undefined;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    background: "#0d1627",
    border: "1px solid #2d3449",
    borderRadius: "8px",
    color: "#dbe2fd",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: 500,
    color: "#c2c6d9",
    marginBottom: "6px",
  };

  return (
    <div style={{ background: "#171f33", border: "1px solid #222a3e", borderRadius: "10px", padding: "20px" }}>
      <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#dbe2fd", margin: "0 0 16px", paddingBottom: "12px", borderBottom: "1px solid #222a3e" }}>
        Supplier Details
      </h2>

      {state && "success" in state && (
        <div style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(98,223,125,0.1)", border: "1px solid rgba(98,223,125,0.2)", color: "#62df7d", fontSize: "13px", marginBottom: "16px" }}>
          Changes saved successfully.
        </div>
      )}

      {state && "error" in state && (
        <div style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(147,0,10,0.15)", border: "1px solid rgba(147,0,10,0.3)", color: "#ffb4ab", fontSize: "13px", marginBottom: "16px" }}>
          {state.error}
        </div>
      )}

      <form action={formAction}>
        <input type="hidden" name="supplierId" value={supplierId} />

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label htmlFor="name" style={labelStyle}>
              Name <span style={{ color: "#ffb4ab", marginLeft: "2px" }}>*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={initialValues.name}
              placeholder="Supplier name"
              required
              style={{ ...inputStyle, borderColor: fieldError("name") ? "#ffb4ab" : "#2d3449" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = fieldError("name") ? "#ffb4ab" : "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
            />
            {fieldError("name") && <p style={{ fontSize: "12px", color: "#ffb4ab", marginTop: "4px" }}>{fieldError("name")}</p>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label htmlFor="email" style={labelStyle}>
                Email <span style={{ color: "#4a5068", fontSize: "11px", marginLeft: "4px" }}>(optional)</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={initialValues.email}
                placeholder="supplier@example.com"
                style={{ ...inputStyle, borderColor: fieldError("email") ? "#ffb4ab" : "#2d3449" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = fieldError("email") ? "#ffb4ab" : "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
              />
              {fieldError("email") && <p style={{ fontSize: "12px", color: "#ffb4ab", marginTop: "4px" }}>{fieldError("email")}</p>}
            </div>
            <div>
              <label htmlFor="phone" style={labelStyle}>
                Phone <span style={{ color: "#4a5068", fontSize: "11px", marginLeft: "4px" }}>(optional)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={initialValues.phone}
                placeholder="+1 (555) 000-0000"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="address" style={labelStyle}>
              Address <span style={{ color: "#4a5068", fontSize: "11px", marginLeft: "4px" }}>(optional)</span>
            </label>
            <textarea
              id="address"
              name="address"
              defaultValue={initialValues.address}
              placeholder="123 Main St, City, Country"
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#0062ff"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#2d3449"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={pending}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                background: pending ? "#0044b8" : "#0062ff",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                cursor: pending ? "not-allowed" : "pointer",
                opacity: pending ? 0.8 : 1,
              }}
            >
              {pending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
