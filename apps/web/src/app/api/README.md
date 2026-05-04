# API Route Handlers

The backend. 13 Next.js Route Handlers. Each one is the entire vertical
slice for its endpoint — no controller, no service layer. Prisma queries
live in the handler. Validation happens at the boundary via Zod.

> See [`../../../../../docs/architecture.md`](../../../../../docs/architecture.md)
> §4.1 for the full endpoint inventory and §4.2 for the auth model.

## The handler shape

Every handler follows the same pattern:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionAthlete } from "@/lib/auth";
import { prisma } from "@iron-protocol/db";
import { SomeRequestSchema } from "@iron-protocol/api-contract";

export async function POST(req: NextRequest) {
  // 1. Auth — every route, no exceptions.
  const athlete = await getSessionAthlete();
  if (!athlete) return new NextResponse(null, { status: 401 });

  // 2. Validate the request body via the contract.
  const parsed = SomeRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  // 3. For child resources, walk to athleteId and verify ownership.
  //    DO NOT trust IDs from the client.
  const session = await prisma.trainingSession.findUnique({
    where: { id: parsed.data.sessionId },
    include: { block: true },
  });
  if (!session || session.block.athleteId !== athlete.id) {
    return new NextResponse(null, { status: 404 });
  }

  // 4. Mutate.
  const result = await prisma.completedSet.create({
    data: { ...parsed.data, sessionId: session.id },
  });

  // 5. Return a shape that matches the contract response schema.
  return NextResponse.json({ set: result });
}
```

## Non-negotiables

### 1. Always call `getSessionAthlete()` first

It resolves either a NextAuth session cookie OR an `Authorization: Bearer`
token to a single `Athlete`. Never read `req.body` or open a DB connection
before this check passes — fail fast with 401 to keep the attack surface
minimal.

### 2. Always verify ownership of child resources

If the client passes an ID for any non-top-level resource (sessionId,
prescriptionId, recordId, blockId), load it and walk to its `athleteId`.
Reject with 404 (not 403 — don't disclose existence) if it doesn't match.

The chain walks vary by resource:

| Resource | Walk to athleteId via |
|----------|----------------------|
| `CompletedSet` | `set.session.block.athleteId` |
| `TrainingSession` | `session.block.athleteId` |
| `ExercisePrescription` | `prescription.session.block.athleteId` |
| `PersonalRecord` | `pr.athleteId` (direct) |
| `BiometricEntry` | `entry.athleteId` (direct) |
| `ProgramTemplate` | `template.athleteId` (direct) |

We do NOT denormalize `athleteId` onto `CompletedSet` etc. The graph is
small enough to walk; denormalization invites two-source-of-truth bugs
when sessions move blocks.

### 3. Use the contract for both request and response

Validate the request with the contract's request schema. Return a shape
that satisfies the response schema. If you find yourself fighting the
schema, the schema is probably right and your route is wrong — confirm by
reading [`../../../../../packages/api-contract/README.md`](../../../../../packages/api-contract/README.md).

### 4. No `console.log` in production paths

If you need to debug, use `console.error` for actual errors and remove
non-essential logs before commit. There is no structured logger today
(architecture doc §8.11) — when one exists, switch to it.

## Adding a new route

1. Add the schema + endpoint to `@iron-protocol/api-contract`.
2. Create `apps/web/src/app/api/<resource>/route.ts` (or
   `<resource>/[id]/route.ts` for path-param routes).
3. Export `GET` / `POST` / `PATCH` / `DELETE` named functions matching the
   methods in the contract registry.
4. Follow the handler shape above.
5. Add the client method in
   [`../../../../../packages/api-client/src/client.ts`](../../../../../packages/api-client/src/client.ts).
6. Run `npm run build` from repo root and confirm the route compiles
   without errors.

## Existing routes

| Method | Path | Notes |
|--------|------|-------|
| `GET/POST` | `/api/auth/[...nextauth]` | NextAuth — Google OAuth + session |
| `POST` | `/api/auth/mobile` | Exchange session for bearer token |
| `GET / PUT` | `/api/athlete` | NB: PUT, not PATCH (full replace) |
| `GET / POST` | `/api/biometric` | Trailing entries + Rc / submit check-in |
| `GET` | `/api/block` | Active block overview (not yet on contract) |
| `GET` | `/api/fatigue` | Banister series for charts (not yet on contract) |
| `GET` | `/api/workout` | Today's auto-regulated session |
| `POST / PATCH / DELETE` | `/api/log[/:id]` | CompletedSet CRUD; POST also writes E1RMRecord |
| `POST` | `/api/session/complete` | Block advancement (returns full block) |
| `GET / POST` | `/api/program` | Program templates |
| `GET / POST / PATCH / DELETE` | `/api/records[/:id]` | Personal records CRUD |

`/api/block`, `/api/fatigue`, and `/api/program` are not yet covered by
`@iron-protocol/api-contract`. Migrating them is on the roadmap
(architecture doc §8.1).

## Side effects to be aware of

- `POST /api/log` creates a `CompletedSet` AND writes an `E1RMRecord` row
  if the working set produces a new estimated 1RM. The e1RM trail is
  **append-only** — see [`../../../../../packages/db/README.md`](../../../../../packages/db/README.md).
- `POST /api/biometric` creates a `BiometricEntry` AND upserts the
  athlete's `DailyReadinessScore` for that date. The Rc computation is
  synchronous; if it ever becomes a hotspot, move to a queue (architecture
  doc §8.6).
- `POST /api/session/complete` mutates `TrainingBlock.currentDay` /
  `currentWeek` and may flip `status` to `COMPLETED`. Concurrent
  completions for the same block can race; not currently a problem in the
  single-user case.

## Auth funnel — `getSessionAthlete()`

This single helper is the entire auth model. It:

1. Reads the NextAuth session via `getServerSession()`.
2. If absent, falls back to `Authorization: Bearer` from the request
   header and verifies a short-lived JWT.
3. Looks up `Athlete` by `userId`. **Lazy-provisions** if missing — the
   first call after Google OAuth signup creates the athlete row so users
   never see an empty-onboarding state.
4. Returns the `Athlete` or `null`.

It lives in `apps/web/src/lib/auth.ts` (next to `authOptions`) and calls
the lookup primitive `getAthleteByUserId(userId)` exposed by
`@iron-protocol/db/queries`. The db package itself stays free of
NextAuth — this is the architecture-doc §8.7 layering fix.
