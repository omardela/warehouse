"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/core/i18n/locale";
import type { Dictionary } from "@/core/i18n/get-dictionary";

export type LocaleContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  dict: Dictionary;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: LocaleContextValue;
}) {
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocaleContext must be used within a LocaleProvider");
  }
  return ctx;
}

/** Returns the active dictionary for the current locale. */
export function useTranslations(): Dictionary {
  return useLocaleContext().dict;
}

export function useLocale(): { locale: Locale; dir: "ltr" | "rtl" } {
  const { locale, dir } = useLocaleContext();
  return { locale, dir };
}
