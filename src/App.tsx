import { useEffect, useMemo } from 'react';
import { AppBar } from './components/AppBar';
import { Charts } from './components/Charts';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SetupDialog } from './components/SetupDialog';
import { SummaryStrip } from './components/SummaryStrip';
import { TimelineGrid } from './components/TimelineGrid';
import { PlanAlerts } from './components/Toolbar';
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
        <a
          href="#plan"
          className="sr-only rounded-md bg-accent px-3 py-2 text-sm font-medium text-on-accent focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-40"
        >
          {t(locale, 'skipToContent')}
        </a>
        <AppBar />
        <main id="plan" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 space-y-4 p-4 focus:outline-none">
          <PlanAlerts />
          <SummaryStrip summary={summary} monthCount={rows.length} />
          <Charts rows={rows} />
          <TimelineGrid rows={rows} />
        </main>
        <footer className="mx-auto w-full max-w-7xl px-4 py-5 text-xs text-ink-faint">{t(locale, 'privacyNote')}</footer>
        {setupOpen && <SetupDialog />}
      </ErrorBoundary>
    </div>
  );
}
