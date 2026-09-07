import { describe, it, expect } from 'vitest';
import { occursIn, expand, summarize, horizonMonths } from './engine';
import type { Plan, PlanItem } from './plan';

function item(partial: Partial<PlanItem>): PlanItem {
  return {
    id: partial.id ?? 'x',
    label: partial.label ?? 'X',
    direction: partial.direction ?? 'out',
    amount: partial.amount ?? 100,
    recurrence: partial.recurrence ?? { kind: 'monthly' },
    window: partial.window ?? { from: '2026-01' },
    note: partial.note,
  };
}

function plan(items: PlanItem[], overrides: Partial<Plan['settings']> = {}): Plan {
  return {
    schemaVersion: 1,
    settings: {
      currency: 'SAR', locale: 'en', startMonth: '2026-01', horizonMonths: 6, startingBalance: 0,
      ...overrides,
    },
    items,
  };
}

describe('occursIn', () => {
  it('monthly: every month inside the window, inclusive both ends', () => {
    const i = item({ recurrence: { kind: 'monthly' }, window: { from: '2026-02', to: '2026-04' } });
    expect(occursIn(i, '2026-01')).toBe(false);
    expect(occursIn(i, '2026-02')).toBe(true);
    expect(occursIn(i, '2026-04')).toBe(true);
    expect(occursIn(i, '2026-05')).toBe(false);
  });

  it('monthly without "to" runs forever', () => {
    const i = item({ recurrence: { kind: 'monthly' }, window: { from: '2026-02' } });
    expect(occursIn(i, '2030-12')).toBe(true);
  });

  it('once: only that month, window ignored', () => {
    const i = item({ recurrence: { kind: 'once', month: '2026-03' }, window: { from: '2026-01', to: '2026-01' } });
    expect(occursIn(i, '2026-03')).toBe(true);
    expect(occursIn(i, '2026-02')).toBe(false);
  });

  it('everyN: anchored at window.from', () => {
    const i = item({ recurrence: { kind: 'everyN', n: 3 }, window: { from: '2026-03' } });
    expect(['2026-02', '2026-03', '2026-04', '2026-06', '2026-09', '2026-12', '2027-03'].map((m) => occursIn(i, m)))
      .toEqual([false, true, false, true, true, true, true]);
  });

  it('specificMonths: month-of-year, repeats annually, bounded by window', () => {
    const i = item({ recurrence: { kind: 'specificMonths', months: [1, 9] }, window: { from: '2026-06', to: '2027-12' } });
    expect(occursIn(i, '2026-01')).toBe(false); // before window
    expect(occursIn(i, '2026-09')).toBe(true);
    expect(occursIn(i, '2027-01')).toBe(true);
    expect(occursIn(i, '2027-09')).toBe(true);
    expect(occursIn(i, '2027-10')).toBe(false);
  });
});

describe('horizonMonths', () => {
  it('lists startMonth + horizonMonths', () => {
    expect(horizonMonths(plan([]).settings)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']);
  });
});

describe('expand', () => {
  it('carries the running balance and starts from startingBalance', () => {
    const rows = expand(plan([
      item({ id: 's', label: 'Salary', direction: 'in', amount: 1000 }),
      item({ id: 'r', label: 'Rent', direction: 'out', amount: 1500 }),
    ], { startingBalance: 800, horizonMonths: 3 }));

    expect(rows.map((r) => r.month)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(rows.map((r) => r.opening)).toEqual([800, 300, -200]);
    expect(rows.map((r) => r.closing)).toEqual([300, -200, -700]);
    expect(rows[0].totalIn).toBe(1000);
    expect(rows[0].totalOut).toBe(1500);
    expect(rows[0].net).toBe(-500);
    expect(rows[0].occurrences.map((o) => o.itemId)).toEqual(['s', 'r']);
  });

  it('clips items to the horizon and handles a negative starting balance', () => {
    const rows = expand(plan([
      item({ id: 'b', label: 'Bonus', direction: 'in', amount: 500, recurrence: { kind: 'once', month: '2026-09' } }),
    ], { startingBalance: -100, horizonMonths: 3 }));
    expect(rows.every((r) => r.occurrences.length === 0)).toBe(true);
    expect(rows.map((r) => r.closing)).toEqual([-100, -100, -100]);
  });

  it('treats non-finite amounts as zero', () => {
    const rows = expand(plan([item({ amount: Number.NaN, direction: 'out' })], { horizonMonths: 1 }));
    expect(rows[0].totalOut).toBe(0);
    expect(rows[0].closing).toBe(0);
  });
});

describe('summarize', () => {
  const row = (month: string, closing: number) => ({
    month, opening: 0, occurrences: [], totalIn: 0, totalOut: 0, net: 0, closing,
  });

  it('all positive (zero counts as not negative)', () => {
    const s = summarize([row('2026-01', 10), row('2026-02', 0), row('2026-03', 5)]);
    expect(s.allPositive).toBe(true);
    expect(s.firstNegative).toBeUndefined();
    expect(s.recovery).toBeUndefined();
    expect(s.lowest).toEqual({ month: '2026-02', balance: 0 });
  });

  it('negative and recovers', () => {
    const s = summarize([row('2026-01', 10), row('2026-02', -50), row('2026-03', -80), row('2026-04', 5)]);
    expect(s.allPositive).toBe(false);
    expect(s.firstNegative).toBe('2026-02');
    expect(s.lowest).toEqual({ month: '2026-03', balance: -80 });
    expect(s.recovery).toBe('2026-04');
  });

  it('negative and never recovers', () => {
    const s = summarize([row('2026-01', 10), row('2026-02', -50), row('2026-03', -20)]);
    expect(s.firstNegative).toBe('2026-02');
    expect(s.recovery).toBeUndefined();
  });

  it('negative from month 0', () => {
    const s = summarize([row('2026-01', -1), row('2026-02', 1)]);
    expect(s.firstNegative).toBe('2026-01');
    expect(s.recovery).toBe('2026-02');
  });

  it('lowest picks the first of equal minima', () => {
    const s = summarize([row('2026-01', -5), row('2026-02', -5)]);
    expect(s.lowest.month).toBe('2026-01');
  });
});
