# Activity History Implementation Plan

**Goal:** Implement the second Horizon 4 surface — a read-only, reverse-chronological activity log showing the last 30 days of completed and resolved H3 entity activity, grouped by day. This is a pure read-only aggregation layer over existing H3 completed state; no new entity types, no new sync primitives, no write actions.

**Architecture:** The server exposes a single `/api/activity-history` endpoint that queries completed/resolved state from five sources (routine occurrences, reminders, meal entries, inbox items, shared list items), returns a structured day-grouped payload for the rolling 30-day window. The PWA adds a new `/history` route that consumes this endpoint and falls back to offline-assembled client-side state when disconnected.

**Tech Stack:** TypeScript, Zod, date-fns, Fastify, better-sqlite3, Drizzle (read-only queries), React, TanStack Router, TanStack Query, Dexie, Vitest.

**Visual spec dependency:** Phase 6 (PWA screen rendering) depends on `docs/plans/activity-history-visual-implementation-spec.md` (OLI-48). All other phases are fully specifiable from the feature spec alone. Phase 6 describes structure and behavior from the feature spec; it must be reconciled against the visual spec before the screen is built.

---

## Summary

Activity history builds directly on the five H3 data sources without adding new storage, sync, or concurrency concerns. The implementation sequence is:

1. Define the activity history contract schemas (shared vocabulary across all layers)
2. Add domain helpers for the 30-day window calculation
3. Add the API endpoint and repository read method (five-source JOIN query)
4. Extend the PWA client/sync layer with activity history fetch and offline assembly
5. Add the PWA route entry point (router + nav wiring)
6. Build the PWA screen component (pending visual spec OLI-48)
7. Verify acceptance criteria end-to-end

## Architecture Decisions Resolved In This Plan

### Decision A: New endpoint vs. extension of weekly view

**Chosen approach:** A new `GET /api/activity-history` endpoint. The weekly view and activity history are structurally different: the weekly view covers the current 7-day calendar week and includes upcoming/open state; activity history covers a rolling 30-day window and shows only completed/resolved state. The data shapes, inclusion rules, and temporal logic are different enough that a separate endpoint is cleaner and avoids entangling the weekly view contract.

**Rationale:** Reusing the weekly view endpoint would require either a breaking contract change or an ambiguous query param branching path. The PWA needs to cache each view independently.

### Decision B: Inbox item completion timestamp

**Chosen approach:** Use `lastStatusChangedAt` as the completion timestamp proxy for inbox items with `status = 'done'`. The `inboxItemSchema` does not have a dedicated `completedAt` field — only `lastStatusChangedAt: datetime` and `updatedAt: datetime`. When `status = 'done'`, `lastStatusChangedAt` is when the status was last changed (which for done items is when they were marked done, unless they were subsequently re-opened and re-closed).

**Implementation note:** This is accurate for the common case. For items that were re-opened and re-closed, `lastStatusChangedAt` reflects the most recent `done` transition, which is the correct behavior — the history entry should reflect the last time the item was completed.

### Decision C: Meal entry date derivation

**Chosen approach:** A meal entry's effective date is derived by computing `weekStartDate + dayOfWeek` (0=Mon through 6=Sun). The repository queries past meal plans (those with `week_start_date < current_monday_date_string`) whose entries' computed dates fall within the 30-day window. This is a pure date arithmetic operation; no new fields are needed.

**Window query for meal plans:** Since the window is 30 days and plans are weekly, at most 5 plans can contribute entries. Query plans where `week_start_date >= (windowStart - 7 days)` to handle plans that started before the window but whose entries (later in the week) fall within it, and `week_start_date < currentMonday`.

### Decision D: Shared list item query (with list name)

**Chosen approach:** A JOIN query across `list_items` and `shared_lists` to include the list title without a separate lookup. The existing `mapListItemRow` function only maps item-level fields; the activity history query uses a new inline mapping that captures `list_title` from the join.

**SQL pattern:**
```sql
SELECT li.*, sl.title AS list_title
FROM list_items li
JOIN shared_lists sl ON li.list_id = sl.id
WHERE li.checked = 1
  AND li.checked_at IS NOT NULL
  AND date(li.checked_at) >= ?
  AND date(li.checked_at) <= ?
ORDER BY li.checked_at DESC
```

### Decision E: Per-item discriminated union vs. flat shape

**Chosen approach:** A discriminated union `ActivityHistoryItem` with a `type` field (`'routine' | 'reminder' | 'meal' | 'inbox' | 'listItem'`). Each variant carries only the fields needed for rendering and deep-link navigation. This gives the PWA clean TypeScript narrowing without a generic `any`-typed field bag.

### Decision F: Reminder resolution field mapping

