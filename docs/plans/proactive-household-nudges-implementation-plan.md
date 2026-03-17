# Proactive Household Nudges Implementation Plan

**Goal:** Implement the second Horizon 5 (Selective Trusted Agency) feature — proactive in-app nudge cards that surface overdue routine occurrences, approaching reminder deadlines, and overdue planning ritual occurrences. The household member responds directly from the nudge tray: marking a routine done, snoozing or completing a reminder, or opening the planning ritual review flow. Olivia-initiated, advisory-only, no record changes without an explicit user tap.

**Architecture:** Nudges are a purely computed, read-only feature on the server side. A new `GET /api/nudges` endpoint queries existing entity state (routine occurrences, reminders, routines) and returns prioritized nudge payloads — no new server tables. The PWA polls this endpoint on a 15-minute interval while foregrounded (Page Visibility API to pause when backgrounded). Dismissed nudge state is stored client-locally in a new Dexie `nudgeDismissals` table (v7), daily-reset, never synced to the server. The "Skip" action on routine nudges requires a new `POST /api/routines/:routineId/skip` endpoint — this is not a pre-existing endpoint and must be built in Phase 3. All other action endpoints already exist.

**Tech Stack:** TypeScript, Zod, Fastify, better-sqlite3, Drizzle, React, TanStack Router, TanStack Query, Dexie, Vitest. No new dependencies required.

**Visual spec dependency:** Phase 6 (PWA surface changes) depends on `docs/plans/proactive-household-nudges-visual-implementation-spec.md` (OLI-62, in progress). All layout, color, typography, and interaction details are specified there. The structure below is the implementation guide; all visual details for Phase 6 must come from the visual spec.

---

## Summary

Proactive household nudges are implemented in a layered sequence:

1. Add nudge + skip-occurrence contracts: schemas, response types, skip outbox command
2. Add domain helpers: `skipRoutineOccurrence` and nudge priority sorting
3. Add API endpoints: `GET /api/nudges` (computed) and `POST /api/routines/:routineId/skip`
4. Extend PWA client/sync layer: nudge polling utility, skip submission, outbox flush
5. Add Dexie dismiss-state model: `nudgeDismissals` table (v7), daily-reset logic
6. Build PWA surface: nudge tray, nudge cards, polling loop, action handlers (⚠️ visual spec dependency)
7. Verify acceptance criteria end-to-end

---

## Architecture Decisions Resolved In This Plan

### Decision A: Polling interval — 15 minutes with Page Visibility API pause

**Chosen approach:** The PWA polls `GET /api/nudges` every 15 minutes. The `document.addEventListener('visibilitychange', ...)` API is used to pause polling when the page becomes hidden and resume when it becomes visible again. On resumption from background (e.g., switching back to the app), a fresh poll fires immediately before the 15-minute timer resets.

**Rationale:** Per feature spec recommendation. 15 minutes is aggressive enough to surface time-sensitive items without creating unnecessary API load or battery drain. Page Visibility API is the correct mechanism for PWA foreground detection on mobile. An immediate poll-on-foreground ensures the tray is fresh when the user returns to the app.

### Decision B: Skip occurrence is new work, not pre-existing

**Chosen approach:** The feature spec references "calls existing skip-occurrence endpoint" but no such endpoint, domain function, or outbox command currently exists in the codebase. Phase 2 adds `skipRoutineOccurrence` to the domain, Phase 3 adds `POST /api/routines/:routineId/skip` to the API, and Phase 1 adds a `routine_skip` outbox command. The implementation follows the exact same pattern as `completeRoutineOccurrence` / `POST /api/routines/:routineId/complete` with `skipped: true` on the occurrence record.

