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
- **Status:** SKIPPED — cosmetic, not user-flagged, would touch 3+ files for trivial benefit.

