import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemForm } from './ItemForm';
import { usePlanStore } from '../store/planStore';
import { emptyPlan } from '../domain/plan';

beforeEach(() => {
  usePlanStore.setState({ plan: emptyPlan(new Date(2026, 0, 1)), setupOpen: true });
});

describe('ItemForm', () => {
  it('saves a monthly item with defaults', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ItemForm currency="SAR" direction="in" defaultMonth="2026-01" onSave={onSave} onCancel={() => {}} />);
    await user.type(screen.getByLabelText('Label'), 'Salary');
    await user.type(screen.getByLabelText('Amount'), '9000');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      label: 'Salary', amount: 9000, direction: 'in',
      recurrence: { kind: 'monthly' }, window: { from: '2026-01', to: undefined },
    }));
    expect(onSave.mock.calls[0][0].id).toBeTruthy();
  });

  it('validates label and amount', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ItemForm currency="SAR" direction="out" defaultMonth="2026-01" onSave={onSave} onCancel={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a label.');
    await user.type(screen.getByLabelText('Label'), 'Rent');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an amount greater than zero.');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves a once item anchored at its month', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ItemForm currency="SAR" direction="in" defaultMonth="2026-01" onSave={onSave} onCancel={() => {}} />);
    await user.type(screen.getByLabelText('Label'), 'Bonus');
    await user.type(screen.getByLabelText('Amount'), '500');
    await user.selectOptions(screen.getByLabelText('Repeats'), 'once');
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-04' } });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      recurrence: { kind: 'once', month: '2026-04' }, window: { from: '2026-04', to: undefined },
    }));
  });

  it('requires n >= 2 and at least one specific month, and to >= from', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ItemForm currency="SAR" direction="out" defaultMonth="2026-03" onSave={onSave} onCancel={() => {}} />);
    await user.type(screen.getByLabelText('Label'), 'Insurance');
    await user.type(screen.getByLabelText('Amount'), '300');

    await user.selectOptions(screen.getByLabelText('Repeats'), 'everyN');
    const n = screen.getByLabelText('Every how many months');
    await user.clear(n);
    await user.type(n, '1');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a number of months of 2 or more.');

    await user.selectOptions(screen.getByLabelText('Repeats'), 'specificMonths');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Pick at least one month.');
    await user.click(screen.getByRole('checkbox', { name: 'Sep' }));

    fireEvent.change(screen.getByLabelText('Until (optional)'), { target: { value: '2026-01' } });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('"Until" must not be before "From".');

    fireEvent.change(screen.getByLabelText('Until (optional)'), { target: { value: '2027-12' } });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      recurrence: { kind: 'specificMonths', months: [9] }, window: { from: '2026-03', to: '2027-12' },
    }));
  });

  it('edits an existing item keeping its id', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ItemForm currency="SAR" direction="out" defaultMonth="2026-01" onSave={onSave} onCancel={() => {}} initial={{
      id: 'keep', label: 'Rent', direction: 'out', amount: 3000, recurrence: { kind: 'monthly' }, window: { from: '2026-01' },
    }} />);
    const amount = screen.getByLabelText('Amount');
    await user.clear(amount);
    await user.type(amount, '2500');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'keep', amount: 2500 }));
  });
});