**Rationale:** The domain already models `skipped` on `RoutineOccurrence` (the field exists, it's always `false` currently). Adding skip-occurrence closes this gap. The nudge implementation is the natural delivery vehicle for this capability since it's the first surface that needs a "Skip" action.

### Decision C: Max display cap applied client-side after dismiss filtering

**Chosen approach:** `GET /api/nudges` returns all active nudge payloads sorted by priority (no cap). The PWA applies dismiss filtering first (removing items dismissed today via Dexie), then caps the rendered list at 5 items, showing "+ N more" for the remainder. The "+ N more" count reflects undisplayed nudges after dismiss filtering.

**Rationale:** The API doesn't know about client-side dismiss state (dismiss is never synced to the server). Applying the cap after dismiss filtering gives the household member a stable "up to 5" view of the most important items that haven't been dismissed today, rather than a cap that could show 5 already-dismissed entries when more important undismissed items exist. The API returns the full prioritized set; the client renders a meaningful slice.

### Decision D: Constants as module-level exports in contracts

**Chosen approach:** `NUDGE_APPROACHING_THRESHOLD_HOURS = 24`, `NUDGE_SNOOZE_INTERVAL_HOURS = 1`, and `NUDGE_MAX_DISPLAY_COUNT = 5` are exported as constants from `packages/contracts/src/index.ts`. Both the API (nudge computation threshold) and PWA (snooze calculation, display cap) use the same constant definitions, preventing drift.

**Rationale:** The feature spec designates these as Founding Engineer decisions. Placing them in contracts ensures all layers share a single source of truth and the values are discoverable for future tuning.

### Decision E: Nudge dismiss state in Dexie `nudgeDismissals` table

**Chosen approach:** A new Dexie table `nudgeDismissals` is added in schema version 7. Each row: `{ id: string, entityType: string, entityId: string, dismissedDate: string }` where `id` is the concatenated key `${entityType}.${entityId}.${dismissedDate}`. The daily-reset logic is: on each poll response, filter nudges by comparing `dismissedDate` to today's date string (YYYY-MM-DD); entries with `dismissedDate < today` are stale and ignored (optionally pruned). No server sync, no outbox.

**Rationale:** Using a dedicated table rather than the `meta` key-value store provides efficient querying by `entityType + entityId` and clean daily staleness detection. The composite ID prevents duplicates and makes existence checks O(1) via Dexie primary key lookup.

### Decision F: `GET /api/nudges` does not require `actorRole` authorization restriction

**Chosen approach:** `GET /api/nudges` is accessible to both stakeholder and spouse roles. Spouse receives the same household-wide nudges in Phase 1 — consistent with the feature spec ("no household-member-specific targeting in Phase 1"). The route extracts `actorRole` from the query string for request logging but does not enforce stakeholder-only access.

**Rationale:** Per feature spec: "Secondary user: spouse — receives the same household nudges in Phase 1." The nudge content is household-wide data that spouses can already access via the routines, reminders, and planning ritual screens. Read-only access aligns with the spouse read-only model in all current Phase 1 features.

---

## Source Artifacts

- `docs/specs/proactive-household-nudges.md` — feature spec (CEO-approved, OLI-61)
- `docs/plans/proactive-household-nudges-visual-implementation-spec.md` — visual spec (OLI-62, pending)
- `docs/roadmap/milestones.md` (M18 exit criteria)
- `docs/plans/ai-assisted-ritual-summaries-implementation-plan.md` — pattern reference (M17)
- `packages/domain/src/index.ts` — `completeRoutineOccurrence` pattern for `skipRoutineOccurrence`

Relevant durable guidance:
- `D-002`: advisory-only trust model — nudge appears without any record change; user action required
- `D-010`: non-destructive user-initiated actions execute immediately — all nudge action taps execute without confirmation
- `L-023`: H5 Phase 1 validated advisory-only AI integration; same trust model applies to nudges

---

## Assumptions And Non-Goals

### Assumptions

- All three H4 entity models are complete and stable: `routine_occurrences` (with `currentDueDate`, `completedAt`, `skippedAt`), `reminders` (with `dueDate`, `completedAt`, `cancelledAt`), and `routines` (with `ritualType`, `currentDueDate`).
- The existing `POST /api/reminders/snooze` endpoint accepts a `snoozedUntil` ISO datetime — the nudge implementation computes `snoozedUntil = now + NUDGE_SNOOZE_INTERVAL_HOURS` and calls the existing endpoint.
- The Dexie client DB is currently at schema version 6. Version 7 introduces `nudgeDismissals`.
- The existing `POST /api/routines/:routineId/complete` pattern is the model for the new `POST /api/routines/:routineId/skip` — same request/response shape, same version-conflict handling.

### Non-Goals

- Push notifications (device token storage, service worker push, server-side scheduling) — Phase 2.
- Nudge preference settings per household member (quiet hours, per-category opt-out) — Phase 2.
- Nudge audit log or notification history surface — Phase 2.
- AI-enhanced nudge timing or prioritization — Phase 2+ per D-034.
- Snooze affordance for planning ritual nudges — Phase 2 pending dismiss-rate data.
- Per-device or cross-device dismiss state sync — Phase 2.
- Navigation count badge on the home tab — designer decision; if included in the visual spec (OLI-62), implement in Phase 6; if deferred, Phase 2.

---

## Codebase Anchors

- `packages/contracts/src/index.ts` — add `nudgeEntityTypeSchema`, `nudgeSchema`, `nudgesResponseSchema`, `skipRoutineOccurrenceRequestSchema`, `skipRoutineOccurrenceResponseSchema`, `routine_skip` outbox variant, constants
- `packages/domain/src/index.ts` — add `skipRoutineOccurrence`, `sortNudgesByPriority`
- `packages/domain/test/planning-ritual-domain.test.ts` — extend with skip and nudge priority sort tests (or add new test file)
- `apps/api/src/app.ts` — add `GET /api/nudges`, `POST /api/routines/:routineId/skip`
- `apps/api/src/repository.ts` — add `getNudgePayloads(now: Date)` or inline nudge query in the route
- `apps/api/test/api.test.ts` — add nudge endpoint and skip-occurrence tests
- `apps/pwa/src/lib/api.ts` — add `fetchNudges(role)`, `skipRoutineOccurrence(...)`
- `apps/pwa/src/lib/client-db.ts` — v7 schema with `nudgeDismissals` table, dismiss helpers
- `apps/pwa/src/lib/sync.ts` — add `loadNudges(role)`, `submitRoutineSkip(...)`, `dismissNudge(...)`, `isDismissedToday(...)`
- `apps/pwa/src/routes/home-page.tsx` (or new `nudge-tray.tsx`) — nudge tray component, polling loop
- New: `apps/pwa/src/routes/nudge-tray.tsx` — NudgeTray + NudgeCard components (visual spec dependency)

---

## Implementation Phases

### Phase 1: Extend shared contracts

**Outcome:** All layers share a stable vocabulary for nudge payloads and skip-occurrence operations before any implementation logic.

**Primary files**
- Modify: `packages/contracts/src/index.ts`

**Work items**

Add nudge entity type and nudge schema:
```typescript
export const nudgeEntityTypeSchema = z.enum(['routine', 'reminder', 'planningRitual']);
export type NudgeEntityType = z.infer<typeof nudgeEntityTypeSchema>;

export const nudgeSchema = z.object({
  entityType: nudgeEntityTypeSchema,
  entityId: z.string().uuid(),
  entityName: z.string(),
  triggerReason: z.string(),           // e.g. "Overdue since Monday", "Due in 2 hours"
  overdueSince: z.string().nullable(), // YYYY-MM-DD, for overdue items; null for approaching-only
  dueAt: z.string().datetime().nullable() // ISO datetime for approaching reminders; null otherwise
});

export const nudgesResponseSchema = z.object({
  nudges: z.array(nudgeSchema)
});

export type Nudge = z.infer<typeof nudgeSchema>;
export type NudgesResponse = z.infer<typeof nudgesResponseSchema>;
```

Add skip-occurrence request/response schemas:
```typescript
export const skipRoutineOccurrenceRequestSchema = z.object({
  actorRole: actorRoleSchema,
  routineId: z.string().uuid(),
  expectedVersion: z.number().int().positive()
});

export const skipRoutineOccurrenceResponseSchema = z.object({
  savedRoutine: routineSchema.extend({ dueState: routineDueStateSchema }),
  occurrence: routineOccurrenceSchema,
  newVersion: z.number().int().positive()
});

export type SkipRoutineOccurrenceRequest = z.infer<typeof skipRoutineOccurrenceRequestSchema>;
export type SkipRoutineOccurrenceResponse = z.infer<typeof skipRoutineOccurrenceResponseSchema>;
```

Add `routine_skip` to the outbox command discriminated union:
```typescript
z.object({
  kind: z.literal('routine_skip'),
  commandId: z.string().uuid(),
  actorRole: actorRoleSchema,
  routineId: z.string().uuid(),
  expectedVersion: z.number().int().positive()
})
```

Add constants (module-level exports):
```typescript
export const NUDGE_APPROACHING_THRESHOLD_HOURS = 24;
export const NUDGE_SNOOZE_INTERVAL_HOURS = 1;
export const NUDGE_MAX_DISPLAY_COUNT = 5;
```

Keep all existing schemas intact. These are purely additive.

**Verification**
- `tsc --noEmit` across all packages passes.
- A `Nudge` with each `entityType` value parses without error.
- `NudgesResponse` with an empty nudges array parses without error.
- `SkipRoutineOccurrenceRequest` with all fields parses without error.
- The outbox command union discriminates `routine_skip` correctly.

**Evidence required**
- Contract diff showing additions
- Passing typecheck output

---

### Phase 2: Domain helpers — `skipRoutineOccurrence` and nudge sort

**Outcome:** The domain package exposes `skipRoutineOccurrence` (for API and outbox use) and `sortNudgesByPriority` (for API use). Both are pure functions with test coverage.

**Primary files**
- Modify: `packages/domain/src/index.ts`
- Modify or extend: `packages/domain/test/` (add tests alongside existing)

**Work items**

Add `skipRoutineOccurrence` (mirrors `completeRoutineOccurrence`, sets `skipped: true`):

```typescript
/**
 * Skip the current routine occurrence.
 * Advances currentDueDate from the ORIGINAL due date (schedule-anchored), not from now.
 * Sets skipped: true on the recorded occurrence.
 */
export function skipRoutineOccurrence(
  routine: Routine,
  skippedBy: Owner,
  now: Date = new Date()
): CompleteRoutineResult {
  if (routine.status === 'paused') {
    throw new Error('Cannot skip a paused routine.');
  }
  if (routine.status === 'archived') {
    throw new Error('Cannot skip an archived routine.');
  }

  const timestamp = now.toISOString();
  const originalDueDate = routine.currentDueDate;

  const nextDueDate = scheduleNextRoutineOccurrence(
    originalDueDate,
    routine.recurrenceRule,
    routine.intervalDays
  );

  const occurrence = routineOccurrenceSchema.parse({
    id: createId(),
    routineId: routine.id,
    dueDate: originalDueDate,
    completedAt: timestamp,    // required field — records when the skip occurred
    completedBy: skippedBy,
    skipped: true,
    createdAt: timestamp
  });

  const updatedRoutine = routineSchema.parse({
    ...routine,
    currentDueDate: nextDueDate,
    updatedAt: timestamp,
    version: routine.version + 1
  });

  return { updatedRoutine, occurrence };
}
```

Add `sortNudgesByPriority`:

```typescript
import type { Nudge } from '@olivia/contracts';
import { parseISO } from 'date-fns';

/**
 * Sort nudges by priority:
 * 1. planningRitual overdue
 * 2. reminder approaching or overdue
 * 3. routine overdue
 * Within each tier: oldest overdue/approaching first (earliest overdueSince or dueAt).
 */
export function sortNudgesByPriority(nudges: Nudge[]): Nudge[] {
  const tierOrder = { planningRitual: 0, reminder: 1, routine: 2 } as const;

  return [...nudges].sort((a, b) => {
    const tierDiff = tierOrder[a.entityType] - tierOrder[b.entityType];
    if (tierDiff !== 0) return tierDiff;

    // Within tier: oldest first
    const aDate = a.overdueSince ?? a.dueAt ?? '';
    const bDate = b.overdueSince ?? b.dueAt ?? '';
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate < bDate ? -1 : aDate > bDate ? 1 : 0;
  });
}
```

**Domain tests:**

```typescript
// skipRoutineOccurrence
describe('skipRoutineOccurrence', () => {
  it('advances currentDueDate schedule-anchored, sets skipped: true', () => {
    const routine = makeWeeklyRoutine({ currentDueDate: '2026-03-08' });
    const { updatedRoutine, occurrence } = skipRoutineOccurrence(routine, 'stakeholder');
    expect(occurrence.skipped).toBe(true);
    expect(occurrence.dueDate).toBe('2026-03-08');
    expect(updatedRoutine.currentDueDate).toBe('2026-03-15');
    expect(updatedRoutine.version).toBe(routine.version + 1);
  });

  it('throws on paused routine', () => {
    const routine = makeWeeklyRoutine({ status: 'paused' });
    expect(() => skipRoutineOccurrence(routine, 'stakeholder')).toThrow();
  });

  it('throws on archived routine', () => {
    const routine = makeWeeklyRoutine({ status: 'archived' });
    expect(() => skipRoutineOccurrence(routine, 'stakeholder')).toThrow();
  });
});

// sortNudgesByPriority
describe('sortNudgesByPriority', () => {
  it('sorts planning ritual before reminder before routine', () => {
    const nudges = [
      makeNudge({ entityType: 'routine', overdueSince: '2026-03-08' }),
      makeNudge({ entityType: 'planningRitual', overdueSince: '2026-03-10' }),
      makeNudge({ entityType: 'reminder', dueAt: '2026-03-15T10:00:00Z' })
    ];
    const sorted = sortNudgesByPriority(nudges);
    expect(sorted[0].entityType).toBe('planningRitual');
    expect(sorted[1].entityType).toBe('reminder');
    expect(sorted[2].entityType).toBe('routine');
  });

  it('sorts oldest first within the same tier', () => {
    const nudges = [
      makeNudge({ entityType: 'routine', overdueSince: '2026-03-10' }),
      makeNudge({ entityType: 'routine', overdueSince: '2026-03-07' }),
      makeNudge({ entityType: 'routine', overdueSince: '2026-03-09' })
    ];
    const sorted = sortNudgesByPriority(nudges);
    expect(sorted.map(n => n.overdueSince)).toEqual(['2026-03-07', '2026-03-09', '2026-03-10']);
  });

  it('returns empty array for no nudges', () => {
    expect(sortNudgesByPriority([])).toEqual([]);
  });
});
```

**Verification**
- `tsc --noEmit` passes across all packages.
- All new domain tests pass.
- Existing domain tests continue to pass (skip is purely additive).

**Evidence required**
- Updated domain diff
- Passing domain test output

---

### Phase 3: API — `GET /api/nudges` and `POST /api/routines/:routineId/skip`

**Outcome:** Two new API endpoints are available and tested:
1. `GET /api/nudges` — returns prioritized nudge payloads computed from entity state
2. `POST /api/routines/:routineId/skip` — skips the current routine occurrence

**Primary files**
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/repository.ts`
- Modify: `apps/api/test/api.test.ts`

**Work items**

**Add `GET /api/nudges`:**

```
GET /api/nudges?actorRole=stakeholder
Query param: actorRole (optional, for logging)
Response: NudgesResponse { nudges: Nudge[] }
Auth: accessible to both stakeholder and spouse
```

Route handler logic:

1. `const now = new Date()` — all comparisons anchored to this instant.

2. **Routine occurrence nudges:**
   ```sql
   SELECT r.id, r.title, r.ritual_type, r.current_due_date
   FROM routines r
   WHERE r.status = 'active'
     AND r.current_due_date < :today  -- overdue
     AND NOT EXISTS (
       SELECT 1 FROM routine_occurrences o
       WHERE o.routine_id = r.id
         AND o.due_date = r.current_due_date
         AND o.completed_at IS NOT NULL
     )
   ```
   For each row: if `ritualType = 'planning'` → `entityType = 'planningRitual'`; else → `entityType = 'routine'`.
   Set `overdueSince = currentDueDate`, `dueAt = null`.
   `triggerReason`: format as `"Overdue since <weekday>"` (e.g., "Overdue since Monday").

3. **Reminder approaching nudges:**
   ```sql
   SELECT r.id, r.title, r.due_date
   FROM reminders r
   WHERE r.due_date <= :thresholdDatetime  -- within NUDGE_APPROACHING_THRESHOLD_HOURS hours from now
     AND r.due_date >= :now               -- not already past-due (approaching)
     AND r.completed_at IS NULL
     AND r.cancelled_at IS NULL
   ```
   Also include reminders where `due_date < :now AND completed_at IS NULL AND cancelled_at IS NULL` (already overdue).
   `entityType = 'reminder'`, `overdueSince` = null for approaching / `due_date` date-string for overdue, `dueAt = due_date`.
   `triggerReason`: "Due in X hours" (approaching) or "Overdue since <weekday>" (past due).

4. Merge and call `sortNudgesByPriority(allNudges)` from the domain.

5. Return `nudgesResponseSchema.parse({ nudges: sortedNudges })`.

**Note on deduplication:** The SQL queries above are already deduplicated by entity — each routine and each reminder appears at most once. Planning rituals and routines are separate rows in the same `routines` table, distinguished by `ritual_type`. The sort puts planning rituals first within the result.

**Add `POST /api/routines/:routineId/skip`:**

```
POST /api/routines/:routineId/skip
Body: { actorRole, expectedVersion }
Response: SkipRoutineOccurrenceResponse { savedRoutine, occurrence, newVersion }
Auth: stakeholder only
```

Route handler logic (mirrors `/complete`):
1. Parse body via `skipRoutineOccurrenceRequestSchema`.
2. `assertStakeholderWrite(body.actorRole)`.
3. Fetch routine; 404 if not found.
4. Version conflict check; 409 if mismatch.
5. `const { updatedRoutine, occurrence } = skipRoutineOccurrence(currentRoutine, body.actorRole, now)`.
6. `repository.completeRoutineOccurrence(updatedRoutine, occurrence, body.expectedVersion)` — reuse the same repository write method (it persists the occurrence record regardless of `skipped` value).
7. Log and return `skipRoutineOccurrenceResponseSchema.parse(...)`.

**Repository: add nudge query**

Add `getNudgePayloads(now: Date): Nudge[]` to the repository. This method performs the queries described above and returns an unsorted array of `Nudge` objects. The route handler calls `sortNudgesByPriority` from the domain.

Alternatively, inline the query logic in the route handler if it is simple enough — Founding Engineer judgment.

**API integration tests:**

For `GET /api/nudges`:
- Overdue routine: routine with `currentDueDate` in the past and no completed occurrence → nudge appears as `entityType: 'routine'`
- Overdue planning ritual: routine with `ritualType = 'planning'` and `currentDueDate` in the past → nudge appears as `entityType: 'planningRitual'`
- Approaching reminder: reminder with `dueDate` within 24 hours → nudge appears as `entityType: 'reminder'`
- Threshold boundary: reminder due in 23 hours → appears; reminder due in 25 hours → does not appear
- Completed routine occurrence: routine with a completed occurrence for `currentDueDate` → does not appear
- Resolved reminder: `completedAt` not null → does not appear
- Cancelled reminder: `cancelledAt` not null → does not appear
- Empty state: no overdue items → empty `nudges` array
- Priority order: a mix of all three types → planningRitual first, then reminder, then routine
- Deduplication: the same routine does not appear twice

For `POST /api/routines/:routineId/skip`:
- Happy path: → 200, `occurrence.skipped = true`, `savedRoutine.currentDueDate` advanced
- Spouse role: → 403
- Routine not found: → 404
- Version conflict: → 409
- Paused routine: → 400 or 409 (same handling as complete)

**Evidence required**
- Passing API test output
- Sample `GET /api/nudges` response JSON with three nudge types

---

### Phase 4: PWA client/sync layer

**Outcome:** The PWA can fetch nudges and submit skip-occurrence actions, including offline outbox support for skip.

**Primary files**
- Modify: `apps/pwa/src/lib/api.ts`
- Modify: `apps/pwa/src/lib/sync.ts`

**Work items**

**Add to `apps/pwa/src/lib/api.ts`:**

```typescript
export async function fetchNudgesApi(role: ActorRole): Promise<NudgesResponse> {
  const res = await apiFetch(`/api/nudges?actorRole=${role}`);
  return nudgesResponseSchema.parse(await res.json());
}

export async function skipRoutineOccurrenceApi(
  routineId: string,
  role: ActorRole,
  expectedVersion: number
): Promise<SkipRoutineOccurrenceResponse> {
  const res = await apiFetch(`/api/routines/${routineId}/skip`, {
    method: 'POST',
    body: JSON.stringify({ actorRole: role, routineId, expectedVersion })
  });
  return skipRoutineOccurrenceResponseSchema.parse(await res.json());
}
```

**Add to `apps/pwa/src/lib/sync.ts`:**

```typescript
/**
 * Load nudges from server. Returns empty list if offline or server error.
 * Nudges are not cached — each poll gets a fresh server response.
 */
export async function loadNudges(role: ActorRole): Promise<Nudge[]> {
  if (isOffline()) return [];
  try {
    const { nudges } = await fetchNudgesApi(role);
    return nudges;
  } catch {
    return [];
  }
}

/**
 * Skip the current routine occurrence. Online: calls API directly.
 * Offline: queues a routine_skip outbox command and updates the Dexie cache optimistically.
 */
export async function submitRoutineSkip(
  role: ActorRole,
  routineId: string,
  expectedVersion: number
): Promise<void> {
  if (!isOffline()) {
    const response = await skipRoutineOccurrenceApi(routineId, role, expectedVersion);
    // Refresh routine in cache
    await db.routines.put(response.savedRoutine);
    await db.routineOccurrences.put(response.occurrence);
    return;
  }

  // Offline: optimistic update + outbox
  const routine = await db.routines.get(routineId);
  if (!routine) return;

  const { updatedRoutine, occurrence } = skipRoutineOccurrence(routine, role, new Date());
  await db.routines.put(updatedRoutine);
  await db.routineOccurrences.put(occurrence);

  const command: StoredOutboxCommand = {
    id: randomUUID(),
    kind: 'routine_skip',
    commandId: randomUUID(),
    actorRole: role,
    routineId,
    expectedVersion,
    createdAt: new Date().toISOString(),
    state: 'pending'
  };
  await db.outbox.put(command);
}
```

**Extend outbox flush in `sync.ts` to handle `routine_skip`:**

```typescript
} else if (command.kind === 'routine_skip') {
  const response = await skipRoutineOccurrenceApi(
    command.routineId,
    command.actorRole,
    command.expectedVersion
  );
  await db.routines.put(response.savedRoutine);
  await db.routineOccurrences.put(response.occurrence);
}
```

**Verification**
- Unit test: `loadNudges` when offline returns `[]` without calling the API.
- Unit test: `loadNudges` when API throws returns `[]`.
- Unit test: `submitRoutineSkip` online calls API, updates cache.
- Unit test: `submitRoutineSkip` offline creates outbox entry with `kind: 'routine_skip'`.

**Evidence required**
- Passing unit test output for new sync functions

---

### Phase 5: Dexie dismiss-state model

**Outcome:** The PWA has a `nudgeDismissals` Dexie table (schema v7) with helpers to dismiss nudges and check daily-reset state.

**Primary files**
- Modify: `apps/pwa/src/lib/client-db.ts`

**Work items**

Increment Dexie schema version to 7, adding the `nudgeDismissals` table:

```typescript
type NudgeDismissal = {
  id: string;          // "${entityType}.${entityId}.${dismissedDate}" — primary key
  entityType: string;
  entityId: string;
  dismissedDate: string; // YYYY-MM-DD
};

