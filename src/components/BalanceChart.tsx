import type { MonthRow } from '../domain/engine';
import { useLocale, useT } from '../i18n';
import { formatMoney, formatMonth } from '../i18n/format';
import { usePlanStore } from '../store/planStore';

const W = 960;
const H = 240;
const PAD = { top: 16, bottom: 28, x: 24 };

interface Props {
  rows: MonthRow[];
}

export function BalanceChart({ rows }: Props) {
  const t = useT();
  const locale = useLocale();
  const currency = usePlanStore((s) => s.plan.settings.currency);
  const rtl = locale === 'ar';

  const closings = rows.map((r) => r.closing);
  const min = Math.min(0, ...closings);
  const max = Math.max(0, ...closings);
  const span = max - min || 1;
  const innerH = H - PAD.top - PAD.bottom;
  const innerW = W - PAD.x * 2;
  const step = rows.length > 1 ? innerW / (rows.length - 1) : 0;

  const x = (i: number) => {
    const pos = rows.length > 1 ? i * step : innerW / 2;
    return PAD.x + (rtl ? innerW - pos : pos);
  };
  const y = (v: number) => PAD.top + ((max - v) / span) * innerH;
  const zeroY = y(0);

  const points = rows.map((r, i) => `${x(i)},${y(r.closing)}`).join(' ');
  const hasNegative = closings.some((c) => c < 0);
  const areaPoints = rows.length > 0
    ? `${x(0)},${zeroY} ${points} ${x(rows.length - 1)},${zeroY}`
    : '';
  const slot = rows.length > 1 ? step : innerW;

  return (
    <figure className="rounded-lg border border-line bg-surface p-3">
      <figcaption className="mb-2 text-sm font-medium text-ink-muted">{t('chartTitle')}</figcaption>
      <svg role="img" aria-label={t('chartTitle')} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        <defs>
          <clipPath id="below-zero">
            <rect x={0} y={zeroY} width={W} height={Math.max(0, H - zeroY)} />
          </clipPath>
        </defs>
        <line x1={PAD.x} x2={W - PAD.x} y1={zeroY} y2={zeroY} className="stroke-ink-faint" strokeDasharray="4 4" />
        {hasNegative && (
          <polygon data-testid="negative-area" points={areaPoints} className="fill-red-500" fillOpacity={0.25} clipPath="url(#below-zero)" />
        )}
        <polyline data-testid="balance-line" points={points} fill="none" className="stroke-ink" strokeWidth={2} />
        {rows.map((r, i) => (
          <g key={r.month}>
            <circle cx={x(i)} cy={y(r.closing)} r={3.5} className={r.closing < 0 ? 'fill-red-500' : 'fill-ink'} />
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} className="fill-ink-muted">
              {formatMonth(r.month, locale)}
            </text>
            <rect data-testid="month-hit" x={x(i) - slot / 2} y={0} width={slot} height={H} fill="transparent">
              <title>
                {`${formatMonth(r.month, locale, 'long')}\n${t('opening')}: ${formatMoney(r.opening, currency, locale)}\n${t('totalIn')}: ${formatMoney(r.totalIn, currency, locale)}\n${t('totalOut')}: ${formatMoney(r.totalOut, currency, locale)}\n${t('closing')}: ${formatMoney(r.closing, currency, locale)}`}
              </title>
            </rect>
          </g>
        ))}
      </svg>
    </figure>
  );
}
