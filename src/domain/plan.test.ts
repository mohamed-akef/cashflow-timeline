import { describe, it, expect } from 'vitest';
import { planSchema, planItemSchema, emptyPlan, defaultSettings, newId } from './plan';

const validItem = {
  id: 'a1',
  label: 'Salary',
  direction: 'in',
  amount: 10000,
  recurrence: { kind: 'monthly' },
  window: { from: '2026-01' },
};

describe('planSchema', () => {
  it('accepts an empty default plan', () => {
    expect(planSchema.safeParse(emptyPlan(new Date(2026, 0, 1))).success).toBe(true);
  });

  it('accepts every recurrence kind', () => {
    const kinds = [
      { kind: 'monthly' },
      { kind: 'once', month: '2026-03' },
      { kind: 'everyN', n: 3 },
      { kind: 'specificMonths', months: [1, 9] },
    ];
    for (const recurrence of kinds) {
      expect(planItemSchema.safeParse({ ...validItem, recurrence }).success).toBe(true);
    }
  });

  it('rejects wrong schemaVersion', () => {
    const plan = { ...emptyPlan(), schemaVersion: 2 };
    expect(planSchema.safeParse(plan).success).toBe(false);
  });

  it('rejects bad items', () => {
    expect(planItemSchema.safeParse({ ...validItem, amount: -5 }).success).toBe(false);
    expect(planItemSchema.safeParse({ ...validItem, amount: Infinity }).success).toBe(false);
    expect(planItemSchema.safeParse({ ...validItem, label: '' }).success).toBe(false);
    expect(planItemSchema.safeParse({ ...validItem, window: { from: '2026-1' } }).success).toBe(false);
    expect(planItemSchema.safeParse({ ...validItem, window: { from: '2026-06', to: '2026-03' } }).success).toBe(false);
    expect(planItemSchema.safeParse({ ...validItem, recurrence: { kind: 'everyN', n: 1 } }).success).toBe(false);
    expect(planItemSchema.safeParse({ ...validItem, recurrence: { kind: 'specificMonths', months: [] } }).success).toBe(false);
    expect(planItemSchema.safeParse({ ...validItem, recurrence: { kind: 'specificMonths', months: [13] } }).success).toBe(false);
  });

  it('rejects bad settings', () => {
    const base = emptyPlan();
    expect(planSchema.safeParse({ ...base, settings: { ...base.settings, horizonMonths: 0 } }).success).toBe(false);
    expect(planSchema.safeParse({ ...base, settings: { ...base.settings, horizonMonths: 61 } }).success).toBe(false);
    expect(planSchema.safeParse({ ...base, settings: { ...base.settings, locale: 'fr' } }).success).toBe(false);
  });
});

describe('defaults', () => {
  it('defaultSettings uses the current month, SAR, en, 12 months, 0 balance', () => {
    expect(defaultSettings(new Date(2026, 8, 7))).toEqual({
      currency: 'SAR',
      locale: 'en',
      startMonth: '2026-09',
      horizonMonths: 12,
      startingBalance: 0,
    });
  });

  it('newId is unique', () => {
    expect(newId()).not.toBe(newId());
  });
});
