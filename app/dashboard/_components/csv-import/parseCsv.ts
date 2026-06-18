/**
 * Minimal, dependency-free CSV parser.
 *
 * Handles:
 * - Comma-delimited fields
 * - Double-quoted fields (including embedded commas and newlines)
 * - Escaped quotes via doubled `""`
 * - CRLF and LF line endings
 * - A trailing blank line at end of file
 *
 * No CSV parsing library (e.g. papaparse, csv-parse) is currently a
 * dependency of this project, so this hand-rolled parser is used instead of
 * adding a new dependency for a single feature.
 */

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseCsv(text: string): ParsedCsv {
  // Strip BOM if present.
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  function pushField() {
    row.push(field);
    field = "";
  }

  function pushRow() {
    pushField();
    rows.push(row);
    row = [];
  }

  while (i < len) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ",") {
      pushField();
      i += 1;
      continue;
    }

    if (char === "\r") {
      // Lookahead for \r\n
      if (text[i + 1] === "\n") {
        i += 1;
      }
      pushRow();
      i += 1;
      continue;
    }

    if (char === "\n") {
      pushRow();
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  // Flush any trailing field/row (file may not end with a newline).
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  // Drop fully-empty trailing rows (e.g. caused by a trailing newline).
  while (rows.length > 0 && rows[rows.length - 1].every((cell) => cell.trim() === "")) {
    rows.pop();
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);

  return { headers, rows: dataRows };
}
