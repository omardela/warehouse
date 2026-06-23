import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { CsvImportWizard } from "@/app/dashboard/_components/csv-import/CsvImportWizard";
import { getLocale } from "@/core/i18n/locale";
import { getDictionary } from "@/core/i18n/get-dictionary";
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

  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <CsvImportWizard
      entityLabel={t.common.suppliers}
      backHref="/dashboard/suppliers"
      backLabel={t.suppliers.import.backLabel}
      columns={SUPPLIER_IMPORT_COLUMNS}
      validateAction={validateSupplierImportAction}
      commitAction={commitSupplierImportAction}
      helpText={t.suppliers.import.helpText}
    />
  );
}
