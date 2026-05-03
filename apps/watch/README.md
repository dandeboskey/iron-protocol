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
- `ReadinessGlanceView` — calls `GET /api/biometric` via `ApiClient.swift`,
  displays the readiness coefficient + last check-in date, with a "Open on
  iPhone" affordance that hands off via Universal Link.
- `CheckinQuickView` — four steppers (mood/soreness/energy/stress, 1-10),
  submits via `POST /api/biometric` (HRV/sleep nil for now; HealthKit pull
  is Phase 2).
- Hand-mirrored `Codable` types for the contract schemas (records,
  dashboard, workout, log, session-complete, biometric check-in).
  Field-by-field correspondence to the TS Zod schemas is documented inline.

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
│   ├── Workout.swift              # mirrors WorkoutResponseSchema and friends
│   ├── LogSet.swift               # mirrors LogSet*RequestSchema + LogSet*ResponseSchema
│   ├── SessionComplete.swift      # mirrors SessionComplete*Schema (incl. TrainingBlockAdvanced)
│   └── BiometricCheckin.swift     # mirrors BiometricCheckinRequest/Response
├── Networking/
│   └── ApiClient.swift            # async/await transport + namespaced endpoints
│                                  # (records / dashboard / workout / checkin)
└── Views/
    ├── ReadinessGlanceView.swift  # Phase 1 readiness glance
    └── CheckinQuickView.swift     # Phase 1 daily check-in (4 subjective scales)
```

A `Package.swift` is intentionally **not** included. The user creates a
WatchOS app target via Xcode's template and drags these files into the
project — that's lower friction than maintaining a SwiftPM target that
duplicates Xcode's app-template plumbing.

## Phase 1 work breakdown (Xcode steps)

The scaffold above is source-only. The following steps create an actual
buildable WatchOS target. Do them on a Mac with Xcode 15+.

1. **Create the project.** Xcode > File > New > Project > watchOS > App.
   - Product name: `IronProtocolWatch`
   - Bundle ID: `com.danieldeboskey.ironprotocol.watch` (or your reverse-DNS)
   - Interface: SwiftUI
   - Language: Swift
   - Include Tests: optional
   - Save the project at `apps/watch/IronProtocolWatch.xcodeproj` (alongside
     this README, NOT inside the `IronProtocolWatch/` source folder).

2. **Drag in the source files.** In the Xcode project navigator, delete the
   template-generated `ContentView.swift` and `App.swift`. Right-click the
   target > Add Files to "IronProtocolWatch", select all three folders
   (`Models/`, `Networking/`, `Views/`) and `IronProtocolWatchApp.swift`
   under `apps/watch/IronProtocolWatch/`. Choose "Create groups", NOT
   "Create folder references".

3. **Set the deployment target.** Select the target > General > Deployment
   Info > set Minimum Deployments to watchOS 10.0 (or 11.0 if you've
   updated the runtime).

4. **Wire the app entry.** Confirm `IronProtocolWatchApp.swift` is the
   `@main` entry. Open the file and verify it instantiates `ApiClient`
   with the dev base URL and injects it via `.environmentObject`.

5. **Configure Info.plist.**
   - Add an `NSAppTransportSecurity` exception for `localhost` while
     developing against the local Next.js server (`http://localhost:3000`).
     Production should drop the exception and use HTTPS.
   - Add `NSHealthShareUsageDescription` and
     `NSHealthUpdateUsageDescription` strings even though Phase 1 doesn't
     read HealthKit yet — Apple rejects builds that import HealthKit
     without the keys, and Phase 2 will need them.

6. **Provide a dev bearer token.** Until the App Group keychain ship is
   wired (see Auth section), hardcode a token at boot in
   `IronProtocolWatchApp.swift` from your `.env.local`. Mark the line
   with a `// TODO: replace with shared keychain` so it doesn't ship.

7. **Run on the simulator.** Select an Apple Watch simulator scheme and
   hit Run. The watch sim shares the host's network, so
   `http://localhost:3000` works. You should see the readiness glance
   render against your seeded dev data, and the check-in view should POST
   successfully and show "Submitted".

8. **(Optional) Add to git later.** The `.xcodeproj` is intentionally not
   committed yet — it's per-developer and full of absolute paths. Commit
   when the team is ready to standardize on a single project file.
