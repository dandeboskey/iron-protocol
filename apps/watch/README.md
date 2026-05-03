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

- Vertical-page `TabView` `RootView` that swipes between four tabs:
  - `ReadinessGlanceView` — calls `GET /api/biometric` via
    `ApiClient.swift`, displays the readiness coefficient + score, the
    first auto-reg flag if any, and the age of the most recent check-in
    ("checked in 3h ago").
  - `TodaysWorkoutView` — calls `GET /api/workout`, shows block + day
    label, and a compact list of regulated prescriptions (sets × reps @
    RPE · target lb · % e1RM). Read-only; logging is iPhone-side in v1.
  - `BlockSummaryView` — wraps the block summary from the workout
    response: phase, week N of M, days left, emergency-deload flag.
  - `CheckinQuickView` — Digital Crown sliders (1–10) for mood, soreness,
    energy, stress; submits via `POST /api/biometric` with HRV/sleep nil
    (HealthKit pull lands in Phase 2).
- Hand-mirrored `Codable` types for the contract schemas (records,
  dashboard, workout, log, session-complete, biometric check-in).
  Field-by-field correspondence to the TS Zod schemas is documented inline.
- Modern `@Observable` macro on `ApiClient` (Swift 5.9+ / watchOS 10+);
  injected via `.environment(...)` and read with
  `@Environment(ApiClient.self)`.

## Phase 2 roadmap

- **HealthKit ingestion.** Pull most-recent HRV (SDNN) and sleep duration
  samples on submit so the wrist check-in automatically populates the
  fields the readiness engine weighs heaviest. Will require:
  - `NSHealthShareUsageDescription` strings.
  - `HealthKit.framework` linked.
  - A `HealthStore.requestAuthorization(toShare: [], read:
    [hrvType, sleepType])` call gated behind a one-time onboarding step.
- **Complications.** Surface `Rc 1.02 GO` on the watch face. Modular,
  corner, and graphic-circular families; refresh budget-aware via
  `WidgetKit` timeline policies.
- **App Group + shared Keychain auth.** Replace the dev bearer with a
  shared-Keychain read; the iPhone app's existing Google sign-in flow
  writes the bearer when it refreshes; the watch reads it. Add the App
  Group entitlement to both targets and use the same `accessGroup` on
  both sides.
- **Deep-link / handoff to iPhone.** "Log this set" button on the watch
  opens the iPhone app at `/workout` via `NSUserActivity` + Universal
  Link. Logging stays on the iPhone — entering weight + reps + RPE on a
  41mm screen is fat-finger territory at scale.
- **Independent operation.** Store an offline check-in queue in
  `UserDefaults` (or App Group container) when the network is down;
  drain on reachability.

## Networking

- Hand-mirrored `Codable` structs in `Models/`. **No code generation.**
  The TS surface is small (~12 endpoints / ~12 structs), and Swift
  `Codable` with matching field names round-trips cleanly. Convention:
  every Zod schema in `@iron-protocol/api-contract` gets a matching
  Swift struct with the same name and field names. When a TS schema
  changes, update the Swift mirror in the same PR. A diff in CI between
  `packages/api-contract/src/schemas/*.ts` and
  `apps/watch/.../Models/*.swift` is a future enhancement; for Phase 1
  we rely on review discipline.
- `ApiClient.swift` mirrors `@iron-protocol/api-client`'s namespace shape
  (`api.records.list()`, `api.dashboard.get()`, `api.workout.today()`,
  `api.checkin.submit(...)`).
- `ApiClient.fromInfoPlist()` is the production constructor: it reads
  `IronProtocolBaseURL` and `IronProtocolDevBearer` from the bundle's
  Info.plist and throws a `ApiError.missingConfig(key:)` with a clear
  message if either is absent. The app entry point catches this and
  shows a config-error screen instead of crashing.

## Auth

- **Phase 1 dev/test**: bearer token from the Next.js `.env.local`,
  injected into the watch target's Info.plist as `IronProtocolDevBearer`.
  `ApiClient` reads it once at boot. This is *temporary* — do not commit
  a real token.
- **Phase 1 ship**: shared Keychain via App Group between the iPhone app
  and the watchOS app. The mobile app already obtains a JWT in
  `apps/mobile` (Google sign-in flow → bearer for `/api/auth/mobile`);
  when the watch app ships we add an App Group entitlement to both
  targets and read/write `ironProtocolBearer` from a shared keychain
  access group.
- **Phase 2**: silent token refresh on the watch when iPhone is
  unreachable (refresh-token flow direct to backend).

