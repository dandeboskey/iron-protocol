# Iron Protocol — System Architecture

Status as of branch `arch/shared-api-contract`. This document is the canonical
description of how the system is wired today and where the load-bearing seams
sit. It is meant for an engineer joining the project who needs to make a
non-trivial change without breaking invariants.

## 1. Executive summary

Iron Protocol is a **deterministic, single-tenant-per-athlete coaching app**
that combines passive biometric data with a rigid block-periodization engine
to auto-regulate daily training. It runs across three frontends (web, iOS,
watchOS), one backend (a Next.js 14 App Router app that acts as both UI host
and API gateway), and one database (Postgres via Prisma).

Three architectural commitments shape every other decision:

1. **Math is pure.** All scoring, periodization, and regulation lives in
   `packages/core-logic` with zero side effects and zero monorepo imports.
   Anything that calls `Math` belongs there or it does not belong at all.
2. **The API contract is a typed package, not tribal knowledge.** Zod schemas
   in `packages/api-contract` are the source of truth for every request and
   response shape. Web, mobile, and watch consume the same contract — TS via
   `packages/api-client`, Swift via hand-mirrored `Codable` structs.
3. **Auth is single-source.** A NextAuth session is the primary credential.
   Mobile and watch exchange the session for a short-lived bearer token at
   `/api/auth/mobile`. Every route validates session OR bearer and scopes
   queries to the authenticated user's `Athlete`.

## 2. Repository topology

```
iron-protocol/
├── apps/
│   ├── web/                     Next.js 14 App Router. UI + API gateway.
│   │   └── src/app/
│   │       ├── (auth)/login     NextAuth login page
│   │       ├── api/             13 route handlers (the entire backend)
│   │       └── <9 pages>        dashboard, checkin, workout, records, ...
│   ├── mobile/                  Expo React Native iOS app (other stream)
│   └── watch/                   Standalone watchOS 10+ SwiftUI app (new)
│       └── IronProtocolWatch/
│           ├── Models/          Codable mirrors of Zod schemas
│           ├── Networking/      Async ApiClient (Info.plist-configured)
│           └── Views/           4 SwiftUI views + RootView TabView
└── packages/
    ├── api-contract/            Zod schemas + endpoint registry
    ├── api-client/              Typed TS client, pluggable transport
    ├── core-logic/              Pure math: readiness, autoreg, periodization
    ├── db/                      Prisma schema, client singleton, queries
    └── integrations/            Biometric API adapters (Oura/WHOOP stubs)
```

### Dependency boundaries (enforced by `.cursorrules`)

```
                 ┌──────────────────────────────┐
                 │  apps/web (Next.js gateway)  │
                 └──────────────────────────────┘
                       │             │
            ┌──────────┘             └──────────┐
            ▼                                   ▼
   ┌──────────────────┐               ┌─────────────────┐
   │  api-client (TS) │  ─reads─►     │  api-contract   │
   └──────────────────┘               └─────────────────┘
            │                                   ▲
            ▼                                   │
   ┌──────────────────┐                         │
   │   core-logic     │  pure, no DB, no deps   │
   └──────────────────┘                         │
                                                │
   ┌──────────────────┐               ┌─────────┴───────┐
   │       db         │   ◄──used by──┤ web route handlers │
   │  (Prisma+Postgres)│               └─────────────────┘
   └──────────────────┘

   apps/mobile and apps/watch ─► api-client (or its Swift twin) ─► api-contract
```

**Rules that are not optional:**

- `packages/core-logic` imports nothing from the monorepo. Pure math only.
- `packages/db` depends on `@prisma/client` only. It does NOT import core-logic
  or any application code.
- `apps/web` may import `core-logic`, `db`, `api-contract`, `api-client`. It
  must NOT import `integrations` directly.
- `packages/integrations` is an adapter layer; it imports nothing from this
  monorepo. The web app calls it only through dependency injection at the
  route-handler boundary (today: stubs only).

## 3. Frontend

### 3.1 Web (`apps/web`)

Next.js 14 App Router, React 18, Tailwind. Mobile-first responsive — the same
codebase serves desktop browsers and mobile Safari. Bottom nav (5 tabs) on
narrow viewports; top nav (8 items) on wide.

**Page inventory:**

