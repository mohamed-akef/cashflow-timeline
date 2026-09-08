/** A calendar month as "YYYY-MM". The only module that knows this format. */
export type MonthKey = string;

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(v: unknown): v is MonthKey {
  return typeof v === 'string' && MONTH_RE.test(v);
}

/** Months since year 0: 2026-03 → 2026*12 + 2. Lets month arithmetic be plain integer math. */
export function toIndex(m: MonthKey): number {
  const year = Number(m.slice(0, 4));
  const month = Number(m.slice(5, 7));
  return year * 12 + (month - 1);
}

export function fromIndex(i: number): MonthKey {
  const year = Math.floor(i / 12);
  const month = (i % 12) + 1;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

export function addMonths(m: MonthKey, n: number): MonthKey {
  return fromIndex(toIndex(m) + n);
}

/** to − from, in months. Positive when `to` is later. */
export function diffMonths(from: MonthKey, to: MonthKey): number {
  return toIndex(to) - toIndex(from);
}

/** 1–12 */
export function monthOfYear(m: MonthKey): number {
  return Number(m.slice(5, 7));
}

export function monthRange(start: MonthKey, count: number): MonthKey[] {
  const first = toIndex(start);
  return Array.from({ length: Math.max(0, count) }, (_, i) => fromIndex(first + i));
}

export function currentMonth(now: Date = new Date()): MonthKey {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
