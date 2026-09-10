import { useEffect, useMemo } from 'react';
import { AppBar } from './components/AppBar';
import { BalanceChart } from './components/BalanceChart';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SetupDialog } from './components/SetupDialog';
import { SummaryStrip } from './components/SummaryStrip';
import { TimelineGrid } from './components/TimelineGrid';
import { Toolbar } from './components/Toolbar';
import { expand, summarize } from './domain/engine';
import { applyLocaleToDocument, t, useLocale } from './i18n';
import { usePlanStore } from './store/planStore';

export default function App() {
  const plan = usePlanStore((s) => s.plan);
  const setupOpen = usePlanStore((s) => s.setupOpen);
  const locale = useLocale();

  useEffect(() => {
    applyLocaleToDocument(locale);
  }, [locale]);

  const rows = useMemo(() => expand(plan), [plan]);
  const summary = useMemo(() => summarize(rows), [rows]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <ErrorBoundary>
        <AppBar />
        <Toolbar />
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 p-4">
          <SummaryStrip summary={summary} monthCount={rows.length} />
          <BalanceChart rows={rows} />
          <TimelineGrid rows={rows} />
        </main>
        <footer className="mx-auto w-full max-w-7xl px-4 py-5 text-xs text-ink-faint">{t(locale, 'privacyNote')}</footer>
        {setupOpen && <SetupDialog />}
      </ErrorBoundary>
    </div>
  );
}
