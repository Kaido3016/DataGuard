import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Locale } from '../types/common';
import { en } from './en';
import { fr } from './fr';

export type MessageKey = keyof typeof fr;
export type Params = Record<string, string | number>;

const DICTIONARIES: Record<Locale, Readonly<Record<MessageKey, string>>> = {
  'fr-CA': fr,
  'en-CA': en,
};

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  return interpolate(DICTIONARIES[locale][key], params);
}

/** Looks up a key built at runtime (e.g. `pii.type.EMAIL`); unknown keys return the fallback. */
export function translateDynamic(locale: Locale, key: string, fallback: string): string {
  const dictionary: Readonly<Record<string, string>> = DICTIONARIES[locale];
  return dictionary[key] ?? fallback;
}

const STORAGE_KEY = 'dg.locale';

function initialLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'fr-CA' || stored === 'en-CA') return stored;
  } catch {
    /* storage unavailable */
  }
  return window.navigator.language.toLowerCase().startsWith('en') ? 'en-CA' : 'fr-CA';
}

interface I18nValue {
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
  readonly t: (key: MessageKey, params?: Params) => string;
  /** Dynamic label lookup: `td('pii.type', 'EMAIL')` -> label for `pii.type.EMAIL`, else the raw value. */
  readonly td: (prefix: string, value: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next); // language preference only: not sensitive
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
      td: (prefix, raw) => translateDynamic(locale, `${prefix}.${raw}`, raw),
    }),
    [locale, setLocale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
