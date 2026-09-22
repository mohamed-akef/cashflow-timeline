import { useEffect, useMemo, useRef } from 'react';
import { AppBar } from './components/AppBar';
import { Charts } from './components/Charts';
import { useColumnLayout, useSyncedScroll } from './components/columns';
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

  // The chart draws each month over its grid column and scrolls with the grid.
  const table = useRef<HTMLTableElement>(null);
  const gridScroll = useRef<HTMLDivElement>(null);
  const chartScroll = useRef<HTMLDivElement>(null);
  const columns = useColumnLayout(table, [rows, locale]);
  useSyncedScroll(chartScroll, gridScroll);

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
          <Charts rows={rows} columns={columns} scrollRef={chartScroll} />
          <TimelineGrid rows={rows} tableRef={table} scrollRef={gridScroll} />
        </main>
        <footer className="mx-auto w-full max-w-7xl px-4 py-5 text-xs text-ink-faint">{t(locale, 'privacyNote')}</footer>
        {setupOpen && <SetupDialog />}
      </ErrorBoundary>
    </div>
  );
}
