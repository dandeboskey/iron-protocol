# apps/web

Next.js 14 App Router. UI host AND API gateway — the entire backend lives
in `src/app/api/` next to the pages.

> See [`../../docs/architecture.md`](../../docs/architecture.md) §3.1 for
> the page inventory and §4 for the API surface.

## Layout

```
apps/web/src/
├── app/
│   ├── (auth)/login/        NextAuth login page
│   ├── api/                 13 route handlers — see api/README.md
│   ├── error.tsx            App-level error boundary (iron-themed)
│   ├── not-found.tsx        404 page
│   ├── layout.tsx           Root layout, fonts, nav, providers
│   └── <page>/page.tsx      Route components (one folder per page)
├── components/              Shared UI: Nav, Card, NumericInput, etc.
└── lib/
    ├── apiClient.ts         Pre-built `api` instance (cookie auth)
    ├── format.ts            formatShortDate / formatLongDate / formatWeight
    └── auth.ts              Session helpers (getServerAuthSession)
```

## Patterns to follow

### Fetching data

Always go through `lib/apiClient.ts`. Pages do not see `fetch`:

```tsx
import { api } from "@/lib/apiClient";
import { getApiErrorMessage } from "@iron-protocol/api-client";

const { records } = await api.records.list();
```

If the endpoint isn't in `api`, add it to
`packages/api-client/src/client.ts` first. See
[`../../packages/api-client/README.md`](../../packages/api-client/README.md).

### Server vs client components

- **Server component (default).** No `"use client"` directive. Fetch data
  inline with `await api.x.y()`. No `useState`, no `useEffect`. Most pages
  start here.
- **Client component.** Add `"use client"` when you need interactive state,
  effects, or browser-only APIs. Fetch via `useEffect` + `api.x.y()`.

### Forms

- Numeric inputs: `<input type="number" inputMode="numeric" />` for integers
  (reps, mood/soreness/energy/stress, percent), `inputMode="decimal"` for
  fractions (weight, sleep hours, RPE, bodyweight). `type="number"` alone
  shows the wrong soft keyboard on iOS Safari.
- Min/max: enforce on the client AND in the route handler's Zod schema.
  Client guards the UI; server guards the data.
- Error surface: use `getApiErrorMessage(error)` and render the message
  inline. Don't swallow errors in `console.error` only — round 1 caught
  half a dozen forms doing exactly that.
- Two-step destructive actions: any delete should require a confirmation
  click on the row before firing `api.x.delete()`.

### Date and number formatting

Use `lib/format.ts` instead of inline `toLocaleDateString`:

```tsx
import { formatShortDate, formatWeight } from "@/lib/format";

<td>{formatShortDate(record.achievedAt)}</td>
<td>{formatWeight(record.weightLbs)} lbs</td>
```

One source of truth keeps `Apr 23, 2026` and `1,250` consistent across
every page.

### Adding a new page

1. Create `src/app/<route>/page.tsx`. Default to a server component.
2. Fetch via `api.<namespace>.<method>()`.
3. Use shared components (`Card`, `Nav`, etc.) and shared formatters.
4. Add the route to nav: `src/components/Nav.tsx` (desktop top-nav) and the
   mobile bottom-nav variant. Both lists are explicit; if the page isn't
   in them, it's unreachable.
5. Mobile-first responsive: design for `<768px` first, layer in desktop
   above with Tailwind's `md:` and `lg:` breakpoints.

### Auth requirement

Every page that displays user data MUST go through a route handler that
calls `getSessionAthlete()`. Pages don't manually check sessions — the
route handler does, returns 401 if missing, and the client sees an
`ApiError` with status 401 to redirect to `/login`.

## Why API + UI in one app

Next.js Route Handlers give us a single deployable artifact, a single auth
session that works for both HTML pages and JSON APIs, and a single TS
config. A separate API server would buy us nothing today. If we ever need
to scale them independently (e.g. mobile-driven traffic dwarfing web
traffic), the API routes are already self-contained and can lift out into
their own service without rewriting handler code — only the deployment
topology changes.

## Build

```bash
npm run dev          # Next.js on :3000
npm run build        # Production build (run after every meaningful change)
```

The build emits two pre-existing dynamic-server warnings on `/api/workout`
and `/api/fatigue` because `headers()` is called transitively via auth —
not regressions. See architecture doc §8.8.
