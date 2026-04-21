/**
 * API client for Iron Protocol backend.
 * In development, the Next.js backend runs on the same machine.
 * In production, this would be the deployed API URL.
 */

const API_BASE = __DEV__
  ? "http://localhost:3000/api"
  : "https://your-production-url.com/api";

async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

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
