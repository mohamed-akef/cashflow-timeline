import { useEffect, useMemo } from 'react';
import { BalanceChart } from './components/BalanceChart';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SetupDialog } from './components/SetupDialog';
import { SummaryStrip } from './components/SummaryStrip';
import { TimelineGrid } from './components/TimelineGrid';
import { Toolbar } from './components/Toolbar';
import { expand, summarize } from './domain/engine';
import { applyLocaleToDocument } from './i18n';
import { usePlanStore } from './store/planStore';

export default function App() {
  const plan = usePlanStore((s) => s.plan);
  const setupOpen = usePlanStore((s) => s.setupOpen);

  useEffect(() => {
    applyLocaleToDocument(plan.settings.locale);
  }, [plan.settings.locale]);

  const rows = useMemo(() => expand(plan), [plan]);
  const summary = useMemo(() => summarize(rows), [rows]);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <ErrorBoundary>
        <Toolbar />
        <main className="mx-auto max-w-7xl space-y-4 p-4">
          <SummaryStrip summary={summary} monthCount={rows.length} />
          <BalanceChart rows={rows} />
          <TimelineGrid rows={rows} />
        </main>
        {setupOpen && <SetupDialog />}
      </ErrorBoundary>
    </div>
  );
}
