import { CURRENCIES } from './plan';

/**
 * Every ISO 4217 currency the browser knows, with the usual ones first.
 * Names come from Intl too, so the list needs no data file and no network.
 */
const COMMON: readonly string[] = CURRENCIES;

function supported(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'currency') => string[] };
  try {
    return intl.supportedValuesOf?.('currency') ?? [...COMMON];
  } catch {
    return [...COMMON];
  }
}

let all: string[] | undefined;

/** Common currencies first, then the rest in code order. */
export function currencyCodes(): string[] {
  all ??= [...COMMON, ...supported().filter((c) => !COMMON.includes(c)).sort()];
  return all;
}

const namers = new Map<string, Intl.DisplayNames | null>();

/** The currency's name in `lang` ("Egyptian Pound", "جنيه مصري"), or the code if unknown. */
export function currencyName(code: string, lang: 'en' | 'ar'): string {
  if (!namers.has(lang)) {
    try {
      namers.set(lang, new Intl.DisplayNames([lang], { type: 'currency' }));
    } catch {
      namers.set(lang, null);
    }
  }
  return namers.get(lang)?.of(code) ?? code;
}

const fold = (s: string) => s.toLocaleLowerCase().normalize('NFKD').replace(/[̀-ًͯ-ٟ]/g, '');

/**
 * Codes matching `query` by code or by name in either language, so "pound",
 * "egp" and "جنيه" all find EGP whatever the interface language. Code matches
 * sort ahead of name matches; an empty query returns the full list.
 */
export function searchCurrencies(query: string): string[] {
  const q = fold(query.trim());
  if (!q) return currencyCodes();
  const byCode: string[] = [];
  const byName: string[] = [];
  for (const code of currencyCodes()) {
    if (fold(code).startsWith(q)) byCode.push(code);
    else if (fold(`${currencyName(code, 'en')} ${currencyName(code, 'ar')}`).includes(q)) byName.push(code);
  }
  return [...byCode, ...byName];
}
