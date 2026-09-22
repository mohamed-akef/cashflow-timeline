# Cashflow Timeline

**Plan your money month by month, 6 or 12 months ahead.** Live at <https://mohamed-akef.github.io/cashflow-timeline/>.

A free personal cashflow planner and financial timeline. Enter your income and expenses as rules (one-off, monthly, every N months, or specific months of the year), set a starting balance, and see a month-by-month running balance for the months ahead: your lowest point, when you would go negative, how deep, and when you recover. Adjust until every month is positive.

It answers a different question from a budgeting app or a bank balance. Those tell you what you have now; this shows where you will be in March.

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

Every push to `main` runs `.github/workflows/deploy.yml`: typecheck, tests and
build, then the `dist/` artifact goes straight to Pages. Nothing to run by hand,
and a red suite blocks the publish.

## How it works

- `src/domain/` — the model. `plan.ts` (types + zod schema), `engine.ts` (`expand` computes every month from the rules; `summarize` finds first negative / lowest / recovery plus the horizon totals), `serialize.ts` (JSON export/import behind schema validation).
- `src/store/planStore.ts` — one Zustand store; mirrors the plan to `localStorage` on every change.
- `src/components/` — Toolbar, SetupDialog (owns rule create/edit/delete), TimelineGrid (per-month "+" one-offs and "move"), BalanceChart (SVG), SummaryStrip.

Design spec: `docs/superpowers/specs/2026-09-07-cashflow-timeline-design.md`.

## License

[GPL-3.0-or-later](LICENSE).
