# Cashflow Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a frontend-only cashflow planning app: the user enters income and expense rules, sees a month-by-month running-balance timeline (chart + grid), adjusts it until every month is positive, and can export/import the plan as JSON.

**Architecture:** Rules are the source of truth — a `Plan` is `{ settings, items[] }` and a pure `expand(plan)` computes every month's occurrences and running balance on each render. One Zustand store owns the plan and mirrors it to `localStorage`; the same zod schema validates both stored and imported data. UI is React components that read the store and call its actions; no component holds domain logic.

**Tech Stack:** Vite 6 · React 19 · TypeScript 5 · Tailwind CSS 4 (`@tailwindcss/vite`) · zod 3 · zustand 5 · Vitest 3 + jsdom + Testing Library · pnpm. No charting library (hand-drawn SVG), no router, no i18n library.

**Spec:** `docs/superpowers/specs/2026-09-07-cashflow-timeline-design.md`

## Global Constraints

- **No backend, no network calls, no analytics.** Nothing leaves the browser. The only persistence is `localStorage` under the key `cashflow-timeline:plan:v1`.
- **Monthly granularity only.** `MonthKey` is a string `"YYYY-MM"`. No day-of-month anywhere.
- **Running balance:** `closing = opening + totalIn − totalOut`; next month's `opening = closing`; month 0's `opening = settings.startingBalance`. No interest, no loans.
- **Recurrence kinds:** exactly `monthly`, `once`, `everyN` (`n ≥ 2`), `specificMonths` (month-of-year 1–12, repeats annually). All bounded by `window.from … window.to` inclusive, intersected with the horizon.
- **Horizon:** `settings.startMonth` + `settings.horizonMonths` (1–60; presets 3/6/12).
- **No per-month amount overrides. No moving a single occurrence of a recurring item.** "Move" edits the rule (see Task 6).
- **Rules (create/edit/delete) live only in the Setup dialog.** The timeline offers only "add one-off" and "move".
- **Locale:** `settings.locale` is `'ar' | 'en'`; `document.documentElement` gets `lang` and `dir`. Use **only Tailwind logical utilities** (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`) — never `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-`.
- **Currency:** ISO 4217 code in `settings.currency`, default `'SAR'`, formatted with `Intl.NumberFormat`.
- **Import is a trust boundary:** every imported or stored blob passes `planSchema` and `schemaVersion === 1` before it touches the store.
- **Resolved §11 decisions:** chart is hand-drawn SVG (Task 9); grid is a native `<table>` with a sticky first column (Task 10); storage writes are synchronous on every change, no debounce (Task 6).
- **Testing:** Vitest; domain modules must have unit tests; component tests are minimal and use Testing Library with locale `'en'`.
- **Git:** work on branch `worktree-design-spec` (or a feature branch off it). If a bare `git add` is rejected by the worktree guard, use `/usr/bin/git add`. Never push to `main`.
- **Tooling:** Node 26, pnpm 10. Run every command from the repo root.

---

## File Structure

| Path | Responsibility |
|---|---|
| `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/index.css`, `src/main.tsx`, `src/test/setup.ts` | Project scaffold, build/test config (Task 1) |
| `src/domain/month.ts` | `MonthKey` parsing/arithmetic — the only place that knows the `"YYYY-MM"` format (Task 2) |
| `src/domain/plan.ts` | `Plan` / `PlanItem` / `Recurrence` / `PlanSettings` types, zod schema, defaults, `newId()` (Task 3) |
| `src/domain/engine.ts` | `occursIn`, `expand`, `summarize` — pure (Task 4) |
| `src/domain/serialize.ts` | `exportPlan`, `importPlan`, `exportFilename` (Task 5) |
| `src/store/planStore.ts` | Zustand store: plan, dialog state, actions, `localStorage` load/persist (Task 6) |
| `src/i18n/en.ts`, `src/i18n/ar.ts`, `src/i18n/index.ts`, `src/i18n/format.ts` | Dictionaries, `t()`/`useT()`, `applyLocaleToDocument`, money/month formatting (Task 7) |
| `src/components/SummaryStrip.tsx` | First-negative / lowest / recovery line (Task 8) |
| `src/components/BalanceChart.tsx` | SVG closing-balance line with negative shading (Task 9) |
| `src/components/TimelineGrid.tsx`, `src/components/OneOffDialog.tsx` | Month grid, per-month "+", move control (Task 10) |
| `src/components/Toolbar.tsx` | Horizon, language, currency, export, import, setup, clear (Task 11) |
| `src/components/ItemForm.tsx` | Add/edit one income or expense rule (Task 12) |
| `src/components/SetupDialog.tsx` | First-run + re-openable setup; owns rule CRUD (Task 13) |
| `src/App.tsx`, `README.md` | Composition root, README, final verification (Task 14) |

Tests are colocated: `src/domain/month.test.ts`, `src/components/Toolbar.test.tsx`, etc.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`, `src/index.css`, `src/main.tsx`, `src/App.tsx` (placeholder replaced in Task 14), `src/test/setup.ts`, `src/smoke.test.ts`

**Interfaces:**
- Produces: `pnpm test`, `pnpm build`, `pnpm dev` all work; Vitest runs in jsdom with jest-dom matchers.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "cashflow-timeline",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "zod": "^3.25.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.5.0",
    "jsdom": "^26.0.0",
    "tailwindcss": "^4.1.0",
    "typescript": "^5.8.0",
    "vite": "^6.3.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 4: Write `index.html`, `.gitignore`, `src/index.css`, `src/main.tsx`, `src/App.tsx`, `src/test/setup.ts`**

`index.html`:
```html
<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cashflow Timeline</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`.gitignore`:
```
node_modules
dist
.claude/worktrees
*.local
```

`src/index.css`:
```css
@import "tailwindcss";
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx` (temporary; Task 14 replaces it):
```tsx
export default function App() {
  return <h1 className="p-4 text-xl font-semibold">Cashflow Timeline</h1>;
}
```

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Write a smoke test `src/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs tests in jsdom', () => {
    expect(typeof document).toBe('object');
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Install and verify**

Run: `pnpm install && pnpm test && pnpm build`
Expected: install succeeds; `1 passed`; `vite build` writes `dist/` with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts tsconfig.json index.html .gitignore src
git commit -m "chore: scaffold Vite + React + TS + Tailwind + Vitest"
```

---

### Task 2: Month helpers

**Files:**
- Create: `src/domain/month.ts`
- Test: `src/domain/month.test.ts`

**Interfaces:**
- Produces:
  - `type MonthKey = string`
  - `isMonthKey(v: unknown): v is MonthKey`
  - `toIndex(m: MonthKey): number` — months since year 0 (`year*12 + month-1`)
  - `fromIndex(i: number): MonthKey`
  - `addMonths(m: MonthKey, n: number): MonthKey`
  - `diffMonths(from: MonthKey, to: MonthKey): number` — `to − from`
  - `monthOfYear(m: MonthKey): number` — 1–12
  - `monthRange(start: MonthKey, count: number): MonthKey[]`
  - `currentMonth(now?: Date): MonthKey`

- [ ] **Step 1: Write the failing tests**

`src/domain/month.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  isMonthKey, toIndex, fromIndex, addMonths, diffMonths,
  monthOfYear, monthRange, currentMonth,
} from './month';

describe('isMonthKey', () => {
  it('accepts YYYY-MM', () => {
    expect(isMonthKey('2026-01')).toBe(true);
    expect(isMonthKey('2026-12')).toBe(true);
  });
  it('rejects bad shapes', () => {
    expect(isMonthKey('2026-13')).toBe(false);
    expect(isMonthKey('2026-1')).toBe(false);
    expect(isMonthKey('2026-01-01')).toBe(false);
    expect(isMonthKey(202601)).toBe(false);
    expect(isMonthKey(null)).toBe(false);
  });
});

describe('index round-trip', () => {
  it('converts both ways', () => {
    expect(fromIndex(toIndex('2026-03'))).toBe('2026-03');
    expect(toIndex('2026-01') - toIndex('2025-12')).toBe(1);
  });
});

describe('addMonths / diffMonths', () => {
  it('crosses year boundaries', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(diffMonths('2026-03', '2026-06')).toBe(3);
    expect(diffMonths('2026-06', '2026-03')).toBe(-3);
  });
});

describe('monthOfYear', () => {
  it('returns 1-12', () => {
    expect(monthOfYear('2026-01')).toBe(1);
    expect(monthOfYear('2026-09')).toBe(9);
  });
});

