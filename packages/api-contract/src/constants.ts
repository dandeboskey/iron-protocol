import constants from "./constants.json";

/**
 * Domain constants — single source of truth across web/mobile/watch.
 *
 * Why JSON: the watch app reads the same values via `Bundle.main.url(forResource:
 * "constants", ...)` (see `apps/watch/IronProtocolWatch/Resources/`). Keeping
 * the values in JSON instead of TS-only `const` objects means rebalancing a
 * Rc tier or MRV breakpoint is a one-line change in one file, not three.
 *
 * The math itself stays in `@iron-protocol/core-logic`. This module exports
 * the *values* the math reads, not the math.
 */

export interface ReadinessTier {
  /** Inclusive lower bound on Rc, when defined. */
  minRc?: number;
  /** Exclusive upper bound on Rc, when defined. */
  maxRc?: number;
  intensityDelta?: number;
  setDelta?: number;
  rpeDelta?: number;
  volumeFactor?: number;
}

export interface MrvScalePoint {
  /** Inclusive upper bound on the BW ratio for this tier. */
  bwRatio: number;
  /** Multiplier applied to the base MRV at this tier. */
  factor: number;
}

export interface PhaseDefinition {
  weeks: number;
}

export interface ProtocolConstants {
  readinessTiers: {
    boost: ReadinessTier;
    normal: ReadinessTier;
    reduce: ReadinessTier;
    regress: ReadinessTier;
    deload: ReadinessTier;
  };
  mrvScale: MrvScalePoint[];
  phases: Record<"HYPERTROPHY" | "STRENGTH" | "PEAKING" | "DELOAD", PhaseDefinition>;
  e1rmRepCap: number;
  emergencyDeloadConsecutiveLowDays: number;
}

export const PROTOCOL: ProtocolConstants = constants as ProtocolConstants;
