import { AutoPrint } from "@/components/labels/auto-print";
import { PrintButton } from "@/components/documents/print-button";
import "@/components/documents/print-document.css";

export function PrintPageShell({
  dir,
  printLabel,
  children,
}: {
  dir: "ltr" | "rtl";
  printLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="doc-overlay" dir={dir}>
      <AutoPrint />
      <div className="doc-toolbar no-print">
        <PrintButton label={printLabel} />
      </div>
      <div className="doc-page">{children}</div>
    </div>
  );
}
