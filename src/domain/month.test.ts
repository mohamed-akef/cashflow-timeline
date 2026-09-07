import { describe, it, expect } from 'vitest';
import {
  isMonthKey, toIndex, fromIndex, addMonths, diffMonths,
  monthOfYear, monthRange, currentMonth,
} from './month';

describe('isMonthKey', () => {
  it('accepts YYYY-MM', () => {
    expect(isMonthKey('2026-01')).toBe(true);
    expect(isMonthKey('2026-12')).toBe(true);
  });
  it('rejects bad shapes', () => {
    expect(isMonthKey('2026-13')).toBe(false);
    expect(isMonthKey('2026-1')).toBe(false);
    expect(isMonthKey('2026-01-01')).toBe(false);
    expect(isMonthKey(202601)).toBe(false);
    expect(isMonthKey(null)).toBe(false);
  });
});

describe('index round-trip', () => {
  it('converts both ways', () => {
    expect(fromIndex(toIndex('2026-03'))).toBe('2026-03');
    expect(toIndex('2026-01') - toIndex('2025-12')).toBe(1);
  });
});

describe('addMonths / diffMonths', () => {
  it('crosses year boundaries', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(diffMonths('2026-03', '2026-06')).toBe(3);
    expect(diffMonths('2026-06', '2026-03')).toBe(-3);
  });
});

describe('monthOfYear', () => {
  it('returns 1-12', () => {
    expect(monthOfYear('2026-01')).toBe(1);
    expect(monthOfYear('2026-09')).toBe(9);
  });
});

describe('monthRange', () => {
  it('lists count months from start', () => {
    expect(monthRange('2026-11', 4)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    expect(monthRange('2026-01', 0)).toEqual([]);
  });
});

describe('currentMonth', () => {
  it('formats the given date', () => {
    expect(currentMonth(new Date(2026, 8, 7))).toBe('2026-09');
  });
});