// In OliviaClientDb:
nudgeDismissals!: Table<NudgeDismissal, string>;
```

In the version migration block:
```typescript
this.version(7).stores({
  // ... all previous tables unchanged ...
  nudgeDismissals: 'id, entityType, entityId, dismissedDate'
});
```

Add dismiss helpers (in `client-db.ts` or `sync.ts` — Founding Engineer judgment on placement):

```typescript
const todayStr = () => format(new Date(), 'yyyy-MM-dd');

export async function dismissNudge(entityType: string, entityId: string): Promise<void> {
  const id = `${entityType}.${entityId}.${todayStr()}`;
  await db.nudgeDismissals.put({ id, entityType, entityId, dismissedDate: todayStr() });
}

export async function isDismissedToday(entityType: string, entityId: string): Promise<boolean> {
  const id = `${entityType}.${entityId}.${todayStr()}`;
  const entry = await db.nudgeDismissals.get(id);
  return !!entry;
}

/**
 * Filter a nudge list against today's dismiss state.
 * Call this after each poll response before rendering.
 */
export async function filterDismissed(nudges: Nudge[]): Promise<Nudge[]> {
  const today = todayStr();
  const dismissed = await db.nudgeDismissals
    .where('dismissedDate')
    .equals(today)
    .toArray();
  const dismissedSet = new Set(dismissed.map(d => `${d.entityType}.${d.entityId}`));
  return nudges.filter(n => !dismissedSet.has(`${n.entityType}.${n.entityId}`));
}

