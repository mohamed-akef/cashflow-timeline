import { useState } from 'react';
import { CURRENCIES, HORIZON_PRESETS, MAX_HORIZON, type Direction, type Plan, type PlanItem } from '../domain/plan';
import { useLocale, useT, type MessageKey } from '../i18n';
import { formatMoney, formatMonth } from '../i18n/format';
import { usePlanStore } from '../store/planStore';
import { ItemForm } from './ItemForm';
import { Badge, Button, CardContent, CardDescription, CardHeader, CardTitle, Dialog, Field, Input, Select } from './ui';

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

  const { settings } = draft;
  const sectionTitle = 'text-sm font-semibold text-ink';

  const list = (direction: Direction, title: MessageKey, addKey: MessageKey) => {
    const items = draft.items.filter((i) => i.direction === direction);
    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className={sectionTitle}>{t(title)}</h3>
          <Button size="sm" onClick={() => setEditing({ direction })}>{t(addKey)}</Button>
        </div>
        {items.length > 0 && (
          <ul className="divide-y divide-line rounded-md border border-line">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                <span className="me-auto flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium">{item.label}</span>
                  <span className="tabular-nums text-ink-muted">{formatMoney(item.amount, settings.currency, locale)}</span>
                  <Badge>{t(RECURRENCE_KEY[item.recurrence.kind])}</Badge>
                  <span className="text-xs text-ink-faint">
                    {formatMonth(item.window.from, locale)}
                    {item.window.to ? ` → ${formatMonth(item.window.to, locale)}` : ''}
                  </span>
                </span>
                <Button size="sm" onClick={() => setEditing({ direction, item })}>{t('edit')}</Button>
                <Button size="sm" variant="destructive" onClick={() => deleteItem(item.id)}>{t('delete')}</Button>
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
    <Dialog labelledBy="setup-title" align="top" size="lg">
      <CardHeader>
        <CardTitle as="h2" id="setup-title">{t('setupTitle')}</CardTitle>
        <CardDescription>{t('privacyNote')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <section className="space-y-2">
          <h3 className={sectionTitle}>{t('basics')}</h3>
          <div className="flex flex-wrap items-start gap-3">
            <Field label={t('startingBalance')} className="w-36">
              <Input size="default" className="text-end tabular-nums" type="number" step="any" value={balanceText}
                onChange={(e) => {
                  setBalanceText(e.target.value);
                  const n = Number(e.target.value);
                  if (e.target.value !== '' && Number.isFinite(n)) setSettings({ startingBalance: n });
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
      </CardContent>

      <div className="flex items-center justify-end gap-2 border-t border-line p-4">
        {canCancel && <Button onClick={closeSetup}>{t('cancel')}</Button>}
        <Button variant="primary" onClick={() => savePlan(draft)}>{t('savePlan')}</Button>
      </div>
    </Dialog>
  );
}
