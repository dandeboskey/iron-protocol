import { describe, expect, it } from "vitest";
import { calculateHrvBaseline, calculateReadiness } from "./readiness";
import type { AthleteProfile, BiometricSnapshot } from "../types";

/**
 * Readiness scoring tests.
 *
 * The math is documented in src/math/readiness.ts. The composite score is
 * 0-100, mapped linearly into a coefficient on [0.70, 1.10] via
 *   coefficient = clamp(1.0 + (score - 50) * 0.008, 0.70, 1.10)
 *
 * Component weights when all components present:
 *   HRV 30%, Sleep 25%, Subjective 30%, RHR 15%
 * When RHR is absent the weights redistribute to:
 *   HRV 35%, Sleep 30%, Subjective 35%
 *
 * CNS sensitivity multiplier amplifies deficits below 60 when bwRatio > 2.0,
 * up to 1.5x at 3.5x+. Positive signals are NOT amplified.
 */

const NOVICE_PROFILE: AthleteProfile = {
  bodyweightLbs: 195,
  experienceYrs: 1,
  e1rms: { Squat: 200, "Bench Press": 150, Deadlift: 250 }, // ratio 1.28x
};

const INTERMEDIATE_PROFILE: AthleteProfile = {
  bodyweightLbs: 195,
  experienceYrs: 3,
  e1rms: { Squat: 350, "Bench Press": 250, Deadlift: 390 }, // ratio 2.0x
};

const ELITE_PROFILE: AthleteProfile = {
  bodyweightLbs: 195,
  experienceYrs: 5,
  e1rms: { Squat: 500, "Bench Press": 335, Deadlift: 705 }, // ratio 3.6x
};

const PERFECT_INPUT: BiometricSnapshot = {
  hrvMs: 95,
  sleepHours: 8,
  sleepQuality: 10,
  mood: 10,
  soreness: 1,
  energy: 10,
  stress: 1,
  restingHeartRate: 45, // <50 → top RHR bracket (90)
  respiratoryRate: 14,
};

const TERRIBLE_INPUT: BiometricSnapshot = {
  hrvMs: 25,
  sleepHours: 4,
  sleepQuality: 3,
  mood: 3,
  soreness: 9,
  energy: 3,
  stress: 9,
  restingHeartRate: 80,
  respiratoryRate: 18,
};

const MID_INPUT_NO_RHR: BiometricSnapshot = {
  hrvMs: 50,
  sleepHours: 6.5,
  sleepQuality: 6,
  mood: 5,
  soreness: 5,
  energy: 5,
  stress: 5,
  restingHeartRate: null,
  respiratoryRate: null,
};

describe("calculateReadiness — boundary inputs", () => {
  it("all-perfect input produces coefficient ≈ 1.10 (clamped at ceiling)", () => {
    const r = calculateReadiness(PERFECT_INPUT, ELITE_PROFILE);
    expect(r.coefficient).toBeCloseTo(1.10, 2);
    expect(r.score).toBeGreaterThanOrEqual(90);
  });

  it("all-bad input on an elite athlete drops coefficient to ≤ 0.75", () => {
    const r = calculateReadiness(TERRIBLE_INPUT, ELITE_PROFILE);
    expect(r.coefficient).toBeLessThanOrEqual(0.75);
    // CNS amplification flag should be present at this BW ratio.
    expect(r.flags.some((f) => /CNS sensitivity/i.test(f))).toBe(true);
  });

  it("mid-range input (no RHR) produces coefficient ≈ 1.0", () => {
    const r = calculateReadiness(MID_INPUT_NO_RHR, INTERMEDIATE_PROFILE);
    expect(r.coefficient).toBeCloseTo(1.0, 1);
    // breakdown.rhrComponent is null when RHR missing — weights redistributed.
    expect(r.breakdown.rhrComponent).toBeNull();
  });
});

describe("calculateReadiness — RHR weight redistribution", () => {
  it("with RHR absent, coefficient stays bounded in [0.70, 1.10]", () => {
    const noRhr: BiometricSnapshot = { ...PERFECT_INPUT, restingHeartRate: null };
    const r = calculateReadiness(noRhr, ELITE_PROFILE);
    expect(r.coefficient).toBeGreaterThanOrEqual(0.70);
    expect(r.coefficient).toBeLessThanOrEqual(1.10);
    expect(r.breakdown.rhrComponent).toBeNull();
  });

  it("with RHR present, breakdown reports the rhrComponent", () => {
    const r = calculateReadiness(PERFECT_INPUT, ELITE_PROFILE);
    expect(r.breakdown.rhrComponent).not.toBeNull();
    expect(r.breakdown.rhrComponent).toBeGreaterThan(0);
  });
});

describe("calculateReadiness — CNS sensitivity multiplier", () => {
  it("low Rc at bwRatio=3.6× yields a strictly lower coefficient than at bwRatio≈2.0×", () => {
    const elite = calculateReadiness(TERRIBLE_INPUT, ELITE_PROFILE);
    const intermediate = calculateReadiness(TERRIBLE_INPUT, INTERMEDIATE_PROFILE);
    expect(elite.coefficient).toBeLessThan(intermediate.coefficient);
  });

  it("low Rc at bwRatio≈2.0× lower than novice (~1.3×) — directionality", () => {
    const intermediate = calculateReadiness(TERRIBLE_INPUT, INTERMEDIATE_PROFILE);
    const novice = calculateReadiness(TERRIBLE_INPUT, NOVICE_PROFILE);
    expect(intermediate.coefficient).toBeLessThanOrEqual(novice.coefficient);
  });

  it("positive signals are NOT amplified by high BW ratio (ceiling 1.10)", () => {
    const elite = calculateReadiness(PERFECT_INPUT, ELITE_PROFILE);
    const novice = calculateReadiness(PERFECT_INPUT, NOVICE_PROFILE);
    expect(elite.coefficient).toBeCloseTo(novice.coefficient, 2);
    expect(elite.coefficient).toBeLessThanOrEqual(1.10);
  });
});