describe('monthRange', () => {
  it('lists count months from start', () => {
    expect(monthRange('2026-11', 4)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    expect(monthRange('2026-01', 0)).toEqual([]);
  });
});

describe('currentMonth', () => {
  it('formats the given date', () => {
    expect(currentMonth(new Date(2026, 8, 7))).toBe('2026-09');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/domain/month.test.ts`
Expected: FAIL — cannot resolve `./month`.

- [ ] **Step 3: Implement `src/domain/month.ts`**

```ts
/** A calendar month as "YYYY-MM". The only module that knows this format. */
export type MonthKey = string;

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(v: unknown): v is MonthKey {
  return typeof v === 'string' && MONTH_RE.test(v);
}

/** Months since year 0: 2026-03 → 2026*12 + 2. Lets month arithmetic be plain integer math. */
export function toIndex(m: MonthKey): number {
  const year = Number(m.slice(0, 4));
  const month = Number(m.slice(5, 7));
  return year * 12 + (month - 1);
}

export function fromIndex(i: number): MonthKey {
  const year = Math.floor(i / 12);
  const month = (i % 12) + 1;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

export function addMonths(m: MonthKey, n: number): MonthKey {
  return fromIndex(toIndex(m) + n);
}

/** to − from, in months. Positive when `to` is later. */
export function diffMonths(from: MonthKey, to: MonthKey): number {
  return toIndex(to) - toIndex(from);
}

/** 1–12 */
export function monthOfYear(m: MonthKey): number {
  return Number(m.slice(5, 7));
}

export function monthRange(start: MonthKey, count: number): MonthKey[] {
  const first = toIndex(start);
  return Array.from({ length: Math.max(0, count) }, (_, i) => fromIndex(first + i));
}

export function currentMonth(now: Date = new Date()): MonthKey {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/domain/month.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/domain/month.ts src/domain/month.test.ts
git commit -m "feat(domain): MonthKey helpers"
```

---

### Task 3: Plan types, schema, defaults

**Files:**
- Create: `src/domain/plan.ts`
- Test: `src/domain/plan.test.ts`

**Interfaces:**
- Consumes: `isMonthKey`, `currentMonth` from `./month`.
- Produces:
  - Types `Recurrence`, `PlanItem`, `PlanSettings`, `Plan`, `Direction = 'in' | 'out'`, `Locale = 'ar' | 'en'`
  - `planSchema: z.ZodType<Plan>` (also `planItemSchema`, `planSettingsSchema`, `recurrenceSchema`)
  - `HORIZON_PRESETS = [3, 6, 12]`, `MAX_HORIZON = 60`, `CURRENCIES = ['SAR','USD','EUR','GBP','AED','EGP','KWD']`
  - `defaultSettings(now?: Date): PlanSettings`
  - `emptyPlan(now?: Date): Plan`
  - `newId(): string`

- [ ] **Step 1: Write the failing tests**

`src/domain/plan.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { planSchema, planItemSchema, emptyPlan, defaultSettings, newId } from './plan';

const validItem = {
  id: 'a1',
  label: 'Salary',
  direction: 'in',
  amount: 10000,
  recurrence: { kind: 'monthly' },
  window: { from: '2026-01' },
};

describe('planSchema', () => {
  it('accepts an empty default plan', () => {
    expect(planSchema.safeParse(emptyPlan(new Date(2026, 0, 1))).success).toBe(true);
  });

  it('accepts every recurrence kind', () => {
    const kinds = [
      { kind: 'monthly' },
      { kind: 'once', month: '2026-03' },
      { kind: 'everyN', n: 3 },
      { kind: 'specificMonths', months: [1, 9] },
    ];
    for (const recurrence of kinds) {
      expect(planItemSchema.safeParse({ ...validItem, recurrence }).success).toBe(true);
    }
  });

  it('rejects wrong schemaVersion', () => {
    const plan = { ...emptyPlan(), schemaVersion: 2 };
    expect(planSchema.safeParse(plan).success).toBe(false);
  });

  it('rejects bad items', () => {
    expect(planItemSchema.safeParse({ ...validItem, amount: -5 }).success).toBe(false);
    expect(planItemSchema.safeParse({ ...validItem, amount: Infinity }).success).toBe(false);
    expect(planItemSchema.safeParse({ ...validItem, label: '' }).success).toBe(false);
    expect(planItemSchema.safeParse({ ...validItem, window: { from: '2026-1' } }).success).toBe(false);
    expect(planItemSchema.safeParse({ ...validItem, window: { from: '2026-06', to: '2026-03' } }).success).toBe(false);
    expect(planItemSchema.safeParse({ ...validItem, recurrence: { kind: 'everyN', n: 1 } }).success).toBe(false);
    expect(planItemSchema.safeParse({ ...validItem, recurrence: { kind: 'specificMonths', months: [] } }).success).toBe(false);
    expect(planItemSchema.safeParse({ ...validItem, recurrence: { kind: 'specificMonths', months: [13] } }).success).toBe(false);
  });

  it('rejects bad settings', () => {
    const base = emptyPlan();
    expect(planSchema.safeParse({ ...base, settings: { ...base.settings, horizonMonths: 0 } }).success).toBe(false);
    expect(planSchema.safeParse({ ...base, settings: { ...base.settings, horizonMonths: 61 } }).success).toBe(false);
    expect(planSchema.safeParse({ ...base, settings: { ...base.settings, locale: 'fr' } }).success).toBe(false);
  });
});

describe('defaults', () => {
  it('defaultSettings uses the current month, SAR, en, 12 months, 0 balance', () => {
    expect(defaultSettings(new Date(2026, 8, 7))).toEqual({
      currency: 'SAR',
      locale: 'en',
      startMonth: '2026-09',
      horizonMonths: 12,
      startingBalance: 0,
    });
  });

  it('newId is unique', () => {
    expect(newId()).not.toBe(newId());
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/domain/plan.test.ts`
Expected: FAIL — cannot resolve `./plan`.

- [ ] **Step 3: Implement `src/domain/plan.ts`**

```ts
import { z } from 'zod';
import { currentMonth, isMonthKey, toIndex, type MonthKey } from './month';

export type Direction = 'in' | 'out';
export type Locale = 'ar' | 'en';

export const HORIZON_PRESETS = [3, 6, 12] as const;
export const MAX_HORIZON = 60;
export const CURRENCIES = ['SAR', 'USD', 'EUR', 'GBP', 'AED', 'EGP', 'KWD'] as const;

export const monthKeySchema = z
  .string()
  .refine(isMonthKey, { message: 'Expected "YYYY-MM"' }) as unknown as z.ZodType<MonthKey>;

export const recurrenceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('monthly') }),
  z.object({ kind: z.literal('once'), month: monthKeySchema }),
  z.object({ kind: z.literal('everyN'), n: z.number().int().min(2) }),
  z.object({
    kind: z.literal('specificMonths'),
    months: z.array(z.number().int().min(1).max(12)).min(1),
  }),
]);

export const planItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1),
  note: z.string().optional(),
  direction: z.enum(['in', 'out']),
  amount: z.number().finite().positive(),
  recurrence: recurrenceSchema,
  window: z
    .object({ from: monthKeySchema, to: monthKeySchema.optional() })
    .refine((w) => w.to === undefined || toIndex(w.to) >= toIndex(w.from), {
      message: '"to" must not be before "from"',
    }),
});

export const planSettingsSchema = z.object({
  currency: z.string().length(3),
  locale: z.enum(['ar', 'en']),
  startMonth: monthKeySchema,
  horizonMonths: z.number().int().min(1).max(MAX_HORIZON),
  startingBalance: z.number().finite(),
});

export const planSchema = z.object({
  schemaVersion: z.literal(1),
  settings: planSettingsSchema,
  items: z.array(planItemSchema),
});

export type Recurrence = z.infer<typeof recurrenceSchema>;
export type PlanItem = z.infer<typeof planItemSchema>;
export type PlanSettings = z.infer<typeof planSettingsSchema>;
export type Plan = z.infer<typeof planSchema>;

export function defaultSettings(now: Date = new Date()): PlanSettings {
  return {
    currency: 'SAR',
    locale: 'en',
    startMonth: currentMonth(now),
    horizonMonths: 12,
    startingBalance: 0,
  };
}

export function emptyPlan(now: Date = new Date()): Plan {
  return { schemaVersion: 1, settings: defaultSettings(now), items: [] };
}

export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/domain/plan.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/domain/plan.ts src/domain/plan.test.ts
git commit -m "feat(domain): Plan types, zod schema and defaults"
```

---

### Task 4: Engine — expand and summarize

**Files:**
- Create: `src/domain/engine.ts`
- Test: `src/domain/engine.test.ts`

**Interfaces:**
- Consumes: `Plan`, `PlanItem`, `PlanSettings` from `./plan`; `toIndex`, `monthOfYear`, `monthRange` from `./month`.
- Produces:
  - `interface Occurrence { itemId: string; label: string; direction: Direction; amount: number }`
  - `interface MonthRow { month: MonthKey; opening: number; occurrences: Occurrence[]; totalIn: number; totalOut: number; net: number; closing: number }`
  - `interface Summary { allPositive: boolean; firstNegative?: MonthKey; lowest: { month: MonthKey; balance: number }; recovery?: MonthKey }`
  - `occursIn(item: PlanItem, month: MonthKey): boolean`
  - `horizonMonths(settings: PlanSettings): MonthKey[]`
  - `expand(plan: Plan): MonthRow[]`
  - `summarize(rows: MonthRow[]): Summary` — `rows` must be non-empty (horizon ≥ 1 guarantees it)

- [ ] **Step 1: Write the failing tests**

`src/domain/engine.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { occursIn, expand, summarize, horizonMonths } from './engine';
import type { Plan, PlanItem } from './plan';

function item(partial: Partial<PlanItem>): PlanItem {
  return {
    id: partial.id ?? 'x',
    label: partial.label ?? 'X',
    direction: partial.direction ?? 'out',
    amount: partial.amount ?? 100,
    recurrence: partial.recurrence ?? { kind: 'monthly' },
    window: partial.window ?? { from: '2026-01' },
    note: partial.note,
  };
}

function plan(items: PlanItem[], overrides: Partial<Plan['settings']> = {}): Plan {
  return {
    schemaVersion: 1,
    settings: {
      currency: 'SAR', locale: 'en', startMonth: '2026-01', horizonMonths: 6, startingBalance: 0,
      ...overrides,
    },
    items,
  };
}

describe('occursIn', () => {
  it('monthly: every month inside the window, inclusive both ends', () => {
    const i = item({ recurrence: { kind: 'monthly' }, window: { from: '2026-02', to: '2026-04' } });
    expect(occursIn(i, '2026-01')).toBe(false);
    expect(occursIn(i, '2026-02')).toBe(true);
    expect(occursIn(i, '2026-04')).toBe(true);
    expect(occursIn(i, '2026-05')).toBe(false);
  });

  it('monthly without "to" runs forever', () => {
    const i = item({ recurrence: { kind: 'monthly' }, window: { from: '2026-02' } });
    expect(occursIn(i, '2030-12')).toBe(true);
  });

  it('once: only that month, window ignored', () => {
    const i = item({ recurrence: { kind: 'once', month: '2026-03' }, window: { from: '2026-01', to: '2026-01' } });
    expect(occursIn(i, '2026-03')).toBe(true);
    expect(occursIn(i, '2026-02')).toBe(false);
  });

  it('everyN: anchored at window.from', () => {
    const i = item({ recurrence: { kind: 'everyN', n: 3 }, window: { from: '2026-03' } });
    expect(['2026-02', '2026-03', '2026-04', '2026-06', '2026-09', '2026-12', '2027-03'].map((m) => occursIn(i, m)))
      .toEqual([false, true, false, true, true, true, true]);
  });

  it('specificMonths: month-of-year, repeats annually, bounded by window', () => {
    const i = item({ recurrence: { kind: 'specificMonths', months: [1, 9] }, window: { from: '2026-06', to: '2027-12' } });
    expect(occursIn(i, '2026-01')).toBe(false); // before window
    expect(occursIn(i, '2026-09')).toBe(true);
    expect(occursIn(i, '2027-01')).toBe(true);
    expect(occursIn(i, '2027-09')).toBe(true);
    expect(occursIn(i, '2027-10')).toBe(false);
  });
});

describe('horizonMonths', () => {
  it('lists startMonth + horizonMonths', () => {
    expect(horizonMonths(plan([]).settings)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']);
  });
});

describe('expand', () => {
  it('carries the running balance and starts from startingBalance', () => {
    const rows = expand(plan([
      item({ id: 's', label: 'Salary', direction: 'in', amount: 1000 }),
      item({ id: 'r', label: 'Rent', direction: 'out', amount: 1500 }),
    ], { startingBalance: 800, horizonMonths: 3 }));

    expect(rows.map((r) => r.month)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(rows.map((r) => r.opening)).toEqual([800, 300, -200]);
    expect(rows.map((r) => r.closing)).toEqual([300, -200, -700]);
    expect(rows[0].totalIn).toBe(1000);
    expect(rows[0].totalOut).toBe(1500);
    expect(rows[0].net).toBe(-500);
    expect(rows[0].occurrences.map((o) => o.itemId)).toEqual(['s', 'r']);
  });

  it('clips items to the horizon and handles a negative starting balance', () => {
    const rows = expand(plan([
      item({ id: 'b', label: 'Bonus', direction: 'in', amount: 500, recurrence: { kind: 'once', month: '2026-09' } }),
    ], { startingBalance: -100, horizonMonths: 3 }));
    expect(rows.every((r) => r.occurrences.length === 0)).toBe(true);
    expect(rows.map((r) => r.closing)).toEqual([-100, -100, -100]);
  });

  it('treats non-finite amounts as zero', () => {
    const rows = expand(plan([item({ amount: Number.NaN, direction: 'out' })], { horizonMonths: 1 }));
    expect(rows[0].totalOut).toBe(0);
    expect(rows[0].closing).toBe(0);
  });
});

describe('summarize', () => {
  const row = (month: string, closing: number) => ({
    month, opening: 0, occurrences: [], totalIn: 0, totalOut: 0, net: 0, closing,
  });

  it('all positive (zero counts as not negative)', () => {
    const s = summarize([row('2026-01', 10), row('2026-02', 0), row('2026-03', 5)]);
    expect(s.allPositive).toBe(true);
    expect(s.firstNegative).toBeUndefined();
    expect(s.recovery).toBeUndefined();
    expect(s.lowest).toEqual({ month: '2026-02', balance: 0 });
  });

  it('negative and recovers', () => {
    const s = summarize([row('2026-01', 10), row('2026-02', -50), row('2026-03', -80), row('2026-04', 5)]);
    expect(s.allPositive).toBe(false);
    expect(s.firstNegative).toBe('2026-02');
    expect(s.lowest).toEqual({ month: '2026-03', balance: -80 });
    expect(s.recovery).toBe('2026-04');
  });

  it('negative and never recovers', () => {
    const s = summarize([row('2026-01', 10), row('2026-02', -50), row('2026-03', -20)]);
    expect(s.firstNegative).toBe('2026-02');
    expect(s.recovery).toBeUndefined();
  });

  it('negative from month 0', () => {
    const s = summarize([row('2026-01', -1), row('2026-02', 1)]);
    expect(s.firstNegative).toBe('2026-01');
    expect(s.recovery).toBe('2026-02');
  });

  it('lowest picks the first of equal minima', () => {
    const s = summarize([row('2026-01', -5), row('2026-02', -5)]);
    expect(s.lowest.month).toBe('2026-01');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/domain/engine.test.ts`
Expected: FAIL — cannot resolve `./engine`.

- [ ] **Step 3: Implement `src/domain/engine.ts`**

```ts
import { monthOfYear, monthRange, toIndex, type MonthKey } from './month';
import type { Direction, Plan, PlanItem, PlanSettings } from './plan';

export interface Occurrence {
  itemId: string;
  label: string;
  direction: Direction;
  amount: number;
}

export interface MonthRow {
  month: MonthKey;
  opening: number;
  occurrences: Occurrence[];
  totalIn: number;
  totalOut: number;
  net: number;
  closing: number;
}

export interface Summary {
  allPositive: boolean;
  firstNegative?: MonthKey;
  lowest: { month: MonthKey; balance: number };
  recovery?: MonthKey;
}

/** Does `item` produce an occurrence in `month`? Pure; ignores the horizon. */
export function occursIn(item: PlanItem, month: MonthKey): boolean {
  const r = item.recurrence;
  if (r.kind === 'once') return r.month === month;

  const idx = toIndex(month);
  const from = toIndex(item.window.from);
  if (idx < from) return false;
  if (item.window.to !== undefined && idx > toIndex(item.window.to)) return false;

  switch (r.kind) {
    case 'monthly':
      return true;
    case 'everyN':
      return (idx - from) % r.n === 0;
    case 'specificMonths':
      return r.months.includes(monthOfYear(month));
  }
}

export function horizonMonths(settings: PlanSettings): MonthKey[] {
  return monthRange(settings.startMonth, settings.horizonMonths);
}

const safeAmount = (n: number): number => (Number.isFinite(n) ? n : 0);

export function expand(plan: Plan): MonthRow[] {
  let opening = plan.settings.startingBalance;
  return horizonMonths(plan.settings).map((month) => {
    const occurrences: Occurrence[] = plan.items
      .filter((item) => occursIn(item, month))
      .map((item) => ({
        itemId: item.id,
        label: item.label,
        direction: item.direction,
        amount: safeAmount(item.amount),
      }));
    const totalIn = occurrences.filter((o) => o.direction === 'in').reduce((s, o) => s + o.amount, 0);
    const totalOut = occurrences.filter((o) => o.direction === 'out').reduce((s, o) => s + o.amount, 0);
    const net = totalIn - totalOut;
    const closing = opening + net;
    const row: MonthRow = { month, opening, occurrences, totalIn, totalOut, net, closing };
    opening = closing;
    return row;
  });
}

/** `rows` must be non-empty. */
export function summarize(rows: MonthRow[]): Summary {
  let lowest = { month: rows[0].month, balance: rows[0].closing };
  let firstNegative: MonthKey | undefined;
  let recovery: MonthKey | undefined;

  for (const row of rows) {
    if (row.closing < lowest.balance) lowest = { month: row.month, balance: row.closing };
    if (firstNegative === undefined && row.closing < 0) firstNegative = row.month;
    else if (firstNegative !== undefined && recovery === undefined && row.closing >= 0) recovery = row.month;
  }

  return { allPositive: firstNegative === undefined, firstNegative, lowest, recovery };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/domain/engine.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add src/domain/engine.ts src/domain/engine.test.ts
git commit -m "feat(domain): expand and summarize engine"
```

---

### Task 5: Serialize — export and import

**Files:**
- Create: `src/domain/serialize.ts`
- Test: `src/domain/serialize.test.ts`

**Interfaces:**
- Consumes: `planSchema`, `Plan` from `./plan`.
- Produces:
  - `type ImportErrorCode = 'invalidJson' | 'unsupportedVersion' | 'invalidPlan'`
  - `type ImportResult = { ok: true; plan: Plan } | { ok: false; error: ImportErrorCode }`
  - `exportPlan(plan: Plan): string`
  - `importPlan(text: string): ImportResult`
  - `exportFilename(now?: Date): string` → `cashflow-plan-YYYY-MM-DD.json`

- [ ] **Step 1: Write the failing tests**

`src/domain/serialize.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { exportPlan, importPlan, exportFilename } from './serialize';
import { emptyPlan, type Plan } from './plan';

const sample: Plan = {
  ...emptyPlan(new Date(2026, 0, 1)),
  items: [{
    id: 'a', label: 'Salary', direction: 'in', amount: 9000,
    recurrence: { kind: 'monthly' }, window: { from: '2026-01' },
  }],
};

describe('export/import', () => {
  it('round-trips a plan', () => {
    const result = importPlan(exportPlan(sample));
    expect(result).toEqual({ ok: true, plan: sample });
  });

  it('export is pretty-printed JSON', () => {
    expect(exportPlan(sample)).toContain('\n  "schemaVersion": 1');
  });

  it('rejects malformed JSON', () => {
    expect(importPlan('{not json')).toEqual({ ok: false, error: 'invalidJson' });
  });

  it('rejects an unsupported schemaVersion', () => {
    expect(importPlan(JSON.stringify({ ...sample, schemaVersion: 2 }))).toEqual({ ok: false, error: 'unsupportedVersion' });
  });

  it('rejects a structurally invalid plan', () => {
    const bad = { ...sample, items: [{ ...sample.items[0], amount: -1 }] };
    expect(importPlan(JSON.stringify(bad))).toEqual({ ok: false, error: 'invalidPlan' });
    expect(importPlan('null')).toEqual({ ok: false, error: 'invalidPlan' });
    expect(importPlan('[]')).toEqual({ ok: false, error: 'invalidPlan' });
  });
});

describe('exportFilename', () => {
  it('stamps the date', () => {
    expect(exportFilename(new Date(2026, 8, 7))).toBe('cashflow-plan-2026-09-07.json');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/domain/serialize.test.ts`
Expected: FAIL — cannot resolve `./serialize`.

- [ ] **Step 3: Implement `src/domain/serialize.ts`**

```ts
import { planSchema, type Plan } from './plan';

export type ImportErrorCode = 'invalidJson' | 'unsupportedVersion' | 'invalidPlan';
export type ImportResult = { ok: true; plan: Plan } | { ok: false; error: ImportErrorCode };

export function exportPlan(plan: Plan): string {
  return JSON.stringify(plan, null, 2);
}

/** The trust boundary: anything from a file or localStorage goes through here. */
export function importPlan(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalidJson' };
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'invalidPlan' };
  }
  const version = (raw as { schemaVersion?: unknown }).schemaVersion;
  if (version !== undefined && version !== 1) {
    return { ok: false, error: 'unsupportedVersion' };
  }
  const parsed = planSchema.safeParse(raw);
  return parsed.success ? { ok: true, plan: parsed.data } : { ok: false, error: 'invalidPlan' };
}

export function exportFilename(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `cashflow-plan-${y}-${m}-${d}.json`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/domain/serialize.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/domain/serialize.ts src/domain/serialize.test.ts
git commit -m "feat(domain): JSON export/import with schema validation"
```

---

### Task 6: Plan store with localStorage persistence

**Files:**
- Create: `src/store/planStore.ts`
- Test: `src/store/planStore.test.ts`

**Interfaces:**
- Consumes: `Plan`, `PlanItem`, `PlanSettings`, `emptyPlan`, `newId` from `../domain/plan`; `importPlan`, `ImportErrorCode` from `../domain/serialize`; `addMonths`, `diffMonths`, `MonthKey` from `../domain/month`.
- Produces:
  - `STORAGE_KEY = 'cashflow-timeline:plan:v1'`
  - `loadStoredPlan(storage: Storage): Plan | null` — validated; invalid → `null` + `console.warn`
  - `persistPlan(storage: Storage, plan: Plan): boolean` — `false` if the write threw
  - `interface PlanState { plan: Plan; setupOpen: boolean; storageError: boolean; importError: ImportErrorCode | null; savePlan(plan: Plan): void; updateSettings(patch: Partial<PlanSettings>): void; addOneOff(input: { label: string; amount: number; direction: Direction; month: MonthKey }): void; moveItem(id: string, toMonth: MonthKey): void; importFromText(text: string): boolean; clearAll(): void; openSetup(): void; closeSetup(): void; clearImportError(): void }`
  - `createPlanStore(storage: Storage | undefined)` → a zustand `StoreApi<PlanState>` with hook (`UseBoundStore`)
  - `usePlanStore` — the app singleton bound to `globalThis.localStorage`
  - Move semantics: `once` → `recurrence.month = toMonth`, `window = { from: toMonth }`. Recurring → `delta = diffMonths(window.from, toMonth)`; `window.from = toMonth`; `window.to = to ? addMonths(to, delta) : undefined`.
  - Rule CRUD (add/edit/delete) is **not** a store action; the Setup dialog edits a draft and calls `savePlan`.
  - `setupOpen` initial value: `true` when nothing stored or the stored plan has zero items.

- [ ] **Step 1: Write the failing tests**

`src/store/planStore.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPlanStore, loadStoredPlan, persistPlan, STORAGE_KEY } from './planStore';
import { emptyPlan, type Plan, type PlanItem } from '../domain/plan';
import { exportPlan } from '../domain/serialize';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => { map.delete(k); },
    setItem: (k, v) => { map.set(k, v); },
  };
}

const salary: PlanItem = {
  id: 's', label: 'Salary', direction: 'in', amount: 9000,
  recurrence: { kind: 'monthly' }, window: { from: '2026-01' },
};
const plan: Plan = { ...emptyPlan(new Date(2026, 0, 1)), items: [salary] };

let storage: Storage;
beforeEach(() => { storage = memoryStorage(); });

describe('loadStoredPlan / persistPlan', () => {
  it('returns null when nothing stored', () => {
    expect(loadStoredPlan(storage)).toBeNull();
  });
  it('round-trips through storage', () => {
    expect(persistPlan(storage, plan)).toBe(true);
    expect(loadStoredPlan(storage)).toEqual(plan);
  });
  it('discards a corrupt entry with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storage.setItem(STORAGE_KEY, '{"schemaVersion":1,"items":"nope"}');
    expect(loadStoredPlan(storage)).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
  it('reports a failed write', () => {
    const broken: Storage = { ...storage, setItem: () => { throw new Error('quota'); } };
    expect(persistPlan(broken, plan)).toBe(false);
  });
});

describe('createPlanStore', () => {
  it('opens setup when nothing is stored', () => {
    const store = createPlanStore(storage);
    expect(store.getState().setupOpen).toBe(true);
    expect(store.getState().plan.items).toEqual([]);
  });

  it('restores a stored plan and keeps setup closed', () => {
    persistPlan(storage, plan);
    const store = createPlanStore(storage);
    expect(store.getState().plan).toEqual(plan);
    expect(store.getState().setupOpen).toBe(false);
  });

  it('opens setup when the stored plan has no items', () => {
    persistPlan(storage, emptyPlan());
    expect(createPlanStore(storage).getState().setupOpen).toBe(true);
  });

  it('savePlan persists and closes setup', () => {
    const store = createPlanStore(storage);
    store.getState().savePlan(plan);
    expect(store.getState().setupOpen).toBe(false);
    expect(loadStoredPlan(storage)).toEqual(plan);
  });

  it('updateSettings merges and persists', () => {
    const store = createPlanStore(storage);
    store.getState().savePlan(plan);
    store.getState().updateSettings({ horizonMonths: 3, locale: 'ar' });
    expect(store.getState().plan.settings).toMatchObject({ horizonMonths: 3, locale: 'ar', currency: 'SAR' });
    expect(loadStoredPlan(storage)?.settings.horizonMonths).toBe(3);
  });

  it('addOneOff appends a once item anchored at the month', () => {
    const store = createPlanStore(storage);
    store.getState().savePlan(plan);
    store.getState().addOneOff({ label: 'Tyres', amount: 800, direction: 'out', month: '2026-04' });
    const added = store.getState().plan.items.at(-1)!;
    expect(added).toMatchObject({
      label: 'Tyres', amount: 800, direction: 'out',
      recurrence: { kind: 'once', month: '2026-04' }, window: { from: '2026-04' },
    });
    expect(added.id).toBeTruthy();
  });

  it('moveItem on a once item changes its month', () => {
    const store = createPlanStore(storage);
    store.getState().savePlan({ ...plan, items: [{ ...salary, id: 'b', recurrence: { kind: 'once', month: '2026-03' }, window: { from: '2026-03' } }] });
    store.getState().moveItem('b', '2026-05');
    expect(store.getState().plan.items[0]).toMatchObject({ recurrence: { kind: 'once', month: '2026-05' }, window: { from: '2026-05' } });
  });

  it('moveItem on a recurring item shifts the whole window', () => {
    const store = createPlanStore(storage);
    store.getState().savePlan({ ...plan, items: [{ ...salary, window: { from: '2026-01', to: '2026-06' } }] });
    store.getState().moveItem('s', '2026-03');
    expect(store.getState().plan.items[0].window).toEqual({ from: '2026-03', to: '2026-08' });
  });

  it('moveItem ignores unknown ids', () => {
    const store = createPlanStore(storage);
    store.getState().savePlan(plan);
    store.getState().moveItem('nope', '2026-03');
    expect(store.getState().plan).toEqual(plan);
  });

  it('importFromText replaces the plan on success and sets importError on failure', () => {
    const store = createPlanStore(storage);
    expect(store.getState().importFromText('garbage')).toBe(false);
    expect(store.getState().importError).toBe('invalidJson');
    expect(store.getState().importFromText(exportPlan(plan))).toBe(true);
    expect(store.getState().importError).toBeNull();
    expect(store.getState().plan).toEqual(plan);
    expect(store.getState().setupOpen).toBe(false);
  });

  it('clearAll wipes storage and reopens setup', () => {
    const store = createPlanStore(storage);
    store.getState().savePlan(plan);
    store.getState().clearAll();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(store.getState().plan.items).toEqual([]);
    expect(store.getState().setupOpen).toBe(true);
  });

  it('sets storageError when persistence fails, and keeps working', () => {
    const broken: Storage = { ...storage, setItem: () => { throw new Error('quota'); } };
    const store = createPlanStore(broken);
    store.getState().savePlan(plan);
    expect(store.getState().storageError).toBe(true);
    expect(store.getState().plan).toEqual(plan);
  });

  it('works without any storage (undefined)', () => {
    const store = createPlanStore(undefined);
    store.getState().savePlan(plan);
    expect(store.getState().plan).toEqual(plan);
    expect(store.getState().storageError).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/store/planStore.test.ts`
Expected: FAIL — cannot resolve `./planStore`.

- [ ] **Step 3: Implement `src/store/planStore.ts`**

```ts
import { create } from 'zustand';
import { addMonths, diffMonths, type MonthKey } from '../domain/month';
import { emptyPlan, newId, type Direction, type Plan, type PlanItem, type PlanSettings } from '../domain/plan';
import { exportPlan, importPlan, type ImportErrorCode } from '../domain/serialize';

export const STORAGE_KEY = 'cashflow-timeline:plan:v1';

export function loadStoredPlan(storage: Storage): Plan | null {
  let text: string | null;
  try {
    text = storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (text === null) return null;
  const result = importPlan(text);
  if (!result.ok) {
    console.warn(`Discarding stored plan (${result.error})`);
    return null;
  }
  return result.plan;
}

export function persistPlan(storage: Storage, plan: Plan): boolean {
  try {
    storage.setItem(STORAGE_KEY, exportPlan(plan));
    return true;
  } catch {
    return false;
  }
}

export interface PlanState {
  plan: Plan;
  setupOpen: boolean;
  storageError: boolean;
  importError: ImportErrorCode | null;
  savePlan(plan: Plan): void;
  updateSettings(patch: Partial<PlanSettings>): void;
  addOneOff(input: { label: string; amount: number; direction: Direction; month: MonthKey }): void;
  moveItem(id: string, toMonth: MonthKey): void;
  importFromText(text: string): boolean;
  clearAll(): void;
  openSetup(): void;
  closeSetup(): void;
  clearImportError(): void;
}

function movedItem(item: PlanItem, toMonth: MonthKey): PlanItem {
  if (item.recurrence.kind === 'once') {
    return { ...item, recurrence: { kind: 'once', month: toMonth }, window: { from: toMonth } };
  }
  const delta = diffMonths(item.window.from, toMonth);
  return {
    ...item,
    window: {
      from: toMonth,
      to: item.window.to === undefined ? undefined : addMonths(item.window.to, delta),
    },
  };
}

export function createPlanStore(storage: Storage | undefined) {
  const stored = storage ? loadStoredPlan(storage) : null;

  return create<PlanState>()((set, get) => {
    /** Single write path: update state, mirror to storage, record failures. */
    const commit = (plan: Plan, extra: Partial<PlanState> = {}) => {
      const storageError = storage ? !persistPlan(storage, plan) : false;
      set({ plan, storageError, ...extra });
    };

    return {
      plan: stored ?? emptyPlan(),
      setupOpen: stored === null || stored.items.length === 0,
      storageError: false,
      importError: null,

      savePlan: (plan) => commit(plan, { setupOpen: false }),

      updateSettings: (patch) => {
        const { plan } = get();
        commit({ ...plan, settings: { ...plan.settings, ...patch } });
      },

      addOneOff: ({ label, amount, direction, month }) => {
        const { plan } = get();
        const item: PlanItem = {
          id: newId(), label, amount, direction,
          recurrence: { kind: 'once', month }, window: { from: month },
        };
        commit({ ...plan, items: [...plan.items, item] });
      },

      moveItem: (id, toMonth) => {
        const { plan } = get();
        if (!plan.items.some((i) => i.id === id)) return;
        commit({ ...plan, items: plan.items.map((i) => (i.id === id ? movedItem(i, toMonth) : i)) });
      },

      importFromText: (text) => {
        const result = importPlan(text);
        if (!result.ok) {
          set({ importError: result.error });
          return false;
        }
        commit(result.plan, { importError: null, setupOpen: false });
        return true;
      },

      clearAll: () => {
        try { storage?.removeItem(STORAGE_KEY); } catch { /* nothing to do */ }
        set({ plan: emptyPlan(), setupOpen: true, storageError: false, importError: null });
      },

      openSetup: () => set({ setupOpen: true }),
      closeSetup: () => set({ setupOpen: false }),
      clearImportError: () => set({ importError: null }),
    };
  });
}

export const usePlanStore = createPlanStore(
  typeof globalThis.localStorage === 'undefined' ? undefined : globalThis.localStorage,
);
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/store/planStore.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 5: Commit**

```bash
git add src/store/planStore.ts src/store/planStore.test.ts
git commit -m "feat(store): zustand plan store with localStorage persistence"
```

---

### Task 7: i18n dictionaries, `useT`, document locale, formatting

**Files:**
- Create: `src/i18n/en.ts`, `src/i18n/ar.ts`, `src/i18n/index.ts`, `src/i18n/format.ts`
- Test: `src/i18n/i18n.test.ts`

**Interfaces:**
- Consumes: `Locale` from `../domain/plan`; `usePlanStore` from `../store/planStore`; `MonthKey` from `../domain/month`.
- Produces:
  - `en` (dictionary, `as const`), `type MessageKey = keyof typeof en`, `ar: Record<MessageKey, string>`
  - `t(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string` — `{name}` interpolation
  - `useT(): (key: MessageKey, vars?) => string` — reads `plan.settings.locale` from the store
  - `useLocale(): Locale`
  - `applyLocaleToDocument(locale: Locale): void` — sets `<html lang dir>`
  - `formatMoney(amount: number, currency: string, locale: Locale): string`
  - `formatMonth(month: MonthKey, locale: Locale, style?: 'short' | 'long'): string`
  - `monthName(monthOfYear: number, locale: Locale): string` — e.g. `monthName(9,'en') === 'Sep'`
  - Intl locale tags: `en → 'en-US'`, `ar → 'ar-u-ca-gregory-nu-latn'` (Gregorian calendar, Latin digits — `ar-SA` would otherwise default to Umm al-Qura and Arabic-Indic digits).

- [ ] **Step 1: Write the failing tests**

`src/i18n/i18n.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { en } from './en';
import { ar } from './ar';
import { t, applyLocaleToDocument } from './index';
import { formatMoney, formatMonth, monthName } from './format';

describe('dictionaries', () => {
  it('ar has every en key and no empty strings', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(ar[key], key).toBeTypeOf('string');
      expect(ar[key].length, key).toBeGreaterThan(0);
    }
    expect(Object.keys(ar).length).toBe(Object.keys(en).length);
  });
});

describe('t', () => {
  it('interpolates {vars}', () => {
    expect(t('en', 'summaryAllPositive', { n: 6 })).toBe('All 6 months positive ✓');
    expect(t('ar', 'summaryAllPositive', { n: 6 })).toContain('6');
  });
});

describe('applyLocaleToDocument', () => {
  it('sets lang and dir on <html>', () => {
    applyLocaleToDocument('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    applyLocaleToDocument('en');
    expect(document.documentElement.dir).toBe('ltr');
  });
});

describe('format', () => {
  it('formatMoney uses the currency and locale', () => {
    expect(formatMoney(1234.5, 'USD', 'en')).toBe('$1,234.50');
    expect(formatMoney(-50, 'USD', 'en')).toBe('-$50.00');
    // Arabic: Latin digits forced, so the digits are still 0-9
    expect(formatMoney(1234, 'SAR', 'ar')).toMatch(/1,?234/);
  });
  it('formatMonth is Gregorian in both locales', () => {
    expect(formatMonth('2026-09', 'en')).toBe('Sep 2026');
    expect(formatMonth('2026-09', 'en', 'long')).toBe('September 2026');
    expect(formatMonth('2026-09', 'ar')).toContain('2026');
  });
  it('monthName', () => {
    expect(monthName(1, 'en')).toBe('Jan');
    expect(monthName(12, 'en')).toBe('Dec');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/i18n/i18n.test.ts`
Expected: FAIL — cannot resolve `./en`.

- [ ] **Step 3: Write `src/i18n/en.ts`**

```ts
export const en = {
  appTitle: 'Cashflow Timeline',
  privacyNote: 'Everything stays in this browser. Nothing is sent anywhere.',

  // Toolbar
  horizon: 'Horizon',
  horizonMonths: '{n} months',
  horizonCustom: 'Custom',
  switchLanguage: 'العربية',
  currency: 'Currency',
  exportJson: 'Export JSON',
  importJson: 'Import JSON',
  openSetup: 'Setup',
  clearAll: 'Clear all data',
  clearConfirm: 'Delete the plan stored in this browser? This cannot be undone.',
  importError_invalidJson: 'That file is not valid JSON.',
  importError_unsupportedVersion: 'That file was made by an unsupported version of this app.',
  importError_invalidPlan: 'That file does not contain a valid plan.',
  storageError: 'Could not save on this device. Changes will be lost when you close the tab — export your plan to keep it.',

  // Summary
  summaryAllPositive: 'All {n} months positive ✓',
  summaryFirstNegative: 'First negative: {month}',
  summaryLowest: 'Lowest: {amount} in {month}',
  summaryRecovers: 'Recovers: {month}',
  summaryNeverRecovers: 'Does not recover in this horizon',

  // Chart + grid
  chartTitle: 'Closing balance by month',
  opening: 'Opening',
  totalIn: 'Total in',
  totalOut: 'Total out',
  net: 'Net',
  closing: 'Closing balance',
  item: 'Item',
  income: 'Income',
  expenses: 'Expenses',
  noItems: 'No items yet. Open Setup to add your income and expenses.',
  addOneOff: 'Add a one-off in {month}',
  moveTo: 'Move to',

  // Setup dialog
  setupTitle: 'Plan setup',
  basics: 'Basics',
  startingBalance: 'Starting balance',
  startMonth: 'Start month',
  language: 'Language',
  addIncome: 'Add income',
  addExpense: 'Add expense',
  edit: 'Edit',
  delete: 'Delete',
  save: 'Save',
  savePlan: 'Save plan',
  cancel: 'Cancel',
  add: 'Add',

  // Item form
  label: 'Label',
  amount: 'Amount',
  note: 'Note (optional)',
  direction: 'Type',
  directionIn: 'Income',
  directionOut: 'Expense',
  recurrence: 'Repeats',
  recurrenceMonthly: 'Every month',
  recurrenceOnce: 'Once',
  recurrenceEveryN: 'Every N months',
  recurrenceSpecificMonths: 'Specific months of the year',
  month: 'Month',
  everyN: 'Every how many months',
  monthsOfYear: 'Months',
  from: 'From',
  to: 'Until (optional)',
  errLabel: 'Enter a label.',
  errAmount: 'Enter an amount greater than zero.',
  errN: 'Enter a number of months of 2 or more.',
  errMonths: 'Pick at least one month.',
  errWindow: '"Until" must not be before "From".',
} as const;

export type MessageKey = keyof typeof en;
```

- [ ] **Step 4: Write `src/i18n/ar.ts`**

```ts
import type { MessageKey } from './en';

export const ar: Record<MessageKey, string> = {
  appTitle: 'الجدول الزمني للتدفق النقدي',
  privacyNote: 'كل شيء يبقى في هذا المتصفح. لا يُرسل أي شيء إلى أي مكان.',

  horizon: 'المدى',
  horizonMonths: '{n} أشهر',
  horizonCustom: 'مخصص',
  switchLanguage: 'English',
  currency: 'العملة',
  exportJson: 'تصدير JSON',
  importJson: 'استيراد JSON',
  openSetup: 'الإعداد',
  clearAll: 'مسح كل البيانات',
  clearConfirm: 'هل تريد حذف الخطة المحفوظة في هذا المتصفح؟ لا يمكن التراجع عن ذلك.',
  importError_invalidJson: 'هذا الملف ليس JSON صالحًا.',
  importError_unsupportedVersion: 'هذا الملف من إصدار غير مدعوم من التطبيق.',
  importError_invalidPlan: 'هذا الملف لا يحتوي على خطة صالحة.',
  storageError: 'تعذّر الحفظ على هذا الجهاز. ستُفقد التغييرات عند إغلاق التبويب — صدّر خطتك للاحتفاظ بها.',

  summaryAllPositive: 'كل الأشهر الـ{n} موجبة ✓',
  summaryFirstNegative: 'أول شهر سالب: {month}',
  summaryLowest: 'الأدنى: {amount} في {month}',
  summaryRecovers: 'يتعافى: {month}',
  summaryNeverRecovers: 'لا يتعافى ضمن هذا المدى',

  chartTitle: 'الرصيد الختامي حسب الشهر',
  opening: 'الافتتاحي',
  totalIn: 'إجمالي الداخل',
  totalOut: 'إجمالي الخارج',
  net: 'الصافي',
  closing: 'الرصيد الختامي',
  item: 'البند',
  income: 'الدخل',
  expenses: 'المصروفات',
  noItems: 'لا توجد بنود بعد. افتح الإعداد لإضافة دخلك ومصروفاتك.',
  addOneOff: 'إضافة بند لمرة واحدة في {month}',
  moveTo: 'نقل إلى',

  setupTitle: 'إعداد الخطة',
  basics: 'الأساسيات',
  startingBalance: 'الرصيد الابتدائي',
  startMonth: 'شهر البداية',
  language: 'اللغة',
  addIncome: 'إضافة دخل',
  addExpense: 'إضافة مصروف',
  edit: 'تعديل',
  delete: 'حذف',
  save: 'حفظ',
  savePlan: 'حفظ الخطة',
  cancel: 'إلغاء',
  add: 'إضافة',

  label: 'الاسم',
  amount: 'المبلغ',
  note: 'ملاحظة (اختياري)',
  direction: 'النوع',
  directionIn: 'دخل',
  directionOut: 'مصروف',
  recurrence: 'التكرار',
  recurrenceMonthly: 'كل شهر',
  recurrenceOnce: 'مرة واحدة',
  recurrenceEveryN: 'كل N أشهر',
  recurrenceSpecificMonths: 'أشهر محددة من السنة',
  month: 'الشهر',
  everyN: 'كل كم شهر',
  monthsOfYear: 'الأشهر',
  from: 'من',
  to: 'حتى (اختياري)',
  errLabel: 'أدخل اسمًا.',
  errAmount: 'أدخل مبلغًا أكبر من صفر.',
  errN: 'أدخل عدد أشهر لا يقل عن 2.',
  errMonths: 'اختر شهرًا واحدًا على الأقل.',
  errWindow: '"حتى" يجب ألا يسبق "من".',
};
```

- [ ] **Step 5: Write `src/i18n/index.ts`**

```ts
import type { Locale } from '../domain/plan';
import { usePlanStore } from '../store/planStore';
import { en, type MessageKey } from './en';
import { ar } from './ar';

export type { MessageKey } from './en';

const dictionaries: Record<Locale, Record<MessageKey, string>> = { en, ar };

export function t(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const template = dictionaries[locale][key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

export function useLocale(): Locale {
  return usePlanStore((s) => s.plan.settings.locale);
}

export function useT() {
  const locale = useLocale();
  return (key: MessageKey, vars?: Record<string, string | number>) => t(locale, key, vars);
}

export function applyLocaleToDocument(locale: Locale): void {
  const html = document.documentElement;
  html.lang = locale;
  html.dir = locale === 'ar' ? 'rtl' : 'ltr';
}
```

- [ ] **Step 6: Write `src/i18n/format.ts`**

```ts
import type { MonthKey } from '../domain/month';
import type { Locale } from '../domain/plan';

/** Gregorian calendar + Latin digits are forced for Arabic; ar-SA would default to Umm al-Qura. */
const INTL_LOCALE: Record<Locale, string> = {
  en: 'en-US',
  ar: 'ar-u-ca-gregory-nu-latn',
};

export function formatMoney(amount: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { style: 'currency', currency }).format(amount);
}

function monthDate(month: MonthKey): Date {
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return new Date(Date.UTC(year, m - 1, 1));
}

export function formatMonth(month: MonthKey, locale: Locale, style: 'short' | 'long' = 'short'): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: style, year: 'numeric', timeZone: 'UTC' })
    .format(monthDate(month));
}

export function monthName(monthOfYear: number, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2026, monthOfYear - 1, 1)));
}
```

- [ ] **Step 7: Run to verify it passes**

Run: `pnpm vitest run src/i18n/i18n.test.ts`
Expected: PASS, 7 tests. If `formatMonth('2026-09','ar')` fails on your machine, check `node -p "Intl.DateTimeFormat.supportedLocalesOf(['ar'])"` prints `['ar']` — Node ships full ICU; do not weaken the test.

- [ ] **Step 8: Commit**

```bash
git add src/i18n
git commit -m "feat(i18n): en/ar dictionaries, useT, document locale, Intl formatting"
```

---

### Task 8: SummaryStrip

**Files:**
- Create: `src/components/SummaryStrip.tsx`
- Test: `src/components/SummaryStrip.test.tsx`

**Interfaces:**
- Consumes: `Summary` from `../domain/engine`; `useT`, `useLocale` from `../i18n`; `formatMoney`, `formatMonth` from `../i18n/format`; `usePlanStore` for currency.
- Produces: `<SummaryStrip summary={Summary} monthCount={number} />`

- [ ] **Step 1: Write the failing test**

`src/components/SummaryStrip.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummaryStrip } from './SummaryStrip';
import { usePlanStore } from '../store/planStore';
import { emptyPlan } from '../domain/plan';

beforeEach(() => {
  usePlanStore.setState({ plan: emptyPlan(new Date(2026, 0, 1)), setupOpen: false });
});

describe('SummaryStrip', () => {
  it('shows the all-positive message', () => {
    render(<SummaryStrip monthCount={6} summary={{ allPositive: true, lowest: { month: '2026-02', balance: 10 } }} />);
    expect(screen.getByText('All 6 months positive ✓')).toBeInTheDocument();
  });

  it('shows first negative, lowest and recovery', () => {
    render(<SummaryStrip monthCount={6} summary={{
      allPositive: false, firstNegative: '2026-03',
      lowest: { month: '2026-04', balance: -4250 }, recovery: '2026-06',
    }} />);
    expect(screen.getByText('First negative: Mar 2026')).toBeInTheDocument();
    expect(screen.getByText(/Lowest: .*4,250.* in Apr 2026/)).toBeInTheDocument();
    expect(screen.getByText('Recovers: Jun 2026')).toBeInTheDocument();
  });

  it('shows never-recovers when recovery is absent', () => {
    render(<SummaryStrip monthCount={3} summary={{
      allPositive: false, firstNegative: '2026-01', lowest: { month: '2026-03', balance: -1 },
    }} />);
    expect(screen.getByText('Does not recover in this horizon')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/components/SummaryStrip.test.tsx`
Expected: FAIL — cannot resolve `./SummaryStrip`.

- [ ] **Step 3: Implement `src/components/SummaryStrip.tsx`**

```tsx
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/components/SummaryStrip.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/SummaryStrip.tsx src/components/SummaryStrip.test.tsx
git commit -m "feat(ui): SummaryStrip"
```

---

### Task 9: BalanceChart (hand-drawn SVG)

**Files:**
- Create: `src/components/BalanceChart.tsx`
- Test: `src/components/BalanceChart.test.tsx`

**Interfaces:**
- Consumes: `MonthRow` from `../domain/engine`; `useT`, `useLocale`; `formatMoney`, `formatMonth`; `usePlanStore` for currency.
- Produces: `<BalanceChart rows={MonthRow[]} />`. Renders an `<svg role="img">` with: a zero line, a `<polyline data-testid="balance-line">`, a red `<polygon data-testid="negative-area">` clipped to below zero (only when any closing < 0), one transparent hover `<rect>` per month with a `<title>` tooltip, and month labels. **RTL:** month order is reversed on the x-axis when `locale === 'ar'`.

- [ ] **Step 1: Write the failing test**

`src/components/BalanceChart.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BalanceChart } from './BalanceChart';
import { usePlanStore } from '../store/planStore';
import { emptyPlan } from '../domain/plan';
import type { MonthRow } from '../domain/engine';

const row = (month: string, closing: number): MonthRow => ({
  month, opening: 0, occurrences: [], totalIn: 0, totalOut: 0, net: 0, closing,
});

beforeEach(() => {
  usePlanStore.setState({ plan: emptyPlan(new Date(2026, 0, 1)), setupOpen: false });
});

describe('BalanceChart', () => {
  it('draws one point per month and no negative area when all positive', () => {
    render(<BalanceChart rows={[row('2026-01', 10), row('2026-02', 20), row('2026-03', 30)]} />);
    const line = screen.getByTestId('balance-line');
    expect(line.getAttribute('points')!.trim().split(/\s+/)).toHaveLength(3);
    expect(screen.queryByTestId('negative-area')).toBeNull();
    expect(screen.getAllByRole('presentation')).toHaveLength(3);
  });

  it('shades the negative area when any month is negative', () => {
    render(<BalanceChart rows={[row('2026-01', 10), row('2026-02', -20)]} />);
    expect(screen.getByTestId('negative-area')).toBeInTheDocument();
  });

  it('reverses x order in Arabic', () => {
    render(<BalanceChart rows={[row('2026-01', 0), row('2026-02', 0)]} />);
    const ltr = screen.getByTestId('balance-line').getAttribute('points')!;
    usePlanStore.setState((s) => ({ plan: { ...s.plan, settings: { ...s.plan.settings, locale: 'ar' } } }));
    render(<BalanceChart rows={[row('2026-01', 0), row('2026-02', 0)]} />);
    const rtl = screen.getAllByTestId('balance-line')[1].getAttribute('points')!;
    const xs = (p: string) => p.trim().split(/\s+/).map((pt) => Number(pt.split(',')[0]));
    expect(xs(rtl)).toEqual([...xs(ltr)].reverse());
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/components/BalanceChart.test.tsx`
Expected: FAIL — cannot resolve `./BalanceChart`.

- [ ] **Step 3: Implement `src/components/BalanceChart.tsx`**

```tsx
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
    <figure className="rounded-lg border border-slate-200 bg-white p-3">
      <figcaption className="mb-2 text-sm font-medium text-slate-600">{t('chartTitle')}</figcaption>
      <svg role="img" aria-label={t('chartTitle')} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        <defs>
          <clipPath id="below-zero">
            <rect x={0} y={zeroY} width={W} height={Math.max(0, H - zeroY)} />
          </clipPath>
        </defs>
        <line x1={PAD.x} x2={W - PAD.x} y1={zeroY} y2={zeroY} stroke="#94a3b8" strokeDasharray="4 4" />
        {hasNegative && (
          <polygon data-testid="negative-area" points={areaPoints} fill="#ef4444" fillOpacity={0.25} clipPath="url(#below-zero)" />
        )}
        <polyline data-testid="balance-line" points={points} fill="none" stroke="#0f172a" strokeWidth={2} />
        {rows.map((r, i) => (
          <g key={r.month}>
            <circle cx={x(i)} cy={y(r.closing)} r={3.5} fill={r.closing < 0 ? '#ef4444' : '#0f172a'} />
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="#475569">
              {formatMonth(r.month, locale)}
            </text>
            <rect role="presentation" x={x(i) - slot / 2} y={0} width={slot} height={H} fill="transparent">
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/components/BalanceChart.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/BalanceChart.tsx src/components/BalanceChart.test.tsx
git commit -m "feat(ui): SVG balance chart with negative shading and RTL axis"
```

---

### Task 10: TimelineGrid and OneOffDialog

**Files:**
- Create: `src/components/OneOffDialog.tsx`, `src/components/TimelineGrid.tsx`
- Test: `src/components/TimelineGrid.test.tsx`

**Interfaces:**
- Consumes: `MonthRow`, `occursIn` from `../domain/engine`; `PlanItem`, `Direction` from `../domain/plan`; `MonthKey` from `../domain/month`; `usePlanStore` (`plan`, `addOneOff`, `moveItem`); `useT`, `useLocale`; `formatMoney`, `formatMonth`.
- Produces:
  - `<OneOffDialog month={MonthKey} onClose={() => void} />` — form with label, amount, direction; submit calls `addOneOff` then `onClose`.
  - `<TimelineGrid rows={MonthRow[]} />` — `<table>`; header cells carry a `+` button labelled `t('addOneOff', {month})`; each item row has an `<input type="month" aria-label="Move to: <label>">` whose value is the item's anchor month (`once` → `recurrence.month`, else `window.from`), `onChange` → `moveItem`.
  - Layout: wrapper `overflow-x-auto`; first column `sticky start-0 bg-white`.

- [ ] **Step 1: Write the failing test**

`src/components/TimelineGrid.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimelineGrid } from './TimelineGrid';
import { usePlanStore } from '../store/planStore';
import { emptyPlan, type Plan } from '../domain/plan';
import { expand } from '../domain/engine';

const plan: Plan = {
  ...emptyPlan(new Date(2026, 0, 1)),
  settings: { ...emptyPlan().settings, startMonth: '2026-01', horizonMonths: 3, startingBalance: 100 },
  items: [
    { id: 's', label: 'Salary', direction: 'in', amount: 1000, recurrence: { kind: 'monthly' }, window: { from: '2026-01' } },
    { id: 'c', label: 'Car', direction: 'out', amount: 500, recurrence: { kind: 'once', month: '2026-02' }, window: { from: '2026-02' } },
  ],
};

function renderGrid() {
  const rows = expand(usePlanStore.getState().plan);
  return render(<TimelineGrid rows={rows} />);
}

beforeEach(() => {
  localStorage.clear();
  usePlanStore.setState({ plan, setupOpen: false, importError: null, storageError: false });
});

describe('TimelineGrid', () => {
  it('renders items, months and closing balances', () => {
    renderGrid();
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('Car')).toBeInTheDocument();
    expect(screen.getByText('Jan 2026')).toBeInTheDocument();
    // closing: 1100, 1600, 2600
    expect(screen.getByText(/2,600/)).toBeInTheDocument();
  });

  it('adds a one-off via the month "+" button', async () => {
    const user = userEvent.setup();
    renderGrid();
    await user.click(screen.getByRole('button', { name: 'Add a one-off in Mar 2026' }));
    await user.type(screen.getByLabelText('Label'), 'Tyres');
    await user.type(screen.getByLabelText('Amount'), '800');
    await user.selectOptions(screen.getByLabelText('Type'), 'out');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    const added = usePlanStore.getState().plan.items.at(-1)!;
    expect(added).toMatchObject({ label: 'Tyres', amount: 800, direction: 'out', recurrence: { kind: 'once', month: '2026-03' } });
  });

  it('moves an item with the month input', () => {
    renderGrid();
    const input = screen.getByLabelText('Move to: Car') as HTMLInputElement;
    expect(input.value).toBe('2026-02');
    fireEvent.change(input, { target: { value: '2026-03' } });
    expect(usePlanStore.getState().plan.items.find((i) => i.id === 'c')!.recurrence).toEqual({ kind: 'once', month: '2026-03' });
  });

  it('shows the empty state when there are no items', () => {
    usePlanStore.setState({ plan: { ...plan, items: [] } });
    renderGrid();
    expect(screen.getByText(/No items yet/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/components/TimelineGrid.test.tsx`
Expected: FAIL — cannot resolve `./TimelineGrid`.

- [ ] **Step 3: Implement `src/components/OneOffDialog.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import type { MonthKey } from '../domain/month';
import type { Direction } from '../domain/plan';
import { useLocale, useT } from '../i18n';
import { formatMonth } from '../i18n/format';
import { usePlanStore } from '../store/planStore';

interface Props {
  month: MonthKey;
  onClose: () => void;
}

export function OneOffDialog({ month, onClose }: Props) {
  const t = useT();
  const locale = useLocale();
  const addOneOff = usePlanStore((s) => s.addOneOff);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<Direction>('out');
  const [error, setError] = useState<'errLabel' | 'errAmount' | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (label.trim() === '') return setError('errLabel');
    if (!Number.isFinite(n) || n <= 0) return setError('errAmount');
    addOneOff({ label: label.trim(), amount: n, direction, month });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="oneoff-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-sm space-y-3 rounded-lg bg-white p-4 shadow-xl"
      >
        <h2 id="oneoff-title" className="text-lg font-semibold">{t('addOneOff', { month: formatMonth(month, locale, 'long') })}</h2>
        <label className="block text-sm">
          <span className="mb-1 block">{t('label')}</span>
          <input className="w-full rounded border border-slate-300 px-2 py-1" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block">{t('amount')}</span>
          <input className="w-full rounded border border-slate-300 px-2 py-1" type="number" inputMode="decimal" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block">{t('direction')}</span>
          <select className="w-full rounded border border-slate-300 px-2 py-1" value={direction} onChange={(e) => setDirection(e.target.value as Direction)}>
            <option value="in">{t('directionIn')}</option>
            <option value="out">{t('directionOut')}</option>
          </select>
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{t(error)}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-3 py-1 text-slate-700 hover:bg-slate-100">{t('cancel')}</button>
          <button type="submit" className="rounded bg-slate-900 px-3 py-1 text-white hover:bg-slate-700">{t('add')}</button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Implement `src/components/TimelineGrid.tsx`**

```tsx
import { useState } from 'react';
import { occursIn, type MonthRow } from '../domain/engine';
import type { MonthKey } from '../domain/month';
import type { PlanItem } from '../domain/plan';
import { useLocale, useT } from '../i18n';
import { formatMoney, formatMonth } from '../i18n/format';
import { usePlanStore } from '../store/planStore';
import { OneOffDialog } from './OneOffDialog';

interface Props {
  rows: MonthRow[];
}

const anchorMonth = (item: PlanItem): MonthKey =>
  item.recurrence.kind === 'once' ? item.recurrence.month : item.window.from;

export function TimelineGrid({ rows }: Props) {
  const t = useT();
  const locale = useLocale();
  const plan = usePlanStore((s) => s.plan);
  const moveItem = usePlanStore((s) => s.moveItem);
  const [addingMonth, setAddingMonth] = useState<MonthKey | null>(null);

  const money = (n: number) => formatMoney(n, plan.settings.currency, locale);
  const incomes = plan.items.filter((i) => i.direction === 'in');
  const expenses = plan.items.filter((i) => i.direction === 'out');

  const stickyCell = 'sticky start-0 z-10 bg-white ps-3 pe-2 text-start';
  const numCell = 'px-2 py-1 text-end tabular-nums whitespace-nowrap';

  const itemRow = (item: PlanItem) => (
    <tr key={item.id} className="border-t border-slate-100">
      <th scope="row" className={`${stickyCell} py-1 font-normal`}>
        <div className="flex items-center gap-2">
          <span className="truncate">{item.label}</span>
          <input
            type="month"
            aria-label={`${t('moveTo')}: ${item.label}`}
            title={t('moveTo')}
            className="rounded border border-slate-200 px-1 text-xs text-slate-600"
            value={anchorMonth(item)}
            onChange={(e) => { if (e.target.value) moveItem(item.id, e.target.value); }}
          />
        </div>
      </th>
      {rows.map((r) => (
        <td key={r.month} className={`${numCell} ${occursIn(item, r.month) ? '' : 'text-slate-300'}`}>
          {occursIn(item, r.month) ? money(item.amount) : '—'}
        </td>
      ))}
    </tr>
  );

  const summaryRow = (label: string, pick: (r: MonthRow) => number, highlightNegative = false) => (
    <tr className="border-t border-slate-200 font-medium">
      <th scope="row" className={`${stickyCell} py-1`}>{label}</th>
      {rows.map((r) => {
        const v = pick(r);
        return (
          <td key={r.month} className={`${numCell} ${highlightNegative && v < 0 ? 'bg-red-50 text-red-700' : ''}`}>
            {money(v)}
          </td>
        );
      })}
    </tr>
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th scope="col" className={`${stickyCell} bg-slate-50 py-2`}>{t('item')}</th>
              {rows.map((r) => (
                <th key={r.month} scope="col" className="px-2 py-2 text-end font-medium whitespace-nowrap">
                  <span className="me-1">{formatMonth(r.month, locale)}</span>
                  <button
                    type="button"
                    aria-label={t('addOneOff', { month: formatMonth(r.month, locale) })}
                    onClick={() => setAddingMonth(r.month)}
                    className="rounded border border-slate-300 px-1 leading-none text-slate-600 hover:bg-slate-200"
                  >
                    +
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.items.length === 0 && (
              <tr>
                <td colSpan={rows.length + 1} className="px-3 py-6 text-center text-slate-500">{t('noItems')}</td>
              </tr>
            )}
            {incomes.length > 0 && (
              <tr><th scope="rowgroup" colSpan={rows.length + 1} className={`${stickyCell} bg-emerald-50 py-1 text-emerald-800`}>{t('income')}</th></tr>
            )}
            {incomes.map(itemRow)}
            {expenses.length > 0 && (
              <tr><th scope="rowgroup" colSpan={rows.length + 1} className={`${stickyCell} bg-red-50 py-1 text-red-800`}>{t('expenses')}</th></tr>
            )}
            {expenses.map(itemRow)}
          </tbody>
          <tfoot>
            {summaryRow(t('totalIn'), (r) => r.totalIn)}
            {summaryRow(t('totalOut'), (r) => r.totalOut)}
            {summaryRow(t('net'), (r) => r.net)}
            {summaryRow(t('closing'), (r) => r.closing, true)}
          </tfoot>
        </table>
      </div>
      {addingMonth && <OneOffDialog month={addingMonth} onClose={() => setAddingMonth(null)} />}
    </section>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm vitest run src/components/TimelineGrid.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/TimelineGrid.tsx src/components/OneOffDialog.tsx src/components/TimelineGrid.test.tsx
git commit -m "feat(ui): timeline grid with per-month one-off and move controls"
```

---

### Task 11: Toolbar

**Files:**
- Create: `src/components/Toolbar.tsx`
- Test: `src/components/Toolbar.test.tsx`

**Interfaces:**
- Consumes: `usePlanStore` (`plan`, `updateSettings`, `importFromText`, `importError`, `clearImportError`, `storageError`, `clearAll`, `openSetup`); `exportPlan`, `exportFilename` from `../domain/serialize`; `HORIZON_PRESETS`, `MAX_HORIZON`, `CURRENCIES` from `../domain/plan`; `useT`.
- Produces: `<Toolbar />`. Export triggers a Blob download (`URL.createObjectURL` + a temporary `<a download>`); Import reads a `<input type="file" accept=".json,application/json">` via `File.text()`; Clear asks `window.confirm(t('clearConfirm'))`.

- [ ] **Step 1: Write the failing test**

`src/components/Toolbar.test.tsx`:
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toolbar } from './Toolbar';
import { usePlanStore } from '../store/planStore';
import { emptyPlan } from '../domain/plan';

beforeEach(() => {
  localStorage.clear();
  usePlanStore.setState({ plan: emptyPlan(new Date(2026, 0, 1)), setupOpen: false, importError: null, storageError: false });
});

describe('Toolbar', () => {
  it('changes horizon preset and language', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.selectOptions(screen.getByLabelText('Horizon'), '3');
    expect(usePlanStore.getState().plan.settings.horizonMonths).toBe(3);
    await user.click(screen.getByRole('button', { name: 'العربية' }));
    expect(usePlanStore.getState().plan.settings.locale).toBe('ar');
  });

  it('custom horizon shows a number input', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    await user.selectOptions(screen.getByLabelText('Horizon'), 'custom');
    const input = screen.getByRole('spinbutton', { name: 'Horizon' });
    await user.clear(input);
    await user.type(input, '18');
    expect(usePlanStore.getState().plan.settings.horizonMonths).toBe(18);
  });

  it('shows an import error for a bad file', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    const file = new File(['{bad'], 'plan.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText('Import JSON'), file);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('That file is not valid JSON.'));
  });

  it('clears data after confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Toolbar />);
    await user.click(screen.getByRole('button', { name: 'Clear all data' }));
    expect(usePlanStore.getState().setupOpen).toBe(true);
  });

  it('shows the storage warning', () => {
    usePlanStore.setState({ storageError: true });
    render(<Toolbar />);
    expect(screen.getByText(/Could not save on this device/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/components/Toolbar.test.tsx`
Expected: FAIL — cannot resolve `./Toolbar`.

- [ ] **Step 3: Implement `src/components/Toolbar.tsx`**

```tsx
import { useState, type ChangeEvent } from 'react';
import { CURRENCIES, HORIZON_PRESETS, MAX_HORIZON } from '../domain/plan';
import { exportFilename, exportPlan } from '../domain/serialize';
import { useT } from '../i18n';
import { usePlanStore } from '../store/planStore';

const PRESETS: readonly number[] = HORIZON_PRESETS;

export function Toolbar() {
  const t = useT();
  const plan = usePlanStore((s) => s.plan);
  const updateSettings = usePlanStore((s) => s.updateSettings);
  const importFromText = usePlanStore((s) => s.importFromText);
  const importError = usePlanStore((s) => s.importError);
  const clearImportError = usePlanStore((s) => s.clearImportError);
  const storageError = usePlanStore((s) => s.storageError);
  const clearAll = usePlanStore((s) => s.clearAll);
  const openSetup = usePlanStore((s) => s.openSetup);

  const { horizonMonths, locale, currency } = plan.settings;
  const [custom, setCustom] = useState(!PRESETS.includes(horizonMonths));

  const onHorizonSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === 'custom') { setCustom(true); return; }
    setCustom(false);
    updateSettings({ horizonMonths: Number(e.target.value) });
  };

  const onCustomHorizon = (e: ChangeEvent<HTMLInputElement>) => {
    const n = Math.round(Number(e.target.value));
    if (n >= 1 && n <= MAX_HORIZON) updateSettings({ horizonMonths: n });
  };

  const onExport = () => {
    const blob = new Blob([exportPlan(plan)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename();
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importFromText(await file.text());
    e.target.value = '';
  };

  const onClear = () => {
    if (window.confirm(t('clearConfirm'))) clearAll();
  };

  const control = 'rounded border border-slate-300 bg-white px-2 py-1 text-sm';
  const button = 'rounded border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-100';

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 p-3">
        <h1 className="me-auto text-lg font-semibold">{t('appTitle')}</h1>

        <label className="flex items-center gap-1 text-sm">
          <span>{t('horizon')}</span>
          <select className={control} aria-label={t('horizon')} value={custom ? 'custom' : String(horizonMonths)} onChange={onHorizonSelect}>
            {PRESETS.map((n) => <option key={n} value={n}>{t('horizonMonths', { n })}</option>)}
            <option value="custom">{t('horizonCustom')}</option>
          </select>
          {custom && (
            <input
              type="number" min={1} max={MAX_HORIZON} aria-label={t('horizon')}
              className={`${control} w-20`} defaultValue={horizonMonths} onChange={onCustomHorizon}
            />
          )}
        </label>

        <label className="flex items-center gap-1 text-sm">
          <span>{t('currency')}</span>
          <select className={control} value={currency} onChange={(e) => updateSettings({ currency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <button type="button" className={button} onClick={() => updateSettings({ locale: locale === 'ar' ? 'en' : 'ar' })}>
          {t('switchLanguage')}
        </button>
        <button type="button" className={button} onClick={openSetup}>{t('openSetup')}</button>
        <button type="button" className={button} onClick={onExport}>{t('exportJson')}</button>
        <label className={`${button} cursor-pointer`}>
          {t('importJson')}
          <input type="file" accept=".json,application/json" className="sr-only" aria-label={t('importJson')} onChange={onImportFile} onClick={clearImportError} />
        </label>
        <button type="button" className={`${button} text-red-700`} onClick={onClear}>{t('clearAll')}</button>
      </div>

      {importError && (
        <p role="alert" className="mx-auto max-w-7xl px-3 pb-2 text-sm text-red-700">{t(`importError_${importError}`)}</p>
      )}
      {storageError && (
        <p role="status" className="mx-auto max-w-7xl px-3 pb-2 text-sm text-amber-700">{t('storageError')}</p>
      )}
      <p className="mx-auto max-w-7xl px-3 pb-2 text-xs text-slate-500">{t('privacyNote')}</p>
    </header>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/components/Toolbar.test.tsx`
Expected: PASS, 5 tests. If the "custom horizon" test can't find the spinbutton, jsdom gives `<input type="number">` the `spinbutton` role — check the `aria-label` is `t('horizon')` on both the select and the input.

- [ ] **Step 5: Commit**

```bash
git add src/components/Toolbar.tsx src/components/Toolbar.test.tsx
git commit -m "feat(ui): toolbar with horizon, currency, language, export/import, clear"
```

---

### Task 12: ItemForm

**Files:**
- Create: `src/components/ItemForm.tsx`
- Test: `src/components/ItemForm.test.tsx`

**Interfaces:**
- Consumes: `PlanItem`, `Direction`, `Recurrence`, `newId` from `../domain/plan`; `MonthKey`, `toIndex` from `../domain/month`; `useT`, `useLocale`; `monthName`.
- Produces: `<ItemForm direction={Direction} initial?={PlanItem} defaultMonth={MonthKey} onSave={(item: PlanItem) => void} onCancel={() => void} />`. Validation per spec §5.1: label non-empty, amount > 0, `n ≥ 2`, ≥1 month for `specificMonths`, `to ≥ from` when set. On save, `once` items get `window = { from: month }`.

- [ ] **Step 1: Write the failing test**

`src/components/ItemForm.test.tsx`:
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemForm } from './ItemForm';
import { usePlanStore } from '../store/planStore';
import { emptyPlan } from '../domain/plan';

beforeEach(() => {
  usePlanStore.setState({ plan: emptyPlan(new Date(2026, 0, 1)), setupOpen: true });
});

describe('ItemForm', () => {
  it('saves a monthly item with defaults', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ItemForm direction="in" defaultMonth="2026-01" onSave={onSave} onCancel={() => {}} />);
    await user.type(screen.getByLabelText('Label'), 'Salary');
    await user.type(screen.getByLabelText('Amount'), '9000');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      label: 'Salary', amount: 9000, direction: 'in',
      recurrence: { kind: 'monthly' }, window: { from: '2026-01', to: undefined },
    }));
    expect(onSave.mock.calls[0][0].id).toBeTruthy();
  });

  it('validates label and amount', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ItemForm direction="out" defaultMonth="2026-01" onSave={onSave} onCancel={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a label.');
    await user.type(screen.getByLabelText('Label'), 'Rent');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an amount greater than zero.');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves a once item anchored at its month', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ItemForm direction="in" defaultMonth="2026-01" onSave={onSave} onCancel={() => {}} />);
    await user.type(screen.getByLabelText('Label'), 'Bonus');
    await user.type(screen.getByLabelText('Amount'), '500');
    await user.selectOptions(screen.getByLabelText('Repeats'), 'once');
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-04' } });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      recurrence: { kind: 'once', month: '2026-04' }, window: { from: '2026-04', to: undefined },
    }));
  });

  it('requires n >= 2 and at least one specific month, and to >= from', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ItemForm direction="out" defaultMonth="2026-03" onSave={onSave} onCancel={() => {}} />);
    await user.type(screen.getByLabelText('Label'), 'Insurance');
    await user.type(screen.getByLabelText('Amount'), '300');

    await user.selectOptions(screen.getByLabelText('Repeats'), 'everyN');
    const n = screen.getByLabelText('Every how many months');
    await user.clear(n);
    await user.type(n, '1');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a number of months of 2 or more.');

    await user.selectOptions(screen.getByLabelText('Repeats'), 'specificMonths');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Pick at least one month.');
    await user.click(screen.getByRole('checkbox', { name: 'Sep' }));

    fireEvent.change(screen.getByLabelText('Until (optional)'), { target: { value: '2026-01' } });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('"Until" must not be before "From".');

    fireEvent.change(screen.getByLabelText('Until (optional)'), { target: { value: '2027-12' } });
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      recurrence: { kind: 'specificMonths', months: [9] }, window: { from: '2026-03', to: '2027-12' },
    }));
  });

  it('edits an existing item keeping its id', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ItemForm direction="out" defaultMonth="2026-01" onSave={onSave} onCancel={() => {}} initial={{
      id: 'keep', label: 'Rent', direction: 'out', amount: 3000, recurrence: { kind: 'monthly' }, window: { from: '2026-01' },
    }} />);
    const amount = screen.getByLabelText('Amount');
    await user.clear(amount);
    await user.type(amount, '2500');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'keep', amount: 2500 }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/components/ItemForm.test.tsx`
Expected: FAIL — cannot resolve `./ItemForm`.

- [ ] **Step 3: Implement `src/components/ItemForm.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { toIndex, type MonthKey } from '../domain/month';
import { newId, type Direction, type PlanItem, type Recurrence } from '../domain/plan';
import { useLocale, useT, type MessageKey } from '../i18n';
import { monthName } from '../i18n/format';

type Kind = Recurrence['kind'];
const KINDS: Kind[] = ['monthly', 'once', 'everyN', 'specificMonths'];
const KIND_LABEL: Record<Kind, MessageKey> = {
  monthly: 'recurrenceMonthly', once: 'recurrenceOnce', everyN: 'recurrenceEveryN', specificMonths: 'recurrenceSpecificMonths',
};

interface Props {
  direction: Direction;
  initial?: PlanItem;
  defaultMonth: MonthKey;
  onSave: (item: PlanItem) => void;
  onCancel: () => void;
}

export function ItemForm({ direction, initial, defaultMonth, onSave, onCancel }: Props) {
  const t = useT();
  const locale = useLocale();
  const r = initial?.recurrence;

  const [label, setLabel] = useState(initial?.label ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [kind, setKind] = useState<Kind>(r?.kind ?? 'monthly');
  const [month, setMonth] = useState<MonthKey>(r?.kind === 'once' ? r.month : defaultMonth);
  const [n, setN] = useState(r?.kind === 'everyN' ? String(r.n) : '3');
  const [months, setMonths] = useState<number[]>(r?.kind === 'specificMonths' ? r.months : []);
  const [from, setFrom] = useState<MonthKey>(initial?.window.from ?? defaultMonth);
  const [to, setTo] = useState<MonthKey | ''>(initial?.window.to ?? '');
  const [error, setError] = useState<MessageKey | null>(null);

  const toggleMonth = (m: number) =>
    setMonths((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const amountNum = Number(amount);
    const nNum = Number(n);
    if (label.trim() === '') return setError('errLabel');
    if (!Number.isFinite(amountNum) || amountNum <= 0) return setError('errAmount');
    if (kind === 'everyN' && (!Number.isInteger(nNum) || nNum < 2)) return setError('errN');
    if (kind === 'specificMonths' && months.length === 0) return setError('errMonths');
    if (kind !== 'once' && to !== '' && toIndex(to) < toIndex(from)) return setError('errWindow');

    const recurrence: Recurrence =
      kind === 'monthly' ? { kind } :
      kind === 'once' ? { kind, month } :
      kind === 'everyN' ? { kind, n: nNum } :
      { kind, months };

    onSave({
      id: initial?.id ?? newId(),
      label: label.trim(),
      note: note.trim() === '' ? undefined : note.trim(),
      direction,
      amount: amountNum,
      recurrence,
      window: kind === 'once' ? { from: month, to: undefined } : { from, to: to === '' ? undefined : to },
    });
  };

  const field = 'w-full rounded border border-slate-300 px-2 py-1';
  const labelCls = 'block text-sm';

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <label className={labelCls}>
        <span className="mb-1 block">{t('label')}</span>
        <input className={field} value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
      </label>
      <label className={labelCls}>
        <span className="mb-1 block">{t('amount')}</span>
        <input className={field} type="number" inputMode="decimal" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <label className={labelCls}>
        <span className="mb-1 block">{t('recurrence')}</span>
        <select className={field} value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          {KINDS.map((k) => <option key={k} value={k}>{t(KIND_LABEL[k])}</option>)}
        </select>
      </label>

      {kind === 'once' && (
        <label className={labelCls}>
          <span className="mb-1 block">{t('month')}</span>
          <input className={field} type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
      )}
      {kind === 'everyN' && (
        <label className={labelCls}>
          <span className="mb-1 block">{t('everyN')}</span>
          <input className={field} type="number" min={2} step={1} value={n} onChange={(e) => setN(e.target.value)} />
        </label>
      )}
      {kind === 'specificMonths' && (
        <fieldset className="text-sm">
          <legend className="mb-1">{t('monthsOfYear')}</legend>
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <label key={m} className="flex items-center gap-1">
                <input type="checkbox" checked={months.includes(m)} onChange={() => toggleMonth(m)} />
                <span>{monthName(m, locale)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {kind !== 'once' && (
        <div className="grid grid-cols-2 gap-2">
          <label className={labelCls}>
            <span className="mb-1 block">{t('from')}</span>
            <input className={field} type="month" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          </label>
          <label className={labelCls}>
            <span className="mb-1 block">{t('to')}</span>
            <input className={field} type="month" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      )}
      <label className={labelCls}>
        <span className="mb-1 block">{t('note')}</span>
        <input className={field} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      {error && <p role="alert" className="text-sm text-red-700">{t(error)}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded px-3 py-1 text-slate-700 hover:bg-slate-200">{t('cancel')}</button>
        <button type="submit" className="rounded bg-slate-900 px-3 py-1 text-white hover:bg-slate-700">{t('save')}</button>
      </div>
    </form>
  );
}
```

Note: the `specificMonths` checkbox test clicks `{ name: 'Sep' }` — the accessible name comes from the `<span>` inside the `<label>`; `monthName(9, 'en')` is `'Sep'`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/components/ItemForm.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/ItemForm.tsx src/components/ItemForm.test.tsx
git commit -m "feat(ui): ItemForm with recurrence kinds and validation"
```

---

### Task 13: SetupDialog

**Files:**
- Create: `src/components/SetupDialog.tsx`
- Test: `src/components/SetupDialog.test.tsx`

**Interfaces:**
- Consumes: `usePlanStore` (`plan`, `savePlan`, `closeSetup`); `Plan`, `PlanItem`, `PlanSettings`, `HORIZON_PRESETS`, `MAX_HORIZON`, `CURRENCIES` from `../domain/plan`; `ItemForm`; `useT`, `useLocale`; `formatMoney`, `formatMonth`.
- Produces: `<SetupDialog />`. Works on a **local draft** copy of the store's plan; rule add/edit/delete mutate the draft; **Save** calls `savePlan(draft)` (which also closes). **Cancel** calls `closeSetup()` and is only shown when the stored plan already has items (first run cannot be dismissed with nothing to show). Basics section edits `draft.settings` — the language switch there updates the *store* immediately (`updateSettings({ locale })`) so the dialog re-renders in the chosen language.

- [ ] **Step 1: Write the failing test**

`src/components/SetupDialog.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetupDialog } from './SetupDialog';
import { usePlanStore } from '../store/planStore';
import { emptyPlan, type Plan } from '../domain/plan';

const seeded: Plan = {
  ...emptyPlan(new Date(2026, 0, 1)),
  items: [{ id: 'r', label: 'Rent', direction: 'out', amount: 3000, recurrence: { kind: 'monthly' }, window: { from: '2026-01' } }],
};

beforeEach(() => {
  localStorage.clear();
  usePlanStore.setState({ plan: emptyPlan(new Date(2026, 0, 1)), setupOpen: true, importError: null, storageError: false });
});

describe('SetupDialog', () => {
  it('first run: no cancel button, saves basics and a new income item', async () => {
    const user = userEvent.setup();
    render(<SetupDialog />);
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();

    const balance = screen.getByLabelText('Starting balance');
    await user.clear(balance);
    await user.type(balance, '2500');
    fireEvent.change(screen.getByLabelText('Start month'), { target: { value: '2026-03' } });

    await user.click(screen.getByRole('button', { name: 'Add income' }));
    await user.type(screen.getByLabelText('Label'), 'Salary');
    await user.type(screen.getByLabelText('Amount'), '9000');
    await user.click(screen.getByRole('button', { name: 'Save' })); // item form save

    await user.click(screen.getByRole('button', { name: 'Save plan' }));

    const { plan, setupOpen } = usePlanStore.getState();
    expect(setupOpen).toBe(false);
    expect(plan.settings).toMatchObject({ startingBalance: 2500, startMonth: '2026-03' });
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]).toMatchObject({ label: 'Salary', amount: 9000, direction: 'in', window: { from: '2026-03' } });
  });

  it('edits and deletes existing rules in the draft, only persisting on save', async () => {
    const user = userEvent.setup();
    usePlanStore.setState({ plan: seeded });
    render(<SetupDialog />);

    const rentRow = screen.getByText('Rent').closest('li')!;
    await user.click(within(rentRow).getByRole('button', { name: 'Edit' }));
    const amount = screen.getByLabelText('Amount');
    await user.clear(amount);
    await user.type(amount, '2500');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(usePlanStore.getState().plan.items[0].amount).toBe(3000); // not yet persisted

    await user.click(screen.getByRole('button', { name: 'Save plan' }));
    expect(usePlanStore.getState().plan.items[0].amount).toBe(2500);
  });

  it('delete removes the rule; cancel discards draft changes', async () => {
    const user = userEvent.setup();
    usePlanStore.setState({ plan: seeded });
    render(<SetupDialog />);
    const rentRow = screen.getByText('Rent').closest('li')!;
    await user.click(within(rentRow).getByRole('button', { name: 'Delete' }));
    expect(screen.queryByText('Rent')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(usePlanStore.getState().plan.items).toHaveLength(1);
    expect(usePlanStore.getState().setupOpen).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/components/SetupDialog.test.tsx`
Expected: FAIL — cannot resolve `./SetupDialog`.

- [ ] **Step 3: Implement `src/components/SetupDialog.tsx`**

```tsx
import { useState } from 'react';
import { CURRENCIES, HORIZON_PRESETS, MAX_HORIZON, type Direction, type Locale, type Plan, type PlanItem } from '../domain/plan';
import { useLocale, useT, type MessageKey } from '../i18n';
import { formatMoney, formatMonth } from '../i18n/format';
import { usePlanStore } from '../store/planStore';
import { ItemForm } from './ItemForm';

type Editing = { direction: Direction; item?: PlanItem } | null;

const RECURRENCE_KEY: Record<PlanItem['recurrence']['kind'], MessageKey> = {
  monthly: 'recurrenceMonthly', once: 'recurrenceOnce', everyN: 'recurrenceEveryN', specificMonths: 'recurrenceSpecificMonths',
};

export function SetupDialog() {
  const t = useT();
  const locale = useLocale();
  const stored = usePlanStore((s) => s.plan);
  const savePlan = usePlanStore((s) => s.savePlan);
  const closeSetup = usePlanStore((s) => s.closeSetup);
  const updateSettings = usePlanStore((s) => s.updateSettings);

  const [draft, setDraft] = useState<Plan>(stored);
  const [editing, setEditing] = useState<Editing>(null);
  const canCancel = stored.items.length > 0;

  const setSettings = (patch: Partial<Plan['settings']>) =>
    setDraft((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  const upsertItem = (item: PlanItem) => {
    setDraft((d) => ({
      ...d,
      items: d.items.some((i) => i.id === item.id) ? d.items.map((i) => (i.id === item.id ? item : i)) : [...d.items, item],
    }));
    setEditing(null);
  };

  const deleteItem = (id: string) => setDraft((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));

  const switchLocale = (next: Locale) => {
    setSettings({ locale: next });
    updateSettings({ locale: next });
  };

  const field = 'w-full rounded border border-slate-300 px-2 py-1';
  const button = 'rounded border border-slate-300 bg-white px-2 py-1 text-sm hover:bg-slate-100';
  const { settings } = draft;

  const list = (direction: Direction, title: MessageKey, addKey: MessageKey) => {
    const items = draft.items.filter((i) => i.direction === direction);
    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{t(title)}</h3>
          <button type="button" className={button} onClick={() => setEditing({ direction })}>{t(addKey)}</button>
        </div>
        <ul className="divide-y divide-slate-200 rounded border border-slate-200">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="me-auto">
                <span className="font-medium">{item.label}</span>
                <span className="ms-2 text-slate-500">
                  {formatMoney(item.amount, settings.currency, locale)} · {t(RECURRENCE_KEY[item.recurrence.kind])} · {formatMonth(item.window.from, locale)}
                  {item.window.to ? ` → ${formatMonth(item.window.to, locale)}` : ''}
                </span>
              </span>
              <button type="button" className={button} onClick={() => setEditing({ direction, item })}>{t('edit')}</button>
              <button type="button" className={`${button} text-red-700`} onClick={() => deleteItem(item.id)}>{t('delete')}</button>
            </li>
          ))}
        </ul>
        {editing?.direction === direction && (
          <ItemForm
            direction={direction}
            initial={editing.item}
            defaultMonth={settings.startMonth}
            onSave={upsertItem}
            onCancel={() => setEditing(null)}
          />
        )}
      </section>
    );
  };

  return (
    <div className="fixed inset-0 z-10 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="setup-title" className="w-full max-w-2xl space-y-6 rounded-lg bg-white p-5 shadow-xl">
        <h2 id="setup-title" className="text-xl font-semibold">{t('setupTitle')}</h2>

        <section className="space-y-3">
          <h3 className="font-medium">{t('basics')}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="block">
              <span className="mb-1 block">{t('startingBalance')}</span>
              <input className={field} type="number" step="any" value={settings.startingBalance}
                onChange={(e) => setSettings({ startingBalance: Number(e.target.value) || 0 })} />
            </label>
            <label className="block">
              <span className="mb-1 block">{t('startMonth')}</span>
              <input className={field} type="month" value={settings.startMonth}
                onChange={(e) => e.target.value && setSettings({ startMonth: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block">{t('horizon')}</span>
              <input className={field} type="number" min={1} max={MAX_HORIZON} list="horizon-presets" value={settings.horizonMonths}
                onChange={(e) => { const n = Math.round(Number(e.target.value)); if (n >= 1 && n <= MAX_HORIZON) setSettings({ horizonMonths: n }); }} />
              <datalist id="horizon-presets">{HORIZON_PRESETS.map((n) => <option key={n} value={n} />)}</datalist>
            </label>
            <label className="block">
              <span className="mb-1 block">{t('currency')}</span>
              <select className={field} value={settings.currency} onChange={(e) => setSettings({ currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block">{t('language')}</span>
              <select className={field} value={settings.locale} onChange={(e) => switchLocale(e.target.value as Locale)}>
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </label>
          </div>
        </section>

        {list('in', 'income', 'addIncome')}
        {list('out', 'expenses', 'addExpense')}

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          {canCancel && (
            <button type="button" className={button} onClick={closeSetup}>{t('cancel')}</button>
          )}
          <button type="button" className="rounded bg-slate-900 px-4 py-1.5 text-white hover:bg-slate-700" onClick={() => savePlan(draft)}>
            {t('savePlan')}
          </button>
        </div>
        <p className="text-xs text-slate-500">{t('privacyNote')}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/components/SetupDialog.test.tsx`
Expected: PASS, 3 tests. `getByRole('button', { name: 'Save' })` matches exactly, so the ItemForm's `Save` and the dialog's `Save plan` never collide.

- [ ] **Step 5: Commit**

```bash
git add src/components/SetupDialog.tsx src/components/SetupDialog.test.tsx
git commit -m "feat(ui): SetupDialog with draft editing of basics and rules"
```

---

### Task 14: App composition, README, final verification

**Files:**
- Modify: `src/App.tsx` (replace the Task 1 placeholder)
- Create: `src/App.test.tsx`, `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the running app. `App` reads the store, applies the locale to `<html>` in an effect, memoizes `expand`/`summarize`, and renders `Toolbar` → `SummaryStrip` → `BalanceChart` → `TimelineGrid`, plus `SetupDialog` when `setupOpen`.

- [ ] **Step 1: Write the failing test**

`src/App.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { usePlanStore } from './store/planStore';
import { emptyPlan, type Plan } from './domain/plan';

beforeEach(() => {
  localStorage.clear();
});

describe('App', () => {
  it('opens the setup dialog on first run', () => {
    usePlanStore.setState({ plan: emptyPlan(new Date(2026, 0, 1)), setupOpen: true });
    render(<App />);
    expect(screen.getByRole('dialog', { name: 'Plan setup' })).toBeInTheDocument();
  });

  it('renders the timeline with a saved plan and applies dir to <html>', () => {
    const plan: Plan = {
      ...emptyPlan(new Date(2026, 0, 1)),
      settings: { ...emptyPlan().settings, startMonth: '2026-01', horizonMonths: 3, startingBalance: 0, locale: 'ar' },
      items: [{ id: 's', label: 'راتب', direction: 'in', amount: 100, recurrence: { kind: 'monthly' }, window: { from: '2026-01' } }],
    };
    usePlanStore.setState({ plan, setupOpen: false });
    render(<App />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('راتب')).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('rtl');
    expect(screen.getByRole('status')).toHaveTextContent('3');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/App.test.tsx`
Expected: FAIL — the placeholder `App` has no dialog.

- [ ] **Step 3: Implement `src/App.tsx`**

```tsx
import { useEffect, useMemo } from 'react';
import { BalanceChart } from './components/BalanceChart';
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Toolbar />
      <main className="mx-auto max-w-7xl space-y-4 p-4">
        <SummaryStrip summary={summary} monthCount={rows.length} />
        <BalanceChart rows={rows} />
        <TimelineGrid rows={rows} />
      </main>
      {setupOpen && <SetupDialog />}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/App.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Write `README.md`**

```markdown
# Cashflow Timeline

A frontend-only personal cashflow planner. Enter your income and expenses (one-off, monthly, every N months, or specific months of the year), and see a month-by-month running balance — when you go negative, how deep, and when you recover. Adjust until every month is positive.

**Privacy:** there is no backend. Nothing is sent anywhere. Your plan is saved only in your browser's `localStorage`, and you can export it as JSON (and import it back) or wipe it with *Clear all data*.

Arabic and English, with full RTL.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # Vitest
pnpm build      # static site in dist/
```

## How it works

- `src/domain/` — the model. `plan.ts` (types + zod schema), `engine.ts` (`expand` computes every month from the rules; `summarize` finds first negative / lowest / recovery), `serialize.ts` (JSON export/import behind schema validation).
- `src/store/planStore.ts` — one Zustand store; mirrors the plan to `localStorage` on every change.
- `src/components/` — Toolbar, SetupDialog (owns rule create/edit/delete), TimelineGrid (per-month "+" one-offs and "move"), BalanceChart (SVG), SummaryStrip.

Design spec: `docs/superpowers/specs/2026-09-07-cashflow-timeline-design.md`.
```

- [ ] **Step 6: Full verification**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: no type errors; all suites pass (smoke 1, month 7, plan 7, engine 14, serialize 6, store 17, i18n 7, SummaryStrip 3, BalanceChart 3, TimelineGrid 4, Toolbar 5, ItemForm 5, SetupDialog 3, App 2); `dist/` produced.

- [ ] **Step 7: Manual smoke in the browser**

Run: `pnpm dev` and open `http://localhost:5173`. Check each, in order:
1. Setup dialog opens on first load; no Cancel button.
2. Set starting balance 2000, add income "Salary" 9000 monthly, add expense "Rent" 4000 monthly, add expense "Car insurance" 6000 once in month 3. Save plan.
3. Summary strip shows a negative month; the chart shades red under zero; the closing row is red in that month.
4. Change "Car insurance" via its month input to month 5 → summary updates.
5. Click "+" on month 2, add income "Bonus" 5000 → month 3 goes positive; strip says all months positive.
6. Toggle to العربية: page flips RTL, months run right-to-left in both chart and grid, digits stay Latin, months are Gregorian.
7. Export JSON → file downloads. Clear all data → setup reopens. Import the file → plan is back, dialog closed.
8. Import a random `.txt` renamed to `.json` → red error line under the toolbar, plan unchanged.
9. Refresh the page → plan persists.

- [ ] **Step 8: Commit and push**

```bash
git add src/App.tsx src/App.test.tsx README.md
git commit -m "feat: compose the app, add README"
git push -u origin HEAD
```

Then open (or update) the PR against `main` and paste the smoke-check results in its description.

---

## Self-review notes

- **Spec coverage:** §2 decisions → Global Constraints; §3 layout → File Structure; §4 model/engine/edits → Tasks 3, 4, 6; §5.1 setup → Tasks 12–13; §5.2 timeline → Tasks 8–10; §5.3 toolbar → Task 11; §6 persistence/trust boundary → Tasks 5–6; §7 i18n/RTL → Task 7 (+ RTL axis in Task 9, sticky `start-0` in Task 10); §8 error handling → NaN guard (Task 4), horizon clamp (Tasks 3, 11, 13), inline import error and storage notice (Task 11); §9 testing → every task; §11 open decisions → resolved in Global Constraints.
- **Type consistency:** `Direction`, `Locale`, `MonthKey`, `PlanItem`, `Plan`, `MonthRow`, `Summary`, `ImportErrorCode`, `MessageKey` are defined once and imported by name everywhere they are used. Store action names (`savePlan`, `updateSettings`, `addOneOff`, `moveItem`, `importFromText`, `clearAll`, `openSetup`, `closeSetup`, `clearImportError`) match between Task 6 and Tasks 8–14.
- **Placeholder scan:** no TBD/TODO; every code step carries its full content; every dictionary key used by a component (`savePlan` included) is defined in Task 7.
