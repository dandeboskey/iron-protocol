import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { PrismaClient } from "@prisma/client";
export type { Athlete, TrainingBlock, TrainingSession, ExercisePrescription, CompletedSet, BiometricEntry, E1RMRecord } from "@prisma/client";

// Phase and status constants (since SQLite doesn't support enums)
export const Phase = {
  HYPERTROPHY: "HYPERTROPHY",
  STRENGTH: "STRENGTH",
  PEAKING: "PEAKING",
  DELOAD: "DELOAD",
} as const;

export type Phase = (typeof Phase)[keyof typeof Phase];

export const BlockStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  PAUSED: "PAUSED",
} as const;

export type BlockStatus = (typeof BlockStatus)[keyof typeof BlockStatus];
