import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { PrismaClient } from "@prisma/client";
export type {
  Athlete,
  TrainingBlock,
  TrainingSession,
  ExercisePrescription,
  CompletedSet,
  BiometricEntry,
  E1RMRecord,
  EquipmentProfile,
  Barbell,
  PlateInventory,
  Dumbbell,
  Machine,
  ProgramTemplate,
  ProgramPhase,
  ProgramDay,
  ProgramExercise,
  ProgressionLog,
  WeeklySnapshot,
  PersonalRecord,
  DailyReadinessScore,
  User,
  Account,
  Session,
} from "@prisma/client";

// =============================================================================
// String enum constants (SQLite doesn't support native enums)
// =============================================================================

// Phase types for training blocks and program phases
export const Phase = {
  HYPERTROPHY: "HYPERTROPHY",
  STRENGTH: "STRENGTH",
  PEAKING: "PEAKING",
  DELOAD: "DELOAD",
} as const;

export type Phase = (typeof Phase)[keyof typeof Phase];

// Training block lifecycle status
export const BlockStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  PAUSED: "PAUSED",
} as const;

export type BlockStatus = (typeof BlockStatus)[keyof typeof BlockStatus];

// E1RM calculation method
export const E1RMMethod = {
  EPLEY: "EPLEY",
  BRZYCKI: "BRZYCKI",
  LOMBARDI: "LOMBARDI",
  DIRECT: "DIRECT",
} as const;

export type E1RMMethod = (typeof E1RMMethod)[keyof typeof E1RMMethod];

// Source of health/biometric data
export const HealthMetricSource = {
  MANUAL: "MANUAL",
  APPLE_HEALTH: "APPLE_HEALTH",
  OURA: "OURA",
  WHOOP: "WHOOP",
} as const;

export type HealthMetricSource = (typeof HealthMetricSource)[keyof typeof HealthMetricSource];

// Barbell classification
export const BarbellType = {
  STANDARD: "STANDARD",
  WOMENS: "WOMENS",
  SPECIALTY: "SPECIALTY",
} as const;

export type BarbellType = (typeof BarbellType)[keyof typeof BarbellType];

// Plate material type (affects diameter, tolerance)
export const PlateType = {
  IRON: "IRON",
  BUMPER: "BUMPER",
  CALIBRATED: "CALIBRATED",
} as const;

export type PlateType = (typeof PlateType)[keyof typeof PlateType];

// How a program template was created
export const ProgramSource = {
  MANUAL: "MANUAL",
  SPREADSHEET_IMPORT: "SPREADSHEET_IMPORT",
  AI_GENERATED: "AI_GENERATED",
} as const;

export type ProgramSource = (typeof ProgramSource)[keyof typeof ProgramSource];

// Muscle focus categories for training days
export const MuscleFocus = {
  UPPER: "UPPER",
  LOWER: "LOWER",
  FULL_BODY: "FULL_BODY",
  PUSH: "PUSH",
  PULL: "PULL",
  SQUAT: "SQUAT",
  BENCH: "BENCH",
  DEADLIFT: "DEADLIFT",
} as const;

export type MuscleFocus = (typeof MuscleFocus)[keyof typeof MuscleFocus];

// Personal record categories
export const PRType = {
  ONE_RM: "ONE_RM",
  THREE_RM: "THREE_RM",
  FIVE_RM: "FIVE_RM",
  MAX_VOLUME: "MAX_VOLUME",
  MAX_TONNAGE: "MAX_TONNAGE",
} as const;

export type PRType = (typeof PRType)[keyof typeof PRType];

// =============================================================================
// Default plate inventory for quick setup
// =============================================================================

export const DEFAULT_PLATE_WEIGHTS_LBS = [45, 35, 25, 10, 5, 2.5] as const;

export const DEFAULT_BARBELL_WEIGHT_LBS = 45;
export const WOMENS_BARBELL_WEIGHT_LBS = 35;
