"use client";

import { useTheme } from "@/providers/theme-provider";
import { useWarehouseContext } from "@/providers/warehouse-context";

function IconMenu() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 10H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9 2C6.239 2 4 4.239 4 7V11L2.5 13H15.5L14 11V7C14 4.239 11.761 2 9 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7 13C7 14.105 7.895 15 9 15C10.105 15 11 14.105 11 13"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1.5V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 13V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M1.5 8H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 8H14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3.4 3.4L4.46 4.46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.54 11.54L12.6 12.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12.6 3.4L11.54 4.46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.46 11.54L3.4 12.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M13.5 8.5C12.8 11.2 10.3 13 7.5 13C4.186 13 1.5 10.314 1.5 7C1.5 4.2 3.3 1.7 6 1C4.5 3.5 4.8 6.8 7 8.5C9.2 10.2 12.5 10.3 13.5 8.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const iconButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "34px",
  height: "34px",
  borderRadius: "8px",
  backgroundColor: "transparent",
  border: "none",
  color: "#8c90a2",
  cursor: "pointer",
  flexShrink: 0,
  transition: "background-color 0.15s, color 0.15s",
};

function IconButton({
  onClick,
  label,
  children,
  className,
}: {
  onClick?: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={className}
      style={iconButtonStyle}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "#171f33";
        (e.currentTarget as HTMLElement).style.color = "#dbe2fd";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
        (e.currentTarget as HTMLElement).style.color = "#8c90a2";
      }}
    >
      {children}
    </button>
  );
}

export function Topbar({
  pageTitle,
  onMenuClick,
}: {
  pageTitle?: string;
  onMenuClick: () => void;
}) {
  const { warehouseName, employeeName } = useWarehouseContext();
  const { theme, setTheme } = useTheme();

  return (
    <header
      style={{
        backgroundColor: "#0d1627",
        borderBottom: "1px solid #222a3e",
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        position: "sticky",
        top: 0,
        zIndex: 30,
        flexShrink: 0,
        gap: "8px",
      }}
    >
      {/* Left: hamburger (mobile/tablet only) + page title */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
        <IconButton label="Open navigation" onClick={onMenuClick} className="lg:hidden">
          <IconMenu />
        </IconButton>
        <h1
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: "#dbe2fd",
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {pageTitle ?? "Dashboard"}
        </h1>
      </div>

      {/* Right: warehouse badge, notifications, theme toggle, avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: "#8c90a2",
            backgroundColor: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "6px",
            padding: "3px 10px",
            whiteSpace: "nowrap",
          }}
        >
          {warehouseName}
        </span>

        <IconButton label="Notifications">
          <IconBell />
        </IconButton>

        <IconButton
          label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <IconSun /> : <IconMoon />}
        </IconButton>

        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: "#0062ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: 600,
            color: "white",
            flexShrink: 0,
            cursor: "default",
          }}
          title={employeeName}
        >
          {employeeName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
