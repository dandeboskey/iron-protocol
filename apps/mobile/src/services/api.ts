/**
 * API client for the Iron Protocol backend — mobile.
 *
 * Wraps `@iron-protocol/api-client` with mobile-specific transport: bearer
 * token from SecureStore (via `auth.tsx`), base URL from `EXPO_PUBLIC_API_BASE`
 * with a localhost fallback that only works on the iOS simulator.
 *
 * Named exports below preserve the call sites used by every tab screen.
 * Migrate-in-place: callers continue to import `getAthlete`, `submitCheckin`,
 * etc. — they now route through the typed client and pick up Zod-validated
 * responses.
 */

import Constants from "expo-constants";
import { createApiClient } from "@iron-protocol/api-client";
import type {
  AthleteUpdateRequest,
  BiometricCheckinRequest,
  LogSetCreateRequest,
  RecordCreateRequest,
  ProgramCreateRequest,
} from "@iron-protocol/api-contract";
import { getStoredToken } from "./auth";

const API_BASE_RAW =
  process.env.EXPO_PUBLIC_API_BASE ??
  (Constants.expoConfig?.extra?.apiBase as string | undefined) ??
  "http://localhost:3000/api";

// The shared client expects a baseUrl that paths join onto: e.g. "/api/records".
// Existing mobile config bakes "/api" into the env var; strip it so paths line up.
const baseUrl = API_BASE_RAW.replace(/\/api\/?$/, "");

const client = createApiClient({
  baseUrl,
  getAuthToken: getStoredToken,
});

// ── Auth ─────────────────────────────────────────────────────────────────────
// `/auth/mobile` is not on the contract (auth flow is platform-specific).
// Keep the hand-rolled call here.
export async function exchangeGoogleIdToken(idToken: string) {
  const res = await fetch(`${baseUrl}/api/auth/mobile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

// ── Athlete ──────────────────────────────────────────────────────────────────
export const getAthlete = () => client.athlete.get();
export const updateAthlete = (data: AthleteUpdateRequest) =>
  client.athlete.update(data);

// ── Biometrics ───────────────────────────────────────────────────────────────
export const getBiometrics = () => client.dashboard.get();
export const submitCheckin = (data: BiometricCheckinRequest) =>
  client.checkin.submit(data);

// ── Training Block ───────────────────────────────────────────────────────────
export const getBlock = () => client.block.get();

// ── Workout ──────────────────────────────────────────────────────────────────
export const getWorkout = () => client.workout.today();
export const logSet = (data: LogSetCreateRequest) => client.workout.logSet(data);

// ── Personal Records ─────────────────────────────────────────────────────────
export const getRecords = () => client.records.list();
export const addRecord = (data: RecordCreateRequest) =>
  client.records.create(data);

// ── Programs ─────────────────────────────────────────────────────────────────
export const getPrograms = () => client.program.list();
export const createProgram = (data: ProgramCreateRequest) =>
  client.program.create(data);