| Route | Purpose | Migrated to api-client |
|-------|---------|------------------------|
| `/` | Dashboard — readiness gauge, current block, today's workout preview | partial (uses GET) |
| `/checkin` | Daily biometric entry form | yes (POST) |
| `/workout` | Today's auto-regulated session, inline set logging | yes (full CRUD) |
| `/block` | Active block timeline + session list | no |
| `/records` | PR list with editable rows + Big 3 hero cards | yes (full CRUD) |
| `/history` | Trailing biometric entries with charts | yes (GET) |
| `/connect` | OAuth simulator for Oura/WHOOP | no |
| `/program` | Multi-step program template wizard | no |
| `/progress` | Progressive overload tracking | no |
| `/profile` | Athlete profile + e1RM listing | yes (GET, PUT) |

**Patterns:**

- All data fetching is via `apps/web/src/lib/apiClient.ts`, which exports a
  pre-built `api` instance using `credentials: "include"` for cookie session
  auth. Pages call `api.records.list()` etc. — they do not see `fetch`.
- Server Components handle the initial render where possible; client components
  are used only when interactive state or `useEffect` is required.
- `error.tsx` and `not-found.tsx` at the app root catch render-time throws and
  404s respectively. Iron-themed, with a reset button.
- Numeric inputs use `inputMode="numeric"` or `"decimal"` so iOS Safari shows
  the right soft keyboard. `<input type="number">` alone is wrong on mobile.
- Date formatting flows through `apps/web/src/lib/format.ts` — `formatShortDate`,
  `formatLongDate`, `formatMonthDay`, `formatWeight`. One source, used everywhere.

### 3.2 Mobile (`apps/mobile`)

Expo Router with a 5-tab layout (Dashboard, Check-In, Workout, PRs, Profile).
Shares `@iron-protocol/core-logic`. Talks to the Next.js backend via REST with
`Authorization: Bearer <token>` headers obtained from `/api/auth/mobile`.

HealthKit integration is currently stubbed; production implementation lives in
comments and needs a real device for end-to-end testing.

**This work stream is owned by another agent.** The architecture work in this
document does NOT modify mobile code. The intended adoption path: replace the
existing fetch helpers with `createApiClient({ baseUrl, getAuthToken })` from
`@iron-protocol/api-client` so mobile and web consume the same contract.

### 3.3 Watch (`apps/watch`)

Standalone watchOS 10+ SwiftUI app. NOT nested in the iPhone Xcode project —
independent bundle, own provisioning. Communicates with the backend via REST,
mirrors the same TS contract via hand-written `Codable` structs.

**File layout:**

```
apps/watch/IronProtocolWatch/
├── IronProtocolWatchApp.swift       @main, injects @Observable ApiClient
├── Models/
│   ├── PersonalRecord.swift         mirrors records schema
│   ├── Biometric.swift              mirrors dashboard schema
│   ├── Workout.swift                mirrors workout schema
│   ├── LogSet.swift                 mirrors log schemas
│   ├── SessionComplete.swift        mirrors session-complete schema
│   ├── BiometricCheckin.swift       mirrors checkin schema
│   └── Time.swift                   relativeTimeString helper
├── Networking/
│   └── ApiClient.swift              async/await, namespaced (records/workout/...)
└── Views/
    ├── RootView.swift               TabView page-style nav
    ├── ReadinessGlanceView.swift    Rc gauge + "checked in 3h ago"
    ├── CheckinQuickView.swift       Digital Crown sliders + submit
    ├── TodaysWorkoutView.swift      read-only prescription list
    └── BlockSummaryView.swift       phase, week N of M, deload flag
```

