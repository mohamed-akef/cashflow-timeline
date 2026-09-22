# Cashflow Timeline

**Plan your money month by month, 6 or 12 months ahead.** Live at <https://mohamed-akef.github.io/cashflow-timeline/>.

A free personal cashflow planner and financial timeline. Enter your income and expenses as rules (one-off, monthly, every N months, or specific months of the year), set a starting balance, and see a month-by-month running balance for the months ahead: your lowest point, when you would go negative, how deep, and when you recover. Adjust until every month is positive.

It answers a different question from a budgeting app or a bank balance. Those tell you what you have now; this shows where you will be in March.

**Privacy:** there is no backend. Nothing is sent anywhere. Your plan is saved only in your browser's `localStorage`. *Save a copy* downloads it as JSON, *Open a copy* loads one back, and *Delete this plan* in Setup wipes it.

Arabic and English, with full RTL. Light and dark themes.

## What you get

- A summary strip: lowest balance and when, first negative month and when you are back above zero, ending balance with the change from your start, average per month, total money in and out.
- A chart with three views: closing balance, income against expenses, and net change per month.
- A month-by-month grid with opening, totals, net and closing per month, and every item in its own row.
- Per-month exceptions straight from the grid: click a cell to change that month's amount, skip the item that month, or add it to a month the rule does not cover. Click "+" in a month to add a one-off there.
- A Setup dialog for the starting balance, start month, and the income and expense rules, with each list showing what it adds up to over the plan.
- Duration of 3, 6 or 12 months, or a custom length up to 60. Amounts group their thousands as you type.
- Works on a phone, and installs to the home screen from the browser menu (Add to Home Screen on iOS, Install app on Android). Once opened, it keeps working offline.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:5173/cashflow-timeline/
pnpm test       # Vitest
pnpm build      # static site in dist/
```

## Deploy

The app is published on GitHub Pages at <https://mohamed-akef.github.io/cashflow-timeline/>.

Every push to `main` runs `.github/workflows/deploy.yml`: typecheck, tests and
build, then the `dist/` artifact goes straight to Pages. Nothing to run by hand,
and a red suite blocks the publish. Pull requests run the same checks without
deploying.

## How it works

- `src/domain/` — the model. `plan.ts` (types + zod schema, including per-month `overrides` on each item), `engine.ts` (`expand` computes every month from the rules; `summarize` finds first negative / lowest / recovery plus ending balance, average and the horizon totals), `serialize.ts` (JSON export/import behind schema validation).
- `src/store/planStore.ts` — one Zustand store; mirrors the plan to `localStorage` on every change.
- `src/i18n/` — English and Arabic messages (the Arabic file is type-checked against the English keys) and the money, month and amount-input formatters.
- `src/components/` — `AppBar` (wordmark, `Toolbar` with duration, currency, Setup, Save a copy / Open a copy, language and theme), `SummaryStrip`, `Charts` (SVG, three views), `TimelineGrid` with `CellDialog` (per-month overrides) and `OneOffDialog`, `SetupDialog` with `ItemForm` (rule create/edit/delete, plan totals, Delete this plan), `AmountInput` (thousands grouping while typing).

Design spec: `docs/superpowers/specs/2026-09-07-cashflow-timeline-design.md`.

## License

[GPL-3.0-or-later](LICENSE).
