import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { usePlanStore } from './store/planStore';
import { useUiStore } from './store/uiStore';
import { emptyPlan, type Plan } from './domain/plan';

beforeEach(() => {
  localStorage.clear();
  useUiStore.setState({ locale: 'en' });
});

describe('App', () => {
  it('opens the setup dialog on first run', () => {
    usePlanStore.setState({ plan: emptyPlan(new Date(2026, 0, 1)), setupOpen: true });
    render(<App />);
    expect(screen.getByRole('dialog', { name: 'Plan setup' })).toBeInTheDocument();
  });

  it('renders the timeline with a saved plan and applies dir to <html>', () => {
    const plan: Plan = {
      ...emptyPlan(new Date(2026, 0, 1)),
      settings: { ...emptyPlan().settings, startMonth: '2026-01', horizonMonths: 3, startingBalance: 0 },
      items: [{ id: 's', label: 'راتب', direction: 'in', amount: 100, recurrence: { kind: 'monthly' }, window: { from: '2026-01' } }],
    };
    usePlanStore.setState({ plan, setupOpen: false });
    useUiStore.setState({ locale: 'ar' });
    render(<App />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('راتب')).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('rtl');
    expect(screen.getByRole('status')).toHaveTextContent('3');
  });
});
