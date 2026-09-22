import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { CURRENCIES, HORIZON_PRESETS, MAX_HORIZON } from '../domain/plan';
import { exportFilename, exportPlan } from '../domain/serialize';
import { useT } from '../i18n';
import { usePlanStore } from '../store/planStore';
import { Alert, Button, Input, Select, focusRing } from './ui';

const PRESETS: readonly number[] = HORIZON_PRESETS;

/** FileReader rather than File.text(): supported by every browser and by jsdom. */
const readText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

/** Two halves of one control, sharing the border of the group around them. */
const segment =
  `inline-flex items-center px-3 bg-surface text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent ${focusRing}`;

/**
 * Plan-level controls, rendered inside the AppBar rather than as a band of
 * their own: what the plan covers on the start side, what you can do with it
 * on the end side. Duration and Currency hide on a narrow screen, where the
 * Setup dialog carries the same two fields.
 */
export function Toolbar() {
  const t = useT();
  const plan = usePlanStore((s) => s.plan);
  const updateSettings = usePlanStore((s) => s.updateSettings);
  const importFromText = usePlanStore((s) => s.importFromText);
  const clearImportError = usePlanStore((s) => s.clearImportError);
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

  return (
    <>
      <div className="hidden items-center gap-2 sm:flex">
        <Select aria-label={t('horizon')} value={custom ? 'custom' : String(horizonMonths)} onChange={onHorizonSelect}>
          {PRESETS.map((n) => <option key={n} value={n}>{t('horizonMonths', { n })}</option>)}
          <option value="custom">{t('horizonCustom')}</option>
        </Select>
        {custom && (
          <Input
            ref={customInputRef}
            className="w-16 text-end tabular-nums"
            type="number" min={1} max={MAX_HORIZON} aria-label={t('horizon')}
            defaultValue={horizonMonths} onChange={onCustomHorizon}
          />
        )}
        <Select aria-label={t('currency')} value={currency} onChange={(e) => updateSettings({ currency: e.target.value })}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      <div className="ms-auto flex items-center gap-2">
        <Button size="sm" onClick={openSetup}>{t('openSetup')}</Button>
        {/* Saving and opening are one concern, so they share one outline. */}
        <div className="flex h-8 overflow-hidden rounded-md border border-line-strong text-sm font-medium">
          <button type="button" onClick={onExport} className={segment}>{t('saveCopy')}</button>
          <label className={`${segment} cursor-pointer border-s border-line-strong`}>
            {t('openCopy')}
            <input type="file" accept=".json,application/json" className="sr-only" aria-label={t('openCopy')} onChange={onImportFile} onClick={clearImportError} />
          </label>
        </div>
      </div>
    </>
  );
}

/** Import and storage failures, shown above the plan rather than inside the bar. */
export function PlanAlerts() {
  const t = useT();
  const importError = usePlanStore((s) => s.importError);
  const storageError = usePlanStore((s) => s.storageError);
  if (!importError && !storageError) return null;

  return (
    <div className="space-y-2">
      {importError && <Alert tone="destructive">{t(`importError_${importError}`)}</Alert>}
      {storageError && <Alert tone="warning" role="status">{t('storageError')}</Alert>}
    </div>
  );
}
