# Background Jobs — Tooling Research

The architecture doc flagged background jobs as the next infrastructure
decision. This document compares the options and gives a concrete
recommendation. Status: **research, no code yet**. Decision is yours.

## Why we'll need this

Iron Protocol does five kinds of work that *should* run async but currently
runs in the request path. None is broken today at single-user volume; all
become problematic the moment ingestion or multi-athlete usage scales up.

| Workload | Today | Problem at scale |
|----------|-------|------------------|
| Readiness recompute on `POST /api/biometric` | Synchronous: route writes the entry then computes `DailyReadinessScore` before returning | Oura/WHOOP backfills can dump 30 entries at once; user waits ~30× the per-entry compute on a single HTTP call |
| Block advancement on `POST /api/session/complete` | Synchronous: route updates `TrainingBlock.currentDay` and may flip status | Concurrent session completions for the same athlete race; no retry semantics |
| Oura / WHOOP OAuth ingestion (still stubs) | n/a | Periodic pull from external API, normalize, persist — exactly the workload queues are designed for |
| Weekly progress digest email | n/a | Cron-style "every Monday at 9am, email each athlete a recap" |
| Periodization rebalancing | n/a | Compute next week's training load from this week's actuals — heavy math, can run overnight |

## Decision factors

- **Solo dev for the foreseeable future.** Operational overhead matters more than absolute capability.
- **Deployed on Vercel** (per the new `vercel.json`). The job runtime needs to play with a serverless-leaning host.
- **Postgres already provisioned.** Adding another data store is a real cost.
- **Single-user today, multi-athlete later.** A coach managing 20 athletes ingesting Oura nightly = ~20 batch backfills × 30 days = 600 jobs in a 30-minute window once a day. Not "scale" by any sane measure but enough to break sync handlers.
- **Reliability over throughput.** Losing a single biometric ingestion costs an athlete a training-day's worth of data. Retry semantics and dead-letter visibility matter.
- **TypeScript-first, Next.js-first.** Whatever we pick should feel native to the existing stack.

## Options

### 1. **Inngest** — managed event-driven runtime

```ts
// app/api/inngest/route.ts
import { serve } from "inngest/next";
import { recomputeReadiness } from "@/jobs/readiness";
export const { GET, POST } = serve({ client: inngest, functions: [recomputeReadiness] });

// jobs/readiness.ts
export const recomputeReadiness = inngest.createFunction(
  { id: "recompute-readiness", retries: 3 },
  { event: "biometric.ingested" },
  async ({ event, step }) => {
    const score = await step.run("compute", () => computeReadiness(event.data.entryId));
    await step.run("upsert", () => prisma.dailyReadinessScore.upsert(...));
    return score;
  }
);

// In a route handler, just:
await inngest.send({ name: "biometric.ingested", data: { athleteId, entryId } });
```

**Pros:**
- Zero infra. No Redis to manage, no worker to deploy. Inngest hosts the runtime; we ship our handlers as Next.js API routes.
- Native Next.js + Vercel integration. The recipe is officially blessed.
- Free tier: 50k function runs/month, 3 concurrent functions. Iron Protocol at single-user scale uses < 100 runs/day.
- Built-in: retries with backoff, idempotency keys, step-level durability (long-running jobs can survive function timeouts), event deduplication, replay.
- Observability is solid out of the box — UI for runs, traces, payloads, retry attempts.

**Cons:**
- SaaS lock-in. The `inngest.createFunction` API is theirs. Migrating later means rewriting handlers.
- Cost can climb if we hit the paid tier — $20/mo for the team plan, then per-run pricing. At 600 jobs/day that's ~18k/month, well within team-plan limits, but the curve gets steep at thousands of athletes.
- Closed-source runtime. Their availability is now ours.

**Verdict:** **Recommended for the MVP.** The "free tier covers Iron Protocol's first 100 athletes, easily" property is the deciding factor for a solo project. Lock-in is real but manageable: the function bodies are plain TypeScript that calls into our `core-logic`/`db` packages — porting to BullMQ later is a few days, not a rewrite.

