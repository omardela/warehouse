"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="doc-print-button no-print">
      {label}
    </button>
  );
}
