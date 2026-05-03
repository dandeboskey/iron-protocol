import { z } from "zod";
import {
  RecordsListResponseSchema,
  RecordCreateRequestSchema,
  RecordUpdateRequestSchema,
  RecordMutationResponseSchema,
  RecordDeleteResponseSchema,
} from "./schemas/records";
import { DashboardResponseSchema } from "./schemas/dashboard";
import { WorkoutResponseSchema } from "./schemas/workout";

/**
 * Logical endpoint registry. Each entry pairs an HTTP method + path template
 * with Zod schemas for request/response. Consumers (api-client, server route
 * handlers, mock servers, generators) can introspect this object instead of
 * hardcoding strings.
 *
 * Path templates use `:param` style for path params. There are none today,
 * but the convention is established for routes like `/api/records/:id`.
 */
export const endpoints = {
  recordsList: {
    method: "GET",
    path: "/api/records",
    request: null,
    response: RecordsListResponseSchema,
  },
  recordsCreate: {
    method: "POST",
    path: "/api/records",
    request: RecordCreateRequestSchema,
    response: RecordMutationResponseSchema,
  },
  recordsUpdate: {
    method: "PATCH",
    path: "/api/records/:id",
    request: RecordUpdateRequestSchema,
    response: RecordMutationResponseSchema,
  },
  recordsDelete: {
    method: "DELETE",
    path: "/api/records/:id",
    request: null,
    response: RecordDeleteResponseSchema,
  },
  dashboard: {
    method: "GET",
    path: "/api/biometric",
    request: null,
    response: DashboardResponseSchema,
  },
  workoutToday: {
    method: "GET",
    path: "/api/workout",
    request: null,
    response: WorkoutResponseSchema,
  },
} as const;

export type Endpoints = typeof endpoints;
export type EndpointName = keyof Endpoints;

/**
 * Build a concrete URL from a path template. For routes with no params this
 * is just identity; for `/api/records/:id` it interpolates.
 *
 * Pure helper — no fetch, no side effects.
 */
export function buildPath(
  template: string,
  params: Record<string, string | number> = {}
): string {
  return template.replace(/:([a-zA-Z]+)/g, (_, key) => {
    const v = params[key];
    if (v === undefined) {
      throw new Error(`Missing path param "${key}" for "${template}"`);
    }
    return encodeURIComponent(String(v));
  });
}

/** Convenience: list-records URL. Pattern for future paginated/filtered lists. */
export function recordsListUrl(): string {
  return endpoints.recordsList.path;
}

/** Convenience: single-record URL. */
export function recordByIdUrl(id: string): string {
  return buildPath(endpoints.recordsUpdate.path, { id });
}

// Re-export the zod namespace so consumers don't double-import it for typing.
export { z };
