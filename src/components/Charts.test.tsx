import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Charts, niceTicks } from './Charts';
import { usePlanStore } from '../store/planStore';
import { useUiStore } from '../store/uiStore';
import { emptyPlan } from '../domain/plan';
import type { MonthRow } from '../domain/engine';

const row = (month: string, closing: number): MonthRow => ({
  month, opening: 0, occurrences: [], totalIn: 0, totalOut: 0, net: 0, closing,
});

beforeEach(() => {
  usePlanStore.setState({ plan: emptyPlan(new Date(2026, 0, 1)), setupOpen: false });
  useUiStore.setState({ locale: 'en' });
});

describe('Charts', () => {
  it('draws one point per month and no negative area when all positive', () => {
    render(<Charts rows={[row('2026-01', 10), row('2026-02', 20), row('2026-03', 30)]} />);
    const line = screen.getByTestId('balance-line');
    expect(line.getAttribute('points')!.trim().split(/\s+/)).toHaveLength(3);
    expect(screen.queryByTestId('negative-area')).toBeNull();
    expect(screen.getAllByTestId('month-hit')).toHaveLength(3);
  });

  it('shades the negative area when any month is negative', () => {
    render(<Charts rows={[row('2026-01', 10), row('2026-02', -20)]} />);
    expect(screen.getByTestId('negative-area')).toBeInTheDocument();
  });

  it('draws a value axis with compact figures', () => {
    render(<Charts rows={[row('2026-01', 4000), row('2026-02', 14000)]} />);
    const labels = screen.getAllByTestId('y-tick').map((el) => el.textContent);
    expect(labels[0]).toBe('0');
    expect(labels.at(-1)).toBe('15K');
  });

  it('shows the month detail on hover and hides it on leave', () => {
    const rows = [row('2026-01', 10), { ...row('2026-02', 1234), opening: 10, totalIn: 2000, totalOut: 776, net: 1224 }];
    render(<Charts rows={rows} />);
    expect(screen.queryByTestId('chart-tip')).toBeNull();
    fireEvent.mouseEnter(screen.getAllByTestId('month-hit')[1]);
    const tip = screen.getByTestId('chart-tip');
    expect(tip).toHaveTextContent('February 2026');
    expect(tip).toHaveTextContent('Total in');
    expect(tip).toHaveTextContent('SAR 2,000.00');
    expect(tip).toHaveTextContent('SAR 1,234.00');
    fireEvent.mouseLeave(screen.getByRole('group', { name: 'Closing balance by month' }));
    expect(screen.queryByTestId('chart-tip')).toBeNull();
  });

  it('switches between the balance line, paired bars and net bars', async () => {
    const user = userEvent.setup();
    const rows = [{ ...row('2026-01', 500), totalIn: 1000, totalOut: 500, net: 500 }, { ...row('2026-02', 200), totalIn: 400, totalOut: 700, net: -300 }];
    render(<Charts rows={rows} />);
    expect(screen.getByTestId('balance-line')).toBeInTheDocument();
    await user.click(screen.getByText('In vs out'));
    expect(screen.queryByTestId('balance-line')).toBeNull();
    expect(screen.getAllByTestId('bar-in')).toHaveLength(2);
    expect(screen.getAllByTestId('bar-out')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Income and expenses by month' })).toBeInTheDocument();
    await user.click(screen.getByText('Net'));
    const bars = screen.getAllByTestId('bar-net');
    expect(bars).toHaveLength(2);
    expect(bars[0]).toHaveClass('fill-gain');
    expect(bars[1]).toHaveClass('fill-loss');
  });

  it('reverses x order in Arabic', () => {
    render(<Charts rows={[row('2026-01', 0), row('2026-02', 0)]} />);
    const ltr = screen.getByTestId('balance-line').getAttribute('points')!;
    useUiStore.setState({ locale: 'ar' });
    render(<Charts rows={[row('2026-01', 0), row('2026-02', 0)]} />);
    const rtl = screen.getAllByTestId('balance-line')[1].getAttribute('points')!;
    const xs = (p: string) => p.trim().split(/\s+/).map((pt) => Number(pt.split(',')[0]));
    // Mirrored across the drawing (width 960 in jsdom): the first month sits at the right edge.
    expect(xs(rtl)).toEqual(xs(ltr).map((v) => 960 - v));
    expect(xs(rtl)[0]).toBeGreaterThan(xs(rtl)[1]);
  });
});

describe('niceTicks', () => {
  it('encloses the range with round steps and always includes zero', () => {
    expect(niceTicks(0, 14000)).toEqual([0, 5000, 10000, 15000]);
    expect(niceTicks(-1300, 2600)).toEqual([-2000, -1000, 0, 1000, 2000, 3000]);
    expect(niceTicks(300, 900)).toEqual([0, 500, 1000]);
    expect(niceTicks(0, 0)).toEqual([0, 1]);
  });
});
