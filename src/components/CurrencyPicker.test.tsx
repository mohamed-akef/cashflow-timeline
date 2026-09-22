import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CurrencyPicker } from './CurrencyPicker';

function setup(value = 'SAR') {
  const onChange = vi.fn();
  render(<CurrencyPicker label="Currency" value={value} onChange={onChange} />);
  return { onChange, input: screen.getByRole('combobox', { name: 'Currency' }) };
}

describe('CurrencyPicker', () => {
  it('shows the code, and lists currencies on focus', async () => {
    const user = userEvent.setup();
    const { input } = setup();
    expect(input).toHaveValue('SAR');
    await user.click(input);
    expect(screen.getAllByRole('option').length).toBeGreaterThan(100);
  });

  it('filters by name and picks with a click', async () => {
    const user = userEvent.setup();
    const { input, onChange } = setup();
    await user.click(input);
    await user.type(input, 'yen');
    await user.click(screen.getByRole('option', { name: /JPY/ }));
    expect(onChange).toHaveBeenCalledWith('JPY');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('picks with the keyboard', async () => {
    const user = userEvent.setup();
    const { input, onChange } = setup();
    await user.click(input);
    await user.type(input, 'egp');
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('EGP');
  });

  it('drops stray text and keeps the value on Escape or blur', async () => {
    const user = userEvent.setup();
    const { input, onChange } = setup();
    await user.click(input);
    await user.type(input, 'nonsense');
    expect(screen.getByText('No currency matches that.')).toBeInTheDocument();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('SAR');
    await user.type(input, 'xyz');
    await user.tab();
    expect(input).toHaveValue('SAR');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('starts a fresh search when typing again after Escape', async () => {
    const user = userEvent.setup();
    const { input, onChange } = setup();
    await user.click(input);
    await user.keyboard('yen{Escape}');
    await new Promise((r) => requestAnimationFrame(r));
    await user.keyboard('egp{Enter}');
    expect(onChange).toHaveBeenCalledWith('EGP');
  });
});