**Chosen approach:** The feature spec refers to `resolved_at` and `dismissed` state, but the domain layer uses `completedAt` (for state `completed`) and `cancelledAt` (for state `cancelled`, which maps to dismissed). In the activity history response, the `resolvedAt` field is populated from `completedAt ?? cancelledAt` (whichever is non-null). The `resolution` field is `'completed'` or `'dismissed'`. Phase 1 includes both without visual distinction (per spec).

## Source Artifacts

- `docs/specs/activity-history.md` — feature spec (approved OLI-47)
- `docs/plans/activity-history-visual-implementation-spec.md` — visual spec (OLI-48, pending)
- `docs/roadmap/milestones.md` (M11)
- `docs/learnings/decision-history.md` (D-022)
- `docs/plans/unified-weekly-view-implementation-plan.md` — H4 first workflow (pattern reference)

Relevant durable guidance:

- `D-002`: advisory-only trust model — activity history is read-only, consistent
- `D-004`: primary-operator model; spouse access is read-only
- `D-007`: installable mobile-first PWA
- `D-008`: local-first with SQLite canonical storage and Dexie client cache/outbox
- `D-010`: no write actions in Phase 1; all interactions are navigational

## Assumptions And Non-Goals

### Assumptions

- All five H3 data sources store their completed state in the SQLite database with sufficient timestamp fields:
  - Routine occurrences: `completed_at` (datetime, nullable), `due_date` (datetime)
  - Reminders: `completed_at` (for completed state), `cancelled_at` (for dismissed state)
  - Meal entries: date derived from `meal_plans.week_start_date + day_of_week`
  - Inbox items: `last_status_changed_at` used as proxy for completion time
  - Shared list items: `checked_at` (datetime, nullable) — confirmed present in `listItemSchema`
- The activity history view does not require a new Drizzle migration — it reads from existing tables.
- The offline fallback renders from Dexie-cached H3 state without a new Dexie cache table (existing tables: `routineOccurrences`, `reminders`, `mealPlans`, `mealEntries`, `inboxItems`, `lists`, `listItems`).
- The 30-day window anchor is computed in local device time on the server (consistent with all other temporal calculations in Olivia).

### Non-Goals

- Writing, re-opening, or editing any entity from the activity history screen
- Pagination or load-more for history older than 30 days
- Filtering by workflow type
- AI-generated period summaries
- Grouping of shared list items by list (deferred per spec)
- Prior week activity in the unified weekly view
- Any new entity type or Drizzle table migration

## Codebase Anchors

- `packages/contracts/src/index.ts` — shared schemas; extend with activity history schemas
- `packages/domain/src/index.ts` — domain helpers; add `getActivityHistoryWindow`
- `packages/domain/test/` — domain test home; add `activity-history-domain.test.ts`
- `apps/api/src/app.ts` — Fastify routes; add `GET /api/activity-history`
- `apps/api/src/repository.ts` — persistence methods; add `getActivityHistoryData(windowStart, windowEnd)`
- `apps/api/test/api.test.ts` — API integration tests; add activity-history endpoint tests
- `apps/pwa/src/lib/api.ts` — typed client API functions; add `fetchActivityHistory()`
- `apps/pwa/src/lib/sync.ts` — offline-aware wrapper; add `loadActivityHistory()`
- `apps/pwa/src/lib/client-db.ts` — Dexie; no new table, add offline assembly helper
- `apps/pwa/src/router.tsx` — add `/history` route
- `apps/pwa/src/routes/history-page.tsx` — new file; activity history screen

---

## Implementation Phases

### Phase 1: Expand shared contracts for activity history

**Outcome:** The PWA, API, and domain layer share a stable activity history vocabulary before any implementation logic spreads across layers.

**Primary files**
- Modify: `packages/contracts/src/index.ts`

**Work items**

Add per-workflow-type activity history item schemas (discriminated union by `type`):

