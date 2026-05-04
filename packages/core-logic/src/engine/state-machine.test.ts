import { describe, expect, it } from "vitest";
import {
  advanceDay,
  evaluateTransition,
  getNextPhase,
  macrocycleProgress,
} from "./state-machine";
import type { BlockState } from "../types";

/**
 * Periodization state machine tests.
 *
 * Phase order: HYPERTROPHY (4w) → STRENGTH (4w) → PEAKING (3w) → DELOAD (1w)
 * After DELOAD the macrocycle is COMPLETED (the impl flips status, not phase).
 *
 * Emergency deload: 3+ consecutive low-readiness days triggers DELOAD
 * regardless of current phase (unless already in DELOAD).
 */

function block(overrides: Partial<BlockState> = {}): BlockState {
  return {
    phase: "HYPERTROPHY",
    status: "ACTIVE",
    weekCount: 4,
    currentWeek: 1,
    currentDay: 1,
    startDate: "2026-04-01",
    ...overrides,
  };
}

describe("evaluateTransition — scheduled phase transitions", () => {
  it("HYPERTROPHY → STRENGTH after week 4 completes (currentWeek > weekCount)", () => {
    const before = block({ phase: "HYPERTROPHY", currentWeek: 5, weekCount: 4 });
    const t = evaluateTransition(before);
    expect(t.transitioned).toBe(true);
    expect(t.nextState.phase).toBe("STRENGTH");
    expect(t.nextState.currentWeek).toBe(1);
    expect(t.nextState.currentDay).toBe(1);
    expect(t.nextState.weekCount).toBe(4); // STRENGTH is 4 weeks
  });

  it("STRENGTH → PEAKING (3 week count)", () => {
    const t = evaluateTransition(block({ phase: "STRENGTH", currentWeek: 5, weekCount: 4 }));
    expect(t.transitioned).toBe(true);
    expect(t.nextState.phase).toBe("PEAKING");
    expect(t.nextState.weekCount).toBe(3);
  });

  it("PEAKING → DELOAD (1 week count)", () => {
    const t = evaluateTransition(block({ phase: "PEAKING", currentWeek: 4, weekCount: 3 }));
    expect(t.transitioned).toBe(true);
    expect(t.nextState.phase).toBe("DELOAD");
    expect(t.nextState.weekCount).toBe(1);
  });

  it("DELOAD complete → status COMPLETED (macrocycle done)", () => {
    const t = evaluateTransition(block({ phase: "DELOAD", currentWeek: 2, weekCount: 1 }));
    expect(t.transitioned).toBe(true);
    expect(t.nextState.status).toBe("COMPLETED");
    expect(t.reason).toMatch(/macrocycle complete/i);
  });

  it("no transition mid-phase (currentWeek <= weekCount)", () => {
    const before = block({ phase: "HYPERTROPHY", currentWeek: 2, weekCount: 4 });
    const t = evaluateTransition(before);
    expect(t.transitioned).toBe(false);
    expect(t.nextState.phase).toBe("HYPERTROPHY");
    expect(t.reason).toMatch(/continuing HYPERTROPHY/i);
  });
});

describe("evaluateTransition — emergency deload trigger", () => {
  it("3+ consecutive low-readiness days during HYPERTROPHY forces DELOAD", () => {
    const t = evaluateTransition(block({ phase: "HYPERTROPHY", currentWeek: 2 }), 3);
    expect(t.transitioned).toBe(true);
    expect(t.nextState.phase).toBe("DELOAD");
    expect(t.nextState.currentWeek).toBe(1);
    expect(t.nextState.currentDay).toBe(1);
    expect(t.reason).toMatch(/emergency deload/i);
  });

  it("3+ consecutive low days during STRENGTH also triggers", () => {
    const t = evaluateTransition(block({ phase: "STRENGTH", currentWeek: 2 }), 4);
    expect(t.transitioned).toBe(true);
    expect(t.nextState.phase).toBe("DELOAD");
  });

  it("2 consecutive low days does NOT trigger emergency deload", () => {
    const t = evaluateTransition(block({ phase: "HYPERTROPHY", currentWeek: 2 }), 2);
    expect(t.transitioned).toBe(false);
    expect(t.nextState.phase).toBe("HYPERTROPHY");
  });

  it("emergency deload is suppressed when already in DELOAD (no double-deload)", () => {
    const t = evaluateTransition(block({ phase: "DELOAD", currentWeek: 1, weekCount: 1 }), 5);
    expect(t.transitioned).toBe(false);
    expect(t.nextState.phase).toBe("DELOAD");
  });
});

describe("advanceDay", () => {
  it("increments currentDay within a week", () => {
    const next = advanceDay(block({ currentDay: 2 }), 4);
    expect(next.currentDay).toBe(3);
    expect(next.currentWeek).toBe(1);
  });

  it("rolls over to next week after the last training day", () => {
    const next = advanceDay(block({ currentDay: 4, currentWeek: 1 }), 4);
    expect(next.currentDay).toBe(1);
    expect(next.currentWeek).toBe(2);
  });

  it("respects custom training days per week", () => {
    const next = advanceDay(block({ currentDay: 5, currentWeek: 2 }), 5);
    expect(next.currentDay).toBe(1);
    expect(next.currentWeek).toBe(3);
  });
});

describe("getNextPhase", () => {
  it("HYPERTROPHY → STRENGTH", () => {
    expect(getNextPhase("HYPERTROPHY")).toBe("STRENGTH");
  });
  it("STRENGTH → PEAKING", () => {
    expect(getNextPhase("STRENGTH")).toBe("PEAKING");
  });
  it("PEAKING → DELOAD", () => {
    expect(getNextPhase("PEAKING")).toBe("DELOAD");
  });
  it("DELOAD → null (end of macrocycle)", () => {
    expect(getNextPhase("DELOAD")).toBeNull();
  });
});

describe("macrocycleProgress", () => {
  it("0% at HYPERTROPHY week 1 day 1", () => {
    expect(macrocycleProgress(block())).toBe(0);
  });

  it("monotonic across phase progression (week 1 of each phase)", () => {
    const hyper = macrocycleProgress(block({ phase: "HYPERTROPHY", currentWeek: 1, weekCount: 4 }));
    const str = macrocycleProgress(block({ phase: "STRENGTH", currentWeek: 1, weekCount: 4 }));
    const peak = macrocycleProgress(block({ phase: "PEAKING", currentWeek: 1, weekCount: 3 }));
    const del = macrocycleProgress(block({ phase: "DELOAD", currentWeek: 1, weekCount: 1 }));
    expect(str).toBeGreaterThan(hyper);
    expect(peak).toBeGreaterThan(str);
    expect(del).toBeGreaterThan(peak);
  });

  it("returns a value <= 100 in DELOAD's last week", () => {
    const p = macrocycleProgress(block({ phase: "DELOAD", currentWeek: 1, weekCount: 1 }));
    expect(p).toBeLessThanOrEqual(100);
  });
});
