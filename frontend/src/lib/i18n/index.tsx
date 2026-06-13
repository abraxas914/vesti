import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { SupportedLocale } from "./locales";
import { enTranslations } from "./translations/en";
import type { TranslationsType } from "./translations/en";
import { zhTranslations } from "./translations/zh";
import { detectAndSetLanguage, setLanguage, subscribeLanguageSettings } from "../services/languageSettingsService";

// Widened, string-leaf translations shape (same nested keys as en, any strings)
// so both en (literal) and zh assign cleanly and consumers read plain strings.
export type Translations = TranslationsType;

const translationsMap: Record<SupportedLocale, Translations> = {
  en: enTranslations,
  zh: zhTranslations,
};

interface I18nContextValue {
  locale: SupportedLocale;
  t: Translations;
  setLocale: (locale: SupportedLocale) => Promise<void>;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>("en");
  const [t, setT] = useState<Translations>(enTranslations);

  useEffect(() => {
    let cancelled = false;

    // detectAndSetLanguage 首次安装时检测浏览器语言并写入 storage；
    // 如果用户已手动选择过语言（userOverridden=true），则直接返回用户偏好。
    detectAndSetLanguage()
      .then((resolvedLocale) => {
        if (cancelled) return;
        setLocaleState(resolvedLocale);
        setT(translationsMap[resolvedLocale]);
      })
      .catch(() => {});

    const unsubscribe = subscribeLanguageSettings((settings) => {
      if (cancelled) return;
      setLocaleState(settings.locale);
      setT(translationsMap[settings.locale]);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const changeLocale = useCallback(async (newLocale: SupportedLocale) => {
    await setLanguage(newLocale);
    setLocaleState(newLocale);
    setT(translationsMap[newLocale]);
  }, []);

  return (
    <I18nContext.Provider value={{ locale, t, setLocale: changeLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
