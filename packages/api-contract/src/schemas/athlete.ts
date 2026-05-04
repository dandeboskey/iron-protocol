import { z } from "zod";
import { IsoDateString } from "./common";

/**
 * GET /api/athlete — current athlete profile + latest e1RMs.
 * PUT /api/athlete — full update of mutable profile fields.
 *
 * Source of truth: `apps/web/src/app/api/athlete/route.ts`.
 *
 * The route uses HTTP `PUT` (full replace), not PATCH. Body validation in
 * the route is permissive: `name` required + trimmed, `bodyweightLbs` 50-600,
 * `experienceYrs` 0-60, `heightIn` optional 36-96. We mirror those bounds
 * here so the client surfaces drift before the server does.
 *
 * SwiftMirror: `IronProtocolWatch/Models/Athlete.swift` (not added in
 * Phase 1 — the watch app does not currently read or write the athlete
 * profile; it sticks to readiness, workout, check-in).
 */
export const AthleteSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  name: z.string(),
  email: z.string(),
  bodyweightLbs: z.number(),
  heightIn: z.number().nullable(),
  experienceYrs: z.number(),
  createdAt: IsoDateString,
  updatedAt: IsoDateString,
});
export type Athlete = z.infer<typeof AthleteSchema>;

/**
 * Latest e1RM per exercise. The route returns these alongside the athlete on
 * GET so the profile page can show Big-3 with BW ratios in a single fetch.
 */
export const E1RMRecordSchema = z.object({
  id: z.string(),
  athleteId: z.string(),
  exercise: z.string(),
  e1rmLbs: z.number(),
  // E1RMMethod: EPLEY | BRZYCKI | LOMBARDI | DIRECT
  method: z.string(),
  sourceWeight: z.number().nullable(),
  sourceReps: z.number().int().nullable(),
  recordedAt: IsoDateString,
});
export type E1RMRecord = z.infer<typeof E1RMRecordSchema>;

export const AthleteGetResponseSchema = z.object({
  athlete: AthleteSchema,
  e1rms: z.array(E1RMRecordSchema),
});
export type AthleteGetResponse = z.infer<typeof AthleteGetResponseSchema>;

/**
 * PUT /api/athlete request body. The route does NOT accept partial updates —
 * it 400s on missing `name`, missing `bodyweightLbs`, or missing
 * `experienceYrs`. `heightIn` may be `null` (or omitted, which the route
 * treats the same way).
 *
 * Bounds mirror the route exactly. Update in lockstep if the route widens.
 */
export const AthleteUpdateRequestSchema = z.object({
  name: z.string().trim().min(1),
  bodyweightLbs: z.number().min(50).max(600),
  heightIn: z.number().min(36).max(96).nullable().optional(),
  experienceYrs: z.number().min(0).max(60),
});
export type AthleteUpdateRequest = z.infer<typeof AthleteUpdateRequestSchema>;

export const AthleteUpdateResponseSchema = z.object({
  athlete: AthleteSchema,
});
export type AthleteUpdateResponse = z.infer<typeof AthleteUpdateResponseSchema>;
