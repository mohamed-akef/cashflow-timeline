import type { Summary } from '../domain/engine';
import { useLocale, useT } from '../i18n';
import { formatMoney, formatMonth } from '../i18n/format';
import { usePlanStore } from '../store/planStore';

interface Props {
  summary: Summary;
  monthCount: number;
}

/**
 * The plan's verdict in one glance: the lowest balance is the number that
 * decides whether the plan works, so it leads; the dates that explain it
 * follow as label/value pairs.
 */
export function SummaryStrip({ summary, monthCount }: Props) {
  const t = useT();
  const locale = useLocale();
  const currency = usePlanStore((s) => s.plan.settings.currency);
  const ok = summary.allPositive;

  const tone = ok
    ? 'border-gain/30 bg-gain-soft'
    : 'border-loss/30 bg-loss-soft';
  const figure = ok ? 'text-gain' : 'text-loss';

  return (
    <div role="status" className={`flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border px-4 py-3 ${tone}`}>
      <div className="min-w-48">
        <div className="text-xs font-medium text-ink-muted">{t('summaryLowest')}</div>
        <div className={`text-2xl font-semibold tabular-nums leading-tight ${figure}`}>
          {formatMoney(summary.lowest.balance, currency, locale)}
          <span className="ms-2 text-sm font-normal text-ink-muted">{t('summaryIn', { month: formatMonth(summary.lowest.month, locale) })}</span>
        </div>
      </div>

      {ok ? (
        <p className="text-sm font-medium text-ink">{t('summaryAllPositive', { n: monthCount })}</p>
      ) : (
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="text-xs font-medium text-ink-muted">{t('summaryFirstNegative')}</dt>
            <dd className="font-medium text-ink">{formatMonth(summary.firstNegative!, locale)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-ink-muted">{t('summaryRecovers')}</dt>
            <dd className="font-medium text-ink">
              {summary.recovery ? formatMonth(summary.recovery, locale) : t('summaryNeverRecovers')}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
