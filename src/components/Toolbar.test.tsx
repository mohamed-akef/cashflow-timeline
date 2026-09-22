import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanAlerts, Toolbar } from './Toolbar';
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

  it('reports a bad file through the alerts below the bar', async () => {
    const user = userEvent.setup();
    render(<><Toolbar /><PlanAlerts /></>);
    const file = new File(['{bad'], 'plan.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText('Open a copy'), file);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('That file is not valid JSON.'));
  });

  it('shows the storage warning', () => {
    usePlanStore.setState({ storageError: true });
    render(<PlanAlerts />);
    expect(screen.getByText(/Could not save on this device/)).toBeInTheDocument();
  });

  it('says nothing when there is nothing wrong', () => {
    const { container } = render(<PlanAlerts />);
    expect(container).toBeEmptyDOMElement();
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
