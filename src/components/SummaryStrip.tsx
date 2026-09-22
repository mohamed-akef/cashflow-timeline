import type { ReactNode } from 'react';
import type { Summary } from '../domain/engine';
import { useLocale, useT } from '../i18n';
import { formatMoney, formatMonth } from '../i18n/format';
import { usePlanStore } from '../store/planStore';
import { Card } from './ui';

interface Props {
  summary: Summary;
  monthCount: number;
}

/** A label/value pair in the strip's definition list. */
function Stat({ label, tone, children }: { label: string; tone?: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd className={`font-medium ${tone ?? 'text-ink'}`}>{children}</dd>
    </div>
  );
}

/**
 * The plan's verdict in one glance: the lowest balance is the number that
 * decides whether the plan works, so it leads; the dates and totals that
 * explain it follow as label/value pairs.
 *
 * Colour follows the grid's rule — a figure is tinted only where its sign
 * carries meaning, so levels stay neutral and changes read green or red.
 */
export function SummaryStrip({ summary, monthCount }: Props) {
  const t = useT();
  const locale = useLocale();
  const currency = usePlanStore((s) => s.plan.settings.currency);
  const ok = summary.allPositive;

  const money = (n: number, signed = false) => formatMoney(n, currency, locale, signed);
  const signedTone = (n: number) => (n < 0 ? 'text-loss' : 'text-gain');

  return (
    <Card role="status" className="flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3">
      <div className="min-w-48">
        <div className="text-xs font-medium text-ink-muted">{t('summaryLowest')}</div>
        <div className={`text-2xl font-semibold leading-tight ${ok ? 'text-gain' : 'text-loss'}`}>
          {money(summary.lowest.balance)}
          <span className="ms-2 text-sm font-normal text-ink-muted">{t('summaryIn', { month: formatMonth(summary.lowest.month, locale) })}</span>
        </div>
      </div>

      {ok && <p className="text-sm font-medium text-ink">{t('summaryAllPositive', { n: monthCount })}</p>}

      <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
        {!ok && (
          <>
            <Stat label={t('summaryFirstNegative')}>{formatMonth(summary.firstNegative!, locale)}</Stat>
            <Stat label={t('summaryRecovers')}>
              {summary.recovery ? formatMonth(summary.recovery, locale) : t('summaryNeverRecovers')}
            </Stat>
          </>
        )}

        <Stat label={t('summaryEnding')} tone={summary.ending < 0 ? 'text-loss' : 'text-ink'}>
          {money(summary.ending)}
          <span className={`ms-1.5 text-xs font-normal ${signedTone(summary.netChange)}`}>{money(summary.netChange, true)}</span>
        </Stat>
        <Stat label={t('summaryAverage')} tone={signedTone(summary.averageNet)}>{money(summary.averageNet, true)}</Stat>
        <Stat label={t('summaryMoneyIn')} tone="text-gain">{money(summary.totalIn)}</Stat>
        <Stat label={t('summaryMoneyOut')} tone="text-loss">{money(summary.totalOut)}</Stat>
      </dl>
    </Card>
  );
}
