# @iron-protocol/api-client

Typed HTTP client driven by `@iron-protocol/api-contract`. One factory,
pluggable transport. Web passes cookie-aware fetch; mobile/watch supply
`getAuthToken` for bearer auth. Errors are typed `ApiError`.

> See [`../../docs/architecture.md`](../../docs/architecture.md) §5.2 for the
> design rationale.

## Layout

```
packages/api-client/src/
├── transport.ts    Pluggable fetch wrapper, cookie vs bearer split
├── error.ts        ApiError type + getApiErrorMessage helper
├── client.ts       createApiClient factory, namespaced methods
└── index.ts        Public exports
```

## Dependency rules

- Depends on `@iron-protocol/api-contract` and `zod`. Nothing else from this
  monorepo.
- **No** retries, **no** caching, **no** request deduplication. Consumers
  layer that on top if they need it (TanStack Query, SWR, etc.). The client
  is intentionally thin so the surface area to keep current with the contract
  is small.

## Usage — web (cookie auth)

```ts
// apps/web/src/lib/apiClient.ts
import { createApiClient } from "@iron-protocol/api-client";

export const api = createApiClient({
  baseUrl: "",                      // empty = same-origin
  fetch: (input, init) =>           // cookies sent by default
    globalThis.fetch(input, { ...init, credentials: "include" }),
});
```

## Usage — mobile/watch (bearer auth)

```ts
const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL!,
  getAuthToken: async () => SecureStore.getItemAsync("ironToken"),
});
```

The factory composes `Authorization: Bearer <token>` on each request. If
`getAuthToken` returns `null`, the header is omitted (server returns 401).

## Errors

```ts
import { ApiError, getApiErrorMessage } from "@iron-protocol/api-client";

try {
  await api.records.create({ exerciseName: "Squat", weightLbs: 0, reps: 5 });
} catch (e) {
  if (e instanceof ApiError) {
    setErrorMessage(getApiErrorMessage(e));   // server-provided message
    if (e.status === 401) router.push("/login");
  }
}
```

`ApiError` carries `status: number`, `body: unknown` (parsed JSON if
possible), and `message: string`. UI surfaces always show the server message
instead of swallowing it.

## Adding a new method

1. Confirm the schema + endpoint exist in `@iron-protocol/api-contract`. If
   not, add them there first.
2. Add a method to the relevant namespace in `client.ts`:

   ```ts
   newThing: {
     do: async (body: z.infer<typeof NewThingRequestSchema>) => {
       const validated = NewThingRequestSchema.parse(body);
       return request(endpoints.newThing, validated);
     },
   },
   ```

3. The `request()` helper handles path interpolation, JSON encoding,
   response decoding, and Zod-validation of the response. Don't bypass it.

## Outgoing validation

Every `create/update` method calls `Schema.parse(body)` before sending.
Trades microseconds for catching contract drift at the call site. If
profiling ever flags this as hot, switch to `safeParse` and ship the data
anyway — but log the validation failure.
