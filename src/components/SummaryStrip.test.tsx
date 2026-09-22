import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummaryStrip } from './SummaryStrip';
import { usePlanStore } from '../store/planStore';
import { emptyPlan } from '../domain/plan';

beforeEach(() => {
  usePlanStore.setState({ plan: emptyPlan(new Date(2026, 0, 1)), setupOpen: false });
});

/** The horizon totals every case needs; individual cases override what they assert on. */
const totals = { ending: 1000, totalIn: 9000, totalOut: 7000, netChange: 2000, averageNet: 500 };

describe('SummaryStrip', () => {
  it('shows the all-positive message', () => {
    render(<SummaryStrip monthCount={6} summary={{ allPositive: true, lowest: { month: '2026-02', balance: 10 }, ...totals }} />);
    expect(screen.getByText('Positive in all 6 months ✓')).toBeInTheDocument();
    expect(screen.getByText(/10/)).toBeInTheDocument();
  });

  it('shows first negative, lowest and recovery', () => {
    render(<SummaryStrip monthCount={6} summary={{
      allPositive: false, firstNegative: '2026-03',
      lowest: { month: '2026-04', balance: -4250 }, recovery: '2026-06', ...totals,
    }} />);
    expect(screen.getByText('First negative month').nextElementSibling).toHaveTextContent('Mar 2026');
    expect(screen.getByText(/4,250/)).toBeInTheDocument();
    expect(screen.getByText('in Apr 2026')).toBeInTheDocument();
    expect(screen.getByText('Back above zero').nextElementSibling).toHaveTextContent('Jun 2026');
  });

  it('shows the horizon totals, with the net change signed', () => {
    render(<SummaryStrip monthCount={6} summary={{ allPositive: true, lowest: { month: '2026-02', balance: 10 }, ...totals }} />);
    expect(screen.getByText('Ending balance').nextElementSibling).toHaveTextContent('+SAR 2,000.00');
    expect(screen.getByText('Average per month').nextElementSibling).toHaveTextContent('+SAR 500.00');
    expect(screen.getByText('Money in').nextElementSibling).toHaveTextContent('SAR 9,000.00');
    expect(screen.getByText('Money out').nextElementSibling).toHaveTextContent('SAR 7,000.00');
  });

  it('shows never-recovers when recovery is absent', () => {
    render(<SummaryStrip monthCount={3} summary={{
      allPositive: false, firstNegative: '2026-01', lowest: { month: '2026-03', balance: -1 }, ...totals,
    }} />);
    expect(screen.getByText('Does not recover within the plan duration')).toBeInTheDocument();
  });
});
