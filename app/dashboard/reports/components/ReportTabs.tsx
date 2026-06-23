"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "@/providers/locale-context";

const TAB_KEYS = ["sales", "purchases", "profit", "stock"] as const;

type TabKey = (typeof TAB_KEYS)[number];

interface ReportTabsProps {
  activeTab: string;
}

export function ReportTabs({ activeTab }: ReportTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations();

  const TABS = TAB_KEYS.map((key) => ({ key, label: t.reports.tabs[key] }));

  function navigate(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "4px",
        backgroundColor: "#171f33",
        border: "1px solid #222a3e",
        borderRadius: "10px",
        padding: "4px",
        marginBottom: "24px",
        overflowX: "auto",
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => navigate(tab.key)}
            style={{
              flex: "1",
              minWidth: "110px",
              padding: "8px 16px",
              borderRadius: "7px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "#ffffff" : "#8c90a2",
              backgroundColor: isActive ? "#0062ff" : "transparent",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
