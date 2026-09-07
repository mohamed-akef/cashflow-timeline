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
