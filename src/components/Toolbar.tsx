import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { CURRENCIES, HORIZON_PRESETS, MAX_HORIZON } from '../domain/plan';
import { exportFilename, exportPlan } from '../domain/serialize';
import { useT } from '../i18n';
import { usePlanStore } from '../store/planStore';

const PRESETS: readonly number[] = HORIZON_PRESETS;

/** FileReader rather than File.text(): supported by every browser and by jsdom. */
const readText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

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

  const { horizonMonths, locale, currency } = plan.settings;
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

  const control = 'rounded border border-slate-300 bg-white px-2 py-1 text-sm';
  const button = 'rounded border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-100';

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 p-3">
        <h1 className="me-auto text-lg font-semibold">{t('appTitle')}</h1>

        <label className="flex items-center gap-1 text-sm">
          <span>{t('horizon')}</span>
          <select className={control} aria-label={t('horizon')} value={custom ? 'custom' : String(horizonMonths)} onChange={onHorizonSelect}>
            {PRESETS.map((n) => <option key={n} value={n}>{t('horizonMonths', { n })}</option>)}
            <option value="custom">{t('horizonCustom')}</option>
          </select>
          {custom && (
            <input
              ref={customInputRef}
              type="number" min={1} max={MAX_HORIZON} aria-label={t('horizon')}
              className={`${control} w-20`} defaultValue={horizonMonths} onChange={onCustomHorizon}
            />
          )}
        </label>

        <label className="flex items-center gap-1 text-sm">
          <span>{t('currency')}</span>
          <select className={control} value={currency} onChange={(e) => updateSettings({ currency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <button type="button" className={button} onClick={() => updateSettings({ locale: locale === 'ar' ? 'en' : 'ar' })}>
          {t('switchLanguage')}
        </button>
        <button type="button" className={button} onClick={openSetup}>{t('openSetup')}</button>
        <button type="button" className={button} onClick={onExport}>{t('exportJson')}</button>
        <label className={`${button} cursor-pointer`}>
          {t('importJson')}
          <input type="file" accept=".json,application/json" className="sr-only" aria-label={t('importJson')} onChange={onImportFile} onClick={clearImportError} />
        </label>
        <button type="button" className={`${button} text-red-700`} onClick={onClear}>{t('clearAll')}</button>
      </div>

      {importError && (
        <p role="alert" className="mx-auto max-w-7xl px-3 pb-2 text-sm text-red-700">{t(`importError_${importError}`)}</p>
      )}
      {storageError && (
        <p role="status" className="mx-auto max-w-7xl px-3 pb-2 text-sm text-amber-700">{t('storageError')}</p>
      )}
      <p className="mx-auto max-w-7xl px-3 pb-2 text-xs text-slate-500">{t('privacyNote')}</p>
    </header>
  );
}
