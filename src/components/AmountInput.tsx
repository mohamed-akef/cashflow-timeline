import type { ComponentProps } from 'react';
import { useLocale } from '../i18n';
import { groupAmountInput, parseAmountInput } from '../i18n/format';
import { Input } from './ui';

interface Props extends Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> {
  /** Ungrouped, as the caller stores it: what `Number()` is handed on submit. */
  value: string;
  onChange: (value: string) => void;
  /** Only the starting balance may go below zero; the rest are magnitudes. */
  allowNegative?: boolean;
}

/**
 * An amount field that groups thousands while you type: 85000 reads 85,000.
 * `type="number"` cannot do this — a grouped string is an invalid value for
 * it — so this is a text input that formats only what it shows and hands the
 * caller back plain digits.
 *
 * ponytail: reformatting on every keystroke parks the caret at the end, so
 * editing the middle of a number jumps it. Track the selection offset across
 * the reformat if anyone edits in place rather than appending.
 */
export function AmountInput({ value, onChange, allowNegative = false, className = '', ...props }: Props) {
  const locale = useLocale();
  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      className={`text-end tabular-nums ${className}`}
      value={groupAmountInput(value, locale)}
      onChange={(e) => onChange(parseAmountInput(e.target.value, allowNegative))}
    />
  );
}
