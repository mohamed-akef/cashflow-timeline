import type { Summary } from '../domain/engine';
import { useLocale, useT } from '../i18n';
import { formatMoney, formatMonth } from '../i18n/format';
import { usePlanStore } from '../store/planStore';

interface Props {
  summary: Summary;
  monthCount: number;
}

export function SummaryStrip({ summary, monthCount }: Props) {
  const t = useT();
  const locale = useLocale();
  const currency = usePlanStore((s) => s.plan.settings.currency);

  if (summary.allPositive) {
    return (
      <div role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-900">
        {t('summaryAllPositive', { n: monthCount })}
      </div>
    );
  }

  return (
    <div role="status" className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-900">
      <span>{t('summaryFirstNegative', { month: formatMonth(summary.firstNegative!, locale) })}</span>
      <span>{t('summaryLowest', {
        amount: formatMoney(summary.lowest.balance, currency, locale),
        month: formatMonth(summary.lowest.month, locale),
      })}</span>
      <span>
        {summary.recovery
          ? t('summaryRecovers', { month: formatMonth(summary.recovery, locale) })
          : t('summaryNeverRecovers')}
      </span>
    </div>
  );
}
