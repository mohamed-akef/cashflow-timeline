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
