import { z } from "zod";

/**
 * GET /api/fatigue — Banister-style accumulated fatigue series.
 * Source of truth: `apps/web/src/app/api/fatigue/route.ts` (GET).
 *
 * Returns a 28-day timeline of `{ date, fatigue, recovery }` plus the current
 * day's `{ fatigue, recoveryDays }`. Used by the `/progress` page chart.
 *
 * `date` is a short locale-formatted month/day string (e.g. "4/23"), NOT an
 * ISO date — the route formats it server-side via `Date.toLocaleDateString`.
 * The Recharts X-axis treats it as a label.
 */

export const FatiguePointSchema = z.object({
  date: z.string(),
  fatigue: z.number(),
  recovery: z.number(),
});
export type FatiguePoint = z.infer<typeof FatiguePointSchema>;

export const FatigueCurrentSchema = z.object({
  fatigue: z.number(),
  recoveryDays: z.number(),
});
export type FatigueCurrent = z.infer<typeof FatigueCurrentSchema>;

export const FatigueResponseSchema = z.object({
  timeline: z.array(FatiguePointSchema),
  current: FatigueCurrentSchema,
});
export type FatigueResponse = z.infer<typeof FatigueResponseSchema>;
