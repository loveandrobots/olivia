# Data Freshness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend Olivia's staleness detection to all five workflow types, add a monthly household health check surface, and introduce freshness nudges — so household data stays accurate over weeks and months without overburdening the user.

**Architecture:** Extend the existing nudge infrastructure (`GET /api/nudges`, nudge tray, client-local dismiss) with a new `freshness` nudge type and a new health check surface. Add `freshnessCheckedAt` columns to all five entity tables. Staleness is computed server-side with rule-based thresholds. Health check state uses a lightweight `household_freshness` table for cross-restart persistence; session progress lives in Dexie (consistent with dismiss pattern).

**Tech Stack:** TypeScript, Zod, Fastify, better-sqlite3, Drizzle schema definitions, React, TanStack Router, TanStack Query, Dexie.

---

## Summary

This plan implements Phase 2 Data Freshness per the approved spec (`docs/specs/data-freshness.md`, D-058). The build sequence follows four phases:

1. **Schema & Domain** — migration, Drizzle schema, domain staleness functions, contracts
2. **API** — freshness nudge generation in `GET /api/nudges`, `POST /api/freshness/confirm` and `POST /api/freshness/archive` endpoints, `GET /api/freshness/stale-items` for health check, health check state endpoints
3. **PWA Freshness Nudges** — extend nudge tray with freshness card type, "Still active" / "Archive" actions, 2/day client-local throttle
4. **PWA Health Check** — home screen card, health check review screen, partial progress, completion state

Planning readiness is satisfied:
- `docs/specs/data-freshness.md` is approved (D-058)
- Phase 1 onboarding shipped (D-057)
- Existing nudge infrastructure (M19) provides the extension point
- Existing push infrastructure (M24) — freshness nudges excluded from push per spec

## Source Artifacts
- `docs/specs/data-freshness.md`
- `docs/roadmap/milestones.md`
- `docs/learnings/decision-history.md` (D-055, D-056, D-057, D-058)
- `packages/contracts/src/index.ts` — nudge schemas
- `packages/domain/src/index.ts` — `sortNudgesByPriority`, `computeFlags`
- `apps/api/src/repository.ts` — `getNudgePayloads`
- `apps/pwa/src/routes/nudge-tray.tsx` — nudge UI
- `apps/pwa/src/routes/home-page.tsx` — home screen cards
- `apps/pwa/src/lib/client-db.ts` — dismiss behavior

## Engineering Decisions (Resolving Open Questions)

### Q1: `freshnessCheckedAt` storage
**Decision:** New nullable column on each entity table (inbox_items, routines, reminders, shared_lists, meal_plans).
**Rationale:** Consistent with existing `lastStatusChangedAt` pattern on inbox items. Avoids joins. Each table already has its own staleness-relevant timestamps. A separate `freshness_checks` table adds query complexity for no meaningful gain — freshness is always checked per-entity.

### Q2: Health check state storage
**Decision:** Server-side `household_freshness` table for `lastHealthCheckCompletedAt` and `lastHealthCheckDismissedAt`. Client-side Dexie for health check session progress (which items have been reviewed in the current session).
**Rationale:** `lastHealthCheckCompletedAt` must survive app reinstalls and device changes — server-side. Session progress is ephemeral and device-local (spec explicitly says "local client state"). This mirrors the nudge dismiss pattern (Dexie) for session state.

### Q3: Staleness computation location
**Decision:** Extend `GET /api/nudges` to include freshness nudges. Add a separate `GET /api/freshness/stale-items` endpoint for the health check screen.
**Rationale:** Freshness nudges are nudges — they belong in the nudge response with their own priority tier. The health check needs all stale items (up to 10), which is a different query with different caps and no daily throttle. A separate endpoint keeps concerns clean.

## Assumptions And Non-Goals

### Assumptions
- The existing nudge tray, home screen, and repository patterns are the base to extend.
- `freshnessCheckedAt` column approach won't cause performance issues — entity counts are household-scale (hundreds, not millions).
- The 2/day freshness nudge throttle can be enforced client-side via Dexie (consistent with existing dismiss pattern), with server providing all eligible nudges.
- No visual spec yet — UI will use existing card patterns (nudge cards, home screen cards). Visual spec from Designer will refine styling in a follow-up.

### Non-Goals
- Adaptive health check frequency (deferred per spec)
- AI-generated health check summaries
- Push notifications for freshness nudges
- Per-member freshness preferences
- Undo for archive actions
- Integration with planning ritual review flow

## Shared Infrastructure Introduced Now Vs Deferred

