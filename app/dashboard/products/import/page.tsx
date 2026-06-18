import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { CsvImportWizard } from "@/app/dashboard/_components/csv-import/CsvImportWizard";
import {
  PRODUCT_IMPORT_COLUMNS,
  commitProductImportAction,
  validateProductImportAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function ProductImportPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePagePermission(session, "settings.import");

  return (
    <CsvImportWizard
      entityLabel="Products"
      backHref="/dashboard/products"
      backLabel="Back to Products"
      columns={PRODUCT_IMPORT_COLUMNS}
      validateAction={validateProductImportAction}
      commitAction={commitProductImportAction}
      helpText="Required columns: Product Name, SKU. Optional: Category, Base Unit, Barcode, Description."
    />
  );
}
