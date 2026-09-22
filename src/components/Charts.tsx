import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import type { MonthRow } from '../domain/engine';
import { useLocale, useT } from '../i18n';
import { formatCompact, formatMoney, formatMonth } from '../i18n/format';
import { usePlanStore } from '../store/planStore';
import type { ColumnLayout } from './columns';
import { Card, CardHeader, CardTitle, Chip } from './ui';

const H = 260;
const FALLBACK_W = 960;
/** Room one month label needs; labels are thinned so neighbours never touch. */
const LABEL_W = 84;
const PAD = { top: 12, bottom: 28, start: 56, end: 24 };

export type ChartView = 'closing' | 'inOut' | 'net';
const VIEWS: ChartView[] = ['closing', 'inOut', 'net'];
const TITLE: Record<ChartView, 'chartClosing' | 'chartInOut' | 'chartNet'> = { closing: 'chartClosing', inOut: 'chartInOut', net: 'chartNet' };
const SHORT: Record<ChartView, 'viewClosing' | 'viewInOut' | 'viewNet'> = { closing: 'viewClosing', inOut: 'viewInOut', net: 'viewNet' };

/** Evenly spaced "nice" tick values that enclose [min, max] and always include 0. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  if (hi === lo) return [0, 1];
  const span = hi - lo;
  const rough = span / count;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / pow;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * pow;
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v / step) * step);
  return ticks;
}

interface Props {
  rows: MonthRow[];
  /** The grid's month columns. When given, each month is drawn over its column. */
  columns?: ColumnLayout | null;
  /** The horizontal scroller, so the page can keep it in step with the grid's. */
  scrollRef?: RefObject<HTMLDivElement | null>;
}

/**
 * Three views of the same months: the running balance as a line with a wash
 * beneath it, income against expenses as paired bars, and the net change as
 * signed bars. A value axis with gridlines sits behind each, and pointing at
 * a month (hover, tap or keyboard focus) reveals that month's figures.
 *
 * Given the grid's columns, the chart is exactly as wide as the table and
 * draws every month over its column; it scrolls with the table, while the
 * value axis stays pinned in a strip as wide as the table's item column.
 * Without them (first paint, tests) it spreads the months over its own width.
 */
