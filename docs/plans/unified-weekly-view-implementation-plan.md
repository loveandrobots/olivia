# Unified Weekly View Implementation Plan

**Goal:** Implement the first Horizon 4 surface — a read-only, day-by-day weekly view of the household's current week, surfacing existing H3 entity state (reminders, recurring routines, meal plans, inbox items with due dates) in a single cross-workflow temporal screen. The weekly view replaces the MVP home screen content at route `/`. No new entity types, no new sync primitives, no write actions.

**Architecture:** This is a read-only aggregation layer over the existing H3 data model. The server exposes a single `/api/weekly-view` endpoint that filters and assembles data from the four existing sources, returning a structured day-by-day payload. The PWA replaces the home screen (`home-page.tsx`) with a weekly view component that consumes this endpoint, falls back to offline-assembled client-side state when disconnected. Routine occurrence projection is the only non-trivial domain logic introduced: routines must be projected across the week's days from a `currentDueDate` anchor.

**Tech Stack:** TypeScript, Zod, date-fns, Fastify, better-sqlite3, Drizzle (read-only queries), React, TanStack Router, TanStack Query, Dexie, Vitest.

---

## Summary

The weekly view builds directly on the four H3 workflows without adding new storage, sync, or concurrency concerns. The implementation sequence is:

1. Define the weekly view contract schemas (no implementation, just shared vocabulary)
2. Add domain helpers for week calculation and routine occurrence projection
3. Add the API endpoint and repository read method
4. Extend the PWA client/sync layer with weekly view fetch and offline assembly
5. Replace the MVP home screen with the weekly view component
6. Verify acceptance criteria end-to-end

There are no product decisions deferred to engineering in this plan — the feature spec and visual spec fully resolve navigation placement, day-section layout, workflow-type visual language, today treatment, completed-item treatment, and spouse banner placement.

## Architecture Decisions Resolved In This Plan

### Decision A: Client-side assembly vs. dedicated API endpoint

**Chosen approach:** A single `/api/weekly-view?weekStart=YYYY-MM-DD` endpoint on the server assembles data from all four sources and returns a structured `WeeklyViewResponse`. The PWA calls this endpoint via a single TanStack Query fetch.

**Rationale:** The server already has all four H3 data sources in one SQLite database. Assembling at the server is more efficient than four parallel client fetches and produces a single cacheable query response. The existing Dexie cache tables for routines, reminders, meals, and inbox items are used for the offline fallback — the offline assembly code stays in the sync layer alongside other offline patterns. This minimizes new code surface in the PWA.

### Decision B: Routine occurrence projection

**Chosen approach:** A new domain helper `getRoutineOccurrenceDatesForWeek(routine, weekStart, weekEnd)` computes all days within the Mon–Sun window that an active routine is due. Starting from `routine.currentDueDate`, it walks backward one recurrence interval at a time until before `weekStart`, then walks forward collecting all dates within the window. The occurrence status for each projected date is derived from the occurrence history (`routine_occurrences` rows): a date with a matching completed occurrence is `completed`; otherwise `computeRoutineDueState` logic applies.

**Rationale:** The routine model stores only `currentDueDate` (the next upcoming cycle anchor) — it does not pre-generate a schedule. Projecting from `currentDueDate` is the correct model, consistent with how the routines list derives due state. The backward walk is bounded: daily routines require at most 7 steps back; weekly routines 1 step; monthly routines 1 step; `every_n_days` at most `ceil(7 / intervalDays) + 1` steps. This is deterministic and inexpensive for any realistic household routine load.

### Decision C: Inbox item due date field

**Chosen approach:** Inbox items use `dueAt` (ISO datetime) as the due field. The weekly view filters items where `dueAt` falls within the current week's Mon 00:00:00 – Sun 23:59:59 local time boundaries.

**Rationale:** `dueAt` is the existing field name in the `inboxItemSchema` contract. No new field is introduced.

## Source Artifacts

- `docs/specs/unified-weekly-view.md`
- `docs/plans/unified-weekly-view-visual-implementation-spec.md`
- `docs/roadmap/milestones.md` (M9)
- `docs/learnings/decision-history.md` (D-022, D-024)
- `docs/plans/recurring-routines-implementation-plan.md` (H3 pattern reference)
- `docs/plans/meal-planning-implementation-plan.md` (H3 pattern reference)

