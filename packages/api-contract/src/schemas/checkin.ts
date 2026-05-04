import { z } from "zod";
import { BiometricEntrySchema } from "./dashboard";

/**
 * POST /api/biometric — daily check-in submission.
 *
 * Source of truth: `apps/web/src/app/api/biometric/route.ts` (POST).
 *
 * Field nullability mirrors the route exactly:
 *   - All fields optional in the request; the route coalesces missing keys
 *     to `null` before insert. We accept `null` explicitly too — that's how
 *     the watch will encode "no value" for HRV/sleep when HealthKit is empty.
 *   - Subjective fields (mood/soreness/energy/stress) are nominally 1-10 in
 *     the UI but the route does not enforce a range; we mirror that and add
 *     a soft `min(1).max(10)` range to surface bad client values early
 *     without breaking the contract if a future route adopts 0-as-skip.
 *
 * Response envelope (current route): `{ entry: BiometricEntry }`. The route
 * does NOT echo back fresh readiness (the caller refetches `GET /api/biometric`
 * to see the updated readiness). If the route is ever extended to return
 * `{ entry, readiness }`, widen this schema and the watch view in the same PR.
 *
 * SwiftMirror: `IronProtocolWatch/Models/BiometricCheckin.swift`
 */

const SubjectiveScale = z.number().int().min(1).max(10);

/**
 * Note: the current POST route reads only the fields below from the body.
 * `restingHeartRate` exists on the BiometricEntry model and on the
 * `createBiometricEntry` query input, but the route does NOT forward it from
 * the request. Adding it here would be inventing a field. When the route
 * starts forwarding RHR (likely tied to Apple Health ingestion on the watch
 * Phase 2), widen this schema in the same PR that updates the route.
 */
export const BiometricCheckinRequestSchema = z.object({
  hrvMs: z.number().nullable().optional(),
  sleepHours: z.number().nullable().optional(),
  sleepQuality: z.number().int().min(1).max(10).nullable().optional(),
  mood: SubjectiveScale.nullable().optional(),
  soreness: SubjectiveScale.nullable().optional(),
  energy: SubjectiveScale.nullable().optional(),
  stress: SubjectiveScale.nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type BiometricCheckinRequest = z.infer<typeof BiometricCheckinRequestSchema>;

export const BiometricCheckinResponseSchema = z.object({
  entry: BiometricEntrySchema,
});
export type BiometricCheckinResponse = z.infer<typeof BiometricCheckinResponseSchema>;
