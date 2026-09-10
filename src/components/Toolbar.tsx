import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { CURRENCIES, HORIZON_PRESETS, MAX_HORIZON } from '../domain/plan';
import { exportFilename, exportPlan } from '../domain/serialize';
import { useT } from '../i18n';
import { usePlanStore } from '../store/planStore';
import { Alert, Button, Field, Input, Select, buttonClass } from './ui';

const PRESETS: readonly number[] = HORIZON_PRESETS;

/** FileReader rather than File.text(): supported by every browser and by jsdom. */
const readText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

/** Plan-level controls only: what the plan covers on the start side, what you can do with it on the end side. */
export function Toolbar() {
  const t = useT();
  const plan = usePlanStore((s) => s.plan);
  const updateSettings = usePlanStore((s) => s.updateSettings);
  const importFromText = usePlanStore((s) => s.importFromText);
  const importError = usePlanStore((s) => s.importError);
  const clearImportError = usePlanStore((s) => s.clearImportError);
  const storageError = usePlanStore((s) => s.storageError);
  const clearAll = usePlanStore((s) => s.clearAll);
  const openSetup = usePlanStore((s) => s.openSetup);

  const { horizonMonths, currency } = plan.settings;
  const [explicitCustom, setExplicitCustom] = useState(false);
  const custom = explicitCustom || !PRESETS.includes(horizonMonths);
  const customInputRef = useRef<HTMLInputElement>(null);

  // Keep the uncontrolled custom-horizon input in sync when horizonMonths changes
  // from elsewhere (import, Setup save) — but never while the user is mid-keystroke
  // in this very field, or every digit would remount the input and drop focus.
  useEffect(() => {
    const el = customInputRef.current;
    if (el && document.activeElement !== el) el.value = String(horizonMonths);
  }, [horizonMonths]);

  const onHorizonSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === 'custom') { setExplicitCustom(true); return; }
    setExplicitCustom(false);
    updateSettings({ horizonMonths: Number(e.target.value) });
  };

  const onCustomHorizon = (e: ChangeEvent<HTMLInputElement>) => {
    const n = Math.round(Number(e.target.value));
    if (n >= 1 && n <= MAX_HORIZON) updateSettings({ horizonMonths: n });
  };

  const onExport = () => {
    const blob = new Blob([exportPlan(plan)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename();
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importFromText(await readText(file));
    e.target.value = '';
  };

  const onClear = () => {
    if (window.confirm(t('clearConfirm'))) clearAll();
  };

  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-start gap-x-5 gap-y-3 px-4 py-3">
        <Field label={t('horizon')} hint={t('horizonHint')}>
          {(id) => (
            <div className="flex items-center gap-1.5">
              <Select id={id} size="default" value={custom ? 'custom' : String(horizonMonths)} onChange={onHorizonSelect}>
                {PRESETS.map((n) => <option key={n} value={n}>{t('horizonMonths', { n })}</option>)}
                <option value="custom">{t('horizonCustom')}</option>
              </Select>
              {custom && (
                <Input
                  ref={customInputRef}
                  size="default" className="w-20 text-end tabular-nums"
                  type="number" min={1} max={MAX_HORIZON} aria-label={t('horizon')}
                  defaultValue={horizonMonths} onChange={onCustomHorizon}
                />
              )}
            </div>
          )}
        </Field>

        <Field label={t('currency')}>
          <Select size="default" value={currency} onChange={(e) => updateSettings({ currency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>

        <div className="ms-auto flex flex-wrap items-center gap-2 self-center">
          <Button variant="primary" onClick={openSetup}>{t('openSetup')}</Button>
          <Button onClick={onExport}>{t('exportJson')}</Button>
          <label className={buttonClass('secondary', 'default', 'cursor-pointer')}>
            {t('importJson')}
            <input type="file" accept=".json,application/json" className="sr-only" aria-label={t('importJson')} onChange={onImportFile} onClick={clearImportError} />
          </label>
          <Button variant="destructive" onClick={onClear}>{t('clearAll')}</Button>
        </div>
      </div>

      {(importError || storageError) && (
        <div className="mx-auto max-w-7xl space-y-2 px-4 pb-3">
          {importError && <Alert tone="destructive">{t(`importError_${importError}`)}</Alert>}
          {storageError && <Alert tone="warning" role="status">{t('storageError')}</Alert>}
        </div>
      )}
    </div>
  );
}
