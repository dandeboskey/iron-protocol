# @iron-protocol/api-contract

The single source of truth for every API request and response shape. Zod
schemas live here and are consumed by `@iron-protocol/api-client` (TS) and
hand-mirrored as Swift `Codable` structs in `apps/watch/`.

> See [`../../docs/architecture.md`](../../docs/architecture.md) §5.1 for why
> Zod was chosen over OpenAPI/tRPC and how the watch app stays in sync.

## Layout

```
packages/api-contract/src/
├── schemas/
│   ├── records.ts       PRs (CRUD)
│   ├── dashboard.ts     /api/biometric GET (entries + computed Rc)
│   ├── workout.ts       /api/workout GET (today's auto-regulated session)
│   ├── log.ts           CompletedSet POST/PATCH/DELETE
│   ├── session.ts       Session completion + block advancement payload
│   ├── checkin.ts       /api/biometric POST (subjective + biometric submit)
│   ├── athlete.ts       /api/athlete GET/PUT
│   └── common.ts        Reusable building blocks (CUID, ISO date, etc.)
├── endpoints.ts         Logical endpoint registry (method/path/req/res)
└── index.ts             Public exports
```

## Dependency rules

- Imports `zod` only. **Nothing else.** Not Prisma. Not `core-logic`. Not
  Next.js types.
- Pure values + types. No runtime side effects, no fetch, no fs.
- Consumers may import schemas, types, the `endpoints` registry, and the path
  helpers (`buildPath`, `recordsListUrl`, `recordByIdUrl`, `logByIdUrl`).

## Adding a new endpoint

1. Create or extend a file in `src/schemas/`. Define a request schema
   (or `null` for GET/DELETE) and a response schema.
2. Register the endpoint in `endpoints.ts`:

   ```ts
   newThing: {
     method: "POST",
     path: "/api/new-thing",
     request: NewThingRequestSchema,
     response: NewThingResponseSchema,
   },
   ```

3. Implement the route handler in `apps/web/src/app/api/.../route.ts`.
   Validate the request body with `NewThingRequestSchema.parse(body)`. The
   response shape MUST satisfy `NewThingResponseSchema`.
4. Add a method to the relevant namespace in
   `packages/api-client/src/client.ts`. Inputs typed with
   `z.infer<typeof NewThingRequestSchema>`, returns the response inferred
   type.
5. (If watch needs it) add a Swift `Codable` mirror in
   `apps/watch/IronProtocolWatch/Models/`. Document field-by-field
   correspondence in a comment block.

## Naming conventions

- Schemas: `XxxRequestSchema`, `XxxResponseSchema`. Suffix `Schema`.
- Inferred types: `XxxRequest`, `XxxResponse` via `z.infer`.
- Response envelopes: prefer `{ entry }`, `{ record }`, `{ set }` over bare
  arrays — leaves room for adding metadata later without a breaking change.

## Source-of-truth rule

If the route handler returns `{ entry, readiness }` and the contract says
`{ entry }`, the **route is the source of truth** and the contract is wrong.
Read the route, fix the contract, ship in one PR. Do NOT change the route
to match the contract unless the route was actually returning the wrong
shape.
