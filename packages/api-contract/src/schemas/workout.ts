import { z } from "zod";
import { IsoDateString } from "./common";
import { ReadinessSchema } from "./dashboard";

/**
 * GET /api/workout — today's auto-regulated session.
 * Source of truth: `apps/web/src/app/api/workout/route.ts` (GET).
 *
 * SwiftMirror: `IronProtocolWatch/Models/Workout.swift`
 */

export const ExercisePrescriptionSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  exerciseName: z.string(),
  exerciseOrder: z.number().int(),
  prescribedSets: z.number().int(),
  prescribedReps: z.number().int(),
  prescribedRPE: z.number(),
  percentOfE1RM: z.number().nullable(),
  targetWeightLbs: z.number().nullable(),
  isAccessory: z.boolean(),
});
export type ExercisePrescription = z.infer<typeof ExercisePrescriptionSchema>;

export const CompletedSetSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  prescriptionId: z.string(),
  setNumber: z.number().int(),
  reps: z.number().int(),
  weightLbs: z.number(),
  rpe: z.number().nullable(),
  completedAt: IsoDateString,
});
export type CompletedSet = z.infer<typeof CompletedSetSchema>;

export const TrainingSessionSchema = z.object({
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
export type TrainingSession = z.infer<typeof TrainingSessionSchema>;

export const RegulatedPrescriptionSchema = z.object({
  exerciseName: z.string(),
  sets: z.number().int(),
  reps: z.number().int(),
  rpe: z.number(),
  percentOfE1RM: z.number().nullable(),
  isAccessory: z.boolean(),
  adjustedSets: z.number().int(),
  adjustedRpe: z.number(),
  adjustedPercentE1RM: z.number().nullable(),
  targetWeightLbs: z.number().nullable(),
  regulationNote: z.string(),
});
export type RegulatedPrescription = z.infer<typeof RegulatedPrescriptionSchema>;

export const WorkoutBlockSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  // Phase enum: HYPERTROPHY | STRENGTH | PEAKING | DELOAD
  phase: z.string(),
  currentWeek: z.number().int(),
  currentDay: z.number().int(),
  weekCount: z.number().int(),
});
export type WorkoutBlockSummary = z.infer<typeof WorkoutBlockSummarySchema>;

export const WorkoutResponseSchema = z.object({
  session: TrainingSessionSchema,
  label: z.string(),
  readiness: ReadinessSchema.nullable(),
  regulated: z.array(RegulatedPrescriptionSchema),
  block: WorkoutBlockSummarySchema,
});
export type WorkoutResponse = z.infer<typeof WorkoutResponseSchema>;
