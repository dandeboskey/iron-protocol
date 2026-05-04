# @iron-protocol/db

Prisma schema, client singleton, and reusable query helpers. The only
package that talks to Postgres.

> See [`../../docs/architecture.md`](../../docs/architecture.md) §4.4 for
> model groupings and indexing patterns.

## Layout

```
packages/db/
├── prisma/
│   ├── schema.prisma     17 models — auth, athlete, training, biometric, ...
│   └── seed.ts           Daniel athlete + 1 block + 7 days of biometric data
└── src/
    ├── client.ts         Prisma client singleton (avoids hot-reload leaks)
    ├── queries.ts        Reusable query functions
    └── index.ts          Public exports
```

## Subpath exports

```ts
import { prisma } from "@iron-protocol/db";
import { getActiveBlock, getTrailingBiometrics } from "@iron-protocol/db/queries";
```

The `queries` subpath is preferred for any query that's used by more than
one route handler. Inline `prisma.x.findMany()` is acceptable for one-off
lookups but is a signal you should extract.

## Dependency rules

- Imports `@prisma/client` only. Nothing else from this monorepo.
- This package **does not call core-logic**. The route handlers that consume
  both call core-logic with data fetched through this package.
- This package **does not know about NextAuth**. The session-aware
  `getSessionAthlete` helper lives in `apps/web/src/lib/auth.ts`; this
  package only exposes the lookup primitive `getAthleteByUserId(userId)`.

## Schema groups

```
Auth                  User, Account, Session, VerificationToken
Athlete root          Athlete (1:1 with User after OAuth)
Training              TrainingBlock → TrainingSession → ExercisePrescription
                                                     → CompletedSet
Biometric             BiometricEntry, DailyReadinessScore
Strength              E1RMRecord, PersonalRecord
Programs              ProgramTemplate → ProgramPhase → ProgramDay
                                                    → ProgramExercise
Progression           ProgressionLog, WeeklySnapshot
Equipment             EquipmentProfile → Barbell, PlateInventory,
                                          Dumbbell, Machine
```

## Indexing patterns

- Every athlete-owned model has `@@index([athleteId])`.
- Time-series models have composite indices on `(athleteId, date)` or
  `(athleteId, exerciseName)` to support trailing-window queries.
- Unique constraints on natural compound keys: `(blockId, weekNumber)`,
  `(templateId, order)`, `(equipmentProfileId, weightLbs, type)`, etc.

## Adding a model

1. Edit `prisma/schema.prisma`. Use a `cuid()` id, `createdAt` /
   `updatedAt` timestamps where mutation is expected, and `@@index` on any
   foreign key you query by.
2. Run `npm run db:push` from repo root. (Migrations are not currently in
   use; the project pushes schema directly. Do NOT switch to migrations
   without a coordinated cutover.)
3. If the model is athlete-owned, add `athleteId String` + relation +
   `@@index([athleteId])`.
4. Add reusable queries to `src/queries.ts` if more than one route will use
   them.
5. Update the seed in `prisma/seed.ts` to populate at least one row of the
   new model so the dev environment is realistic.

## Postgres, not SQLite

The schema declares `provider = "postgresql"`. CLAUDE.md is stale on this
point. Local dev expects `DATABASE_URL` pointing at a Postgres instance.
There is no SQLite path today.

## Append-only conventions

- `E1RMRecord` is **append-only**. Edits/deletes to a `CompletedSet` do NOT
  rewrite e1RM history because there is no per-set FK. The e1RM curve is a
  faithful record of what the athlete believed at each point in time.
- `BiometricEntry` is conceptually append-only (one per day per source) but
  technically writable. The `/checkin` page warns on duplicate same-day
  submission.