## Backend base URL

Set in the watch target's Info.plist as `IronProtocolBaseURL`:

- **Simulator on the same Mac**: `http://localhost:3000` works because
  the watch simulator shares the host's network namespace.
- **Real watch (paired iPhone, same LAN)**: use the Mac's LAN IP, e.g.
  `http://192.168.1.10:3000`. `localhost` does NOT reach the watch
  hardware — it has its own network stack. Confirm the IP by running
  `ipconfig getifaddr en0` on the Mac and that your firewall isn't
  blocking inbound connections to port 3000.
- **Real watch + dev cert**: HTTPS to a public dev URL (ngrok / tailscale
  funnel) is the smoothest path. ATS rejects raw-IP HTTP unless you add
  an exception, which we'd rather not ship.
- **Prod**: `https://<your-vercel-domain>`. Drop any ATS exception.

## File layout (drag these into the Xcode project)

```
IronProtocolWatch/
├── IronProtocolWatchApp.swift     # @main entry; wires ApiClient + RootView
├── Models/
│   ├── PersonalRecord.swift       # mirrors PersonalRecordSchema
│   ├── Biometric.swift            # mirrors BiometricEntrySchema, Readiness, DashboardResponse
│   ├── Workout.swift              # mirrors WorkoutResponseSchema and friends
│   ├── LogSet.swift               # mirrors LogSet*RequestSchema + LogSet*ResponseSchema
│   ├── SessionComplete.swift      # mirrors SessionComplete*Schema (incl. TrainingBlockAdvanced)
│   ├── BiometricCheckin.swift     # mirrors BiometricCheckinRequest/Response
│   └── Time.swift                 # relativeTimeString(from:) helper
├── Networking/
│   └── ApiClient.swift            # async/await transport + namespaced endpoints
│                                  # (records / dashboard / workout / checkin)
│                                  # @Observable + Info.plist config reader
└── Views/
    ├── RootView.swift             # vertical-page TabView (4 tabs)
    ├── ReadinessGlanceView.swift  # readiness glance + last-check-in age
    ├── TodaysWorkoutView.swift    # regulated prescriptions for today
    ├── BlockSummaryView.swift     # block phase + week/day + emergency flag
    └── CheckinQuickView.swift     # crown-driven 1–10 sliders + submit
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
   updated the runtime). The `@Observable` macro and `.verticalPage`
   `TabViewStyle` both require watchOS 10.

4. **Wire the app entry.** Confirm `IronProtocolWatchApp.swift` is the
   `@main` entry. The scene constructs `ApiClient.fromInfoPlist()` once
   at launch and injects the result via `.environment(client)`. If
   either Info.plist key is missing the app shows a `ConfigErrorView`
   instead of crashing.

5. **Configure Info.plist.** Add these keys to the watch target's
   `Info.plist`:
   - `IronProtocolBaseURL` (String) — e.g. `http://localhost:3000` (sim)
     or `http://192.168.1.10:3000` (real watch on same LAN as Mac).
   - `IronProtocolDevBearer` (String) — copy your dev bearer from the
     Next.js `.env.local`. Mark the row with a `// TODO: replace with
     shared keychain` comment in code so it doesn't ship to TestFlight.
   - `NSAppTransportSecurity` (Dictionary) with `NSAllowsArbitraryLoads
     = true` while developing against plain-HTTP localhost. Drop this
     for the production build.
   - `NSHealthShareUsageDescription` and `NSHealthUpdateUsageDescription`
     strings — even though Phase 1 doesn't read HealthKit, Apple will
     reject builds that link `HealthKit.framework` without them, and
     Phase 2 needs HealthKit.

6. **Run on the simulator.** Select an Apple Watch simulator scheme and
   hit Run. The watch sim shares the host's network, so
   `http://localhost:3000` works. You should see the readiness glance
   render against your seeded dev data; swipe right for today's workout,
   block summary, and the quick check-in. Submit a check-in and confirm
   "Submitted" appears.

7. **Run on a real watch (optional, Phase 1 ship).** Set
   `IronProtocolBaseURL` to your Mac's LAN IP (`ipconfig getifaddr en0`),
   plug the watch's paired iPhone into Xcode, select the watch as the
   destination, and run. The watch must be on the same Wi-Fi as the
   Mac. Confirm the firewall allows incoming on port 3000.

8. **(Optional) Add to git later.** The `.xcodeproj` is intentionally
   not committed yet — it's per-developer and full of absolute paths.
   Commit when the team is ready to standardize on a single project
   file. The Info.plist with the dev bearer should NEVER be committed.
