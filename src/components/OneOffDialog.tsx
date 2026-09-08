import { useState, type FormEvent } from 'react';
import type { MonthKey } from '../domain/month';
import type { Direction } from '../domain/plan';
import { useLocale, useT } from '../i18n';
import { formatMonth } from '../i18n/format';
import { usePlanStore } from '../store/planStore';

interface Props {
  month: MonthKey;
  onClose: () => void;
}

export function OneOffDialog({ month, onClose }: Props) {
  const t = useT();
  const locale = useLocale();
  const addOneOff = usePlanStore((s) => s.addOneOff);
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
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="oneoff-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        noValidate
        className="w-full max-w-sm space-y-3 rounded-lg bg-white p-4 shadow-xl"
      >
        <h2 id="oneoff-title" className="text-lg font-semibold">{t('addOneOff', { month: formatMonth(month, locale, 'long') })}</h2>
        <label className="block text-sm">
          <span className="mb-1 block">{t('label')}</span>
          <input className="w-full rounded border border-slate-300 px-2 py-1" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block">{t('amount')}</span>
          <input className="w-full rounded border border-slate-300 px-2 py-1" type="number" inputMode="decimal" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block">{t('direction')}</span>
          <select className="w-full rounded border border-slate-300 px-2 py-1" value={direction} onChange={(e) => setDirection(e.target.value as Direction)}>
            <option value="in">{t('directionIn')}</option>
            <option value="out">{t('directionOut')}</option>
          </select>
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{t(error)}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-3 py-1 text-slate-700 hover:bg-slate-100">{t('cancel')}</button>
          <button type="submit" className="rounded bg-slate-900 px-3 py-1 text-white hover:bg-slate-700">{t('add')}</button>
        </div>
      </form>
    </div>
  );
}
