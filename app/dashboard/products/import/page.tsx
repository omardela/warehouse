import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { requirePagePermission } from "@/core/auth/require-page-permission";
import { CsvImportWizard } from "@/app/dashboard/_components/csv-import/CsvImportWizard";
import { getLocale } from "@/core/i18n/locale";
import { getDictionary } from "@/core/i18n/get-dictionary";
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

  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <CsvImportWizard
      entityLabel={t.products.importProducts}
      backHref="/dashboard/products"
      backLabel={t.products.backToProducts}
      columns={PRODUCT_IMPORT_COLUMNS}
      validateAction={validateProductImportAction}
      commitAction={commitProductImportAction}
      helpText={t.products.importHelpText}
    />
  );
}
