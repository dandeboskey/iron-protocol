import { z } from "zod";
import { IsoDateString } from "./common";
import { ExercisePrescriptionSchema, CompletedSetSchema } from "./workout";

/**
 * GET /api/block — active training block overview.
 * Source of truth: `apps/web/src/app/api/block/route.ts` (GET).
 *
 * Returns `{ block, progress }` where `block` is the athlete's currently-active
 * TrainingBlock with its sessions (each session including its prescriptions
 * and completedSets), or `null` when there is no active block. `progress` is
 * a 0-100 macrocycle percentage produced by `core-logic.macrocycleProgress`.
 *
 * SwiftMirror: not yet — the watch app derives a thinner BlockSummary from
 * the `/api/workout` response (see `IronProtocolWatch/Models/Workout.swift`).
 */

export const BlockSessionSchema = z.object({
  id: z.string(),
  blockId: z.string(),
  weekNumber: z.number().int(),
  dayNumber: z.number().int(),
  scheduledDate: IsoDateString,
  completedAt: IsoDateString.nullable(),
  readinessScore: z.number().nullable(),
  readinessCoeff: z.number(),
  autoRegNote: z.string().nullable(),
  createdAt: IsoDateString,
  prescriptions: z.array(ExercisePrescriptionSchema),
  completedSets: z.array(CompletedSetSchema),
});
export type BlockSession = z.infer<typeof BlockSessionSchema>;

/**
 * The shape returned for the active block. Mirrors Prisma's TrainingBlock row
 * with its `sessions` include. `phase` and `status` are stored as enum
 * strings — keeping them as `z.string()` lets the contract remain lenient if
 * new enum values are added without immediately rebuilding clients.
 */
export const ActiveBlockSchema = z.object({
  id: z.string(),
  athleteId: z.string(),
  name: z.string(),
  // Phase: HYPERTROPHY | STRENGTH | PEAKING | DELOAD
  phase: z.string(),
  // BlockStatus: ACTIVE | PAUSED | COMPLETED
  status: z.string(),
  weekCount: z.number().int(),
  currentWeek: z.number().int(),
  currentDay: z.number().int(),
  startDate: IsoDateString,
  endDate: IsoDateString.nullable(),
  createdAt: IsoDateString,
  updatedAt: IsoDateString,
  sessions: z.array(BlockSessionSchema).optional(),
});
export type ActiveBlock = z.infer<typeof ActiveBlockSchema>;

export const BlockResponseSchema = z.object({
  block: ActiveBlockSchema.nullable(),
  progress: z.number(),
});
export type BlockResponse = z.infer<typeof BlockResponseSchema>;
