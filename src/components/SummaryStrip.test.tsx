import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummaryStrip } from './SummaryStrip';
import { usePlanStore } from '../store/planStore';
import { emptyPlan } from '../domain/plan';

beforeEach(() => {
  usePlanStore.setState({ plan: emptyPlan(new Date(2026, 0, 1)), setupOpen: false });
});

describe('SummaryStrip', () => {
  it('shows the all-positive message', () => {
    render(<SummaryStrip monthCount={6} summary={{ allPositive: true, lowest: { month: '2026-02', balance: 10 } }} />);
    expect(screen.getByText('All 6 months positive ✓')).toBeInTheDocument();
  });

  it('shows first negative, lowest and recovery', () => {
    render(<SummaryStrip monthCount={6} summary={{
      allPositive: false, firstNegative: '2026-03',
      lowest: { month: '2026-04', balance: -4250 }, recovery: '2026-06',
    }} />);
    expect(screen.getByText('First negative: Mar 2026')).toBeInTheDocument();
    expect(screen.getByText(/Lowest: .*4,250.* in Apr 2026/)).toBeInTheDocument();
    expect(screen.getByText('Recovers: Jun 2026')).toBeInTheDocument();
  });

  it('shows never-recovers when recovery is absent', () => {
    render(<SummaryStrip monthCount={3} summary={{
      allPositive: false, firstNegative: '2026-01', lowest: { month: '2026-03', balance: -1 },
    }} />);
    expect(screen.getByText('Does not recover in this horizon')).toBeInTheDocument();
  });
});
