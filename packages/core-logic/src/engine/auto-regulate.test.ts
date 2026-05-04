import { describe, expect, it } from "vitest";
import { autoRegulate, autoRegulateSession } from "./auto-regulate";
import type {
  AthleteProfile,
  BasePrescription,
  ReadinessResult,
} from "../types";

/**
 * Auto-regulation tests.
 *
 * The 5-tier table (architecture.md §4.3.2):
 *   Rc >= 1.05         → +2.5% intensity on compounds
 *   0.95 <= Rc < 1.05  → plan as written
 *   0.85 <= Rc < 0.95  → -1 set, -0.5 RPE cap (compounds only)
 *   0.75 <= Rc < 0.85  → -2 sets, -5% intensity, -1.0 RPE
 *   Rc < 0.75          → deload-level session (50% volume)
 *
 * Boundaries (per implementation): tier check uses inclusive lower bound
 * via `>=`, so Rc=1.05 hits tier-1, Rc=0.95 hits tier-2, etc.
 */

const ATHLETE: AthleteProfile = {
  bodyweightLbs: 195,
  experienceYrs: 5,
  e1rms: { Squat: 500, "Bench Press": 335, Deadlift: 705 },
};

const COMPOUND_SQUAT: BasePrescription = {
  exerciseName: "Squat",
  sets: 5,
  reps: 5,
  rpe: 8.0,
  percentOfE1RM: 0.80,
  isAccessory: false,
};

const COMPOUND_BENCH: BasePrescription = {
  exerciseName: "Bench Press",
  sets: 4,
  reps: 6,
  rpe: 7.5,
  percentOfE1RM: 0.78,
  isAccessory: false,
};

const ACCESSORY_LEG_PRESS: BasePrescription = {
  exerciseName: "Leg Press",
  sets: 3,
  reps: 10,
  rpe: 8.0,
  percentOfE1RM: null,
  isAccessory: true,
};

const ACCESSORY_LATERAL_RAISE: BasePrescription = {
  exerciseName: "Lateral Raise",
  sets: 3,
  reps: 12,
  rpe: 8.5,
  percentOfE1RM: null,
  isAccessory: true,
};

const SESSION: BasePrescription[] = [
  COMPOUND_SQUAT,
  COMPOUND_BENCH,
  ACCESSORY_LEG_PRESS,
  ACCESSORY_LATERAL_RAISE,
];

function makeReadiness(coefficient: number): ReadinessResult {
  return {
    score: 50,
    coefficient,
    flags: [],
    breakdown: {
      hrvComponent: 60,
      sleepComponent: 60,
      subjectiveComponent: 60,
      rhrComponent: 60,
    },
  };
}

describe("autoRegulate — Tier 1 (Rc >= 1.05): intensity bump on compounds", () => {
  it("adds 2.5% intensity on a compound (capped to phase intensity ceiling)", () => {
    const r = autoRegulate(COMPOUND_SQUAT, makeReadiness(1.08), "STRENGTH", ATHLETE);
    // STRENGTH ceiling is 0.88; 0.80 + 0.025 = 0.825 < 0.88 so unclamped.
    expect(r.adjustedPercentE1RM).toBeCloseTo(0.825, 3);
    expect(r.adjustedSets).toBe(COMPOUND_SQUAT.sets);
    expect(r.adjustedRpe).toBeCloseTo(COMPOUND_SQUAT.rpe, 3);
    expect(r.regulationNote).toMatch(/\+2\.5%/);
  });

  it("does NOT add intensity on accessories (no percentOfE1RM)", () => {
    const r = autoRegulate(ACCESSORY_LEG_PRESS, makeReadiness(1.08), "STRENGTH", ATHLETE);
    expect(r.adjustedPercentE1RM).toBeNull();
    expect(r.adjustedSets).toBe(ACCESSORY_LEG_PRESS.sets);
    expect(r.adjustedRpe).toBeCloseTo(ACCESSORY_LEG_PRESS.rpe, 3);
  });

  it("BOUNDARY: Rc = exactly 1.05 lands in Tier 1 (>=)", () => {
    const r = autoRegulate(COMPOUND_SQUAT, makeReadiness(1.05), "STRENGTH", ATHLETE);
    expect(r.regulationNote).toMatch(/high/i);
    expect(r.adjustedPercentE1RM).toBeCloseTo(0.825, 3);
  });
});

