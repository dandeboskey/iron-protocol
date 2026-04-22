/**
 * Apple HealthKit integration for Iron Protocol.
 *
 * Reads HRV (SDNN), sleep analysis (with stage breakdown on watchOS 9+),
 * resting heart rate, respiratory rate, and body mass.
 *
 * REQUIRES: Development build or EAS build — not compatible with Expo Go.
 * Run `expo prebuild --platform ios` to generate the native project with
 * HealthKit entitlements before building.
 */

import { Platform } from 'react-native';
import AppleHealthKit, { HealthKitPermissions, HealthValue } from 'react-native-health';

export interface HealthKitData {
  hrvMs: number | null;
  sleepHours: number | null;
  sleepQuality: number | null; // 1-10 derived from sleep architecture
  restingHeartRate: number | null;
  respiratoryRate: number | null;
  bodyweightLbs: number | null;
}

const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.HeartRateVariabilitySDNN,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.RestingHeartRate,
      AppleHealthKit.Constants.Permissions.RespiratoryRate,
      AppleHealthKit.Constants.Permissions.BodyMass,
    ],
    write: [
      AppleHealthKit.Constants.Permissions.Workout,
    ],
  },
};

export function isHealthKitAvailable(): boolean {
  return Platform.OS === 'ios';
}

export async function requestHealthKitPermissions(): Promise<boolean> {
  if (!isHealthKitAvailable()) return false;
  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(PERMISSIONS, (err) => {
      if (err) console.error('[HealthKit] initHealthKit:', err);
      resolve(!err);
    });
  });
}

// ── helpers ──────────────────────────────────────────────────────────────────

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Sleep windows start at 6 pm the previous evening to capture full nights.
function sleepWindowStartISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
}

async function getLatestHRV(startDate: string): Promise<number | null> {
  return new Promise((resolve) => {
    AppleHealthKit.getHeartRateVariabilitySamples(
      { startDate, limit: 1, ascending: false },
      (err, results) => {
        if (err || !results?.length) return resolve(null);
        // HealthKit reports SDNN in milliseconds — matches our Rc formula directly.
        resolve(Math.round(results[0].value));
      }
    );
  });
}

interface SleepResult {
  hours: number | null;
  quality: number | null;
}

async function getLastNightSleep(): Promise<SleepResult> {
  return new Promise((resolve) => {
    AppleHealthKit.getSleepSamples(
      { startDate: sleepWindowStartISO(), endDate: new Date().toISOString() },
      (err, samples) => {
        if (err || !samples?.length) return resolve({ hours: null, quality: null });

        let asleepMs = 0;
        let deepMs = 0;
        let remMs = 0;
        let awakeMs = 0;

        for (const s of samples) {
          const dur = new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
          switch (s.value) {
            case 'ASLEEP':      // generic / unspecified (older Apple Watch / no watch)
            case 'ASLEEPCORE':  // light sleep (watchOS 9+)
              asleepMs += dur;
              break;
            case 'ASLEEPDEEP':  // slow-wave sleep (watchOS 9+)
              asleepMs += dur;
              deepMs += dur;
              break;
            case 'ASLEEPREM':   // REM (watchOS 9+)
              asleepMs += dur;
              remMs += dur;
              break;
            case 'AWAKE':
              awakeMs += dur;
              break;
            // INBED is not counted as sleep
          }
        }

        if (asleepMs === 0) return resolve({ hours: null, quality: null });

        const hours = Math.round((asleepMs / 3_600_000) * 10) / 10;

        // Sleep quality 1–10.
        // With stage data (watchOS 9+): weighted from efficiency + deep + REM ratios.
        // Optimal targets: deep ≈20%, REM ≈22% of total sleep.
        // Without stage data: quality approximated from efficiency alone.
        const efficiency = asleepMs / (asleepMs + awakeMs);
        const hasStages = deepMs > 0 || remMs > 0;

        let quality: number;
        if (hasStages) {
          const deepScore = Math.min((deepMs / asleepMs) / 0.20, 1.0);
          const remScore  = Math.min((remMs  / asleepMs) / 0.22, 1.0);
          quality = efficiency * 5 + deepScore * 2.5 + remScore * 2.5;
        } else {
          quality = efficiency * 10;
        }

        resolve({
          hours,
          quality: Math.round(Math.max(1, Math.min(10, quality))),
        });
      }
    );
  });
}

async function getRestingHeartRate(startDate: string): Promise<number | null> {
  return new Promise((resolve) => {
    AppleHealthKit.getRestingHeartRateSamples(
      { startDate, limit: 1, ascending: false },
      (err, results) => {
        if (err || !results?.length) return resolve(null);
        resolve(Math.round(results[0].value));
      }
    );
  });
}

async function getRespiratoryRate(startDate: string): Promise<number | null> {
  return new Promise((resolve) => {
    AppleHealthKit.getRespiratoryRateSamples(
      { startDate, limit: 1, ascending: false },
      (err, results) => {
        if (err || !results?.length) return resolve(null);
        resolve(Math.round(results[0].value));
      }
    );
  });
}

async function getBodyweightLbs(): Promise<number | null> {
  return new Promise((resolve) => {
    AppleHealthKit.getLatestWeight({ unit: 'pound' }, (err, result) => {
      if (err || !result) return resolve(null);
      resolve(Math.round((result as HealthValue).value * 10) / 10);
    });
  });
}

// ── public API ───────────────────────────────────────────────────────────────

export async function readTodayHealthData(): Promise<HealthKitData> {
  const startDate = startOfTodayISO();

  const [hrv, sleep, rhr, rr, weight] = await Promise.all([
    getLatestHRV(startDate),
    getLastNightSleep(),
    getRestingHeartRate(startDate),
    getRespiratoryRate(startDate),
    getBodyweightLbs(),
  ]);

  return {
    hrvMs: hrv,
    sleepHours: sleep.hours,
    sleepQuality: sleep.quality,
    restingHeartRate: rhr,
    respiratoryRate: rr,
    bodyweightLbs: weight,
  };
}