Relevant durable guidance:

- `D-002`: advisory-only trust model — weekly view is read-only, consistent
- `D-004`: primary-operator model; spouse access is read-only
- `D-007`: installable mobile-first PWA
- `D-008`: local-first with SQLite canonical storage and Dexie client cache/outbox
- `D-010`: no write actions in Phase 1; all interactions are navigational

## Assumptions And Non-Goals

### Assumptions

- All four H3 workflows are fully implemented and their data is accessible via existing repository methods (`listItems`, `listReminders`, `listRoutines`, `getMealPlans`, `getMealEntries`).
- Routine occurrences for the current week can be projected from `currentDueDate` and the recurrence rule without querying historical occurrence rows for dates before `currentDueDate`, except to determine if a projected occurrence has been completed.
- The weekly view does not require a new Drizzle migration — it reads from existing tables.
- The offline fallback renders from Dexie-cached routines, reminders, meal entries, and inbox items without a new cache table.
- Week boundaries are computed in the server's local time, consistent with how reminders and routines compute due dates.

### Non-Goals

- Writing, completing, or editing any entity from the weekly view
- Navigation to prior or future weeks (current week only in Phase 1)
- AI-generated summaries or narrative digests
- Push notifications triggered from the weekly view
- Inline routine completion from the weekly view
- Overdue-from-prior-week roll-up section
- Shared lists in the weekly view (no temporal anchor — excluded)
- Any new entity type or Drizzle table migration

## Codebase Anchors

- `packages/contracts/src/index.ts` — shared schemas; extend with weekly view response shapes
- `packages/domain/src/index.ts` — domain helpers; add week calculation and routine projection
- `packages/domain/test/` — domain test home; add `weekly-view-domain.test.ts`
- `apps/api/src/app.ts` — Fastify routes; add `GET /api/weekly-view`
- `apps/api/src/repository.ts` — persistence methods; add `getWeeklyViewData(weekStart, weekEnd)`
- `apps/api/test/api.test.ts` — API integration tests; add weekly-view endpoint tests
- `apps/pwa/src/lib/api.ts` — typed client API functions; add `fetchWeeklyView(weekStart)`
- `apps/pwa/src/lib/sync.ts` — offline-aware wrapper; add `loadWeeklyView(weekStart)`
- `apps/pwa/src/lib/client-db.ts` — Dexie; no new table, add offline assembly helper
- `apps/pwa/src/routes/home-page.tsx` — replace MVP home content with weekly view

---

## Implementation Phases

### Phase 1: Expand shared contracts for the weekly view

**Outcome:** The PWA, API, and domain layer share a stable weekly view vocabulary before any implementation logic spreads across layers.

**Primary files**
- Modify: `packages/contracts/src/index.ts`

**Work items**

Add weekly view item schemas — thin projections of existing entity schemas suitable for the read-only view:

- `weeklyRoutineOccurrenceSchema`: `{ routineId, routineTitle, owner, recurrenceRule, intervalDays, dueDate (ISO date string — date only), dueState: RoutineDueState, completed: boolean }`
- `weeklyReminderSchema`: `{ reminderId, title, owner, scheduledAt (ISO datetime), dueState: 'upcoming' | 'due' | 'overdue' | 'snoozed' | 'completed' }`
- `weeklyMealEntrySchema`: `{ entryId, planId, planTitle, name, dayOfWeek (0–6, Mon=0), weekStartDate (ISO date) }`
- `weeklyInboxItemSchema`: `{ itemId, title, owner, dueAt (ISO datetime), status: ItemStatus }`

Add the per-day assembled type:
- `weeklyDaySchema`: `{ date (ISO date string — date only), dayOfWeek (0–6, Mon=0), routines: weeklyRoutineOccurrenceSchema[], reminders: weeklyReminderSchema[], meals: weeklyMealEntrySchema[], inboxItems: weeklyInboxItemSchema[] }`

Add the weekly view response schema:
- `weeklyViewResponseSchema`: `{ weekStart (ISO date string), weekEnd (ISO date string), days: weeklyDaySchema[] }` — always 7 entries, Mon–Sun

