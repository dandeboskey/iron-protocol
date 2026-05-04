# Cross-Platform Code Sharing

Iron Protocol runs on three frontends (web TS, mobile TS, watch Swift) plus
one backend (Next.js TS). This document inventories what we already share,
what we duplicate, and where the next sharing investments should land.

## TL;DR

We already share most of what should be shared. The biggest remaining wins
come from extracting **constants and validation rules** (currently
TS-encoded) into a language-neutral source so the watch (Swift) consumes
them without hand-mirroring drift.

| Domain | Today | Proposal | Risk |
|--------|-------|----------|------|
| Math (e1RM, readiness, MRV) | TS-only in `core-logic`; runs on backend | Keep server-only. Clients display, don't compute. | LOW |
| API request/response shapes | Zod TS source; Swift hand-mirror | Codegen Swift from Zod via JSON Schema (when surface > 30) | LOW |
| Validation rules (min/max, ranges) | Spread across HTML attrs, route handlers, forms | Pull from Zod schema as single source | LOW |
| Constants (Rc tiers, MRV scale, phase weeks) | TS const objects in `core-logic` | Extract to JSON in a shared package; Swift reads from bundle | LOW |
| Exercise catalog | Scattered in seed + form selects | One JSON file consumed by all platforms | LOW |
| Date/number formatting | Per-platform (Intl on TS, RelativeDateTimeFormatter on Swift) | Leave alone — idiom matters | n/a |
| UI components | Per-platform (Tailwind, native React Native, SwiftUI) | Leave alone — the abstraction cost > benefit | n/a |

---

## What we already share

### `@iron-protocol/core-logic` — math

Pure TS. Web and mobile both import it; backend route handlers call it
directly. The watch app does NOT need it: math runs server-side and the
watch displays pre-computed values.

**This is the right boundary.** The math is the product. Putting it in one
place — and keeping it pure — means a single test suite covers every
platform's correctness. Porting it to Swift would mean two implementations
to keep in lockstep with the auto-regulation engine, which is the highest-
churn part of the codebase.

### `@iron-protocol/api-contract` — schemas

Zod schemas in TS. The watch hand-mirrors them as Swift `Codable` structs.
This is duplication, but bounded:

- **TS consumers** (web, mobile) get the schemas + types directly.
- **Swift consumers** get a parallel set of structs with one comment block
  per struct documenting field-by-field correspondence with the TS schema.
- **Drift detection** is by code review on the diff. Today this is fine
  because there are 13 endpoints / ~10 structs.

### `@iron-protocol/api-client` — network calls

TS client used by web (and intended for mobile). The watch has its own
Swift `ApiClient.swift` because Swift can't import TS. Same structure:
namespaced methods, async/await, typed errors.

This is also duplication, but the duplication is shallow. The "interesting"
part of an API client (path templates, auth headers, error shape) is
identical between TS and Swift. The "boring" part (`fetch` vs `URLSession`)
is platform-specific anyway.

---

## What we duplicate that we should NOT duplicate

### 1. Validation rules

**Today:**
- Web form sets `min={1}` `max={10}` on RPE.
- API route handler validates again via Zod `.min(1).max(10)`.
- Mobile and watch don't currently validate at all (or hand-encode their
  own ranges).

The Zod schema in `packages/api-contract` already encodes most ranges via
`.refine` predicates and `.number().min().max()`. **Pull HTML constraints
from the schema** instead of writing them twice.

**Proposal:**

```ts
// packages/api-contract/src/constraints.ts
export function htmlConstraintsFor(schema: z.ZodNumber): {
  min?: number; max?: number; step?: number;
} {
  // Walk the schema's _def.checks and translate to HTML attributes.
  // Returns { min, max, step } that <input> can spread directly.
}

// In a form:
import { htmlConstraintsFor, RpeSchema } from "@iron-protocol/api-contract";
<input type="number" inputMode="decimal" {...htmlConstraintsFor(RpeSchema)} />
```

For Swift: serialize the constraints into `validation.json` via the build
step proposed in §3 below. Watch reads ranges from that JSON.

**Effort:** S. Single helper, retrofit existing forms incrementally.
**Payoff:** changing a constraint becomes a one-file edit instead of
needing to hunt down every input across web + mobile + watch.

### 2. Magic-number constants

