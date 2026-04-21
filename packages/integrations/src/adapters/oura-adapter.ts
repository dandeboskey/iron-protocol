/**
 * Oura Ring API adapter (stub).
 * Will implement OAuth 2.0 + data normalization when API integration is enabled.
 */

import type { BiometricPayload, NormalizedSleepData, NormalizedHRVData } from "../types/biometric";

// Oura API v2 response types (partial)
interface OuraSleepResponse {
  data: Array<{
    day: string;
    total_sleep_duration: number;
    efficiency: number;
    rem_sleep_duration: number;
    deep_sleep_duration: number;
    light_sleep_duration: number;
    awake_time: number;
    score: number;
  }>;
}

interface OuraHRVResponse {
  data: Array<{
    day: string;
    contributors: {
      rmssd: number;
    };
  }>;
}

/**
 * Transform Oura sleep data to normalized format.
 * STUB: Will be implemented when OAuth flow is connected.
 */
export function normalizeOuraSleep(raw: OuraSleepResponse): NormalizedSleepData[] {
  return raw.data.map((entry) => ({
    date: entry.day,
    totalSleepSeconds: entry.total_sleep_duration,
    sleepEfficiency: entry.efficiency / 100,
    remSeconds: entry.rem_sleep_duration,
    deepSleepSeconds: entry.deep_sleep_duration,
    lightSleepSeconds: entry.light_sleep_duration,
    awakeSeconds: entry.awake_time,
    sleepScore: entry.score,
  }));
}

/**
 * Transform Oura HRV data to normalized format.
 * STUB: Will be implemented when OAuth flow is connected.
 */
export function normalizeOuraHRV(raw: OuraHRVResponse): NormalizedHRVData[] {
  return raw.data.map((entry) => ({
    date: entry.day,
    avgHrvMs: entry.contributors.rmssd,
    rmssd: entry.contributors.rmssd,
    sdnn: null,
    readingCount: 1,
  }));
}

/**
 * Fetch and normalize all Oura data for a given date range.
 * STUB: Returns null until OAuth is configured.
 */
export async function fetchOuraData(
  _accessToken: string,
  _startDate: string,
  _endDate: string
): Promise<BiometricPayload | null> {
  console.warn("[Oura Adapter] Not yet implemented. Use manual entry.");
  return null;
}
