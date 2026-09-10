# Cashflow Timeline — Design

**Date:** 2026-09-07
**Status:** approved design, pre-implementation
**Repo:** `github.com/mohamed-akef/cashflow-timeline` (private)

## 1. Purpose

A frontend-only web app for personal financial planning. The user enters what money comes in and goes out (salary, one-off income, recurring bills, one-off costs), and the app shows a month-by-month timeline of their running balance so they can see *when* they go into debt, *how deep*, and *when* they recover — then adjust the plan until every month in the window they care about is positive.

Privacy is a hard constraint: **no backend, no server-side storage, nothing leaves the device.** The only persistence is the browser's own `localStorage` and files the user explicitly exports.

## 2. Decisions (locked)

| Topic | Decision |
|---|---|
| Granularity | Monthly buckets. Each column is one month; balance is a per-month figure. No day-of-month. |
| Debt model | Running balance carried forward: `closing = opening + totalIn − totalOut`, next month's `opening = closing`. Negative closing is shown as debt. No interest, no borrowing rules, no loan amortization. |
| In-timeline adjustments | (a) per-month overrides: every item cell opens a small dialog to change that month's amount or remove the item from that month (a month the rule skips can be added the same way); (b) add a one-off in place. Rules themselves (create / edit / delete recurring items) are owned by the re-openable setup dialog. _Revised 2026-09-10 at the user's request: overrides replaced the earlier "move an item to another month" control._ |
| Persistence | Autosave to `localStorage` on every change; restored on load. A visible **Clear all data** action wipes it. Behaviour is stated plainly in the UI. |
| Locale | Arabic + English with a language toggle and full RTL mirroring. Currency is a picker, default **SAR**, formatted via `Intl.NumberFormat`. |
| Stack | Vite + React + TypeScript + Tailwind. Static build, no server. |
| Recurrence | `monthly`, `once`, `everyN`, `specificMonths` (see §4). |
| Timeline view | Balance chart on top (negative stretches shaded), editable grid below. |
| Export | JSON round-trip only (export the full plan, re-import it). Excel/CSV deferred. |

## 3. Architecture

**Rules are the source of truth.** The plan is `{ settings, items[] }`. A pure function `expand(plan)` computes the entire month grid from the rules on every change. The UI never stores computed months.

Consequences:

- An in-timeline one-off is just another item with `recurrence.kind === 'once'`.
- "Move" is an edit to an item (see §4.3), not an edit to a cell.
- The export file is small, human-readable, and cannot drift from what's displayed.
- All correctness lives in one pure module that is trivially unit-testable.

The rejected alternative — storing the materialized grid and editing cells directly — was dropped because it severs the link between a rule and its occurrences, bloats the export, and turns "change my salary" into a loop over months.

### Module layout

```
src/
  domain/
    plan.ts        types, zod schema, defaults, MonthKey helpers
    engine.ts      expand(plan) → MonthRow[]; summarize(rows) → Summary
    serialize.ts   exportPlan(plan) → string; importPlan(text) → Plan | ImportError
  store/
    planStore.ts   single Zustand store; localStorage persistence via the same schema
  i18n/
    en.ts, ar.ts   flat string dictionaries
    useT.ts        t(key) hook + dir/locale switching on <html>
  components/
    SetupDialog/   first-run + re-openable; owns rule CRUD
    ItemForm/      one form for income and expense items
    Toolbar/       horizon, language, currency, export, import, clear
    SummaryStrip/  first negative / lowest / recovery / all-positive
    BalanceChart/  running balance line, negative shading
    TimelineGrid/  rows = items, columns = months, summary rows, per-month "+"
  App.tsx
```

One state store (Zustand). No i18next — two dictionary files and a `t()` hook are sufficient for two languages. No router.

## 4. Data model

