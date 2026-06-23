"use client";

import { useActionState } from "react";
import { updateLocaleAction, type PreferencesActionState } from "./actions";
import { useTranslations } from "@/providers/locale-context";
import type { Locale } from "@/core/i18n/locale";

const initialState: PreferencesActionState = null;

export function PreferencesForm({ currentLocale }: { currentLocale: Locale }) {
  const [state, formAction, isPending] = useActionState(updateLocaleAction, initialState);
  const t = useTranslations();

  return (
    <div
      style={{
        background: "#171f33",
        border: "1px solid #222a3e",
        borderRadius: "10px",
        padding: "20px",
      }}
    >
      <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#dbe2fd", margin: "0 0 4px" }}>
        {t.settings.preferences.languageLabel}
      </h2>
      <p style={{ fontSize: "13px", color: "#8c90a2", margin: "0 0 16px" }}>
        {t.settings.preferences.languageHelp}
      </p>

      <form action={formAction}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
          {(
            [
              { value: "en", label: t.settings.preferences.english },
              { value: "ar", label: t.settings.preferences.arabic },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "8px",
                border: `1px solid ${currentLocale === option.value ? "#0062ff" : "#2d3449"}`,
                background: currentLocale === option.value ? "rgba(0,98,255,0.08)" : "#0d1627",
                cursor: "pointer",
                fontSize: "13px",
                color: "#dbe2fd",
              }}
            >
              <input
                type="radio"
                name="locale"
                value={option.value}
                defaultChecked={currentLocale === option.value}
              />
              {option.label}
            </label>
          ))}
        </div>

        {state && "error" in state && (
          <p style={{ fontSize: "12px", color: "#ffb4ab", marginBottom: "12px" }}>{state.error}</p>
        )}
        {state && "success" in state && (
          <p style={{ fontSize: "12px", color: "#62df7d", marginBottom: "12px" }}>
            {t.settings.preferences.saved}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            background: isPending ? "#0044b8" : "#0062ff",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 600,
            border: "none",
            cursor: isPending ? "not-allowed" : "pointer",
          }}
        >
          {t.settings.preferences.saveButton}
        </button>
      </form>
    </div>
  );
}
