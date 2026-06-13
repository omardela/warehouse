"use client";

import { useActionState, useState, startTransition } from "react";
import {
  updateRolePermissionsAction,
  updateRoleNameAction,
  type UpdateRolePermissionsState,
  type UpdateRoleNameState,
} from "./actions";

type PermissionItem = {
  id: string;
  code: string;
  description: string | null;
};

type ModuleGroup = {
  module: string;
  label: string;
  permissions: PermissionItem[];
};

const MODULE_ORDER = [
  { key: "inventory",  label: "Inventory" },
  { key: "sales",      label: "Sales" },
  { key: "purchase",   label: "Purchases" },
  { key: "payments",   label: "Payments" },
  { key: "employees",  label: "Employees" },
  { key: "customers",  label: "Customers" },
  { key: "suppliers",  label: "Suppliers" },
  { key: "reports",    label: "Reports" },
  { key: "audit",      label: "Audit Logs" },
  { key: "settings",   label: "Settings" },
  { key: "roles",      label: "Roles & Permissions" },
];

function groupPermissions(permissions: PermissionItem[]): ModuleGroup[] {
  const map = new Map<string, PermissionItem[]>();

  for (const p of permissions) {
    const module = p.code.split(".")[0];
    if (!map.has(module)) map.set(module, []);
    map.get(module)!.push(p);
  }

  const ordered: ModuleGroup[] = [];
  for (const { key, label } of MODULE_ORDER) {
    if (map.has(key)) {
      ordered.push({ module: key, label, permissions: map.get(key)! });
    }
  }

  for (const [key, perms] of map) {
    if (!MODULE_ORDER.find((m) => m.key === key)) {
      ordered.push({ module: key, label: key, permissions: perms });
    }
  }

  return ordered;
}

function formatPermissionLabel(code: string): string {
  const parts = code.split(".");
  const action = parts[parts.length - 1];
  return action.charAt(0).toUpperCase() + action.slice(1);
}

function ModuleIcon({ module }: { module: string }) {
  const icons: Record<string, React.ReactNode> = {
    inventory: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="3" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4 3V1.5M10 3V1.5M3.5 6.5H10.5M3.5 8.5H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    sales: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 10L5 6.5L7.5 8.5L11 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 4H11V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    purchase: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 1.5H2.5L4 9H11L12.5 4.5H3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="5" cy="11" r="1" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="10" cy="11" r="1" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
    payments: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="3" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <path d="M1 6H13" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4 8.5H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    employees: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="5.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M1 13C1 10.5 3 8.5 5.5 8.5C8 8.5 10 10.5 10 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M11 6.5L12.5 8L14 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    customers: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M2 13C2 10.5 4.2 8.5 7 8.5C9.8 8.5 12 10.5 12 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    suppliers: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="5.5" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <path d="M9 8H11C11.55 8 12 8.45 12 9V12.5H9" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M3.5 5.5V3.5C3.5 2.4 4.4 1.5 5.5 1.5H7.5C8.6 1.5 9.5 2.4 9.5 3.5V5.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
    reports: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="2" y="1" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4.5 5H9.5M4.5 7.5H9.5M4.5 10H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    audit: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1C3.7 1 1 3.7 1 7C1 10.3 3.7 13 7 13C10.3 13 13 10.3 13 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M7 4V7L9 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 1.5L11.5 3.5L9.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    settings: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M7 1V2.5M7 11.5V13M1 7H2.5M11.5 7H13M2.8 2.8L3.9 3.9M10.1 10.1L11.2 11.2M11.2 2.8L10.1 3.9M3.9 10.1L2.8 11.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    roles: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1L2 3.5V7.5C2 10.5 4.2 13 7 14C9.8 13 12 10.5 12 7.5V3.5L7 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M5 7L6.5 8.5L9.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  };
  return (
    <span style={{ display: "flex", color: "#8c90a2" }}>
      {icons[module] ?? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      )}
    </span>
  );
}

