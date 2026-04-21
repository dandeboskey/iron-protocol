/**
 * Standardized biometric data interfaces.
 * All vendor-specific adapters normalize to these types.
 */

export interface NormalizedSleepData {
  date: string; // ISO date
  totalSleepSeconds: number;
  sleepEfficiency: number; // 0-1
  remSeconds: number;
  deepSleepSeconds: number;
  lightSleepSeconds: number;
  awakeSeconds: number;
  sleepScore: number; // 0-100 normalized
}

export interface NormalizedHRVData {
  date: string;
  avgHrvMs: number;
  rmssd: number; // root mean square of successive differences
  sdnn: number | null; // standard deviation of NN intervals
  readingCount: number;
}

export interface NormalizedActivityData {
  date: string;
  steps: number;
  activeCalories: number;
  totalCalories: number;
  activeMinutes: number;
}

export interface BiometricPayload {
  source: "oura" | "whoop" | "health_connect" | "manual";
  fetchedAt: string;
  sleep: NormalizedSleepData | null;
  hrv: NormalizedHRVData | null;
  activity: NormalizedActivityData | null;
}