Export derived TypeScript types: `WeeklyViewResponse`, `WeeklyDayView`, `WeeklyRoutineOccurrence`, `WeeklyReminder`, `WeeklyMealEntry`, `WeeklyInboxItem`.

Keep existing inbox, reminder, routine, and meal contracts intact. Do not fold weekly view fields into existing entity schemas.

**Verification**

- `tsc --noEmit` across all packages passes.
- Schema parsing round-trip test: a hand-built `WeeklyViewResponse` JSON parses without error.

**Evidence required**
- Contract diff showing new weekly view schemas
- Passing typecheck output

---

### Phase 2: Add domain helpers for week calculation and routine occurrence projection

**Outcome:** The weekly view's core logic — week boundary calculation and routine occurrence projection — is deterministic and fully tested without API, UI, or database dependencies.

**Primary files**
- Modify: `packages/domain/src/index.ts`
- Create: `packages/domain/test/weekly-view-domain.test.ts`

**Work items**

Add week calculation helpers:
- `getWeekBounds(referenceDate: Date): { weekStart: Date; weekEnd: Date }` — returns Monday 00:00:00 and Sunday 23:59:59 (local time) of the calendar week containing `referenceDate`. Uses `date-fns` `startOfWeek` with `{ weekStartsOn: 1 }` and `endOfWeek` with the same option.
- `formatWeekLabel(weekStart: Date, weekEnd: Date): string` — returns a human-readable label like `"Mon 16 – Sun 22, March"` for display in the screen header.
- `formatDayLabel(date: Date): string` — returns a short day label like `"Mon 16"` or `"TODAY — Mon 16"` for day section headers.

Add routine occurrence projection helper:
- `getRoutineOccurrenceDatesForWeek(routine: Routine, weekStart: Date, weekEnd: Date): Date[]`
  - Returns an array of `Date` objects (one per day the routine is due within [weekStart, weekEnd]).
  - Only active routines are projected. Paused or archived routines return `[]`.
  - Algorithm:
    1. Start from `routine.currentDueDate` as the anchor.
    2. Walk backward by one recurrence interval per step until the date falls before `weekStart`. Track the last date that was still on or after `weekStart` — this is the earliest occurrence in (or just before) the window.
    3. Walk forward from that earliest candidate, collecting all dates that fall within [weekStart, weekEnd].
    4. Stop walking forward when the date exceeds `weekEnd`.
  - Backward step: use `subDays(date, 1)` for `daily`, `subWeeks(date, 1)` for `weekly`, `subMonths(date, 1)` for `monthly`, `subDays(date, intervalDays)` for `every_n_days`. Import `subDays`, `subWeeks`, `subMonths` from `date-fns`.
  - Maximum backward steps to guard against infinite loops: 7 for `daily`, 2 for `weekly`, 2 for `monthly`, `Math.ceil(7 / intervalDays) + 1` for `every_n_days`.
  - Return dates are normalized to midnight of their local calendar day (use `startOfDay(date)`).

Add weekly routine status helper:
- `getRoutineOccurrenceStatusForDate(routine: Routine, occurrences: RoutineOccurrence[], targetDate: Date, now: Date): RoutineDueState`
  - Finds the `RoutineOccurrence` row whose `dueDate` matches `targetDate` (date-only comparison).
  - If a matching occurrence with `completedAt !== null` exists → returns `'completed'`.
  - Otherwise → applies `computeRoutineDueState` semantics: `paused`, `completed` (no), `upcoming`, `due`, `overdue` based on `targetDate` vs `now`. Note: `paused` is checked first (routine.status).
  - This allows each day's occurrence to have its own status even for a daily routine spanning the whole week.

**Verification**

Tests in `packages/domain/test/weekly-view-domain.test.ts`:

- `getWeekBounds` returns correct Monday 00:00:00 and Sunday 23:59:59 for:
  - A Wednesday input (mid-week)
  - A Monday input (start of week)
  - A Sunday input (end of week)
  - A date-fns timezone edge case (verify week start is always Monday, not Sunday)
