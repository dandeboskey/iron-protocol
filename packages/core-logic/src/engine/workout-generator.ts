import type { Phase, AthleteProfile, BasePrescription } from "../types";
import { PHASE_CONFIGS, weeklyTargetVolume } from "../math/volume";

/**
 * Deterministic workout generator.
 *
 * Given a phase, week number, day number, and athlete profile,
 * generates base prescriptions (before auto-regulation).
 *
 * This uses template-based generation with phase-appropriate parameters.
 * The templates define the exercise selection and structure;
 * the phase config defines the rep/set/intensity ranges.
 */

interface DayTemplate {
  dayNumber: number;
  label: string;
  exercises: {
    name: string;
    isCompound: boolean;
    primaryMuscle: string;
    e1rmKey?: string; // key into AthleteProfile.e1rms
  }[];
}

/** 4-day upper/lower split template */
const DAY_TEMPLATES: DayTemplate[] = [
  {
    dayNumber: 1,
    label: "Lower A (Squat Focus)",
    exercises: [
      { name: "Squat", isCompound: true, primaryMuscle: "quads", e1rmKey: "Squat" },
      { name: "Romanian Deadlift", isCompound: true, primaryMuscle: "hamstrings", e1rmKey: "Deadlift" },
      { name: "Leg Press", isCompound: false, primaryMuscle: "quads" },
      { name: "Leg Curl", isCompound: false, primaryMuscle: "hamstrings" },
    ],
  },
  {
    dayNumber: 2,
    label: "Upper A (Bench Focus)",
    exercises: [
      { name: "Bench Press", isCompound: true, primaryMuscle: "chest", e1rmKey: "Bench Press" },
      { name: "Overhead Press", isCompound: true, primaryMuscle: "shoulders" },
      { name: "Dumbbell Row", isCompound: false, primaryMuscle: "back" },
      { name: "Lateral Raise", isCompound: false, primaryMuscle: "shoulders" },
    ],
  },
  {
    dayNumber: 3,
    label: "Lower B (Deadlift Focus)",
    exercises: [
      { name: "Deadlift", isCompound: true, primaryMuscle: "posterior", e1rmKey: "Deadlift" },
      { name: "Front Squat", isCompound: true, primaryMuscle: "quads", e1rmKey: "Squat" },
      { name: "Pull-Up", isCompound: false, primaryMuscle: "back" },
      { name: "Plank", isCompound: false, primaryMuscle: "core" },
    ],
  },
  {
    dayNumber: 4,
    label: "Upper B (Bench Volume)",
    exercises: [
      { name: "Bench Press", isCompound: true, primaryMuscle: "chest", e1rmKey: "Bench Press" },
      { name: "Close-Grip Bench", isCompound: true, primaryMuscle: "triceps", e1rmKey: "Bench Press" },
      { name: "Face Pull", isCompound: false, primaryMuscle: "rear delts" },
      { name: "Tricep Pushdown", isCompound: false, primaryMuscle: "triceps" },
    ],
  },
];

/**
 * Generate base prescriptions for a specific training day.
 */
export function generateDayPrescriptions(
  phase: Phase,
  weekNumber: number,
  dayNumber: number,
  athleteProfile: AthleteProfile
): { label: string; prescriptions: BasePrescription[] } {
  const config = PHASE_CONFIGS[phase];
  const template = DAY_TEMPLATES.find((t) => t.dayNumber === dayNumber);

  if (!template) {
    return { label: "Rest Day", prescriptions: [] };
  }

  // Get volume targets for this week
  const primaryE1rm = Math.max(...Object.values(athleteProfile.e1rms), 100);
  const { targetSets } = weeklyTargetVolume(
    phase,
    weekNumber,
    primaryE1rm,
    athleteProfile.bodyweightLbs
  );

  // Distribute sets: compounds get more, accessories less
  const compoundCount = template.exercises.filter((e) => e.isCompound).length;
  const accessoryCount = template.exercises.length - compoundCount;
  const compoundSetsEach = Math.max(
    2,
    Math.round((targetSets * 0.65) / Math.max(compoundCount, 1))
  );
  const accessorySetsEach = Math.max(
    2,
    Math.round((targetSets * 0.35) / Math.max(accessoryCount, 1))
  );

  const prescriptions: BasePrescription[] = template.exercises.map((ex, idx) => {
    const isCompound = ex.isCompound;
    const sets = isCompound ? compoundSetsEach : accessorySetsEach;

    // Rep range: compounds use lower end, accessories upper end
    const [minReps, maxReps] = config.repRange;
    const reps = isCompound
      ? minReps
      : Math.min(maxReps + 4, maxReps); // accessories get higher reps

    // RPE: compounds slightly lower to leave room for grinding
    const [minRpe, maxRpe] = config.rpeRange;
    const rpe = isCompound ? minRpe + 0.5 : maxRpe;

    // Intensity: only for exercises with e1RM keys
    let percentOfE1RM: number | null = null;
    if (ex.e1rmKey && athleteProfile.e1rms[ex.e1rmKey]) {
      const [minPct, maxPct] = config.intensityRange;
      // Primary compound (first exercise) gets higher intensity
      percentOfE1RM =
        idx === 0
          ? minPct + (maxPct - minPct) * 0.7
          : minPct + (maxPct - minPct) * 0.3;
      percentOfE1RM = Math.round(percentOfE1RM * 1000) / 1000;
    }

    return {
      exerciseName: ex.name,
      sets,
      reps,
      rpe,
      percentOfE1RM,
      isAccessory: !isCompound,
    };
  });

  return { label: template.label, prescriptions };
}

/** Get the day label for display */
export function getDayLabel(dayNumber: number): string {
  return DAY_TEMPLATES.find((t) => t.dayNumber === dayNumber)?.label ?? "Rest Day";
}
