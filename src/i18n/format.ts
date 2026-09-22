import type { MonthKey } from '../domain/month';
import type { Locale } from '../store/uiStore';

/** Gregorian calendar + Latin digits are forced for Arabic; ar-SA would default to Umm al-Qura. */
const INTL_LOCALE: Record<Locale, string> = {
  en: 'en-US',
  ar: 'ar-u-ca-gregory-nu-latn',
};

/** `signed` marks a change rather than a level: +2,000 reads differently from 2,000. */
export function formatMoney(amount: number, currency: string, locale: Locale, signed = false): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(amount);
}

/**
 * A bare figure for dense tables: no currency code (the table states it once)
 * and no ".00" — decimals appear only when the amount has them.
 */
export function formatAmount(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 2 }).format(amount);
}

/**
 * Strip grouping from a part-typed amount so `Number()` still reads it:
 * "85,000.5" -> "85000.5". Anything that is not a digit or a decimal point
 * goes, a second point is folded away, and a leading minus survives only
 * where the field allows one.
 */
export function parseAmountInput(text: string, allowNegative = false): string {
  const sign = allowNegative && text.trimStart().startsWith('-') ? '-' : '';
  const [whole, ...rest] = text.replace(/[^\d.]/g, '').split('.');
  return sign + (rest.length > 0 ? `${whole}.${rest.join('')}` : whole);
}

/**
 * Group the integer part of a part-typed amount and leave the rest alone, so
 * a half-written "8." or "85000.5" survives the keystroke that follows.
 */
export function groupAmountInput(text: string, locale: Locale): string {
  const [whole, fraction] = text.split('.');
  const grouped = whole === '' || whole === '-' ? whole : formatAmount(Number(whole), locale);
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/** A short axis figure: 14K, 1.2M. Latin digits in both locales. */
export function formatCompact(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { notation: 'compact', maximumFractionDigits: 1 }).format(amount);
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
