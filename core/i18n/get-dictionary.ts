import en from "./dictionaries/en/index";
import ar from "./dictionaries/ar/index";
import type { Locale } from "./locale";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, ar };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}
