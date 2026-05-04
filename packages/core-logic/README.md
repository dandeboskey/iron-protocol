# @iron-protocol/core-logic

The pure-math heart of Iron Protocol. Readiness scoring, autoregulation,
e1RM estimation, MRV scaling, and the periodization state machine all live
here.

> See [`../../docs/architecture.md`](../../docs/architecture.md) §4.3 for
> the equations and §7.2 for why purity is non-negotiable.

## Layout

```
packages/core-logic/src/
├── math/         e1RM (Epley/Brzycki composite), MRV scaling, normalization
├── engine/       readiness scoring, autoreg coefficient, periodization state machine
├── types.ts      shared domain types (BiometricInput, ReadinessReport, ...)
└── index.ts      public exports
```

## The pure-function invariant

This package exists so the math is testable, portable, and obvious. It is
forbidden from importing:

- Any other monorepo package (`db`, `integrations`, `api-contract`, etc.)
- Any framework (Next.js, React, Expo)
- Any I/O API (`fetch`, `fs`, `Date.now()` without injection)

If you reach for any of those, the function does NOT belong here. Put it in
the route handler that consumes core-logic instead.

**Date handling:** functions that depend on "now" take a `now: Date` (or
clock function) as input. This makes them deterministic for tests and
re-runnable from snapshots.

## Public surface (selected)

| Function | Domain | Pure inputs |
|----------|--------|-------------|
| `computeReadiness(input)` | Engine | `BiometricInput, AthleteContext` |
| `applyAutoregulation(rc, plan)` | Engine | `number, SessionPlan` |
| `estimateE1RM(weight, reps)` | Math | `number, number` |
| `scaleMRV(bwRatio)` | Math | `number` |
| `nextBlockState(current, history)` | Engine | `BlockState, RecentReadiness[]` |

## Adding a new function

1. Decide whether it belongs in `math/` (stateless arithmetic) or `engine/`
   (composed logic that orchestrates math).
2. Write it as a pure function. Take all inputs as parameters; return the
   result. Do not mutate.
3. Export from `index.ts`.
4. Add a unit test (vitest). Pure functions are the highest-leverage thing
   to test in the codebase.

## Equations (quick reference)

**Readiness Coefficient (Rc):** weighted composite of HRV (30%), sleep (25%),
subjective (30%), RHR (15%). Each component maps to 0–100; the composite
maps to a coefficient `0.70–1.10`. Population-norm brackets, not per-athlete
Z-scores — see architecture doc §7.4 for why.

**CNS sensitivity multiplier:** at BW ratio > 3.0×, negative-readiness deficits
are amplified linearly to a maximum of 1.5× at 3.5×+. Positive signals are
NOT amplified (ceiling stays at 1.10).

**e1RM (composite):** `0.6 * epley(w, r) + 0.4 * brzycki(w, r)`, where
`epley = w * (1 + r/30)` and `brzycki = w * 36 / (37 - r)`. Capped at 12 reps
because formula reliability degrades fast above that.

**MRV scaling:** non-linear function of bodyweight ratio. ≤1.5× → 100%,
2.5× → 88%, 3.0× → 80%, 3.5×+ → 65%. The drop between 3.0 and 3.5 is the
steepest segment because elite intensity changes recovery dynamics
disproportionately.

**Periodization:** `HYPERTROPHY (4w) → STRENGTH (4w) → PEAKING (3w) →
DELOAD (1w)`. 3+ consecutive low-Rc days trigger an emergency deload,
overriding the scheduled phase.

## Testing

Test parity is the highest-leverage QA in the codebase because the math is
the product. When in doubt: write the test first, then the function.