**Phase 1 scope (what's scaffolded):** read-only glance + quick subjective
check-in. Logging actual sets from the wrist is Phase 2 because the UI is
genuinely cramped and the iPhone is a better surface for it.

**Configuration:** `IronProtocolBaseURL` and `IronProtocolDevBearer` are read
from `Info.plist`. Swap dev/prod or rotate tokens by editing the plist, not
by recompiling Swift. Production token storage moves to a shared Keychain via
App Group with the iPhone app — documented in the README, not yet wired.

**Why standalone, not paired:** watchOS 10 supports independent watch apps.
Pairing forces an Apple Watch user to also have the phone awake and unlocked;
independent apps work on the wrist alone. The cost is duplicating a small
amount of HealthKit handshake code; the payoff is a viable wrist-only flow
for athletes who leave their phone in a locker.

## 4. Backend

### 4.1 API surface (`apps/web/src/app/api`)

13 Next.js Route Handlers. Every one is the entire vertical slice for its
endpoint — no controller layer, no service layer. Prisma queries live directly
in the handler. Validation happens at the boundary via Zod (since round 2).

| Method | Path | Purpose |
|--------|------|---------|
| `GET/POST` | `/api/auth/[...nextauth]` | NextAuth route (Google OAuth + session) |
| `POST` | `/api/auth/mobile` | Exchange session cookie for bearer token |
| `GET` | `/api/athlete` | Read current user's Athlete profile |
| `PUT` | `/api/athlete` | Replace Athlete profile (NB: PUT, not PATCH) |
| `GET` | `/api/biometric` | Trailing biometric entries + computed Rc |
| `POST` | `/api/biometric` | Submit daily check-in |
| `GET` | `/api/block` | Active block + sessions overview |
| `GET` | `/api/fatigue` | Banister fatigue series for charts |
| `GET` | `/api/workout` | Today's auto-regulated session w/ prescriptions |
| `POST` | `/api/log` | Log a CompletedSet (also writes E1RMRecord) |
| `PATCH` | `/api/log/[id]` | Edit a logged set |
| `DELETE` | `/api/log/[id]` | Delete a logged set |
| `POST` | `/api/session/complete` | Mark session complete, advance block state |
| `GET/POST` | `/api/program` | List + create program templates |
| `GET/POST/PATCH/DELETE` | `/api/records[/id]` | Personal records CRUD |

**Common shape every handler follows:**

```ts
export async function GET(req: NextRequest) {
  const athlete = await getSessionAthlete();   // 401 if unauthenticated
  if (!athlete) return new NextResponse(null, { status: 401 });

  const result = await prisma.something.findMany({
    where: { athleteId: athlete.id },          // ownership scoping
    // ...
  });
  return NextResponse.json(result);
}
```

The `getSessionAthlete()` helper checks the NextAuth session first, then falls
back to `Authorization: Bearer <token>` (mobile/watch path). Either resolves
to the user's `Athlete` record. If neither succeeds, the handler returns 401.
If an authenticated user has no Athlete (newly signed up via Google OAuth),
one is provisioned lazily on first call.

### 4.2 Auth & authorization

```
┌──────────────────────────────────────────────────────────┐
│ Web browser                                              │
│   ▲                                                      │
│   │ Set-Cookie: next-auth.session-token=...              │
│ ┌─┴────────────────────────────────────────┐             │
│ │ /api/auth/[...nextauth] (NextAuth)       │             │
│ │   - Google OAuth provider                │             │
│ │   - PrismaAdapter → User/Account/Session │             │
│ └──────────────────────────────────────────┘             │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│ Mobile / Watch                                           │
│   POST /api/auth/mobile  (with web session cookie OR     │
│                           Google id_token from native)   │
│   ◄── { token: "<short-lived JWT>" }                     │
│                                                          │
│   subsequent requests:                                   │
│     Authorization: Bearer <token>                        │
└──────────────────────────────────────────────────────────┘

Every API route:
   getSessionAthlete()
     ├─► NextAuth getServerSession() → { user, athlete }
     └─► fallback: verify Bearer JWT → { user, athlete }
   if neither succeeds → 401
```

**Authorization model:** strictly per-Athlete. Every query filters by
`athleteId = athlete.id`. There is no concept of admin, coach, or shared
records — all data is private to its owning Athlete. When a route accepts an
ID for a child resource (`recordId`, `setId`, `sessionId`), the handler MUST
load it, walk to its `athleteId` field (sometimes via session→block), and
verify the match before mutating. Round 1 of QOL fixes plugged two routes
where this wasn't being done.

### 4.3 Core logic (`packages/core-logic`)

Pure functions. No imports from the monorepo. No Prisma, no fetch, no Date.now
without an injected clock. Three subdomains:

```
packages/core-logic/src/
├── math/         e1RM (Epley/Brzycki composite), normalization, MRV scaling
├── engine/       readiness scoring, autoreg coefficient, periodization SM
├── types.ts      shared domain types (BiometricInput, ReadinessReport, ...)
└── index.ts      public exports
```

**Readiness Coefficient (Rc):**

A composite score 0-100 mapped to a coefficient 0.70-1.10. Inputs are weighted
by population norms, NOT individual Z-scores. This was a deliberate call: a
brand-new user gets a meaningful Rc on day one without needing 30 days of
baseline data. Z-score normalization is layered on later if/when there's enough
history to support it.

| Component | Weight | Mapping |
|-----------|--------|---------|
| HRV | 30% | 6-tier brackets (`<30ms`=15 ... `>90ms`=95) |
| Sleep duration × quality | 25% | duration brackets, quality multiplier |
| Subjective (mood/soreness/energy/stress) | 30% | weighted mean of 1-10 inputs |
| Resting HR | 15% | when present; weights redistribute when absent |

A **CNS sensitivity multiplier** amplifies negative signals for elite athletes
(BW ratio > 3.0×). At 3.5×+, a poor day's deficit is amplified up to 1.5×
because the cost of grinding through a deload-eligible session at 3.6× BW is
catastrophically higher than at 1.5×.

**Auto-regulation tiers** (Rc → daily plan adjustment):

| Rc Range | Adjustment |
|----------|------------|
| `≥ 1.05` | +2.5% intensity on compounds |
| `0.95–1.05` | Plan as written |
| `0.85–0.95` | −1 set, −0.5 RPE cap |
| `0.75–0.85` | −2 sets, −5% intensity, −1.0 RPE |
| `< 0.75` | Deload-level session (50% volume) |

Three consecutive low-Rc days trigger an emergency deload regardless of where
the lifter is in their block.

**Periodization state machine:** `HYPERTROPHY (4wk) → STRENGTH (4wk) →
PEAKING (3wk) → DELOAD (1wk)`. Block advancement is currently owned by the
session-completion flow (other work stream).

**MRV (Maximum Recoverable Volume) scaling:** non-linear with bodyweight ratio.
`≤1.5×`=100%, `2.5×`=88%, `3.0×`=80%, `3.5×+`=65%. At elite intensity, MRV
collapses fast and prescription volume must respect that.

### 4.4 Database (`packages/db`)

**Postgres via Prisma.** 17 models. The schema lives at
`packages/db/prisma/schema.prisma` and is the only place where data shape
is authoritative. (CLAUDE.md says SQLite — that's stale documentation; the
schema declares `provider = "postgresql"`. Worth correcting.)

**Model groupings:**

```
Auth                  User, Account, Session, VerificationToken
Athlete root          Athlete  (1:1 with User after OAuth)
Training              TrainingBlock → TrainingSession → ExercisePrescription
                                                      → CompletedSet
Biometric             BiometricEntry, DailyReadinessScore
Strength records      E1RMRecord, PersonalRecord
Programs              ProgramTemplate → ProgramPhase → ProgramDay
                                                     → ProgramExercise
Progression           ProgressionLog, WeeklySnapshot
Equipment             EquipmentProfile → Barbell, PlateInventory,
                                          Dumbbell, Machine
```

**Indexing patterns:** every athlete-owned model has `@@index([athleteId])`.
Time-series models (BiometricEntry, E1RMRecord, ProgressionLog) have
composite indices on `(athleteId, date)` or `(athleteId, exerciseName)` to
support trailing-window queries without sequential scans.

**Subpath exports:** `@iron-protocol/db` exposes the Prisma client singleton;
`@iron-protocol/db/queries` exposes pre-built query functions like
`getActiveBlock`, `getTrailingBiometrics`, `getSessionAthlete`. Server route
handlers prefer the queries module; raw Prisma usage is allowed but signals
the query is too one-off to share.

## 5. Cross-platform shared layer

This is the architectural bet of the current branch.

### 5.1 `@iron-protocol/api-contract`

Zod schemas for every API request and response. One file per resource:
`records.ts`, `dashboard.ts`, `workout.ts`, `log.ts`, `session.ts`,
`checkin.ts`, `athlete.ts`. A central `endpoints.ts` registers each logical
endpoint with `{ method, path, request, response }` metadata.

```ts
export const endpoints = {
  recordsList:    { method: "GET",    path: "/api/records",       request: null,                      response: RecordsListResponseSchema },
  recordsCreate:  { method: "POST",   path: "/api/records",       request: RecordCreateRequestSchema, response: RecordMutationResponseSchema },
  recordsUpdate:  { method: "PATCH",  path: "/api/records/:id",   request: RecordUpdateRequestSchema, response: RecordMutationResponseSchema },
  // ... 13 endpoints total
} as const;
```

**Why Zod, not OpenAPI:** Zod is the only schema language that natively
produces both runtime validators and TypeScript types from a single source.
OpenAPI requires either codegen (which we'd own) or runtime-validation
libraries that introduce their own DSL (which adds a translation layer).

**Why not tRPC:** tRPC gives end-to-end type safety in TypeScript only. The
watch app is in Swift; tRPC cannot help. Hand-mirroring Zod schemas to Swift
`Codable` structs is more honest about the cross-language boundary.

### 5.2 `@iron-protocol/api-client`

Thin TS client driven by the contract. One factory:

```ts
const client = createApiClient({
  baseUrl: "",                                      // empty = same-origin (web)
  getAuthToken: async () => SecureStore.get("ironToken"),  // mobile
  // OR neither, just credentials: "include" for web cookies
});

const { records } = await client.records.list();
const { entry } = await client.checkin.submit({ mood: 7, soreness: 4, ... });
```

**Pluggable transport:** the web build passes a `fetch` that uses cookies; the
mobile build supplies `getAuthToken()` for bearer auth; the watch app has its
own Swift twin. Same call sites, three transports.

**Errors:** `ApiError` type carries status code + parsed body. `getApiErrorMessage()`
extracts a user-facing message. UI surfaces always show server-provided errors
instead of swallowing them — a regression caught in QOL round 1.

**Outgoing validation:** every `create/update` method runs `Schema.parse(body)`
before sending. Trades microseconds for catching contract drift at the call
site rather than as a server 400. Acceptable tradeoff today; revisit if
profiling shows it.

### 5.3 Why the watch consumes the contract by hand

Three options were considered:

1. **Codegen Swift from JSON Schema** (e.g. `quicktype`). Rejected: another
   build step, another generator to keep current with Zod's evolving API,
   ~10 structs of surface area today. Cost > benefit.
2. **Hand-mirror with strict review discipline.** Chosen. Each Swift struct
   has a comment block listing the TS field correspondence so reviewers can
   spot drift in the diff.
3. **Skip the contract and let watch and TS evolve independently.** Rejected:
   guarantees the same kind of field-name drift that already cost us once
   (the `phaseOrder` vs `order` bug — `/api/program` POST silently 500'd
   because the client wrote one name and Prisma expected another).

The hand-mirror tradeoff has a concrete escape hatch: if the schema surface
grows past ~30 structs, switch to `quicktype` and the call sites don't need
to change.

## 6. Data flow walkthroughs

### 6.1 Daily check-in (`POST /api/biometric`)

```
                   ┌────────────┐
                   │ /checkin    │ user submits subjective + HealthKit values
                   │ page.tsx    │
                   └─────┬──────┘
                         │ api.checkin.submit({ mood, ... })
                         ▼
   ┌───────────────────────────────────────────────────────┐
   │ api-client.checkin.submit                             │
   │   - Schema.parse(body)                                │
   │   - fetch POST /api/biometric, credentials: include   │
   │   - response.json() → BiometricCheckinResponse.parse  │
   └─────────────────┬─────────────────────────────────────┘
                     │
                     ▼
   ┌───────────────────────────────────────────────────────┐
   │ /api/biometric POST handler                           │
   │   1. getSessionAthlete()         → 401 if missing     │
   │   2. validate body (Zod schema)                       │
   │   3. prisma.biometricEntry.create({ ... athleteId })  │
   │   4. core-logic computeReadiness(entry, athlete)      │
   │   5. prisma.dailyReadinessScore.upsert({ ... })       │
   │   6. NextResponse.json({ entry })                     │
   └─────────────────┬─────────────────────────────────────┘
                     │
                     ▼
              Postgres (BiometricEntry + DailyReadinessScore rows)
```

### 6.2 Logging a set (`POST /api/log`)

```
   /workout page.tsx → api.workout.logSet({ sessionId, prescriptionId, ... })
                                              │
                                              ▼
   api-client.workout.logSet
                                              │
                                              ▼
   /api/log POST handler:
     1. getSessionAthlete()
     2. load session → block; verify block.athleteId === athlete.id   (ownership)
     3. load prescription; verify prescription.sessionId === sessionId (ownership)
     4. prisma.completedSet.create({ ... })
     5. e1rm = core-logic.estimateE1RM(weight, reps)
     6. prisma.e1RMRecord.create({ athleteId, exercise, e1rmLbs, ... })  (side effect)
     7. NextResponse.json({ set })
```

The e1RM side-effect is intentional: every working set updates the athlete's
running e1RM history. Edits and deletes do NOT retroactively rewrite e1RM
history because there is no per-set FK on `E1RMRecord` and matching by
`(weight, reps)` is ambiguous. This is documented in code; the rule is
**e1RM history is append-only**.

### 6.3 Watch reading readiness

```
   ReadinessGlanceView .task { await api.dashboard.get() }
                                  │
                                  ▼
   ApiClient.dashboard.get  (Swift)
     - URLRequest GET <baseURL>/api/biometric
     - header: Authorization: Bearer <Info.plist:IronProtocolDevBearer>
     - JSONDecoder().decode(DashboardResponse.self, from: data)
                                  │
                                  ▼
   /api/biometric GET handler:
     1. getSessionAthlete()  ← resolves bearer token to Athlete
     2. fetch trailing 30 days of BiometricEntry
     3. fetch latest DailyReadinessScore
     4. NextResponse.json({ entries, readiness })
```

The watch and the web hit the same endpoint with the same response shape.
Auth is the only thing that differs.

## 7. Smart design decisions

These are the choices that have already paid off or that we expect to pay off
as the system grows.

### 7.1 Zod-first contract

A single source of truth for API shapes that is simultaneously a runtime
validator and a TypeScript type. Migrating `/records` revealed that the page
had been declaring a `notes` field on `PR` that the database never persisted —
the contract surfaced the drift immediately. Cost: a few hundred lines of
schema. Benefit: every future endpoint addition forces explicit shape design.

### 7.2 Pure core-logic with zero monorepo imports

Readiness, autoreg, e1RM, MRV — all testable without spinning up Prisma or
Next.js. The same package will eventually back the watch app's local
HealthKit-derived previews (port the math to Swift, or call back to the
server, but the math itself is the contract).

### 7.3 Single auth funnel via `getSessionAthlete`

One helper, called by every handler. Resolves NextAuth session OR bearer
token to a single `Athlete`. Lazy-provisions the Athlete on first call after
Google OAuth signup (so the user does not see an empty-onboarding state).
Round 1 caught two endpoints that bypassed this — `/api/log` and
`/api/session/complete` — which let any authenticated user write to any other
user's training data. The funnel pattern is now the only way new endpoints
get auth.

### 7.4 Population-norm readiness over Z-score normalization

A new user's first check-in produces a meaningful Rc instead of "we need 30
days of baseline before this works." This is a UX-driven math choice and it
trades long-term per-athlete precision for day-one usefulness. The hooks for
adding Z-score adjustment as an additional layer are already there in
`packages/core-logic/src/engine/`.

### 7.5 Mobile-first responsive web instead of separate native + web

The web app is the UI for desktop AND mobile browsers. It uses bottom-nav at
`<768px` and a top-nav above. Numeric inputs use `inputMode` so iOS Safari
shows the right soft keyboard. This delays the cost of a separate
React-Native UI (mobile uses a thin native shell over the same API) without
sacrificing mobile-web ergonomics.

### 7.6 Standalone watchOS app (not paired)

watchOS 10+ supports independent apps. Pairing forces the iPhone to be awake;
independent works on the wrist alone. For a check-in / glance use case, the
"phone in a locker" workflow is the dominant one for elite athletes mid-session.

### 7.7 Ownership scoping is a chain walk, not a denormalized field

When `/api/log/[id]` deletes a `CompletedSet`, the ownership check walks
`set → session → block → athleteId`. We don't denormalize `athleteId` onto
`CompletedSet` because the Prisma graph is small enough to walk cheaply, and
denormalization creates two-source-of-truth bugs the next time a session
moves between blocks (rare but possible).

### 7.8 Error boundaries at the app root

Next.js's default `Application error` screen is a stack trace with no escape.
A typed `error.tsx` catches render-time throws, shows an iron-themed message,
and offers a Reset button. `not-found.tsx` does the same for 404s. Cheap to
add; one critical-impression-per-failure quality difference.

### 7.9 `inputMode` on every numeric field

iOS Safari's `<input type="number">` shows a QWERTY keyboard with a tiny
numeric strip. `inputMode="numeric"` shows the native number pad. This is
trivially correct once you know to do it — and is now applied across every
form in the web app via QOL round 3.

### 7.10 Append-only e1RM history

Edits to a logged set do not rewrite the e1RM trail. There is no per-set FK
on `E1RMRecord` and no good rule for matching post-edit. This is a deliberate
choice that keeps the e1RM curve a faithful record of what the athlete
actually thought their max was at each point in time — useful for trend
analysis even if the underlying set was later corrected.

## 8. Improvement opportunities

In rough priority order. Numbers are estimates of effort, not commitments.

### 8.1 Migrate the remaining 5 web pages to the contract (M)

`/`, `/block`, `/connect`, `/program`, `/progress` still call `fetch` directly.
Each page costs ~30 min and a contract-schema addition. Does not unlock new
features, but locks in the foundation so the next contract change can't be
forgotten on a stale page.

### 8.2 OpenAPI export from the Zod registry (S)

Generate an `openapi.json` from `endpoints` so external tools (Postman, the
mobile QA team, future third parties) can consume the contract without reading
TS. `zod-to-openapi` is a single dependency. Doesn't change runtime; pure
documentation export.

### 8.3 Migrate mobile to `@iron-protocol/api-client` (M)

Mobile is the ONE consumer that still hand-rolls fetches. Coordinate with the
mobile work stream. Plug `getAuthToken: () => SecureStore.getItemAsync("ironToken")`
into the factory and replace the existing helpers. Same call sites as web after.

### 8.4 Watch app — actually create the Xcode project (S, requires user)

All Swift sources are written; the Xcode project is not. User opens Xcode,
creates a watchOS App target, drags in the existing files, sets Info.plist
keys, runs on a simulator. Steps documented in `apps/watch/README.md`.

### 8.5 Watch Phase 2 — HealthKit pull + complications (L)

Replace the `// TODO: HealthKit pull` placeholders with real `HKHealthStore`
queries for HRV and sleep. Add a `ComplicationController` for showing Rc on
the watch face. Move the bearer token from Info.plist to a shared Keychain
via App Group (requires the iPhone app to also enable that group).

### 8.6 Push readiness recompute to a background job (M)

Today, `POST /api/biometric` synchronously computes `DailyReadinessScore` and
upserts it. Fine at single-user volume; pathological at write-storm volume
(e.g. an Oura backfill ingesting 30 days at once). A queue (BullMQ on Redis,
or Inngest if we want SaaS) lets the API return immediately and the score
catches up asynchronously. Worth it once we have OAuth ingestion live.

### 8.7 Consolidate `getSessionAthlete` location (S)

It currently lives in `packages/db/src/queries.ts`. That module shouldn't know
about NextAuth. Move to `apps/web/src/lib/auth.ts` and have `db/queries`
expose only the lookup-by-userId primitive. Pure cleanup.

### 8.8 Address the `Dynamic server usage` warnings on `/api/workout` and `/api/fatigue` (S)

Both routes call `headers()` (transitively, via `getSessionAthlete`), which
forces dynamic rendering and triggers a build warning. Either suppress
explicitly with `export const dynamic = "force-dynamic"` or move auth into a
middleware that doesn't pay the dynamic-rendering tax. Cosmetic but noisy.

### 8.9 Background block-advancement job (M)

Session completion currently updates the block in-line. If we ever support
batch session completion (e.g. importing a week's worth of training data),
the block math is order-sensitive and concurrent writes can race. A job that
processes session completions serially per athlete fixes this and gives us
retry semantics for free.

### 8.10 Tests (M, ongoing)

`packages/core-logic` has the highest leverage for tests because it's pure.
Today there are no tests in that package. A vitest suite covering readiness
brackets, autoreg tier transitions, and e1RM composite calculation would
catch numerical regressions at a fraction of the cost of integration testing.
After core-logic, add contract tests that hit each endpoint with a Zod-fixture
body to verify the server matches the contract.

### 8.11 Observability (M)

There is no structured logging today. `console.error` is the closest thing.
For a coaching app the data point that matters most is "did the autoreg
engine pick the right tier," which means we need to log every Rc computation
with input, intermediate, and output values. Pino + a downstream sink
(Datadog, Logtail) is the lowest-friction option.

### 8.12 Move the schema to `@@schema` for multi-tenant readiness (L)

Today everything is in the public Postgres schema. If we ever want
per-organization isolation (a coach managing multiple athletes), Prisma
supports per-schema multi-tenancy. Not urgent — single-tenant is the right
shape for the personal-coaching MVP — but the ORM choice does NOT preclude
it.

### 8.13 Address the "stray `ios/`" and persistent-dirt issues (S)

Multiple agents have flagged `ios/` at the repo root and the always-modified
`apps/mobile/app.json` / `pbxproj` files in `git status`. Likely fix:
`.gitattributes` for the always-touched files, plus one cleanup commit to
remove the stray `ios/`. Not architectural, just keeps `git status` honest.

### 8.14 Update CLAUDE.md (S)

`CLAUDE.md` says SQLite. Schema says Postgres. Update the doc to match
reality, or — if SQLite is genuinely the dev backend for some setups —
document both with a clear note about which is canonical.

## 9. Roadmap snapshot

```
Now (branch: arch/shared-api-contract)
  ├─ api-contract + api-client packages live
  ├─ /records, /workout, /checkin, /history, /profile migrated
  └─ apps/watch scaffold complete (15 Swift files, 4 views)

Next (this branch, before merge)
  ├─ Migrate /, /block, /connect, /program, /progress to api-client
  └─ OpenAPI export from endpoints registry

After merge to main
  ├─ Coordinate with mobile stream → mobile adoption of api-client
  ├─ User creates Xcode project for apps/watch
  └─ Phase 1 watch app shipping to TestFlight

Phase 2
  ├─ HealthKit HRV/sleep pull on watch
  ├─ Complications (Rc on watch face)
  ├─ App Group + shared Keychain for production auth
  └─ Background readiness recompute (BullMQ)

Phase 3
  ├─ Real Oura/WHOOP OAuth ingestion (currently stubbed)
  ├─ Block-advancement queue
  └─ Multi-tenant schema for coach/athlete model
```

## 10. Quick reference

**To add a new endpoint:**
1. Add a Zod schema in `packages/api-contract/src/schemas/`.
2. Register it in `endpoints.ts`.
3. Implement the route handler in `apps/web/src/app/api/.../route.ts` —
   import the schema, validate the request, scope to athlete.
4. Add a method to the relevant namespace in `packages/api-client/src/client.ts`.
5. (If watch needs it) add a Swift `Codable` mirror + `ApiClient.swift` method.

**To add a new web page:**
1. Create `apps/web/src/app/<route>/page.tsx`.
2. Use server components by default; flip to client component only for
   interactivity.
3. Fetch data via `api.<namespace>.<method>()` from `apps/web/src/lib/apiClient`.
4. Use `formatShortDate` / `formatWeight` from `apps/web/src/lib/format` for
   display.
5. Add to nav in `apps/web/src/components/Nav.tsx` (or its mobile twin).

**To debug an auth failure:**
1. Check the route calls `getSessionAthlete()` first thing.
2. Verify the request has either a session cookie OR `Authorization: Bearer`.
3. Confirm the Athlete row exists for the User (lazy-provisioning runs once
   per user — if it failed, the row is missing and `getSessionAthlete` returns
   null).

**To test the watch locally:**
1. `npm run dev` in repo root (Next.js on `:3000`).
2. Get your Mac's LAN IP: `ipconfig getifaddr en0`.
3. Set `IronProtocolBaseURL` in the watch target's Info.plist to
   `http://<lan-ip>:3000`.
4. Generate a dev bearer: `curl -X POST localhost:3000/api/auth/mobile -H "Cookie: <session>"` and put it in `IronProtocolDevBearer`.
5. Run on a paired watch simulator.
