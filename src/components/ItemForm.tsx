import { useId, useState, type FormEvent } from 'react';
import { toIndex, type MonthKey } from '../domain/month';
import { newId, type Direction, type PlanItem, type Recurrence } from '../domain/plan';
import { useLocale, useT, type MessageKey } from '../i18n';
import { monthName } from '../i18n/format';
import { btnGhost, btnPrimary, chip, fieldLabel, input } from './ui';

type Kind = Recurrence['kind'];
const KINDS: Kind[] = ['monthly', 'once', 'everyN', 'specificMonths'];
const KIND_LABEL: Record<Kind, MessageKey> = {
  monthly: 'recurrenceMonthly', once: 'recurrenceOnce', everyN: 'recurrenceEveryN', specificMonths: 'recurrenceSpecificMonths',
};
const MONTHS_OF_YEAR = Array.from({ length: 12 }, (_, i) => i + 1);

interface Props {
  direction: Direction;
  currency: string;
  initial?: PlanItem;
  defaultMonth: MonthKey;
  onSave: (item: PlanItem) => void;
  onCancel: () => void;
}

/**
 * One compact row (label · amount · repeats) is enough for the common case;
 * a second row appears only when the chosen repeat pattern needs it, and
 * From / Until / Note stay folded under "More options".
 */
export function ItemForm({ direction, currency, initial, defaultMonth, onSave, onCancel }: Props) {
  const t = useT();
  const locale = useLocale();
  const amountId = useId();
  const r = initial?.recurrence;

  const [label, setLabel] = useState(initial?.label ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [kind, setKind] = useState<Kind>(r?.kind ?? 'monthly');
  const [month, setMonth] = useState<MonthKey>(r?.kind === 'once' ? r.month : defaultMonth);
  const [n, setN] = useState(r?.kind === 'everyN' ? String(r.n) : '3');
  const [months, setMonths] = useState<number[]>(r?.kind === 'specificMonths' ? r.months : []);
  const [from, setFrom] = useState<MonthKey>(initial?.window.from ?? defaultMonth);
  const [to, setTo] = useState<MonthKey | ''>(initial?.window.to ?? '');
  const [error, setError] = useState<MessageKey | null>(null);
  const moreOpen = Boolean(initial?.note || initial?.window.to);

  const toggleMonth = (m: number) =>
    setMonths((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const amountNum = Number(amount);
    const nNum = Number(n);
    if (label.trim() === '') return setError('errLabel');
    if (!Number.isFinite(amountNum) || amountNum <= 0) return setError('errAmount');
    if (kind === 'everyN' && (!Number.isInteger(nNum) || nNum < 2)) return setError('errN');
    if (kind === 'specificMonths' && months.length === 0) return setError('errMonths');
    if (kind !== 'once' && to !== '' && toIndex(to) < toIndex(from)) return setError('errWindow');

    const recurrence: Recurrence =
      kind === 'monthly' ? { kind } :
      kind === 'once' ? { kind, month } :
      kind === 'everyN' ? { kind, n: nNum } :
      { kind, months };

    onSave({
      id: initial?.id ?? newId(),
      label: label.trim(),
      note: note.trim() === '' ? undefined : note.trim(),
      direction,
      amount: amountNum,
      recurrence,
      window: kind === 'once' ? { from: month, to: undefined } : { from, to: to === '' ? undefined : to },
    });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-2 rounded-lg border border-line bg-surface-muted p-3 motion-safe:animate-enter">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-40 flex-1">
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
        <label className="w-44">
          <span className={fieldLabel}>{t('recurrence')}</span>
          <select className={`${input} w-full`} value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            {KINDS.map((k) => <option key={k} value={k}>{t(KIND_LABEL[k])}</option>)}
          </select>
        </label>
      </div>

      {kind === 'once' && (
        <label className="block w-40 motion-safe:animate-enter">
          <span className={fieldLabel}>{t('month')}</span>
          <input className={`${input} w-full`} type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
      )}
      {kind === 'everyN' && (
        <label className="flex items-center gap-2 text-sm motion-safe:animate-enter">
          <span>{t('everyNBefore')}</span>
          <input
            className={`${input} w-16 text-end`} type="number" min={2} step={1} aria-label={t('everyN')}
            value={n} onChange={(e) => setN(e.target.value)}
          />
          <span>{t('everyNAfter')}</span>
        </label>
      )}
      {kind === 'specificMonths' && (
        <fieldset className="motion-safe:animate-enter">
          <legend className={fieldLabel}>{t('monthsOfYear')}</legend>
          <div className="flex flex-wrap gap-1">
            {MONTHS_OF_YEAR.map((m) => (
              <label key={m}>
                <input type="checkbox" className="peer sr-only" checked={months.includes(m)} onChange={() => toggleMonth(m)} />
                <span className={chip}>{monthName(m, locale)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <details className="text-sm" open={moreOpen}>
        <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">{t('moreOptions')}</summary>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          {kind !== 'once' && (
            <>
              <label className="w-40">
                <span className={fieldLabel}>{t('from')}</span>
                <input className={`${input} w-full`} type="month" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
              </label>
              <label className="w-40">
                <span className={fieldLabel}>{t('to')}</span>
                <input className={`${input} w-full`} type="month" value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
            </>
          )}
          <label className="min-w-40 flex-1">
            <span className={fieldLabel}>{t('note')}</span>
            <input className={`${input} w-full`} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
      </details>

      {error && <p role="alert" className="text-sm text-loss motion-safe:animate-enter">{t(error)}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={btnGhost}>{t('cancel')}</button>
        <button type="submit" className={btnPrimary}>{t('save')}</button>
      </div>
    </form>
  );
}