/**
 * Prune stale dismiss entries (older than today).
 * Call on app startup or nudge poll to prevent unbounded growth.
 */
export async function pruneStaleNudgeDismissals(): Promise<void> {
  const today = todayStr();
  await db.nudgeDismissals.where('dismissedDate').below(today).delete();
}
```

**Verification**
- `dismissNudge` + `isDismissedToday` for the same entity on the same day: returns `true`.
- `isDismissedToday` for an entity dismissed yesterday: returns `false` (different `dismissedDate` key).
- `filterDismissed` removes dismissed-today nudges from the list; retains non-dismissed nudges.
- `pruneStaleNudgeDismissals` deletes only entries with `dismissedDate < today`.
- Dexie migration v6→v7 leaves all existing tables intact; `nudgeDismissals` starts empty.

**Evidence required**
- Passing Dexie migration verification
- Passing unit tests for dismiss helpers

---

### Phase 6: Build PWA surface changes

**⚠️ VISUAL SPEC DEPENDENCY:** This phase requires `docs/plans/proactive-household-nudges-visual-implementation-spec.md` (OLI-62). All layout, color, typography, nudge card design, dismiss affordance, and tray placement are specified there. Do not implement Phase 6 until OLI-62 is complete. The structure below is the implementation guide; all visual details must come from the visual spec.

**Outcome:** The PWA has a nudge tray that polls periodically, renders nudge cards with action buttons, handles dismiss, and integrates with existing action endpoints.

**Primary files**
- New: `apps/pwa/src/routes/nudge-tray.tsx` (or inline in `home-page.tsx` — visual spec placement decision)
- Modify: `apps/pwa/src/routes/home-page.tsx` (or other home-adjacent screen — visual spec placement decision)
- Possibly modify: `apps/pwa/src/router.tsx` if a new route is needed

#### 6.1 Polling and nudge state

Use a `useNudges` custom hook (inline or separate file) that:

```typescript
function useNudges(role: ActorRole) {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [loading, setLoading] = useState(false);

  const poll = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await loadNudges(role);
      const filtered = await filterDismissed(raw);
      setNudges(filtered);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    poll(); // immediate on mount

    const intervalId = setInterval(poll, 15 * 60 * 1000); // 15 minutes

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        poll(); // immediate poll on foreground return; interval resets naturally
        clearInterval(intervalId);
        const newInterval = setInterval(poll, 15 * 60 * 1000);
        return newInterval;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [poll]);

  return { nudges, loading, refetch: poll };
}
```

**Note on interval reset:** The visibility handler above needs refinement — the interval returned inside the callback must be tracked in a ref to be cleared on unmount. Founding Engineer: use `useRef` for the interval ID rather than a closure return value.

#### 6.2 Display cap

After dismiss filtering, apply the display cap:

```typescript
const DISPLAY_COUNT = NUDGE_MAX_DISPLAY_COUNT; // 5
const displayedNudges = nudges.slice(0, DISPLAY_COUNT);
const hiddenCount = Math.max(0, nudges.length - DISPLAY_COUNT);
```

Render `displayedNudges` as cards. If `hiddenCount > 0`, render a "+ {hiddenCount} more" indicator (visual spec placement decision).

#### 6.3 Nudge card components

Each nudge card renders based on `entityType`. The visual spec defines exact layout; the structural requirements are:

**Routine nudge card:**
- Entity name (routine title)
- Trigger reason text ("Overdue since Monday")
- Two action buttons: "Mark done" + "Skip"
- Dismiss affordance (swipe or X — visual spec decision)

**Reminder nudge card:**
- Entity name (reminder title)
- Trigger reason text ("Due in 2 hours" / "Overdue since Tuesday")
- Two action buttons: "Done" + "Snooze"
- Dismiss affordance

**Planning ritual nudge card:**
- Entity name (ritual routine title)
- Trigger reason text ("Weekly review overdue")
- One action button: "Start review"
- Dismiss affordance

#### 6.4 Action handlers

```typescript
// Routine: Mark done
async function handleRoutineComplete(nudge: Nudge, routine: Routine) {
  await submitRoutineComplete(role, nudge.entityId, routine.expectedVersion);
  setNudges(prev => prev.filter(n => n.entityId !== nudge.entityId));
  // Background refetch to reconcile server state
  poll();
}

