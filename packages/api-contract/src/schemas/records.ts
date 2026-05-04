import { z } from "zod";
import { IsoDateString } from "./common";

/**
 * GET /api/records — Personal Records list.
 * Source of truth: `apps/web/src/app/api/records/route.ts` (GET) returning
 * `{ records: PersonalRecord[] }` directly from `getLatestPRs(athleteId)`.
 *
 * SwiftMirror: `IronProtocolWatch/Models/PersonalRecord.swift`
 */
export const PersonalRecordSchema = z.object({
  id: z.string(),
  athleteId: z.string(),
  exerciseName: z.string(),
  // PRType enum stored as string in SQLite: ONE_RM | THREE_RM | FIVE_RM | MAX_VOLUME | MAX_TONNAGE
  // The web POST uses display strings ("1RM", "3RM", etc.) so we keep this open.
  recordType: z.string(),
  weightLbs: z.number(),
  reps: z.number().int().nullable(),
  volumeLoad: z.number().nullable().optional(),
  isAllTime: z.boolean().optional(),
  previousBest: z.number().nullable().optional(),
  achievedAt: IsoDateString,
});
export type PersonalRecord = z.infer<typeof PersonalRecordSchema>;

export const RecordsListResponseSchema = z.object({
  records: z.array(PersonalRecordSchema),
});
export type RecordsListResponse = z.infer<typeof RecordsListResponseSchema>;

/** POST /api/records — create a PR. */
export const RecordCreateRequestSchema = z.object({
  exerciseName: z.string().min(1),
  recordType: z.string().min(1),
  weightLbs: z.number().positive(),
  reps: z.number().int().min(1).optional(),
  notes: z.string().nullable().optional(),
});
export type RecordCreateRequest = z.infer<typeof RecordCreateRequestSchema>;

export const RecordMutationResponseSchema = z.object({
  record: PersonalRecordSchema,
});
export type RecordMutationResponse = z.infer<typeof RecordMutationResponseSchema>;

/** PATCH /api/records/[id] — partial update of a PR. */
export const RecordUpdateRequestSchema = z.object({
  exerciseName: z.string().min(1).optional(),
  recordType: z.string().min(1).optional(),
  weightLbs: z.number().positive().optional(),
  reps: z.number().int().min(1).optional(),
  notes: z.string().nullable().optional(),
});
export type RecordUpdateRequest = z.infer<typeof RecordUpdateRequestSchema>;

/** DELETE /api/records/[id] — returns `{ ok: true }`. */
export const RecordDeleteResponseSchema = z.object({
  ok: z.literal(true),
});
export type RecordDeleteResponse = z.infer<typeof RecordDeleteResponseSchema>;
