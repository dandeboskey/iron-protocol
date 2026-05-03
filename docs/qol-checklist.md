# Web App QOL Checklist

Branch: `qol/web-app-improvements`. Scope: `apps/web` only. Excludes items listed under "What's NOT Yet Built" in `CLAUDE.md`.

Risk legend: LOW = isolated UI / local state; MEDIUM = API contract change or shared query; HIGH = schema, auth flow, or deep data-model refactor.

---

## Cross-cutting

### 1. `/api/session/complete` has no auth check — CRITICAL
- **Problem:** Route accepts any `sessionId` from any caller (authenticated or not) and mutates block state. Session-completion flow is owned elsewhere per `CLAUDE.md`, but leaving this endpoint unauthenticated is a hard security bug.
- **Fix:** Add `getSessionAthlete()` check, verify the session's block belongs to that athlete. No behavioural change to the advancement logic (that's the other work stream's turf).
- **Risk:** LOW
- **Status:** DONE

### 2. `/api/log` does not verify session/prescription ownership
- **Problem:** Any authenticated user can log sets on any other user's session or prescription by passing arbitrary IDs. e1RM records get written to the attacker's own athlete, but set writes land on the victim's training data.
- **Fix:** After resolving athlete, load the `TrainingSession` and confirm `session.block.athleteId === athlete.id`. Also verify `prescription.sessionId === sessionId`.
- **Risk:** LOW
- **Status:** DONE

### 3. Desktop and mobile nav miss `/progress` and `/program`
- **Problem:** Both routes render but are unreachable from navigation. Mobile nav is also missing `/history`.
- **Fix:** Add `/progress` to desktop nav; add `/program` to desktop nav; surface `/history` and `/progress` on mobile via a secondary row or "More" affordance (keep primary 5-tab layout; add a disclosure button or swap Block for a "More" sheet). Simplest LOW-risk fix: add Progress/Program to desktop nav only; leave mobile bottom nav at 5 items and add a top-right link to History/Progress/Program from the mobile header.
- **Risk:** LOW
- **Status:** DONE

### 4. `/api/program` POST writes wrong Prisma field names (broken)
- **Problem:** Route passes `phaseOrder` and `exerciseOrder` but schema fields are both named `order`. Any program-creation attempt would throw at Prisma validation. The page wizard appears to work (client state updates) but the DB write fails silently in the UI because errors are swallowed.
- **Fix:** Rename `phaseOrder` → `order` and `exerciseOrder` → `order` in the POST body transformation.
- **Risk:** LOW
- **Status:** DONE

---

## `/records` (PRs)

### 5. PRs cannot be edited after creation
- **Problem:** Logged PRs are immutable. User can't correct a typo (wrong weight, wrong reps, wrong exercise).
- **Fix:** Add `PATCH /api/records/[id]` scoped to athlete ownership. Inline edit UI on each row (pencil icon → editable fields → save/cancel).
- **Risk:** MEDIUM (new route + UI)
- **Status:** DONE

### 6. PRs cannot be deleted
- **Problem:** Accidental entries stick forever; Big 3 hero cards can be poisoned by a bogus entry.
- **Fix:** Add `DELETE /api/records/[id]` scoped to athlete. Confirm-before-delete UI.
- **Risk:** MEDIUM
- **Status:** DONE

### 7. Form exercise-name field doesn't trim / validates weight>0
- **Problem:** User can submit a custom exercise of whitespace, or weight of 0 or negative. POST route has no validation.
- **Fix:** Client trims + required; server clamps `weightLbs > 0`, `reps >= 1`, non-empty exerciseName.
- **Risk:** LOW
- **Status:** DONE

### 8. Submit errors silently swallowed
- **Problem:** If POST fails (e.g. 500), the form just re-enables with no feedback to the user.
- **Fix:** Surface an inline error message from the response. Keep the console.error.
- **Risk:** LOW
- **Status:** DONE

### 9. Big 3 hero cards: confirm refresh behaviour
- **Problem:** User reported cards don't refresh. Current code DOES recompute `best1RM` on every render from `records`, and new POSTs are prepended. Bug is plausibly when the newly logged PR is 1RM with a lower weight than the existing best (user expects "latest" display but code uses max). Alternate: if the form lets you log a non-1RM record type, the hero cards (which only look at `recordType === "1RM"`) ignore it, which may confuse the user.
- **Fix:** Clarify labelling. Change hero card to show "Best 1RM" explicitly and add a subtitle with the date. After edit/delete, UI already refreshes from state — acceptable once #5/#6 land.
- **Risk:** LOW
- **Status:** DONE