// Routine: Skip
async function handleRoutineSkip(nudge: Nudge, routine: Routine) {
  await submitRoutineSkip(role, nudge.entityId, routine.expectedVersion);
  setNudges(prev => prev.filter(n => n.entityId !== nudge.entityId));
  poll();
}

// Reminder: Done
async function handleReminderComplete(nudge: Nudge, reminder: Reminder) {
  await submitReminderComplete(role, nudge.entityId, reminder.version);
  setNudges(prev => prev.filter(n => n.entityId !== nudge.entityId));
  poll();
}

// Reminder: Snooze
async function handleReminderSnooze(nudge: Nudge, reminder: Reminder) {
  const snoozedUntil = addHours(new Date(), NUDGE_SNOOZE_INTERVAL_HOURS).toISOString();
  await submitReminderSnooze(role, nudge.entityId, reminder.version, snoozedUntil);
  setNudges(prev => prev.filter(n => n.entityId !== nudge.entityId));
  poll();
}

// Planning ritual: Start review
function handleStartReview(nudge: Nudge) {
  // Navigate to the review flow for this overdue ritual occurrence
  // Use TanStack Router navigate to /routines/:id/review/:occurrenceId
  // occurrenceId must be fetched from Dexie routineOccurrences for the matching due date
  navigate({ to: '/routines/$routineId/review/$occurrenceId', params: { routineId: nudge.entityId, occurrenceId: /* ... */ } });
}

