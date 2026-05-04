import { z } from "zod";
import { IsoDateString } from "./common";

/**
 * GET /api/program — list program templates owned by the current athlete.
 * POST /api/program — create a new program template.
 *
 * Source of truth: `apps/web/src/app/api/program/route.ts`.
 *
 * The POST handler accepts a nested `{ name, durationWeeks, phases }` payload
 * and persists the full graph in one Prisma `create` with chained `create`
 * relations. The response is the full template hydrated with its phases →
 * days → exercises so the wizard can render the Review step without a
 * follow-up GET.
 */

export const ProgramExerciseSchema = z.object({
  id: z.string(),
  dayId: z.string(),
  exerciseName: z.string(),
  order: z.number().int(),
  sets: z.number().int(),
  reps: z.number().int(),
  rpe: z.number().nullable(),
  intensityPct: z.number().nullable(),
  isAccessory: z.boolean(),
});
export type ProgramExercise = z.infer<typeof ProgramExerciseSchema>;

export const ProgramDaySchema = z.object({
  id: z.string(),
  phaseId: z.string(),
  dayNumber: z.number().int(),
  label: z.string(),
  muscleFocus: z.string().nullable(),
  exercises: z.array(ProgramExerciseSchema).optional(),
});
export type ProgramDay = z.infer<typeof ProgramDaySchema>;

export const ProgramPhaseSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  name: z.string(),
  // PhaseType enum: HYPERTROPHY | STRENGTH | PEAKING | DELOAD
  phaseType: z.string(),
  weekCount: z.number().int(),
  order: z.number().int(),
  days: z.array(ProgramDaySchema).optional(),
});
export type ProgramPhase = z.infer<typeof ProgramPhaseSchema>;

export const ProgramTemplateSchema = z.object({
  id: z.string(),
  athleteId: z.string(),
  name: z.string(),
  durationWeeks: z.number().int(),
  phasesCount: z.number().int(),
  // ProgramSource: MANUAL | UPLOAD | IMPORT
  source: z.string(),
  createdAt: IsoDateString,
  updatedAt: IsoDateString,
  phases: z.array(ProgramPhaseSchema).optional(),
});
export type ProgramTemplate = z.infer<typeof ProgramTemplateSchema>;

export const ProgramListResponseSchema = z.object({
  templates: z.array(ProgramTemplateSchema),
});
export type ProgramListResponse = z.infer<typeof ProgramListResponseSchema>;

/**
 * POST request body. The route stores `intensityPct` on disk but the wizard
 * sends it as `percentOfE1RM`; both names refer to the same 0-1 fraction.
 * We keep the wizard-facing name here because the POST route reads
 * `ex.percentOfE1RM` — see route.ts L48.
 */
export const ProgramCreateExerciseSchema = z.object({
  exerciseName: z.string().min(1),
  sets: z.number().int().min(1),
  reps: z.number().int().min(1),
  rpe: z.number().nullable().optional(),
  percentOfE1RM: z.number().nullable().optional(),
  isAccessory: z.boolean().optional(),
});
export type ProgramCreateExercise = z.infer<typeof ProgramCreateExerciseSchema>;

export const ProgramCreateDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  label: z.string().min(1),
  muscleFocus: z.string().nullable().optional(),
  exercises: z.array(ProgramCreateExerciseSchema).optional(),
});
export type ProgramCreateDay = z.infer<typeof ProgramCreateDaySchema>;

export const ProgramCreatePhaseSchema = z.object({
  name: z.string().min(1),
  phaseType: z.string().min(1),
  weekCount: z.number().int().min(1).max(12),
  days: z.array(ProgramCreateDaySchema).optional(),
});
export type ProgramCreatePhase = z.infer<typeof ProgramCreatePhaseSchema>;

export const ProgramCreateRequestSchema = z.object({
  name: z.string().trim().min(1),
  durationWeeks: z.number().int().min(1).max(52),
  phases: z.array(ProgramCreatePhaseSchema).min(1),
});
export type ProgramCreateRequest = z.infer<typeof ProgramCreateRequestSchema>;

export const ProgramCreateResponseSchema = z.object({
  template: ProgramTemplateSchema,
});
export type ProgramCreateResponse = z.infer<typeof ProgramCreateResponseSchema>;