```ts
type MonthKey = string;                        // "YYYY-MM", e.g. "2026-03"

type Recurrence =
  | { kind: 'monthly' }
  | { kind: 'once';           month: MonthKey }
  | { kind: 'everyN';         n: number }       // n ≥ 2, anchored at window.from
  | { kind: 'specificMonths'; months: number[] } // month-of-year 1–12, repeats annually

interface PlanItem {
  id: string;                                   // uuid
  label: string;
  note?: string;
  direction: 'in' | 'out';                      // income | expense
  amount: number;                               // > 0; direction carries the sign
  recurrence: Recurrence;
  window: { from: MonthKey; to?: MonthKey };    // to omitted = runs to end of horizon
}

interface PlanSettings {
  currency: string;                             // ISO 4217, default 'SAR'
  locale: 'ar' | 'en';
  startMonth: MonthKey;
  horizonMonths: number;                        // presets 3 | 6 | 12; custom 1–60
  startingBalance: number;                      // may be negative
}

interface Plan {
  schemaVersion: 1;
  settings: PlanSettings;
  items: PlanItem[];
}
```

### 4.1 Recurrence semantics

All patterns are bounded by `window.from … window.to` (both inclusive) intersected with the horizon `[startMonth, startMonth + horizonMonths)`. A month outside the window produces no occurrence.

- **`monthly`** — one occurrence in every month of the window.
- **`once`** — exactly one occurrence in `recurrence.month`. `window` is ignored for `once`; the form sets `window.from = month` for consistency.
- **`everyN`** — occurrences at `window.from`, `window.from + n`, `window.from + 2n`, … while inside the window. `n = 3` starting March → Mar, Jun, Sep, Dec.
- **`specificMonths`** — one occurrence in every month of the window whose month-of-year is in `months`. `[1, 9]` over a two-year horizon → Jan and Sep of both years.

### 4.2 Engine output

```ts
interface Occurrence { itemId: string; label: string; direction: 'in' | 'out'; amount: number }

interface MonthRow {
  month: MonthKey;
  opening: number;
  occurrences: Occurrence[];
  totalIn: number;
  totalOut: number;
  net: number;          // totalIn − totalOut
  closing: number;      // opening + net
}

interface Summary {
  allPositive: boolean;
  firstNegative?: MonthKey;
  lowest: { month: MonthKey; balance: number };
  recovery?: MonthKey;  // first month after firstNegative with closing ≥ 0; absent if never recovers
}
```

`expand(plan)`: for each month in the horizon, collect occurrences from every item, sum, carry balance. Month 0's `opening = settings.startingBalance`.

`summarize(rows)`: derived from `closing` values only.

### 4.3 Edit operations

All edits produce a new `Plan`; the grid is recomputed.

| Operation | Where | Effect on `items[]` |
|---|---|---|
| Add rule | Setup dialog | push a new `PlanItem` |
| Edit rule | Setup dialog | replace the item by `id` |
| Delete rule | Setup dialog | remove by `id` |
| Add one-off in place | Timeline, per-month "+" | push `{ recurrence: { kind: 'once', month }, window: { from: month } }` |
| Move item | Timeline, item row | `once`: set `recurrence.month` and `window.from`. Recurring: shift `window.from` (and `window.to` by the same delta if set). The **whole rule** moves; single-occurrence moves are out of scope. |
| Change horizon / start month / starting balance / currency / locale | Toolbar or setup dialog | update `settings` |

## 5. Screens

### 5.1 Setup dialog

Shown on first run (no plan in `localStorage`) and re-openable from the toolbar. It is the only place rules are created, edited, or deleted.

Sections, in order:

1. **Basics** — starting balance, start month (defaults to the current month), horizon preset (3 / 6 / 12 / custom), currency, language.
2. **Income** — list of `direction: 'in'` items with add / edit / delete.
3. **Expenses** — list of `direction: 'out'` items with add / edit / delete.
4. **Save** — writes the plan to the store (and therefore `localStorage`) and closes.

`ItemForm` (shared by income and expense): label, amount, recurrence kind, kind-specific fields (month / `n` / month-of-year checkboxes), window from / to, optional note. Validates: label non-empty, amount > 0, `n ≥ 2`, at least one month for `specificMonths`, `to ≥ from` when set.

### 5.2 Timeline

