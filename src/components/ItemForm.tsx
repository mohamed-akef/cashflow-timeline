import { useState, type FormEvent } from 'react';
import { toIndex, type MonthKey } from '../domain/month';
import { newId, type Direction, type PlanItem, type Recurrence } from '../domain/plan';
import { useLocale, useT, type MessageKey } from '../i18n';
import { monthName } from '../i18n/format';
import { Alert, Button, Chip, Field, Input, Select, labelClass } from './ui';

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
    <form onSubmit={submit} noValidate className="space-y-3 rounded-lg border border-line bg-surface-muted p-3 motion-safe:animate-enter">
      <div className="flex flex-wrap items-end gap-2">
        <Field label={t('label')} className="min-w-40 flex-1">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
        </Field>
        <Field label={t('amount')} className="w-36">
          {(id) => (
            <div className="flex items-center gap-1">
              <Input
                id={id} className="min-w-0 flex-1 text-end tabular-nums" type="number" inputMode="decimal" min={0} step="any"
                value={amount} onChange={(e) => setAmount(e.target.value)}
              />
              <span className="text-xs text-ink-faint">{currency}</span>
            </div>
          )}
        </Field>
        <Field label={t('recurrence')} className="w-44">
          <Select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            {KINDS.map((k) => <option key={k} value={k}>{t(KIND_LABEL[k])}</option>)}
          </Select>
        </Field>
      </div>

      {kind === 'once' && (
        <Field label={t('month')} className="w-40 motion-safe:animate-enter">
          <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </Field>
      )}
      {kind === 'everyN' && (
        <label className="flex items-center gap-2 text-sm motion-safe:animate-enter">
          <span>{t('everyNBefore')}</span>
          <Input
            className="w-16 text-end" type="number" min={2} step={1} aria-label={t('everyN')}
            value={n} onChange={(e) => setN(e.target.value)}
          />
          <span>{t('everyNAfter')}</span>
        </label>
      )}
      {kind === 'specificMonths' && (
        <fieldset className="motion-safe:animate-enter">
          <legend className={`${labelClass} mb-1.5`}>{t('monthsOfYear')}</legend>
          <div className="flex flex-wrap gap-1">
            {MONTHS_OF_YEAR.map((m) => (
              <Chip key={m} type="checkbox" checked={months.includes(m)} onChange={() => toggleMonth(m)}>
                {monthName(m, locale)}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}

      <details className="text-sm" open={moreOpen}>
        <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">{t('moreOptions')}</summary>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          {kind !== 'once' && (
            <>
              <Field label={t('from')} className="w-40">
                <Input type="month" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
              </Field>
              <Field label={t('to')} className="w-40">
                <Input type="month" value={to} onChange={(e) => setTo(e.target.value)} />
              </Field>
            </>
          )}
          <Field label={t('note')} className="min-w-40 flex-1">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      </details>

      {error && <Alert tone="destructive">{t(error)}</Alert>}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>{t('cancel')}</Button>
        <Button type="submit" variant="primary" size="sm">{t('save')}</Button>
      </div>
    </form>
  );
}
