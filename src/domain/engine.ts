import { monthOfYear, monthRange, toIndex, type MonthKey } from './month';
import type { Direction, Plan, PlanItem, PlanSettings } from './plan';

export interface Occurrence {
  itemId: string;
  label: string;
  direction: Direction;
  amount: number;
}

export interface MonthRow {
  month: MonthKey;
  opening: number;
  occurrences: Occurrence[];
  totalIn: number;
  totalOut: number;
  net: number;
  closing: number;
}

export interface Summary {
  allPositive: boolean;
  firstNegative?: MonthKey;
  lowest: { month: MonthKey; balance: number };
  recovery?: MonthKey;
  /** Where the plan lands: the closing balance of its last month. */
  ending: number;
  /** Totals over the whole horizon, not per month. */
  totalIn: number;
  totalOut: number;
  /** What the plan adds to (or takes from) the starting balance overall. */
  netChange: number;
  /** netChange spread over the horizon: the build-up or burn rate. */
  averageNet: number;
}

/** Does `item` produce an occurrence in `month`? Pure; ignores the horizon. */
export function occursIn(item: PlanItem, month: MonthKey): boolean {
  const r = item.recurrence;
  if (r.kind === 'once') return r.month === month;

  const idx = toIndex(month);
  const from = toIndex(item.window.from);
  if (idx < from) return false;
  if (item.window.to !== undefined && idx > toIndex(item.window.to)) return false;

  switch (r.kind) {
    case 'monthly':
      return true;
    case 'everyN':
      return (idx - from) % r.n === 0;
    case 'specificMonths':
      return r.months.includes(monthOfYear(month));
  }
}

/**
 * The amount `item` contributes in `month`, or `null` when it contributes
 * nothing: an override wins, otherwise the rule decides.
 */
export function amountIn(item: PlanItem, month: MonthKey): number | null {
  const override = item.overrides?.[month];
  if (override !== undefined) return override;
  return occursIn(item, month) ? item.amount : null;
}

export function horizonMonths(settings: PlanSettings): MonthKey[] {
  return monthRange(settings.startMonth, settings.horizonMonths);
}

const safeAmount = (n: number): number => (Number.isFinite(n) ? n : 0);

export function expand(plan: Plan): MonthRow[] {
  let opening = plan.settings.startingBalance;
  return horizonMonths(plan.settings).map((month) => {
    const occurrences: Occurrence[] = [];
    for (const item of plan.items) {
      const amount = amountIn(item, month);
      if (amount === null) continue;
      occurrences.push({ itemId: item.id, label: item.label, direction: item.direction, amount: safeAmount(amount) });
    }
    const totalIn = occurrences.filter((o) => o.direction === 'in').reduce((s, o) => s + o.amount, 0);
    const totalOut = occurrences.filter((o) => o.direction === 'out').reduce((s, o) => s + o.amount, 0);
    const net = totalIn - totalOut;
    const closing = opening + net;
    const row: MonthRow = { month, opening, occurrences, totalIn, totalOut, net, closing };
    opening = closing;
    return row;
  });
}

/** `rows` must be non-empty. */
export function summarize(rows: MonthRow[]): Summary {
  let lowest = { month: rows[0].month, balance: rows[0].closing };
  let firstNegative: MonthKey | undefined;
  let recovery: MonthKey | undefined;
  let totalIn = 0;
  let totalOut = 0;

  for (const row of rows) {
    totalIn += row.totalIn;
    totalOut += row.totalOut;
    if (row.closing < lowest.balance) lowest = { month: row.month, balance: row.closing };
    if (firstNegative === undefined && row.closing < 0) firstNegative = row.month;
    else if (firstNegative !== undefined && recovery === undefined && row.closing >= 0) recovery = row.month;
  }

  const netChange = totalIn - totalOut;
  return {
    allPositive: firstNegative === undefined,
    firstNegative,
    lowest,
    recovery,
    ending: rows[rows.length - 1].closing,
    totalIn,
    totalOut,
    netChange,
    averageNet: netChange / rows.length,
  };
}
