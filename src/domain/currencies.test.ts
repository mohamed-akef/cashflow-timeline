import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('currencies', () => {
  it('lists far more than the old seven, common ones first, no duplicates', async () => {
    const { currencyCodes } = await import('./currencies');
    const codes = currencyCodes();
    expect(codes.length).toBeGreaterThan(100);
    expect(codes.slice(0, 7)).toEqual(['SAR', 'USD', 'EUR', 'GBP', 'AED', 'EGP', 'KWD']);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('finds a currency by code, English name or Arabic name', async () => {
    const { searchCurrencies } = await import('./currencies');
    expect(searchCurrencies('egp')[0]).toBe('EGP');
    expect(searchCurrencies('egyptian')).toContain('EGP');
    expect(searchCurrencies('جنيه')).toContain('EGP');
    expect(searchCurrencies('yen')).toContain('JPY');
    expect(searchCurrencies('zzzz')).toEqual([]);
  });

  it('puts code matches ahead of name matches', async () => {
    const { searchCurrencies } = await import('./currencies');
    const hits = searchCurrencies('eu');
    expect(hits[0]).toBe('EUR');
  });

  it('falls back to the common list when the browser has no currency data', async () => {
    vi.spyOn(Intl, 'supportedValuesOf' as never).mockImplementation((() => { throw new Error('no'); }) as never);
    const { currencyCodes } = await import('./currencies');
    expect(currencyCodes()).toEqual(['SAR', 'USD', 'EUR', 'GBP', 'AED', 'EGP', 'KWD']);
  });
});
