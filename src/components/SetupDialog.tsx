import { useState } from 'react';
import { CURRENCIES, HORIZON_PRESETS, MAX_HORIZON, type Direction, type Plan, type PlanItem } from '../domain/plan';
import { useLocale, useT, type MessageKey } from '../i18n';
import { formatMoney, formatMonth } from '../i18n/format';
import { usePlanStore } from '../store/planStore';
import { ItemForm } from './ItemForm';
import { btnPrimary, btnSecondary, fieldLabel, input } from './ui';

type Editing = { direction: Direction; item?: PlanItem } | null;

const RECURRENCE_KEY: Record<PlanItem['recurrence']['kind'], MessageKey> = {
  monthly: 'recurrenceMonthly', once: 'recurrenceOnce', everyN: 'recurrenceEveryN', specificMonths: 'recurrenceSpecificMonths',
};

export function SetupDialog() {
  const t = useT();
  const locale = useLocale();
  const stored = usePlanStore((s) => s.plan);
  const savePlan = usePlanStore((s) => s.savePlan);
  const closeSetup = usePlanStore((s) => s.closeSetup);

  const [draft, setDraft] = useState<Plan>(stored);
  const [editing, setEditing] = useState<Editing>(null);
  const [balanceText, setBalanceText] = useState(String(stored.settings.startingBalance));
  const canCancel = stored.items.length > 0;

  const setSettings = (patch: Partial<Plan['settings']>) =>
    setDraft((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  const upsertItem = (item: PlanItem) => {
    setDraft((d) => ({
      ...d,
      items: d.items.some((i) => i.id === item.id) ? d.items.map((i) => (i.id === item.id ? item : i)) : [...d.items, item],
    }));
    setEditing(null);
  };

  const deleteItem = (id: string) => setDraft((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));

  const field = `${input} w-full`;
  const button = btnSecondary;
  const { settings } = draft;

  const list = (direction: Direction, title: MessageKey, addKey: MessageKey) => {
    const items = draft.items.filter((i) => i.direction === direction);
    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{t(title)}</h3>
          <button type="button" className={button} onClick={() => setEditing({ direction })}>{t(addKey)}</button>
        </div>
        <ul className="divide-y divide-line rounded border border-line">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-1.5 text-sm">
              <span className="me-auto">
                <span className="font-medium">{item.label}</span>
                <span className="ms-2 text-ink-faint">
                  {formatMoney(item.amount, settings.currency, locale)} · {t(RECURRENCE_KEY[item.recurrence.kind])} · {formatMonth(item.window.from, locale)}
                  {item.window.to ? ` → ${formatMonth(item.window.to, locale)}` : ''}
                </span>
              </span>
              <button type="button" className={button} onClick={() => setEditing({ direction, item })}>{t('edit')}</button>
              <button type="button" className={`${button} text-red-700 dark:text-red-400`} onClick={() => deleteItem(item.id)}>{t('delete')}</button>
            </li>
          ))}
        </ul>
        {editing?.direction === direction && (
          <ItemForm
            direction={direction}
            currency={settings.currency}
            initial={editing.item}
            defaultMonth={settings.startMonth}
            onSave={upsertItem}
            onCancel={() => setEditing(null)}
          />
        )}
      </section>
    );
  };

  return (
    <div className="fixed inset-0 z-10 flex items-start justify-center overflow-y-auto bg-black/40 p-4 dark:bg-black/60 motion-safe:animate-fade">
      <div role="dialog" aria-modal="true" aria-labelledby="setup-title" className="w-full max-w-2xl space-y-4 rounded-lg bg-surface p-4 shadow-xl motion-safe:animate-pop">
        <h2 id="setup-title" className="text-lg font-semibold">{t('setupTitle')}</h2>

        <section className="space-y-2">
          <h3 className="font-medium">{t('basics')}</h3>
          <div className="flex flex-wrap items-start gap-3 text-sm">
            <label className="block w-36">
              <span className={fieldLabel}>{t('startingBalance')}</span>
              <input className={field} type="number" step="any" value={balanceText}
                onChange={(e) => {
                  setBalanceText(e.target.value);
                  const n = Number(e.target.value);
                  if (e.target.value !== '' && Number.isFinite(n)) setSettings({ startingBalance: n });
                }} />
            </label>
            <label className="block w-40">
              <span className={fieldLabel}>{t('startMonth')}</span>
              <input className={field} type="month" value={settings.startMonth}
                onChange={(e) => e.target.value && setSettings({ startMonth: e.target.value })} />
            </label>
            <label className="block w-48">
              <span className={fieldLabel}>{t('horizon')}</span>
              <input className={field} type="number" min={1} max={MAX_HORIZON} list="horizon-presets" value={settings.horizonMonths}
                onChange={(e) => { const n = Math.round(Number(e.target.value)); if (n >= 1 && n <= MAX_HORIZON) setSettings({ horizonMonths: n }); }} />
              <datalist id="horizon-presets">{HORIZON_PRESETS.map((n) => <option key={n} value={n} />)}</datalist>
              <span className="mt-1 block text-xs text-ink-faint">{t('horizonHint')}</span>
            </label>
            <label className="block w-24">
              <span className={fieldLabel}>{t('currency')}</span>
              <select className={field} value={settings.currency} onChange={(e) => setSettings({ currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
        </section>

        {list('in', 'income', 'addIncome')}
        {list('out', 'expenses', 'addExpense')}

        <div className="flex justify-end gap-2 border-t border-line pt-3">
          {canCancel && (
            <button type="button" className={button} onClick={closeSetup}>{t('cancel')}</button>
          )}
          <button type="button" className={btnPrimary} onClick={() => savePlan(draft)}>
            {t('savePlan')}
          </button>
        </div>
        <p className="text-xs text-ink-faint">{t('privacyNote')}</p>
      </div>
    </div>
  );
}
