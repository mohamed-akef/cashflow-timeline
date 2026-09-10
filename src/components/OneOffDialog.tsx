import { useId, useState, type FormEvent } from 'react';
import type { MonthKey } from '../domain/month';
import type { Direction } from '../domain/plan';
import { useLocale, useT } from '../i18n';
import { formatMonth } from '../i18n/format';
import { usePlanStore } from '../store/planStore';
import { btnGhost, btnPrimary, chip, fieldLabel, input } from './ui';

interface Props {
  month: MonthKey;
  onClose: () => void;
}

const DIRECTIONS: Direction[] = ['in', 'out'];

/** Three fields on one line: what, how much, income or expense. */
export function OneOffDialog({ month, onClose }: Props) {
  const t = useT();
  const locale = useLocale();
  const amountId = useId();
  const addOneOff = usePlanStore((s) => s.addOneOff);
  const currency = usePlanStore((s) => s.plan.settings.currency);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<Direction>('out');
  const [error, setError] = useState<'errLabel' | 'errAmount' | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (label.trim() === '') return setError('errLabel');
    if (!Number.isFinite(n) || n <= 0) return setError('errAmount');
    addOneOff({ label: label.trim(), amount: n, direction, month });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4 dark:bg-black/60 motion-safe:animate-fade" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="oneoff-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        noValidate
        className="w-full max-w-lg space-y-3 rounded-xl border border-line bg-surface p-4 shadow-xl motion-safe:animate-pop"
      >
        <h2 id="oneoff-title" className="text-base font-semibold">{t('addOneOff', { month: formatMonth(month, locale, 'long') })}</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-36 flex-1">
            <span className={fieldLabel}>{t('label')}</span>
            <input className={`${input} w-full`} value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
          </label>
          <div className="w-36">
            <label htmlFor={amountId} className={fieldLabel}>{t('amount')}</label>
            <div className="flex items-center gap-1">
              <input
                id={amountId} className={`${input} w-full text-end tabular-nums`} type="number" inputMode="decimal" min={0} step="any"
                value={amount} onChange={(e) => setAmount(e.target.value)}
              />
              <span className="text-xs text-ink-faint">{currency}</span>
            </div>
          </div>
          <fieldset>
            <legend className={fieldLabel}>{t('direction')}</legend>
            <div className="flex gap-1">
              {DIRECTIONS.map((d) => (
                <label key={d}>
                  <input type="radio" name="direction" className="peer sr-only" value={d} checked={direction === d} onChange={() => setDirection(d)} />
                  <span className={chip}>{t(d === 'in' ? 'directionIn' : 'directionOut')}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        {error && <p role="alert" className="text-sm text-loss motion-safe:animate-enter">{t(error)}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>{t('cancel')}</button>
          <button type="submit" className={btnPrimary}>{t('add')}</button>
        </div>
      </form>
    </div>
  );
}
