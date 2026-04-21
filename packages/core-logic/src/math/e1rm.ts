/**
 * Estimated 1-Rep Max calculations.
 * Primary: Epley formula. Secondary: Brzycki for low-rep validation.
 *
 * Epley: e1RM = weight × (1 + reps / 30)
 * Brzycki: e1RM = weight × 36 / (37 - reps)
 *
 * Both degrade past ~10 reps. We cap at 12 for reliability.
 */

const MAX_RELIABLE_REPS = 12;

/** Epley e1RM estimate */
export function epleyE1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  const clampedReps = Math.min(reps, MAX_RELIABLE_REPS);
  return Math.round(weight * (1 + clampedReps / 30) * 10) / 10;
}

/** Brzycki e1RM estimate (better for low rep ranges) */
export function brzyckiE1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  if (reps >= 37) return 0; // formula breaks
  const clampedReps = Math.min(reps, MAX_RELIABLE_REPS);
  return Math.round((weight * 36) / (37 - clampedReps) * 10) / 10;
}

/**
 * Composite e1RM: weighted average of Epley (60%) and Brzycki (40%).
 * Brzycki is slightly more conservative at low reps, which benefits
 * elite lifters where overshoot is dangerous.
 */
export function compositeE1RM(weight: number, reps: number): number {
  const epley = epleyE1RM(weight, reps);
  const brzycki = brzyckiE1RM(weight, reps);
  if (epley === 0 || brzycki === 0) return epley || brzycki;
  return Math.round((epley * 0.6 + brzycki * 0.4) * 10) / 10;
}

/**
 * Calculate target weight from e1RM and desired percentage.
 * Rounds to nearest 5 lbs (standard plate math).
 */
export function targetWeight(e1rm: number, percentage: number): number {
  if (e1rm <= 0 || percentage <= 0) return 0;
  return Math.round((e1rm * percentage) / 5) * 5;
}

/**
 * INOL (Intensity × Number of Lifts) for a single set.
 * INOL = reps / (100 - percentIntensity)
 * Used to gauge fatigue accumulation per exercise.
 *
 * Guidelines: <0.4 easy, 0.4-1.0 moderate, 1.0-2.0 hard, >2.0 brutal
 */
export function setINOL(reps: number, percentIntensity: number): number {
  if (percentIntensity >= 100) return reps * 10; // cap absurdly high
  return Math.round((reps / (100 - percentIntensity)) * 1000) / 1000;
}

/** Total INOL for an exercise (sum across sets) */
export function exerciseINOL(
  sets: number,
  reps: number,
  percentIntensity: number
): number {
  return Math.round(sets * setINOL(reps, percentIntensity) * 1000) / 1000;
}
