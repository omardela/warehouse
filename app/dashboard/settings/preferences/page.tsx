import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { getLocale } from "@/core/i18n/locale";
import { getDictionary } from "@/core/i18n/get-dictionary";
import { PreferencesForm } from "./PreferencesForm";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <div style={{ minHeight: "100vh", background: "#0b1326", padding: "24px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#dbe2fd", margin: 0 }}>
            {t.settings.preferences.title}
          </h1>
          <p style={{ fontSize: "13px", color: "#8c90a2", marginTop: "4px" }}>
            {t.settings.preferences.subtitle}
          </p>
        </div>

        <PreferencesForm currentLocale={locale} />
      </div>
    </div>
  );
}