**Today (excerpt from `core-logic`):**
- Rc tier breakpoints: `0.75, 0.85, 0.95, 1.05`
- MRV scale by BW ratio: `[1.5, 2.5, 3.0, 3.5+]` → `[1.0, 0.88, 0.80, 0.65]`
- Phase week counts: `HYPERTROPHY=4`, `STRENGTH=4`, `PEAKING=3`, `DELOAD=1`
- e1RM cap: `12 reps`
- Emergency deload trigger: `3 consecutive low-Rc days`

These are domain constants. Today they live in TS. The watch app doesn't
display them, but a future "explain my readiness" UI on the watch would
need them. Hand-coding them in Swift is exactly the maintenance pit we
want to avoid.

**Proposal:** extract to a JSON file at the contract package root:

```
packages/api-contract/src/
├── schemas/
├── constants.json         ← new — single source for domain numbers
├── constants.ts           ← thin re-export, parses + types the JSON
├── endpoints.ts
└── index.ts
```

```jsonc
// constants.json
{
  "readinessTiers": {
    "boost":  { "minRc": 1.05, "intensityDelta": 0.025 },
    "normal": { "minRc": 0.95, "maxRc": 1.05 },
    "reduce": { "minRc": 0.85, "maxRc": 0.95, "setDelta": -1, "rpeDelta": -0.5 },
    "regress":{ "minRc": 0.75, "maxRc": 0.85, "setDelta": -2, "intensityDelta": -0.05, "rpeDelta": -1.0 },
    "deload": { "maxRc": 0.75, "volumeFactor": 0.50 }
  },
  "mrvScale": [
    { "bwRatio": 1.5, "factor": 1.00 },
    { "bwRatio": 2.5, "factor": 0.88 },
    { "bwRatio": 3.0, "factor": 0.80 },
    { "bwRatio": 3.5, "factor": 0.65 }
  ],
  "phases": {
    "HYPERTROPHY": { "weeks": 4 },
    "STRENGTH":    { "weeks": 4 },
    "PEAKING":     { "weeks": 3 },
    "DELOAD":      { "weeks": 1 }
  },
  "e1rmRepCap": 12,
  "emergencyDeloadConsecutiveLowDays": 3
}
```

TS consumes via:

```ts
// packages/api-contract/src/constants.ts
import constants from "./constants.json" assert { type: "json" };
export const PROTOCOL = constants;
```

Swift consumes via Bundle resource (the JSON ships inside the watch app's
target — drag the file into Xcode):

```swift
struct Protocol: Decodable {
    let readinessTiers: [String: ReadinessTier]
    let mrvScale: [MrvPoint]
    // ...
    static let shared: Protocol = {
        let url = Bundle.main.url(forResource: "constants", withExtension: "json")!
        return try! JSONDecoder().decode(Protocol.self, from: Data(contentsOf: url))
    }()
}
```

**Effort:** M. Need to update `core-logic` callsites to read from the new
constants object, and add a Swift `Protocol.swift`.
**Payoff:** rebalancing a Rc tier or MRV breakpoint changes one line of
JSON instead of three platforms' source.

### 3. Exercise catalog

**Today:** the seed `prisma/seed.ts` lists the canonical exercises (Squat,
Bench, Deadlift, OHP, Row, etc.). Forms hardcode `<option>` lists. The
watch's `TodaysWorkoutView` displays whatever the API returns but has no
local list for offline previews.

**Proposal:** `packages/api-contract/src/exercises.json`:

```jsonc
[
  { "id": "squat",        "displayName": "Squat",         "type": "COMPOUND", "isMainLift": true },
  { "id": "bench-press",  "displayName": "Bench Press",   "type": "COMPOUND", "isMainLift": true },
  { "id": "deadlift",     "displayName": "Deadlift",      "type": "COMPOUND", "isMainLift": true },
  { "id": "ohp",          "displayName": "Overhead Press","type": "COMPOUND", "isMainLift": false },
  // ... ~30 entries
]
```

Web form `<select>` populates from this list. Watch reads from bundle.
The seed re-uses the same file. Server validates `exerciseName` against
the list.

**Effort:** S–M. Slightly tedious migration of every hardcoded
`<option>` block.
**Payoff:** adding "Safety Bar Squat" or "Belt Squat" to the catalog is
a one-file edit; previously, you'd find inconsistent capitalization
across web + seed + future watch.

