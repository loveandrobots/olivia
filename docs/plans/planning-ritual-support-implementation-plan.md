# Planning Ritual Support Implementation Plan

**Goal:** Implement the third and final Horizon 4 workflow — a structured recurring review ritual that uses the existing recurring routines infrastructure for scheduling and draws from activity history and unified weekly view data sources to pre-assemble a household review. The review flow lets the household member complete a weekly household review in a few minutes and saves a lightweight review record.

**Architecture:** Planning ritual support is a recurring routine variant, not a new workflow primitive. The implementation extends the existing routines data model with a `ritual_type` field on the `routines` table, a `review_record_id` FK on `routine_occurrences`, and a new `review_records` table. Two new API endpoints are added: `POST /api/routines/:id/complete-ritual` (complete the ritual and save the review record) and `GET /api/review-records/:id` (retrieve a review record for the detail screen). The PWA adds a new multi-step review flow screen (`/household/routines/:routineId/review/:occurrenceId`), a review record detail screen, activity history ritual entry treatment, and routine index planning ritual card variant.

**Tech Stack:** TypeScript, Zod, date-fns, Fastify, better-sqlite3, Drizzle, React, TanStack Router, TanStack Query, Dexie, Vitest.

**Visual spec dependency:** Phase 6 (PWA screen components) depends on `docs/plans/planning-ritual-support-visual-implementation-spec.md`. The structure in Phase 6 is derived from both the feature spec and the visual spec. Reconcile against the visual spec before building the review flow and review record detail screens.

---

## Summary

Planning ritual support extends the existing recurring routines implementation in a layered sequence:

1. Extend shared contracts with ritual-type field, review record entity, and review flow schemas
2. Add domain helpers for review window calculations (prior-week anchor, current-week anchor)
3. Add persistence layer for review records and extend the routine/occurrence tables
4. Add API endpoints for ritual completion and review record retrieval
5. Extend PWA client/sync layer with ritual completion command and review record fetch
6. Build PWA surfaces (review flow, review record detail, activity history ritual entry, weekly view ritual card variant)
7. Verify acceptance criteria end-to-end

## Architecture Decisions Resolved In This Plan

### Decision A: Planning ritual as routine variant, not new entity

**Chosen approach:** A planning ritual is a recurring routine with `ritual_type = 'weekly_review'` (nullable field; null = standard routine). All existing routine lifecycle logic, recurrence rule handling, and occurrence generation applies without modification. The `ritual_type` field is the only schema addition to the `routines` table.

**Rationale:** The feature spec explicitly makes this decision: "A planning ritual is a recurring routine variant. All recurring routine lifecycle behaviors apply." Introducing a new entity type would require duplicating scheduling, recurrence, lifecycle, and occurrence infrastructure. The existing recurring routines implementation handles all of this.

### Decision B: Occurrence anchor for late completions

**Chosen approach:** When a planning ritual occurrence is completed late, the review flow windows are computed from the occurrence's `dueDate`, not the current date. A ritual due on Sunday March 8 that is completed on Saturday March 15 reviews the week of March 2–8 (last week relative to March 8) and March 9–15 (current week relative to March 8).

**Rationale:** This is the feature spec OQ-4 recommendation: "each occurrence anchors its review to the week it was scheduled for." Using the occurrence's due date anchoring ensures the review reflects the household state at the time the ritual was intended — not the current week, which may be entirely different.

**Implementation note:** The window calculation helper accepts an `anchorDate: Date` parameter (populated from `occurrence.dueDate` at runtime) rather than always using `new Date()`.

### Decision C: Review record data model — no H3 snapshot

**Chosen approach:** The review record stores only metadata: `ritual_occurrence_id`, `review_date`, `last_week_window_start`, `last_week_window_end`, `current_week_window_start`, `current_week_window_end`, `carry_forward_notes` (nullable text), `completed_at`, `completed_by`. It does not snapshot the assembled H3 data from the review sections.

**Rationale:** The feature spec decision: "The review record does not snapshot the full data from the recap and overview sections. It stores only the metadata and notes. The recap and overview sections are re-derived from current H3 state when the review record detail is viewed." This keeps the review record lightweight and avoids data redundancy.

**Implication for the review record detail screen:** The detail screen shows the window metadata and carry-forward notes only. It does not re-assemble the H3 recap/overview data for the past week — those sections are re-derivable from the activity history endpoint if needed in the future. In Phase 1, the detail screen is a notes-and-metadata view.

### Decision D: Ritual completion as a dedicated endpoint

**Chosen approach:** A new `POST /api/routines/:id/complete-ritual` endpoint handles ritual completion atomically: validate the occurrence is a ritual and in due/overdue state, create the review record, mark the occurrence complete, schedule the next occurrence, and return the new review record ID in the response. This is separate from the existing `POST /api/routines/:id/complete` endpoint used for standard routine completions.

**Rationale:** The ritual completion has meaningfully different semantics from standard completion: it saves a review record, requires the occurrence ID and carry-forward notes in the request body, and must not be callable on standard (non-ritual) routines. A dedicated endpoint makes the contract explicit and prevents misuse.

