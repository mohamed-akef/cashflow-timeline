import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    expect(screen.getByText('Jan 2026')).toBeInTheDocument();
    // closing: 1100, 1600, 2600
    expect(screen.getByText(/2,600/)).toBeInTheDocument();
  });

  it('adds a one-off via the month "+" button', async () => {
    const user = userEvent.setup();
    renderGrid();
    await user.click(screen.getByRole('button', { name: 'Add a one-off in Mar 2026' }));
    await user.type(screen.getByLabelText('Label'), 'Tyres');
    await user.type(screen.getByLabelText('Amount'), '800');
    await user.selectOptions(screen.getByLabelText('Type'), 'out');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    const added = usePlanStore.getState().plan.items.at(-1)!;
    expect(added).toMatchObject({ label: 'Tyres', amount: 800, direction: 'out', recurrence: { kind: 'once', month: '2026-03' } });
  });

  it('moves an item with the month input', () => {
    renderGrid();
    const input = screen.getByLabelText('Move to: Car') as HTMLInputElement;
    expect(input.value).toBe('2026-02');
    fireEvent.change(input, { target: { value: '2026-03' } });
    expect(usePlanStore.getState().plan.items.find((i) => i.id === 'c')!.recurrence).toEqual({ kind: 'once', month: '2026-03' });
  });

  it('shows the empty state when there are no items', () => {
    usePlanStore.setState({ plan: { ...plan, items: [] } });
    renderGrid();
    expect(screen.getByText(/No items yet/)).toBeInTheDocument();
  });
});
