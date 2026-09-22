import { describe, it, expect } from 'vitest';
import { en } from './en';
import { ar } from './ar';
import { t, applyLocaleToDocument } from './index';
import { formatMoney, formatMonth, groupAmountInput, monthName, parseAmountInput } from './format';

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
    expect(t('en', 'summaryAllPositive', { n: 6 })).toBe('Positive in all 6 months ✓');
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

describe('amount input grouping', () => {
  const round = (typed: string, allowNegative = false) =>
    groupAmountInput(parseAmountInput(typed, allowNegative), 'en');

  it('groups the integer part as it is typed', () => {
    expect(round('85000')).toBe('85,000');
    expect(round('1234567')).toBe('1,234,567');
    expect(round('850')).toBe('850');
  });

  it('leaves a half-written decimal alone', () => {
    expect(round('85000.')).toBe('85,000.');
    expect(round('85000.5')).toBe('85,000.5');
    expect(round('.5')).toBe('.5');
  });

  it('survives its own output, so typing on does not corrupt the value', () => {
    expect(parseAmountInput('85,000')).toBe('85000');
    expect(round('85,0009')).toBe('850,009');
  });

  it('drops stray characters and a second decimal point', () => {
    expect(parseAmountInput('8a5 0$0.0.1')).toBe('8500.01');
    expect(round('')).toBe('');
  });

  it('keeps a leading minus only where the field allows one', () => {
    expect(round('-4000', true)).toBe('-4,000');
    expect(round('-4000')).toBe('4,000');
    expect(round('-', true)).toBe('-');
  });
});
