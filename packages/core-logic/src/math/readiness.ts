import type { BiometricSnapshot, ReadinessResult, AthleteProfile } from "../types";

/**
 * Readiness Coefficient (Rc) calculation — Population-Norm Approach.
 *
 * Uses population-level norms that work immediately for new users without
 * needing baseline data. When individual baselines are available, they are
 * blended in (60% population norm + 40% individual deviation).
 *
 * Components and weights:
 *   1. HRV component (30%) — population-norm brackets
 *   2. Sleep component (25%) — duration brackets + quality multiplier
 *   3. Subjective component (30%) — absolute 1-10 scale mapped to 0-100
 *   4. RHR component (15% when available, redistributed when not)
 *
 * Output:
 *   - score: 0-100 (human-readable)
 *   - coefficient: 0.70 - 1.10 (multiplier for volume/intensity)
 *
 * Elite scaling: For athletes with strength-to-bodyweight ratios > 2.0,
 * negative readiness signals are amplified (CNS sensitivity is higher).
 */

// =============================================================================
// HRV COMPONENT — Population Norm Brackets (30%)
// =============================================================================

/**
 * Score HRV using population-level norms for strength athletes.
 * If an individual baseline is provided, blend 60% population + 40% individual.
 */
function calcHrvComponent(
  hrvMs: number | null,
  hrvBaseline: number | null
): number {
  if (hrvMs === null) return 50; // neutral when missing

  // Population-norm bracket scoring
  let popScore: number;
  if (hrvMs < 30) {
    popScore = 15; // very poor
  } else if (hrvMs < 40) {
    popScore = 30; // poor
  } else if (hrvMs < 55) {
    popScore = 50; // fair
  } else if (hrvMs < 70) {
    popScore = 70; // good
  } else if (hrvMs < 90) {
    popScore = 85; // very good
  } else {
    popScore = 95; // excellent
  }

  // If individual baseline is available, blend in personal deviation
  if (hrvBaseline !== null && hrvBaseline > 0) {
    const deviation = (hrvMs - hrvBaseline) / hrvBaseline;
    // Map deviation to 0-100: -30% → 20, 0% → 60, +30% → 90
    const individualScore = Math.max(0, Math.min(100, 60 + deviation * 100));
    // 60% population norm + 40% individual deviation
    return Math.round(popScore * 0.6 + individualScore * 0.4);
  }

  return popScore;
}

// =============================================================================
// SLEEP COMPONENT — Duration Brackets + Quality Multiplier (25%)
// =============================================================================

function calcSleepComponent(
  sleepHours: number | null,
  sleepQuality: number | null
): number {
  if (sleepHours === null && sleepQuality === null) return 50; // neutral

  // Duration bracket scoring
  let durationScore = 50;
  if (sleepHours !== null) {
    if (sleepHours < 5) {
      durationScore = 15;
    } else if (sleepHours < 6) {
      durationScore = 30;
    } else if (sleepHours < 7) {
      durationScore = 55;
    } else if (sleepHours < 8) {
      durationScore = 75;
    } else if (sleepHours < 9) {
      durationScore = 90;
    } else {
      durationScore = 85; // diminishing returns past 9h
    }
  }

  // Quality multiplier: quality/10 * 0.3 + 0.7
  // quality 10 → 1.0, quality 1 → 0.73, quality 5 → 0.85
  if (sleepQuality !== null) {
    const qualityMultiplier = (sleepQuality / 10) * 0.3 + 0.7;
    durationScore = durationScore * qualityMultiplier;
  }

  return Math.round(Math.max(0, Math.min(100, durationScore)));
}

// =============================================================================
// SUBJECTIVE COMPONENT — Absolute 1-10 Scale (30%)
// =============================================================================

