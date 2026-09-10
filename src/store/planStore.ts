import { create } from 'zustand';
import { isMonthKey, type MonthKey } from '../domain/month';
import { emptyPlan, newId, planSchema, type Direction, type Plan, type PlanItem, type PlanSettings } from '../domain/plan';
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
  /**
   * Set how `id` behaves in `month`: an amount, `null` to remove it from that
   * month, or `undefined` to follow the rule again.
   */
  setOverride(id: string, month: MonthKey, value: number | null | undefined): void;
  importFromText(text: string): boolean;
  clearAll(): void;
  openSetup(): void;
  closeSetup(): void;
  clearImportError(): void;
}

function withOverride(item: PlanItem, month: MonthKey, value: number | null | undefined): PlanItem {
  const overrides = { ...item.overrides };
  if (value === undefined) delete overrides[month];
  else overrides[month] = value;
  const next: PlanItem = { ...item, overrides };
  if (Object.keys(overrides).length === 0) delete next.overrides;
  return next;
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

      savePlan: (plan) => {
        if (!planSchema.safeParse(plan).success) return;
        commit(plan, { setupOpen: false });
      },

      updateSettings: (patch) => {
        const { plan } = get();
        commit({ ...plan, settings: { ...plan.settings, ...patch } });
      },

      addOneOff: ({ label, amount, direction, month }) => {
        if (!isMonthKey(month)) return;
        const { plan } = get();
        const item: PlanItem = {
          id: newId(), label, amount, direction,
          recurrence: { kind: 'once', month }, window: { from: month },
        };
        commit({ ...plan, items: [...plan.items, item] });
      },

      setOverride: (id, month, value) => {
        if (!isMonthKey(month)) return;
        if (typeof value === 'number' && !(Number.isFinite(value) && value > 0)) return;
        const { plan } = get();
        if (!plan.items.some((i) => i.id === id)) return;
        commit({ ...plan, items: plan.items.map((i) => (i.id === id ? withOverride(i, month, value) : i)) });
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
        let storageError = false;
        try { storage?.removeItem(STORAGE_KEY); } catch { storageError = true; }
        set({ plan: emptyPlan(), setupOpen: true, storageError, importError: null });
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
