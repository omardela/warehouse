"use client";

interface Column {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
}

interface DataTableProps {
  columns: Column[];
  rows: Record<string, unknown>[];
  exportUrl?: string;
  emptyMessage?: string;
}

export function DataTable({
  columns,
  rows,
  exportUrl,
  emptyMessage = "No data available.",
}: DataTableProps) {
  function handleExport() {
    if (exportUrl) {
      window.location.href = exportUrl;
    }
  }

  return (
    <div>
      {exportUrl && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "10px",
          }}
        >
          <button
            onClick={handleExport}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "7px",
              border: "1px solid #222a3e",
              backgroundColor: "#171f33",
              color: "#8c90a2",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6.5 1V9M6.5 9L3.5 6M6.5 9L9.5 6"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M1.5 10.5H11.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            Export CSV
          </button>
        </div>
      )}

      <div
        style={{
          backgroundColor: "#171f33",
          border: "1px solid #222a3e",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #222a3e" }}>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      padding: "10px 16px",
                      textAlign: col.align ?? "left",
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "#8c90a2",
                      backgroundColor: "#0d1627",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{
                      padding: "48px 24px",
                      textAlign: "center",
                      color: "#4a5068",
                      fontSize: "13px",
                    }}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom:
                        idx < rows.length - 1 ? "1px solid #1a2237" : "none",
                      backgroundColor: "transparent",
                    }}
                  >
                    {columns.map((col) => {
                      const cellValue = row[col.key];
                      return (
                        <td
                          key={col.key}
                          style={{
                            padding: "12px 16px",
                            textAlign: col.align ?? "left",
                            color: "#dbe2fd",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {cellValue == null
                            ? "—"
                            : typeof cellValue === "string" ||
                              typeof cellValue === "number"
                            ? cellValue
                            : String(cellValue)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
