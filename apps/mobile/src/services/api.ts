/**
 * API client for the Iron Protocol backend.
 *
 * - Base URL is read from EXPO_PUBLIC_API_BASE (set in app.json or .env).
 *   Falls back to http://localhost:3000/api, which only works on the iOS
 *   simulator. For a real iPhone on the same Wi-Fi, set EXPO_PUBLIC_API_BASE
 *   to your Mac's LAN IP (e.g. http://192.168.1.42:3000/api).
 * - Every request carries the session JWT stored in SecureStore by auth.tsx,
 *   sent as `Authorization: Bearer <token>`. Backend's getSessionAthlete()
 *   validates it with the same NEXTAUTH_SECRET used for web cookies.
 */

import Constants from "expo-constants";
import { getStoredToken } from "./auth";

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ??
  (Constants.expoConfig?.extra?.apiBase as string | undefined) ??
  "http://localhost:3000/api";

async function fetchAPI(path: string, options?: RequestInit) {
  const token = await getStoredToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

// Auth
export const exchangeGoogleIdToken = (idToken: string) =>
  fetchAPI("/auth/mobile", { method: "POST", body: JSON.stringify({ idToken }) });

// Athlete
export const getAthlete = () => fetchAPI("/athlete");
export const updateAthlete = (data: any) =>
  fetchAPI("/athlete", { method: "PUT", body: JSON.stringify(data) });

// Biometrics
export const getBiometrics = () => fetchAPI("/biometric");
export const submitCheckin = (data: any) =>
  fetchAPI("/biometric", { method: "POST", body: JSON.stringify(data) });

// Training Block
export const getBlock = () => fetchAPI("/block");

// Workout
export const getWorkout = () => fetchAPI("/workout");
export const logSet = (data: any) =>
  fetchAPI("/log", { method: "POST", body: JSON.stringify(data) });

// Personal Records
export const getRecords = () => fetchAPI("/records");
export const addRecord = (data: any) =>
  fetchAPI("/records", { method: "POST", body: JSON.stringify(data) });

// Programs
export const getPrograms = () => fetchAPI("/program");
export const createProgram = (data: any) =>
  fetchAPI("/program", { method: "POST", body: JSON.stringify(data) });
