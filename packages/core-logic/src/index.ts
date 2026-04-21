// Math utilities
export { epleyE1RM, brzyckiE1RM, compositeE1RM, targetWeight, setINOL, exerciseINOL } from "./math/e1rm";
export { calculateReadiness, calculateHrvBaseline } from "./math/readiness";
export { PHASE_CONFIGS, calculateSessionVolume, scaledMRV, weeklyTargetVolume } from "./math/volume";
export { calculateAccumulatedFatigue, estimatedRecoveryDays } from "./math/fatigue";

// Engine
export { evaluateTransition, advanceDay, getNextPhase, macrocycleProgress } from "./engine/state-machine";
export { autoRegulate, autoRegulateSession } from "./engine/auto-regulate";
export { generateDayPrescriptions, getDayLabel } from "./engine/workout-generator";

// Types
export type {
  Phase,
  BlockStatus,
  BiometricSnapshot,
  AthleteProfile,
  ReadinessResult,
  BlockState,
  BlockTransition,
  BasePrescription,
  RegulatedPrescription,
  PhaseConfig,
  VolumeMetrics,
} from "./types";
