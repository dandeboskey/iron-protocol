/**
 * WHOOP API adapter (stub).
 * Will implement OAuth 2.0 + data normalization when API integration is enabled.
 */

import type { BiometricPayload } from "../types/biometric";

/**
 * Fetch and normalize all WHOOP data for a given date range.
 * STUB: Returns null until OAuth is configured.
 */
export async function fetchWhoopData(
  _accessToken: string,
  _startDate: string,
  _endDate: string
): Promise<BiometricPayload | null> {
  console.warn("[WHOOP Adapter] Not yet implemented. Use manual entry.");
  return null;
}
