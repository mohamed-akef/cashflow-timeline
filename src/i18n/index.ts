import { useUiStore, type Locale } from '../store/uiStore';
import { en, type MessageKey } from './en';
import { ar } from './ar';

export type { MessageKey } from './en';

const dictionaries: Record<Locale, Record<MessageKey, string>> = { en, ar };

export function t(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const template = dictionaries[locale][key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

export function useLocale(): Locale {
  return useUiStore((s) => s.locale);
}

export function useT() {
  const locale = useLocale();
  return (key: MessageKey, vars?: Record<string, string | number>) => t(locale, key, vars);
}

export function applyLocaleToDocument(locale: Locale): void {
  const html = document.documentElement;
  html.lang = locale;
  html.dir = locale === 'ar' ? 'rtl' : 'ltr';
}
