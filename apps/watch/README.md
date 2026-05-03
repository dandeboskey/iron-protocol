# Iron Protocol Watch

A standalone watchOS app (target: **watchOS 10+**) that surfaces a glance of
the lifter's current state — readiness, last check-in, today's prescription
preview — and links back to the iPhone app for any deeper interaction.

## Decision: standalone Xcode project, not nested in `apps/mobile/ios/`

The iPhone app (`apps/mobile`) is an Expo / React Native project. Adding a
watchOS target to its native iOS project means dragging WatchOS configuration
into a generated Pods/Expo native shell that gets re-prebuilt regularly. We
keep the watch app **independent**:

- Lives at `apps/watch/`.
- The user creates a new Xcode project with **File > New > Project >
  watchOS App** and points its source directory at
  `apps/watch/IronProtocolWatch/`.
- Modern SwiftUI app lifecycle (no companion-iPhone dependency required).
  Phase 1 is a pure-watchOS app that talks to the same Next.js backend the
  web and mobile apps use.

## Phase 1 scope (this scaffold)

- "Hello, Iron Protocol" boot.
- One screen: `ReadinessGlanceView` — calls `GET /api/biometric` via
  `ApiClient.swift`, displays the readiness coefficient + last check-in date,
  with a "Open on iPhone" affordance that hands off via Universal Link.
- Hand-mirrored `Codable` types for the three contract schemas (records,
  dashboard, workout). Field-by-field correspondence to the TS Zod schemas
  is documented inline.

## Phase 2 (deferred)

- Full session execution from the wrist: prescription list, set logging,
  haptic rest timers, real-time HR streaming via HealthKit.
- Independent operation when iPhone is out of range.

## Networking

- Hand-mirrored `Codable` structs in `Models/`. **No code generation.**
  The TS surface is small (3 endpoints / ~10 structs), and Swift `Codable`
  with matching field names round-trips cleanly. Convention: every Zod
  schema in `@iron-protocol/api-contract` gets a matching Swift struct
  with the same name and field names. When a TS schema changes, update
  the Swift mirror in the same PR. A diff in CI between
  `packages/api-contract/src/schemas/*.ts` and `apps/watch/.../Models/*.swift`
  is a future enhancement; for Phase 1 we rely on review discipline.
- `ApiClient.swift` mirrors `@iron-protocol/api-client`'s namespace shape
  (`api.records.list()`, `api.dashboard.get()`, `api.workout.today()`).

## Auth

- **Phase 1 dev/test**: hardcode a bearer token from `.env.local` of the
  Next.js app. Set it on `ApiClient(baseURL:token:)` at boot. Document this
  is *temporary*.
- **Phase 1 ship**: shared Keychain via App Group between the iPhone app
  and the watchOS app. The mobile app already obtains a JWT in
  `apps/mobile` (Google sign-in flow → bearer for `/api/auth/mobile`); when
  the watch app ships we add an App Group entitlement to both targets and
  read/write `ironProtocolBearer` from a shared keychain access group.
- **Phase 2**: silent token refresh on the watch when iPhone is unreachable
  (refresh-token flow direct to backend).

## Backend base URL

- Dev: `http://localhost:3000` (only works on simulator; the watch sim shares
  the host network).
- Prod: whatever domain `apps/web` is deployed to. Inject via build setting,
  not a hardcoded constant.

## File layout (drag these into the Xcode project)

```
IronProtocolWatch/
├── IronProtocolWatchApp.swift     # @main entry point (SwiftUI App)
├── Models/
│   ├── PersonalRecord.swift       # mirrors PersonalRecordSchema
│   ├── Biometric.swift            # mirrors BiometricEntrySchema, Readiness, DashboardResponse
│   └── Workout.swift              # mirrors WorkoutResponseSchema and friends
├── Networking/
│   └── ApiClient.swift            # async/await transport + endpoint methods
└── Views/
    └── ReadinessGlanceView.swift  # Phase 1 UI
```

A `Package.swift` is intentionally **not** included. The user creates a
WatchOS app target via Xcode's template and drags these files into the
project — that's lower friction than maintaining a SwiftPM target that
duplicates Xcode's app-template plumbing.
