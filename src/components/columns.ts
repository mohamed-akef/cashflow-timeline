import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Where the grid's month columns sit, in the physical (left-to-right) pixels
 * of its scrolling content. The chart draws each month at the same centre,
 * so a point or bar always stands directly above its column.
 */
export interface ColumnLayout {
  /** Full content width, equal to the table's. */
  width: number;
  /** Width of the pinned first column; the chart's value axis uses the same strip. */
  gutter: number;
  /** Centre of each month column. */
  centers: number[];
  /** Narrowest month column, the room one month has for its marks and label. */
  slot: number;
}

/** Measure the month columns of `table`'s header row, again whenever any of them resizes. */
export function useColumnLayout(table: RefObject<HTMLTableElement | null>, deps: unknown[]): ColumnLayout | null {
  const [layout, setLayout] = useState<ColumnLayout | null>(null);
  useLayoutEffect(() => {
    const el = table.current;
    if (!el) return;
    const measure = () => {
      const [first, ...months] = Array.from(el.querySelectorAll<HTMLTableCellElement>('thead th'));
      // jsdom and a detached table measure as zero: let the chart fall back to its own spacing.
      if (!first || months.length === 0 || el.offsetWidth === 0) return setLayout(null);
      setLayout({
        width: el.offsetWidth,
        gutter: first.offsetWidth,
        centers: months.map((th) => th.offsetLeft + th.offsetWidth / 2),
        slot: Math.min(...months.map((th) => th.offsetWidth)),
      });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.querySelectorAll('thead th').forEach((th) => ro.observe(th));
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return layout;
}

/** Keep two horizontal scrollers at the same offset, whichever one the user moves. */
export function useSyncedScroll(a: RefObject<HTMLElement | null>, b: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const x = a.current;
    const y = b.current;
    if (!x || !y) return;
    // Copying an equal value fires no scroll event, so the pair settles instead of looping.
    const follow = (from: HTMLElement, to: HTMLElement) => () => {
      if (to.scrollLeft !== from.scrollLeft) to.scrollLeft = from.scrollLeft;
    };
    const ab = follow(x, y);
    const ba = follow(y, x);
    x.addEventListener('scroll', ab, { passive: true });
    y.addEventListener('scroll', ba, { passive: true });
    return () => {
      x.removeEventListener('scroll', ab);
      y.removeEventListener('scroll', ba);
    };
  });
}
