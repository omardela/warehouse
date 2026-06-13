"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { key: "sales", label: "Sales" },
  { key: "purchases", label: "Purchases" },
  { key: "profit", label: "Profit" },
  { key: "stock", label: "Stock Valuation" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface ReportTabsProps {
  activeTab: string;
}

export function ReportTabs({ activeTab }: ReportTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