- `getRoutineOccurrenceDatesForWeek` returns:
  - 7 dates for a daily routine whose `currentDueDate` is Wednesday of the current week
  - 7 dates for a daily routine whose `currentDueDate` is the following Wednesday (future)
  - 7 dates for a daily routine whose `currentDueDate` is the prior Wednesday (past)
  - 1 date for a weekly routine due on Thursday of the current week
  - 0 dates for a weekly routine due on Thursday of the next week
  - 1 date for a monthly routine due on Wednesday of the current week
  - 0 dates for a monthly routine due on next month's date (not this week)
  - correct `every_n_days` projection for interval = 3 (expected 2–3 dates per week)
  - 0 dates for a paused routine
  - 0 dates for an archived routine
- `getRoutineOccurrenceStatusForDate`:
  - returns `'completed'` when a matching occurrence row with `completedAt` exists
  - returns `'due'` when targetDate is today and no completion
  - returns `'overdue'` when targetDate is yesterday and no completion
  - returns `'upcoming'` when targetDate is tomorrow and no completion
  - returns `'paused'` when routine.status is `'paused'`

**Evidence required**
- Passing `packages/domain/test/weekly-view-domain.test.ts` output
- Coverage of edge cases listed above

---

### Phase 3: Add the weekly view API endpoint and repository query

**Outcome:** The server exposes `GET /api/weekly-view` that returns a fully assembled `WeeklyViewResponse` for the current calendar week, accessible to both stakeholder and spouse roles.

**Primary files**
- Modify: `apps/api/src/repository.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/test/api.test.ts`

**Work items**

Add `repository.getWeeklyViewData(weekStart: Date, weekEnd: Date)` method:

This method reads all four sources within the given bounds and returns raw assembled data. It does NOT compute due states — that is done in the route handler using domain helpers.

- **Reminders**: query `SELECT * FROM reminders` and filter where `scheduled_at >= weekStart AND scheduled_at <= weekEnd`. Include all status values (upcoming, due, overdue, snoozed, completed). Use the existing `mapReminderRow` helper.
- **Routines**: query all active (non-archived) routines via `listRoutines()` (existing method). Occurrence projection is done in the route handler using `getRoutineOccurrenceDatesForWeek`. For each projected date, fetch the corresponding `routine_occurrences` row (if any) using `getRoutineOccurrenceForDate(routineId, dueDate)` — add this small helper that queries `SELECT * FROM routine_occurrences WHERE routine_id = ? AND due_date = ?` (uses the existing lookup pattern already in the repository).
- **Meal entries**: query the active (non-archived) meal plan whose `week_start_date` matches `weekStart` date string (date-only comparison). If found, fetch all entries for that plan. If not found, return `null` for the plan reference (the route handler will use this to show empty meal slots).
- **Inbox items**: query `SELECT * FROM inbox_items WHERE due_at >= weekStart AND due_at <= weekEnd AND status != 'done' OR (due_at >= weekStart AND due_at <= weekEnd AND status = 'done')` — include done items since they remain visible per spec. Simplify: `SELECT * FROM inbox_items WHERE due_at >= ? AND due_at <= ?` (both bounds as ISO datetime strings). Use the existing `mapItemRow` helper.

Return shape from `getWeeklyViewData`:
```typescript
{
  reminders: Reminder[];          // filtered to current week
  routines: Routine[];            // all active (projection done in route handler)
  activeMealPlan: MealPlan | null;
  mealEntries: MealEntry[];       // entries for activeMealPlan only
  inboxItems: InboxItem[];        // filtered to current week
}
```

Add `GET /api/weekly-view` route in `apps/api/src/app.ts`:

```
GET /api/weekly-view
Query: ?weekStart=YYYY-MM-DD (optional; defaults to current week Monday)
Response: WeeklyViewResponse
```

Route handler logic:
1. Parse `weekStart` query param; default to `getWeekBounds(new Date()).weekStart`.
2. Compute `weekEnd` from `weekStart`.
3. Call `repository.getWeeklyViewData(weekStart, weekEnd)`.
4. For each of the 7 days (Mon–Sun):
   - Filter reminders whose `scheduledAt` date matches this day (date-only comparison).
   - For each active routine, call `getRoutineOccurrenceDatesForWeek` and check if this day is in the result. If so, call `getRoutineOccurrenceStatusForDate` for this day's occurrence status. Append a `WeeklyRoutineOccurrence` entry.
   - Filter meal entries whose `dayOfWeek` matches this day's index (Mon=0). If `activeMealPlan` is null, include an empty meal slot sentinel (or return empty array and let the PWA handle empty state from the absence of entries).
   - Filter inbox items whose `dueAt` date matches this day.