function calcSubjectiveComponent(snapshot: BiometricSnapshot): number {
  const fields: { value: number | null; weight: number; invert: boolean }[] = [
    { value: snapshot.mood, weight: 0.3, invert: false },       // 7/10 → 70
    { value: snapshot.soreness, weight: 0.25, invert: true },   // 7/10 → 30
    { value: snapshot.energy, weight: 0.3, invert: false },     // 7/10 → 70
    { value: snapshot.stress, weight: 0.15, invert: true },     // 7/10 → 30
  ];

  let totalWeight = 0;
  let weightedSum = 0;

  for (const f of fields) {
    if (f.value !== null) {
      // Direct map: value/10 * 100 for normal, (11-value)/10 * 100 for inverted
      const mapped = f.invert ? ((11 - f.value) / 10) * 100 : (f.value / 10) * 100;
      weightedSum += mapped * f.weight;
      totalWeight += f.weight;
    }
  }

  if (totalWeight === 0) return 50; // all missing = neutral
  return Math.round(Math.max(0, Math.min(100, weightedSum / totalWeight)));
}

// =============================================================================
// RHR COMPONENT — Population Norm Brackets (15% when available)
// =============================================================================

function calcRhrComponent(restingHeartRate: number | null): number | null {
  if (restingHeartRate === null) return null;

  if (restingHeartRate < 50) return 90;   // well-trained athlete
  if (restingHeartRate < 60) return 75;   // good
  if (restingHeartRate < 70) return 55;   // average
  return 35;                               // elevated — possible fatigue/stress
}

// =============================================================================
// CNS SENSITIVITY — Elite Athlete Deficit Amplification
// =============================================================================

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
  if (maxRatio <= 2.0) return 1.0;  // novice/intermediate
  if (maxRatio <= 2.5) return 1.1;
  if (maxRatio <= 3.0) return 1.2;
  if (maxRatio <= 3.5) return 1.35;
  return 1.5; // elite: 3.5x+ BW ratio
}

// =============================================================================
// PRIMARY READINESS CALCULATION
// =============================================================================

/**
 * Calculate composite readiness score using population-level norms.
 *
 * @param snapshot - Today's biometric data
 * @param profile - Athlete profile for CNS scaling
 * @param hrvBaseline - 7-day rolling average HRV (pass null to use pure population norms)
 */
export function calculateReadiness(
  snapshot: BiometricSnapshot,
  profile: AthleteProfile,
  hrvBaseline: number | null = null
): ReadinessResult {
  const flags: string[] = [];

  // Calculate each component
  const hrvComponent = calcHrvComponent(snapshot.hrvMs, hrvBaseline);
  const sleepComponent = calcSleepComponent(snapshot.sleepHours, snapshot.sleepQuality);
  const subjectiveComponent = calcSubjectiveComponent(snapshot);
  const rhrComponent = calcRhrComponent(snapshot.restingHeartRate);

  // Dynamic weight allocation based on RHR availability
  let rawScore: number;
  if (rhrComponent !== null) {
    // All four components: HRV 30%, Sleep 25%, Subjective 30%, RHR 15%
    rawScore =
      hrvComponent * 0.30 +
      sleepComponent * 0.25 +
      subjectiveComponent * 0.30 +
      rhrComponent * 0.15;
  } else {
    // Redistribute RHR weight: HRV 35%, Sleep 30%, Subjective 35%
    rawScore =
      hrvComponent * 0.35 +
      sleepComponent * 0.30 +
      subjectiveComponent * 0.35;
  }

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

  // Generate contextual flags
  if (snapshot.hrvMs !== null && snapshot.hrvMs < 30) {
    flags.push("HRV critically low (<30ms)");
  } else if (snapshot.hrvMs !== null && hrvBaseline !== null && snapshot.hrvMs < hrvBaseline * 0.75) {
    flags.push("HRV significantly below personal baseline (>25% drop)");
  }
  if (snapshot.sleepHours !== null && snapshot.sleepHours < 5) {
    flags.push("Severe sleep deprivation (<5 hours)");
  } else if (snapshot.sleepHours !== null && snapshot.sleepHours < 6) {
    flags.push("Sleep deprivation detected (<6 hours)");
  }
  if (snapshot.soreness !== null && snapshot.soreness >= 8) {
    flags.push("Severe soreness reported");
  }
  if (snapshot.restingHeartRate !== null && snapshot.restingHeartRate > 70) {
    flags.push("Elevated resting heart rate (>70 bpm)");
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
      rhrComponent,
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
