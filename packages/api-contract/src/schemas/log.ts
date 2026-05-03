import { z } from "zod";
import { CompletedSetSchema } from "./workout";

/**
 * Log-set endpoints — write side of the workout flow.
 *
 * Sources of truth:
 *   POST   /api/log         -> apps/web/src/app/api/log/route.ts
 *   PATCH  /api/log/[id]    -> apps/web/src/app/api/log/[id]/route.ts
 *   DELETE /api/log/[id]    -> apps/web/src/app/api/log/[id]/route.ts
 *
 * SwiftMirror: `IronProtocolWatch/Models/LogSet.swift`
 *
 * NOTE on response envelope: POST and PATCH both return `{ set: CompletedSet }`
 * — there is intentionally no fresh e1RM in the response. The route updates
 * E1RMRecord as a side effect (append-only ledger), but doesn't echo it back;
 * the dashboard reads the latest e1RM separately. Don't add an `e1RM` field
 * to this schema unless the route actually starts returning one.
 */

/** POST /api/log — create a CompletedSet for the current session. */
export const LogSetCreateRequestSchema = z.object({
  sessionId: z.string().min(1),
  prescriptionId: z.string().min(1),
  setNumber: z.number().int().positive(),
  weightLbs: z.number().positive(),
  reps: z.number().int().positive(),
  rpe: z.number().min(1).max(10).nullable().optional(),
});
export type LogSetCreateRequest = z.infer<typeof LogSetCreateRequestSchema>;

/** PATCH /api/log/[id] — partial edit. All fields optional; route validates. */
export const LogSetUpdateRequestSchema = z.object({
  weightLbs: z.number().positive().optional(),
  reps: z.number().int().positive().optional(),
  // RPE may be cleared with `null` (route accepts null/empty -> null in DB).
  rpe: z.number().min(1).max(10).nullable().optional(),
});
export type LogSetUpdateRequest = z.infer<typeof LogSetUpdateRequestSchema>;

/** Both POST and PATCH return `{ set: CompletedSet }`. */
export const LogSetMutationResponseSchema = z.object({
  set: CompletedSetSchema,
});
export type LogSetMutationResponse = z.infer<typeof LogSetMutationResponseSchema>;

/** DELETE /api/log/[id] — returns `{ ok: true }`. */
export const LogSetDeleteResponseSchema = z.object({
  ok: z.literal(true),
});
export type LogSetDeleteResponse = z.infer<typeof LogSetDeleteResponseSchema>;