```typescript
activityHistoryRoutineItemSchema = z.object({
  type: z.literal('routine'),
  routineId: z.string().uuid(),
  routineTitle: z.string(),
  owner: ownerSchema,
  dueDate: z.string(),         // ISO date, date-only YYYY-MM-DD
  completedAt: z.string().datetime()
})

activityHistoryReminderItemSchema = z.object({
  type: z.literal('reminder'),
  reminderId: z.string().uuid(),
  title: z.string(),
  owner: ownerSchema,
  resolvedAt: z.string().datetime(),   // completedAt ?? cancelledAt from domain
  resolution: z.enum(['completed', 'dismissed'])
})

activityHistoryMealItemSchema = z.object({
  type: z.literal('meal'),
  entryId: z.string().uuid(),
  planId: z.string().uuid(),
  planTitle: z.string(),
  name: z.string(),
  dayOfWeek: dayOfWeekSchema,   // 0=Mon, 6=Sun (reuse existing)
  date: z.string()              // ISO date, date-only YYYY-MM-DD (computed weekStartDate + dayOfWeek)
})

activityHistoryInboxItemSchema = z.object({
  type: z.literal('inbox'),
  itemId: z.string().uuid(),
  title: z.string(),
  owner: ownerSchema,
  completedAt: z.string().datetime()   // from lastStatusChangedAt when status=done
})

activityHistoryListItemSchema = z.object({
  type: z.literal('listItem'),
  itemId: z.string().uuid(),
  body: z.string(),
  listId: z.string().uuid(),
  listName: z.string(),
  checkedAt: z.string().datetime()
})

activityHistoryItemSchema = z.discriminatedUnion('type', [
  activityHistoryRoutineItemSchema,
  activityHistoryReminderItemSchema,
  activityHistoryMealItemSchema,
  activityHistoryInboxItemSchema,
  activityHistoryListItemSchema
])
```

Add the per-day assembled type:
```typescript
activityHistoryDaySchema = z.object({
  date: z.string(),            // ISO date YYYY-MM-DD (most recent first in response)
  items: z.array(activityHistoryItemSchema)  // reverse-chronological by resolution time
})
```

Add the activity history response schema:
```typescript
activityHistoryResponseSchema = z.object({
  windowStart: z.string(),     // ISO date YYYY-MM-DD
  windowEnd: z.string(),       // ISO date YYYY-MM-DD
  days: z.array(activityHistoryDaySchema)  // only days with activity; most recent first
})
```

Export derived TypeScript types: `ActivityHistoryItem`, `ActivityHistoryRoutineItem`, `ActivityHistoryReminderItem`, `ActivityHistoryMealItem`, `ActivityHistoryInboxItem`, `ActivityHistoryListItem`, `ActivityHistoryDay`, `ActivityHistoryResponse`.

Keep all existing schemas intact. Do not modify weekly view schemas.

**Verification**

- `tsc --noEmit` across all packages passes.
- Schema parsing round-trip: a hand-built `ActivityHistoryResponse` JSON with one item of each type parses without error.

**Evidence required**
- Contract diff showing new activity history schemas
- Passing typecheck output

---

### Phase 2: Add domain helper for the 30-day window

**Outcome:** The activity history's core temporal logic — 30-day window calculation — is deterministic and tested without API, UI, or database dependencies.

**Primary files**
- Modify: `packages/domain/src/index.ts`
- Create: `packages/domain/test/activity-history-domain.test.ts`

**Work items**

Add window calculation helper:
- `getActivityHistoryWindow(today: Date): { windowStart: Date; windowEnd: Date }` — returns the rolling 30-day window anchored to `today`. `windowStart` = `startOfDay(subDays(today, 29))`, `windowEnd` = `endOfDay(today)`. Uses `date-fns` `startOfDay`, `endOfDay`, `subDays`.

  - The window is "today minus 29 days through today" (inclusive), giving exactly 30 calendar days.
  - `windowStart` is midnight local time on the 30th day before today.
  - `windowEnd` is 23:59:59.999 local time on today.
  - Import `subDays`, `startOfDay`, `endOfDay` from `date-fns`.

Add day grouping helper (pure function, used by both API and offline assembly):
- `groupActivityHistoryByDay(items: ActivityHistoryItem[], windowStart: Date, windowEnd: Date): ActivityHistoryDay[]`
  - Groups items by their resolution date (`completedAt`, `resolvedAt`, `checkedAt`, or `date` for meals).
  - Helper: `getItemDate(item: ActivityHistoryItem): string` — returns the ISO date string (YYYY-MM-DD) of the item's completion/resolution date:
    - `routine`: `item.completedAt.split('T')[0]`
    - `reminder`: `item.resolvedAt.split('T')[0]`
    - `meal`: `item.date` (already date-only)
    - `inbox`: `item.completedAt.split('T')[0]`
    - `listItem`: `item.checkedAt.split('T')[0]`
  - Helper: `getItemTimestamp(item: ActivityHistoryItem): number` — returns Unix ms for sort ordering:
    - Use the same field as above but as `new Date(field).getTime()`
    - For `meal` items (date-only): use `new Date(item.date + 'T23:59:59').getTime()` so meals sort to end of day (no time precision)
  - Steps:
    1. Group items by `getItemDate(item)`.
    2. Within each day, sort items by `getItemTimestamp(item)` descending (newest first).
    3. Collect day entries as `{ date, items }`.
    4. Sort days by `date` descending (most recent first).
    5. Return only days with `items.length > 0` (suppress empty days).

