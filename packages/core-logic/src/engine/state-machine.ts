import type { Phase, BlockState, BlockTransition } from "../types";

/**
 * Block Periodization State Machine.
 *
 * Valid transitions:
 *   HYPERTROPHY → STRENGTH → PEAKING → DELOAD → (HYPERTROPHY or COMPLETED)
 *
 * Transition triggers:
 *   - Week count exhausted for current phase
 *   - Manual override (coach/athlete decision)
 *   - Emergency deload (readiness critically low for 3+ consecutive days)
 */

const PHASE_ORDER: Phase[] = ["HYPERTROPHY", "STRENGTH", "PEAKING", "DELOAD"];

const DEFAULT_WEEK_COUNTS: Record<Phase, number> = {
  HYPERTROPHY: 4,
  STRENGTH: 4,
  PEAKING: 3,
  DELOAD: 1,
};

/**
 * Evaluate whether a block should transition to the next phase.
 */
export function evaluateTransition(
  state: BlockState,
  consecutiveLowReadinessDays: number = 0
): BlockTransition {
  // Emergency deload: 3+ consecutive days with critically low readiness
  if (
    consecutiveLowReadinessDays >= 3 &&
    state.phase !== "DELOAD"
  ) {
    return {
      nextState: {
        ...state,
        phase: "DELOAD",
        currentWeek: 1,
        currentDay: 1,
        weekCount: 1,
      },
      transitioned: true,
      reason: `Emergency deload triggered: ${consecutiveLowReadinessDays} consecutive low-readiness days`,
    };
  }

  // Check if current phase is complete
  if (state.currentWeek > state.weekCount) {
    const currentIdx = PHASE_ORDER.indexOf(state.phase);
    const nextIdx = currentIdx + 1;

    if (nextIdx >= PHASE_ORDER.length) {
      // Full macrocycle complete
      return {
        nextState: { ...state, status: "COMPLETED" },
        transitioned: true,
        reason: "Macrocycle complete (all phases finished)",
      };
    }

    const nextPhase = PHASE_ORDER[nextIdx];
    return {
      nextState: {
        ...state,
        phase: nextPhase,
        currentWeek: 1,
        currentDay: 1,
        weekCount: DEFAULT_WEEK_COUNTS[nextPhase],
      },
      transitioned: true,
      reason: `Phase complete: ${state.phase} → ${nextPhase}`,
    };
  }

  // No transition needed
  return {
    nextState: state,
    transitioned: false,
    reason: `Continuing ${state.phase} — Week ${state.currentWeek}/${state.weekCount}`,
  };
}

/**
 * Advance the block state by one training day.
 * Assumes 4 training days per week.
 */
export function advanceDay(
  state: BlockState,
  trainingDaysPerWeek: number = 4
): BlockState {
  const nextDay = state.currentDay + 1;
  if (nextDay > trainingDaysPerWeek) {
    return {
      ...state,
      currentWeek: state.currentWeek + 1,
      currentDay: 1,
    };
  }
  return { ...state, currentDay: nextDay };
}

/**
 * Get the next phase in the macrocycle (for UI display).
 */
export function getNextPhase(currentPhase: Phase): Phase | null {
  const idx = PHASE_ORDER.indexOf(currentPhase);
  if (idx === -1 || idx >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}

/**
 * Calculate overall macrocycle progress as a percentage.
 */
export function macrocycleProgress(state: BlockState): number {
  const phaseIdx = PHASE_ORDER.indexOf(state.phase);
  const totalPhases = PHASE_ORDER.length;
  const phaseProgress = (state.currentWeek - 1) / state.weekCount;
  const overallProgress = (phaseIdx + phaseProgress) / totalPhases;
  return Math.round(overallProgress * 100);
}
