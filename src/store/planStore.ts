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
