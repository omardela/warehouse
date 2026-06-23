"use client";

import { useActionState } from "react";
import {
  updateEmployeeRoleAction,
  archiveEmployeeAction,
  type EmployeeActionState,
} from "../actions";
import { useTranslations } from "@/providers/locale-context";

type RoleOption = {
  id: string;
  name: string;
};

interface EmployeeDetailFormProps {
  employeeId: string;
  currentRoleId: string | null;
  roles: RoleOption[];
  isArchived: boolean;
  canAssignRole: boolean;
  canArchive: boolean;
  isSelf: boolean;
  isOwner?: boolean;
}

const inputReadonlyStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "#0b1326",
  border: "1px solid #1e2639",
  borderRadius: "8px",
  color: "#8c90a2",
  fontSize: "13px",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 36px 9px 12px",
  borderRadius: "8px",
  border: "1px solid #2d3449",
  backgroundColor: "#0d1627",
  color: "#dbe2fd",
  fontSize: "13px",
  outline: "none",
  cursor: "pointer",
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%238c90a2' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
};

function onFocusSelect(e: React.FocusEvent<HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "#0062ff";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,98,255,0.2)";
}

function onBlurSelect(e: React.FocusEvent<HTMLSelectElement>) {
  e.currentTarget.style.borderColor = "#2d3449";
  e.currentTarget.style.boxShadow = "none";
}

export function EmployeeDetailForm({
  employeeId,
  currentRoleId,
  roles,
  isArchived,
  canAssignRole,
  canArchive,
  isSelf,
  isOwner = false,
}: EmployeeDetailFormProps) {
  const t = useTranslations().employees.detail;
  const [roleState, roleFormAction, roleIsPending] = useActionState<
    EmployeeActionState,
    FormData
  >(updateEmployeeRoleAction, null);

  const [archiveState, archiveFormAction, archiveIsPending] = useActionState<
    EmployeeActionState,
    FormData
  >(archiveEmployeeAction, null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Role update success */}
      {roleState && "success" in roleState && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: "rgba(98,223,125,0.1)",
            border: "1px solid rgba(98,223,125,0.3)",
            color: "#62df7d",
            fontSize: "13px",
          }}
        >
          {t.roleUpdatedSuccess}
        </div>
      )}

      {/* Archive error */}
      {archiveState && "error" in archiveState && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: "rgba(255,180,171,0.1)",
            border: "1px solid rgba(255,180,171,0.3)",
            color: "#ffb4ab",
            fontSize: "13px",
          }}
        >
          {archiveState.error}
        </div>
      )}

      {/* Role error */}
      {roleState && "error" in roleState && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: "rgba(255,180,171,0.1)",
            border: "1px solid rgba(255,180,171,0.3)",
            color: "#ffb4ab",
            fontSize: "13px",
          }}
        >
          {roleState.error}
        </div>
      )}

      {/* Role & Access card */}
      <div
        style={{
          backgroundColor: "#171f33",
          border: "1px solid #222a3e",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#dbe2fd",
            margin: "0 0 20px",
            paddingBottom: "12px",
            borderBottom: "1px solid #222a3e",
          }}
        >
          {t.roleAndAccess}
        </h2>

        {isArchived ? (
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "#c2c6d9",
                marginBottom: "6px",
              }}
            >
              {t.assignedRole}
            </label>
            <div style={inputReadonlyStyle}>
              {roles.find((r) => r.id === currentRoleId)?.name ?? t.noRole}
            </div>
            <p
              style={{ marginTop: "6px", fontSize: "12px", color: "#4a5068" }}
            >
              {t.roleReadOnlyArchived}
            </p>
          </div>
        ) : (
          <form action={roleFormAction}>
            <input type="hidden" name="employeeId" value={employeeId} />
            <div style={{ marginBottom: "16px" }}>
              <label
                htmlFor="warehouseRoleId"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#c2c6d9",
                  marginBottom: "6px",
                }}
              >
                {t.assignedRole}
              </label>
              {canAssignRole ? (
                <>
                  <select
                    id="warehouseRoleId"
                    name="warehouseRoleId"
                    defaultValue={currentRoleId ?? ""}
                    style={selectStyle}
                    onFocus={onFocusSelect}
                    onBlur={onBlurSelect}
                    disabled={roleIsPending}
                  >
                    <option value="">{t.noRole}</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <p
                    style={{
                      marginTop: "6px",
                      fontSize: "12px",
                      color: "#4a5068",
                    }}
                  >
                    {t.roleHint}
                  </p>
                </>
              ) : (
                <>
                  <div style={inputReadonlyStyle}>
                    {roles.find((r) => r.id === currentRoleId)?.name ??
                      t.noRole}
                  </div>
                  <p
                    style={{
                      marginTop: "6px",
                      fontSize: "12px",
                      color: isOwner ? "#f59e0b" : "#4a5068",
                    }}
                  >
                    {isOwner
                      ? t.ownerRoleProtected
                      : t.noPermissionChangeRole}
                  </p>
                </>
              )}
            </div>
            {canAssignRole && (
              <button
                type="submit"
                disabled={roleIsPending}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  backgroundColor: roleIsPending ? "#1a2237" : "#0062ff",
                  color: roleIsPending ? "#8c90a2" : "#fff",
                  fontSize: "13px",
                  fontWeight: 500,
                  border: "none",
                  cursor: roleIsPending ? "not-allowed" : "pointer",
                }}
              >
                {roleIsPending ? t.saving : t.saveRole}
              </button>
            )}
          </form>
        )}
      </div>

      {/* Archive card */}
      {!isArchived && canArchive && !isSelf && (
        <div
          style={{
            backgroundColor: "#171f33",
            border: "1px solid rgba(244,63,94,0.3)",
            borderRadius: "12px",
            padding: "24px",
          }}
        >
          <h2
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#f43f5e",
              margin: "0 0 8px",
            }}
          >
            {t.dangerZone}
          </h2>
          <p style={{ fontSize: "13px", color: "#8c90a2", marginBottom: "16px" }}>
            {t.archiveWarning}
          </p>
          <form action={archiveFormAction}>
            <input type="hidden" name="employeeId" value={employeeId} />
            <button
              type="submit"
              disabled={archiveIsPending}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                backgroundColor: "rgba(244,63,94,0.12)",
                color: archiveIsPending ? "#8c90a2" : "#f43f5e",
                fontSize: "13px",
                fontWeight: 500,
                border: "1px solid rgba(244,63,94,0.3)",
                cursor: archiveIsPending ? "not-allowed" : "pointer",
              }}
            >
              {archiveIsPending ? t.archiving : t.archiveEmployee}
            </button>
          </form>
        </div>
      )}

      {isSelf && !isArchived && (
        <div
          style={{
            backgroundColor: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "12px",
            padding: "20px 24px",
          }}
        >
          <p style={{ fontSize: "13px", color: "#4a5068", margin: 0 }}>
            {t.cannotArchiveSelf}
          </p>
        </div>
      )}
    </div>
  );
}
