import type { SupportedLocale } from "../i18n/locales";
import { resolveLocale, getBrowserLanguage } from "../i18n/locales";

const LANGUAGE_SETTINGS_KEY = "vesti_language_settings";

interface LanguageSettings {
  locale: SupportedLocale;
  userOverridden: boolean;
}

function resolveStorageArea(): chrome.storage.StorageArea | null {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return null;
  return chrome.storage.local;
}

export const DEFAULT_LANGUAGE_SETTINGS: LanguageSettings = {
  locale: "en",
  userOverridden: false,
};

function normalizeLanguageSettings(value: unknown): LanguageSettings {
  const draft =
    value && typeof value === "object"
      ? (value as Partial<LanguageSettings>)
      : DEFAULT_LANGUAGE_SETTINGS;
  return {
    locale: resolveLocale(draft.locale ?? "en"),
    userOverridden: Boolean(draft.userOverridden),
  };
}

function applyStorageWrite(
  storage: chrome.storage.StorageArea,
  payload: LanguageSettings
): Promise<void> {
  return new Promise((resolve, reject) => {
    storage.set({ [LANGUAGE_SETTINGS_KEY]: payload }, () => {
      if (chrome.runtime?.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

export async function getLanguageSettings(): Promise<LanguageSettings> {
  const storage = resolveStorageArea();
  if (!storage) return DEFAULT_LANGUAGE_SETTINGS;
  return new Promise((resolve) => {
    storage.get([LANGUAGE_SETTINGS_KEY], (result) => {
      if (chrome.runtime?.lastError) {
        resolve(DEFAULT_LANGUAGE_SETTINGS);
        return;
      }
      resolve(normalizeLanguageSettings(result?.[LANGUAGE_SETTINGS_KEY]));
    });
  });
}

export async function setLanguage(
  locale: SupportedLocale,
  userOverridden = true
): Promise<void> {
  const next: LanguageSettings = { locale, userOverridden };
  const storage = resolveStorageArea();
  if (!storage) return;
  await applyStorageWrite(storage, next);
}

export async function detectAndSetLanguage(): Promise<SupportedLocale> {
  const browserLang = getBrowserLanguage();
  const matched = resolveLocale(browserLang);
  const existing = await getLanguageSettings();
  if (!existing.userOverridden) {
    await setLanguage(matched, false);
    return matched;
  }
  return existing.locale;
}

export function subscribeLanguageSettings(
  listener: (settings: LanguageSettings) => void
): () => void {
  if (typeof chrome === "undefined" || !chrome.storage?.onChanged) {
    return () => {};
  }
  const handleStorageChanged: Parameters<
    typeof chrome.storage.onChanged.addListener
  >[0] = (changes, areaName) => {
    if (areaName !== "local") return;
    const nextSettings = changes[LANGUAGE_SETTINGS_KEY]?.newValue;
    if (typeof nextSettings === "undefined") return;
    listener(normalizeLanguageSettings(nextSettings));
  };
  chrome.storage.onChanged.addListener(handleStorageChanged);
  return () => {
    chrome.storage.onChanged.removeListener(handleStorageChanged);
  };
}
