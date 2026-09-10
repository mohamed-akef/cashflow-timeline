import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimelineGrid } from './TimelineGrid';
import { usePlanStore } from '../store/planStore';
import { emptyPlan, type Plan } from '../domain/plan';
import { expand } from '../domain/engine';

const plan: Plan = {
  ...emptyPlan(new Date(2026, 0, 1)),
  settings: { ...emptyPlan().settings, startMonth: '2026-01', horizonMonths: 3, startingBalance: 100 },
  items: [
    { id: 's', label: 'Salary', direction: 'in', amount: 1000, recurrence: { kind: 'monthly' }, window: { from: '2026-01' } },
    { id: 'c', label: 'Car', direction: 'out', amount: 500, recurrence: { kind: 'once', month: '2026-02' }, window: { from: '2026-02' } },
  ],
};

function renderGrid() {
  const rows = expand(usePlanStore.getState().plan);
  return render(<TimelineGrid rows={rows} />);
}

beforeEach(() => {
  localStorage.clear();
  usePlanStore.setState({ plan, setupOpen: false, importError: null, storageError: false });
});

describe('TimelineGrid', () => {
  it('renders items, months and closing balances', () => {
    renderGrid();
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('Car')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Jan 2026/ })).toBeInTheDocument();
    // closing: 1100, 1600, 2600
    expect(screen.getByText(/2,600/)).toBeInTheDocument();
  });

  it('adds a one-off via the month "+" button', async () => {
    const user = userEvent.setup();
    renderGrid();
    await user.click(screen.getByRole('button', { name: 'Add a one-off in Mar 2026' }));
    await user.type(screen.getByLabelText('Label'), 'Tyres');
    await user.type(screen.getByLabelText('Amount'), '800');
    await user.click(screen.getByRole('radio', { name: 'Expense' }));
    await user.click(screen.getByRole('button', { name: 'Add' }));
    const added = usePlanStore.getState().plan.items.at(-1)!;
    expect(added).toMatchObject({ label: 'Tyres', amount: 800, direction: 'out', recurrence: { kind: 'once', month: '2026-03' } });
  });

  it('removes an item from one month through its cell', async () => {
    const user = userEvent.setup();
    renderGrid();
    await user.click(screen.getByRole('button', { name: 'Edit Salary in Feb 2026' }));
    expect(screen.getByRole('dialog', { name: 'Salary in February 2026' })).toBeInTheDocument();
    await user.click(screen.getByText('Include this month'));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(usePlanStore.getState().plan.items.find((i) => i.id === 's')!.overrides).toEqual({ '2026-02': null });
    expect(screen.getByRole('button', { name: 'Edit Salary in Feb 2026' })).toHaveTextContent('—');
  });

  it('changes the amount for one month and keeps the rule elsewhere', async () => {
    const user = userEvent.setup();
    renderGrid();
    await user.click(screen.getByRole('button', { name: 'Edit Salary in Mar 2026' }));
    const amount = screen.getByLabelText('Amount');
    await user.clear(amount);
    await user.type(amount, '1500');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const salary = usePlanStore.getState().plan.items.find((i) => i.id === 's')!;
    expect(salary.overrides).toEqual({ '2026-03': 1500 });
    expect(salary.amount).toBe(1000);
  });

  it('adds an item to a month its rule skips, then resets it', async () => {
    const user = userEvent.setup();
    renderGrid();
    await user.click(screen.getByRole('button', { name: 'Edit Car in Jan 2026' }));
    await user.click(screen.getByText('Include this month'));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(usePlanStore.getState().plan.items.find((i) => i.id === 'c')!.overrides).toEqual({ '2026-01': 500 });

    await user.click(screen.getByRole('button', { name: 'Edit Car in Jan 2026' }));
    await user.click(screen.getByRole('button', { name: 'Use the usual amount' }));
    expect(usePlanStore.getState().plan.items.find((i) => i.id === 'c')!.overrides).toBeUndefined();
  });

  it('shows the empty state when there are no items', () => {
    usePlanStore.setState({ plan: { ...plan, items: [] } });
    renderGrid();
    expect(screen.getByText(/No items yet/)).toBeInTheDocument();
  });
});
