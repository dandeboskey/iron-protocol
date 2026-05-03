import {
  endpoints,
  buildPath,
  RecordsListResponseSchema,
  RecordCreateRequestSchema,
  RecordUpdateRequestSchema,
  RecordMutationResponseSchema,
  RecordDeleteResponseSchema,
  DashboardResponseSchema,
  WorkoutResponseSchema,
  type RecordsListResponse,
  type RecordCreateRequest,
  type RecordUpdateRequest,
  type RecordMutationResponse,
  type RecordDeleteResponse,
  type DashboardResponse,
  type WorkoutResponse,
} from "@iron-protocol/api-contract";
import { createTransport, type TransportOptions } from "./transport";

export type ApiClient = ReturnType<typeof createApiClient>;

/**
 * Build a typed API client. Each consumer wires its own auth/transport:
 *
 * Web (browser, cookie session):
 *   const api = createApiClient({ baseUrl: "" }); // relative URLs
 *
 * Mobile (Expo, bearer token):
 *   const api = createApiClient({
 *     baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL!,
 *     getAuthToken: async () => SecureStore.getItemAsync("ironToken"),
 *   });
 */
export function createApiClient(options: TransportOptions) {
  const t = createTransport(options);

  return {
    records: {
      list(): Promise<RecordsListResponse> {
        return t.request(
          { method: endpoints.recordsList.method, path: endpoints.recordsList.path },
          RecordsListResponseSchema
        );
      },
      create(body: RecordCreateRequest): Promise<RecordMutationResponse> {
        // Validate outgoing body locally so contract drift surfaces here, not
        // as a 400 from the server.
        const parsed = RecordCreateRequestSchema.parse(body);
        return t.request(
          {
            method: endpoints.recordsCreate.method,
            path: endpoints.recordsCreate.path,
            body: parsed,
          },
          RecordMutationResponseSchema
        );
      },
      update(id: string, body: RecordUpdateRequest): Promise<RecordMutationResponse> {
        const parsed = RecordUpdateRequestSchema.parse(body);
        return t.request(
          {
            method: endpoints.recordsUpdate.method,
            path: buildPath(endpoints.recordsUpdate.path, { id }),
            body: parsed,
          },
          RecordMutationResponseSchema
        );
      },
      delete(id: string): Promise<RecordDeleteResponse> {
        return t.request(
          {
            method: endpoints.recordsDelete.method,
            path: buildPath(endpoints.recordsDelete.path, { id }),
          },
          RecordDeleteResponseSchema
        );
      },
    },
    dashboard: {
      get(): Promise<DashboardResponse> {
        return t.request(
          { method: endpoints.dashboard.method, path: endpoints.dashboard.path },
          DashboardResponseSchema
        );
      },
    },
    workout: {
      today(): Promise<WorkoutResponse> {
        return t.request(
          { method: endpoints.workoutToday.method, path: endpoints.workoutToday.path },
          WorkoutResponseSchema
        );
      },
    },
  };
}
