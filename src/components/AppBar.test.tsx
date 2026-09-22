import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppBar } from './AppBar';
import { LOCALE_KEY, useUiStore } from '../store/uiStore';

beforeEach(() => {
  localStorage.clear();
  useUiStore.setState({ locale: 'en' });
  document.documentElement.classList.remove('dark');
});

describe('AppBar', () => {
  it('switches language with one tap, naming the other language, and remembers it', async () => {
    const user = userEvent.setup();
    render(<AppBar />);
    await user.click(screen.getByRole('button', { name: 'العربية' }));
    expect(useUiStore.getState().locale).toBe('ar');
    expect(localStorage.getItem(LOCALE_KEY)).toBe('ar');

    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(useUiStore.getState().locale).toBe('en');
    expect(screen.queryByRole('button', { name: 'العربية' })).toBeInTheDocument();
  });

  it('switches the theme and remembers it', async () => {
    const user = userEvent.setup();
    render(<AppBar />);
    const select = screen.getByRole('combobox', { name: 'Theme' }) as HTMLSelectElement;
    expect(select.value).toBe('system');
    await user.selectOptions(select, 'dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('cashflow-timeline:theme')).toBe('dark');
  });
});