### 4. Error message vocabulary

**Today:** every `ApiError` carries a server-provided message string. UI
surfaces show it directly. Server messages are hand-written per route.

This is fine for a single-locale app. If we ever want to **i18n** —
or if we want a stable "error code → user message" mapping that doesn't
break when a route's wording changes — extract error codes:

```jsonc
// packages/api-contract/src/errors.json
{
  "AUTH_REQUIRED":          "Please sign in to continue.",
  "FORBIDDEN":              "You don't have access to that resource.",
  "WEIGHT_NOT_POSITIVE":    "Weight must be greater than zero.",
  "REPS_OUT_OF_RANGE":      "Reps must be between 1 and 50.",
  "DUPLICATE_CHECKIN_TODAY":"You already submitted a check-in today."
}
```

Server returns `{ code: "WEIGHT_NOT_POSITIVE", message: "..." }`. Clients
either display the message verbatim (current behavior) OR look up `code`
in a per-locale dictionary.

**Effort:** M. Touches every route handler.
**Payoff:** unlocks i18n later; gives QA a stable assertion target ("the
weight-validation error should always have code WEIGHT_NOT_POSITIVE").
**Verdict:** defer until i18n is on the roadmap.

---

## Build pipeline for cross-language sharing

If we extract constants and exercise catalogs to JSON, both TS and Swift
consume them at runtime — no codegen needed. But for **Zod schemas →
Swift Codable**, we have two options:

### Option A: Hand-mirror with code review (current)

What we do today. Cost: review discipline on every contract change.
Capacity: scales to ~30 schemas comfortably; beyond that, drift becomes
likely.

### Option B: Codegen Swift from JSON Schema

Use `zod-to-json-schema` to emit `openapi.json`, then `quicktype` to emit
`Models.swift`. Add as an npm script:

```json
{
  "scripts": {
    "contract:swift": "node scripts/zod-to-swift.js > apps/watch/IronProtocolWatch/Models/Generated.swift"
  }
}
```

Run on every `api-contract` change. Hand-written models become a
thin `Generated.swift` import.

**Effort:** S to set up, M to migrate the existing hand-mirrored Swift.
**Payoff:** kicks in when we cross ~20 schemas. Until then, code review is
cheaper.
**Verdict:** schedule it for when the contract grows past records,
dashboard, workout, log, session, checkin, athlete (currently 7 resources;
we have headroom).

---

## What we should NOT share

These are deliberate non-goals. Fighting them costs more than it saves.

### Date and number formatting

`Apr 23, 2026` on web (Intl.DateTimeFormat) is the same display as `Apr 23,
2026` on watch (DateFormatter), but the implementations are platform-idiomatic
and the cost of unifying them is real (locale handling, timezone
inheritance, ICU data) for nearly zero correctness benefit.

### UI components

Tailwind utility classes, React Native primitives, and SwiftUI views speak
mutually unintelligible languages. Cross-platform UI frameworks
(React Native, Flutter) buy uniformity at the cost of platform feel. Iron
Protocol is for elite athletes mid-session; platform feel matters more
than uniformity.

### Networking transport

`fetch` (web), `fetch` (RN), `URLSession` (Swift) are not interchangeable
abstractions. The shared API client wraps them at exactly the right level
of abstraction (per-endpoint methods); going lower (a "shared HTTP client")
is a leaky abstraction.

### Storage / persistence

Cookies (web), SecureStore (Expo), Keychain (Swift). Each is the right
tool for its platform; no shared abstraction would survive contact with
their security models.

---

## Roadmap order

If we land all of the above, do it in this order:

1. **Constants extraction (M)** — biggest payoff, smallest blast radius.
   New JSON file in `api-contract`, retro the readiness/MRV/phase code in
   `core-logic` to read from it.
2. **Exercise catalog JSON (S–M)** — depends on (1)'s conventions.
3. **Validation-from-schema helper (S)** — once `htmlConstraintsFor` is
   written, it gradually replaces every hand-typed `min/max` on a form.
4. **Codegen Swift from Zod (S setup, M migration)** — schedule when we
   cross ~20 schemas. Defer until then.
5. **Error code vocabulary (M)** — defer until i18n is real.

Anything else flagged in this doc is correctly platform-specific and
should stay that way.