### 2. **BullMQ on Redis** — industry standard

```ts
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL!);
const readinessQueue = new Queue("readiness", { connection });

const worker = new Worker("readiness", async (job) => {
  const score = await computeReadiness(job.data.entryId);
  await prisma.dailyReadinessScore.upsert(...);
  return score;
}, { connection });

// In a route:
await readinessQueue.add("recompute", { athleteId, entryId });
```

**Pros:**
- Most mature option in the Node ecosystem. Used by Shopify, Github Actions, etc.
- We own the runtime. Nothing closes-source on us.
- Rich primitives: priorities, delayed jobs, recurring (cron), groups, rate limiting, sandboxed workers.
- Cheap if we already had Redis: Upstash free tier handles low traffic, Railway adds a Redis service for ~$5/mo.

**Cons:**
- **We need a worker process.** Vercel functions are serverless — they wake on a request and die. BullMQ's `Worker` needs a long-running Node process. That means either Railway/Render/Fly.io hosting a worker container, or buying into Vercel Cron to wake handlers (which throws away most of BullMQ's value).
- We add a Redis dependency. Another moving part to monitor, another bill, another point of failure.
- Observability is DIY (BullBoard is decent but you're hosting it).

**Verdict:** Right answer if we ever leave Vercel or hit Inngest's paid-tier ceiling. Wrong answer for the MVP — too much ops surface for a solo dev.

### 3. **pg-boss** — Postgres-backed queue

```ts
import PgBoss from "pg-boss";
const boss = new PgBoss({ connectionString: process.env.DATABASE_URL });
await boss.start();

await boss.work("recompute-readiness", async (job) => {
  await computeReadiness(job.data.entryId);
});

await boss.send("recompute-readiness", { athleteId, entryId });
```

**Pros:**
- **Zero new infra.** Postgres is already in the stack. pg-boss creates its own tables; nothing else to provision.
- Open source, MIT, mature (production use since 2016).
- Works on Vercel-style deployments because Postgres LISTEN/NOTIFY can wake handlers; or you run a worker on Railway/Render alongside your existing Postgres connection.
- Decent feature set: retries, scheduled jobs, batch send/receive, archival.

**Cons:**
- Polling-based by default (LISTEN/NOTIFY is opt-in and finicky). Latency is "seconds, not milliseconds." Fine for our workloads.
- Smaller ecosystem than BullMQ. Fewer plugins (no built-in dashboard you'd love).
- Same worker-process problem as BullMQ on Vercel: the workers need a long-running host.
- Observability is DIY. You query the `pgboss.job` table.

**Verdict:** Best fallback if you want to avoid SaaS entirely AND are willing to run a worker container alongside Postgres. Worth a second look if Inngest ever feels too vendor-y.

### 4. **Trigger.dev** — open-source Inngest competitor

Similar API ergonomics to Inngest. Self-hostable (v3 onwards) and offers a managed cloud. Younger ecosystem, smaller customer base.

**Pros:**
- Open source, can self-host
- Native TS, good DX

**Cons:**
- Less mature than Inngest
- Self-hosting still requires Postgres + Redis + a worker pool — basically as much infra as BullMQ
- Managed cloud has fewer free-tier resources than Inngest

**Verdict:** Skip unless you specifically need self-hosting AND the open-source license matters more than mature tooling.

### 5. **Vercel Cron + native Next.js Route Handlers** — minimum viable

```ts
// vercel.json
{ "crons": [{ "path": "/api/jobs/readiness-sweep", "schedule": "*/5 * * * *" }] }

// app/api/jobs/readiness-sweep/route.ts
export async function GET() {
  const pending = await prisma.biometricEntry.findMany({
    where: { /* needs readiness recompute */ }
  });
  for (const entry of pending) await recompute(entry);
  return new Response(null);
}
```

**Pros:**
- Trivially simple. No new dep, no new infra.
- Vercel cron has 1-minute granularity on Pro, 1-day on Hobby.
- For periodic, scheduled work this is genuinely the right answer.

**Cons:**
- Only handles cron, not event-driven jobs. A "this entry needs recompute" pattern degrades to "every 5 minutes scan the whole table for entries flagged needs-recompute."
- 10-second timeout on Hobby, 60s on Pro for cron handlers. Long ingestions truncate.
- No retries. If your handler crashes mid-loop, you lose the rest.
- No observability beyond stdout.

**Verdict:** Use it for the **cron-style** jobs (weekly digest email, daily readiness summary at midnight). Don't use it for event-driven work.

### 6. Honorable mentions

- **River** (new, Go-backed, has TS client) — too young, Go runtime is awkward for our stack.
- **Postgres LISTEN/NOTIFY directly** — bespoke. Reinvent the wheel.
- **In-process `setInterval`** — lost on cold start, no scale, don't.

## Recommendation

**Use Inngest for event-driven jobs. Use Vercel Cron for scheduled jobs. Skip everything else for now.**

This is a hybrid by design: each tool does what it's best at, neither pulls in infra we don't need.

### Concrete migration plan

**Phase 1 — Readiness recompute (highest ROI, lowest blast radius)**

1. Add `inngest` to `apps/web` (single dep).
2. Define event schema: `biometric.ingested = { athleteId: string; entryId: string }`. Add to `packages/api-contract/src/events.ts` for cross-platform discoverability.
3. Move the readiness computation out of `POST /api/biometric`'s handler into an Inngest function.
4. The route handler emits `inngest.send({ name: "biometric.ingested", data: ... })` after creating the entry, then returns `{ entry, status: "computing" }`.
5. Client code (web `/checkin`, mobile, watch) handles the new shape: optimistic UI shows "computing readiness…" and refreshes when it's done.
6. Inngest function: idempotent on `entryId` (use it as the dedupe key). Retries 3× with backoff. On final failure, write a row to a new `BiometricRecomputeFailure` table (or just log loud).

**Phase 2 — Block advancement**

Same pattern, event `session.completed`. The serialization-per-athlete property
is important here: use Inngest's `concurrency: { key: "athlete-{{ event.data.athleteId }}", limit: 1 }` to ensure two completions for the same athlete don't race.

**Phase 3 — Oura / WHOOP backfill**

When OAuth ingestion lands, the adapter emits one `biometric.ingested` event per day pulled. Inngest handles concurrency naturally (3 concurrent on free tier); each event runs the same Phase-1 function.

**Phase 4 — Weekly digest email**

Vercel Cron, `0 9 * * 1` (Monday 9am), `/api/jobs/weekly-digest`. Reads each athlete's WeeklySnapshot, formats, sends via Resend or whatever email transport we end up using. No queue needed.

### What we're explicitly NOT doing

- **Not adding Redis.** The next time we say "we need a queue," reach for Inngest first.
- **Not building a custom queue on Postgres.** pg-boss exists. If we ever want it, use the library.
- **Not running a long-lived worker process.** Vercel-native functions only. The first time someone proposes a Railway worker, we re-evaluate Inngest's pricing and decide if we've outgrown it.

## Open questions for you

1. **Are you okay with Inngest as a SaaS dependency?** If "no, must be self-hostable," the answer flips to BullMQ + a Railway worker (~$5/mo Redis + worker hosting) or pg-boss with a Railway worker pulling from your existing Postgres.
2. **Do you want event schemas in the api-contract?** I'd argue yes — same justification as the request/response schemas. Watch can emit events too (e.g. local HealthKit pull → `biometric.ingested`).
3. **Email transport choice:** Resend, Postmark, SES — orthogonal to the queue choice but needed for Phase 4.

## Cost projection (rough)

At 100 athletes ingesting Oura daily + completing one session every other day:
- Readiness: ~3,000 events/month
- Session-complete: ~1,500 events/month
- **Total ~4,500 function runs/month — well within Inngest free tier (50k).**

Free tier should hold us through the first 1,000 athletes. The team plan kicks in around 50k runs/month at $20/mo flat.

The day we cross 1,000 athletes is the day this research gets re-opened. Until then, Inngest is the answer.