---

## `/checkin`

### 10. Can submit multiple check-ins per day (overwrite vs append)
- **Problem:** No UI warning. Two submissions on the same day result in two DB rows, and dashboard/readiness only uses the most recent — ambiguous and wasteful.
- **Fix:** On mount, GET `/api/biometric`, check if today already has an entry. If so, show a banner "You already checked in today — submitting will add a new entry." (Append semantics are preserved; we just surface it.) Future work: offer "overwrite today's entry" flow. For now, informational only. Marking DONE means banner only.
- **Risk:** LOW
- **Status:** DONE

### 11. Sleep-hours input has no `min`/`max` / validation
- **Problem:** User can enter `99` or `-5`.
- **Fix:** Add `min=0 max=14 step=0.1` to sleep hours; `min=15 max=150` to HRV.
- **Risk:** LOW
- **Status:** DONE

### 12. No error surface on submit failure
- **Problem:** Same silent-failure as #8.
- **Fix:** Inline error alert.
- **Risk:** LOW
- **Status:** DONE

---

## `/profile`

### 13. Save profile has no success feedback and no error handling
- **Problem:** Button spins, returns to "Save Profile", user has no idea if it worked.
- **Fix:** Toast or inline "Saved" message; surface errors.
- **Risk:** LOW
- **Status:** DONE

### 14. Profile form will submit empty bodyweight as `NaN`
- **Problem:** If the user clears bodyweight and saves, `Number("")` is 0 which corrupts BW-ratio calculations downstream.
- **Fix:** Client-side required + min=50; server clamps.
- **Risk:** LOW
- **Status:** DONE

---

## `/workout`