### Introduce now
- `freshnessCheckedAt` column on all five entity tables
- `household_freshness` table (health check state)
- Freshness staleness computation functions in `packages/domain`
- Freshness nudge type in `packages/contracts`
- `GET /api/freshness/stale-items` endpoint
- `POST /api/freshness/confirm` endpoint (resets freshnessCheckedAt)
- `POST /api/freshness/archive` endpoint (type-appropriate archive)
- `GET /api/freshness/health-check-state` and `POST /api/freshness/health-check-complete` endpoints
- Health check Dexie table for session progress
- Freshness nudge card component
- Health check card on home screen
- Health check review screen

### Explicitly defer
- Push notification integration for freshness nudges
- Adaptive frequency logic
- AI-assisted health check
- Planning ritual integration
- Archive undo

## Data Model

### New Column: `freshnessCheckedAt` (all five entity tables)
```sql
ALTER TABLE inbox_items ADD COLUMN freshness_checked_at TEXT;
ALTER TABLE routines ADD COLUMN freshness_checked_at TEXT;
ALTER TABLE reminders ADD COLUMN freshness_checked_at TEXT;
ALTER TABLE shared_lists ADD COLUMN freshness_checked_at TEXT;
ALTER TABLE meal_plans ADD COLUMN freshness_checked_at TEXT;
```

### New Table: `household_freshness`
```sql
CREATE TABLE IF NOT EXISTS household_freshness (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'singleton',
  last_health_check_completed_at TEXT,
  last_health_check_dismissed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### New Dexie Table: `healthCheckProgress`
```typescript
type HealthCheckProgress = {
  id: 'current'; // singleton
  reviewedItemIds: string[]; // entity IDs reviewed this session
  startedAt: string; // ISO datetime
};
```

## Staleness Rules (Domain Functions)

Each function returns whether an entity is stale and the relevant activity timestamp:

| Entity | Function | Logic |
|---|---|---|
| Inbox item | `isInboxItemStale(item, now)` | Existing: `lastStatusChangedAt` > 14 days, status active. New: check `freshnessCheckedAt` first. |
| Routine | `isRoutineStale(routine, lastOccurrence, now)` | Active routine where last completed occurrence > 2× `intervalDays`. Check `freshnessCheckedAt` first. |
| Reminder | `isReminderStale(reminder, now)` | Pending reminder where `scheduledAt` > 7 days past. Check `freshnessCheckedAt` first. |
| Shared list | `isSharedListStale(list, lastModification, now)` | Active list, has unchecked items, no modification > 30 days. Check `freshnessCheckedAt` first. |
| Meal plan | `isMealPlanStale(currentWeekHasEntries, hasPriorUsage)` | No current week entries AND prior usage exists. Health-check-only (no nudge). |

The `freshnessCheckedAt` check pattern for all types:
```
if (freshnessCheckedAt !== null) {
  use freshnessCheckedAt as the reference timestamp
} else {
  fall back to type-specific activity timestamp
}
```

## API Routes

### Extended: `GET /api/nudges`
Adds freshness nudges to the existing response. The server computes all eligible freshness nudges alongside existing nudge types. Freshness nudges use `entityType: 'freshness'` and include an `entitySubType` field to indicate the workflow type ('inbox', 'routine', 'reminder', 'list').

No meal plan freshness nudges (health-check-only per D-058).

### New: `GET /api/freshness/stale-items`
Returns up to 10 stale items across all five workflow types, ordered oldest-first, grouped by type. Used by the health check screen.

Response:
```typescript
{
  items: Array<{
    entityType: 'inbox' | 'routine' | 'reminder' | 'list' | 'mealPlan';
    entityId: string;
    entityName: string;
    lastActivityAt: string; // ISO datetime
    lastActivityDescription: string; // e.g., "Last completed 3 weeks ago"
  }>;
  totalStaleCount: number; // total stale items (may exceed 10)
}
```

### New: `POST /api/freshness/confirm`
Resets `freshnessCheckedAt` on a specific entity.

Request: `{ entityType, entityId, actorRole, expectedVersion }`
Response: `{ newVersion }`

### New: `POST /api/freshness/archive`
Archives a specific entity using the type-appropriate mechanism.

Request: `{ entityType, entityId, actorRole, expectedVersion }`
Response: `{ newVersion }`

Archive actions per type:
- Inbox: `status → 'resolved'`, set `archivedAt`
- Routine: `status → 'paused'`, set `archivedAt`
- Reminder: set `cancelledAt`
- Shared list: `status → 'archived'`, set `archivedAt`
- Meal plan: no archive action (weekly and ephemeral)

### New: `GET /api/freshness/health-check-state`
Returns health check timing state.

Response: `{ lastCompletedAt: string | null, lastDismissedAt: string | null, shouldShow: boolean }`

`shouldShow` = true when ≥30 days since `lastCompletedAt` (or since first app use if null) AND not dismissed today.

### New: `POST /api/freshness/health-check-complete`
Marks health check as completed.

### New: `POST /api/freshness/health-check-dismiss`
Marks health check as dismissed. Won't reappear until next 30-day cycle.

## Contract Changes

### Nudge schema extension
```typescript
// Extend entity type enum
export const nudgeEntityTypeSchema = z.enum(['routine', 'reminder', 'planningRitual', 'freshness']);