export function RolePermissionForm({
  roleId,
  roleName,
  isOwner = false,
  allPermissions,
  assignedPermissionIds,
}: {
  roleId: string;
  roleName: string;
  isOwner?: boolean;
  allPermissions: PermissionItem[];
  assignedPermissionIds: string[];
}) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    new Set(assignedPermissionIds)
  );
  const [nameValue, setNameValue] = useState(roleName);

  const [state, formAction, isPending] = useActionState<
    UpdateRolePermissionsState,
    FormData
  >(updateRolePermissionsAction, null);

  const [nameState, nameFormAction, nameIsPending] = useActionState<
    UpdateRoleNameState,
    FormData
  >(updateRoleNameAction, null);

  const groups = groupPermissions(allPermissions);

  function togglePermission(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleModule(group: ModuleGroup) {
    const allChecked = group.permissions.every((p) => checkedIds.has(p.id));
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        group.permissions.forEach((p) => next.delete(p.id));
      } else {
        group.permissions.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }

  const totalSelected = checkedIds.size;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* ── Role Name editor ────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: "#171f33",
          border: "1px solid #222a3e",
          borderRadius: "10px",
          padding: "20px",
        }}
      >
        <h2
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#8c90a2",
            margin: "0 0 14px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Role Name
        </h2>

        {nameState && "success" in nameState && (
          <div
            style={{
              marginBottom: "12px",
              padding: "8px 12px",
              borderRadius: "6px",
              backgroundColor: "rgba(98,223,125,0.1)",
              border: "1px solid rgba(98,223,125,0.25)",
              color: "#62df7d",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6L4.5 8.5L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Role renamed to &ldquo;{nameState.name}&rdquo;.
          </div>
        )}
        {nameState && "error" in nameState && (
          <div
            style={{
              marginBottom: "12px",
              padding: "8px 12px",
              borderRadius: "6px",
              backgroundColor: "rgba(255,180,171,0.1)",
              border: "1px solid rgba(255,180,171,0.3)",
              color: "#ffb4ab",
              fontSize: "12px",
            }}
          >
            {nameState.error}
          </div>
        )}

        {isOwner ? (
          <div
            style={{
              padding: "9px 12px",
              background: "#0b1326",
              border: "1px solid #1e2639",
              borderRadius: "8px",
              color: "#8c90a2",
              fontSize: "13px",
            }}
          >
            {nameValue}
          </div>
        ) : (
          <form action={nameFormAction} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <input type="hidden" name="roleId" value={roleId} />
            <input
              name="roleName"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              maxLength={50}
              style={{
                flex: 1,
                padding: "9px 12px",
                background: "#0d1627",
                border: "1px solid #2d3449",
                borderRadius: "8px",
                color: "#dbe2fd",
                fontSize: "13px",
                outline: "none",
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
            <button
              type="submit"
              disabled={nameIsPending || nameValue.trim() === ""}
              style={{
                padding: "9px 18px",
                borderRadius: "8px",
                backgroundColor: nameIsPending ? "#1a2237" : "#0062ff",
                color: nameIsPending ? "#8c90a2" : "#fff",
                fontSize: "13px",
                fontWeight: 500,
                border: "none",
                cursor: nameIsPending ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {nameIsPending ? "Saving..." : "Rename"}
            </button>
          </form>
        )}
      </div>

      {/* ── Permissions form ─────────────────────────────────────────── */}
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isOwner) return;
        const fd = new FormData();
        fd.set("roleId", roleId);
        checkedIds.forEach((id) => fd.append("permissions", id));
        startTransition(() => formAction(fd));
      }}
    >
      {isOwner && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.25)",
            color: "#f59e0b",
            fontSize: "13px",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: "1px" }}>
            <path d="M8 1.5C4.41 1.5 1.5 4.41 1.5 8C1.5 11.59 4.41 14.5 8 14.5C11.59 14.5 14.5 11.59 14.5 8C14.5 4.41 11.59 1.5 8 1.5Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="11" r="0.75" fill="currentColor" />
          </svg>
          <span>
            <strong>System-protected role.</strong> The Owner role always has full access to all
            permissions. Its permissions cannot be modified or removed.
          </span>
        </div>
      )}
      {state && "success" in state && (
        <div
          style={{
            marginBottom: "16px",
            padding: "10px 14px",
            borderRadius: "8px",
            backgroundColor: "rgba(98,223,125,0.1)",
            border: "1px solid rgba(98,223,125,0.25)",
            color: "#62df7d",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M2 7L5.5 10.5L12 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Permissions saved successfully.
        </div>
      )}
      {state && "error" in state && (
        <div
          style={{
            marginBottom: "16px",
            padding: "10px 14px",
            borderRadius: "8px",
            backgroundColor: "rgba(255,180,171,0.1)",
            border: "1px solid rgba(255,180,171,0.3)",
            color: "#ffb4ab",
            fontSize: "13px",
          }}
        >
          {state.error}
        </div>
      )}

      {/* Summary bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          padding: "10px 14px",
          borderRadius: "8px",
          backgroundColor: "#0d1627",
          border: "1px solid #222a3e",
        }}
      >
        <span style={{ fontSize: "12px", color: "#8c90a2" }}>
          <span style={{ color: "#dbe2fd", fontWeight: 600 }}>
            {totalSelected}
          </span>{" "}
          of {allPermissions.length} permissions selected
        </span>
        {!isOwner && (
          <button
            type="submit"
            disabled={isPending}
            style={{
              padding: "7px 18px",
              borderRadius: "7px",
              backgroundColor: isPending ? "#1a2237" : "#0062ff",
              color: isPending ? "#8c90a2" : "#fff",
              fontSize: "12px",
              fontWeight: 600,
              border: "none",
              cursor: isPending ? "not-allowed" : "pointer",
            }}
          >
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>

      {/* Permission groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {groups.map((group) => {
          const allChecked = group.permissions.every((p) => checkedIds.has(p.id));
          const someChecked =
            !allChecked && group.permissions.some((p) => checkedIds.has(p.id));

          return (
            <ModuleCard
              key={group.module}
              group={group}
              checkedIds={checkedIds}
              allChecked={allChecked}
              someChecked={someChecked}
              onToggleModule={() => toggleModule(group)}
              onTogglePermission={togglePermission}
              readOnly={isOwner}
            />
          );
        })}
      </div>

      {/* Bottom save button */}
      <div style={{ marginTop: "24px", display: "flex", gap: "10px" }}>
        {!isOwner && (
          <button
            type="submit"
            disabled={isPending}
            style={{
              padding: "9px 24px",
              borderRadius: "8px",
              backgroundColor: isPending ? "#1a2237" : "#0062ff",
              color: isPending ? "#8c90a2" : "#fff",
              fontSize: "13px",
              fontWeight: 500,
              border: "none",
              cursor: isPending ? "not-allowed" : "pointer",
            }}
          >
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        )}
        <a
          href="/dashboard/settings/roles"
          style={{
            padding: "9px 20px",
            borderRadius: "8px",
            border: "1px solid #2d3449",
            color: "#8c90a2",
            fontSize: "13px",
            fontWeight: 500,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          Back to Roles
        </a>
      </div>
    </form>
    </div>
  );
}

function ModuleCard({
  group,
  checkedIds,
  allChecked,
  someChecked,
  onToggleModule,
  onTogglePermission,
  readOnly = false,
}: {
  group: ModuleGroup;
  checkedIds: Set<string>;
  allChecked: boolean;
  someChecked: boolean;
  onToggleModule: () => void;
  onTogglePermission: (id: string) => void;
  readOnly?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  void someChecked;

  return (
    <div
      style={{
        backgroundColor: "#171f33",
        border: "1px solid #222a3e",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: expanded ? "1px solid #222a3e" : "none",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ModuleIcon module={group.module} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#dbe2fd" }}>
            {group.label}
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "#8c90a2",
              backgroundColor: "#0d1627",
              border: "1px solid #2d3449",
              borderRadius: "10px",
              padding: "1px 7px",
            }}
          >
            {group.permissions.filter((p) => checkedIds.has(p.id)).length} /{" "}
            {group.permissions.length}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {!readOnly && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleModule();
              }}
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: allChecked ? "#ffb4ab" : "#0062ff",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 0",
              }}
            >
              {allChecked ? "Deselect All" : "Select All"}
            </button>
          )}

          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            style={{
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
              color: "#8c90a2",
              flexShrink: 0,
            }}
          >
            <path
              d="M3 5L7 9L11 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {expanded && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "2px",
            padding: "8px 16px 12px",
          }}
        >
          {group.permissions.map((perm) => {
            const checked = checkedIds.has(perm.id);
            return (
              <label
                key={perm.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor = "#0d1627")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")
                }
              >
                <div
                  onClick={() => { if (!readOnly) onTogglePermission(perm.id); }}
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "4px",
                    border: checked ? "1.5px solid #0062ff" : "1.5px solid #2d3449",
                    backgroundColor: checked ? (readOnly ? "#1a3a6b" : "#0062ff") : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    cursor: readOnly ? "default" : "pointer",
                    opacity: readOnly ? 0.6 : 1,
                  }}
                >
                  {checked && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5L4.5 7.5L8.5 2.5"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: checked ? 500 : 400,
                      color: checked ? "#dbe2fd" : "#8c90a2",
                    }}
                    onClick={() => { if (!readOnly) onTogglePermission(perm.id); }}
                  >
                    {formatPermissionLabel(perm.code)}
                  </div>
                  {perm.description && (
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#4a5068",
                        marginTop: "1px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {perm.description}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
