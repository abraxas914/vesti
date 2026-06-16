export const SUPPORTED_LOCALES = ["en", "zh", "ja"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "en";

const LOCALE_ALIASES: Record<string, SupportedLocale> = {
  zh: "zh",
  "zh-CN": "zh",
  "zh-TW": "zh",
  "zh-HK": "zh",
  "zh-SG": "zh",
  en: "en",
  "en-US": "en",
  "en-GB": "en",
  "en-CA": "en",
  "en-AU": "en",
  ja: "ja",
  "ja-JP": "ja",
};

export function resolveLocale(raw: string): SupportedLocale {
  if (SUPPORTED_LOCALES.includes(raw as SupportedLocale)) return raw as SupportedLocale;
  if (LOCALE_ALIASES[raw]) return LOCALE_ALIASES[raw];
  const prefix = raw.split("-")[0];
  if (SUPPORTED_LOCALES.includes(prefix as SupportedLocale)) return prefix as SupportedLocale;
  return DEFAULT_LOCALE;
}

export function getBrowserLanguage(): string {
  if (typeof chrome !== "undefined" && chrome.i18n?.getUILanguage) {
    return chrome.i18n.getUILanguage();
  }
  return navigator.language || "en";
}
