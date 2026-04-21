/** Phase of the macrocycle */
export type Phase = "HYPERTROPHY" | "STRENGTH" | "PEAKING" | "DELOAD";

export type BlockStatus = "ACTIVE" | "COMPLETED" | "PAUSED";

/** Biometric snapshot for readiness calculation */
export interface BiometricSnapshot {
  hrvMs: number | null;
  sleepHours: number | null;
  sleepQuality: number | null; // 1-10
  mood: number | null; // 1-10
  soreness: number | null; // 1-10, 10 = very sore
  energy: number | null; // 1-10
  stress: number | null; // 1-10, 10 = very stressed
}

/** Athlete profile for scaling calculations */
export interface AthleteProfile {
  bodyweightLbs: number;
  experienceYrs: number;
  e1rms: Record<string, number>; // exercise -> e1RM in lbs
}

/** Readiness calculation result */
export interface ReadinessResult {
  score: number; // 0-100 composite
  coefficient: number; // 0.70-1.10 multiplier for volume/intensity
  flags: string[]; // human-readable warnings
  breakdown: {
    hrvComponent: number;
    sleepComponent: number;
    subjectiveComponent: number;
  };
}

/** Training block state for the state machine */
export interface BlockState {
  phase: Phase;
  status: BlockStatus;
  weekCount: number;
  currentWeek: number;
  currentDay: number;
  startDate: string; // ISO
}

/** Transition result from the state machine */
export interface BlockTransition {
  nextState: BlockState;
  transitioned: boolean;
  reason: string;
}

/** Exercise prescription before auto-regulation */
export interface BasePrescription {
  exerciseName: string;
  sets: number;
  reps: number;
  rpe: number;
  percentOfE1RM: number | null;
  isAccessory: boolean;
}

/** Auto-regulated prescription (after readiness adjustment) */
export interface RegulatedPrescription extends BasePrescription {
  adjustedSets: number;
  adjustedRpe: number;
  adjustedPercentE1RM: number | null;
  targetWeightLbs: number | null;
  regulationNote: string;
}

/** Phase configuration parameters */
export interface PhaseConfig {
  phase: Phase;
  weekCount: number;
  repRange: [number, number]; // [min, max] for compounds
  rpeRange: [number, number]; // [min, max]
  intensityRange: [number, number]; // [min%, max%] of e1RM
  setsPerMuscleGroup: [number, number]; // [MEV, MRV] weekly
  volumeProgression: number; // % increase per week
}

/** Weekly volume tracking */
export interface VolumeMetrics {
  totalSets: number;
  totalReps: number;
  totalVolume: number; // sets * reps * weight
  relativeIntensity: number; // avg % of e1RM
  inol: number; // Intensity * Number of Lifts
}
