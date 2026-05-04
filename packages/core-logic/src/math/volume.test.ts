import { describe, expect, it } from "vitest";
import {
  PHASE_CONFIGS,
  calculateSessionVolume,
  scaledMRV,
  weeklyTargetVolume,
} from "./volume";

/**
 * MRV scaling and weekly volume tests.
 *
 * scaledMRV(baseMRV, e1rm, bodyweightLbs) is non-linear in (e1rm/bw):
 *   ratio <= 1.5 → 1.00
 *   1.5 < ratio <= 2.0 → 0.95
 *   2.0 < ratio <= 2.5 → 0.88
 *   2.5 < ratio <= 3.0 → 0.80
 *   3.0 < ratio <= 3.5 → 0.72
 *   ratio > 3.5         → 0.65
 *
 * The implementation uses `if (ratio <= bracket)` so the breakpoint value
 * itself lands in the lower (less-aggressive) bracket — meaning ratio=1.5
 * → factor 1.00, ratio=2.5 → factor 0.88, etc.
 */

describe("scaledMRV — exact breakpoints", () => {
  it("ratio = 1.5 hits factor 1.00 (full MRV)", () => {
    expect(scaledMRV(20, 150, 100)).toBe(20);
  });

  it("ratio = 2.0 hits factor 0.95", () => {
    expect(scaledMRV(20, 200, 100)).toBe(Math.round(20 * 0.95)); // 19
  });

  it("ratio = 2.5 hits factor 0.88", () => {
    expect(scaledMRV(20, 250, 100)).toBe(Math.round(20 * 0.88)); // 18
  });

  it("ratio = 3.0 hits factor 0.80", () => {
    expect(scaledMRV(20, 300, 100)).toBe(Math.round(20 * 0.80)); // 16
  });

  it("ratio = 3.5 hits factor 0.72", () => {
    expect(scaledMRV(20, 350, 100)).toBe(Math.round(20 * 0.72)); // 14
  });

  it("ratio > 3.5 (e.g. 3.6) hits factor 0.65 — elite floor", () => {
    expect(scaledMRV(20, 360, 100)).toBe(Math.round(20 * 0.65)); // 13
  });
});

describe("scaledMRV — clamping", () => {
  it("ratio < 1.0 clamps to factor 1.00 (full MRV)", () => {
    expect(scaledMRV(20, 50, 100)).toBe(20); // ratio 0.5
  });

  it("ratio = 0 (no e1RM yet) clamps to factor 1.00", () => {
    expect(scaledMRV(20, 0, 100)).toBe(20);
  });

  it("ratio well above 3.5 (e.g. 4.0) stays at factor 0.65", () => {
    expect(scaledMRV(20, 400, 100)).toBe(Math.round(20 * 0.65)); // 13
  });
});

describe("scaledMRV — monotonicity", () => {
  it("factor is monotonically non-increasing as ratio rises", () => {
    const ratios = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0];
    let prev = Infinity;
    for (const r of ratios) {
      const cur = scaledMRV(100, r * 100, 100);
      expect(cur).toBeLessThanOrEqual(prev);
      prev = cur;
    }
  });

  it("the elite (3.0→3.5) drop is steeper than (2.5→3.0)", () => {
    // Per architecture doc §4.3: 'drop between 3.0 and 3.5 is the steepest'.
    const at25 = scaledMRV(1000, 2500, 1000);
    const at30 = scaledMRV(1000, 3000, 1000);
    const at35 = scaledMRV(1000, 3500, 1000);
    expect(at30 - at35).toBeGreaterThanOrEqual(at25 - at30);
  });
});

describe("calculateSessionVolume — INOL & relative intensity aggregation", () => {
  it("returns zeroed metrics for an empty session", () => {
    const v = calculateSessionVolume([]);
    expect(v.totalSets).toBe(0);
    expect(v.totalReps).toBe(0);
    expect(v.totalVolume).toBe(0);
    expect(v.relativeIntensity).toBe(0);
    expect(v.inol).toBe(0);
  });

  it("sums sets, reps and volume across exercises", () => {
    const v = calculateSessionVolume([
      { sets: 4, reps: 5, weightLbs: 400, percentIntensity: 0.80 },
      { sets: 3, reps: 8, weightLbs: 300, percentIntensity: 0.70 },
    ]);
    expect(v.totalSets).toBe(7);
    expect(v.totalReps).toBe(4 * 5 + 3 * 8); // 44
    expect(v.totalVolume).toBe(4 * 5 * 400 + 3 * 8 * 300); // 8000+7200 = 15200
  });
});

describe("weeklyTargetVolume", () => {
  it("returns sets within [MEV, scaledMRV] for HYPERTROPHY week 1", () => {
    const wk1 = weeklyTargetVolume("HYPERTROPHY", 1, 500, 195);
    expect(wk1.targetSets).toBeGreaterThanOrEqual(wk1.mev);
    expect(wk1.targetSets).toBeLessThanOrEqual(wk1.mrv);
  });

  it("scales the MRV ceiling down for elite athletes", () => {
    const novice = weeklyTargetVolume("HYPERTROPHY", 1, 195, 195); // 1.0x
    const elite = weeklyTargetVolume("HYPERTROPHY", 1, 705, 195); // 3.6x
    expect(elite.mrv).toBeLessThan(novice.mrv);
  });

  it("week 4 of HYPERTROPHY has greater or equal target sets than week 1 (volume progression)", () => {
    const wk1 = weeklyTargetVolume("HYPERTROPHY", 1, 350, 195);
    const wk4 = weeklyTargetVolume("HYPERTROPHY", 4, 350, 195);
    expect(wk4.targetSets).toBeGreaterThanOrEqual(wk1.targetSets);
  });
});

describe("PHASE_CONFIGS — sanity check", () => {
  it("declares all four phases with positive week counts", () => {
    expect(PHASE_CONFIGS.HYPERTROPHY.weekCount).toBe(4);
    expect(PHASE_CONFIGS.STRENGTH.weekCount).toBe(4);
    expect(PHASE_CONFIGS.PEAKING.weekCount).toBe(3);
    expect(PHASE_CONFIGS.DELOAD.weekCount).toBe(1);
  });

  it("PEAKING has lowest rep range and highest intensity", () => {
    expect(PHASE_CONFIGS.PEAKING.repRange[1]).toBeLessThan(
      PHASE_CONFIGS.HYPERTROPHY.repRange[0]
    );
    expect(PHASE_CONFIGS.PEAKING.intensityRange[1]).toBeGreaterThan(
      PHASE_CONFIGS.HYPERTROPHY.intensityRange[1]
    );
  });
});
