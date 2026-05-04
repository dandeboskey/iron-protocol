# Iron Protocol

A deterministic, data-driven powerlifting coaching engine. Iron Protocol bridges passive biometric data (HRV, sleep, subjective readiness) with a rigid block periodization state machine to auto-regulate daily training volume and intensity — no AI-generated workouts, no guesswork.

Built for elite-level athletes where CNS fatigue is exponential and Maximum Recoverable Volume (MRV) is highly sensitive.

![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Prisma](https://img.shields.io/badge/Prisma-Postgres-2D3748)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Documentation

- **[`docs/architecture.md`](docs/architecture.md)** — full system design (read first)
- **[`docs/qol-checklist.md`](docs/qol-checklist.md)** — UX-fix ledger (rounds 1–3)
- **[`docs/README.md`](docs/README.md)** — documentation index

Each package and app also has its own README with local conventions:
[`packages/api-contract`](packages/api-contract/README.md) ·
[`packages/api-client`](packages/api-client/README.md) ·
[`packages/core-logic`](packages/core-logic/README.md) ·
[`packages/db`](packages/db/README.md) ·
[`packages/integrations`](packages/integrations/README.md) ·
[`apps/web`](apps/web/README.md) ·
[`apps/web/src/app/api`](apps/web/src/app/api/README.md) ·
[`apps/watch`](apps/watch/README.md)

---

## Architecture

Iron Protocol is a strict monorepo with enforced domain boundaries:

```
iron-protocol/
├── apps/
│   ├── web/                    # Next.js 14 App Router — UI & API gateway
│   ├── mobile/                 # Expo React Native iOS app
│   └── watch/                  # Standalone watchOS 10+ SwiftUI app
├── packages/
│   ├── api-contract/           # Zod schemas — single source of API truth
│   ├── api-client/             # Typed TS client driven by api-contract
│   ├── core-logic/             # Pure math engine — zero side effects
│   ├── db/                     # Prisma schema, client, data-access queries
│   └── integrations/           # Biometric API adapters (Oura, WHOOP stubs)
```

### Domain Boundaries

| Package | Responsibility | Imports From | Never Imports |
|---------|---------------|-------------|---------------|
| `apps/web` | UI, routing, thin API routes | `core-logic`, `db` | `integrations` directly |
| `packages/core-logic` | e1RM math, readiness calc, periodization state machine, auto-regulation | Nothing | `db`, `web`, `integrations` |
| `packages/db` | Schema, Prisma client, reusable queries | `@prisma/client` | `core-logic`, `web` |
| `packages/integrations` | Normalize vendor biometric APIs | Nothing | `core-logic`, `db` |

Each package has a `.cursorrules` file enforcing these boundaries for AI-assisted development.

---

## Core Engine

### Readiness Coefficient (Rc)

Composite score from three domains weighted by physiological impact:

- **HRV Component (30%)** — Deviation from 7-day rolling baseline
- **Sleep Component (30%)** — Hours + subjective quality
- **Subjective Component (40%)** — Mood, soreness, energy, stress

For athletes with strength-to-bodyweight ratios > 3.0x, negative readiness signals are amplified via a CNS sensitivity multiplier (up to 1.5x deficit amplification for 3.5x+ BW ratios).

**Output:** Score 0–100 mapped to coefficient 0.70–1.10.

### Auto-Regulation

The readiness coefficient directly modifies today's workout:

| Rc Range | Adjustment |
|----------|-----------|
| ≥ 1.05 | +2.5% intensity on compounds |
| 0.95–1.05 | Plan as written |
| 0.85–0.95 | −1 set, −0.5 RPE cap |
| 0.75–0.85 | −2 sets, −5% intensity, −1.0 RPE |
| < 0.75 | Deload-level session (50% volume) |

### Block Periodization State Machine

```
HYPERTROPHY (4wk) → STRENGTH (4wk) → PEAKING (3wk) → DELOAD (1wk)
```

Each phase has distinct rep ranges, RPE targets, intensity bands, and volume progression rates. The state machine supports emergency deload transitions triggered by 3+ consecutive low-readiness days.

### e1RM Estimation

Composite of Epley (60%) and Brzycki (40%) formulas, capped at 12 reps for reliability. Every logged set automatically updates the athlete's estimated 1RM.

### MRV Scaling

Maximum Recoverable Volume scales non-linearly with strength-to-bodyweight ratio:

| BW Ratio | MRV Scale Factor |
|----------|-----------------|
| ≤ 1.5x | 100% (novice) |
| 2.5x | 88% |
| 3.0x | 80% |
| 3.5x+ | 65% (elite) |

A 195 lb athlete pulling 705 cannot recover from the same volume as a novice at the same bodyweight.

---

## Quick Start

```bash
# Clone and enter the project
git clone https://github.com/YOUR_USERNAME/iron-protocol.git
cd iron-protocol

# Install, create database, and seed sample data
npm run setup

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### What the seed creates

- **Athlete:** Daniel, 195 lbs, 5 years experience
- **e1RMs:** Squat 500, Bench 335, Deadlift 705
- **Training Block:** Hypertrophy Block A (4 weeks, week 1)
- **Sessions:** 4 training days with full exercise prescriptions
- **Biometrics:** 7 days of HRV, sleep, and subjective data

### Available Scripts

| Command | Description |
|---------|-----------|
| `npm run setup` | Full install + DB push + seed |
| `npm run dev` | Start Next.js dev server on :3000 |
| `npm run build` | Production build |
| `npm run db:push` | Push Prisma schema to Postgres |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio GUI |

---

## Pages

| Route | Description |
|-------|-----------|
| `/` | Dashboard — readiness gauge, current block, today's workout preview |
| `/checkin` | Daily biometric check-in (HRV, sleep, mood, soreness, energy, stress) |
| `/workout` | Today's auto-regulated workout with inline set logging |
| `/block` | Training block overview, phase timeline, session status |
| `/history` | Biometric entry history with trend cards |
| `/profile` | Athlete profile editor, current e1RMs with BW ratios |

The UI is optimized for gym use: dark theme, high contrast, large touch targets, mobile-first with bottom nav.

---

## Tech Stack

- **Runtime:** Node.js, TypeScript 5.4
- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS
- **Database:** Postgres via Prisma ORM
- **Charts:** Recharts (available, not yet wired)
- **Monorepo:** npm workspaces

---

## Roadmap

- [ ] OAuth 2.0 biometric ingestion (Oura Ring, WHOOP)
- [ ] Trailing 7/30-day HRV and sleep trend charts (Recharts)
- [ ] Session completion flow with block day advancement
- [ ] Fatigue accumulation dashboard (Banister model visualization)
- [ ] PWA offline support with service worker
- [ ] Multi-athlete support
- [ ] Export training history to CSV

---

## License

MIT