**Verification**

Tests in `packages/domain/test/activity-history-domain.test.ts`:

- `getActivityHistoryWindow`:
  - Given today = 2026-03-15: `windowStart` = 2026-02-14 00:00:00, `windowEnd` = 2026-03-15 23:59:59.999
  - Month boundary: given today = 2026-03-01: `windowStart` = 2026-01-31
  - Year boundary: given today = 2026-01-01: `windowStart` = 2025-12-03
  - `windowEnd` is always the same calendar day as `today`

- `groupActivityHistoryByDay`:
  - Two items on same day → appear in same day section, sorted reverse-chronological by time
  - Items on three different days → three day sections, sorted most-recent-day-first
  - A day with zero items → not included in result (suppressed)
  - Meal item (date-only) sorts correctly relative to timed items on the same day (to end of day)
  - Empty input → empty result

**Evidence required**
- Passing `packages/domain/test/activity-history-domain.test.ts` output
- Coverage of edge cases listed above

---

### Phase 3: Add the activity history API endpoint and repository query

**Outcome:** The server exposes `GET /api/activity-history` returning a fully assembled `ActivityHistoryResponse` for the rolling 30-day window, accessible to both stakeholder and spouse roles.

**Primary files**
- Modify: `apps/api/src/repository.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/test/api.test.ts`

**Work items**

Add `repository.getActivityHistoryData(windowStart: Date, windowEnd: Date)` method:

Returns raw records from all five sources within the given bounds. Date comparisons use `date()` SQLite function for date-only fields and ISO datetime string comparisons for datetime fields.

```typescript
return type: {
  completedRoutineOccurrences: Array<{
    routineOccurrence: RoutineOccurrence,
    routine: Routine
  }>;
  resolvedReminders: Reminder[];
  pastMealEntries: Array<{
    entry: MealEntry,
    plan: MealPlan
  }>;
  doneInboxItems: InboxItem[];
  checkedListItems: Array<{
    item: ListItem,
    listName: string
  }>;
}
```

