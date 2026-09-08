# Cashflow Timeline

A frontend-only personal cashflow planner. Enter your income and expenses (one-off, monthly, every N months, or specific months of the year), and see a month-by-month running balance — when you go negative, how deep, and when you recover. Adjust until every month is positive.

**Privacy:** there is no backend. Nothing is sent anywhere. Your plan is saved only in your browser's `localStorage`, and you can export it as JSON (and import it back) or wipe it with *Clear all data*.

Arabic and English, with full RTL.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:5173/cashflow-timeline/
pnpm test       # Vitest
pnpm build      # static site in dist/
```

## Deploy

The app is published on GitHub Pages at <https://mohamed-akef.github.io/cashflow-timeline/>.

```bash
pnpm deploy:pages   # builds and pushes dist/ to the gh-pages branch
```

## How it works

- `src/domain/` — the model. `plan.ts` (types + zod schema), `engine.ts` (`expand` computes every month from the rules; `summarize` finds first negative / lowest / recovery), `serialize.ts` (JSON export/import behind schema validation).
- `src/store/planStore.ts` — one Zustand store; mirrors the plan to `localStorage` on every change.
- `src/components/` — Toolbar, SetupDialog (owns rule create/edit/delete), TimelineGrid (per-month "+" one-offs and "move"), BalanceChart (SVG), SummaryStrip.

Design spec: `docs/superpowers/specs/2026-09-07-cashflow-timeline-design.md`.