5. Assemble `WeeklyDayView` for each day and return `WeeklyViewResponse`.

Role enforcement:
- Both stakeholder and spouse can call this endpoint (it is read-only).
- No `actorRole` validation is needed beyond ensuring the request is from a valid session (follow existing pattern for read routes).

**Verification**

API integration tests in `apps/api/test/api.test.ts`:

- Empty household: response contains 7 days, all with empty arrays.
- Reminder in current week: appears in the correct day section.
- Daily routine: projected occurrence appears in every day section of the week.
- Weekly routine due on Thursday: appears only in Thursday's section.
- Meal plan for this week with entries: entries appear in the correct day sections.
- No active meal plan: `activeMealPlan` is null; meal arrays are empty per day.
- Inbox item due on Tuesday of current week: appears in Tuesday's section.
- Inbox item due last week (before weekStart): does not appear.
- Shared list items: do not appear anywhere in the response.
- `weekStart` query param: passing a specific Monday returns that week's data correctly.
- Invalid `weekStart` (not a Monday, or invalid format): returns 400 with a clear error.
- Paused routine: does not appear in any day section.
- Archived routine: does not appear in any day section.

**Evidence required**
- Passing API test output
- Sample response JSON for a week with representative data from all four sources

---

### Phase 4: Extend PWA API client, sync, and offline assembly

**Outcome:** The weekly view participates in the same offline-tolerant client architecture as other H3 workflow screens. The PWA can fetch from the server or fall back to client-side assembly from Dexie caches.

**Primary files**
- Modify: `apps/pwa/src/lib/api.ts`
- Modify: `apps/pwa/src/lib/sync.ts`
- Modify: `apps/pwa/src/lib/client-db.ts`

**Work items**

Add typed API client in `apps/pwa/src/lib/api.ts`:
- `fetchWeeklyView(weekStart: string): Promise<WeeklyViewResponse>` — calls `GET /api/weekly-view?weekStart={weekStart}`, parses with `weeklyViewResponseSchema`.

Add offline-aware wrapper in `apps/pwa/src/lib/sync.ts`:
- `loadWeeklyView(weekStart: string): Promise<WeeklyViewResponse>` — attempts `fetchWeeklyView(weekStart)`; on network failure, falls back to `assembleWeeklyViewFromCache(weekStart)`.

Add offline assembly helper in `apps/pwa/src/lib/client-db.ts` (or a co-located helper module):
- `assembleWeeklyViewFromCache(weekStart: string): Promise<WeeklyViewResponse>` — queries all four Dexie cache tables (routines, reminders, meal plans + entries, inbox items) and applies the same domain logic used on the server to produce a `WeeklyViewResponse`. Uses `getRoutineOccurrenceDatesForWeek` (imported from `@olivia/domain`) for routine projection.
  - This is the read-only local assembly path — no outbox commands, no mutations.
  - Returns whatever is available in cache; stale data is acceptable per spec (offline-tolerant, not offline-perfect).

No new Dexie tables are introduced. The weekly view uses the existing `routines`, `routine_occurrences`, `reminders`, `mealPlans`, `mealEntries`, and `inboxItems` Dexie cache tables. Verify these all exist before implementation; add them if any are missing from the Dexie schema.

**Verification**

- Unit test: `assembleWeeklyViewFromCache` with seeded Dexie cache produces a structurally valid `WeeklyViewResponse`.
- Offline simulation test: mock network failure in `loadWeeklyView`, confirm fallback to cache-assembled response (no crash, no error thrown to caller).
- Verify existing outbox flush, inbox cache, reminder cache, and routine cache behavior is unaffected.

**Evidence required**
- Passing `apps/pwa/src/lib/api.test.ts` or equivalent output
- Evidence that the offline fallback path runs without errors with seeded cache data