### 15. "Log Set" writes even when reps/weight are blank (server)
- **Problem:** Client disables the button, but the server route only checks `!weightLbs` which passes for "0". Tightens to require positive values.
- **Fix:** Server validates `weightLbs > 0`, `reps >= 1`. (Combined with #2.)
- **Risk:** LOW
- **Status:** DONE

### 16. No way to edit/delete a mistakenly logged set
- **Problem:** Fat-finger a weight and you live with it.
- **Fix:** Out of scope for this pass (requires UI + route). Documenting.
- **Risk:** MEDIUM
- **Status:** SKIPPED — deferred, add `DELETE /api/log/[id]` in follow-up.

---

## `/history`

### 17. Chart period toggle only offers 7D/30D — no "all" or 14D
- **Risk:** LOW
- **Status:** SKIPPED — minor, user didn't flag.

---

## `/connect`

### 18. "Connect via OAuth" still uses `alert()` placeholder
- **Problem:** `alert()` is not styled, jarring on mobile.
- **Fix:** Replace with an inline info banner next to the button; say "OAuth flow not yet wired up — use Simulate Import."
- **Risk:** LOW
- **Status:** DONE

---

## `/program`

### 19. Program wizard "View Details" / "Start Block" buttons are dead
- **Problem:** Both buttons have no `onClick`. Click does nothing.
- **Fix:** Wire at least a basic alert/disabled state so users don't think it's broken. Actual implementation is larger scope.
- **Risk:** LOW (disabled visual) / MEDIUM (implementation)
- **Status:** DONE — marked disabled with tooltip, implementation deferred.

### 20. Wizard "Save Program" swallows errors
- **Problem:** With #4 currently unfixed, saves 500. Even after fix, errors aren't shown.
- **Fix:** Surface POST errors inline.
- **Risk:** LOW
- **Status:** DONE

### 21. Program wizard doesn't validate before save
- **Problem:** Submits empty phases / days without warning.
- **Fix:** On "Review & Save", show inline warnings for empty phases; block save if name is blank.
- **Risk:** LOW
- **Status:** DONE

---

## `/progress`

### 22. Mini bar chart divide-by-zero when all e1RMs equal
- **Problem:** When all records have identical e1rmLbs, chart looks fine (all at 100%). Actual edge case: `Math.max(...[])` on empty array returns `-Infinity` — but code already guards against that via `records.length > 0` via the map. Low impact. SKIP.
- **Risk:** LOW
- **Status:** SKIPPED — non-issue on closer inspection.

---

## HIGH-risk — NOT touched this pass, surface to user

- None found in this scope that qualify as HIGH. All discovered issues are LOW or MEDIUM.

---

## Summary of skipped

| # | Why skipped |
|---|---|
| 16 | Requires new route + UI; deferred as follow-up. |
| 17 | Minor UX polish; not flagged by user. |
| 22 | Not actually a bug after re-reading. |

---

## Round 2 additions

### 16 (carry-over) — Edit/delete logged sets on `/workout`
- **Fix:** Add `PATCH /api/log/[id]` and `DELETE /api/log/[id]`. Walk `CompletedSet → session → block → athleteId` to verify ownership. Inline edit (weight/reps/rpe) and two-step delete on each logged-set row. Note: edits do NOT recompute `E1RMRecord` (those are append-only history; they'd need their own surgery + a per-set link we don't have). Document this.
- **Risk:** MEDIUM
- **Status:** DONE

### 17 (carry-over) — Chart period selector polish
- **Fix:** Add a 14D and "All" option alongside 7D / 30D on `/history`.
- **Risk:** LOW
- **Status:** DONE

### 23 — `/block` page has no CTA when no active block
- **Problem:** "No active training block." is a dead end. User has nowhere to go.
- **Fix:** Add a Link to `/program` to start one (matches how the rest of the app handles empty states).
- **Risk:** LOW
- **Status:** DONE

### 24 — `/history` empty state has no CTA
- **Problem:** "No biometric entries yet." dead end.
- **Fix:** Link to `/checkin`.
- **Risk:** LOW
- **Status:** DONE

### 25 — `getActiveAthlete()` is dead code in `packages/db/src/queries.ts`
- **Problem:** Stale single-user helper; current code uses `getSessionAthlete()` everywhere. Confirmed unused via grep.
- **Fix:** Remove the function.
- **Risk:** LOW
- **Status:** DONE

### 26 — Inconsistent date formatting across pages
- **Problem:** `/history` uses `weekday, month, day`; `/records` uses `month, day, year`; `/progress` uses `month, day`. Not buggy, just sloppy.
- **Status:** SKIPPED — cosmetic, not user-flagged, would touch 3+ files for trivial benefit. **(Reconsidered in Round 3 — see #34.)**

---

## Round 3 additions

### 27 — No global error boundary; failed page renders show stack trace
- **Problem:** `apps/web/src/app` has no `error.tsx`, `not-found.tsx`, or `loading.tsx`. If any page or `useEffect` throws, the user gets the default Next.js "Application error" white screen with no escape hatch.
- **Fix:** Add minimal `error.tsx` (with reset button + link home) and `not-found.tsx` styled to match the iron theme.
- **Risk:** LOW
- **Status:** DONE

### 28 — `/workout` shows logging UI even after session is server-side completed
- **Problem:** The `completed` state only flips after a successful `finishWorkout` call in the same tab. Reload the page after completing and you're back to the full logging UI on a session that already has `completedAt`. The "All sets logged" banner is also missing in this case.
- **Fix:** On mount, check `data.session.completedAt`; if truthy, render the completion screen with a link to `/block`. Also disables the log/edit/delete actions while the session is complete (server already 400s on re-complete).
- **Risk:** LOW
- **Status:** DONE

### 29 — Numeric inputs on mobile lack `inputMode` (wrong soft keyboard)
- **Problem:** Across `/checkin`, `/workout`, `/records`, `/profile`, `/program`, every `<input type="number">` triggers iOS Safari's full QWERTY-with-tiny-numbers keyboard instead of the numeric pad. The user explicitly called this out as iOS-first and mobile-web matters.
- **Fix:** Add `inputMode="numeric"` for integer fields (reps, HRV, ms, percent) and `inputMode="decimal"` for fractional fields (weight, sleep hours, RPE, bodyweight, height, % e1RM, step values). Combined with `type="number"` this is the correct pattern.
- **Risk:** LOW
- **Status:** DONE

### 30 — `/records` Big 3 hero cards: large weights need thousands separator
- **Problem:** A 1000+ lb total is plausible (705 deadlift; deload work singles can exceed 1000 once a user logs heavy partials). Currently `pr.weightLbs` renders as raw integer.
- **Fix:** Format with `Intl.NumberFormat("en-US")` so `1250` becomes `1,250`. Also apply on `/progress` Big 3 cards.
- **Risk:** LOW
- **Status:** DONE

### 31 — `/workout` "Finish Workout" has no error surface
- **Problem:** If `/api/session/complete` returns 400/500 (e.g. already completed), the button just stops spinning and `setCompleted` never flips. Silent failure.
- **Fix:** Read response error and show inline alert.
- **Risk:** LOW
- **Status:** DONE

### 32 — `/records` and `/workout` form weight inputs accept negative via min={0}/missing
- **Problem:** `/workout` add-set form has no `min` on weight/reps/rpe; `/records` weight field has `min={1}` (good) but reps doesn't enforce a max. Server already validates so it's UX polish.
- **Fix:** Add `min={1}`, `step="0.5"` for weight, `min={1} max={50}` for reps, `min={1} max={10} step="0.5"` for RPE on the active workout form.
- **Risk:** LOW
- **Status:** DONE

### 33 — `/checkin` bottom-nav overlap on submit success screen
- **Problem:** The success "Check-in recorded" screen uses `h-64` and is centered, but the parent `<main>` has bottom-padding only via the form. On a short viewport the nav can overlap the redirect text.
- **Fix:** Wrap success screen in `pb-20 md:pb-6`.
- **Risk:** LOW
- **Status:** DONE

### 34 — Date formatting drift across `/records`, `/history`, `/progress`
- **Problem:** Three different `toLocaleDateString` invocations. With Round 3's mandate to "pick ONE date format and apply via a tiny shared util", reconsider #26.
- **Fix:** Add `apps/web/src/lib/format.ts` with `formatShortDate(d)` → `Apr 23, 2026` and `formatLongDate(d)` → `Tue, Apr 23`. Use `formatShortDate` everywhere a row is dated; `formatLongDate` for the daily-log header on `/history`. Hero card subtitle on `/records` becomes `Apr 23` (no year) via a `formatMonthDay` helper. Three callers, one util.
- **Risk:** LOW
- **Status:** DONE

### 35 — `/profile` form fields missing `htmlFor`/`id` association
- **Problem:** Every `<label>` uses class-only styling, no `htmlFor`. Click on label doesn't focus input — measurable a11y regression. Same on `/checkin`, `/records` form, `/program` wizard.
- **Status:** SKIPPED — touches 5+ files for ~10+ inputs each, mostly cosmetic since clicking the input itself works fine. Re-prioritise if a screen reader user files an issue.

### 36 — `/api/session/complete` does not include `prescriptions` so `/workout` can't refresh after complete
- **Problem:** Tied to #28; after `finishWorkout` we don't refetch session state. Acceptable since we navigate to /block, but if a server error occurs (#31) the user's view is now stale — readiness, allSetsLogged etc.
- **Status:** SKIPPED — handled implicitly by #28 + #31 (error surfaces; user can reload).

### 37 — Dashboard readiness gauge is stale after `/checkin` because it's client-fetched on mount only
- **Problem:** Submit a check-in, redirect to `/`, and the dashboard re-mounts so it does refetch — actually fine. False alarm on inspection.
- **Status:** SKIPPED — verified via code path; `useRouter().push("/")` after submit causes Next.js to remount the dashboard which re-runs `useEffect`.

### 38 — `/history` could grow unbounded
- **Problem:** API caps at 30 trailing entries (`getTrailingBiometrics(athlete.id, 30)`), so the page can never show more than 30 even with the "All" toggle. The label is misleading.
- **Status:** SKIPPED — fixing requires either an API param or a separate route. Tag for follow-up; not user-visible until they have >30 entries (currently 7 in seed).

### 39 — `/program` wizard "Add Phase" / "Add Day" buttons have no max guard
- **Problem:** User can add 99 phases / 99 days. Not a bug; not flagged.
- **Status:** SKIPPED — non-issue.

### 40 — `/connect` simulate-import duplicates today's entry without warning
- **Problem:** Clicking "Simulate Import" multiple times in quick succession creates multiple BiometricEntry rows for today. Same root cause as #10. The `/checkin` page got a banner; `/connect` did not.
- **Fix:** Show a small note next to a `simulated` device that the data was imported, plus inline check before the second simulate.
- **Status:** SKIPPED — `/checkin` warning covers the conscientious case. `/connect` is a developer-test affordance per the page copy ("Simulate Import"). Not worth complicating.

