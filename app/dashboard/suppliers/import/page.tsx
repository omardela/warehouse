import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { CsvImportWizard } from "@/app/dashboard/_components/csv-import/CsvImportWizard";
import {
  SUPPLIER_IMPORT_COLUMNS,
  commitSupplierImportAction,
  validateSupplierImportAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function SupplierImportPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "settings.import");

  return (
    <CsvImportWizard
      entityLabel="Suppliers"
      backHref="/dashboard/suppliers"
      backLabel="Back to Suppliers"
      columns={SUPPLIER_IMPORT_COLUMNS}
      validateAction={validateSupplierImportAction}
      commitAction={commitSupplierImportAction}
      helpText="Required column: Name. Optional: Email, Phone, Address, Payment Terms."
    />
  );
}
