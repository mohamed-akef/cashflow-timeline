import { useState } from 'react';
import { occursIn, type MonthRow } from '../domain/engine';
import type { MonthKey } from '../domain/month';
import type { PlanItem } from '../domain/plan';
import { useLocale, useT } from '../i18n';
import { formatAmount, formatMonth } from '../i18n/format';
import { usePlanStore } from '../store/planStore';
import { OneOffDialog } from './OneOffDialog';
import { Button, Card, CardDescription, CardTitle, Select, focusRing } from './ui';

interface Props {
  rows: MonthRow[];
}

const anchorMonth = (item: PlanItem): MonthKey =>
  item.recurrence.kind === 'once' ? item.recurrence.month : item.window.from;

export function TimelineGrid({ rows }: Props) {
  const t = useT();
  const locale = useLocale();
  const plan = usePlanStore((s) => s.plan);
  const moveItem = usePlanStore((s) => s.moveItem);
  const openSetup = usePlanStore((s) => s.openSetup);
  const [addingMonth, setAddingMonth] = useState<MonthKey | null>(null);
  const monthKeys = rows.map((r) => r.month);
  /** Months in the plan, plus the item's own month if it currently sits outside the duration. */
  const moveOptions = (anchor: MonthKey) => (monthKeys.includes(anchor) ? monthKeys : [anchor, ...monthKeys]);

  /** Bare figures: the currency is stated once in the header, so cells carry only the number. */
  const money = (n: number) => formatAmount(n, locale);
  const incomes = plan.items.filter((i) => i.direction === 'in');
  const expenses = plan.items.filter((i) => i.direction === 'out');

  /** The sticky first column needs an opaque background; callers add the one they want. */
  const stickyBase = 'sticky start-0 z-10 ps-4 pe-3 text-start';
  const stickyCell = `${stickyBase} bg-surface`;
  const numCell = 'px-4 py-1.5 text-end tabular-nums whitespace-nowrap transition-colors';
  const bandCell = `${stickyBase} py-1.5 text-xs font-semibold`;

  /** Rows stay neutral; only the figures carry colour, and only where the sign means something. */
  type Tone = 'gain' | 'loss' | 'signed' | 'closing';
  const toneClass = (tone: Tone, v: number) => {
    if (tone === 'gain') return 'text-gain';
    if (tone === 'loss') return 'text-loss';
    if (tone === 'signed') return v < 0 ? 'text-loss' : 'text-gain';
    return v < 0 ? 'text-loss' : 'text-ink';
  };

  const itemRow = (item: PlanItem) => (
    <tr key={item.id} className="border-t border-line">
      <th scope="row" className={`${stickyCell} py-1.5 font-normal`}>
        <div className="flex items-center gap-2">
          <span className="truncate">{item.label}</span>
          <Select
            size="xs"
            aria-label={`${t('moveTo')}: ${item.label}`}
            title={t('moveTo')}
            value={anchorMonth(item)}
            onChange={(e) => moveItem(item.id, e.target.value)}
          >
            {moveOptions(anchorMonth(item)).map((m) => <option key={m} value={m}>{formatMonth(m, locale)}</option>)}
          </Select>
        </div>
      </th>
      {rows.map((r) => (
        <td key={r.month} className={`${numCell} ${occursIn(item, r.month) ? '' : 'text-ink-ghost'}`}>
          {occursIn(item, r.month) ? money(item.amount) : '—'}
        </td>
      ))}
    </tr>
  );

  const summaryRow = (label: string, pick: (r: MonthRow) => number, tone: Tone) => (
    <tr className={`border-t border-line font-semibold ${tone === 'closing' ? 'border-t-2 border-line-strong bg-surface-muted' : ''}`}>
      <th scope="row" className={`${stickyBase} py-2 whitespace-nowrap ${tone === 'closing' ? 'bg-surface-muted' : 'bg-surface'}`}>{label}</th>
      {rows.map((r) => {
        const v = pick(r);
        return (
          <td key={r.month} className={`${numCell} py-2 ${toneClass(tone, v)}`}>
            {money(v)}
          </td>
        );
      })}
    </tr>
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-4 pb-3">
        <CardTitle as="h2">{t('gridTitle')}</CardTitle>
        <CardDescription>{t('amountsIn', { currency: plan.settings.currency })}</CardDescription>
      </div>
      <div className="overflow-x-auto border-t border-line">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-ink-muted">
              <th scope="col" className={`${stickyBase} bg-surface py-2 text-xs font-semibold`}>{t('item')}</th>
              {rows.map((r) => (
                <th key={r.month} scope="col" className="min-w-28 px-4 py-2 text-end font-medium whitespace-nowrap">
                  <span className="me-1.5">{formatMonth(r.month, locale)}</span>
                  <button
                    type="button"
                    aria-label={t('addOneOff', { month: formatMonth(r.month, locale) })}
                    onClick={() => setAddingMonth(r.month)}
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-md border border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent ${focusRing}`}
                  >
                    +
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.items.length === 0 && (
              <tr>
                <td colSpan={rows.length + 1} className="px-3 py-8 text-center text-sm text-ink-muted">
                  <p>{t('noItems')}</p>
                  <Button variant="primary" className="mt-3" onClick={openSetup}>{t('openSetup')}</Button>
                </td>
              </tr>
            )}
            {incomes.length > 0 && (
              <tr><th scope="rowgroup" colSpan={rows.length + 1} className={`${bandCell} bg-surface-muted text-ink-muted`}>{t('income')}</th></tr>
            )}
            {incomes.map(itemRow)}
            {expenses.length > 0 && (
              <tr><th scope="rowgroup" colSpan={rows.length + 1} className={`${bandCell} bg-surface-muted text-ink-muted`}>{t('expenses')}</th></tr>
            )}
            {expenses.map(itemRow)}
          </tbody>
          <tfoot>
            {summaryRow(t('totalIn'), (r) => r.totalIn, 'gain')}
            {summaryRow(t('totalOut'), (r) => r.totalOut, 'loss')}
            {summaryRow(t('net'), (r) => r.net, 'signed')}
            {summaryRow(t('closing'), (r) => r.closing, 'closing')}
          </tfoot>
        </table>
      </div>
      {addingMonth && <OneOffDialog month={addingMonth} onClose={() => setAddingMonth(null)} />}
    </Card>
  );
}