describe("autoRegulate — Tier 2 (0.95 <= Rc < 1.05): plan as written", () => {
  it("makes no changes to compound", () => {
    const r = autoRegulate(COMPOUND_SQUAT, makeReadiness(1.0), "STRENGTH", ATHLETE);
    expect(r.adjustedSets).toBe(COMPOUND_SQUAT.sets);
    expect(r.adjustedRpe).toBeCloseTo(COMPOUND_SQUAT.rpe, 3);
    expect(r.adjustedPercentE1RM).toBeCloseTo(0.80, 3);
    expect(r.regulationNote).toMatch(/nominal|no adjustments/i);
  });

  it("BOUNDARY: Rc = exactly 0.95 lands in Tier 2", () => {
    const r = autoRegulate(COMPOUND_SQUAT, makeReadiness(0.95), "STRENGTH", ATHLETE);
    expect(r.regulationNote).toMatch(/nominal|no adjustments/i);
  });
});

describe("autoRegulate — Tier 3 (0.85 <= Rc < 0.95): -1 set, -0.5 RPE on compounds only", () => {
  it("drops 1 set and 0.5 RPE on compound", () => {
    const r = autoRegulate(COMPOUND_SQUAT, makeReadiness(0.90), "STRENGTH", ATHLETE);
    expect(r.adjustedSets).toBe(COMPOUND_SQUAT.sets - 1); // 5 → 4
    expect(r.adjustedRpe).toBeCloseTo(COMPOUND_SQUAT.rpe - 0.5, 3); // 8.0 → 7.5
    expect(r.adjustedPercentE1RM).toBeCloseTo(0.80, 3); // intensity unchanged
  });

  it("does NOT change accessories at this tier (compound-only adjustment)", () => {
    const r = autoRegulate(ACCESSORY_LEG_PRESS, makeReadiness(0.90), "STRENGTH", ATHLETE);
    expect(r.adjustedSets).toBe(ACCESSORY_LEG_PRESS.sets);
    expect(r.adjustedRpe).toBeCloseTo(ACCESSORY_LEG_PRESS.rpe, 3);
  });

  it("BOUNDARY: Rc = exactly 0.85 lands in Tier 3", () => {
    const r = autoRegulate(COMPOUND_SQUAT, makeReadiness(0.85), "STRENGTH", ATHLETE);
    expect(r.adjustedSets).toBe(COMPOUND_SQUAT.sets - 1);
  });
});

describe("autoRegulate — Tier 4 (0.75 <= Rc < 0.85): -2 sets, -5% intensity, -1.0 RPE", () => {
  it("drops 2 sets, 5% intensity, 1.0 RPE on compound", () => {
    const r = autoRegulate(COMPOUND_SQUAT, makeReadiness(0.80), "STRENGTH", ATHLETE);
    expect(r.adjustedSets).toBe(COMPOUND_SQUAT.sets - 2); // 5 → 3
    expect(r.adjustedRpe).toBeCloseTo(COMPOUND_SQUAT.rpe - 1.0, 3); // 8.0 → 7.0
    expect(r.adjustedPercentE1RM).toBeCloseTo(0.75, 3); // 0.80 → 0.75 (clamped to STRENGTH min)
  });

  it("applies to accessories too at this tier (volume + RPE)", () => {
    const r = autoRegulate(ACCESSORY_LEG_PRESS, makeReadiness(0.80), "STRENGTH", ATHLETE);
    expect(r.adjustedSets).toBeLessThan(ACCESSORY_LEG_PRESS.sets);
  });

  it("BOUNDARY: Rc = exactly 0.75 lands in Tier 4", () => {
    const r = autoRegulate(COMPOUND_SQUAT, makeReadiness(0.75), "STRENGTH", ATHLETE);
    expect(r.adjustedSets).toBe(COMPOUND_SQUAT.sets - 2);
    expect(r.regulationNote).toMatch(/-2 sets|low/i);
  });
});