export function Charts({ rows, columns, scrollRef }: Props) {
  const t = useT();
  const locale = useLocale();
  const uid = useId();
  const currency = usePlanStore((s) => s.plan.settings.currency);
  const rtl = locale === 'ar';
  const [view, setView] = useState<ChartView>('closing');
  const [active, setActive] = useState<number | null>(null);

  // Own width, used until the grid reports its columns. Drawn at pixel size,
  // so text stays 11px on a phone instead of shrinking with a viewBox.
  const ownScroller = useRef<HTMLDivElement>(null);
  const scroller = scrollRef ?? ownScroller;
  const [boxW, setBoxW] = useState(FALLBACK_W);
  const [view0, setView0] = useState(0);
  useEffect(() => {
    const el = scroller.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setBoxW(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [scroller]);

  const n = rows.length;
  const layout: ColumnLayout = columns && columns.centers.length === n ? columns : (() => {
    const slot = n > 0 ? (boxW - PAD.start - PAD.end) / n : boxW;
    const centers = rows.map((_, i) => (rtl ? PAD.end + (n - i - 0.5) * slot : PAD.start + (i + 0.5) * slot));
    return { width: boxW, gutter: PAD.start, centers, slot };
  })();
  const W = layout.width;
  const slot = layout.slot;
  const x = (i: number) => layout.centers[i];

  const values = view === 'closing'
    ? rows.map((r) => r.closing)
    : view === 'net'
      ? rows.map((r) => r.net)
      : rows.flatMap((r) => [r.totalIn, r.totalOut]);
  const ticks = niceTicks(Math.min(...values, 0), Math.max(...values, 0));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const innerH = H - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + ((hi - v) / (hi - lo || 1)) * innerH;
  const zeroY = y(0);
  const labelEvery = Math.max(1, Math.ceil(LABEL_W / slot));
  const barW = (share: number) => Math.min(slot * share, 28);

  const money = (v: number) => formatMoney(v, currency, locale);
  const detail = (r: MonthRow) => [
    ['opening', r.opening], ['totalIn', r.totalIn], ['totalOut', r.totalOut], ['net', r.net], ['closing', r.closing],
  ] as const;
  const emphasis: Record<ChartView, readonly string[]> = { closing: ['closing'], inOut: ['totalIn', 'totalOut'], net: ['net'] };
  const describe = (r: MonthRow) =>
    `${formatMonth(r.month, locale, 'long')}. ${detail(r).map(([k, v]) => `${t(k)}: ${money(v)}`).join('. ')}`;

  const linePoints = rows.map((r, i) => `${x(i)},${y(r.closing)}`).join(' ');
  const areaPoints = n > 0 ? `${x(0)},${zeroY} ${linePoints} ${x(n - 1)},${zeroY}` : '';
  const hasNegative = rows.some((r) => r.closing < 0);
  const aboveClip = `${uid}-above`;
  const belowClip = `${uid}-below`;
  const wash = `${uid}-wash`;
  const bar = (i: number, v: number, offset: number, width: number) => ({
    x: x(i) + offset - width / 2,
    y: Math.min(y(v), zeroY),
    width,
    height: Math.abs(y(v) - zeroY),
  });

  // Keep the readout inside the visible part of a scrolled chart. In RTL
  // scrollLeft runs from 0 down to a negative number, anchored at the right.
  const el = scroller.current;
  const clientW = el?.clientWidth || W;
  const visibleLeft = el ? (rtl ? W - clientW + view0 : view0) : 0;
  const activeRow = active !== null ? rows[active] : undefined;
  const tipLeft = active !== null
    ? Math.min(Math.max(x(active), visibleLeft + 110), visibleLeft + clientW - 110)
    : 0;

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-2">
        <CardTitle as="h2">{t(TITLE[view])}</CardTitle>
        <fieldset className="flex gap-1">
          <legend className="sr-only">{t('chartView')}</legend>
          {VIEWS.map((v) => (
            <Chip key={v} type="radio" name={`${uid}-view`} value={v} checked={view === v} onChange={() => { setView(v); setActive(null); }}>
              {t(SHORT[v])}
            </Chip>
          ))}
        </fieldset>
      </CardHeader>
      {view === 'inOut' && (
        <div className="mb-1 flex gap-4 px-4 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-xs bg-gain" />{t('income')}</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-xs bg-loss" />{t('expenses')}</span>
        </div>
      )}
      {/* Full-bleed, like the grid's scroller, so the two share one set of coordinates. */}
      <div ref={scroller} className="overflow-x-auto pb-2" onScroll={(e) => setView0(e.currentTarget.scrollLeft)}>
        <div className="relative" style={{ width: W, height: H }}>
          <svg
            role="group"
            aria-label={t(TITLE[view])}
            width={W}
            height={H}
            className="absolute inset-0"
            onMouseLeave={() => setActive(null)}
          >
            <defs>
              <clipPath id={aboveClip}><rect x={0} y={0} width={W} height={Math.max(0, zeroY)} /></clipPath>
              <clipPath id={belowClip}><rect x={0} y={zeroY} width={W} height={Math.max(0, H - zeroY)} /></clipPath>
              <linearGradient id={wash} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className="[stop-color:var(--accent)]" stopOpacity={0.16} />
                <stop offset="1" className="[stop-color:var(--accent)]" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            {/* Gridlines run the full width; the pinned axis strip covers the part under it. */}
            {ticks.map((v) => (
              <line
                key={v}
                x1={0} x2={W} y1={y(v)} y2={y(v)}
                className={v === 0 ? 'stroke-ink-faint' : 'stroke-line'} strokeDasharray={v === 0 ? '4 4' : undefined}
              />
            ))}

            {view === 'closing' && n > 0 && (
              <>
                <polygon points={areaPoints} fill={`url(#${wash})`} clipPath={`url(#${aboveClip})`} />
                {hasNegative && (
                  <polygon data-testid="negative-area" points={areaPoints} className="fill-loss" fillOpacity={0.14} clipPath={`url(#${belowClip})`} />
                )}
                <polyline data-testid="balance-line" points={linePoints} fill="none" className="stroke-accent" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              </>
            )}

            {rows.map((r, i) => {
              const isActive = active === i;
              /** Bars rest a little soft; the pointed-at month goes solid and the others step back. */
              const barOpacity = isActive ? 1 : active === null ? 0.75 : 0.4;
              const pair = barW(0.3);
              return (
                <g key={r.month}>
                  {isActive && <line x1={x(i)} x2={x(i)} y1={PAD.top} y2={H - PAD.bottom} className="stroke-line-strong" />}
                  {view === 'closing' && (
                    <circle cx={x(i)} cy={y(r.closing)} r={isActive ? 6 : 4} className={`stroke-surface ${r.closing < 0 ? 'fill-loss' : 'fill-accent'}`} strokeWidth={2} />
                  )}
                  {view === 'inOut' && (
                    <>
                      <rect data-testid="bar-in" {...bar(i, r.totalIn, -pair * 0.57, pair)} rx={2} className="fill-gain" fillOpacity={barOpacity} />
                      <rect data-testid="bar-out" {...bar(i, r.totalOut, pair * 0.57, pair)} rx={2} className="fill-loss" fillOpacity={barOpacity} />
                    </>
                  )}
                  {view === 'net' && (
                    <rect data-testid="bar-net" {...bar(i, r.net, 0, barW(0.5))} rx={2} className={r.net < 0 ? 'fill-loss' : 'fill-gain'} fillOpacity={barOpacity} />
                  )}
                  {i % labelEvery === 0 && (
                    <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} className="fill-ink-muted">
                      {formatMonth(r.month, locale)}
                    </text>
                  )}
                  <rect
                    data-testid="month-hit"
                    tabIndex={0}
                    aria-label={describe(r)}
                    x={x(i) - slot / 2} y={0} width={slot} height={H} fill="transparent"
                    className="outline-none"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    onClick={() => setActive(isActive ? null : i)}
                  />
                </g>
              );
            })}
          </svg>

          {/* The value axis, pinned at the start like the grid's item column. */}
          <svg aria-hidden="true" width={layout.gutter} height={H} className="sticky start-0 z-[1] block bg-surface">
            <g direction="ltr">{ticks.map((v) => (
              <text
                key={v}
                data-testid="y-tick"
                x={rtl ? 8 : layout.gutter - 8}
                y={y(v) + 4}
                textAnchor={rtl ? 'start' : 'end'}
                fontSize={11}
                className="fill-ink-muted tabular-nums"
              >
                {formatCompact(v, locale)}
              </text>
            ))}</g>
          </svg>

          {activeRow && (
            <div
              data-testid="chart-tip"
              role="status"
              className="pointer-events-none absolute top-2 z-10 w-52 -translate-x-1/2 rounded-md border border-line bg-surface p-2.5 text-xs shadow-md motion-safe:animate-fade"
              style={{ left: tipLeft }}
            >
              <div className="mb-1.5 font-semibold text-ink">{formatMonth(activeRow.month, locale, 'long')}</div>
              <dl className="space-y-0.5">
                {detail(activeRow).map(([k, v]) => {
                  const strong = emphasis[view].includes(k);
                  const signed = k === 'closing' || k === 'net';
                  return (
                    <div key={k} className={`flex justify-between gap-3 ${strong ? 'font-semibold text-ink' : 'text-ink-muted'}`}>
                      <dt>{t(k)}</dt>
                      <dd className={`tabular-nums ${signed && v < 0 ? 'text-loss' : signed && strong ? 'text-gain' : ''}`}>{money(v)}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