---

### Phase 5: Build the weekly view PWA screen

**Outcome:** The Home tab (`/`) renders the unified weekly view as its primary content. The MVP greeting/summary layout is replaced. All visual spec requirements (WEEK-1 through WEEK-6) are met.

**Primary files**
- Modify: `apps/pwa/src/routes/home-page.tsx` — replace MVP content with weekly view
- No new routes or router changes are required (route `/` already maps to `HomePage`)

**Work items**

Refactor `home-page.tsx`:

**Header area** (replacing the MVP greeting):
- Remove time-aware greeting, `getGreeting()`, `getDateSubtitle()` helpers.
- Replace with "This week" header (Fraunces 700 28px) and date range subtitle (PJS 13px ink-2) computed from `getWeekBounds(new Date())` via `formatWeekLabel()`.
- Retain: Olivia wordmark, avatar stack (`[L] [A]` initials), `useRole()` hook for spouse banner.

**Data fetching**:
- Use TanStack Query: `useQuery({ queryKey: ['weekly-view', weekStartString], queryFn: () => loadWeeklyView(weekStartString) })`.
- `weekStartString` computed once from `getWeekBounds(new Date()).weekStart.toISOString().split('T')[0]`.
- Show a loading skeleton while data is fetching (reuse existing skeleton pattern from routines or tasks page).
- Show a graceful fallback if the query errors (e.g., "Unable to load weekly view" with a retry button).

**Spouse banner** (above scroll area, inherited pattern):
- Check `role === 'spouse'` via `useRole()`. Render the spouse banner component (or inline element consistent with L-009) between the header and scroll area when true.

**Olivia nudge card** (conditional, inherited):
- Retain the existing nudge card rendering logic from the MVP home screen. The nudge card renders below the header (and below spouse banner if present), above the day sections, when an active nudge exists. No changes to the nudge card component.

**Scroll anchoring**:
- After initial render (via `useEffect` with an empty deps array after the query resolves), call `document.getElementById('today-section')?.scrollIntoView({ behavior: 'instant', block: 'start' })` to anchor the scroll position to today's section.

**Day sections** (for each of 7 days, Mon–Sun):

Each day section renders:
1. **Day section header**: TODAY pill + violet day label for today; plain day label (PJS 13px 500, `--ink`) for other days. Add `id="today-section"` to today's container element.
2. **Today container styling**: `--lavender-soft` background, 16px border-radius, 3px `--violet` left border (full section height).
3. **Workflow-type sub-sections** — only render if the day has ≥1 item of that type:
   - **ROUTINES label** (PJS 10px 700 ALL CAPS, `--ink-3`, 1.2px letter-spacing)
   - Routine occurrence cards (mint `--mint` left border, `↻` icon)
   - **REMINDERS label**
   - Reminder cards (peach `--peach` left border, `🔔` icon)
   - **MEALS label**
   - Meal entry cards (rose `--rose` left border, `◆` icon), or empty meal slot row if no entries
   - **INBOX label**
   - Inbox item cards (sky `--sky` left border, `▷` icon)
4. **Empty day row**: when ALL four sources are empty for this day — dashed border, Fraunces italic "Nothing scheduled".

**Item card component** (`WeekItemCard`):
- Props: `icon`, `accentColor`, `title`, `completed: boolean`, `statusBadge?: { label, variant }`, `metadata: string`, `onClick: () => void`.
- CSS: `--surface` bg, 14px border-radius, 12px/16px padding, 3px solid left border in `accentColor`, `var(--shadow-sm)` shadow, `var(--ink-4)` outer border 1.5px.
- Title: PJS 14px 500 `--ink`; if `completed=true`: PJS 14px 500 `--ink-3` with `text-decoration: line-through`.
- Status badge: right-aligned pill, variants per §4.4 of visual spec (UPCOMING, DUE, DUE TODAY, OVERDUE, DONE, SNOOZED).
- Hover: `translateX(2px)`, `--shadow-md`, `--lavender-mid` border. Active: `scale(0.98)`. Transition: `all 0.2s ease`.
- Entire card is one tap target — no nested interactive elements.

