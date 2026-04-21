import type { Phase, PhaseConfig, VolumeMetrics } from "../types";
import { exerciseINOL } from "./e1rm";

/**
 * Phase-specific training parameters.
 * These define the boundaries of the periodization model.
 *
 * MEV = Minimum Effective Volume (weekly sets per muscle group)
 * MRV = Maximum Recoverable Volume (weekly sets per muscle group)
 */
export const PHASE_CONFIGS: Record<Phase, PhaseConfig> = {
  HYPERTROPHY: {
    phase: "HYPERTROPHY",
    weekCount: 4,
    repRange: [6, 12],
    rpeRange: [6.5, 8.0],
    intensityRange: [0.60, 0.75],
    setsPerMuscleGroup: [10, 20], // [MEV, MRV]
    volumeProgression: 0.10, // 10% increase per week within block
  },
  STRENGTH: {
    phase: "STRENGTH",
    weekCount: 4,
    repRange: [3, 6],
    rpeRange: [7.0, 8.5],
    intensityRange: [0.75, 0.88],
    setsPerMuscleGroup: [6, 14],
    volumeProgression: 0.05,
  },
  PEAKING: {
    phase: "PEAKING",
    weekCount: 3,
    repRange: [1, 3],
    rpeRange: [8.0, 9.5],
    intensityRange: [0.88, 0.97],
    setsPerMuscleGroup: [4, 8],
    volumeProgression: -0.05, // volume tapers during peaking
  },
  DELOAD: {
    phase: "DELOAD",
    weekCount: 1,
    repRange: [5, 8],
    rpeRange: [5.0, 6.5],
    intensityRange: [0.50, 0.65],
    setsPerMuscleGroup: [4, 8],
    volumeProgression: 0,
  },
};

/**
 * Calculate volume metrics for a training session.
 */
export function calculateSessionVolume(
  exercises: {
    sets: number;
    reps: number;
    weightLbs: number;
    percentIntensity: number;
  }[]
): VolumeMetrics {
  let totalSets = 0;
  let totalReps = 0;
  let totalVolume = 0;
  let totalInol = 0;
  let intensitySum = 0;

  for (const ex of exercises) {
    totalSets += ex.sets;
    totalReps += ex.sets * ex.reps;
    totalVolume += ex.sets * ex.reps * ex.weightLbs;
    totalInol += exerciseINOL(ex.sets, ex.reps, ex.percentIntensity * 100);
    intensitySum += ex.percentIntensity * ex.sets;
  }

  return {
    totalSets,
    totalReps,
    totalVolume: Math.round(totalVolume),
    relativeIntensity:
      totalSets > 0 ? Math.round((intensitySum / totalSets) * 1000) / 1000 : 0,
    inol: Math.round(totalInol * 1000) / 1000,
  };
}

/**
 * Scale MRV based on athlete's strength-to-bodyweight ratio.
 * Elite lifters with massive absolute loads have LOWER MRV because
 * each set creates disproportionate systemic fatigue.
 *
 * A 195lb lifter squatting 500+ has substantially lower MRV
 * than a 195lb lifter squatting 315.
 */
export function scaledMRV(
  baseMRV: number,
  e1rm: number,
  bodyweightLbs: number
): number {
  const ratio = e1rm / bodyweightLbs;
  let scaleFactor: number;

  if (ratio <= 1.5) {
    scaleFactor = 1.0; // novice: full MRV
  } else if (ratio <= 2.0) {
    scaleFactor = 0.95;
  } else if (ratio <= 2.5) {
    scaleFactor = 0.88;
  } else if (ratio <= 3.0) {
    scaleFactor = 0.80;
  } else if (ratio <= 3.5) {
    scaleFactor = 0.72;
  } else {
    scaleFactor = 0.65; // 3.5x+ BW: MRV drops 35%
  }

  return Math.round(baseMRV * scaleFactor);
}

/**
 * Get target volume for a given week within a phase,
 * progressing from MEV toward MRV over the block.
 *
 * Week 1 starts at MEV + small buffer.
 * Each subsequent week adds volumeProgression%.
 * Capped at athlete-specific MRV.
 */
export function weeklyTargetVolume(
  phase: Phase,
  weekNumber: number,
  e1rm: number,
  bodyweightLbs: number
): { targetSets: number; mev: number; mrv: number } {
  const config = PHASE_CONFIGS[phase];
  const [mev, rawMrv] = config.setsPerMuscleGroup;
  const mrv = scaledMRV(rawMrv, e1rm, bodyweightLbs);

  // Start at MEV + 25% of available range
  const baseVolume = mev + (mrv - mev) * 0.25;
  const weekMultiplier = 1 + config.volumeProgression * (weekNumber - 1);
  const targetSets = Math.round(
    Math.max(mev, Math.min(mrv, baseVolume * weekMultiplier))
  );

  return { targetSets, mev, mrv };
}
