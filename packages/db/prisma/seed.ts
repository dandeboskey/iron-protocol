import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🏋️ Seeding Iron Protocol database...");

  // Create athlete
  const athlete = await prisma.athlete.upsert({
    where: { email: "athlete@ironprotocol.dev" },
    update: {},
    create: {
      name: "Daniel",
      email: "athlete@ironprotocol.dev",
      bodyweightLbs: 195,
      heightIn: 72,
      experienceYrs: 5,
    },
  });
  console.log(`  ✓ Athlete: ${athlete.name} (${athlete.id})`);

  // Seed baseline e1RMs for the big 3
  const e1rms = [
    { exercise: "Squat", e1rmLbs: 500, sourceWeight: 455, sourceReps: 3 },
    { exercise: "Bench Press", e1rmLbs: 335, sourceWeight: 305, sourceReps: 3 },
    { exercise: "Deadlift", e1rmLbs: 705, sourceWeight: 640, sourceReps: 3 },
  ];

  for (const e of e1rms) {
    await prisma.e1RMRecord.create({
      data: { athleteId: athlete.id, ...e, method: "EPLEY" },
    });
    console.log(`  ✓ e1RM: ${e.exercise} @ ${e.e1rmLbs} lbs`);
  }

  // Create active training block (Hypertrophy phase, 4 weeks)
  const block = await prisma.trainingBlock.create({
    data: {
      athleteId: athlete.id,
      name: "Hypertrophy Block A",
      phase: "HYPERTROPHY",
      status: "ACTIVE",
      weekCount: 4,
      currentWeek: 1,
      currentDay: 1,
    },
  });
  console.log(`  ✓ Training Block: ${block.name} (${block.phase})`);

  // Create sessions for week 1 (4 training days)
  const dayTemplates = [
    {
      dayNumber: 1,
      exercises: [
        { name: "Squat", sets: 4, reps: 6, rpe: 7.0, pct: 0.72, order: 1 },
        { name: "Romanian Deadlift", sets: 3, reps: 8, rpe: 7.0, pct: 0.55, order: 2, isAccessory: true },
        { name: "Leg Press", sets: 3, reps: 10, rpe: 7.5, pct: null, order: 3, isAccessory: true },
        { name: "Leg Curl", sets: 3, reps: 12, rpe: 8.0, pct: null, order: 4, isAccessory: true },
      ],
    },
    {
      dayNumber: 2,
      exercises: [
        { name: "Bench Press", sets: 4, reps: 6, rpe: 7.0, pct: 0.72, order: 1 },
        { name: "Overhead Press", sets: 3, reps: 8, rpe: 7.0, pct: 0.65, order: 2, isAccessory: true },
        { name: "Dumbbell Row", sets: 3, reps: 10, rpe: 7.5, pct: null, order: 3, isAccessory: true },
        { name: "Lateral Raise", sets: 3, reps: 15, rpe: 8.0, pct: null, order: 4, isAccessory: true },
      ],
    },
    {
      dayNumber: 3,
      exercises: [
        { name: "Deadlift", sets: 3, reps: 5, rpe: 7.0, pct: 0.73, order: 1 },
        { name: "Front Squat", sets: 3, reps: 6, rpe: 7.0, pct: 0.60, order: 2, isAccessory: true },
        { name: "Pull-Up", sets: 3, reps: 8, rpe: 7.5, pct: null, order: 3, isAccessory: true },
        { name: "Plank", sets: 3, reps: 60, rpe: 7.0, pct: null, order: 4, isAccessory: true },
      ],
    },
    {
      dayNumber: 4,
      exercises: [
        { name: "Bench Press", sets: 4, reps: 8, rpe: 6.5, pct: 0.67, order: 1 },
        { name: "Close-Grip Bench", sets: 3, reps: 8, rpe: 7.0, pct: 0.60, order: 2, isAccessory: true },
        { name: "Face Pull", sets: 3, reps: 15, rpe: 7.0, pct: null, order: 3, isAccessory: true },
        { name: "Tricep Pushdown", sets: 3, reps: 12, rpe: 7.5, pct: null, order: 4, isAccessory: true },
      ],
    },
  ];

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (const day of dayTemplates) {
    const sessionDate = new Date(today);
    sessionDate.setDate(today.getDate() + day.dayNumber - 1);

    const session = await prisma.trainingSession.create({
      data: {
        blockId: block.id,
        weekNumber: 1,
        dayNumber: day.dayNumber,
        scheduledDate: sessionDate,
      },
    });

    for (const ex of day.exercises) {
      const e1rmRecord = e1rms.find((e) => e.exercise === ex.name);
      const targetWeight = ex.pct && e1rmRecord ? Math.round(e1rmRecord.e1rmLbs * ex.pct / 5) * 5 : null;

      await prisma.exercisePrescription.create({
        data: {
          sessionId: session.id,
          exerciseName: ex.name,
          exerciseOrder: ex.order,
          prescribedSets: ex.sets,
          prescribedReps: ex.reps,
          prescribedRPE: ex.rpe,
          percentOfE1RM: ex.pct,
          targetWeightLbs: targetWeight,
          isAccessory: ex.isAccessory || false,
        },
      });
    }
    console.log(`  ✓ Session: Week 1, Day ${day.dayNumber} (${day.exercises.length} exercises)`);
  }

  // Seed some biometric entries for the last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(7, 0, 0, 0);

    await prisma.biometricEntry.create({
      data: {
        athleteId: athlete.id,
        date,
        hrvMs: 45 + Math.round(Math.random() * 30),
        sleepHours: 6 + Math.round(Math.random() * 20) / 10,
        sleepQuality: 5 + Math.floor(Math.random() * 5),
        mood: 5 + Math.floor(Math.random() * 5),
        soreness: 2 + Math.floor(Math.random() * 5),
        energy: 5 + Math.floor(Math.random() * 5),
        stress: 2 + Math.floor(Math.random() * 5),
      },
    });
  }
  console.log("  ✓ Biometric entries: 7 days seeded");

  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
