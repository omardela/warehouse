import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { CsvImportWizard } from "@/app/dashboard/_components/csv-import/CsvImportWizard";
import { getLocale } from "@/core/i18n/locale";
import { getDictionary } from "@/core/i18n/get-dictionary";
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

  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <CsvImportWizard
      entityLabel={t.common.customers}
      backHref="/dashboard/customers"
      backLabel={t.customers.import.backLabel}
      columns={CUSTOMER_IMPORT_COLUMNS}
      validateAction={validateCustomerImportAction}
      commitAction={commitCustomerImportAction}
      helpText={t.customers.import.helpText}
    />
  );
}
