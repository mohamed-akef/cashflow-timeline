import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BalanceChart } from './BalanceChart';
import { usePlanStore } from '../store/planStore';
import { emptyPlan } from '../domain/plan';
import type { MonthRow } from '../domain/engine';

const row = (month: string, closing: number): MonthRow => ({
  month, opening: 0, occurrences: [], totalIn: 0, totalOut: 0, net: 0, closing,
});

beforeEach(() => {
  usePlanStore.setState({ plan: emptyPlan(new Date(2026, 0, 1)), setupOpen: false });
});

describe('BalanceChart', () => {
  it('draws one point per month and no negative area when all positive', () => {
    render(<BalanceChart rows={[row('2026-01', 10), row('2026-02', 20), row('2026-03', 30)]} />);
    const line = screen.getByTestId('balance-line');
    expect(line.getAttribute('points')!.trim().split(/\s+/)).toHaveLength(3);
    expect(screen.queryByTestId('negative-area')).toBeNull();
    expect(screen.getAllByTestId('month-hit')).toHaveLength(3);
  });

  it('shades the negative area when any month is negative', () => {
    render(<BalanceChart rows={[row('2026-01', 10), row('2026-02', -20)]} />);
    expect(screen.getByTestId('negative-area')).toBeInTheDocument();
  });

  it('reverses x order in Arabic', () => {
    render(<BalanceChart rows={[row('2026-01', 0), row('2026-02', 0)]} />);
    const ltr = screen.getByTestId('balance-line').getAttribute('points')!;
    usePlanStore.setState((s) => ({ plan: { ...s.plan, settings: { ...s.plan.settings, locale: 'ar' } } }));
    render(<BalanceChart rows={[row('2026-01', 0), row('2026-02', 0)]} />);
    const rtl = screen.getAllByTestId('balance-line')[1].getAttribute('points')!;
    const xs = (p: string) => p.trim().split(/\s+/).map((pt) => Number(pt.split(',')[0]));
    expect(xs(rtl)).toEqual([...xs(ltr)].reverse());
  });
});
