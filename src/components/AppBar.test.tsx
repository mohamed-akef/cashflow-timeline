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
  it('switches language with the EN | AR toggle and remembers it', async () => {
    const user = userEvent.setup();
    render(<AppBar />);
    const ar = screen.getByRole('button', { name: 'AR' });
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    expect(ar).toHaveAttribute('aria-pressed', 'false');

    await user.click(ar);
    expect(useUiStore.getState().locale).toBe('ar');
    expect(localStorage.getItem(LOCALE_KEY)).toBe('ar');
    expect(ar).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('group', { name: 'اللغة' })).toBeInTheDocument();
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
