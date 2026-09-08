import type { MonthKey } from '../domain/month';
import type { Locale } from '../store/uiStore';

/** Gregorian calendar + Latin digits are forced for Arabic; ar-SA would default to Umm al-Qura. */
const INTL_LOCALE: Record<Locale, string> = {
  en: 'en-US',
  ar: 'ar-u-ca-gregory-nu-latn',
};

export function formatMoney(amount: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { style: 'currency', currency }).format(amount);
}

function monthDate(month: MonthKey): Date {
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return new Date(Date.UTC(year, m - 1, 1));
}

export function formatMonth(month: MonthKey, locale: Locale, style: 'short' | 'long' = 'short'): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: style, year: 'numeric', timeZone: 'UTC' })
    .format(monthDate(month));
}

export function monthName(monthOfYear: number, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2026, monthOfYear - 1, 1)));
}
