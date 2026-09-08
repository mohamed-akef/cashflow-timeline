import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toolbar } from './Toolbar';
import { usePlanStore } from '../store/planStore';
import { emptyPlan } from '../domain/plan';

beforeEach(() => {
  localStorage.clear();
  usePlanStore.setState({ plan: emptyPlan(new Date(2026, 0, 1)), setupOpen: false, importError: null, storageError: false });
});

describe('Toolbar', () => {
  it('changes the duration preset', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    expect(screen.getByText('How many months the plan covers, counting from the start month.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Duration'), '3');
    expect(usePlanStore.getState().plan.settings.horizonMonths).toBe(3);
  });

  it('custom horizon shows a number input', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.selectOptions(screen.getByLabelText('Duration'), 'custom');
    const input = screen.getByRole('spinbutton', { name: 'Duration' });
    await user.clear(input);
    await user.type(input, '18');
    expect(usePlanStore.getState().plan.settings.horizonMonths).toBe(18);
  });

  it('shows an import error for a bad file', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    const file = new File(['{bad'], 'plan.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText('Import JSON'), file);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('That file is not valid JSON.'));
  });

  it('clears data after confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Toolbar />);
    await user.click(screen.getByRole('button', { name: 'Clear all data' }));
    expect(usePlanStore.getState().setupOpen).toBe(true);
  });

  it('shows the storage warning', () => {
    usePlanStore.setState({ storageError: true });
    render(<Toolbar />);
    expect(screen.getByText(/Could not save on this device/)).toBeInTheDocument();
  });

  it('shows custom mode when the stored horizon is not a preset', () => {
    usePlanStore.setState((s) => ({ plan: { ...s.plan, settings: { ...s.plan.settings, horizonMonths: 24 } } }));
    render(<Toolbar />);
    expect((screen.getByRole('combobox', { name: 'Duration' }) as HTMLSelectElement).value).toBe('custom');
    expect((screen.getByRole('spinbutton', { name: 'Duration' }) as HTMLInputElement).value).toBe('24');
  });

  it('refreshes the custom horizon input when the horizon changes externally', () => {
    usePlanStore.setState((s) => ({ plan: { ...s.plan, settings: { ...s.plan.settings, horizonMonths: 24 } } }));
    render(<Toolbar />);
    expect((screen.getByRole('spinbutton', { name: 'Duration' }) as HTMLInputElement).value).toBe('24');
    act(() => {
      usePlanStore.setState((s) => ({ plan: { ...s.plan, settings: { ...s.plan.settings, horizonMonths: 36 } } }));
    });
    expect((screen.getByRole('spinbutton', { name: 'Duration' }) as HTMLInputElement).value).toBe('36');
  });
});
