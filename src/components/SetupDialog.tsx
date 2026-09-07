import { useState } from 'react';
import { CURRENCIES, HORIZON_PRESETS, MAX_HORIZON, type Direction, type Locale, type Plan, type PlanItem } from '../domain/plan';
import { useLocale, useT, type MessageKey } from '../i18n';
import { formatMoney, formatMonth } from '../i18n/format';
import { usePlanStore } from '../store/planStore';
import { ItemForm } from './ItemForm';

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
  const updateSettings = usePlanStore((s) => s.updateSettings);

  const [draft, setDraft] = useState<Plan>(stored);
  const [editing, setEditing] = useState<Editing>(null);
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

  const switchLocale = (next: Locale) => {
    setSettings({ locale: next });
    updateSettings({ locale: next });
  };

  const field = 'w-full rounded border border-slate-300 px-2 py-1';
  const button = 'rounded border border-slate-300 bg-white px-2 py-1 text-sm hover:bg-slate-100';
  const { settings } = draft;

  const list = (direction: Direction, title: MessageKey, addKey: MessageKey) => {
    const items = draft.items.filter((i) => i.direction === direction);
    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{t(title)}</h3>
          <button type="button" className={button} onClick={() => setEditing({ direction })}>{t(addKey)}</button>
        </div>
        <ul className="divide-y divide-slate-200 rounded border border-slate-200">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="me-auto">
                <span className="font-medium">{item.label}</span>
                <span className="ms-2 text-slate-500">
                  {formatMoney(item.amount, settings.currency, locale)} · {t(RECURRENCE_KEY[item.recurrence.kind])} · {formatMonth(item.window.from, locale)}
                  {item.window.to ? ` → ${formatMonth(item.window.to, locale)}` : ''}
                </span>
              </span>
              <button type="button" className={button} onClick={() => setEditing({ direction, item })}>{t('edit')}</button>
              <button type="button" className={`${button} text-red-700`} onClick={() => deleteItem(item.id)}>{t('delete')}</button>
            </li>
          ))}
        </ul>
        {editing?.direction === direction && (
          <ItemForm
            direction={direction}
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
    <div className="fixed inset-0 z-10 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="setup-title" className="w-full max-w-2xl space-y-6 rounded-lg bg-white p-5 shadow-xl">
        <h2 id="setup-title" className="text-xl font-semibold">{t('setupTitle')}</h2>

        <section className="space-y-3">
          <h3 className="font-medium">{t('basics')}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="block">
              <span className="mb-1 block">{t('startingBalance')}</span>
              <input className={field} type="number" step="any" value={settings.startingBalance}
                onChange={(e) => setSettings({ startingBalance: Number(e.target.value) || 0 })} />
            </label>
            <label className="block">
              <span className="mb-1 block">{t('startMonth')}</span>
              <input className={field} type="month" value={settings.startMonth}
                onChange={(e) => e.target.value && setSettings({ startMonth: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block">{t('horizon')}</span>
              <input className={field} type="number" min={1} max={MAX_HORIZON} list="horizon-presets" value={settings.horizonMonths}
                onChange={(e) => { const n = Math.round(Number(e.target.value)); if (n >= 1 && n <= MAX_HORIZON) setSettings({ horizonMonths: n }); }} />
              <datalist id="horizon-presets">{HORIZON_PRESETS.map((n) => <option key={n} value={n} />)}</datalist>
            </label>
            <label className="block">
              <span className="mb-1 block">{t('currency')}</span>
              <select className={field} value={settings.currency} onChange={(e) => setSettings({ currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block">{t('language')}</span>
              <select className={field} value={settings.locale} onChange={(e) => switchLocale(e.target.value as Locale)}>
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </label>
          </div>
        </section>

        {list('in', 'income', 'addIncome')}
        {list('out', 'expenses', 'addExpense')}

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          {canCancel && (
            <button type="button" className={button} onClick={closeSetup}>{t('cancel')}</button>
          )}
          <button type="button" className="rounded bg-slate-900 px-4 py-1.5 text-white hover:bg-slate-700" onClick={() => savePlan(draft)}>
            {t('savePlan')}
          </button>
        </div>
        <p className="text-xs text-slate-500">{t('privacyNote')}</p>
      </div>
    </div>
  );
}