// Add optional subtype for freshness nudges
export const nudgeSchema = z.object({
  entityType: nudgeEntityTypeSchema,
  entityId: z.string().uuid(),
  entityName: z.string(),
  triggerReason: z.string(),
  overdueSince: z.string().nullable(),
  dueAt: z.string().datetime().nullable(),
  entitySubType: z.string().optional(), // 'inbox' | 'routine' | 'reminder' | 'list' — for freshness nudges
});

// New constants
export const FRESHNESS_NUDGE_MAX_PER_DAY = 2;
```

### New schemas
```typescript
// Freshness stale items response
export const staleItemSchema = z.object({
  entityType: z.enum(['inbox', 'routine', 'reminder', 'list', 'mealPlan']),
  entityId: z.string().uuid(),
  entityName: z.string(),
  lastActivityAt: z.string().datetime(),
  lastActivityDescription: z.string(),
});

export const staleItemsResponseSchema = z.object({
  items: z.array(staleItemSchema),
  totalStaleCount: z.number().int().nonneg(),
});

// Freshness confirm/archive requests
export const freshnessConfirmRequestSchema = z.object({
  entityType: z.enum(['inbox', 'routine', 'reminder', 'list', 'mealPlan']),
  entityId: z.string().uuid(),
  actorRole: actorRoleSchema,
  expectedVersion: z.number().int().positive(),
});

export const freshnessArchiveRequestSchema = z.object({
  entityType: z.enum(['inbox', 'routine', 'reminder', 'list']), // no meal plan archive
  entityId: z.string().uuid(),
  actorRole: actorRoleSchema,
  expectedVersion: z.number().int().positive(),
});