**Routine occurrences query:**
```sql
SELECT ro.*, r.title AS routine_title, r.owner AS routine_owner,
       r.recurrence_rule, r.interval_days, r.status AS routine_status
FROM routine_occurrences ro
JOIN routines r ON ro.routine_id = r.id
WHERE ro.completed_at IS NOT NULL
  AND date(ro.due_date) >= ?
  AND date(ro.due_date) <= ?
ORDER BY ro.completed_at DESC
```
Parameters: `windowStartDate, windowEndDate` (date strings YYYY-MM-DD).
Map result using `this.mapRoutineOccurrenceRow(row)` for the occurrence and inline extract of routine fields. Filter out occurrences whose routine is archived (`r.status = 'archived'` excludes from results — the JOIN means only active/paused routines' occurrences appear).

**Reminder query:**
```sql
SELECT * FROM reminders
WHERE (
  (state = 'completed' AND completed_at IS NOT NULL
    AND date(completed_at) >= ? AND date(completed_at) <= ?)
  OR
  (state = 'cancelled' AND cancelled_at IS NOT NULL
    AND date(cancelled_at) >= ? AND date(cancelled_at) <= ?)
)
ORDER BY COALESCE(completed_at, cancelled_at) DESC
```
Parameters: `windowStartDate, windowEndDate, windowStartDate, windowEndDate`.
Map using existing `mapReminderRow(row, now)`.

**Meal entries query:**
Query plans whose entries may fall within the window. Since `week_start_date` is stored as a date string (YYYY-MM-DD), compute a safe lower bound: `windowStartDate - 7 days` (to capture plans that started before the window but whose later-in-week entries fall within it).

```sql
SELECT mp.id AS plan_id, mp.title AS plan_title, mp.week_start_date,
       me.id AS entry_id, me.day_of_week, me.name, me.shopping_items,
       me.position, me.created_at AS entry_created_at,
       me.updated_at AS entry_updated_at, me.version AS entry_version
FROM meal_plans mp
JOIN meal_entries me ON me.plan_id = mp.id
WHERE mp.status != 'archived'
  AND mp.week_start_date < ?           -- before current Monday
  AND mp.week_start_date >= ?          -- at most (windowStart - 7 days)
ORDER BY mp.week_start_date DESC, me.day_of_week ASC
```
Parameters: `currentMondayDate, windowStartMinus7Date`.

After fetching, compute each entry's effective date as `addDays(parseISO(plan.weekStartDate), entry.dayOfWeek)`. Filter entries whose effective date falls within `[windowStart, windowEnd]`. Map using existing `this.mapMealPlanRow` and `this.mapMealEntryRow` (or inline mapping).

**Inbox items query:**
```sql
SELECT * FROM inbox_items
WHERE status = 'done'
  AND date(last_status_changed_at) >= ?
  AND date(last_status_changed_at) <= ?
ORDER BY last_status_changed_at DESC
```
Parameters: `windowStartDate, windowEndDate`.
Map using existing `mapItemRow`.

**List items query (with list name JOIN):**
```sql
SELECT li.*, sl.title AS list_title
FROM list_items li
JOIN shared_lists sl ON li.list_id = sl.id
WHERE li.checked = 1
  AND li.checked_at IS NOT NULL
  AND date(li.checked_at) >= ?
  AND date(li.checked_at) <= ?
ORDER BY li.checked_at DESC
```
Parameters: `windowStartDate, windowEndDate`.
Map `li` fields using `mapListItemRow(row)`, extract `list_title` from `row.list_title as string`.

---

Add `GET /api/activity-history` route in `apps/api/src/app.ts`:

```
GET /api/activity-history
Query: none (window is always the rolling 30 days from server clock)
Response: ActivityHistoryResponse
Auth: same as weekly-view — both stakeholder and spouse can call (read-only)
```

Route handler logic:
1. Compute `getActivityHistoryWindow(new Date())` to get `windowStart` and `windowEnd`.
2. Call `repository.getActivityHistoryData(windowStart, windowEnd)`.
3. Map each raw result into `ActivityHistoryItem` union members:
   - Routine occurrences → `ActivityHistoryRoutineItem`
   - Resolved reminders → `ActivityHistoryReminderItem` (use `completedAt` for `resolvedAt` when `state = 'completed'`; `cancelledAt` for dismissed)
   - Meal entries → `ActivityHistoryMealItem` (compute `date` as `addDays(weekStartDate, entry.dayOfWeek)` formatted as YYYY-MM-DD)
   - Done inbox items → `ActivityHistoryInboxItem` (use `lastStatusChangedAt` as `completedAt`)
   - Checked list items → `ActivityHistoryListItem`
4. Collect all items into one flat array.
5. Call `groupActivityHistoryByDay(items, windowStart, windowEnd)` (imported from `@olivia/domain`) to produce sorted, day-grouped `ActivityHistoryDay[]`.
6. Return `activityHistoryResponseSchema.parse({ windowStart, windowEnd, days })`.

**Verification**

API integration tests in `apps/api/test/api.test.ts`:

- Empty household: response has `days: []` (no activity, no empty days shown).
- Completed routine occurrence in last 30 days: appears in correct day section as `type: 'routine'`.
- Routine occurrence older than 30 days: does NOT appear.
- Routine occurrence from archived routine: does NOT appear.
- Completed reminder (state=completed, completedAt set): appears as `type: 'reminder'` with `resolution: 'completed'`.
- Dismissed reminder (state=cancelled, cancelledAt set): appears as `type: 'reminder'` with `resolution: 'dismissed'`.
- Past meal plan with entries: entries appear in correct day sections as `type: 'meal'`.
- Meal plan entries whose computed date is before the 30-day window: do NOT appear.
- Done inbox item (status=done, lastStatusChangedAt in window): appears as `type: 'inbox'`.
- Done inbox item older than 30 days: does NOT appear.
- Open inbox item (status=open): does NOT appear.
- Checked list item with `checkedAt` in window: appears as `type: 'listItem'` with `listName` populated.
- Unchecked list item: does NOT appear.
- List item re-unchecked (checked=false): does NOT appear (even if `checkedAt` was set historically — `checked = 1` filter excludes it).
- Multiple items on same day: all appear in same day section, sorted reverse-chronologically.
- Days with no activity are suppressed (not in `days` array).
- Days are ordered most-recent-first.
- Spouse role can call the endpoint without error.

**Evidence required**
- Passing API test output
- Sample response JSON with at least one item of each type

---

### Phase 4: Extend PWA API client, sync, and offline assembly

**Outcome:** Activity history participates in the same offline-tolerant client architecture as other H3 and H4 workflow screens.

**Primary files**
- Modify: `apps/pwa/src/lib/api.ts`
- Modify: `apps/pwa/src/lib/sync.ts`
- Modify: `apps/pwa/src/lib/client-db.ts`

**Work items**

Add typed API client in `apps/pwa/src/lib/api.ts`:
- `fetchActivityHistory(): Promise<ActivityHistoryResponse>` — calls `GET /api/activity-history`, parses with `activityHistoryResponseSchema`.

Add offline-aware wrapper in `apps/pwa/src/lib/sync.ts`:
- `loadActivityHistory(): Promise<ActivityHistoryResponse>` — attempts `fetchActivityHistory()`; on network failure, falls back to `assembleActivityHistoryFromCache()`.

Add offline assembly helper in `apps/pwa/src/lib/client-db.ts` (or co-located helper module):
- `assembleActivityHistoryFromCache(): Promise<ActivityHistoryResponse>` — queries all relevant Dexie cache tables and applies the same domain logic used on the server to produce an `ActivityHistoryResponse`.

  Offline assembly sources:
  - `routineOccurrences` Dexie table: filter `completedAt != null AND date(dueDate) >= windowStart`. Join with `routines` Dexie table for routine title/owner/status; filter archived routines.
  - `reminders` Dexie table: filter `state == 'completed' || state == 'cancelled'` and `completedAt ?? cancelledAt` within window.
  - `mealPlans` + `mealEntries` Dexie tables: filter plans where `weekStartDate < currentMonday` and within window bounds. Compute entry dates and filter.
  - `inboxItems` Dexie table: filter `status == 'done'` and `lastStatusChangedAt` within window.
  - `listItems` Dexie table: filter `checked == true AND checkedAt != null` within window. Join with `lists` Dexie table for `listName`.

  Compute `getActivityHistoryWindow(new Date())` locally. Call `groupActivityHistoryByDay(items, windowStart, windowEnd)` (imported from `@olivia/domain`).

  Returns whatever is in cache; stale data is acceptable per spec (offline-tolerant, not offline-perfect).

No new Dexie tables are introduced. Verify that the following Dexie cache tables exist and are populated by normal sync: `routineOccurrences`, `reminders`, `mealPlans`, `mealEntries`, `inboxItems`, `lists` (or `sharedLists`), `listItems`. Add any that are missing from the Dexie schema.

**Verification**

- Unit test: `assembleActivityHistoryFromCache` with seeded Dexie data produces a structurally valid `ActivityHistoryResponse` with correct day grouping.
- Offline simulation test: mock network failure in `loadActivityHistory`, confirm fallback to cache-assembled response (no crash, no error thrown to caller).
- Verify existing outbox flush, inbox cache, reminder cache, routine cache, meal cache, and list cache behavior is unaffected.

**Evidence required**
- Passing test output for offline assembly
- Evidence that the offline fallback path runs without errors with seeded cache data

---

### Phase 5: Add PWA route and navigation entry point

**Outcome:** The `/history` route exists in the router, is accessible from primary navigation, and renders a placeholder or loading state. This is a prerequisite for Phase 6 and allows the route to be tested independently of the full screen.

**Primary files**
- Modify: `apps/pwa/src/router.tsx`
- Create: `apps/pwa/src/routes/history-page.tsx` (skeleton only in this phase)
- Modify: `apps/pwa/src/components/bottom-nav.tsx` (or equivalent navigation component)

**Work items**

Add route in `apps/pwa/src/router.tsx`:
```typescript
import { HistoryPage } from './routes/history-page';
const historyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/history', component: HistoryPage });
```
Include `historyRoute` in the `routeTree`.

Create skeleton `apps/pwa/src/routes/history-page.tsx`:
- Minimal component that renders the screen title and calls `loadActivityHistory()` via TanStack Query.
- `useQuery({ queryKey: ['activity-history'], queryFn: loadActivityHistory, staleTime: 60_000 })` — stale time of 60 seconds is appropriate for a recall surface that updates infrequently.
- Loading and error states: reuse the existing skeleton/error patterns from `home-page.tsx` or the routines page.

Navigation entry point (deferred-decision surface):
- The feature spec defers the navigation entry point choice (primary nav tab vs. secondary entry from weekly view) to the designer. Until OLI-48 resolves this, wire the route as a secondary entry point accessible from the Home screen footer or via a temporary direct URL.
- Add a "History →" link or button to `home-page.tsx` (below the weekly view content, above `BottomNav`) so the route is reachable for manual QA. This placeholder entry point will be replaced by the designer's decision from OLI-48.
- Do NOT add a new BottomNav tab without the visual spec confirming this is the intended navigation pattern.

**Verification**

- Navigating to `/history` in the browser does not 404 or throw a router error.
- The route renders a loading state while the query fetches.
- The route renders results (or an empty state) once the query resolves.
- The "History →" placeholder link from `home-page.tsx` navigates correctly.

**Evidence required**
- Confirmation that `/history` is accessible without error
- Passing `tsc --noEmit` with the new route added

---

### Phase 6: Build the activity history PWA screen

**⚠️ VISUAL SPEC DEPENDENCY:** This phase requires `docs/plans/activity-history-visual-implementation-spec.md` (OLI-48). The structure below is derived from the feature spec; it must be reconciled against the visual spec before final implementation. Do not build this phase until OLI-48 is published.

**Outcome:** The `/history` route renders the full activity history screen meeting all visual and behavioral acceptance criteria from the feature spec.

**Primary files**
- Modify: `apps/pwa/src/routes/history-page.tsx` — replace skeleton with full implementation

**Work items**

Screen structure (from feature spec; exact layout/CSS from OLI-48):

**Header area:**
- Screen title: "Activity" or "History" (exact label from visual spec).
- Sub-header: "Last 30 days" label indicating the window scope.
- Spouse banner (above scroll area): check `role === 'spouse'` via `useRole()`. Render spouse banner (L-009 pattern) when true.

**Data fetching:**
- TanStack Query: `useQuery({ queryKey: ['activity-history'], queryFn: loadActivityHistory, staleTime: 60_000 })`.
- Loading skeleton: reuse existing loading skeleton pattern.
- Error fallback: "Unable to load activity history" with retry button.

**Day sections (for each day in `days`, most recent first):**
1. **Day section header**: date label (e.g., "Mon, Mar 9" or "Today" for today's date if it appears).
2. **Items:** items within the day, rendered in order (reverse-chronological — already sorted by API/domain).
3. Each item uses a card component consistent with the weekly view `WeekItemCard` (accent color, icon, title, metadata).

**Per-type rendering (exact colors/icons from visual spec OLI-48; interim defaults from weekly view pattern):**
- `routine` items: routine name, completion time. Icon: `↻`. Accent: `--mint` (consistent with weekly view).
- `reminder` items: reminder title, resolution time, resolution type (completed/dismissed). Icon: `🔔`. Accent: `--peach`.
- `meal` items: meal name, plan name, day. Icon: `◆`. Accent: `--rose`.
- `inbox` items: item title, owner, completion time. Icon: `▷`. Accent: `--sky`.
- `listItem` items: item body, list name, check time. Icon: `☑` or `✓`. Accent: TBD from visual spec.

**Deep-link navigation (all read-only):**
- `routine` → `navigate({ to: '/routines/$routineId', params: { routineId: item.routineId } })`
- `reminder` → `navigate({ to: '/reminders/$reminderId', params: { reminderId: item.reminderId } })`
- `meal` → `navigate({ to: '/meals/$planId', params: { planId: item.planId } })`
- `inbox` → `navigate({ to: '/items/$itemId', params: { itemId: item.itemId } })`
- `listItem` → `navigate({ to: '/lists/$listId', params: { listId: item.listId } })`

**Empty state:**
- When `days.length === 0`: centered empty state with an informative message: "No activity in the last 30 days. Completed routines, reminders, meals, and tasks will appear here." (exact text from visual spec may differ).

**Spouse view:**
- All content identical to stakeholder view.
- Spouse banner is the only structural difference.
- No write actions (no checkboxes, no edit buttons, no swipe actions).

**No write actions:**
- History is read-only. No action sheets, no confirmation dialogs, no mutation calls.

**Reconciliation steps against OLI-48 (to be done after visual spec is published):**
1. Update screen/section header copy to match visual spec labels.
2. Apply exact CSS variables, border colors, icon choices, and typography from visual spec.
3. Update BottomNav or navigation entry point per designer's decision.
4. Update empty-state design (illustration, message, CTA if any).
5. Apply any animation specs from visual spec.

**Verification**

- Screen renders all 5 item types from a seeded test dataset in correct day sections.
- Items within each day are in reverse-chronological order.
- Days are in reverse-chronological order (most recent first).
- Empty days are not shown.
- Tapping each item type navigates to the correct source screen.
- Empty state renders when `days.length === 0`.
- Spouse banner appears for spouse role.
- No write actions are exposed.
- Screen renders from local cache when offline (no crash, no error thrown to screen).
- Visual reconciliation confirmed against OLI-48 (sign off with designer).

**Evidence required**
- Screenshots or recording showing all 5 workflow types, empty state, spouse view
- Confirmation of visual spec reconciliation (sign-off from designer/VP of Product)
- Manual QA note on mobile viewport

---

### Phase 7: Final verification, documentation sync, and milestone evidence

**Outcome:** Activity history feature is verifiable end-to-end. All acceptance criteria from the feature spec are met. M11 milestone can advance.

**Primary files**
- Modify as needed: all test files touched in prior phases
- Modify: `docs/roadmap/milestones.md` (M11 progress notes)
- Modify: `docs/learnings/decision-history.md` if any new durable decisions were made

**Work items**

Run targeted automated suites:
- `packages/domain` — activity history domain tests
- `apps/api/test` — activity history endpoint integration tests
- `apps/pwa/src/lib` — client sync and offline assembly tests
- Existing domain, API, and PWA tests — confirm no regressions

Execute manual acceptance criteria checklist against `docs/specs/activity-history.md`:

1. ✓ Activity history screen exists and is reachable from primary navigation (or history link)
2. ✓ Shows last 30 days (today minus 29 days through today), grouped by day, most recent day first
3. ✓ Completed routine occurrences from last 30 days appear with routine name and completion time
4. ✓ Resolved reminders (completed or dismissed) appear with title and resolution time
5. ✓ Past meal plan entries appear with meal name and plan name in correct day sections
6. ✓ Closed inbox items (status=done) appear with title, owner, and completion time
7. ✓ Checked-off list items appear with item body and list name
8. ✓ Items older than 30 days do not appear
9. ✓ Days with no activity are suppressed
10. ✓ Tapping a routine navigates to routine detail screen
11. ✓ Tapping a reminder navigates to reminder detail screen
12. ✓ Tapping a meal entry navigates to meal plan detail screen
13. ✓ Tapping an inbox item navigates to inbox item detail screen
14. ✓ Tapping a list item navigates to the list screen
15. ✓ Items within each day are reverse-chronological
16. ✓ Workflow types are visually differentiated by color/icon
17. ✓ Empty state renders with informative message when no activity in window
18. ✓ Spouse sees read-only view with spouse banner
19. ✓ Screen renders from local cache when offline (no crash)
20. ✓ No write actions are possible from the activity history screen

Review deferred boundaries — confirm not quietly implemented:
- No filtering or search
- No pagination or load-more for older history
- No AI-generated summaries
- No editing or re-opening resolved items
- No write affordances of any kind

Update `docs/roadmap/milestones.md`:
- Mark implementation plan complete in M11 progress notes
- Note implementation completion once OLI-49 is done

If implementation surfaces any new durable decisions, document in `docs/learnings/decision-history.md`.

**Evidence required**
- Passing targeted automated suite output
- Manual QA checklist confirming all 20 acceptance criteria
- `docs/roadmap/milestones.md` M11 updated

---

## Verification Matrix

### Contracts and domain
- Activity history schemas parse representative payloads for all 5 item types without error.
- Domain tests prove 30-day window calculation (correct start and end for any `today`, including month/year boundaries), day grouping (reverse-chronological order, empty-day suppression, within-day item ordering), and meal item date-only sort behavior.

### API and data assembly
- Server returns structurally valid `ActivityHistoryResponse` for: household with all five workflow types active, empty household, only routines completed, only list items checked.
- Items older than 30 days are excluded.
- Empty days are not in the `days` array.
- Archived routines' occurrences are excluded.
- Unchecked list items are excluded.
- Re-opened inbox items (status != done) are excluded.

### PWA and offline behavior
- Activity history renders from server response via TanStack Query.
- Offline fallback assembles from Dexie caches without crashing.
- All five item type deep-link navigations work correctly.
- Spouse banner appears for spouse role.

### Scope control
- Review confirms: no inline mutations, no write actions, no AI, no filtering, no pagination, no new entity types, no new Drizzle migrations.

---

## Risks / Open Questions

### 1. Inbox item timestamp accuracy

`lastStatusChangedAt` is the proxy for completion time. If an item was marked done, then re-opened, then marked done again, `lastStatusChangedAt` reflects the final `done` transition — which is the correct behavior. If an item was marked done and immediately had a note added (which may update `lastStatusChangedAt` or `updatedAt`), verify that only status changes update `lastStatusChangedAt` and note additions do not. Confirm by reading the inbox `confirmUpdate` command in `apps/api/src/app.ts`.

### 2. Shared list item volume

A household with frequent grocery shopping may generate 20–40 list item entries in a single day. Phase 1 renders them individually per spec. If manual QA reveals noise, evaluate grouping by list for Phase 2 (outside this implementation plan's scope).

### 3. Offline assembly gap for list items

The offline fallback needs `listItems` and `lists` (sharedLists) Dexie tables to be populated during normal sync. Verify that both tables are included in the Dexie schema and populated by the existing sync layer. If `lists` cache is missing, add it during Phase 4 and cross-reference with the shared lists implementation.

### 4. Meal entry date computation timezone edge

`weekStartDate` is stored as a date string ('YYYY-MM-DD'). When computing the entry's effective date as `addDays(parseISO(weekStartDate), entry.dayOfWeek)`, use date-fns' `parseISO` and `addDays` to avoid timezone pitfalls. Test with a `weekStartDate` near a DST transition if applicable.

### 5. Navigation entry point (deferred from feature spec)

The feature spec explicitly defers whether activity history is a primary nav tab or a secondary link from the weekly view. Phase 5 adds a placeholder entry point (link from home screen). This must be resolved in OLI-48 (visual spec). Implementation of the final nav entry point is gated on that decision.
