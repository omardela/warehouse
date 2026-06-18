import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { CsvImportWizard } from "@/app/dashboard/_components/csv-import/CsvImportWizard";
import {
  CUSTOMER_IMPORT_COLUMNS,
  commitCustomerImportAction,
  validateCustomerImportAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function CustomerImportPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "settings.import");

  return (
    <CsvImportWizard
      entityLabel="Customers"
      backHref="/dashboard/customers"
      backLabel="Back to Customers"
      columns={CUSTOMER_IMPORT_COLUMNS}
      validateAction={validateCustomerImportAction}
      commitAction={commitCustomerImportAction}
      helpText="Required column: Name. Optional: Email, Phone, Address, Payment Terms, Credit Limit."
    />
  );
}
