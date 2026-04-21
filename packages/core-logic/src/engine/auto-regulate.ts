import type {
  BasePrescription,
  RegulatedPrescription,
  ReadinessResult,
  Phase,
  AthleteProfile,
} from "../types";
import { targetWeight as calcTargetWeight } from "../math/e1rm";
import { PHASE_CONFIGS, scaledMRV } from "../math/volume";

/**
 * Auto-regulation engine.
 *
 * Takes a base prescription (what the plan says) and adjusts it
 * based on the readiness coefficient and fatigue state.
 *
 * Rules:
 *   Rc >= 1.05: Slight intensity bump (+2.5% intensity), maintain volume
 *   Rc 0.95-1.05: No adjustment (plan as written)
 *   Rc 0.85-0.95: Reduce volume by 1 set per compound, RPE cap -0.5
 *   Rc 0.75-0.85: Reduce volume by 2 sets, drop intensity 5%, RPE cap -1.0
 *   Rc < 0.75: Deload-level session (50% volume, -10% intensity)
 */
export function autoRegulate(
  prescription: BasePrescription,
  readiness: ReadinessResult,
  phase: Phase,
  athleteProfile: AthleteProfile
): RegulatedPrescription {
  const rc = readiness.coefficient;
  const config = PHASE_CONFIGS[phase];

  let adjustedSets = prescription.sets;
  let adjustedRpe = prescription.rpe;
  let adjustedPct = prescription.percentOfE1RM;
  let note = "";

  if (rc >= 1.05) {
    // Feeling great: small intensity bump for compounds
    if (!prescription.isAccessory && adjustedPct !== null) {
      adjustedPct = Math.min(adjustedPct + 0.025, config.intensityRange[1]);
      note = `Readiness high (Rc=${rc}): +2.5% intensity`;
    } else {
      note = `Readiness high (Rc=${rc}): plan as written`;
    }
  } else if (rc >= 0.95) {
    note = `Readiness nominal (Rc=${rc}): no adjustments`;
  } else if (rc >= 0.85) {
    // Mild fatigue: reduce volume slightly
    if (!prescription.isAccessory) {
      adjustedSets = Math.max(2, prescription.sets - 1);
      adjustedRpe = Math.max(config.rpeRange[0], prescription.rpe - 0.5);
    }
    note = `Readiness below baseline (Rc=${rc}): -1 set, -0.5 RPE cap`;
  } else if (rc >= 0.75) {
    // Significant fatigue
    adjustedSets = Math.max(2, prescription.sets - 2);
    adjustedRpe = Math.max(config.rpeRange[0], prescription.rpe - 1.0);
    if (adjustedPct !== null) {
      adjustedPct = Math.max(config.intensityRange[0], adjustedPct - 0.05);
    }
    note = `Readiness low (Rc=${rc}): -2 sets, -5% intensity, -1.0 RPE`;
  } else {
    // Critical: deload-level session
    adjustedSets = Math.max(2, Math.ceil(prescription.sets * 0.5));
    adjustedRpe = Math.min(6.0, prescription.rpe - 1.5);
    if (adjustedPct !== null) {
      adjustedPct = Math.max(0.5, adjustedPct - 0.10);
    }
    note = `READINESS CRITICAL (Rc=${rc}): deload-level session`;
  }

  // Calculate target weight from adjusted percentage
  const e1rm = athleteProfile.e1rms[prescription.exerciseName] ?? 0;
  const targetLbs =
    adjustedPct !== null && e1rm > 0
      ? calcTargetWeight(e1rm, adjustedPct)
      : prescription.isAccessory
      ? null
      : null;

  return {
    ...prescription,
    adjustedSets,
    adjustedRpe,
    adjustedPercentE1RM: adjustedPct !== null ? Math.round(adjustedPct * 1000) / 1000 : null,
    targetWeightLbs: targetLbs,
    regulationNote: note,
  };
}

/**
 * Auto-regulate an entire session's worth of prescriptions.
 */
export function autoRegulateSession(
  prescriptions: BasePrescription[],
  readiness: ReadinessResult,
  phase: Phase,
  athleteProfile: AthleteProfile
): RegulatedPrescription[] {
  return prescriptions.map((p) =>
    autoRegulate(p, readiness, phase, athleteProfile)
  );
}
