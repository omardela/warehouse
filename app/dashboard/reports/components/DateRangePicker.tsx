"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "@/providers/locale-context";

const PRESET_KEYS = ["today", "week", "month", "year", "custom"] as const;

type PresetKey = (typeof PRESET_KEYS)[number];

interface DateRangePickerProps {
  currentFrom: string;
  currentTo: string;
  currentPreset: string;
}

export function DateRangePicker({
  currentFrom,
  currentTo,
  currentPreset,
}: DateRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations();

  const PRESETS: { key: PresetKey; label: string }[] = [
    { key: "today", label: t.reports.dateRange.today },
    { key: "week", label: t.reports.dateRange.thisWeek },
    { key: "month", label: t.reports.dateRange.thisMonth },
    { key: "year", label: t.reports.dateRange.thisYear },
    { key: "custom", label: t.reports.dateRange.custom },
  ];

  const [customFrom, setCustomFrom] = useState(currentFrom);
  const [customTo, setCustomTo] = useState(currentTo);
  const [showCustom, setShowCustom] = useState(currentPreset === "custom");

  function navigate(preset: PresetKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (preset === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    params.set("preset", preset);
    params.delete("from");
    params.delete("to");
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", customFrom);
    params.set("to", customTo);
    params.set("preset", "custom");
    router.push(`${pathname}?${params.toString()}`);
  }

  const activePreset = showCustom ? "custom" : currentPreset || "month";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
        marginBottom: "24px",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "#8c90a2",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          flexShrink: 0,
        }}
      >
        {t.reports.dateRange.period}
      </span>

      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        {PRESETS.map((preset) => {
          const isActive = activePreset === preset.key;
          return (
            <button
              key={preset.key}
              onClick={() => navigate(preset.key)}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                border: `1px solid ${isActive ? "#0062ff" : "#222a3e"}`,
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#0062ff" : "#8c90a2",
                backgroundColor: isActive ? "rgba(0,98,255,0.1)" : "#171f33",
                transition: "all 0.15s ease",
              }}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {showCustom && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginLeft: "8px",
          }}
        >
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            style={{
              padding: "5px 10px",
              background: "#0d1627",
              border: "1px solid #2d3449",
              borderRadius: "6px",
              color: customFrom ? "#dbe2fd" : "#4a5068",
              fontSize: "12px",
              outline: "none",
              colorScheme: "dark",
            }}
          />
          <span style={{ color: "#4a5068", fontSize: "12px" }}>to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            style={{
              padding: "5px 10px",
              background: "#0d1627",
              border: "1px solid #2d3449",
              borderRadius: "6px",
              color: customTo ? "#dbe2fd" : "#4a5068",
              fontSize: "12px",
              outline: "none",
              colorScheme: "dark",
            }}
          />
          <button
            onClick={applyCustom}
            disabled={!customFrom || !customTo}
            style={{
              padding: "5px 12px",
              borderRadius: "6px",
              border: "none",
              cursor: customFrom && customTo ? "pointer" : "not-allowed",
              fontSize: "12px",
              fontWeight: 600,
              color: "#fff",
              backgroundColor: customFrom && customTo ? "#0062ff" : "#1a2237",
              opacity: customFrom && customTo ? 1 : 0.5,
            }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
