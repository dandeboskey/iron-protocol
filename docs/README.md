# Iron Protocol — Documentation Index

This directory holds the canonical, agent-facing documentation for the
codebase. Package-level READMEs (in `packages/*/README.md` and
`apps/*/README.md`) point back here for the system view; this index points
forward to the package READMEs for local detail.

## Read these first

| Doc | When to read |
|-----|--------------|
| [`architecture.md`](architecture.md) | Before touching anything. System-wide design, data flow, smart-decision log, improvement opportunities. |
| [`cross-platform-sharing.md`](cross-platform-sharing.md) | Before duplicating logic across web/mobile/watch. Inventories what's shared, what's correctly platform-specific, and the next sharing investments to make. |
| [`qol-checklist.md`](qol-checklist.md) | Before doing UX work. Round-by-round ledger of QOL fixes shipped (rounds 1–3) — covers risk tags, what was skipped, and why. |
| [`../CLAUDE.md`](../CLAUDE.md) | Project-level rules + persona. Note: it claims SQLite; the schema is actually Postgres. See `architecture.md` §4.4. |

## Package-local docs

These live next to the code they describe. Read whichever one matches the
directory you are about to edit.

| Path | Topic |
|------|-------|
| [`../packages/api-contract/README.md`](../packages/api-contract/README.md) | Zod schema conventions, endpoint registry, how to add a new endpoint |
| [`../packages/api-client/README.md`](../packages/api-client/README.md) | Pluggable transport, factory usage, error handling |
| [`../packages/core-logic/README.md`](../packages/core-logic/README.md) | Pure-math invariant, readiness/autoreg/MRV equations |
| [`../packages/db/README.md`](../packages/db/README.md) | Prisma schema groups, query helper conventions, indexing patterns |
| [`../packages/integrations/README.md`](../packages/integrations/README.md) | Adapter layer for Oura/WHOOP — currently stubs |
| [`../apps/web/README.md`](../apps/web/README.md) | Page inventory, fetching pattern, shared utilities |
| [`../apps/web/src/app/api/README.md`](../apps/web/src/app/api/README.md) | Route handler conventions, auth funnel, ownership-scoping rules |
| [`../apps/watch/README.md`](../apps/watch/README.md) | watchOS app structure, Xcode setup, Phase 1 scope |

## When to update this directory

- **`architecture.md`** — when a cross-cutting decision changes (new package,
  new transport, new auth path, new platform). Don't update for a single
  endpoint addition; that's a contract-level change.
- **`qol-checklist.md`** — every QOL pass should append a `## Round N additions`
  section with status tags. Don't rewrite history; append.
- **New doc** — only if it covers a topic that crosses package boundaries.
  Local conventions go in the relevant package README, not here.