describe("calculateReadiness — monotonicity", () => {
  it("increasing HRV does not decrease Rc (holding everything else fixed)", () => {
    const base: BiometricSnapshot = { ...MID_INPUT_NO_RHR, hrvMs: 35 };
    const better: BiometricSnapshot = { ...MID_INPUT_NO_RHR, hrvMs: 75 };
    const rBase = calculateReadiness(base, INTERMEDIATE_PROFILE);
    const rBetter = calculateReadiness(better, INTERMEDIATE_PROFILE);
    expect(rBetter.coefficient).toBeGreaterThanOrEqual(rBase.coefficient);
  });

  it("increasing sleep duration does not decrease Rc", () => {
    const four: BiometricSnapshot = { ...MID_INPUT_NO_RHR, sleepHours: 4 };
    const eight: BiometricSnapshot = { ...MID_INPUT_NO_RHR, sleepHours: 8 };
    const rFour = calculateReadiness(four, INTERMEDIATE_PROFILE);
    const rEight = calculateReadiness(eight, INTERMEDIATE_PROFILE);
    expect(rEight.coefficient).toBeGreaterThanOrEqual(rFour.coefficient);
  });

  it("decreasing soreness does not decrease Rc (subjective field is inverted)", () => {
    const sore: BiometricSnapshot = { ...MID_INPUT_NO_RHR, soreness: 9 };
    const fresh: BiometricSnapshot = { ...MID_INPUT_NO_RHR, soreness: 1 };
    const rSore = calculateReadiness(sore, INTERMEDIATE_PROFILE);
    const rFresh = calculateReadiness(fresh, INTERMEDIATE_PROFILE);
    expect(rFresh.coefficient).toBeGreaterThanOrEqual(rSore.coefficient);
  });

  it("increasing energy does not decrease Rc", () => {
    const low: BiometricSnapshot = { ...MID_INPUT_NO_RHR, energy: 2 };
    const high: BiometricSnapshot = { ...MID_INPUT_NO_RHR, energy: 9 };
    const rLow = calculateReadiness(low, INTERMEDIATE_PROFILE);
    const rHigh = calculateReadiness(high, INTERMEDIATE_PROFILE);
    expect(rHigh.coefficient).toBeGreaterThanOrEqual(rLow.coefficient);
  });
});

describe("calculateReadiness — coefficient bounds", () => {
  it("coefficient is always in [0.70, 1.10] across a wide input sweep", () => {
    const profiles: AthleteProfile[] = [NOVICE_PROFILE, INTERMEDIATE_PROFILE, ELITE_PROFILE];
    const inputs: BiometricSnapshot[] = [PERFECT_INPUT, TERRIBLE_INPUT, MID_INPUT_NO_RHR];
    for (const p of profiles) {
      for (const i of inputs) {
        const r = calculateReadiness(i, p);
        expect(r.coefficient).toBeGreaterThanOrEqual(0.70);
        expect(r.coefficient).toBeLessThanOrEqual(1.10);
      }
    }
  });
});

describe("calculateReadiness — flags", () => {
  it("emits 'HRV critically low' flag when hrvMs<30", () => {
    const r = calculateReadiness({ ...PERFECT_INPUT, hrvMs: 25 }, INTERMEDIATE_PROFILE);
    expect(r.flags.some((f) => /HRV critically low/i.test(f))).toBe(true);
  });

  it("emits a sleep deprivation flag when sleep<5", () => {
    const r = calculateReadiness({ ...PERFECT_INPUT, sleepHours: 4.5 }, INTERMEDIATE_PROFILE);
    expect(r.flags.some((f) => /sleep deprivation/i.test(f))).toBe(true);
  });

  it("emits 'DELOAD RECOMMENDED' when score critically low", () => {
    const r = calculateReadiness(TERRIBLE_INPUT, ELITE_PROFILE);
    expect(r.flags.some((f) => /DELOAD/i.test(f))).toBe(true);
  });
});

describe("calculateHrvBaseline", () => {
  it("returns null on empty / all-null entries", () => {
    expect(calculateHrvBaseline([])).toBeNull();
    expect(
      calculateHrvBaseline([
        { hrvMs: null, date: "2026-04-21" },
        { hrvMs: null, date: "2026-04-22" },
      ])
    ).toBeNull();
  });

  it("averages non-null HRV values, rounded to 0.1 ms", () => {
    const baseline = calculateHrvBaseline([
      { hrvMs: 50, date: "2026-04-21" },
      { hrvMs: 60, date: "2026-04-22" },
      { hrvMs: 70, date: "2026-04-23" },
    ]);
    expect(baseline).toBeCloseTo(60, 1);
  });

  it("ignores null entries when averaging", () => {
    const baseline = calculateHrvBaseline([
      { hrvMs: 50, date: "2026-04-21" },
      { hrvMs: null, date: "2026-04-22" },
      { hrvMs: 70, date: "2026-04-23" },
    ]);
    expect(baseline).toBeCloseTo(60, 1);
  });
});
