"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { parseCsv } from "./parseCsv";
import type {
  ColumnMapping,
  CommitImportResult,
  ImportColumnDef,
  ValidateImportResult,
  ValidatedRow,
} from "./types";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

type Step = "upload" | "map" | "preview" | "result";

interface CsvImportWizardProps {
  /** Display name of the entity being imported, e.g. "Products". */
  entityLabel: string;
  /** Where to navigate back to after a successful import. */
  backHref: string;
  backLabel: string;
  columns: readonly ImportColumnDef[];
  /** Server action that validates the full mapped row set against the DB. */
  validateAction: (rows: Record<string, string>[]) => Promise<ValidateImportResult>;
  /** Server action that commits valid rows inside a single transaction. */
  commitAction: (rows: Record<string, string>[], skipErrors: boolean) => Promise<CommitImportResult>;
  /** Optional help text shown on the upload step. */
  helpText?: string;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function autoDetectMapping(headers: string[], columns: readonly ImportColumnDef[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalizedHeaders = headers.map(normalizeHeader);

  for (const col of columns) {
    const candidates = [col.key, col.label, ...col.aliases].map(normalizeHeader);
    const idx = normalizedHeaders.findIndex((h) => candidates.includes(h));
    mapping[col.key] = idx >= 0 ? headers[idx] : "";
  }

  return mapping;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const PANEL_BG = "#171f33";
const PANEL_BORDER = "#222a3e";
const PAGE_BG = "#0b1326";
const TEXT_MAIN = "#dbe2fd";
const TEXT_MUTED = "#8c90a2";
const TEXT_FAINT = "#4a5068";
const INPUT_BG = "#0d1627";
const INPUT_BORDER = "#2d3449";
const ACCENT = "#0062ff";
const SUCCESS = "#62df7d";
const WARNING = "#f59e0b";
const DANGER = "#ef4444";

export function CsvImportWizard({
  entityLabel,
  backHref,
  backLabel,
  columns,
  validateAction,
  commitAction,
  helpText,
}: CsvImportWizardProps) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [fileError, setFileError] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [validated, setValidated] = useState<ValidateImportResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string>("");
  const [result, setResult] = useState<CommitImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredColumns = useMemo(() => columns.filter((c) => c.required), [columns]);

  function resetAll() {
    setStep("upload");
    setFileName("");
    setFileError("");
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setValidated(null);
    setCommitError("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(file: File) {
    setFileError("");

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Only .csv files are supported.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("File is too large. Maximum size is 5 MB.");
      return;
    }
    if (file.size === 0) {
      setFileError("File is empty.");
      return;
    }

    const text = await file.text();
    const { headers: parsedHeaders, rows: parsedRows } = parseCsv(text);

    if (parsedHeaders.length === 0) {
      setFileError("Could not detect any columns in this file.");
      return;
    }
    if (parsedRows.length === 0) {
      setFileError("No data rows found in this file.");
      return;
    }

    setFileName(file.name);
    setHeaders(parsedHeaders);
    setRawRows(parsedRows);
    setMapping(autoDetectMapping(parsedHeaders, columns));
    setStep("map");
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function mappedRowsForServer(): Record<string, string>[] {
    return rawRows.map((row) => {
      const obj: Record<string, string> = {};
      for (const col of columns) {
        const headerName = mapping[col.key];
        const idx = headerName ? headers.indexOf(headerName) : -1;
        obj[col.key] = idx >= 0 ? (row[idx] ?? "").trim() : "";
      }
      return obj;
    });
  }

  const canProceedFromMapping = requiredColumns.every((c) => !!mapping[c.key]);

  async function handleMappingContinue() {
    if (!canProceedFromMapping) return;
    setIsValidating(true);
    setCommitError("");
    try {
      const rows = mappedRowsForServer();
      const res = await validateAction(rows);
      setValidated(res);
      setStep("preview");
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : "Failed to validate file.");
    } finally {
      setIsValidating(false);
    }
  }

  async function handleCommit(skipErrors: boolean) {
    if (!validated) return;
    setIsCommitting(true);
    setCommitError("");
    try {
      const rows = mappedRowsForServer();
      const res = await commitAction(rows, skipErrors);
      setResult(res);
      setStep("result");
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : "Failed to import rows.");
    } finally {
      setIsCommitting(false);
    }
  }

  function handleDownloadErrors() {
    if (!result || result.errors.length === 0) return;
    const header = ["row", ...columns.map((c) => c.key), "error"];
    const lines = [header.join(",")];
    for (const err of result.errors) {
      const line = [
        String(err.rowNumber),
        ...columns.map((c) => csvEscape(err.values[c.key] ?? "")),
        csvEscape(err.message),
      ];
      lines.push(line.join(","));
    }
    downloadTextFile(`${entityLabel.toLowerCase()}-import-errors.csv`, lines.join("\n"));
  }

  function handleDownloadPreviewErrors() {
    if (!validated) return;
    const erroredRows = validated.rows.filter((r) => r.errors.length > 0);
    if (erroredRows.length === 0) return;
    const header = ["row", ...columns.map((c) => c.key), "errors"];
    const lines = [header.join(",")];
    for (const row of erroredRows) {
      const line = [
        String(row.rowNumber),
        ...columns.map((c) => csvEscape(row.values[c.key] ?? "")),
        csvEscape(row.errors.map((e) => e.message).join("; ")),
      ];
      lines.push(line.join(","));
    }
    downloadTextFile(`${entityLabel.toLowerCase()}-import-errors.csv`, lines.join("\n"));
  }

  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "map", label: "Map Columns" },
    { key: "preview", label: "Preview" },
    { key: "result", label: "Result" },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG, padding: "24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "20px" }}>
          <Link
            href={backHref}
            style={{ fontSize: "12px", color: TEXT_MUTED, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
          >
            ← {backLabel}
          </Link>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: TEXT_MAIN, margin: "8px 0 4px" }}>
            Import {entityLabel} from CSV
          </h1>
          {helpText && (
            <p style={{ fontSize: "13px", color: TEXT_MUTED, margin: 0 }}>{helpText}</p>
          )}
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {steps.map((s, idx) => (
            <div
              key={s.key}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "8px",
                background: idx === stepIndex ? "rgba(0,98,255,0.12)" : PANEL_BG,
                border: `1px solid ${idx === stepIndex ? ACCENT : PANEL_BORDER}`,
                color: idx <= stepIndex ? TEXT_MAIN : TEXT_FAINT,
                fontSize: "12px",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              {idx + 1}. {s.label}
            </div>
          ))}
        </div>

