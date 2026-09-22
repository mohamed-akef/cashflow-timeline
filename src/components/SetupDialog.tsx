import { useMemo, useState } from 'react';
import { expand, summarize } from '../domain/engine';
import { CURRENCIES, HORIZON_PRESETS, MAX_HORIZON, type Direction, type Plan, type PlanItem } from '../domain/plan';
import { useLocale, useT, type MessageKey } from '../i18n';
import { formatMoney, formatMonth } from '../i18n/format';
import { usePlanStore } from '../store/planStore';
import { AmountInput } from './AmountInput';
import { ItemForm } from './ItemForm';
import { Badge, Button, CardContent, CardDescription, CardHeader, CardTitle, Dialog, Field, Input, Select, focusRing } from './ui';

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
  const clearAll = usePlanStore((s) => s.clearAll);

  const [draft, setDraft] = useState<Plan>(stored);
  const [editing, setEditing] = useState<Editing>(null);
  const [balanceText, setBalanceText] = useState(String(stored.settings.startingBalance));
  const canCancel = stored.items.length > 0;

  /**
   * clearAll leaves this dialog open, so it never remounts and the draft would
   * keep showing — and on save, write back — the plan just deleted. Re-seed the
   * local state from the store the way a fresh mount would.
   */
  const onClear = () => {
    if (!window.confirm(t('clearConfirm'))) return;
    clearAll();
    const fresh = usePlanStore.getState().plan;
    setDraft(fresh);
    setBalanceText(String(fresh.settings.startingBalance));
    setEditing(null);
  };

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

  const { settings } = draft;
  const sectionTitle = 'text-sm font-semibold text-ink';

  /** The figures the summary strip will show once this draft is saved. */
  const totals = useMemo(() => summarize(expand(draft)), [draft]);

  /**
   * When the rule repeats, the month is where it starts; when it happens once,
   * the month is the whole story. Rendering both the same way made a monthly
   * salary read as if it only landed in September.
   */
  const when = (item: PlanItem) => {
    if (item.recurrence.kind === 'once') return formatMonth(item.recurrence.month, locale);
    const from = t('fromMonth', { month: formatMonth(item.window.from, locale) });
    return item.window.to ? `${from} ${t('untilMonth', { month: formatMonth(item.window.to, locale) })}` : from;
  };

  const list = (direction: Direction, title: MessageKey, addKey: MessageKey) => {
    const items = draft.items.filter((i) => i.direction === direction);
    const total = direction === 'in' ? totals.totalIn : totals.totalOut;
    return (
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className={sectionTitle}>{t(title)}</h3>
          {items.length > 0 && (
            <p className={`text-sm tabular-nums ${direction === 'in' ? 'text-gain' : 'text-loss'}`}>
              {formatMoney(total, settings.currency, locale)}
              <span className="ms-1.5 text-xs text-ink-faint">{t('overMonths', { n: settings.horizonMonths })}</span>
            </p>
          )}
          <Button size="sm" className="ms-auto" onClick={() => setEditing({ direction })}>{t(addKey)}</Button>
        </div>
        {items.length > 0 && (
          <ul className="divide-y divide-line rounded-md border border-line">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-1 pe-2">
                {/* The row is the edit control: the common action gets the whole
                    target, and removing gets a quiet one beside it. */}
                <button
                  type="button"
                  aria-label={t('editItem', { label: item.label })}
                  onClick={() => setEditing({ direction, item })}
                  className={`flex flex-1 flex-wrap items-center gap-x-2 gap-y-1 rounded-s-md px-3 py-2 text-start text-sm transition-colors hover:bg-surface-muted ${focusRing}`}
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="tabular-nums text-ink-muted">{formatMoney(item.amount, settings.currency, locale)}</span>
                  <Badge>{t(RECURRENCE_KEY[item.recurrence.kind])}</Badge>
                  <span className="text-xs text-ink-faint">{when(item)}</span>
                </button>
                <Button
                  variant="ghost" size="sm" aria-label={t('deleteItem', { label: item.label })}
                  onClick={() => deleteItem(item.id)}
                >
                  ✕
                </Button>
              </li>
            ))}
          </ul>
        )}
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
    <Dialog
      labelledBy="setup-title" align="top" size="lg"
      onDismiss={editing ? () => setEditing(null) : closeSetup}
    >
      <CardHeader>
        <CardTitle as="h2" id="setup-title">{t('setupTitle')}</CardTitle>
        <CardDescription>{t('privacyNote')}</CardDescription>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 space-y-5 overflow-y-auto">
        <section className="space-y-2">
          <h3 className={sectionTitle}>{t('basics')}</h3>
          <div className="flex flex-wrap items-start gap-3">
            <Field label={t('startingBalance')} className="w-36">
              <AmountInput size="default" allowNegative value={balanceText}
                onChange={(text) => {
                  setBalanceText(text);
                  const n = Number(text);
                  if (text !== '' && Number.isFinite(n)) setSettings({ startingBalance: n });
                }} />
            </Field>
            <Field label={t('startMonth')} className="w-40">
              <Input size="default" type="month" value={settings.startMonth}
                onChange={(e) => e.target.value && setSettings({ startMonth: e.target.value })} />
            </Field>
            <Field label={t('horizon')} hint={t('horizonHint')} className="w-48">
              <Input size="default" type="number" min={1} max={MAX_HORIZON} list="horizon-presets" value={settings.horizonMonths}
                onChange={(e) => { const n = Math.round(Number(e.target.value)); if (n >= 1 && n <= MAX_HORIZON) setSettings({ horizonMonths: n }); }} />
            </Field>
            <datalist id="horizon-presets">{HORIZON_PRESETS.map((n) => <option key={n} value={n} />)}</datalist>
            <Field label={t('currency')} className="w-24">
              <Select size="default" value={settings.currency} onChange={(e) => setSettings({ currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </div>
        </section>

        {list('in', 'income', 'addIncome')}
        {list('out', 'expenses', 'addExpense')}

        {/* Irreversible, so it sits at the end behind a dialog rather than in
            the bar, and states what it removes before you reach the button. */}
        <section className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-4">
          <div>
            <h3 className={sectionTitle}>{t('deletePlan')}</h3>
            <p className="text-xs text-ink-faint">{t('deletePlanHint')}</p>
          </div>
          <Button variant="destructive" size="sm" onClick={onClear}>{t('clearAll')}</Button>
        </section>
      </CardContent>

      <div className="flex items-center justify-end gap-2 border-t border-line p-4">
        {canCancel && <Button onClick={closeSetup}>{t('cancel')}</Button>}
        <Button variant="primary" onClick={() => savePlan(draft)}>{t('savePlan')}</Button>
      </div>
    </Dialog>
  );
}
