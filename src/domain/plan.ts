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
  currency: z.string().regex(/^[A-Za-z]{3}$/),
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
