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
  LogSetCreateRequestSchema,
  LogSetUpdateRequestSchema,
  LogSetMutationResponseSchema,
  LogSetDeleteResponseSchema,
  SessionCompleteRequestSchema,
  SessionCompleteResponseSchema,
  BiometricCheckinRequestSchema,
  BiometricCheckinResponseSchema,
  AthleteGetResponseSchema,
  AthleteUpdateRequestSchema,
  AthleteUpdateResponseSchema,
  BlockResponseSchema,
  FatigueResponseSchema,
  ProgramListResponseSchema,
  ProgramCreateRequestSchema,
  ProgramCreateResponseSchema,
  type RecordsListResponse,
  type RecordCreateRequest,
  type RecordUpdateRequest,
  type RecordMutationResponse,
  type RecordDeleteResponse,
  type DashboardResponse,
  type WorkoutResponse,
  type LogSetCreateRequest,
  type LogSetUpdateRequest,
  type LogSetMutationResponse,
  type LogSetDeleteResponse,
  type SessionCompleteRequest,
  type SessionCompleteResponse,
  type BiometricCheckinRequest,
  type BiometricCheckinResponse,
  type AthleteGetResponse,
  type AthleteUpdateRequest,
  type AthleteUpdateResponse,
  type BlockResponse,
  type FatigueResponse,
  type ProgramListResponse,
  type ProgramCreateRequest,
  type ProgramCreateResponse,
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
      /**
       * POST /api/log — log a completed set. Returns the created CompletedSet.
       * The route also appends an E1RMRecord row server-side; that's not
       * surfaced here (consumer refetches dashboard / e1RMs separately).
       */
      logSet(body: LogSetCreateRequest): Promise<LogSetMutationResponse> {
        const parsed = LogSetCreateRequestSchema.parse(body);
        return t.request(
          {
            method: endpoints.logSetCreate.method,
            path: endpoints.logSetCreate.path,
            body: parsed,
          },
          LogSetMutationResponseSchema
        );
      },
      /** PATCH /api/log/[id] — partial edit of a logged set. */
      editSet(id: string, body: LogSetUpdateRequest): Promise<LogSetMutationResponse> {
        const parsed = LogSetUpdateRequestSchema.parse(body);
        return t.request(
          {
            method: endpoints.logSetUpdate.method,
            path: buildPath(endpoints.logSetUpdate.path, { id }),
            body: parsed,
          },
          LogSetMutationResponseSchema
        );
      },
      /** DELETE /api/log/[id] — returns `{ ok: true }`. */
      deleteSet(id: string): Promise<LogSetDeleteResponse> {
        return t.request(
          {
            method: endpoints.logSetDelete.method,
            path: buildPath(endpoints.logSetDelete.path, { id }),
          },
          LogSetDeleteResponseSchema
        );
      },
      /**
       * POST /api/session/complete — mark today's session done; the route
       * advances currentDay/currentWeek and returns the updated block.
       */
      completeSession(body: SessionCompleteRequest): Promise<SessionCompleteResponse> {
        const parsed = SessionCompleteRequestSchema.parse(body);
        return t.request(
          {
            method: endpoints.sessionComplete.method,
            path: endpoints.sessionComplete.path,
            body: parsed,
          },
          SessionCompleteResponseSchema
        );
      },
    },
    checkin: {
      /**
       * POST /api/biometric — submit a daily biometric check-in. Returns the
       * created entry. Caller refetches dashboard for fresh readiness; the
       * route does not echo readiness in this response (yet).
       */
      submit(body: BiometricCheckinRequest): Promise<BiometricCheckinResponse> {
        const parsed = BiometricCheckinRequestSchema.parse(body);
        return t.request(
          {
            method: endpoints.biometricCheckin.method,
            path: endpoints.biometricCheckin.path,
            body: parsed,
          },
          BiometricCheckinResponseSchema
        );
      },
    },
    athlete: {
      /** GET /api/athlete — current athlete profile + latest e1RMs. */
      get(): Promise<AthleteGetResponse> {
        return t.request(
          { method: endpoints.athleteGet.method, path: endpoints.athleteGet.path },
          AthleteGetResponseSchema
        );
      },
      /**
       * PUT /api/athlete — full update of mutable profile fields. The route
       * is PUT (not PATCH); body validation matches AthleteUpdateRequestSchema
       * bounds (name, bw 50-600, exp 0-60, optional height 36-96).
       */
      update(body: AthleteUpdateRequest): Promise<AthleteUpdateResponse> {
        const parsed = AthleteUpdateRequestSchema.parse(body);
        return t.request(
          {
            method: endpoints.athleteUpdate.method,
            path: endpoints.athleteUpdate.path,
            body: parsed,
          },
          AthleteUpdateResponseSchema
        );
      },
    },
    block: {
      /** GET /api/block — current active block + macrocycle progress. */
      get(): Promise<BlockResponse> {
        return t.request(
          { method: endpoints.block.method, path: endpoints.block.path },
          BlockResponseSchema
        );
      },
    },
    fatigue: {
      /** GET /api/fatigue — 28-day Banister fatigue series for charts. */
      get(): Promise<FatigueResponse> {
        return t.request(
          { method: endpoints.fatigue.method, path: endpoints.fatigue.path },
          FatigueResponseSchema
        );
      },
    },
    program: {
      /** GET /api/program — list templates owned by the current athlete. */
      list(): Promise<ProgramListResponse> {
        return t.request(
          { method: endpoints.programList.method, path: endpoints.programList.path },
          ProgramListResponseSchema
        );
      },
      /**
       * POST /api/program — create a template with its full phase/day/exercise
       * graph. Validates the wizard's nested payload before sending.
       */
      create(body: ProgramCreateRequest): Promise<ProgramCreateResponse> {
        const parsed = ProgramCreateRequestSchema.parse(body);
        return t.request(
          {
            method: endpoints.programCreate.method,
            path: endpoints.programCreate.path,
            body: parsed,
          },
          ProgramCreateResponseSchema
        );
      },
    },
  };
}
