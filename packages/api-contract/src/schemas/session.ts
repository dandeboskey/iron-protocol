import { z } from "zod";
import { IsoDateString } from "./common";

/**
 * POST /api/session/complete — mark a TrainingSession complete and advance
 * the parent block's currentDay/currentWeek (or flip status to COMPLETED
 * when the last week's last day is finished).
 *
 * Source of truth: `apps/web/src/app/api/session/complete/route.ts`.
 *
 * Response envelope: the route returns `{ block: TrainingBlock }` after the
 * advance, NOT `{ ok: true, advanced }`. Schema mirrors what the route
 * actually emits.
 *
 * SwiftMirror: `IronProtocolWatch/Models/SessionComplete.swift`
 */

export const SessionCompleteRequestSchema = z.object({
  sessionId: z.string().min(1),
});
export type SessionCompleteRequest = z.infer<typeof SessionCompleteRequestSchema>;

/**
 * Subset of TrainingBlock that the route returns. We don't pull in the full
 * Prisma model — only the fields a client actually reads. If the UI needs
 * more, widen here and add a regression check.
 */
export const TrainingBlockAdvancedSchema = z.object({
  id: z.string(),
  athleteId: z.string(),
  name: z.string(),
  // Phase enum stored as string: HYPERTROPHY | STRENGTH | PEAKING | DELOAD
  phase: z.string(),
  // Status enum: ACTIVE | COMPLETED | PAUSED
  status: z.string(),
  startDate: IsoDateString,
  endDate: IsoDateString.nullable(),
  weekCount: z.number().int(),
  currentWeek: z.number().int(),
  currentDay: z.number().int(),
  templateId: z.string().nullable(),
  createdAt: IsoDateString,
  updatedAt: IsoDateString,
});
export type TrainingBlockAdvanced = z.infer<typeof TrainingBlockAdvancedSchema>;

export const SessionCompleteResponseSchema = z.object({
  block: TrainingBlockAdvancedSchema,
});
export type SessionCompleteResponse = z.infer<typeof SessionCompleteResponseSchema>;