describe("autoRegulate — Tier 5 (Rc < 0.75): deload-level session", () => {
  it("scales volume to ~50% (ceil) on compound", () => {
    const r = autoRegulate(COMPOUND_SQUAT, makeReadiness(0.70), "STRENGTH", ATHLETE);
    // ceil(5 * 0.5) = 3 sets, max(2, 3) = 3
    expect(r.adjustedSets).toBe(3);
    expect(r.regulationNote).toMatch(/CRITICAL|deload/i);
  });

  it("scales volume to ~50% on accessories too — keeps the lift in the list", () => {
    const r = autoRegulate(ACCESSORY_LEG_PRESS, makeReadiness(0.70), "STRENGTH", ATHLETE);
    expect(r.adjustedSets).toBeLessThanOrEqual(ACCESSORY_LEG_PRESS.sets);
    expect(r.adjustedSets).toBeGreaterThanOrEqual(2); // lower bound clamp
    expect(r.exerciseName).toBe(ACCESSORY_LEG_PRESS.exerciseName); // not removed
  });

  it("RPE cap at 6.0 (deload session)", () => {
    const r = autoRegulate(COMPOUND_SQUAT, makeReadiness(0.65), "STRENGTH", ATHLETE);
    expect(r.adjustedRpe).toBeLessThanOrEqual(6.0);
  });
});

describe("autoRegulateSession — full session preserves lift list", () => {
  it("returns one regulated prescription per input, in order", () => {
    const out = autoRegulateSession(SESSION, makeReadiness(0.80), "STRENGTH", ATHLETE);
    expect(out.length).toBe(SESSION.length);
    out.forEach((p, i) => expect(p.exerciseName).toBe(SESSION[i].exerciseName));
  });

  it("at deload-tier Rc, every lift is still present (50% volume not 0% lifts)", () => {
    const out = autoRegulateSession(SESSION, makeReadiness(0.60), "STRENGTH", ATHLETE);
    expect(out.length).toBe(SESSION.length);
    out.forEach((p) => expect(p.adjustedSets).toBeGreaterThanOrEqual(2));
  });

  it("compound-only tier (Tier 3) leaves accessories unchanged but reduces compounds", () => {
    const out = autoRegulateSession(SESSION, makeReadiness(0.90), "STRENGTH", ATHLETE);
    const squat = out.find((p) => p.exerciseName === "Squat")!;
    const lats = out.find((p) => p.exerciseName === "Lateral Raise")!;
    expect(squat.adjustedSets).toBeLessThan(COMPOUND_SQUAT.sets);
    expect(lats.adjustedSets).toBe(ACCESSORY_LATERAL_RAISE.sets);
    expect(lats.adjustedRpe).toBeCloseTo(ACCESSORY_LATERAL_RAISE.rpe, 3);
  });
});

describe("autoRegulate — target weight calculation", () => {
  it("computes targetWeightLbs from athlete e1RM and adjusted percentage", () => {
    // Squat e1RM=500, plan 80% → 400 lbs
    const r = autoRegulate(COMPOUND_SQUAT, makeReadiness(1.0), "STRENGTH", ATHLETE);
    expect(r.targetWeightLbs).toBe(400);
  });

  it("returns null targetWeightLbs for accessories (no percentOfE1RM)", () => {
    const r = autoRegulate(ACCESSORY_LEG_PRESS, makeReadiness(1.0), "STRENGTH", ATHLETE);
    expect(r.targetWeightLbs).toBeNull();
  });

  it("Tier 1 +2.5% boost increases the target weight", () => {
    const nominal = autoRegulate(COMPOUND_SQUAT, makeReadiness(1.0), "STRENGTH", ATHLETE);
    const boosted = autoRegulate(COMPOUND_SQUAT, makeReadiness(1.08), "STRENGTH", ATHLETE);
    expect(boosted.targetWeightLbs!).toBeGreaterThan(nominal.targetWeightLbs!);
  });
});
