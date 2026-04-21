import { prisma } from "./index";

/** Get the active athlete (first one, since this is single-user for now) */
export async function getActiveAthlete() {
  return prisma.athlete.findFirst({ orderBy: { createdAt: "asc" } });
}

/** Get athlete by ID with all relations */
export async function getAthleteWithBlock(athleteId: string) {
  return prisma.athlete.findUnique({
    where: { id: athleteId },
    include: {
      trainingBlocks: {
        where: { status: "ACTIVE" },
        include: {
          sessions: {
            include: { prescriptions: true, completedSets: true },
            orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }],
          },
        },
      },
    },
  });
}

/** Get trailing N-day biometric entries */
export async function getTrailingBiometrics(athleteId: string, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return prisma.biometricEntry.findMany({
    where: { athleteId, date: { gte: since } },
    orderBy: { date: "desc" },
  });
}

/** Get latest e1RM for a given exercise */
export async function getLatestE1RM(athleteId: string, exercise: string) {
  return prisma.e1RMRecord.findFirst({
    where: { athleteId, exercise },
    orderBy: { recordedAt: "desc" },
  });
}

/** Get all latest e1RMs for an athlete (one per exercise) */
export async function getAllLatestE1RMs(athleteId: string) {
  const records = await prisma.e1RMRecord.findMany({
    where: { athleteId },
    orderBy: { recordedAt: "desc" },
  });
  const map = new Map<string, typeof records[0]>();
  for (const r of records) {
    if (!map.has(r.exercise)) map.set(r.exercise, r);
  }
  return Array.from(map.values());
}

/** Get today's session for a block */
export async function getTodaySession(blockId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  return prisma.trainingSession.findFirst({
    where: {
      blockId,
      scheduledDate: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      prescriptions: { orderBy: { exerciseOrder: "asc" } },
      completedSets: true,
    },
  });
}

/** Record a biometric check-in */
export async function createBiometricEntry(data: {
  athleteId: string;
  hrvMs?: number;
  sleepHours?: number;
  sleepQuality?: number;
  mood?: number;
  soreness?: number;
  energy?: number;
  stress?: number;
  notes?: string;
}) {
  return prisma.biometricEntry.create({ data });
}

/** Log a completed set (immutable once created) */
export async function logCompletedSet(data: {
  sessionId: string;
  prescriptionId: string;
  setNumber: number;
  reps: number;
  weightLbs: number;
  rpe?: number;
}) {
  return prisma.completedSet.create({ data });
}

/** Record a new e1RM from a completed set */
export async function recordE1RM(data: {
  athleteId: string;
  exercise: string;
  e1rmLbs: number;
  method?: string;
  sourceWeight?: number;
  sourceReps?: number;
}) {
  return prisma.e1RMRecord.create({
    data: { ...data, method: data.method || "EPLEY" },
  });
}

/** Get recent sessions with completed sets for history view */
export async function getSessionHistory(athleteId: string, limit = 20) {
  return prisma.trainingSession.findMany({
    where: {
      block: { athleteId },
      completedAt: { not: null },
    },
    include: {
      prescriptions: true,
      completedSets: true,
      block: { select: { name: true, phase: true } },
    },
    orderBy: { completedAt: "desc" },
    take: limit,
  });
}

// =============================================================================
// PERSONAL RECORDS
// =============================================================================

/** Get all personal records for an athlete */
export async function getPersonalRecords(athleteId: string) {
  return prisma.personalRecord.findMany({
    where: { athleteId },
    orderBy: [{ exerciseName: "asc" }, { recordType: "asc" }, { achievedAt: "desc" }],
  });
}

/** Get latest PR per exercise per type */
export async function getLatestPRs(athleteId: string) {
  const records = await prisma.personalRecord.findMany({
    where: { athleteId },
    orderBy: { achievedAt: "desc" },
  });
  const map = new Map<string, (typeof records)[0]>();
  for (const r of records) {
    const key = `${r.exerciseName}:${r.recordType}`;
    if (!map.has(key)) map.set(key, r);
  }
  return Array.from(map.values());
}

/** Upsert a personal record */
export async function upsertPersonalRecord(data: {
  athleteId: string;
  exerciseName: string;
  recordType: string;
  weightLbs: number;
  reps?: number;
  achievedAt?: Date;
}) {
  return prisma.personalRecord.create({
    data: {
      ...data,
      reps: data.reps ?? 1,
      achievedAt: data.achievedAt ?? new Date(),
    },
  });
}

// =============================================================================
// PROGRESSION LOGS
// =============================================================================

/** Get progression logs for an exercise across a block */
export async function getExerciseProgression(
  athleteId: string,
  exercise: string,
  limit = 50
) {
  return prisma.progressionLog.findMany({
    where: { athleteId, exerciseName: exercise },
    orderBy: { recordedAt: "desc" },
    take: limit,
    include: { block: { select: { name: true, phase: true } } },
  });
}

// =============================================================================
// PROGRAM TEMPLATES
// =============================================================================

/** Get all program templates for an athlete */
export async function getProgramTemplates(athleteId: string) {
  return prisma.programTemplate.findMany({
    where: { athleteId },
    include: {
      phases: {
        orderBy: { order: "asc" },
        include: {
          days: {
            orderBy: { dayNumber: "asc" },
            include: { exercises: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