// Dismiss (any type)
async function handleDismiss(nudge: Nudge) {
  await dismissNudge(nudge.entityType, nudge.entityId);
  setNudges(prev => prev.filter(n => n.entityId !== nudge.entityId || n.entityType !== nudge.entityType));
  // No poll needed — dismiss is client-only; no record changed
}
```

**Note on "Start review" navigation:** The review flow route is `/routines/:routineId/review/:occurrenceId`. The nudge payload contains `entityId` (the `routineId`). To get the `occurrenceId`, look up the routine occurrence in `db.routineOccurrences` where `routineId = entityId` and `dueDate = currentDueDate` (from the routine cache). If no occurrence row exists yet for this due date, the review flow may need to handle occurrence creation on entry (check `ReviewFlowPage` behavior for pre-flight occurrence state).

**Verification**
- Nudge tray appears when `loadNudges` returns non-empty results.
- Nudge tray is absent when `loadNudges` returns an empty array.
- "Mark done" tap removes the nudge from tray and calls the complete endpoint.
- "Skip" tap removes the nudge from tray and calls the skip endpoint.
- "Done" tap removes the nudge from tray and calls the reminder complete endpoint.
- "Snooze" tap removes the nudge from tray and calls snooze with `snoozedUntil = now + 1 hour`.
- "Start review" tap navigates to the review flow.
- Dismiss tap removes nudge from tray; dismissed nudge does not reappear within the same calendar day.
- Dismiss tap does not call any server endpoint.
- At most 5 nudges are shown; if 6+ are active, "+ N more" indicator appears.
- Polling pauses when app goes to background; resumes with an immediate poll on foreground return.
- App remains fully functional when offline (empty tray, no errors).

**Evidence required**
- Manual QA checklist confirming all 18 acceptance criteria from the feature spec
- Nudge tray renders correctly on mobile screen sizes

---

### Phase 7: Verification, documentation sync, and milestone evidence

**Outcome:** Proactive household nudges are verifiable end-to-end. All 18 acceptance criteria from the feature spec are met. M18 milestone gate readiness can be assessed.

**Primary files**
- Modify as needed: all test files touched in prior phases
- Modify: `docs/roadmap/milestones.md` (M18 progress notes → completion candidate)
- Modify: `docs/learnings/decision-history.md` if new durable decisions were made
- Modify: `docs/learnings/learnings-log.md` with H5 Phase 2 build outcomes

**Work items**

Run targeted automated suites:
- `packages/domain` — skip occurrence + sort tests passing
- `packages/contracts` — nudge schemas, skip schemas, outbox union all parse correctly
- `apps/api/test` — nudge endpoint, skip endpoint, threshold boundary tests
- `apps/pwa/src/lib` — offline nudge load, outbox skip, dismiss state helpers
- Full regression: all prior tests continue to pass

Execute manual acceptance criteria checklist against `docs/specs/proactive-household-nudges.md`:

1. ✓ `GET /api/nudges` returns active nudge payloads for overdue routine occurrences, approaching reminder deadlines, and overdue planning ritual occurrences, computed from existing entity state.
2. ✓ The API returns an empty list when no items meet the nudge trigger conditions.
3. ✓ The PWA polls `GET /api/nudges` periodically while the app is in the foreground and displays nudge cards for active nudges.
4. ✓ Each routine nudge displays the routine name, triggering condition, and two action buttons: "Mark done" and "Skip."
5. ✓ Each reminder nudge displays the reminder title, triggering condition, and two action buttons: "Done" and "Snooze."
6. ✓ Each planning ritual nudge displays the ritual name, triggering condition, and one action button: "Start review."
7. ✓ Tapping "Mark done" on a routine nudge completes the occurrence and removes the nudge from the tray.
8. ✓ Tapping "Skip" on a routine nudge skips the occurrence and removes the nudge from the tray.
9. ✓ Tapping "Done" on a reminder nudge resolves the reminder and removes the nudge from the tray.
10. ✓ Tapping "Snooze" on a reminder nudge advances the reminder `dueDate` by the configured snooze interval (1 hour) and removes the nudge from the tray.
11. ✓ Tapping "Start review" on a planning ritual nudge opens the review flow for the overdue ritual occurrence.
12. ✓ The household member can dismiss any nudge without taking action; the dismissed nudge does not reappear for the same item for the rest of that calendar day.
13. ✓ Dismissed nudge state is stored client-locally in Dexie; it is not sent to the server.
14. ✓ At most one nudge is shown per (entityType, entityId) pair in the nudge tray at any time.
15. ✓ Nudges are displayed in priority order: planning ritual overdue first, then reminder approaching or overdue, then routine overdue; within each tier, oldest overdue first.
16. ✓ If the device is offline, the nudge endpoint is not polled; the app remains fully functional with no nudge-related errors.
17. ✓ No record changes execute without an explicit user action tap.
18. ✓ Nudges do not appear for items that are already completed, resolved, or skipped.

Review deferred boundaries — confirm not quietly implemented:
- No push notifications
- No nudge preference settings
- No snooze for planning ritual nudges
- No AI involvement in nudge logic or timing
- No cross-device dismiss sync
- No nudge history or notification audit log

If implementation surfaces new durable decisions, document in `docs/learnings/decision-history.md`.

**Evidence required**
- Passing targeted automated suite output
- Manual QA checklist confirming all 18 acceptance criteria
- `docs/roadmap/milestones.md` M18 progress note updated

---

## Verification Matrix

### Contracts and domain
- `nudgeSchema` parses all three entity types without error.
- `nudgesResponseSchema` with empty `nudges` array parses without error.
- `routine_skip` outbox command discriminates correctly from the union.
- `sortNudgesByPriority` returns `planningRitual < reminder < routine`; oldest first within tier.
- `skipRoutineOccurrence` creates an occurrence with `skipped: true`; advances `currentDueDate` schedule-anchored.
- `skipRoutineOccurrence` throws on paused or archived routine.

### API
- `GET /api/nudges` returns the correct nudge payloads for each trigger condition in isolation.
- `GET /api/nudges` approaching threshold: 23-hour reminder triggers nudge; 25-hour reminder does not.
- `GET /api/nudges` deduplication: each `entityId` appears at most once.
- `GET /api/nudges` priority ordering confirmed by test with mixed entity types.
- `POST /api/routines/:routineId/skip` advances `currentDueDate`, sets `skipped: true`, returns 200.
- `POST /api/routines/:routineId/skip` blocks spouse role (403), respects version conflicts (409).

### PWA and dismiss state
- `loadNudges` returns `[]` when offline; does not call the API.
- `submitRoutineSkip` online calls API, updates Dexie cache.
- `submitRoutineSkip` offline creates a `routine_skip` outbox entry; outbox flush sends the skip to the server.
- `filterDismissed` removes nudges dismissed today; retains nudges dismissed yesterday (stale entry).
- `pruneStaleNudgeDismissals` deletes entries with `dismissedDate < today`.
- Display cap: 7 active nudges → 5 shown + "+ 2 more" indicator.
- Nudge removal on action: optimistic removal from rendered list; background refetch reconciles server state.

### Scope control
- No new server-side tables — `GET /api/nudges` is purely computed.
- All action endpoints are existing endpoints except `POST /api/routines/:routineId/skip` (new, built in Phase 3).
- `NUDGE_APPROACHING_THRESHOLD_HOURS`, `NUDGE_SNOOZE_INTERVAL_HOURS`, and `NUDGE_MAX_DISPLAY_COUNT` exported from contracts; used in both API and PWA without duplication.

---

## Risks / Open Questions

### 1. "Start review" navigation needs occurrenceId resolution

The nudge payload contains `entityId = routineId` but the review flow route requires both `routineId` and `occurrenceId`. The PWA must look up the current occurrence in Dexie (`routineOccurrences` where `routineId = entityId AND dueDate = routine.currentDueDate`). If no occurrence row exists (the ritual has never been touched since the routine was created and no completion has happened), the occurrence may not be in the Dexie cache yet. Confirm the behavior of `ReviewFlowPage` when loaded without a pre-existing occurrence row — it may need to create a placeholder or the API may handle occurrence creation on review-flow entry.

### 2. Reminder snooze uses `snoozedUntil` — confirm `POST /api/reminders/snooze` body shape

The existing `POST /api/reminders/snooze` endpoint takes `{ actorRole, reminderId, expectedVersion, snoozedUntil }` (ISO datetime). The nudge snooze handler computes `snoozedUntil = addHours(new Date(), 1).toISOString()`. Confirm the existing endpoint does not also advance by a fixed internal constant (it should use `snoozedUntil` from the body as-is, per the snooze reminder schema). If the endpoint recomputes the snooze interval server-side, the client's `snoozedUntil` must be adjusted.

### 3. Performance of `GET /api/nudges` without additional indexes

The nudge query joins `routines` (for `currentDueDate < today`) and `routine_occurrences` (for NOT EXISTS). Depending on table sizes, this may be slow without an index on `routine_occurrences(routine_id, due_date)`. Profile at implementation time; add a targeted index if the query plan is inefficient.

### 4. Skip outbox conflict handling

The outbox flush sends `expectedVersion` from when the skip was queued offline. If another device has since advanced the routine version, the flush will get a 409 conflict. The existing outbox conflict model marks the command as `state: 'conflict'`. The nudge tray may need to handle the case where an optimistic skip is later revealed to have conflicted — the routine will still show as "skipped" locally until the next sync. This is an acceptable Phase 1 gap (same as other optimistic offline actions).

### 5. Visibility API interval reset on mobile

The Page Visibility API on mobile browsers fires on app backgrounding and tab switching. The interval management (clear + restart) must be tested on mobile to confirm the timer resets correctly. Some PWA environments on iOS may not fire `visibilitychange` reliably. A fallback: poll immediately on the next user interaction (e.g., a pointer event) if the interval is suspected to have missed a background transition.