**Deep-link navigation** (all read-only taps):
- Routine occurrence card → `navigate({ to: '/routines/$routineId', params: { routineId: item.routineId } })`
- Reminder card → `navigate({ to: '/reminders/$reminderId', params: { reminderId: item.reminderId } })`
- Meal entry card → `navigate({ to: '/meals/$planId', params: { planId: item.planId } })`
- Inbox item card → `navigate({ to: '/items/$itemId', params: { itemId: item.itemId } })`
- Empty meal slot row → `navigate({ to: '/meals' })` (Meals list)

**Empty week state (WEEK-2)**:
- When all 7 days have zero items: render centered empty state with calendar icon (48px `--ink-3`), Fraunces italic message ("Nothing on the books this week. Add a meal plan, set a reminder, or check the Household tab to get started."), and a secondary button "Go to Household →" navigating to `/lists` (Household tab entry point).

**No active meal plan (WEEK-3/WEEK-5 edge)**:
- When `weeklyViewData.activeMealPlan === null`: render the empty meal slot row in every day's MEALS sub-section. Text: "No meal planned yet — add in Meals →". Tap → `navigate({ to: '/meals' })`.
- Show MEALS label even when there is no plan, so the household sees the nudge each day.

**Spouse view (WEEK-6)**:
- All content renders identically to the stakeholder view.
- No write actions are present (no checkboxes, no swipe actions, no edit buttons anywhere on the screen).
- Spouse banner is the only structural difference.

**Animations**:
- Screen entry: apply `screenIn` animation (existing class if present, or add via CSS) to `.screen-home`.
- Day sections: apply staggered `taskIn` animation per visual spec §6.2 delays.
- Reduced motion: wrap animation declarations in `@media (prefers-reduced-motion: reduce)` to disable.

**Remove MVP home screen code**:
- Remove `getGreeting`, `getDateSubtitle`, `inboxItemToSummary`, and any helpers that were specific to the MVP home screen.
- Remove TanStack Query subscriptions to `loadInboxView`, `loadReminderView`, `loadActiveRoutineIndex` that were present only for the home screen (they remain in their respective workflow pages).
- Preserve: nudge card logic, `useRole()`, bottom nav, avatar stack, settings nav button.

**Verification**

- The home route `/` renders the weekly view, not the old greeting/task summary.
- Header shows "This week" and date range.
- Seven day sections render (none hidden).
- Today's section has `--lavender-soft` background, `--violet` left border, TODAY badge.
- All four workflow types appear in the correct day sections with correct accent colors and icons.
- Completed routine and done inbox items show strikethrough title.
- Overdue items show `--rose` left border and OVERDUE badge.
- Tapping each workflow type card navigates to the correct source screen.
- Empty day shows dashed-border "Nothing scheduled" row.
- Empty week shows full-screen empty state with CTA.
- No active meal plan shows empty meal slot row per day.
- Spouse view: banner appears, no write actions present.
- Scroll is anchored to today on open.
- Screen renders from cache when offline (no crash).
- Existing workflow screens (tasks, reminders, routines, meals, lists) are not regressed.

**Evidence required**
- Screenshots or recording: default state (WEEK-1), empty day, no meal plan, spouse view
- Confirmation that existing nav tabs and workflow screens are unaffected
- Manual QA note on mobile viewport

---

### Phase 6: Final verification, documentation sync, and milestone evidence

**Outcome:** The unified weekly view feature is verifiable end-to-end. All acceptance criteria from the feature spec are met. M9 milestone can advance.

**Primary files**
- Modify as needed: all test files touched in prior phases
- Modify: `docs/roadmap/milestones.md` (M9 progress notes)
- Modify: `docs/learnings/decision-history.md` if any new durable decisions were made during implementation

**Work items**

Run targeted automated suites:
- `packages/domain` — weekly view domain tests (`weekly-view-domain.test.ts`)
- `apps/api/test` — weekly view endpoint integration tests
- `apps/pwa/src/lib` — client sync and offline assembly tests
- Existing domain, API, and PWA tests — confirm no regressions

Execute manual acceptance criteria checklist against `docs/specs/unified-weekly-view.md`:

