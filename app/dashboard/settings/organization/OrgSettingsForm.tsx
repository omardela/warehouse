"use client";

import { useActionState } from "react";
import { updateOrganizationAction, type OrgActionState } from "./actions";
import { useTranslations } from "@/providers/locale-context";

interface OrgSettingsFormProps {
  initialName: string;
}

export function OrgSettingsForm({ initialName }: OrgSettingsFormProps) {
  const t = useTranslations().employees.organization;
  const [state, formAction, pending] = useActionState<OrgActionState, FormData>(
    updateOrganizationAction,
    null
  );

  return (
    <form action={formAction} className="space-y-6">
      {/* Section card */}
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
            {t.organizationDetails}
          </h2>
        </div>

        <div className="space-y-4">
          {/* Name field */}
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="block text-[13px] font-medium"
              style={{ color: "#c2c6d9" }}
            >
              {t.organizationName} <span style={{ color: "#ffb4ab" }}>*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={initialName}
              maxLength={100}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all focus:ring-2"
              style={
                {
                  background: "#0d1627",
                  borderColor: "#2d3449",
                  color: "#dbe2fd",
                  "--tw-ring-color": "#0062ff33",
                } as React.CSSProperties
              }
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

      {/* Feedback messages */}
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
      {state && "success" in state && (
        <p
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            background: "rgba(0,108,73,0.15)",
            color: "#62df7d",
            border: "1px solid rgba(0,108,73,0.3)",
          }}
        >
          {t.updatedSuccess}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg px-5 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
          style={{ background: "#0062ff" }}
        >
          {pending ? t.saving : t.saveChanges}
        </button>
      </div>
    </form>
  );
}
