import { describe, it, expect, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useRef } from 'react';
import { useColumnLayout, useSyncedScroll, type ColumnLayout } from './columns';

describe('useSyncedScroll', () => {
  it('moves each scroller when the other one scrolls', () => {
    function Pair() {
      const a = useRef<HTMLDivElement>(null);
      const b = useRef<HTMLDivElement>(null);
      useSyncedScroll(a, b);
      return (<><div data-testid="a" ref={a} /><div data-testid="b" ref={b} /></>);
    }
    const { getByTestId } = render(<Pair />);
    const a = getByTestId('a');
    const b = getByTestId('b');
    a.scrollLeft = 240;
    act(() => { a.dispatchEvent(new Event('scroll')); });
    expect(b.scrollLeft).toBe(240);
    b.scrollLeft = 60;
    act(() => { b.dispatchEvent(new Event('scroll')); });
    expect(a.scrollLeft).toBe(60);
  });
});

describe('useColumnLayout', () => {
  const restore: (() => void)[] = [];
  afterEach(() => restore.splice(0).forEach((f) => f()));

  /** jsdom has no layout: read widths and offsets from data attributes instead. */
  function fakeLayout() {
    for (const prop of ['offsetWidth', 'offsetLeft'] as const) {
      const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop)!;
      Object.defineProperty(HTMLElement.prototype, prop, {
        configurable: true,
        get(this: HTMLElement) { return Number(this.dataset[prop === 'offsetWidth' ? 'w' : 'l'] ?? 0); },
      });
      restore.push(() => Object.defineProperty(HTMLElement.prototype, prop, original));
    }
  }

  it('reports the item column width and each month column centre', () => {
    fakeLayout();
    let seen: ColumnLayout | null = null;
    function Grid() {
      const table = useRef<HTMLTableElement>(null);
      seen = useColumnLayout(table, []);
      return (
        <table ref={table} data-w="600">
          <thead><tr><th data-w="160" data-l="0" /><th data-w="120" data-l="160" /><th data-w="140" data-l="280" /></tr></thead>
        </table>
      );
    }
    render(<Grid />);
    expect(seen).toEqual({ width: 600, gutter: 160, centers: [220, 350], slot: 120 });
  });

  it('reports nothing when the table has not been laid out', () => {
    let seen: ColumnLayout | null = { width: 1, gutter: 1, centers: [], slot: 1 };
    function Grid() {
      const table = useRef<HTMLTableElement>(null);
      seen = useColumnLayout(table, []);
      return <table ref={table}><thead><tr><th /><th /></tr></thead></table>;
    }
    render(<Grid />);
    expect(seen).toBeNull();
  });
});