### Decision E: Review flow as a new PWA route

**Chosen approach:** The review flow is a new route: `/household/routines/:routineId/review/:occurrenceId`. It is not a modal sheet. This gives the review flow its own URL (useful for navigation stack management), makes it a first-class screen in the router, and allows back-button behavior to work naturally per step.

**Rationale:** The visual spec decision: a full-screen route with appropriate visual weight for a meaningful household moment. The multi-step flow with OS back gesture behavior per step is easier to implement as a route with internal step state than as a modal with a custom back handler.

---

## Source Artifacts

- `docs/specs/planning-ritual-support.md` — feature spec
- `docs/plans/planning-ritual-support-visual-implementation-spec.md` — visual spec (this document's visual counterpart)
- `docs/roadmap/milestones.md` (M12, M13)
- `docs/specs/recurring-routines.md` — recurring routines infrastructure (pattern reference)
- `docs/plans/activity-history-implementation-plan.md` — H4 second workflow (pattern reference)
- `docs/plans/unified-weekly-view-implementation-plan.md` — H4 first workflow (pattern reference)

Relevant durable guidance:
- `D-002`: advisory-only trust model — review flow is user-initiated and structured; no agentic actions
- `D-004`: primary-operator model; spouse access to review records is read-only
- `D-007`: installable mobile-first PWA
- `D-008`: local-first with SQLite canonical storage and Dexie client cache/outbox
- `D-010`: non-destructive user-initiated actions execute immediately — "Complete review" follows this rule

## Assumptions And Non-Goals

### Assumptions

- The recurring routines implementation is fully in place: `routines` table, `routine_occurrences` table, recurrence rule handling, occurrence generation, lifecycle actions (pause/archive/delete with confirmation), and the `POST /api/routines/:id/complete` endpoint.
- The activity history endpoint (`GET /api/activity-history`) is implemented (M12) and returns completed/resolved H3 state for the rolling 30-day window. Planning ritual support's review flow uses the same underlying data sources but with different window anchors.
- The unified weekly view endpoint (`GET /api/weekly-view`) is implemented (M10) and returns upcoming H3 state for the current calendar week.
- `date-fns` is available in the monorepo.
- SQLite migration tooling (Drizzle) is available and operational.
- The Dexie client cache includes tables for all five H3 data sources.

### Non-Goals

- AI-generated summaries of the review sections (Phase 2).
- Carry-forward note conversion to inbox items or routines (Phase 2).
- Spouse shared review participation (Phase 2).
- Monthly or quarterly ritual templates (Phase 2).
- Draft-save for in-progress reviews (Phase 2).
- Review history browser or trend visualization (Phase 2).
- Push notifications for planning ritual due state (deferred per spec).
- Multiple ritual types beyond `weekly_review` (Phase 2).
- Launching the review flow from the unified weekly view (spec explicitly excludes this).

## Codebase Anchors

- `packages/contracts/src/index.ts` — shared schemas; extend with ritual_type, review record entity, and ritual completion request schema
- `packages/domain/src/index.ts` — domain helpers; add `getReviewWindowsForOccurrence`, extend with ritual window calculation
- `packages/domain/test/` — domain test home; add `planning-ritual-domain.test.ts`
- `apps/api/src/app.ts` — Fastify routes; add `POST /api/routines/:id/complete-ritual` and `GET /api/review-records/:id`
- `apps/api/src/repository.ts` — persistence; add `createReviewRecord`, `getReviewRecordById`; extend routine/occurrence queries for ritual_type
- `apps/api/test/api.test.ts` — API integration tests; add ritual completion and review record retrieval tests
- `apps/pwa/src/lib/api.ts` — typed client API; add `completeRitual()`, `fetchReviewRecord()`
- `apps/pwa/src/lib/sync.ts` — offline-aware wrapper; add `submitRitualCompletion()`, `loadReviewRecord()`
- `apps/pwa/src/lib/client-db.ts` — Dexie; add `reviewRecords` table; add outbox support for ritual completion
- `apps/pwa/src/router.tsx` — add review flow route and review record detail route
- `apps/pwa/src/routes/review-flow-page.tsx` — new file; multi-step review flow screen
- `apps/pwa/src/routes/review-record-detail-page.tsx` — new file; review record detail screen

---

## Implementation Phases

### Phase 1: Expand shared contracts for planning ritual support

**Outcome:** All layers share a stable ritual and review record vocabulary before any implementation logic.

**Primary files**
- Modify: `packages/contracts/src/index.ts`

**Work items**

Extend the routine schema with `ritual_type`:
```typescript
// Add to routineSchema (or the routine entity schema)
ritualType: z.enum(['weekly_review']).nullable().optional()
```

Extend the routine occurrence schema with `review_record_id`:
```typescript
// Add to routineOccurrenceSchema (or the occurrence entity schema)
reviewRecordId: z.string().uuid().nullable().optional()
```

Add review record schema:
```typescript
reviewRecordSchema = z.object({
  id: z.string().uuid(),
  ritualOccurrenceId: z.string().uuid(),
  reviewDate: z.string(),                    // ISO date YYYY-MM-DD
  lastWeekWindowStart: z.string(),           // ISO date YYYY-MM-DD
  lastWeekWindowEnd: z.string(),             // ISO date YYYY-MM-DD
  currentWeekWindowStart: z.string(),        // ISO date YYYY-MM-DD
  currentWeekWindowEnd: z.string(),          // ISO date YYYY-MM-DD
  carryForwardNotes: z.string().nullable(),
  completedAt: z.string().datetime(),
  completedBy: ownerSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number()
})
```

Add ritual completion request schema:
```typescript
completeRitualRequestSchema = z.object({
  occurrenceId: z.string().uuid(),
  carryForwardNotes: z.string().max(2000).nullable()
})
```

Add ritual completion response schema:
```typescript
completeRitualResponseSchema = z.object({
  reviewRecordId: z.string().uuid(),
  reviewDate: z.string(),              // ISO date YYYY-MM-DD
  nextOccurrenceDueDate: z.string()    // ISO date YYYY-MM-DD
})
```

Export derived TypeScript types: `ReviewRecord`, `CompleteRitualRequest`, `CompleteRitualResponse`.

Keep all existing schemas intact. Do not modify recurring routine schemas beyond the two field additions above.

**Verification**
- `tsc --noEmit` across all packages passes.
- Schema parsing round-trip: a hand-built `ReviewRecord` JSON parses without error.
- The extended `routineSchema` with `ritualType: 'weekly_review'` parses without error.
- The extended `routineOccurrenceSchema` with `reviewRecordId` populated parses without error.

**Evidence required**
- Contract diff showing new schemas and field additions
- Passing typecheck output

---

### Phase 2: Add domain helpers for review window calculations

**Outcome:** The review flow's core temporal logic — determining the last-week and current-week windows from an occurrence's due date anchor — is deterministic and tested without API or UI dependencies.

**Primary files**
- Modify: `packages/domain/src/index.ts`
- Create: `packages/domain/test/planning-ritual-domain.test.ts`

**Work items**

Add review window calculation helper:
- `getReviewWindowsForOccurrence(anchorDate: Date): { lastWeekStart: Date; lastWeekEnd: Date; currentWeekStart: Date; currentWeekEnd: Date }`
  - Computes the prior calendar week (Monday–Sunday) relative to the week containing `anchorDate`.
  - `lastWeekStart` = `startOfDay(previousMonday(anchorDate))` where `previousMonday` finds the Monday of the week before the week containing `anchorDate`.
  - `lastWeekEnd` = `endOfDay(addDays(lastWeekStart, 6))` — the Sunday of the prior week.
  - `currentWeekStart` = `startOfDay(addDays(lastWeekStart, 7))` — the Monday of the week containing `anchorDate`.
  - `currentWeekEnd` = `endOfDay(addDays(currentWeekStart, 6))` — the Sunday of the week containing `anchorDate`.
  - Uses `date-fns`: `startOfWeek({ weekStartsOn: 1 })` to find the Monday of the current week, then `subWeeks(1)` for the prior Monday.
  - Calendar-week anchoring is the behavior for late completions: a ritual due March 8 (Sunday) anchors to the week of March 2–8, regardless of when it is actually completed.

Example window outputs:
- `anchorDate = 2026-03-08` (Sunday): lastWeek = Mar 2–Mar 8, currentWeek = Mar 9–Mar 15
- `anchorDate = 2026-03-15` (Sunday): lastWeek = Mar 9–Mar 15, currentWeek = Mar 16–Mar 22
- `anchorDate = 2026-03-11` (Wednesday): lastWeek = Mar 2–Mar 8, currentWeek = Mar 9–Mar 15

Add helper to format window as date strings (used by the API to populate the review record):
- `formatWindowAsDateStrings(window: { start: Date; end: Date }): { start: string; end: string }` — returns `{ start: format(window.start, 'yyyy-MM-dd'), end: format(window.end, 'yyyy-MM-dd') }`

**Verification**

Tests in `packages/domain/test/planning-ritual-domain.test.ts`:

- `getReviewWindowsForOccurrence`:
  - Sunday March 8: lastWeek = Mar 2–8, currentWeek = Mar 9–15 ✓
  - Sunday March 15: lastWeek = Mar 9–15, currentWeek = Mar 16–22 ✓
  - Wednesday March 11: lastWeek = Mar 2–8, currentWeek = Mar 9–15 (same week as Sunday March 8) ✓
  - Month boundary: Sunday March 1: lastWeek = Feb 23–Mar 1, currentWeek = Mar 2–Mar 8 ✓
  - Year boundary: Sunday January 4, 2026: lastWeek = Dec 29–Jan 4, currentWeek = Jan 5–Jan 11 ✓
  - Monday anchor: Monday March 9: lastWeek = Mar 2–8, currentWeek = Mar 9–15 ✓
  - `lastWeekEnd` is always Sunday at 23:59:59.999
  - `currentWeekEnd` is always Sunday at 23:59:59.999

**Evidence required**
- Passing `packages/domain/test/planning-ritual-domain.test.ts` output
- Coverage of boundary edge cases above

---

### Phase 3: Add persistence layer (migration + repository)

**Outcome:** The `review_records` table exists in SQLite, the `routines` and `routine_occurrences` tables have the new fields, and the repository provides `createReviewRecord` and `getReviewRecordById` methods.

**Primary files**
- Create: new Drizzle migration file (e.g., `apps/api/drizzle/migrations/XXXX_planning_ritual_support.sql`)
- Modify: `apps/api/src/repository.ts`

**Work items**

**Migration 1: extend `routines` table**
```sql
ALTER TABLE routines ADD COLUMN ritual_type TEXT CHECK(ritual_type IN ('weekly_review')) DEFAULT NULL;
```

**Migration 2: extend `routine_occurrences` table**
```sql
ALTER TABLE routine_occurrences ADD COLUMN review_record_id TEXT REFERENCES review_records(id) ON DELETE SET NULL DEFAULT NULL;
```

**Migration 3: create `review_records` table**
```sql
CREATE TABLE review_records (
  id TEXT PRIMARY KEY,
  ritual_occurrence_id TEXT NOT NULL REFERENCES routine_occurrences(id),
  review_date TEXT NOT NULL,                 -- YYYY-MM-DD
  last_week_window_start TEXT NOT NULL,      -- YYYY-MM-DD
  last_week_window_end TEXT NOT NULL,        -- YYYY-MM-DD
  current_week_window_start TEXT NOT NULL,   -- YYYY-MM-DD
  current_week_window_end TEXT NOT NULL,     -- YYYY-MM-DD
  carry_forward_notes TEXT,                  -- nullable
  completed_at TEXT NOT NULL,                -- ISO datetime
  completed_by TEXT NOT NULL,                -- owner JSON or id
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_review_records_occurrence_id ON review_records(ritual_occurrence_id);
```

**Note on migration order:** The `routine_occurrences` migration that adds the FK to `review_records` must run after the `review_records` table creation migration. Confirm the migration runner applies them in file order.

**Repository additions:**

Add `repository.createReviewRecord(data: Omit<ReviewRecord, 'createdAt' | 'updatedAt'>): ReviewRecord`:
- Inserts into `review_records`.
- Returns the created record.
- Called inside the atomic ritual completion transaction (see Phase 4).

Add `repository.getReviewRecordById(id: string): ReviewRecord | null`:
- Queries `review_records` by `id`.
- Returns null if not found.

Extend `repository.getRoutineById` (or equivalent) to include `ritual_type` in the returned routine object.

Extend `repository.getRoutineOccurrenceById` (or equivalent) to include `review_record_id` in the returned occurrence object.

Add `repository.markOccurrenceCompleteWithReviewRecord(occurrenceId: string, reviewRecordId: string, completedAt: string): void`:
- Updates `routine_occurrences SET completion_state = 'completed', completed_at = ?, review_record_id = ? WHERE id = ?`.
- Run inside the same transaction as `createReviewRecord`.

**Verification**
- Migration runs cleanly against an existing test database (existing `routines` and `routine_occurrences` rows are unaffected).
- `ritual_type` is NULL on all existing routines (backwards compatible).
- `review_record_id` is NULL on all existing occurrences (backwards compatible).
- `createReviewRecord` inserts a record that is retrievable via `getReviewRecordById`.
- `markOccurrenceCompleteWithReviewRecord` sets both fields atomically.
- `tsc --noEmit` passes.

**Evidence required**
- Migration diff (SQL)
- Passing typecheck and repository unit-level verification

---

### Phase 4: Add API endpoints for ritual completion and review record retrieval

**Outcome:** Two new endpoints are available and tested: `POST /api/routines/:id/complete-ritual` and `GET /api/review-records/:id`.

**Primary files**
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/test/api.test.ts`

**Work items**

**Add `POST /api/routines/:id/complete-ritual`:**

```
POST /api/routines/:id/complete-ritual
Path param: id = routineId
Request body: CompleteRitualRequest { occurrenceId, carryForwardNotes }
Response: CompleteRitualResponse { reviewRecordId, reviewDate, nextOccurrenceDueDate }
Auth: stakeholder only (spouse cannot complete the ritual)
```

Route handler logic:
1. Fetch the routine by `id`. If not found: 404.
2. Verify `routine.ritualType === 'weekly_review'`. If not: 400 "Not a planning ritual".
3. Fetch the occurrence by `occurrenceId`. Verify it belongs to this routine. If not: 404.
4. Verify the occurrence is in due or overdue state (`completionState` is not `'completed'`). If already complete: 409 "Occurrence already completed".
5. Compute review windows using `getReviewWindowsForOccurrence(new Date(occurrence.dueDate))` — anchor to the occurrence's due date, not the current date.
6. Compute `reviewDate` as `format(new Date(), 'yyyy-MM-dd')` — the date the review was actually completed.
7. In a single SQLite transaction:
   a. Call `repository.createReviewRecord({ id: generateUUID(), ritualOccurrenceId: occurrenceId, reviewDate, lastWeekWindowStart, lastWeekWindowEnd, currentWeekWindowStart, currentWeekWindowEnd, carryForwardNotes, completedAt: new Date().toISOString(), completedBy: request.user.owner })`.
   b. Call `repository.markOccurrenceCompleteWithReviewRecord(occurrenceId, reviewRecord.id, completedAt)`.
   c. Compute the next occurrence due date using the existing recurrence rule logic (same as `POST /api/routines/:id/complete`). Create the next occurrence if applicable.
8. Return `{ reviewRecordId: reviewRecord.id, reviewDate, nextOccurrenceDueDate }`.

**Add `GET /api/review-records/:id`:**

```
GET /api/review-records/:id
Path param: id = reviewRecordId
Response: ReviewRecord
Auth: stakeholder and spouse (both can read review records)
```

Route handler logic:
1. Fetch `repository.getReviewRecordById(id)`. If not found: 404.
2. Return `reviewRecordSchema.parse(record)`.

**Verification**

API integration tests in `apps/api/test/api.test.ts`:

For `POST /api/routines/:id/complete-ritual`:
- Happy path: ritual routine with a due occurrence + valid request body → 200, review record created, occurrence marked complete, next occurrence scheduled.
- Invalid routine (not ritual_type): → 400.
- Occurrence ID not found: → 404.
- Occurrence belongs to different routine: → 404.
- Occurrence already completed: → 409.
- `carryForwardNotes: null` (no notes): → 200, review record has `carry_forward_notes = null`.
- Spouse role attempt: → 403.
- Window anchoring: occurrence with `dueDate = '2026-03-08'` completed on `2026-03-15` → `last_week_window_start = '2026-03-02'`, `last_week_window_end = '2026-03-08'`.
- Next occurrence scheduled correctly per recurrence rule.

For `GET /api/review-records/:id`:
- Known review record ID → 200, full ReviewRecord payload.
- Unknown ID → 404.
- Spouse role → 200 (read access confirmed).

**Evidence required**
- Passing API test output
- Sample response JSON for both endpoints

---

### Phase 5: Extend PWA client/sync and Dexie cache for review records

**Outcome:** The PWA can submit ritual completion offline-tolerantly and retrieve review records for the detail screen. Review records participate in the sync outbox.

**Primary files**
- Modify: `apps/pwa/src/lib/api.ts`
- Modify: `apps/pwa/src/lib/sync.ts`
- Modify: `apps/pwa/src/lib/client-db.ts`

**Work items**

**Add to `apps/pwa/src/lib/api.ts`:**
- `completeRitual(routineId: string, request: CompleteRitualRequest): Promise<CompleteRitualResponse>` — calls `POST /api/routines/:routineId/complete-ritual`, parses with `completeRitualResponseSchema`.
- `fetchReviewRecord(reviewRecordId: string): Promise<ReviewRecord>` — calls `GET /api/review-records/:reviewRecordId`, parses with `reviewRecordSchema`.

**Add to `apps/pwa/src/lib/sync.ts`:**
- `submitRitualCompletion(routineId: string, occurrenceId: string, carryForwardNotes: string | null): Promise<CompleteRitualResponse>`:
  - If online: calls `completeRitual(routineId, { occurrenceId, carryForwardNotes })` directly.
  - If offline: generates a local `reviewRecordId` (UUID), saves a pending outbox entry with type `'complete-ritual'`, updates the local occurrence in Dexie to completed state with the provisional `reviewRecordId`, and schedules the next occurrence locally. Returns a local `CompleteRitualResponse` with the provisional IDs.
  - On reconnect: the outbox flushes the `complete-ritual` entry to the server. The server response (which includes the canonical `reviewRecordId`) replaces the provisional local ID in Dexie.

- `loadReviewRecord(reviewRecordId: string): Promise<ReviewRecord>`:
  - Attempts `fetchReviewRecord(reviewRecordId)`.
  - On failure: queries the local Dexie `reviewRecords` table for the provisional record (may exist from offline completion). Returns the local record if found, or throws.

**Add to `apps/pwa/src/lib/client-db.ts`:**
- Add `reviewRecords` Dexie table:
  - Schema: `reviewRecords: 'id, ritualOccurrenceId, reviewDate, completedAt'`
  - Stores `ReviewRecord` objects as saved locally on offline ritual completion and on sync from server.
- Extend the outbox schema to support `complete-ritual` operation type:
  - Entry shape: `{ type: 'complete-ritual', routineId, occurrenceId, carryForwardNotes, provisionalReviewRecordId }`
- Extend the Dexie sync flush logic to handle `complete-ritual` entries: POST to server, on success update the `reviewRecords` table with the canonical ID, update the occurrence's `reviewRecordId` field.

**Verification**
- Unit test: offline `submitRitualCompletion` saves an outbox entry and updates the local occurrence.
- Unit test: `loadReviewRecord` returns the local Dexie record when the server is unavailable.
- Offline simulation: mock network failure, complete a ritual, verify the outbox entry is created and the occurrence shows completed in the routine list.
- Verify that flushing the outbox on reconnect correctly replaces the provisional `reviewRecordId` with the server-assigned canonical ID.

**Evidence required**
- Passing test output for offline ritual completion and review record retrieval

---

### Phase 6: Build PWA surfaces

**⚠️ VISUAL SPEC DEPENDENCY:** This phase requires `docs/plans/planning-ritual-support-visual-implementation-spec.md`. All layout, color, typography, and interaction details are specified there. The structure below is the implementation guide; all visual details must come from the visual spec.

**Outcome:** All four planning ritual support UI surfaces are implemented:
1. Review flow screen (multi-step: last week recap → coming week overview → carry-forward notes → complete)
2. Review record detail screen (accessed from activity history ritual entry tap)
3. Activity history ritual entry row (extends activity history screen)
4. Routine index planning ritual card variant (extends existing routine index)

#### 6.1 Review Flow Screen

**New file:** `apps/pwa/src/routes/review-flow-page.tsx`

**Route:** Register in `apps/pwa/src/router.tsx`:
```typescript
import { ReviewFlowPage } from './routes/review-flow-page';
const reviewFlowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/household/routines/$routineId/review/$occurrenceId',
  component: ReviewFlowPage
});
```

**Internal step state:**
```typescript
const [step, setStep] = useState<1 | 2 | 3>(1);
```

**Data requirements per step:**

Step 1 — Last week recap:
- Call `GET /api/activity-history` with a window override or derive the prior-week window from the occurrence's due date.
  - **Note for Founding Engineer:** The existing `GET /api/activity-history` endpoint returns a rolling 30-day window. For the review flow, step 1 needs data from the *specific prior-calendar-week window* anchored to the occurrence's due date (which may be different from the rolling 30-day window if the ritual is being completed late). Options:
    - Option A: Re-use `GET /api/activity-history` and filter client-side to the specific prior-week window dates (derived from the occurrence's due date). Simple, works from cache.
    - Option B: Add a query param to `GET /api/activity-history` for a custom window (e.g., `?windowStart=&windowEnd=`). More precise, requires API change.
  - **Recommendation:** Option A — the activity history response already contains day-grouped items; the client can filter by the `lastWeekWindowStart` and `lastWeekWindowEnd` dates derived from the occurrence's due date. No API change required.
  - Offline fallback: use `assembleActivityHistoryFromCache()` (from Phase 4 of the activity history implementation plan), then filter to the specific prior-week window.

Step 2 — Coming week overview:
- Call `GET /api/weekly-view` with the current week that corresponds to the occurrence's anchor week.
  - **Note for Founding Engineer:** Similar to step 1, the coming-week window is anchored to the occurrence's due date, not necessarily today's week. If the ritual is completed in the same week it is due, these are the same. If completed late, the "coming week" as of the occurrence's due date may be a past week (e.g., completing a March 8 ritual on March 15 means the "coming week" is March 9–15, which is now the current or past week). This is the correct behavior per spec OQ-4 resolution.
  - Option A (recommended): Re-use `GET /api/weekly-view` and filter client-side. The weekly view returns the current calendar week. For late completions, use `assembleWeeklyViewFromCache()` (or equivalent) scoped to the occurrence's current-week window dates.
  - Offline fallback: use cached weekly view data filtered to the `currentWeekWindowStart`/`currentWeekWindowEnd` derived from the occurrence's due date.

Step 3 — Carry-forward notes:
- Local state only. No API call needed.
- `const [notes, setNotes] = useState('')`

**Screen structure (from visual spec §3.1–§3.5):**
- Header: olivia wordmark, close button (✕), screen title (ritual title from the routine), step subtitle.
- Progress indicator: 3-segment bar, active segment filled.
- Scrollable content area per step.
- Fixed footer: "Next →" (steps 1–2) or "Complete review" (step 3).
- "Complete review" tap: call `submitRitualCompletion(routineId, occurrenceId, notes || null)`. Show button loading state. On success, navigate back to routine index. On error, show inline retry.

**Review section rendering (steps 1 and 2):**
- Group items by workflow type in the defined order.
- Each group: `ALL CAPS` section header + divider + item cards.
- Empty group: per-group italic empty message.
- All-groups empty: full-section empty state.
- Item cards: reuse item card anatomy from activity history (left border accent, icon, title, metadata) with day-of-week date format for metadata (not clock time).

**Step navigation:**
- "Next →": `setStep(step + 1)`
- OS back gesture: `step > 1 ? setStep(step - 1) : navigate back`
- "✕": navigate back to routine index (no save)

#### 6.2 Review Record Detail Screen

**New file:** `apps/pwa/src/routes/review-record-detail-page.tsx`

**Route:** Register in `apps/pwa/src/router.tsx`:
```typescript
import { ReviewRecordDetailPage } from './routes/review-record-detail-page';
const reviewRecordDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/household/review-records/$reviewRecordId',
  component: ReviewRecordDetailPage
});
```

**Data fetching:**
```typescript
useQuery({
  queryKey: ['review-record', reviewRecordId],
  queryFn: () => loadReviewRecord(reviewRecordId),
  staleTime: 5 * 60 * 1000   // review records are immutable; 5min stale time is generous
})
```

**Screen structure (from visual spec §3.6–§3.8):**
- Header: back chevron, olivia wordmark, avatar cluster, screen title ("Review"), review date subtitle.
- Spouse banner (if spouse session, per L-009).
- Scroll area:
  - "Weeks reviewed" section: two window chips (last week range, current week range).
  - "Notes" section: notes card with content or empty state.
  - Completion metadata: "Completed [time] · [completed-by]".
- Bottom nav.

**Navigation:** Back chevron → `navigate(-1)` (returns to activity history).

#### 6.3 Activity History Ritual Entry (Extends Activity History Screen)

**File to modify:** `apps/pwa/src/routes/history-page.tsx`

**Change:** In the item row renderer for `type === 'routine'`, check if the routine occurrence has a `reviewRecordId` (non-null). If it does, render the 3-line ritual entry row variant:
- Same `--mint` left border + `↻` icon + routine title + completion metadata (as 2-line)
- Additional third line: "Review" label in `--ink-3`, PJS 11px 500

**Tap behavior change:** If the item is a ritual entry (has `reviewRecordId`), navigate to `/household/review-records/:reviewRecordId` instead of the standard routine detail screen.

**Contract change:** The `ActivityHistoryRoutineItem` schema (in Phase 1 of activity history) must be extended with an optional `reviewRecordId` field:
```typescript
// Extend in packages/contracts/src/index.ts
activityHistoryRoutineItemSchema = z.object({
  ...
  reviewRecordId: z.string().uuid().nullable().optional()  // new field
})
```
The API's activity history endpoint should populate this field from the `review_record_id` column of the joined `routine_occurrences` row.

**Note for Founding Engineer:** This is a small, backwards-compatible contract extension — existing clients that don't know about `reviewRecordId` will ignore it; the activity history screen simply uses it for ritual detection. Confirm that the activity history repository query (from M12) can be extended to include `review_record_id` from the `routine_occurrences` join.

#### 6.4 Routine Index Planning Ritual Card Variant (Extends Existing Routine Index)

**File to modify:** `apps/pwa/src/routes/household/routines/` (or equivalent routine index component)

**Change:** When rendering a routine card, check if `routine.ritualType === 'weekly_review'`. If so:
- Render the planning ritual card variant: no completion checkbox; show "Start review →" button instead.
- Due state: standard due badge + "Start review" button.
- Overdue state: overdue badge + "Start review" button + "Due [day], [date]" subtitle.
- Completed state: standard completed routine card appearance (no "Start review" button).

**"Start review" button tap handler:**
```typescript
navigate({ to: '/household/routines/$routineId/review/$occurrenceId', params: { routineId: routine.id, occurrenceId: dueOccurrence.id } })
```

**Weekly view ritual card (minor extension):**
- In the weekly view routine row renderer, check `routine.ritualType === 'weekly_review'`. If true, render a "Start review" micro-label (static text, not a tappable button) instead of the due-state checkbox indicator. The card tap behavior remains the same: navigate to routine detail screen.

---

### Phase 7: Verification, documentation sync, and milestone evidence

**Outcome:** Planning ritual support is verifiable end-to-end. All 18 acceptance criteria from the feature spec are met. M13 milestone gate readiness can be assessed.

**Primary files**
- Modify as needed: all test files touched in prior phases
- Modify: `docs/roadmap/milestones.md` (M12 progress notes if completing before M12 gate; M13 milestone)
- Modify: `docs/learnings/decision-history.md` if any new durable decisions were made during implementation

**Work items**

Run targeted automated suites:
- `packages/domain` — planning ritual domain tests
- `apps/api/test` — ritual completion and review record API tests
- `apps/pwa/src/lib` — offline ritual completion and review record retrieval tests
- Full domain + API + PWA test suite — confirm no regressions from activity history or recurring routines

Execute manual acceptance criteria checklist against `docs/specs/planning-ritual-support.md`:

1. ✓ A planning ritual can be created as a recurring routine with a weekly cadence and appears in the routine index with the "Start review" button visual indicator.
2. ✓ The planning ritual occurrence appears in the unified weekly view under ROUTINES on its scheduled day with correct completion state.
3. ✓ Tapping the planning ritual card in the routine index opens the structured review flow, not an immediate-completion interaction.
4. ✓ The review flow presents three sections in order: last week recap, coming week overview, carry-forward notes.
5. ✓ The last week recap shows activity from the prior calendar Monday–Sunday (anchored to occurrence due date), from all five H3 data sources, grouped by workflow type.
6. ✓ The coming week overview shows scheduled items for the occurrence's current calendar Monday–Sunday, from all four unified weekly view data sources, grouped by workflow type.
7. ✓ Empty review sections display a clear, calm empty state message rather than a blank section or error.
8. ✓ The carry-forward notes field accepts free-text input and is labeled as optional.
9. ✓ The household member can complete the ritual by tapping "Complete review" after any point in the flow. Completion executes immediately without a confirmation step.
10. ✓ Completing the review saves a review record with all required fields: review date, window dates, carry-forward notes, completion timestamp, completed-by identity.
11. ✓ The completed occurrence advances to the next scheduled occurrence per the recurrence rule.
12. ✓ The completed ritual occurrence appears in activity history for the review date, with the "Review" secondary label visually identifying it as a planning ritual.
13. ✓ Tapping the completed ritual entry in activity history opens the review record detail screen showing carry-forward notes and window metadata.
14. ✓ The planning ritual supports the same lifecycle actions as all recurring routines: pause (with confirmation), archive (with confirmation), delete (with higher-friction confirmation), edit (immediate).
15. ✓ The review flow renders from locally cached H3 state when offline without crashing.
16. ✓ The review record is saved to the client store and synced to the canonical store on reconnect, using the outbox pattern.
17. ✓ The spouse sees completed review records from activity history in read-only mode with the per-screen spouse banner (L-009). The spouse cannot initiate or complete a review flow.
18. ✓ No AI is required. All review sections are populated from locally cached H3 state.

Review deferred boundaries — confirm not quietly implemented:
- No AI-generated summaries or narrative
- No automatic carry-forward (notes-to-inbox or notes-to-routine conversion)
- No shared spouse participation in the review flow
- No draft-save for in-progress reviews
- No review history browser
- No push notifications for ritual due state
- No monthly/quarterly ritual templates

If implementation surfaces any new durable decisions, document in `docs/learnings/decision-history.md`.

**Evidence required**
- Passing targeted automated suite output
- Manual QA checklist confirming all 18 acceptance criteria
- `docs/roadmap/milestones.md` M12 progress notes updated (if completing M12)

---

## Verification Matrix

### Contracts and domain
- Review record schema parses correctly (with and without carry-forward notes).
- Extended routine schema with `ritual_type` parses both `null` (standard routine) and `'weekly_review'` (planning ritual).
- `getReviewWindowsForOccurrence` produces correct prior-week and current-week window dates for any anchor date, including month and year boundaries.
- Window dates are always calendar-week aligned (Monday start, Sunday end).

### API and data assembly
- `POST /api/routines/:id/complete-ritual` correctly creates review record, marks occurrence complete, and schedules next occurrence — atomically.
- Late completion anchors to occurrence due date, not current date.
- Spouse role blocked from completing ritual.
- `GET /api/review-records/:id` returns correct review record; 404 for unknown ID; accessible to spouse role.
- Activity history endpoint returns `reviewRecordId` on ritual occurrence items.

### PWA and offline behavior
- Review flow renders all three steps correctly.
- Review flow step data uses occurrence-anchored window dates.
- Offline ritual completion: outbox entry saved, occurrence updated locally, next occurrence scheduled locally.
- Outbox flush on reconnect: canonical review record saved, provisional IDs replaced.
- Review record detail screen renders from server or local cache.
- Activity history ritual entries navigate to review record detail (not routine detail).
- Routine index planning ritual card shows "Start review" button, not checkbox.

### Scope control
- No AI, no carry-forward conversion, no spouse review participation, no draft-save, no push notifications.
- No new entity types beyond `review_records`.
- All existing routine, occurrence, activity history, and weekly view tests pass without regression.

---

## Risks / Open Questions

### 1. Activity history endpoint extension for reviewRecordId

The activity history endpoint (built in M12) returns `ActivityHistoryRoutineItem` objects. To surface the ritual visual treatment and the review record deep link in activity history, these items need a `reviewRecordId` field. This requires a small, backwards-compatible extension to both the contracts schema and the activity history repository query. Confirm during Phase 6.3 implementation that this extension does not break any existing activity history tests.

### 2. Window data sourcing for the review flow sections

Step 1 requires prior-week activity data anchored to the occurrence's due date; step 2 requires current-week upcoming data anchored to the same date. The existing endpoints (`GET /api/activity-history`, `GET /api/weekly-view`) cover the rolling present. For late completions, the "current week" as of the occurrence's due date is now in the past. Options A and B in Phase 6.1 address this, but Founding Engineer should confirm which approach (client-side filtering vs. API query param extension) is simpler and more testable.

### 3. Multiple overdue occurrences — correct window per occurrence

Each overdue occurrence has its own `dueDate`. When completing the oldest overdue occurrence, the review flow must use that occurrence's specific `dueDate` as the anchor — not the most recent occurrence's due date and not the current date. The route structure (`/review/:occurrenceId`) binds the flow to a specific occurrence, but confirm that the window calculation correctly reads `occurrence.dueDate` from the occurrence identified by the route param.

### 4. Review record durability across ritual archive

The spec requires review records to be preserved when the planning ritual is archived. Confirm that the routine archive command in `apps/api/src/app.ts` does not cascade-delete `routine_occurrences` or `review_records` for the archived routine. If cascade delete is currently in place for occurrences, it should be changed to soft-delete (set routine status to archived; occurrences and review records remain).

### 5. Outbox provisional ID replacement

The offline ritual completion creates a provisional `reviewRecordId` locally. When the server processes the outbox entry and returns the canonical ID, the client must update the local `reviewRecords` Dexie table and the `routine_occurrences` Dexie table to replace the provisional ID with the canonical ID. This two-table update on flush must be atomic (Dexie transaction). Confirm the outbox flush logic handles this correctly.
