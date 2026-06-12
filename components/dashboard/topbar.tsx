"use client";

import { useState } from "react";
import { useTheme } from "@/providers/theme-provider";
import { useWarehouseContext } from "@/providers/warehouse-context";
import { switchWarehouseAction } from "@/app/actions/switch-warehouse";

// ── Icons ─────────────────────────────────────────────────────────────────────

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

function IconChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconWarehouse() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1.5 14V7L8 2.5L14.5 7V14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="5.5" y="9" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// ── Icon button ───────────────────────────────────────────────────────────────

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

// ── Warehouse Switcher ────────────────────────────────────────────────────────

function WarehouseSwitcher() {
  const { session, warehouseName, availableWarehouses } = useWarehouseContext();
  const [open, setOpen] = useState(false);

  // Only one warehouse — show static badge
  if (availableWarehouses.length <= 1) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
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
        <IconWarehouse />
        {warehouseName}
      </span>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "12px",
          fontWeight: 500,
          color: open ? "#dbe2fd" : "#8c90a2",
          backgroundColor: open ? "#1a2237" : "#171f33",
          border: "1px solid",
          borderColor: open ? "#2d3449" : "#222a3e",
          borderRadius: "6px",
          padding: "3px 8px 3px 10px",
          whiteSpace: "nowrap",
          cursor: "pointer",
          transition: "background-color 0.15s, color 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            (e.currentTarget as HTMLElement).style.backgroundColor = "#1a2237";
            (e.currentTarget as HTMLElement).style.color = "#c2c6d9";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            (e.currentTarget as HTMLElement).style.backgroundColor = "#171f33";
            (e.currentTarget as HTMLElement).style.color = "#8c90a2";
          }
        }}
      >
        <IconWarehouse />
        <span style={{ maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis" }}>
          {warehouseName}
        </span>
        <span style={{ opacity: 0.6, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
          <IconChevron />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Click-away backdrop */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 39 }}
            onClick={() => setOpen(false)}
          />

          <div
            role="listbox"
            aria-label="Switch warehouse"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              zIndex: 40,
              minWidth: "200px",
              backgroundColor: "#171f33",
              border: "1px solid #2d3449",
              borderRadius: "8px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "6px 10px 4px", borderBottom: "1px solid #222a3e" }}>
              <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4a5068" }}>
                Switch Warehouse
              </span>
            </div>

            {availableWarehouses.map((wh) => {
              const isCurrent = wh.id === session.warehouseId;
              return (
                <form key={wh.id} action={switchWarehouseAction} onSubmit={() => setOpen(false)}>
                  <input type="hidden" name="warehouseId" value={wh.id} />
                  <button
                    type="submit"
                    disabled={isCurrent}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      padding: "9px 12px",
                      background: "transparent",
                      border: "none",
                      cursor: isCurrent ? "default" : "pointer",
                      color: isCurrent ? "#dbe2fd" : "#8c90a2",
                      fontSize: "13px",
                      fontWeight: isCurrent ? 500 : 400,
                      textAlign: "left",
                      transition: "background-color 0.1s, color 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrent) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "#1a2237";
                        (e.currentTarget as HTMLElement).style.color = "#dbe2fd";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrent) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "#8c90a2";
                      }
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {wh.name}
                    </span>
                    {isCurrent && (
                      <span style={{ color: "#0062ff", flexShrink: 0 }}>
                        <IconCheck />
                      </span>
                    )}
                  </button>
                </form>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Topbar (exported) ─────────────────────────────────────────────────────────

export function Topbar({
  pageTitle,
  onMenuClick,
}: {
  pageTitle?: string;
  onMenuClick: () => void;
}) {
  const { employeeName } = useWarehouseContext();
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

      {/* Right: warehouse switcher, notifications, theme toggle, avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        <WarehouseSwitcher />

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
