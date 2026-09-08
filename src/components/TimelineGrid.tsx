import { useState } from 'react';
import { occursIn, type MonthRow } from '../domain/engine';
import type { MonthKey } from '../domain/month';
import type { PlanItem } from '../domain/plan';
import { useLocale, useT } from '../i18n';
import { formatMoney, formatMonth } from '../i18n/format';
import { usePlanStore } from '../store/planStore';
import { OneOffDialog } from './OneOffDialog';

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
  const [addingMonth, setAddingMonth] = useState<MonthKey | null>(null);

  const money = (n: number) => formatMoney(n, plan.settings.currency, locale);
  const incomes = plan.items.filter((i) => i.direction === 'in');
  const expenses = plan.items.filter((i) => i.direction === 'out');

  const stickyCell = 'sticky start-0 z-10 bg-white ps-3 pe-2 text-start';
  const numCell = 'px-2 py-1 text-end tabular-nums whitespace-nowrap';

  const itemRow = (item: PlanItem) => (
    <tr key={item.id} className="border-t border-slate-100">
      <th scope="row" className={`${stickyCell} py-1 font-normal`}>
        <div className="flex items-center gap-2">
          <span className="truncate">{item.label}</span>
          <input
            type="month"
            aria-label={`${t('moveTo')}: ${item.label}`}
            title={t('moveTo')}
            className="rounded border border-slate-200 px-1 text-xs text-slate-600"
            value={anchorMonth(item)}
            onChange={(e) => { if (e.target.value) moveItem(item.id, e.target.value); }}
          />
        </div>
      </th>
      {rows.map((r) => (
        <td key={r.month} className={`${numCell} ${occursIn(item, r.month) ? '' : 'text-slate-300'}`}>
          {occursIn(item, r.month) ? money(item.amount) : '—'}
        </td>
      ))}
    </tr>
  );

  const summaryRow = (label: string, pick: (r: MonthRow) => number, highlightNegative = false) => (
    <tr className="border-t border-slate-200 font-medium">
      <th scope="row" className={`${stickyCell} py-1`}>{label}</th>
      {rows.map((r) => {
        const v = pick(r);
        return (
          <td key={r.month} className={`${numCell} ${highlightNegative && v < 0 ? 'bg-red-50 text-red-700' : ''}`}>
            {money(v)}
          </td>
        );
      })}
    </tr>
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th scope="col" className={`${stickyCell} bg-slate-50 py-2`}>{t('item')}</th>
              {rows.map((r) => (
                <th key={r.month} scope="col" className="px-2 py-2 text-end font-medium whitespace-nowrap">
                  <span className="me-1">{formatMonth(r.month, locale)}</span>
                  <button
                    type="button"
                    aria-label={t('addOneOff', { month: formatMonth(r.month, locale) })}
                    onClick={() => setAddingMonth(r.month)}
                    className="rounded border border-slate-300 px-1 leading-none text-slate-600 hover:bg-slate-200"
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
                <td colSpan={rows.length + 1} className="px-3 py-6 text-center text-slate-500">{t('noItems')}</td>
              </tr>
            )}
            {incomes.length > 0 && (
              <tr><th scope="rowgroup" colSpan={rows.length + 1} className={`${stickyCell} bg-emerald-50 py-1 text-emerald-800`}>{t('income')}</th></tr>
            )}
            {incomes.map(itemRow)}
            {expenses.length > 0 && (
              <tr><th scope="rowgroup" colSpan={rows.length + 1} className={`${stickyCell} bg-red-50 py-1 text-red-800`}>{t('expenses')}</th></tr>
            )}
            {expenses.map(itemRow)}
          </tbody>
          <tfoot>
            {summaryRow(t('totalIn'), (r) => r.totalIn)}
            {summaryRow(t('totalOut'), (r) => r.totalOut)}
            {summaryRow(t('net'), (r) => r.net)}
            {summaryRow(t('closing'), (r) => r.closing, true)}
          </tfoot>
        </table>
      </div>
      {addingMonth && <OneOffDialog month={addingMonth} onClose={() => setAddingMonth(null)} />}
    </section>
  );
}