1. ✓ Weekly view screen exists and is reachable from primary navigation (Home tab)
2. ✓ Shows current Mon–Sun week
3. ✓ Today highlighted, default visible starting point on open
4. ✓ Reminders with scheduled time in current week — correct day, correct status
5. ✓ Routine occurrences due in current week — correct day, correct completion state
6. ✓ Meal entries from active plan — correct day
7. ✓ Inbox items with due date in current week — correct day, correct status
8. ✓ Shared lists do NOT appear
9. ✓ Items from prior weeks (due before this Monday) do NOT appear
10. ✓ Tap reminder → reminder detail screen
11. ✓ Tap routine occurrence → routine detail screen
12. ✓ Tap meal entry → meal plan day view
13. ✓ Tap inbox item → inbox item detail screen
14. ✓ Day with no items → clear empty-day state
15. ✓ No active meal plan → empty meal slot with create-plan prompt
16. ✓ Spouse: read-only view with per-screen banner
17. ✓ Offline: renders from cache, no crash
18. ✓ No write actions possible from weekly view

Review deferred boundaries — confirm not quietly implemented:
- No inline completion actions
- No prior/next week navigation
- No AI-generated summaries
- No write affordances of any kind

Update `docs/roadmap/milestones.md`:
- Mark implementation plan complete in M9 progress notes
- Note implementation completion (OLI-42 done)

If implementation surfaces any new durable decisions (e.g., nuance in routine occurrence projection, offline assembly gap), document in `docs/learnings/decision-history.md` or `docs/learnings/assumptions-log.md`.

**Evidence required**
- Passing targeted automated suite output
- Manual QA checklist confirming all 18 acceptance criteria
- Confirmation that shared lists are excluded and no write actions are exposed
- `docs/roadmap/milestones.md` M9 updated with implementation plan complete status

---

## Verification Matrix

### Contracts and domain
- Weekly view schemas parse representative response payloads without error.
- Domain tests prove week boundary calculation (Mon–Sun), routine occurrence projection for all four recurrence rules, daily routine spanning full week, occurrence status derivation per-day, and paused/archived routine exclusion.

### API and data assembly
- Server returns structurally valid `WeeklyViewResponse` for: household with all four workflow types active, empty household, no meal plan, paused routine, inbox items from prior week (excluded), inbox items from current week (included).
- Route accepts optional `weekStart` param; defaults to current week.

### PWA and offline behavior
- Weekly view renders from server response via TanStack Query.
- Offline fallback assembles from Dexie caches without crashing.
- Scroll is anchored to today on initial load.
- All four workflow-type deep-link navigations work correctly.
- Spouse banner appears for spouse role; is absent for stakeholder role.

### Scope control
- Review confirms: no inline completion, no write actions, no AI, no next/prior week navigation, no shared lists, no new entity types, no new Drizzle migrations.

---

## Risks / Open Questions

### 1. Daily routine density

A household with several daily routines (e.g., "Take medication", "Morning walk", "Evening tidy") will see each one repeated across all 7 days. Phase 1 renders all occurrences as distinct rows per the visual spec (§8.1). If actual household use reveals density problems, a Phase 2 "N of 7 completed" summary row design is the documented path. No engineering decision is needed now.

### 2. `getWeekBounds` timezone consistency

The week boundary calculation uses local device time (via `new Date()` on the client and the server process clock). If the client's timezone differs from the server's, week boundaries may be off by a few hours at the week edges. For a household operating in a single timezone (the primary use case), this is acceptable. Document as a known Phase 1 limitation if confirmed during testing; defer multi-timezone support.

### 3. Offline assembly gap for routine occurrence status

The offline fallback (`assembleWeeklyViewFromCache`) must query the Dexie `routine_occurrences` cache table to determine per-day completion status. Confirm this table is populated during normal sync. If occurrence rows are not cached, the offline path may show all routine occurrences as `upcoming` even if some are completed. This is acceptable per spec ("stale data is acceptable as a known limitation of the local-first model") but should be validated during Phase 4.

### 4. `activeMealPlan` lookup

The repository lookup for the active meal plan by `week_start_date` uses date string comparison. Ensure the comparison is date-only (not datetime) to avoid timezone edge cases where `week_start_date` stored as a date string ("2026-03-16") is compared correctly against the computed `weekStart` boundary.
