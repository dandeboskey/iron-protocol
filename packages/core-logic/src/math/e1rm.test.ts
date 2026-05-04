import { describe, expect, it } from "vitest";
import {
  brzyckiE1RM,
  compositeE1RM,
  epleyE1RM,
  exerciseINOL,
  setINOL,
  targetWeight,
} from "./e1rm";

/**
 * e1RM estimation tests.
 *
 * Composite formula = 0.6 * Epley + 0.4 * Brzycki, capped at 12 reps.
 * Implementation rounds Epley & Brzycki independently to 0.1 before
 * combining, then rounds the composite to 0.1, so toBeCloseTo is required
 * for any non-trivial reference value.
 */

describe("epleyE1RM", () => {
  it("returns the lifted weight at 1 rep (formula reduces to w)", () => {
    expect(epleyE1RM(315, 1)).toBe(315);
    expect(epleyE1RM(705, 1)).toBe(705);
  });

  it("computes 5RM at 315 lbs as 367.5 (315 * (1 + 5/30))", () => {
    expect(epleyE1RM(315, 5)).toBeCloseTo(367.5, 2);
  });

  it("computes 10RM at 225 lbs as 300", () => {
    expect(epleyE1RM(225, 10)).toBeCloseTo(300, 2);
  });

  it("clamps reps at 12: estimateE1RM(w, 15) === estimateE1RM(w, 12)", () => {
    expect(epleyE1RM(315, 15)).toBe(epleyE1RM(315, 12));
    expect(epleyE1RM(315, 100)).toBe(epleyE1RM(315, 12));
  });

  it("returns 0 for non-positive reps (edge: doc'd behavior, not throw)", () => {
    expect(epleyE1RM(315, 0)).toBe(0);
    expect(epleyE1RM(315, -1)).toBe(0);
  });

  it("returns 0 for non-positive weight", () => {
    expect(epleyE1RM(0, 5)).toBe(0);
    expect(epleyE1RM(-100, 5)).toBe(0);
  });
});

describe("brzyckiE1RM", () => {
  it("returns the lifted weight at 1 rep", () => {
    expect(brzyckiE1RM(315, 1)).toBe(315);
    expect(brzyckiE1RM(705, 1)).toBe(705);
  });

  it("computes 5RM at 315 lbs as ~354.4 (315 * 36 / 32)", () => {
    // Pure formula: 315 * 36 / 32 = 354.375. Implementation rounds to 0.1.
    expect(brzyckiE1RM(315, 5)).toBeCloseTo(354.4, 2);
  });

  it("computes 10RM at 225 lbs as 300", () => {
    expect(brzyckiE1RM(225, 10)).toBeCloseTo(300, 2);
  });

  it("clamps reps at 12: brzyckiE1RM(w, 15) === brzyckiE1RM(w, 12)", () => {
    expect(brzyckiE1RM(315, 15)).toBe(brzyckiE1RM(315, 12));
  });

  it("returns 0 for non-positive reps", () => {
    expect(brzyckiE1RM(315, 0)).toBe(0);
  });

  it("BUG: pole guard runs before 12-rep clamp, so reps>=37 returns 0 instead of clamping", () => {
    // The 12-rep clamp should make reps>=12 indistinguishable from reps=12,
    // but the `if (reps >= 37) return 0` check fires first. Documented in
    // docs/qol-checklist.md (Round 4).
    expect(brzyckiE1RM(315, 37)).toBe(0);
    expect(brzyckiE1RM(315, 100)).toBe(0);
  });
});

describe("compositeE1RM", () => {
  it("equals weight at 1 rep (both formulas reduce to w)", () => {
    expect(compositeE1RM(315, 1)).toBe(315);
    expect(compositeE1RM(705, 1)).toBe(705);
  });

  it("5x5 at 315 lbs ≈ 362.3 (composite of 367.5 / 354.4)", () => {
    // Reference math: 0.6*367.5 + 0.4*354.4 = 362.26 → 362.3 after impl rounding
    expect(compositeE1RM(315, 5)).toBeCloseTo(362.3, 1);
  });

  it("10RM at 225 lbs is exactly 300 (both inputs equal 300)", () => {
    expect(compositeE1RM(225, 10)).toBeCloseTo(300, 2);
  });

  it("caps at 12 reps: compositeE1RM(w, 15) === compositeE1RM(w, 12)", () => {
    expect(compositeE1RM(315, 15)).toBe(compositeE1RM(315, 12));
  });

  it("returns 0 for non-positive reps", () => {
    expect(compositeE1RM(315, 0)).toBe(0);
  });
});

describe("targetWeight", () => {
  it("rounds to nearest 5 lbs", () => {
    expect(targetWeight(500, 0.7)).toBe(350);
    expect(targetWeight(705, 0.85)).toBe(600); // 599.25 → 600
  });

  it("returns 0 for invalid inputs", () => {
    expect(targetWeight(0, 0.8)).toBe(0);
    expect(targetWeight(500, 0)).toBe(0);
  });
});

describe("setINOL / exerciseINOL", () => {
  it("setINOL: 5 reps at 80% intensity = 5/(100-80) = 0.25", () => {
    expect(setINOL(5, 80)).toBeCloseTo(0.25, 3);
  });

  it("exerciseINOL: 4 sets * 5 reps at 80% = 1.0", () => {
    expect(exerciseINOL(4, 5, 80)).toBeCloseTo(1.0, 3);
  });
});
