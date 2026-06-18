// ---------------------------------------------------------------------------
// Shared types for the CSV import wizard (products / customers / suppliers)
// ---------------------------------------------------------------------------

export interface ImportColumnDef {
  /** Key used internally and as the field name sent to the server. */
  key: string;
  /** Human readable label shown in the column-mapping step. */
  label: string;
  required: boolean;
  /** Example header names this column auto-detects against (case-insensitive). */
  aliases: string[];
}

export interface ImportRowError {
  /** Column key the error applies to, or "_row" for whole-row errors. */
  field: string;
  message: string;
}

export interface ValidatedRow {
  /** 1-based row number as it appears in the source CSV (excluding header). */
  rowNumber: number;
  /** Mapped field values, keyed by column key. */
  values: Record<string, string>;
  errors: ImportRowError[];
}

export interface ValidateImportResult {
  rows: ValidatedRow[];
  validCount: number;
  errorCount: number;
}

export interface CommitImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ rowNumber: number; values: Record<string, string>; message: string }>;
}

export type ColumnMapping = Record<string, string>; // columnKey -> csv header name ("" = unmapped)
