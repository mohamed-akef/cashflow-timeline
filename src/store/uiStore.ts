import { create } from 'zustand';

/**
 * UI preferences that belong to the device, not to the plan: the interface
 * language. It is stored under its own localStorage key so exported plans
 * never carry it. (The colour theme lives in src/theme.ts the same way.)
 */
export type Locale = 'ar' | 'en';
export const LOCALES: readonly Locale[] = ['en', 'ar'];
export const LOCALE_KEY = 'cashflow-timeline:locale';

const isLocale = (v: unknown): v is Locale => (LOCALES as readonly unknown[]).includes(v);

/** Stored choice, else the browser language, else English. */
export function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Private mode or blocked storage: fall through to the browser language.
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

interface UiState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useUiStore = create<UiState>((set) => ({
  locale: readStoredLocale(),
  setLocale: (locale) => {
    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      // Still switch for this page load.
    }
    set({ locale });
  },
}));
