# @iron-protocol/integrations

Adapter layer for third-party biometric providers (Oura, WHOOP, Apple
Health). Currently **stubs only** — no real API calls are made.

> See [`../../docs/architecture.md`](../../docs/architecture.md) §2 for the
> dependency boundary that keeps this package isolated.

## Purpose

Vendor APIs return data in vendor-specific shapes (units, time ranges, field
names). This package's job is to translate them into the canonical
`BiometricInput` shape consumed by `@iron-protocol/core-logic`. One
adapter per vendor; one normalized output.

## Dependency rules

- Imports **nothing** from this monorepo. The adapters are pure functions
  over vendor SDK responses + an optional `fetch` injected by the caller.
- The web app **must NOT import this package directly**. It is consumed
  through dependency injection at the route-handler boundary so the
  integration choice can be swapped without touching the route.

## Current state

All adapters are stubs. They typecheck, return canned data, and do not make
network calls. The plan:

1. Real OAuth handshake against vendor authorization endpoints.
2. Periodic background fetch (not yet scheduled — see architecture doc §8.6).
3. Normalize into `BiometricInput` and persist via the existing
   `POST /api/biometric` route, which auto-recomputes `DailyReadinessScore`.

## Adding a new adapter

1. Create `src/<vendor>.ts` exporting `fetchLatest({ accessToken })`.
2. Output type MUST match `BiometricInput` from `@iron-protocol/core-logic`.
3. Vendor-specific units convert here (Oura HRV in ms, WHOOP recovery as
   percent, etc.). The downstream consumer trusts the canonical shape.
4. Document the mapping in code comments — vendor field name → canonical
   field name, with units. The next agent will need this when the API
   inevitably drifts.

## Apple Health is not here

Apple Health is consumed in-process by the iOS / watchOS apps via
`HealthKit`. There is no server-side Apple Health adapter; the data flows
client → `POST /api/biometric` directly. Other providers (Oura, WHOOP) are
server-side because they expose REST APIs and OAuth, which the server is
better positioned to handle.
