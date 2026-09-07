import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetupDialog } from './SetupDialog';
import { usePlanStore } from '../store/planStore';
import { emptyPlan, type Plan } from '../domain/plan';

const seeded: Plan = {
  ...emptyPlan(new Date(2026, 0, 1)),
  items: [{ id: 'r', label: 'Rent', direction: 'out', amount: 3000, recurrence: { kind: 'monthly' }, window: { from: '2026-01' } }],
};

beforeEach(() => {
  localStorage.clear();
  usePlanStore.setState({ plan: emptyPlan(new Date(2026, 0, 1)), setupOpen: true, importError: null, storageError: false });
});

describe('SetupDialog', () => {
  it('first run: no cancel button, saves basics and a new income item', async () => {
    const user = userEvent.setup();
    render(<SetupDialog />);
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();

    const balance = screen.getByLabelText('Starting balance');
    await user.clear(balance);
    await user.type(balance, '2500');
    fireEvent.change(screen.getByLabelText('Start month'), { target: { value: '2026-03' } });

    await user.click(screen.getByRole('button', { name: 'Add income' }));
    await user.type(screen.getByLabelText('Label'), 'Salary');
    await user.type(screen.getByLabelText('Amount'), '9000');
    await user.click(screen.getByRole('button', { name: 'Save' })); // item form save

    await user.click(screen.getByRole('button', { name: 'Save plan' }));

    const { plan, setupOpen } = usePlanStore.getState();
    expect(setupOpen).toBe(false);
    expect(plan.settings).toMatchObject({ startingBalance: 2500, startMonth: '2026-03' });
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]).toMatchObject({ label: 'Salary', amount: 9000, direction: 'in', window: { from: '2026-03' } });
  });

  it('edits and deletes existing rules in the draft, only persisting on save', async () => {
    const user = userEvent.setup();
    usePlanStore.setState({ plan: seeded });
    render(<SetupDialog />);

    const rentRow = screen.getByText('Rent').closest('li')!;
    await user.click(within(rentRow).getByRole('button', { name: 'Edit' }));
    const amount = screen.getByLabelText('Amount');
    await user.clear(amount);
    await user.type(amount, '2500');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(usePlanStore.getState().plan.items[0].amount).toBe(3000); // not yet persisted

    await user.click(screen.getByRole('button', { name: 'Save plan' }));
    expect(usePlanStore.getState().plan.items[0].amount).toBe(2500);
  });

  it('delete removes the rule; cancel discards draft changes', async () => {
    const user = userEvent.setup();
    usePlanStore.setState({ plan: seeded });
    render(<SetupDialog />);
    const rentRow = screen.getByText('Rent').closest('li')!;
    await user.click(within(rentRow).getByRole('button', { name: 'Delete' }));
    expect(screen.queryByText('Rent')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(usePlanStore.getState().plan.items).toHaveLength(1);
    expect(usePlanStore.getState().setupOpen).toBe(false);
  });

  it('accepts a negative starting balance', async () => {
    const user = userEvent.setup();
    usePlanStore.setState({ plan: seeded });
    render(<SetupDialog />);
    const balance = screen.getByLabelText('Starting balance');
    await user.clear(balance);
    await user.type(balance, '-500');
    await user.click(screen.getByRole('button', { name: 'Save plan' }));
    expect(usePlanStore.getState().plan.settings.startingBalance).toBe(-500);
  });
});
