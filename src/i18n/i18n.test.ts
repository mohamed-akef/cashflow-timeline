import { describe, it, expect } from 'vitest';
import { en } from './en';
import { ar } from './ar';
import { t, applyLocaleToDocument } from './index';
import { formatMoney, formatMonth, monthName } from './format';

describe('dictionaries', () => {
  it('ar has every en key and no empty strings', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(ar[key], key).toBeTypeOf('string');
      expect(ar[key].length, key).toBeGreaterThan(0);
    }
    expect(Object.keys(ar).length).toBe(Object.keys(en).length);
  });
});

describe('t', () => {
  it('interpolates {vars}', () => {
    expect(t('en', 'summaryAllPositive', { n: 6 })).toBe('All 6 months positive ✓');
    expect(t('ar', 'summaryAllPositive', { n: 6 })).toContain('6');
  });
});

describe('applyLocaleToDocument', () => {
  it('sets lang and dir on <html>', () => {
    applyLocaleToDocument('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    applyLocaleToDocument('en');
    expect(document.documentElement.dir).toBe('ltr');
  });
});

describe('format', () => {
  it('formatMoney uses the currency and locale', () => {
    expect(formatMoney(1234.5, 'USD', 'en')).toBe('$1,234.50');
    expect(formatMoney(-50, 'USD', 'en')).toBe('-$50.00');
    // Arabic: Latin digits forced, so the digits are still 0-9
    expect(formatMoney(1234, 'SAR', 'ar')).toMatch(/1,?234/);
  });
  it('formatMonth is Gregorian in both locales', () => {
    expect(formatMonth('2026-09', 'en')).toBe('Sep 2026');
    expect(formatMonth('2026-09', 'en', 'long')).toBe('September 2026');
    expect(formatMonth('2026-09', 'ar')).toContain('2026');
  });
  it('monthName', () => {
    expect(monthName(1, 'en')).toBe('Jan');
    expect(monthName(12, 'en')).toBe('Dec');
  });
});