- **Summary strip** at the top: "All N months positive ✓" or "First negative: Mar 2026 · Lowest: −4,250 SAR in May 2026 · Recovers: Aug 2026" (or "does not recover in this horizon").
- **Balance chart**: closing balance per month as a line; area below zero shaded red. Hover shows month, opening, in, out, closing.
- **Grid**: one row per item (income rows first, then expenses), one column per month, a cell shows the amount when the item occurs that month. Summary rows at the bottom: Total in, Total out, Net, Closing balance — closing cells coloured red when negative. Each month header has a "+" to add a one-off there. Each item cell is a button that opens the per-month dialog (include / amount); a cell that departs from the rule carries a dotted accent underline. Horizontal scroll when the horizon exceeds the viewport; item labels are sticky at the inline-start edge.

### 5.3 Toolbar

Horizon preset, language toggle (AR/EN), currency picker, **Export JSON**, **Import JSON**, **Reopen setup**, **Clear all data** (confirm before wiping).

## 6. Persistence and the import trust boundary

- The store persists the `Plan` to `localStorage` under a single key on every change.
- On load, the stored value is parsed through the **same zod schema** used for import. If it fails, it is discarded (with a console warning) and the setup dialog opens — a stale or hand-edited entry cannot wedge the app.
- **Import** is the only external input. `importPlan(text)` parses JSON, checks `schemaVersion === 1`, validates with zod, and returns either a `Plan` or a readable error (wrong version, invalid structure, invalid month key, etc.). A rejected file changes nothing.
- **Export** writes `JSON.stringify(plan, null, 2)` as a downloaded file `cashflow-plan-YYYY-MM-DD.json`.
- Future schema versions add a migration step in `serialize.ts`; v1 rejects anything that isn't `schemaVersion: 1`.

## 7. Internationalisation and RTL

- `settings.locale` drives `document.documentElement.lang` and `dir` (`rtl` for `ar`). Set on `<html>` — `dir` flips only the element it's on, so it must be the root.
- Layout uses Tailwind logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) so mirroring is automatic. No `left`/`right`, `ml`/`mr`.
- Numbers are formatted with `Intl.NumberFormat(locale, { style: 'currency', currency })`. Month labels with `Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' })`.
- The grid's month columns run in reading direction: left→right in English, right→left in Arabic. The chart's x-axis must match; this is a plan-level decision for the charting library (Recharts `reversed` axis under RTL, or mirroring the container).

## 8. Error handling

- Form validation prevents invalid items from entering the store (see §5.1).
- The engine guards against NaN/Infinity amounts by treating them as 0 (defensive; the schema already rejects them).
- Horizon is clamped to 1–60 months to keep the grid bounded.
- Import errors surface as an inline message in the toolbar, not an alert.
- `localStorage` writes are wrapped in try/catch (quota / private mode); a failed write shows a non-blocking "could not save on this device" notice and the app keeps working in memory.

## 9. Testing

Vitest. Coverage priority, in order:

1. **`engine.ts`** — the proof of correctness:
   - each recurrence kind in isolation, including window start/end inclusivity and horizon clipping;
   - `everyN` anchoring (`from`, `from+n`, …) and `specificMonths` across a year boundary;
   - running balance carry-forward through negative months, `startingBalance` negative;
   - `summarize`: never negative / negative and never recovers / recovers / negative from month 0.
2. **`serialize.ts`** — export→import round-trip is identity; rejection of wrong `schemaVersion`, malformed JSON, invalid `MonthKey`, negative amount.
3. **`planStore.ts`** — edit operations (add / edit / delete / move / add-one-off) produce the expected `items[]`; corrupt `localStorage` value is discarded.
4. **Components** — minimal: setup dialog saves a plan; per-month "+" adds a `once` item; import error is displayed.

## 10. Out of scope for v1

Excel / CSV export · interest on negative balance · loan amortization · moving an item to another month (replaced by per-month overrides on 2026-09-10) · multi-scenario comparison · GitHub Pages / CI deployment (the current PAT lacks the `workflow` scope) · any backend or account system.

## 11. Open plan-level decisions (resolve in the implementation plan, not here)

- Charting library (Recharts vs a hand-drawn SVG) and its RTL x-axis handling.
- Whether `TimelineGrid` uses a native `<table>` or CSS grid for sticky first column + horizontal scroll under RTL.
- Exact `localStorage` key and debounce interval for autosave.