        {commitError && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "8px",
              background: "rgba(239,68,68,0.1)",
              border: `1px solid ${DANGER}`,
              color: "#fca5a5",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            {commitError}
          </div>
        )}

        {/* Step: Upload */}
        {step === "upload" && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            style={{
              background: PANEL_BG,
              border: `1px dashed ${INPUT_BORDER}`,
              borderRadius: "10px",
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <p style={{ color: TEXT_MAIN, fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>
              Drag &amp; drop your CSV file here
            </p>
            <p style={{ color: TEXT_MUTED, fontSize: "12px", marginBottom: "16px" }}>
              .csv files only, max 5 MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: "8px 18px",
                background: ACCENT,
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Browse Files
            </button>
            {fileError && (
              <p style={{ color: DANGER, fontSize: "12px", marginTop: "14px" }}>{fileError}</p>
            )}
          </div>
        )}

        {/* Step: Map columns */}
        {step === "map" && (
          <div style={{ background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: "10px", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", color: TEXT_MUTED }}>
                File: <span style={{ color: TEXT_MAIN, fontWeight: 600 }}>{fileName}</span>{" "}
                ({rawRows.length} row{rawRows.length !== 1 ? "s" : ""})
              </div>
              <button
                type="button"
                onClick={resetAll}
                style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${INPUT_BORDER}`, borderRadius: "6px", color: TEXT_MUTED, fontSize: "12px", cursor: "pointer" }}
              >
                Choose a different file
              </button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginBottom: "16px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${PANEL_BORDER}` }}>
                  <th style={{ textAlign: "left", padding: "8px", color: TEXT_MUTED, fontSize: "11px", textTransform: "uppercase" }}>
                    System Field
                  </th>
                  <th style={{ textAlign: "left", padding: "8px", color: TEXT_MUTED, fontSize: "11px", textTransform: "uppercase" }}>
                    CSV Column
                  </th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col) => (
                  <tr key={col.key} style={{ borderBottom: `1px solid #1a2237` }}>
                    <td style={{ padding: "8px", color: TEXT_MAIN }}>
                      {col.label}
                      {col.required && <span style={{ color: DANGER }}> *</span>}
                    </td>
                    <td style={{ padding: "8px" }}>
                      <select
                        value={mapping[col.key] ?? ""}
                        onChange={(e) =>
                          setMapping((m) => ({ ...m, [col.key]: e.target.value }))
                        }
                        style={{
                          width: "100%",
                          maxWidth: "320px",
                          padding: "6px 10px",
                          background: INPUT_BG,
                          border: `1px solid ${col.required && !mapping[col.key] ? DANGER : INPUT_BORDER}`,
                          borderRadius: "6px",
                          color: TEXT_MAIN,
                          fontSize: "13px",
                        }}
                      >
                        <option value="">— Skip this field —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!canProceedFromMapping && (
              <p style={{ color: WARNING, fontSize: "12px", marginBottom: "12px" }}>
                Please map all required fields ({requiredColumns.map((c) => c.label).join(", ")}) before continuing.
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setStep("upload")}
                style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${INPUT_BORDER}`, borderRadius: "8px", color: TEXT_MUTED, fontSize: "13px", cursor: "pointer" }}
              >
                Back
              </button>
              <button
                type="button"
                disabled={!canProceedFromMapping || isValidating}
                onClick={handleMappingContinue}
                style={{
                  padding: "8px 18px",
                  background: canProceedFromMapping ? ACCENT : "#2d3449",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: canProceedFromMapping && !isValidating ? "pointer" : "not-allowed",
                }}
              >
                {isValidating ? "Validating…" : "Continue to Preview"}
              </button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && validated && (
          <div>
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "16px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: "160px", background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: "10px", padding: "14px 16px" }}>
                <div style={{ fontSize: "11px", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Rows</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: TEXT_MAIN }}>{validated.rows.length}</div>
              </div>
              <div style={{ flex: 1, minWidth: "160px", background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: "10px", padding: "14px 16px" }}>
                <div style={{ fontSize: "11px", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>Valid Rows</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: SUCCESS }}>{validated.validCount}</div>
              </div>
              <div style={{ flex: 1, minWidth: "160px", background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: "10px", padding: "14px 16px" }}>
                <div style={{ fontSize: "11px", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>Rows With Errors</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: validated.errorCount > 0 ? DANGER : TEXT_MAIN }}>
                  {validated.errorCount}
                </div>
              </div>
            </div>

            <div style={{ background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: "10px", overflow: "hidden", marginBottom: "16px" }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${PANEL_BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: TEXT_MAIN }}>
                  Preview (first {Math.min(10, validated.rows.length)} of {validated.rows.length} rows)
                </span>
                {validated.errorCount > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadPreviewErrors}
                    style={{ padding: "5px 12px", background: "transparent", border: `1px solid ${INPUT_BORDER}`, borderRadius: "6px", color: TEXT_MUTED, fontSize: "12px", cursor: "pointer" }}
                  >
                    Download Error Rows (CSV)
                  </button>
                )}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: INPUT_BG, borderBottom: `1px solid ${PANEL_BORDER}` }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", color: TEXT_MUTED, fontSize: "11px", textTransform: "uppercase" }}>Row</th>
                      {columns.map((col) => (
                        <th key={col.key} style={{ padding: "8px 12px", textAlign: "left", color: TEXT_MUTED, fontSize: "11px", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                          {col.label}
                        </th>
                      ))}
                      <th style={{ padding: "8px 12px", textAlign: "left", color: TEXT_MUTED, fontSize: "11px", textTransform: "uppercase" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validated.rows.slice(0, 10).map((row: ValidatedRow) => {
                      const errorFields = new Set(row.errors.map((e) => e.field));
                      const hasError = row.errors.length > 0;
                      return (
                        <tr key={row.rowNumber} style={{ borderBottom: "1px solid #1a2237", background: hasError ? "rgba(239,68,68,0.05)" : "transparent" }}>
                          <td style={{ padding: "8px 12px", color: TEXT_FAINT }}>{row.rowNumber}</td>
                          {columns.map((col) => {
                            const fieldError = row.errors.find((e) => e.field === col.key);
                            return (
                              <td key={col.key} style={{ padding: "8px 12px", color: errorFields.has(col.key) ? DANGER : TEXT_MAIN }}>
                                {row.values[col.key] || <span style={{ color: TEXT_FAINT }}>—</span>}
                                {fieldError && (
                                  <div style={{ fontSize: "10px", color: DANGER, marginTop: "2px" }}>{fieldError.message}</div>
                                )}
                              </td>
                            );
                          })}
                          <td style={{ padding: "8px 12px" }}>
                            {hasError ? (
                              <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: "10px", background: "rgba(239,68,68,0.12)", color: DANGER, fontSize: "10px", fontWeight: 600 }}>
                                ERROR
                              </span>
                            ) : (
                              <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: "10px", background: "rgba(98,223,125,0.12)", color: SUCCESS, fontSize: "10px", fontWeight: 600 }}>
                                VALID
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <button
                type="button"
                onClick={resetAll}
                style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${INPUT_BORDER}`, borderRadius: "8px", color: TEXT_MUTED, fontSize: "13px", cursor: "pointer" }}
              >
                Cancel &amp; Re-upload
              </button>
              <div style={{ display: "flex", gap: "10px" }}>
                {validated.errorCount > 0 && validated.validCount > 0 && (
                  <button
                    type="button"
                    disabled={isCommitting}
                    onClick={() => handleCommit(true)}
                    style={{
                      padding: "8px 18px",
                      background: "transparent",
                      border: `1px solid ${WARNING}`,
                      borderRadius: "8px",
                      color: WARNING,
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: isCommitting ? "not-allowed" : "pointer",
                    }}
                  >
                    {isCommitting ? "Importing…" : `Skip Errors & Import ${validated.validCount} Valid Row${validated.validCount !== 1 ? "s" : ""}`}
                  </button>
                )}
                <button
                  type="button"
                  disabled={isCommitting || validated.validCount === 0 || validated.errorCount > 0}
                  onClick={() => handleCommit(false)}
                  title={validated.errorCount > 0 ? "Resolve all errors, or use Skip Errors instead." : undefined}
                  style={{
                    padding: "8px 18px",
                    background: validated.errorCount === 0 && validated.validCount > 0 ? ACCENT : "#2d3449",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: isCommitting || validated.errorCount > 0 || validated.validCount === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  {isCommitting ? "Importing…" : `Import All ${validated.rows.length} Row${validated.rows.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === "result" && result && (
          <div style={{ background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: "10px", padding: "32px", textAlign: "center" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(98,223,125,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <path d="M6 14.5L11.5 20L22 8" stroke={SUCCESS} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: TEXT_MAIN, marginBottom: "6px" }}>
              Import Complete
            </h2>
            <p style={{ fontSize: "13px", color: TEXT_MUTED, marginBottom: "20px" }}>
              {result.imported} row{result.imported !== 1 ? "s" : ""} imported, {result.skipped} row{result.skipped !== 1 ? "s" : ""} skipped.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginBottom: "24px" }}>
              <div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: SUCCESS }}>{result.imported}</div>
                <div style={{ fontSize: "11px", color: TEXT_MUTED, textTransform: "uppercase" }}>Imported</div>
              </div>
              <div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: result.skipped > 0 ? WARNING : TEXT_MAIN }}>{result.skipped}</div>
                <div style={{ fontSize: "11px", color: TEXT_MUTED, textTransform: "uppercase" }}>Skipped</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
              {result.errors.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadErrors}
                  style={{ padding: "8px 18px", background: "transparent", border: `1px solid ${INPUT_BORDER}`, borderRadius: "8px", color: TEXT_MUTED, fontSize: "13px", cursor: "pointer" }}
                >
                  Download Error Details (CSV)
                </button>
              )}
              <button
                type="button"
                onClick={resetAll}
                style={{ padding: "8px 18px", background: "transparent", border: `1px solid ${INPUT_BORDER}`, borderRadius: "8px", color: TEXT_MUTED, fontSize: "13px", cursor: "pointer" }}
              >
                Import Another File
              </button>
              <Link
                href={backHref}
                style={{ padding: "8px 18px", background: ACCENT, borderRadius: "8px", color: "#fff", fontSize: "13px", fontWeight: 500, textDecoration: "none" }}
              >
                {backLabel}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
