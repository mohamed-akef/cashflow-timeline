import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPlanStore, loadStoredPlan, persistPlan, STORAGE_KEY, usePlanStore } from './planStore';
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
    store.getState().updateSettings({ horizonMonths: 3, currency: 'USD' });
    expect(store.getState().plan.settings).toMatchObject({ horizonMonths: 3, currency: 'USD' });
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

  it('setOverride records an amount, a removal, and a reset', () => {
    const store = createPlanStore(storage);
    store.getState().savePlan(plan);
    store.getState().setOverride('s', '2026-03', 12000);
    store.getState().setOverride('s', '2026-04', null);
    expect(store.getState().plan.items[0].overrides).toEqual({ '2026-03': 12000, '2026-04': null });
    store.getState().setOverride('s', '2026-03', undefined);
    expect(store.getState().plan.items[0].overrides).toEqual({ '2026-04': null });
    store.getState().setOverride('s', '2026-04', undefined);
    expect(store.getState().plan).toEqual(plan);
  });

  it('setOverride ignores unknown ids and bad amounts', () => {
    const store = createPlanStore(storage);
    store.getState().savePlan(plan);
    store.getState().setOverride('nope', '2026-03', 1);
    store.getState().setOverride('s', '2026-03', 0);
    store.getState().setOverride('s', '2026-03', -5);
    store.getState().setOverride('s', '2026-03', Number.NaN);
    expect(store.getState().plan).toEqual(plan);
  });

  it('savePlan refuses a plan that fails the schema', () => {
    const store = createPlanStore(storage);
    store.getState().savePlan(plan);
    const bad = { ...plan, settings: { ...plan.settings, startMonth: 'March' } };
    store.getState().savePlan(bad as Plan);
    expect(store.getState().plan).toEqual(plan);
  });

  it('setOverride and addOneOff ignore non-MonthKey input', () => {
    const store = createPlanStore(storage);
    store.getState().savePlan(plan);
    store.getState().setOverride('s', 'March' as never, null);
    store.getState().addOneOff({ label: 'X', amount: 1, direction: 'out', month: '2026-1' });
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

  it('clearAll reports a failed removeItem via storageError', () => {
    const broken: Storage = { ...storage, removeItem: () => { throw new Error('denied'); } };
    const store = createPlanStore(broken);
    store.getState().clearAll();
    expect(store.getState().storageError).toBe(true);
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

  it('usePlanStore singleton is bound to jsdom localStorage', () => {
    localStorage.clear();
    usePlanStore.getState().savePlan(plan);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    localStorage.clear();
  });
});
