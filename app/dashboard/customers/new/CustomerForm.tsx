"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CustomerActionState } from "../actions";
import { useTranslations } from "@/providers/locale-context";

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
    paymentTerms?: string;
    creditLimit?: string;
  };
  archiveButton?: React.ReactNode;
  /** When true, renders only the card body without the outer page chrome */
  embedded?: boolean;
}

function Label({ htmlFor, children, required, optional, optionalLabel }: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  optionalLabel?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#c2c6d9", marginBottom: "6px" }}
    >
      {children}
      {required && <span style={{ color: "#ffb4ab", marginInlineStart: "2px" }}>*</span>}
      {optional && <span style={{ color: "#4a5068", fontSize: "11px", marginInlineStart: "4px" }}>({optionalLabel})</span>}
    </label>
  );
}

function Input({
  id, name, type = "text", defaultValue, placeholder, required, min, step,
}: {
  id: string; name: string; type?: string; defaultValue?: string;
  placeholder?: string; required?: boolean; min?: string | number; step?: string | number;
}) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      required={required}
      min={min}
      step={step}
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

function Select({
  id, name, defaultValue, children,
}: {
  id: string; name: string; defaultValue?: string; children: React.ReactNode;
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue ?? ""}
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
        appearance: "none",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "#0062ff";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "#2d3449";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {children}
    </select>
  );
}

export function CustomerForm({ mode, action, initialValues = {}, archiveButton, embedded }: CustomerFormProps) {
  const router = useRouter();
  const t = useTranslations();

  const PAYMENT_TERMS_OPTIONS: { value: string; label: string }[] = [
    { value: "", label: t.customers.form.paymentTermsNotSet },
    { value: "COD", label: t.customers.form.paymentTermsCod },
    { value: "NET_15", label: t.customers.form.paymentTermsNet15 },
    { value: "NET_30", label: t.customers.form.paymentTermsNet30 },
    { value: "NET_60", label: t.customers.form.paymentTermsNet60 },
    { value: "NET_90", label: t.customers.form.paymentTermsNet90 },
  ];

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
              {embedded ? t.customers.form.sectionTitleEmbedded : t.customers.form.sectionTitleCreate}
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <Label htmlFor="name" required>{t.customers.form.fullNameLabel}</Label>
              <Input id="name" name="name" defaultValue={initialValues.name} placeholder={t.customers.form.fullNamePlaceholder} required />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <Label htmlFor="email" optional optionalLabel={t.common.optional}>{t.common.email}</Label>
                <Input id="email" name="email" type="email" defaultValue={initialValues.email ?? ""} placeholder={t.customers.form.emailPlaceholder} />
              </div>
              <div>
                <Label htmlFor="phone" optional optionalLabel={t.common.optional}>{t.common.phone}</Label>
                <Input id="phone" name="phone" type="tel" defaultValue={initialValues.phone ?? ""} placeholder={t.customers.form.phonePlaceholder} />
              </div>
            </div>

            <div>
              <Label htmlFor="address" optional optionalLabel={t.common.optional}>{t.common.address}</Label>
              <textarea
                id="address"
                name="address"
                defaultValue={initialValues.address ?? ""}
                placeholder={t.customers.form.addressPlaceholder}
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <Label htmlFor="paymentTerms" optional optionalLabel={t.common.optional}>{t.customers.form.paymentTermsLabel}</Label>
                <Select id="paymentTerms" name="paymentTerms" defaultValue={initialValues.paymentTerms ?? ""}>
                  {PAYMENT_TERMS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="creditLimit" optional optionalLabel={t.common.optional}>{t.customers.form.creditLimitLabel}</Label>
                <Input
                  id="creditLimit"
                  name="creditLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={initialValues.creditLimit ?? ""}
                  placeholder={t.customers.form.creditLimitPlaceholder}
                />
              </div>
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
            {pending ? t.customers.form.saving : mode === "create" ? t.customers.form.saveCustomer : t.customers.form.saveChanges}
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
              {t.common.cancel}
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
              <a href="/dashboard/customers" style={{ color: "#8c90a2", textDecoration: "none", fontSize: "13px" }}>{t.customers.form.breadcrumb}</a>
              <span style={{ color: "#4a5068" }}>/</span>
              <span style={{ color: "#8c90a2", fontSize: "13px" }}>{mode === "create" ? t.customers.form.newCrumb : t.customers.form.editCrumb}</span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
              {mode === "create" ? t.customers.form.newTitle : t.customers.form.editTitle}
            </h1>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {archiveButton}
            <a
              href="/dashboard/customers"
              style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #2d3449", color: "#8c90a2", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}
            >
              {t.common.cancel}
            </a>
          </div>
        </div>
        {formBody}
      </div>
    </div>
  );
}
