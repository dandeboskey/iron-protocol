import type { BiometricSnapshot, ReadinessResult, AthleteProfile } from "../types";

/**
 * Readiness Coefficient (Rc) calculation.
 *
 * Composite score from 3 domains:
 *   1. HRV component (30% weight) — deviation from 7-day rolling avg
 *   2. Sleep component (30% weight) — hours + quality
 *   3. Subjective component (40% weight) — mood, soreness, energy, stress
 *
 * Output:
 *   - score: 0-100 (human-readable)
 *   - coefficient: 0.70 - 1.10 (multiplier for volume/intensity)
 *
 * Elite scaling: For athletes with strength-to-bodyweight ratios > 3.0,
 * negative readiness signals are amplified (CNS sensitivity is higher).
 */

/** Default HRV baseline when no history available */
const DEFAULT_HRV_BASELINE = 55;

/** Calculate HRV component (0-100) */
function calcHrvComponent(
  hrvMs: number | null,
  hrvBaseline: number
): number {
  if (hrvMs === null) return 50; // neutral when missing
  // Percentage deviation from baseline
  const deviation = (hrvMs - hrvBaseline) / hrvBaseline;
  // Map to 0-100 scale: -30% deviation = 20, 0% = 60, +30% = 90
  const score = 60 + deviation * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Calculate sleep component (0-100) */
function calcSleepComponent(
  sleepHours: number | null,
  sleepQuality: number | null
): number {
  let score = 50;
  if (sleepHours !== null) {
    // Optimal = 7.5-9 hours. Below 6 = severe penalty.
    if (sleepHours >= 7.5 && sleepHours <= 9) {
      score = 80;
    } else if (sleepHours >= 6.5) {
      score = 60;
    } else if (sleepHours >= 6) {
      score = 40;
    } else {
      score = 20;
    }
  }
  if (sleepQuality !== null) {
    // Quality is 1-10. Blend with hours-based score.
    const qualityNorm = (sleepQuality / 10) * 100;
    score = score * 0.5 + qualityNorm * 0.5;
  }
  return Math.round(Math.max(0, Math.min(100, score)));
}

/** Calculate subjective component (0-100) */
function calcSubjectiveComponent(snapshot: BiometricSnapshot): number {
  const fields: { value: number | null; weight: number; invert: boolean }[] = [
    { value: snapshot.mood, weight: 0.3, invert: false },
    { value: snapshot.soreness, weight: 0.25, invert: true }, // 10 = very sore = bad
    { value: snapshot.energy, weight: 0.3, invert: false },
    { value: snapshot.stress, weight: 0.15, invert: true }, // 10 = very stressed = bad
  ];

  let totalWeight = 0;
  let weightedSum = 0;

  for (const f of fields) {
    if (f.value !== null) {
      const normalized = f.invert ? (11 - f.value) : f.value; // flip inverted scales
      weightedSum += (normalized / 10) * 100 * f.weight;
      totalWeight += f.weight;
    }
  }

  if (totalWeight === 0) return 50; // all missing = neutral
  return Math.round(Math.max(0, Math.min(100, weightedSum / totalWeight)));
}

/**
 * CNS sensitivity multiplier for elite athletes.
 * Athletes with very high strength-to-bodyweight ratios experience
 * disproportionate CNS fatigue. A 195lb lifter pulling 705 (ratio 3.6x)
 * should not be auto-regulated the same as a novice at 1.5x.
 *
 * This amplifies NEGATIVE readiness deviations. Positive signals remain 1:1.
 */
function cnsSensitivityMultiplier(profile: AthleteProfile): number {
  const maxRatio = Math.max(
    ...Object.values(profile.e1rms).map((e) => e / profile.bodyweightLbs),
    0
  );
  if (maxRatio <= 2.0) return 1.0; // novice/intermediate
  if (maxRatio <= 2.5) return 1.1;
  if (maxRatio <= 3.0) return 1.2;
  if (maxRatio <= 3.5) return 1.35;
  return 1.5; // elite: 3.5x+ BW ratio
}

/**
 * Primary readiness calculation.
 *
 * @param snapshot - Today's biometric data
 * @param profile - Athlete profile for CNS scaling
 * @param hrvBaseline - 7-day rolling average HRV (pass null to use default)
 */
export function calculateReadiness(
  snapshot: BiometricSnapshot,
  profile: AthleteProfile,
  hrvBaseline: number | null = null
): ReadinessResult {
  const baseline = hrvBaseline ?? DEFAULT_HRV_BASELINE;
  const flags: string[] = [];

  const hrvComponent = calcHrvComponent(snapshot.hrvMs, baseline);
  const sleepComponent = calcSleepComponent(snapshot.sleepHours, snapshot.sleepQuality);
  const subjectiveComponent = calcSubjectiveComponent(snapshot);

  // Weighted composite
  let rawScore = hrvComponent * 0.3 + sleepComponent * 0.3 + subjectiveComponent * 0.4;

  // Apply CNS sensitivity for negative deviations
  const cnsMult = cnsSensitivityMultiplier(profile);
  if (rawScore < 60 && cnsMult > 1.0) {
    const deficit = 60 - rawScore;
    rawScore = 60 - deficit * cnsMult;
    flags.push(`CNS sensitivity applied (${cnsMult}x deficit amplification)`);
  }

  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  // Map score to coefficient (0-100 → 0.70-1.10)
  // 50 = 1.0 (baseline), each point = 0.008 coefficient change
  const coefficient =
    Math.round(Math.max(0.7, Math.min(1.1, 1.0 + (score - 50) * 0.008)) * 1000) / 1000;

  // Generate flags
  if (snapshot.hrvMs !== null && snapshot.hrvMs < baseline * 0.75) {
    flags.push("HRV significantly below baseline (>25% drop)");
  }
  if (snapshot.sleepHours !== null && snapshot.sleepHours < 6) {
    flags.push("Sleep deprivation detected (<6 hours)");
  }
  if (snapshot.soreness !== null && snapshot.soreness >= 8) {
    flags.push("Severe soreness reported");
  }
  if (score < 35) {
    flags.push("DELOAD RECOMMENDED: Readiness critically low");
  }

  return {
    score,
    coefficient,
    flags,
    breakdown: {
      hrvComponent,
      sleepComponent,
      subjectiveComponent,
    },
  };
}

/**
 * Calculate 7-day rolling HRV baseline from an array of entries.
 */
export function calculateHrvBaseline(
  entries: { hrvMs: number | null; date: string | Date }[]
): number | null {
  const validEntries = entries
    .filter((e) => e.hrvMs !== null)
    .map((e) => e.hrvMs as number);
  if (validEntries.length === 0) return null;
  return Math.round((validEntries.reduce((a, b) => a + b, 0) / validEntries.length) * 10) / 10;
}
