import { useState, type FormEvent } from 'react';
import { toIndex, type MonthKey } from '../domain/month';
import { newId, type Direction, type PlanItem, type Recurrence } from '../domain/plan';
import { useLocale, useT, type MessageKey } from '../i18n';
import { monthName } from '../i18n/format';

type Kind = Recurrence['kind'];
const KINDS: Kind[] = ['monthly', 'once', 'everyN', 'specificMonths'];
const KIND_LABEL: Record<Kind, MessageKey> = {
  monthly: 'recurrenceMonthly', once: 'recurrenceOnce', everyN: 'recurrenceEveryN', specificMonths: 'recurrenceSpecificMonths',
};

interface Props {
  direction: Direction;
  initial?: PlanItem;
  defaultMonth: MonthKey;
  onSave: (item: PlanItem) => void;
  onCancel: () => void;
}

export function ItemForm({ direction, initial, defaultMonth, onSave, onCancel }: Props) {
  const t = useT();
  const locale = useLocale();
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

  const field = 'w-full rounded border border-slate-300 px-2 py-1';
  const labelCls = 'block text-sm';

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <label className={labelCls}>
        <span className="mb-1 block">{t('label')}</span>
        <input className={field} value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
      </label>
      <label className={labelCls}>
        <span className="mb-1 block">{t('amount')}</span>
        <input className={field} type="number" inputMode="decimal" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <label className={labelCls}>
        <span className="mb-1 block">{t('recurrence')}</span>
        <select className={field} value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          {KINDS.map((k) => <option key={k} value={k}>{t(KIND_LABEL[k])}</option>)}
        </select>
      </label>

      {kind === 'once' && (
        <label className={labelCls}>
          <span className="mb-1 block">{t('month')}</span>
          <input className={field} type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
      )}
      {kind === 'everyN' && (
        <label className={labelCls}>
          <span className="mb-1 block">{t('everyN')}</span>
          <input className={field} type="number" min={2} step={1} value={n} onChange={(e) => setN(e.target.value)} />
        </label>
      )}
      {kind === 'specificMonths' && (
        <fieldset className="text-sm">
          <legend className="mb-1">{t('monthsOfYear')}</legend>
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <label key={m} className="flex items-center gap-1">
                <input type="checkbox" checked={months.includes(m)} onChange={() => toggleMonth(m)} />
                <span>{monthName(m, locale)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {kind !== 'once' && (
        <div className="grid grid-cols-2 gap-2">
          <label className={labelCls}>
            <span className="mb-1 block">{t('from')}</span>
            <input className={field} type="month" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          </label>
          <label className={labelCls}>
            <span className="mb-1 block">{t('to')}</span>
            <input className={field} type="month" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      )}
      <label className={labelCls}>
        <span className="mb-1 block">{t('note')}</span>
        <input className={field} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      {error && <p role="alert" className="text-sm text-red-700">{t(error)}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded px-3 py-1 text-slate-700 hover:bg-slate-200">{t('cancel')}</button>
        <button type="submit" className="rounded bg-slate-900 px-3 py-1 text-white hover:bg-slate-700">{t('save')}</button>
      </div>
    </form>
  );
}
