import { z } from "zod";
import { IsoDateString } from "./common";

/**
 * GET /api/biometric — the dashboard's primary readiness/biometric feed.
 * Source of truth: `apps/web/src/app/api/biometric/route.ts` (GET).
 *
 * Returns trailing 30 days of biometric entries plus a derived `readiness`
 * computed from the latest entry. There is no separate `/api/dashboard`
 * route in the codebase yet; this endpoint is what the dashboard reads.
 *
 * SwiftMirror: `IronProtocolWatch/Models/Biometric.swift`
 */
export const BiometricEntrySchema = z.object({
  id: z.string(),
  athleteId: z.string(),
  date: IsoDateString,
  source: z.string(), // MANUAL | APPLE_HEALTH | OURA | WHOOP
  hrvMs: z.number().nullable(),
  sleepHours: z.number().nullable(),
  sleepQuality: z.number().int().nullable(),
  mood: z.number().int().nullable(),
  soreness: z.number().int().nullable(),
  energy: z.number().int().nullable(),
  stress: z.number().int().nullable(),
  notes: z.string().nullable(),
  restingHeartRate: z.number().nullable().optional(),
  respiratoryRate: z.number().nullable().optional(),
  bodyTemperature: z.number().nullable().optional(),
  bodyweightLbs: z.number().nullable().optional(),
  createdAt: IsoDateString,
});
export type BiometricEntry = z.infer<typeof BiometricEntrySchema>;

/**
 * Mirror of `ReadinessResult` from `@iron-protocol/core-logic/types`.
 * We do NOT import it here — keeping the contract decoupled from the engine.
 * If the engine type drifts, update this schema; tests should catch it.
 */
export const ReadinessSchema = z.object({
  score: z.number(),
  coefficient: z.number(),
  flags: z.array(z.string()),
  breakdown: z.object({
    hrvComponent: z.number(),
    sleepComponent: z.number(),
    subjectiveComponent: z.number(),
    rhrComponent: z.number().nullable(),
  }),
});
export type Readiness = z.infer<typeof ReadinessSchema>;

export const DashboardResponseSchema = z.object({
  entries: z.array(BiometricEntrySchema),
  readiness: ReadinessSchema.nullable(),
});
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
