import type { AthleteProfile } from "../types";

/**
 * Fatigue accumulation and dissipation model.
 *
 * Uses a fitness-fatigue (Banister) model simplified for session-level tracking:
 *   Fatigue(t) = Σ (dose_i × e^(-t_i / τ))
 *   where τ (tau) = decay constant in days
 *
 * For elite lifters, tau is LONGER (fatigue lingers more)
 * because absolute loads create deeper CNS debt.
 */

/** Decay constant (tau) in days based on strength-to-BW ratio */
function fatigueDecayTau(maxStrengthRatio: number): number {
  if (maxStrengthRatio <= 1.5) return 1.5; // novice: recovers fast
  if (maxStrengthRatio <= 2.0) return 2.0;
  if (maxStrengthRatio <= 2.5) return 2.5;
  if (maxStrengthRatio <= 3.0) return 3.0;
  if (maxStrengthRatio <= 3.5) return 3.5;
  return 4.0; // elite: 4-day effective decay
}

/**
 * Calculate current accumulated fatigue from recent sessions.
 *
 * @param sessions - Recent sessions with their total volume and days-ago offset
 * @param profile - Athlete profile for scaling
 * @returns fatigue index 0-100 (0 = fresh, 100 = buried)
 */
export function calculateAccumulatedFatigue(
  sessions: { totalVolume: number; daysAgo: number }[],
  profile: AthleteProfile
): number {
  const maxRatio = Math.max(
    ...Object.values(profile.e1rms).map((e) => e / profile.bodyweightLbs),
    0
  );
  const tau = fatigueDecayTau(maxRatio);

  let fatigueSum = 0;
  for (const s of sessions) {
    // Normalize volume dose: assume ~50,000 lbs total volume = moderate session
    const dose = s.totalVolume / 50000;
    const decay = Math.exp(-s.daysAgo / tau);
    fatigueSum += dose * decay;
  }

  // Map to 0-100 scale. A fatigueSum of ~3 = moderately fatigued
  const index = Math.round(Math.min(100, (fatigueSum / 4) * 100));
  return index;
}

/**
 * Estimate days until full recovery given current fatigue index.
 */
export function estimatedRecoveryDays(
  currentFatigue: number,
  profile: AthleteProfile
): number {
  const maxRatio = Math.max(
    ...Object.values(profile.e1rms).map((e) => e / profile.bodyweightLbs),
    0
  );
  const tau = fatigueDecayTau(maxRatio);

  // Solve: fatigue × e^(-t/tau) < 10 (threshold for "recovered")
  if (currentFatigue <= 10) return 0;
  const t = -tau * Math.log(10 / currentFatigue);
  return Math.ceil(Math.max(0, t));
}
