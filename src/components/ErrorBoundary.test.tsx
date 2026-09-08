import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';
import { usePlanStore } from '../store/planStore';
import { emptyPlan, type Plan } from '../domain/plan';

const seeded: Plan = {
  ...emptyPlan(new Date(2026, 0, 1)),
  items: [{ id: 'r', label: 'Rent', direction: 'out', amount: 3000, recurrence: { kind: 'monthly' }, window: { from: '2026-01' } }],
};

function Boom(): never {
  throw new Error('boom');
}

beforeEach(() => {
  localStorage.clear();
  usePlanStore.setState({ plan: seeded, setupOpen: false, importError: null, storageError: false });
});

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(<ErrorBoundary><p>fine</p></ErrorBoundary>);
    expect(screen.getByText('fine')).toBeInTheDocument();
  });

  it('shows the recovery panel and clears the plan on request', async () => {
    const user = userEvent.setup();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear all data' }));
    expect(usePlanStore.getState().plan.items).toEqual([]);
    expect(usePlanStore.getState().setupOpen).toBe(true);
    err.mockRestore();
  });
});
