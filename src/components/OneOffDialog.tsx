import { useState, type FormEvent } from 'react';
import type { MonthKey } from '../domain/month';
import type { Direction } from '../domain/plan';
import { useLocale, useT } from '../i18n';
import { formatMonth } from '../i18n/format';
import { usePlanStore } from '../store/planStore';
import { Alert, Button, CardContent, CardFooter, CardHeader, CardTitle, Chip, Dialog, Field, Input, labelClass } from './ui';

interface Props {
  month: MonthKey;
  onClose: () => void;
}

const DIRECTIONS: Direction[] = ['in', 'out'];

/** Three fields on one line: what, how much, income or expense. */
export function OneOffDialog({ month, onClose }: Props) {
  const t = useT();
  const locale = useLocale();
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
    <Dialog labelledBy="oneoff-title" onDismiss={onClose}>
      <form onSubmit={submit} noValidate>
        <CardHeader>
          <CardTitle as="h2" id="oneoff-title">{t('addOneOff', { month: formatMonth(month, locale, 'long') })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <Field label={t('label')} className="min-w-36 flex-1">
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
            <fieldset>
              <legend className={`${labelClass} mb-1.5`}>{t('direction')}</legend>
              <div className="flex gap-1">
                {DIRECTIONS.map((d) => (
                  <Chip key={d} type="radio" name="direction" value={d} checked={direction === d} onChange={() => setDirection(d)}>
                    {t(d === 'in' ? 'directionIn' : 'directionOut')}
                  </Chip>
                ))}
              </div>
            </fieldset>
          </div>
          {error && <Alert tone="destructive">{t(error)}</Alert>}
        </CardContent>
        <CardFooter className="justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>{t('cancel')}</Button>
          <Button type="submit" variant="primary" size="sm">{t('add')}</Button>
        </CardFooter>
      </form>
    </Dialog>
  );
}