// Health check state
export const healthCheckStateSchema = z.object({
  lastCompletedAt: z.string().datetime().nullable(),
  lastDismissedAt: z.string().datetime().nullable(),
  shouldShow: z.boolean(),
});
```

## PWA Surfaces

### Nudge Tray Extension
Extend `NudgeCard` in `nudge-tray.tsx` with a new freshness card variant:
- Amber/gold accent stripe (distinct from mint/rose/violet)
- Icon: ⏰ or Phosphor `ClockCountdown`
- Copy: contextual per `entitySubType` (routine: "hasn't been marked done in X", reminder: "was due X ago", list: "hasn't been updated in X")
- Actions: "Still active" (primary) / "Archive" (secondary)
- "Still active" calls `POST /api/freshness/confirm` → removes nudge
- "Archive" shows confirmation dialog → calls `POST /api/freshness/archive` → removes nudge

Client-side 2/day throttle: Dexie table `freshnessNudgeShown` tracks how many freshness nudges have been shown today. After 2, remaining freshness nudges are filtered out.

### Home Screen Health Check Card
New conditional card on `home-page.tsx`:
- Appears when `GET /api/freshness/health-check-state` returns `shouldShow: true`
- Position: below nudge tray, above Today section
- Copy: "Monthly check-up — want to make sure everything's still accurate?"
- Tap → navigates to `/health-check`
- Dismiss button (×) → calls `POST /api/freshness/health-check-dismiss`
- If partial progress exists: "N items left to review"

### Health Check Screen (new route: `/health-check`)
New page at `apps/pwa/src/routes/health-check-page.tsx`:
- Header: "Health check" with back button
- Items grouped by workflow type (sections)
- Each item card shows: title, type indicator, last activity description
- Three actions per item: "Still active" / "Archive" / "Update"
- "Still active" → single tap, calls confirm API, removes from list, saves progress to Dexie
- "Archive" → confirmation dialog → calls archive API, removes from list
- "Update" → navigates to entity edit screen; on return, item removed
- When all reviewed: "All caught up!" celebration state
- Completion → calls `POST /api/freshness/health-check-complete`, navigates home
- Overflow: "and N more — we'll catch those next time" if totalStaleCount > 10

## Implementation Sequence

### Phase 1: Schema & Domain (backend foundation)

**Task 1.1: Database migration — add `freshnessCheckedAt` and `household_freshness`**
- Create `apps/api/drizzle/0010_data_freshness.sql`
- ALTER TABLE for all five entity tables: add `freshness_checked_at TEXT` column
- CREATE TABLE `household_freshness` with singleton row pattern
- Update Drizzle schema in `apps/api/src/db/schema.ts` to include new columns/table

Acceptance criteria:
- Migration runs without errors
- All five entity tables have the new nullable column
- `household_freshness` table created with correct schema
- Drizzle schema matches migration

**Task 1.2: Domain staleness functions**
- Add to `packages/domain/src/index.ts`:
  - `isInboxItemStale(item, now)` — refactor existing `computeFlags` staleness to use `freshnessCheckedAt`
  - `isRoutineStale(routine, lastCompletedOccurrence, now)` — 2× interval rule
  - `isReminderStale(reminder, now)` — 7 days past `scheduledAt`, still pending
  - `isSharedListStale(list, lastModificationDate, hasUncheckedItems, now)` — 30 days
  - `isMealPlanStale(currentWeekHasEntries, hasPriorUsage)` — boolean check
  - `computeLastActivityDescription(entityType, lastActivityAt, now)` — human-readable relative time
  - `generateFreshnessNudgeCopy(entityType, entityName, lastActivityAt, now)` — contextual nudge text

Acceptance criteria:
- All five staleness functions correctly implement threshold rules from spec
- All functions check `freshnessCheckedAt` first, fall back to type-specific timestamp
- Unit tests cover all threshold boundaries and edge cases

**Task 1.3: Contract schemas**
- Extend `nudgeEntityTypeSchema` to include `'freshness'`
- Add `entitySubType` optional field to `nudgeSchema`
- Add `FRESHNESS_NUDGE_MAX_PER_DAY = 2` constant
- Add stale items response schema, confirm/archive request schemas, health check state schema

Acceptance criteria:
- All new schemas parse correctly
- Existing nudge schema backward-compatible (entitySubType is optional)
- Types exported and available to API and PWA

### Phase 2: API (server endpoints)

**Task 2.1: Repository — staleness queries**
- Add to `apps/api/src/repository.ts`:
  - `getStaleItems(now, limit)` — queries all five entity types for stale items, returns unified list
  - `confirmFreshness(entityType, entityId, now)` — updates `freshnessCheckedAt` on the entity
  - `archiveEntity(entityType, entityId)` — type-appropriate archive action
  - `getHealthCheckState()` / `completeHealthCheck(now)` / `dismissHealthCheck(now)` — household_freshness CRUD

Acceptance criteria:
- `getStaleItems` returns items sorted oldest-first, respects per-type rules
- `confirmFreshness` updates only `freshnessCheckedAt` and `version`, nothing else
- `archiveEntity` applies correct action per type (resolved/paused/cancelled/archived)
- Health check state queries work correctly

**Task 2.2: Extend `GET /api/nudges` with freshness nudges**
- Extend `getNudgePayloads` in repository to call staleness queries for routines, reminders, lists, inbox items (NOT meal plans)
- Return freshness nudges with `entityType: 'freshness'` and appropriate `entitySubType`
- Generate contextual `triggerReason` copy per type

Acceptance criteria:
- Freshness nudges appear in `GET /api/nudges` response
- Freshness nudges excluded for meal plans
- Priority sorting places freshness below all existing types
- Existing nudge behavior unchanged

**Task 2.3: New freshness API routes**
- `GET /api/freshness/stale-items` — calls `getStaleItems(now, 10)`, returns `staleItemsResponseSchema`
- `POST /api/freshness/confirm` — validates request, calls `confirmFreshness`, returns new version
- `POST /api/freshness/archive` — validates request + role check, calls `archiveEntity`, returns new version
- `GET /api/freshness/health-check-state` — returns health check timing
- `POST /api/freshness/health-check-complete` — marks completed
- `POST /api/freshness/health-check-dismiss` — marks dismissed
- Spouse role: read-only for stale items and health check state; confirm and archive blocked

Acceptance criteria:
- All endpoints return correct schemas
- Confirm updates only `freshnessCheckedAt`
- Archive applies correct type-specific action
- Spouse blocked from mutating endpoints
- Health check state correctly computes `shouldShow`

### Phase 3: PWA Freshness Nudges

**Task 3.1: Extend nudge tray with freshness cards**
- Add freshness card variant to `NudgeCard` in `nudge-tray.tsx`
- Amber/gold accent, contextual copy from `triggerReason`
- "Still active" action → `POST /api/freshness/confirm`
- "Archive" action → confirmation dialog → `POST /api/freshness/archive`
- Query invalidation after actions

Acceptance criteria:
- Freshness nudge cards render correctly with distinct styling
- "Still active" is single-tap, no confirmation
- "Archive" shows confirmation dialog
- Actions remove the nudge from the tray
- Dismiss works same as existing nudges (client-local, rest of day)

**Task 3.2: Client-side freshness nudge throttle (2/day)**
- Add `freshnessNudgesShown` Dexie table to `client-db.ts`
- In `useNudges` hook, filter freshness nudges to max 2 per day
- Track which freshness nudges have been shown today
- Auto-reset at midnight (same pattern as dismiss)

Acceptance criteria:
- Maximum 2 freshness nudges shown per calendar day
- Throttle resets daily
- Non-freshness nudges unaffected
- Freshness nudges beyond the cap queue for next day

### Phase 4: PWA Health Check

**Task 4.1: Health check card on home screen**
- Add conditional card to `home-page.tsx`
- Query `GET /api/freshness/health-check-state` (polled with weekly view)
- Show card when `shouldShow: true`
- Dismiss button calls `POST /api/freshness/health-check-dismiss`
- If Dexie has partial progress, show "N items left to review"
- Tap navigates to `/health-check`

Acceptance criteria:
- Card appears when ≥30 days since last completed check
- Card disappears after dismiss or completion
- Partial progress count shown correctly
- Card positioned below nudge tray, above Today section

**Task 4.2: Health check review screen**
- Create `apps/pwa/src/routes/health-check-page.tsx`
- Register route at `/health-check` in router
- Fetch stale items from `GET /api/freshness/stale-items`
- Group items by entity type with section headers
- Each item: title, type indicator, last activity description
- Actions: "Still active" / "Archive" / "Update"
- "Still active" → confirm API → remove from list → save to Dexie progress
- "Archive" → confirmation dialog → archive API → remove from list
- "Update" → navigate to edit screen
- Overflow note: "and N more — we'll catch those next time"
- Completion: "All caught up!" state → complete API → navigate home

Acceptance criteria:
- Screen shows up to 10 stale items grouped by type
- All three actions work correctly
- Partial progress persists in Dexie across app restarts
- Completion triggers celebration state and hides home card
- Overflow count displays when totalStaleCount > 10

**Task 4.3: Dexie schema update for health check progress**
- Add `healthCheckProgress` table to Dexie schema in `client-db.ts`
- CRUD functions: `saveHealthCheckProgress`, `getHealthCheckProgress`, `clearHealthCheckProgress`

Acceptance criteria:
- Progress saved with reviewed item IDs
- Progress survives app restart
- Cleared on health check completion

### Phase 5: Testing & Integration

**Task 5.1: Domain unit tests**
- Test all five `isXStale` functions with boundary cases
- Test `freshnessCheckedAt` override behavior
- Test `computeLastActivityDescription` formatting
- Test `generateFreshnessNudgeCopy` per type
- Test `sortNudgesByPriority` with freshness tier

Acceptance criteria:
- All staleness thresholds tested at boundary (threshold - 1 day, threshold, threshold + 1 day)
- `freshnessCheckedAt` correctly overrides type-specific timestamps
- Nudge priority: planningRitual > reminder > routine > freshness

**Task 5.2: API integration tests**
- Test `GET /api/nudges` includes freshness nudges when items are stale
- Test `GET /api/nudges` excludes meal plan freshness nudges
- Test `GET /api/freshness/stale-items` returns correct items with cap
- Test `POST /api/freshness/confirm` resets `freshnessCheckedAt` only
- Test `POST /api/freshness/archive` applies correct type-specific action
- Test health check state lifecycle (show → dismiss → re-show after 30 days)
- Test spouse role restrictions

Acceptance criteria:
- All endpoints tested with valid and invalid inputs
- Staleness rules validated end-to-end through API
- Role restrictions enforced

## Verification Checklist

After implementation:
- [ ] Migration runs cleanly on existing database
- [ ] All existing tests still pass (no regression)
- [ ] Freshness nudges appear in nudge tray for stale items
- [ ] "Still active" resets freshness clock with single tap
- [ ] "Archive" shows confirmation before archiving
- [ ] Max 2 freshness nudges per day
- [ ] Health check card appears on home screen after 30 days
- [ ] Health check screen shows max 10 items grouped by type
- [ ] Partial health check progress persists
- [ ] Completion removes card and shows celebration
- [ ] Meal plans: health-check-only, no nudges
- [ ] Spouse: read-only access
- [ ] No push notifications for freshness nudges
