import type { Locale } from "@/core/i18n/locale";

function intlLocale(locale: Locale): string {
  return locale === "ar" ? "ar" : "en-US";
}

export function formatCurrency(value: number, locale: Locale = "en"): string {
  return value.toLocaleString(intlLocale(locale), {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export function formatDate(date: Date, locale: Locale = "en"): string {
  return date.toLocaleDateString(intlLocale(locale), { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(date: Date, locale: Locale = "en"): string {
  return date.toLocaleString(intlLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatQty(value: number): string {
  return value % 1 === 0 ? value.toString() : value.toFixed(4).replace(/\.?0+$/, "");
}
