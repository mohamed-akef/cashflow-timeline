import { useState, type FormEvent } from 'react';
import { amountIn, occursIn } from '../domain/engine';
import type { MonthKey } from '../domain/month';
import type { PlanItem } from '../domain/plan';
import { useLocale, useT } from '../i18n';
import { formatMonth } from '../i18n/format';
import { usePlanStore } from '../store/planStore';
import { Alert, Button, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Chip, Dialog, Field, Input } from './ui';

interface Props {
  item: PlanItem;
  month: MonthKey;
  onClose: () => void;
}

/**
 * One item in one month: include it or not, and with what amount. Saving
 * records an override only where the month departs from the item's rule.
 */
export function CellDialog({ item, month, onClose }: Props) {
  const t = useT();
  const locale = useLocale();
  const setOverride = usePlanStore((s) => s.setOverride);
  const currency = usePlanStore((s) => s.plan.settings.currency);
  const current = amountIn(item, month);
  const overridden = item.overrides?.[month] !== undefined;
  const [included, setIncluded] = useState(current !== null);
  const [amount, setAmount] = useState(String(current ?? item.amount));
  const [error, setError] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!included) {
      setOverride(item.id, month, null);
      return onClose();
    }
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return setError(true);
    const followsRule = occursIn(item, month) && n === item.amount;
    setOverride(item.id, month, followsRule ? undefined : n);
    onClose();
  };

  const reset = () => {
    setOverride(item.id, month, undefined);
    onClose();
  };

  const monthName = formatMonth(month, locale, 'long');
  return (
    <Dialog labelledBy="cell-title" onDismiss={onClose}>
      <form onSubmit={submit} noValidate>
        <CardHeader>
          <CardTitle as="h2" id="cell-title">{t('cellTitle', { label: item.label, month: monthName })}</CardTitle>
          <CardDescription>{t('cellHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Chip type="checkbox" checked={included} onChange={(e) => setIncluded(e.target.checked)}>
              {t('includeMonth')}
            </Chip>
            <Field label={t('amount')} className="w-40">
              {(id) => (
                <div className="flex items-center gap-1">
                  <Input
                    id={id} className="min-w-0 flex-1 text-end tabular-nums" type="number" inputMode="decimal" min={0} step="any"
                    value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!included} autoFocus
                  />
                  <span className="text-xs text-ink-faint">{currency}</span>
                </div>
              )}
            </Field>
          </div>
          {error && <Alert tone="destructive">{t('errAmount')}</Alert>}
        </CardContent>
        <CardFooter className="justify-end">
          {overridden && <Button variant="ghost" size="sm" className="me-auto" onClick={reset}>{t('useUsualAmount')}</Button>}
          <Button variant="ghost" size="sm" onClick={onClose}>{t('cancel')}</Button>
          <Button type="submit" variant="primary" size="sm">{t('save')}</Button>
        </CardFooter>
      </form>
    </Dialog>
  );
}
