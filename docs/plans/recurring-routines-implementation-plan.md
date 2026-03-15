# Recurring Routines Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add recurring routines to Olivia as the third Horizon 3 workflow, extending the existing modular monolith with routine and occurrence domain objects, persistence, API routes, offline-tolerant PWA sync, and mobile-first routine surfaces. Routines repeat on a defined cadence, track per-cycle completion history, and reset automatically after each completion. Spouse access is read-only. No AI dependency in Phase 1.

**Architecture:** Implement recurring routines as a sibling workflow to inbox items, first-class reminders, and shared lists inside the existing TypeScript modular monolith. Reuse the current contracts/domain/API/PWA seams, immediate execution for non-destructive direct user actions, confirmation for all destructive and state-administrative actions, SQLite canonical persistence, Dexie offline cache and outbox, and versioned command concurrency semantics. Extend the recurrence primitives already established in the reminders domain layer rather than building a new scheduling engine.

**Tech Stack:** TypeScript, Zod, date-fns, Fastify, better-sqlite3, Drizzle schema definitions, React, TanStack Router, TanStack Query, Dexie.

---

## Summary

This plan turns the approved recurring routines spec into an execution-ready build sequence without reopening product strategy. The recurring routines workflow extends Olivia's working implementation alongside inbox items, first-class reminders, and shared lists:

- routines are first-class records with a title, owner, recurrence rule, and current due date
- routine occurrence records (completion events) are child records with their own persistence table — they are not stored in-line on the routine row
- due-state is computed from the current due date and completion state, never stored as a canonical field
- completion is immediate for user-initiated actions; no confirmation required
- pausing, archiving, and deleting are administrative or destructive and always require confirmation
- spouse access is read-only with a per-screen banner; write controls are not shown
- no AI dependency in the first implementation slice
- advisory-only trust rules remain in force
- no push notifications in Phase 1; due-state surfacing in the view is primary

Planning readiness is satisfied:

- `docs/specs/recurring-routines.md` is approved
- `docs/roadmap/milestones.md` tracks M6 as in-progress with recurring routines as the next implementation target
- `docs/learnings/decision-history.md` records D-017, which confirms recurring routines is the next Horizon 3 spec target
- `docs/specs/recurring-routines.md` explicitly states there are no blocking product questions for the first implementation slice

## Architecture Decisions Resolved In This Plan

The spec deferred two architecture decisions to the Founding Engineer. This plan documents the chosen approach for each so implementation does not require a product escalation.

### Decision A: Recurrence rule changes mid-cycle

**Chosen approach:** When a routine's recurrence rule is edited mid-cycle, the next due date recalculates from the **current cycle's original start date**, not from the day of the edit.

**Rationale:** This produces deterministic, predictable behavior that is visible to the user immediately after the edit. If a monthly bill routine was due on the 1st and the user edits it to bi-monthly on the 15th, the next occurrence is the 1st + 2 months — not the 15th + 2 months. This matches the spec's explicit mitigation for Risk 4 and is consistent with the reminder recurrence model, which anchors to the prior scheduled occurrence rather than "now plus cadence."

### Decision B: Completing an overdue routine — schedule-anchored vs. completion-anchored

**Chosen approach:** Completing an overdue routine advances the next occurrence from the **original due date** (schedule-anchored), not from the completion timestamp.

**Rationale:** Schedule-anchored behavior is more predictable for obligation-type routines like bills, where missing the payment date and then catching up should not shift the entire future payment schedule into the future. It also aligns with the reminder spec's next-occurrence calculation, which is anchored to the prior scheduled occurrence. For chore-type routines where the exact cadence matters less, this may feel slightly rigid, but it produces a consistent mental model across all routine types. If household use proves this is wrong for certain cases, a per-routine "completion-anchored" setting can be introduced as a targeted spec amendment without redesigning the default behavior.

## Source Artifacts
- `docs/specs/recurring-routines.md`
- `docs/specs/first-class-reminders.md`
- `docs/specs/shared-lists.md`
- `docs/roadmap/milestones.md`
- `docs/strategy/system-architecture.md`
- `docs/learnings/decision-history.md`
- `docs/learnings/assumptions-log.md`

Relevant durable guidance carried into this plan:

- `D-002`: advisory-only trust model remains active
- `D-004`: primary-operator model remains active; spouse write parity is deferred
- `D-007`: installable mobile-first PWA remains the canonical near-term surface
- `D-008`: local-first modular monolith with SQLite canonical storage and Dexie client cache/outbox
- `D-010`: non-destructive user-initiated writes execute immediately; agentic writes require confirmation; destructive and state-administrative writes always require confirmation regardless of initiator
- `D-011`: Horizon 2 is complete; Horizon 3 coordination layer is active
- `D-017`: recurring routines is the confirmed next Horizon 3 spec target after shared lists
- `A-006`: versioned command sync is sufficient for household-level routine concurrency
- `A-008`: the recurrence primitives from the reminders spec can be shared or extended for routines without each workflow building its own scheduling model

## Assumptions And Non-Goals

### Assumptions
- The current codebase with working inbox, first-class reminders, and shared lists is the base to extend.
- Routine occurrence records need a separate persistence table from routine records, to preserve the full completion history without bloating the routine row.
- Due-state (`upcoming`, `due`, `overdue`, `completed`, `paused`) is derived at read time from the routine's current due date, completion state, and status — it is never stored as a canonical column.
- The recurrence helpers introduced for reminders (`daily`, `weekly`, `monthly`) can be reused and extended with `every_n_days` without rebuilding the scheduling model.
- Routine completion and schedule advancement can continue to use versioned command semantics without stronger conflict machinery.
- The offline outbox and sync plumbing used by reminders and lists can be reused for routine commands with minimal adaptation.
- Spouse read-only enforcement follows the same role-check pattern already used in reminder and list routes.

### Non-Goals
- Spouse write access to routines or completion marking
- Weekday-specific recurrence such as "every Monday and Thursday"
- Exception dates, skip-this-week logic, or catch-up behavior for missed cycles
- Calendar sync or external integration
- Push notifications for routine due states
- Sub-tasks per routine occurrence
- Routine categories, tags, or groupings
- Routine templates for common household setups
- Auto-generation of routines from natural-language description via AI
- Linking routines to shared lists (e.g., auto-reset grocery list on weekly shop routine completion)
- Batch-complete for multiple routines at once
- A separate first-class missed-occurrence state (missed cycles appear as gaps in the history timeline only)

## Shared Infrastructure Introduced Now Vs Deferred

### Introduce now
- Routine and occurrence domain objects in `packages/domain`
- Routine and occurrence schemas, commands, and query payloads in `packages/contracts`
- Routine and occurrence Drizzle table definitions and additive SQL migration (`0003_recurring_routines.sql`)
- Routine repository methods alongside existing inbox, reminder, and list methods
- Routine API routes following the same Fastify structure as reminder and list routes
- Routine-aware Dexie tables and outbox support in the PWA client
- Routine PWA surfaces: index (grouped by due state), detail with completion history, create flow, pause/archive/delete confirmation flows

### Explicitly defer
- A cross-workflow recurrence package that merges routine and reminder scheduling into shared infrastructure
- A cross-workflow event timeline unification with inbox history or reminder timelines
- Any routine-level notification or push infrastructure
- Natural-language routine creation or parsing
- Spouse write paths
- Per-routine completion-anchored scheduling setting

## Canonical Routine And Occurrence Record Model
- One `routines` row per routine. Routines do not embed occurrence data; they hold only the current cycle's due date and the routine's metadata.
- One `routine_occurrences` row per completed or explicitly-skipped occurrence cycle, with a foreign key to the parent routine.
- The `routines` row stores the current `current_due_date` — the next upcoming or active due date. When the user completes the current cycle, the routine row's `current_due_date` advances to the next scheduled occurrence and a new `routine_occurrences` row is appended for the completed cycle.
- Due state is computed at read time: if `current_due_date` is in the future, `upcoming`; if today or within 24 hours, `due`; if in the past without a completion row for that cycle, `overdue`; if the current cycle has an occurrence row with `completed_at` set, `completed`; if `status = 'paused'`, `paused`.
- Archiving sets `archived_at` and `status = 'archived'` on the routine row. Occurrence rows are not deleted on archive.
- Deletion permanently removes the routine row and cascades to all occurrence rows.
- Version fields on routine rows support optimistic concurrency detection.
- Occurrence rows are append-only and are never updated after creation.

## Current Codebase Anchors
Use these existing modules as the extension points:

- `packages/contracts/src/index.ts`: shared schemas, commands, query payloads, outbox command shapes
- `packages/domain/src/index.ts`: domain helpers, derivation logic, recurrence helpers
- `packages/domain/test/reminders-domain.test.ts`: recurrence test precedent
- `apps/api/src/app.ts`: Fastify routes and role enforcement
- `apps/api/src/repository.ts`: SQLite persistence transactions
- `apps/api/src/db/schema.ts`: Drizzle schema declarations
- `apps/api/drizzle/0002_shared_lists.sql`: most recent migration; new routines migration follows as `0003`
- `apps/api/src/db/client.ts`: ordered runtime migration runner
- `apps/api/test/api.test.ts`: API integration test home
- `apps/pwa/src/lib/api.ts`: typed client API calls
- `apps/pwa/src/lib/sync.ts`: offline-aware command/query wrapper
- `apps/pwa/src/lib/client-db.ts`: Dexie cache and outbox
- `apps/pwa/src/router.tsx`: route tree
- `apps/pwa/src/routes/home-page.tsx`: home summary surface
- `apps/pwa/src/routes/reminders-page.tsx`: reminder list surface (structural reference for routine index layout and due-state grouping)
- `apps/pwa/src/routes/reminder-detail-page.tsx`: reminder detail (structural reference for routine detail and history timeline layout)
- `apps/pwa/src/routes/lists-page.tsx`: list index surface (structural reference for checkbox completion UX)
- `apps/pwa/src/routes/settings-page.tsx`: settings surface

---

## Implementation Phases

### Phase 1: Expand shared contracts for routines
**Outcome:** Client, server, and domain share a stable routine and occurrence vocabulary and API contract before implementation logic spreads across layers.

**Primary files**
- Modify: `packages/contracts/src/index.ts`

**Work items**
- Add routine enums and base schemas:
  - `routineStatusSchema`: `active | paused | archived`
  - `routineDueStateSchema`: `upcoming | due | overdue | completed | paused`
  - `recurrenceRuleSchema`: `daily | weekly | monthly | every_n_days` (extend the existing `recurrenceCadenceSchema` from reminders or add a sibling schema for routines)
  - Routine and occurrence event type values for create, edit, complete, pause, resume, archive, restore, delete
- Add routine entity schemas:
  - `routineSchema`: id, title, owner, recurrenceRule, intervalDays (for `every_n_days`), status, currentDueDate, createdAt, updatedAt, archivedAt, version
  - `routineOccurrenceSchema`: id, routineId, dueDate, completedAt, completedBy, skipped
- Add routine query response schemas:
  - active routine index response (array of `routineSchema` with derived `dueState`)
  - archived routine index response
  - routine detail response (routine plus full `routineOccurrenceSchema` array for completion history)
- Add routine command/request schemas:
  - create routine (title, owner, recurrenceRule, intervalDays for `every_n_days`, firstDueDate)
  - update routine (title, owner, recurrenceRule, intervalDays)
  - complete routine occurrence (routineId, dueDate)
  - pause routine
  - resume routine
  - archive routine
  - restore archived routine
  - delete routine
- Extend `outboxCommandSchema` with routine command variants for:
  - routine create
  - routine update
  - routine complete occurrence
  - routine pause
  - routine resume
  - routine archive
  - routine restore
  - routine delete
- Keep inbox, reminder, and list contracts intact; do not fold routine fields into existing schemas.

**Verification**
- Typecheck all packages.
- Add schema parsing tests for representative routine and occurrence command payloads.
- Confirm complete is modeled as a dedicated direct-action command consistent with D-010 semantics.
- Confirm pause, archive, and delete are modeled as commands that require explicit confirmation (no implicit auto-confirm path).
- Confirm `every_n_days` schema validates that `intervalDays` is a positive integer when the rule is `every_n_days`.

**Evidence required**
- Contract diff showing new routine and occurrence schemas and outbox variants
- Passing contract/typecheck output

---

### Phase 2: Add routine domain rules and recurrence helpers
**Outcome:** Routine behavior — including due-state derivation, recurrence advancement, and role enforcement — is deterministic and testable without API, UI, or AI dependencies.

**Primary files**
- Modify: `packages/domain/src/index.ts`
- Create or modify: `packages/domain/test/routines-domain.test.ts`

**Work items**
- Extend recurrence helpers from the reminders domain layer:
  - Reuse existing `scheduleNextOccurrence()` patterns for `daily`, `weekly`, `monthly`.
  - Add `every_n_days` support: `scheduleNextFromDate(date, intervalDays)` advancing by the given number of days.
  - Do not create a parallel recurrence engine; extend the existing helper seam with the new cadence variant.
- Add routine creation helpers:
  - `createRoutine(title, owner, recurrenceRule, intervalDays, firstDueDate)` producing a new routine record with `status = 'active'` and `currentDueDate = firstDueDate`.
  - `updateRoutine(routine, changes)` returning an updated routine record; if recurrenceRule or intervalDays changed, recalculate `currentDueDate` from the **current cycle's original start date** (see architecture decision A above).
- Add routine state helpers:
  - `computeRoutineDueState(routine, now)` returning `upcoming`, `due`, `overdue`, `completed`, or `paused` based on `currentDueDate`, the most recent occurrence row's `completedAt`, and `routine.status`.
  - Due-state derivation rules:
    - `paused` if `routine.status === 'paused'`
    - `completed` if the current cycle has a matching occurrence row with non-null `completedAt`
    - `due` if `currentDueDate <= now && currentDueDate >= now - 24h` and not completed
    - `overdue` if `currentDueDate < now - 24h` and not completed
    - `upcoming` if `currentDueDate > now` and not completed
- Add routine completion helper:
  - `completeRoutineOccurrence(routine, completionDate)` returning:
    - a new `routineOccurrenceSchema` record for the just-completed cycle
    - an updated routine record with `currentDueDate` advanced to the next occurrence, schedule-anchored from the **original due date** (see architecture decision B above), not from `completionDate`
- Add routine status helpers:
  - `pauseRoutine(routine)` returning an updated routine with `status = 'paused'`
  - `resumeRoutine(routine)` returning an updated routine with `status = 'active'`
  - `archiveRoutine(routine)` setting `status = 'archived'` and `archivedAt`
  - `restoreRoutine(routine)` clearing archived state
- Add role enforcement helper:
  - `assertStakeholderWrite(actorRole)` throwing a clear read-only error when spouse attempts a write — reuse or extend the pattern from the lists domain layer.
- Keep inbox, reminder, and list domain helpers separate from routine helpers.

**Verification**
- Domain tests for:
  - routine creation with each recurrence type including `every_n_days`
  - due-state derivation for `upcoming`, `due`, `overdue`, `completed`, and `paused` conditions
  - recurrence advancement after completion — schedule-anchored from original due date, not from completion date
  - recurrence advancement after overdue completion — still schedule-anchored, producing a future due date
  - recurrence rule edit mid-cycle — next due date recalculates from cycle start, not edit date
  - `every_n_days` next-date calculation for a range of interval values
  - month-end edge case for `monthly` rule
  - routine pause and resume behavior
  - routine archive and restore
  - spouse write assertion behavior

**Evidence required**
- Passing routine domain test output
- Representative tests showing schedule-anchored advancement and mid-cycle recurrence rule edit behavior

---

### Phase 3: Add persistence schema and repository support
**Outcome:** SQLite can durably store routines and routine occurrences alongside existing inbox, reminder, and list data.

**Primary files**
- Create: `apps/api/drizzle/0003_recurring_routines.sql`
- Modify: `apps/api/src/db/schema.ts`
- Modify: `apps/api/src/repository.ts`
- Modify: `apps/api/src/db/client.ts`

**Work items**
- Add routine tables in `0003_recurring_routines.sql`:
  - `routines`: id, title, owner, recurrence_rule, interval_days (nullable, only set for `every_n_days`), status, current_due_date, created_at, updated_at, archived_at, version
  - `routine_occurrences`: id, routine_id (FK to routines), due_date, completed_at, completed_by, skipped (boolean, reserved for future use), created_at
- Register `0003_recurring_routines.sql` in the ordered runtime migration runner in `apps/api/src/db/client.ts`.
- Confirm the migration runner remains idempotent: existing databases with inbox, reminder, and list tables should upgrade through `0003` without data loss.
- Add Drizzle table declarations to `apps/api/src/db/schema.ts`.
- Add repository methods:
  - `listRoutines(status?)` — all active routines (default) or filtered by `paused` or `archived`
  - `getRoutine(routineId)` — single routine by id
  - `getRoutineOccurrences(routineId)` — all occurrence rows for a routine ordered by due_date descending (most recent first)
  - `createRoutine(fields)` — insert routine row
  - `updateRoutine(id, changes, expectedVersion)` — transactional update with version check
  - `deleteRoutine(id)` — hard delete routine and cascade to occurrences
  - `completeRoutineOccurrence(routineId, occurrenceFields, updatedRoutineFields, expectedVersion)` — transactional: insert occurrence row and advance routine `currentDueDate` and version in a single transaction
- Preserve transactionality: routine row advancement and occurrence insertion must commit together in `completeRoutineOccurrence`.
- Keep repository method boundaries explicit; do not collapse routines into reminder or list tables.

**Verification**
- Fresh database boot succeeds with all four migration files applied.
- Existing databases with only inbox data upgrade successfully through `0001`, `0002`, and then `0003` without data loss.
- Existing databases with inbox + reminders data upgrade successfully through `0002` and then `0003` without data loss.
- Existing databases with inbox + reminders + lists data upgrade successfully through `0003` without data loss.
- Repository tests or API-backed persistence tests prove routine create, complete (with occurrence row and due-date advancement), pause, archive, and delete flows persist correctly.
- Version conflict detection rejects stale updates with an explicit error.
- Transactional completion — occurrence insert and routine advancement — commits atomically or rolls back completely.

**Evidence required**
- Schema/migration diff showing `0003_recurring_routines.sql`
- Passing upgrade tests from each prior database fixture (inbox-only, inbox+reminders, inbox+reminders+lists)
- Passing persistence or API integration evidence against a fresh SQLite database
- Sample DB inspection showing a routine row and its occurrence rows after a completion cycle

---

### Phase 4: Add API routes and role enforcement
**Outcome:** The server exposes routine queries and commands, preserves trust-model rules, and returns clear errors for spouse write attempts.

**Primary files**
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/test/api.test.ts`

**Work items**
- Add routine query routes:
  - `GET /api/routines` — active and paused routines with computed due state
  - `GET /api/routines/archived` — archived routines
  - `GET /api/routines/:routineId` — single routine with occurrence history
- Add routine command routes:
  - `POST /api/routines` — create routine (stakeholder only; execute immediately)
  - `PATCH /api/routines/:routineId` — update title, owner, or recurrence rule (stakeholder only; execute immediately)
  - `POST /api/routines/:routineId/complete` — complete current occurrence (stakeholder only; execute immediately; advance due date using schedule-anchored logic)
  - `POST /api/routines/:routineId/pause` — pause routine (always confirm; stakeholder only)
  - `POST /api/routines/:routineId/resume` — resume routine (stakeholder only; execute immediately)
  - `POST /api/routines/:routineId/archive` — archive routine (always confirm; stakeholder only)
  - `POST /api/routines/:routineId/restore` — restore archived routine (stakeholder only; execute immediately)
  - `DELETE /api/routines/:routineId` — delete routine permanently (always confirm; stakeholder only)
- Reuse existing role enforcement pattern:
  - stakeholder write commands allowed
  - spouse GET queries allowed
  - spouse write commands return an explicit `403` read-only error
- Apply D-010 trust semantics at the API layer:
  - complete, update, resume, and restore routes execute immediately with no confirmation signal required
  - pause, archive, and delete routes require a `confirmed: true` field in the request body or an equivalent explicit confirmation signal
- Due-state derivation:
  - compute `dueState` in the route handler using the domain `computeRoutineDueState()` helper before returning any routine record; do not store it in the database
- Preserve fallback behavior:
  - all routine commands operate from structured fields only; no AI dependency in this slice
  - routine query routes must not depend on AI

**Verification**
- API integration tests for:
  - stakeholder create/update/complete/pause/resume/archive/restore/delete flows
  - spouse read access to routine index and detail succeeds
  - spouse write commands return `403` read-only errors
  - version conflicts on routine updates return a clear conflict error
  - complete route atomically inserts occurrence row and advances due date
  - schedule-anchored due-date advancement when completing an overdue routine
  - pause, archive, and delete routes reject requests without explicit confirmation signal
  - archived routines appear in the archived filter and not in the active index
  - deleted routines and their occurrences are permanently removed
  - `every_n_days` routines advance the due date by the correct interval

**Evidence required**
- Passing API test output
- Request/response examples for routine create, complete (including due date advancement), pause, archive, and delete flows
- Evidence that spouse write attempts return clean `403` errors

---

### Phase 5: Extend PWA API client, sync, and offline cache
**Outcome:** Routine data participates in the same offline-tolerant client architecture as inbox, reminder, and list data.

**Primary files**
- Modify: `apps/pwa/src/lib/api.ts`
- Modify: `apps/pwa/src/lib/sync.ts`
- Modify: `apps/pwa/src/lib/client-db.ts`
- Modify or create: `apps/pwa/src/lib/api.test.ts`

**Work items**
- Add typed routine API clients:
  - fetch active routine index
  - fetch archived routine index
  - fetch routine detail (with occurrence history)
  - create routine
  - update routine
  - complete routine occurrence
  - pause routine
  - resume routine
  - archive routine
  - restore routine
  - delete routine
- Extend Dexie schema with routine stores:
  - `routines` cache table
  - `routine_occurrences` cache table
  - routine-aware outbox command variants
- Add routine cache builders:
  - active routine index from cached routine records with computed due state
  - routine detail fallback when offline (routine + cached occurrences)
- Extend outbox flushing for routine command variants.
- Preserve D-010 client behavior:
  - complete, update, resume, and restore execute via direct commands without a preview/confirm step
  - pause, archive, and delete require the explicit confirmation signal before the outbox command is queued
- Keep outbox FIFO and do not queue unconfirmed destructive commands.
- Preserve existing inbox, reminder, and list sync behavior; do not regress any prior workflow.

**Verification**
- Client sync tests for:
  - offline routine completion (optimistic due-date advancement, occurrence appended to cache)
  - offline routine creation
  - reconnect outbox flush
  - version-conflict marking for routine commands
  - cached routine index and detail fallback when offline

**Evidence required**
- Passing `apps/pwa/src/lib/api.test.ts` or equivalent sync test output
- Dexie schema diff showing routine cache tables and outbox variants

---

### Phase 6: Build routine surfaces in the PWA
**Outcome:** Olivia has a routine-aware user experience that adds the recurring routines workflow without displacing the inbox, reminder, or list surfaces.

**Primary files**
- Modify: `apps/pwa/src/router.tsx`
- Modify: `apps/pwa/src/routes/home-page.tsx`
- Create: routine index route and component (e.g., `apps/pwa/src/routes/routines-page.tsx`)
- Create: routine detail route and component (e.g., `apps/pwa/src/routes/routine-detail-page.tsx`)
- Create: routine creation component or flow integrated into the index or as a route

**Work items**
- Add routine navigation entry point:
  - A discoverable route to the routine index from the main nav or a household section.
  - Nav placement is deferred to the visual spec decision (sixth tab vs. household section with Lists). Engineering should block on this decision before building nav integration, or implement a provisional entry point that is easy to move. Use the Designer's visual spec when available.
  - Do not add a sixth primary bottom-nav tab without the visual spec decision.
- Build the routine index surface:
  - Routines grouped by due state: overdue first, then due, then upcoming (sorted by due date), then recently completed, then paused (at the bottom).
  - Due state badge or label per routine card indicating `overdue`, `due`, `upcoming`, or `completed` for the current cycle.
  - Subtle left-border accent for overdue routines consistent with the reminder overdue pattern (e.g. `--rose-soft` or equivalent). Do not use alarming or urgent visual treatment.
  - Completion checkbox per routine for direct one-tap completion.
  - "New Routine" creation affordance.
  - Archived routines accessible via a filter or secondary entry point.
  - Empty state for zero active routines.
  - Loading skeleton state.
  - Offline indicator when data is from cache.
- Build the routine detail surface:
  - Routine title, owner, recurrence rule, current due date, and current due state.
  - Completion history timeline: a scannable list of past occurrences with "Completed on [date] by [owner]" entries and "Missed [date range]" gap entries for cycles with no completion row. Keep the history timeline clean; do not show full history on the index card.
  - Pause, archive, and delete actions accessible from a detail menu with appropriate confirmation flows.
  - Resume action visible when paused.
  - Restore action visible when archived.
  - Offline indicator for pending sync items.
- Build routine creation flow:
  - Title input.
  - Owner selector (`stakeholder`, `spouse`, or `unassigned`).
  - Recurrence rule selector: `daily`, `weekly`, `monthly`, `every_n_days`. If `every_n_days` selected, show an integer interval input.
  - First due date input (defaults to today).
  - Submit creates the routine with optimistic appearance in the index.
  - Validation error for missing title or missing recurrence rule.
  - Recurrence is required; the form must not allow submission without a recurrence selection.
- Build pause confirmation flow:
  - Confirmation prompt: "Pause this routine? It will stop appearing as due until you resume it."
  - Reuse existing confirmation modal pattern.
- Build archive confirmation flow:
  - Confirmation prompt: "Archive this routine? It will be hidden but not deleted, and its history will be preserved."
  - Reuse existing confirmation modal pattern.
- Build delete confirmation flow:
  - Higher-friction confirmation: "Permanently delete [Routine title]? This will remove the routine and all its completion history. This cannot be undone."
  - Reuse existing confirmation modal pattern with a more emphatic copy variant.
- Build spouse read-only rendering:
  - Same routine index and detail layout as stakeholder.
  - Write actions (complete, pause, resume, archive, delete) are not visible or are clearly hidden. Do not show disabled controls that produce errors on tap.
  - Per-screen role banner communicating the read-only state, following the established pattern from reminders and shared lists.
- Offline and pending sync indicators:
  - Routines completed offline show a subtle pending sync badge consistent with the lists pattern.
  - Reuse the offline state banner pattern used elsewhere in the PWA if one exists.

**Verification**
- UI tests or route-level integration tests for:
  - routine index rendering with routines grouped by due state
  - routine creation with recurrence rule and first due date
  - one-tap completion optimistic flow and due-state transition to `completed`
  - routine detail rendering with completion history
  - pause confirmation and routine appearing in paused state
  - archive confirmation and routine disappearing from active index
  - archived routine visible in archived filter
  - restore from archived filter
  - delete confirmation and permanent removal
  - spouse read-only rendering with role banner and no write controls
  - offline pending sync indicator on routines completed offline

**Evidence required**
- Screenshots or demo recording of: routine index with due-state grouping, routine detail with history, creation flow, pause/archive/delete confirmation flows, spouse read-only view
- Manual QA notes for mobile viewport and installed-PWA behavior
- Confirmation that existing inbox, reminder, and list surfaces are not regressed

---

### Phase 7: Final verification, documentation sync, and milestone evidence
**Outcome:** The feature is implementable end to end with clear proof it meets the approved spec scope and has not absorbed deferred workflows.

**Primary files**
- Modify as needed: tests in `packages/domain/test`, `apps/api/test`, `apps/pwa/src/lib/api.test.ts`, and UI/e2e test locations
- Update durable docs only if implementation reveals a genuine conflict or new durable decision

**Work items**
- Run the highest-signal automated suites for:
  - domain (routine creation, due-state derivation, recurrence advancement, occurrence records, role enforcement)
  - API (routine queries, commands, role checks, version conflicts, confirmation enforcement)
  - PWA sync and client logic (outbox flush, cached view fallback)
  - Routine UI or end-to-end flows
- Execute a manual checklist covering:
  - Create routine with each recurrence type including `every_n_days`
  - Complete routine: due-date advances to next occurrence (schedule-anchored); occurrence row in history
  - Complete overdue routine: due-date advances from original due date, not completion date
  - Edit recurrence rule mid-cycle: next due date recalculates from cycle start
  - Pause routine: confirmation presented; routine no longer appears in due/overdue state
  - Resume routine: routine reappears with correct due state
  - Archive routine: confirmation presented; routine moves to archived view; history preserved
  - Delete routine: higher-friction confirmation, permanent removal of routine and occurrences
  - Spouse read-only: index and detail visible, write controls absent, role banner present
  - Offline complete: optimistic UI, pending badge, flush on reconnect
  - No routine action mutates inbox items, reminder records, or list records
  - Existing inbox, reminder, and list flows still pass
- Review the implementation against deferred boundaries:
  - no spouse write paths
  - no natural-language parsing
  - no push notifications
  - no weekday-set recurrence
  - no exception dates or backfill
  - no sub-tasks per occurrence
  - no routine categories or templates
- If implementation forces a durable decision beyond the two resolved in this plan, update `docs/learnings/decision-history.md` or `docs/learnings/assumptions-log.md` explicitly instead of burying it in code.
- Update `docs/roadmap/milestones.md` to reflect Recurring Routines implementation completion within M7.

**Verification**
- All targeted automated suites pass.
- Manual QA confirms acceptance criteria coverage.
- A review pass confirms no deferred product area was quietly implemented.
- Milestone evidence documented.

**Evidence required**
- Command output for the passing targeted suites
- Manual QA notes or video evidence covering the acceptance criteria list from `docs/specs/recurring-routines.md`
- Confirmation of schedule-anchored recurrence advancement behavior
- Confirmation that A-008 (recurrence primitives shared or extended from reminders) was validated or documented with any nuance discovered during implementation

---

## Verification Matrix

### Contracts and domain
- Schema parsing tests for routine and occurrence command payloads pass.
- Domain tests prove routine creation, due-state derivation for all five states, recurrence advancement (all four rule types), schedule-anchored completion, mid-cycle recurrence rule edit behavior, pause/resume, archive/restore, and spouse write rejection.

### API and persistence
- Fresh database boot and routine/occurrence persistence succeed.
- Existing inbox-only, inbox+reminders, and inbox+reminders+lists databases upgrade successfully before routine routes are exercised.
- API tests prove stakeholder write access, spouse read access, spouse write rejection, version conflicts, pause/archive/delete confirmation enforcement, and archived filter behavior.
- Complete route proves atomic occurrence insert and due-date advancement.

### PWA and offline behavior
- Client sync tests prove routine commands can queue offline and flush later.
- Routine index and detail render from cache when offline.
- Installed-PWA behavior works on mobile-sized layouts.

### Scope control
- Review confirms the implementation does not include spouse write access, natural-language parsing, push notifications, weekday-set recurrence, exception dates, sub-tasks, categories, templates, or routine-linked list resets.

---

## Risks / Open Questions

### 1. Nav placement is deferred to the visual spec
The spec defers the Routines nav entry point (sixth tab vs. household section with Lists) to the Designer's visual spec. Engineering should not guess this placement. Block on the Designer's visual spec before finalizing the nav integration in Phase 6, or implement a provisional secondary entry point from the home page that can be moved without rebuilding the route.

### 2. A-008 assumption validation
This implementation is the primary validation artifact for A-008 (recurrence primitives can be shared or extended from reminders). If implementation reveals that routines need a fundamentally different scheduling model than reminders, document the conflict in the assumptions log and surface it for the next product cycle rather than silently expanding scope.

### 3. Month-end recurrence edge cases for `monthly` rule
Monthly routines started on the 31st will produce months that do not have a 31st (or 30th). The domain recurrence helper should clamp to the last day of the target month. This is a pre-existing concern inherited from the reminders recurrence model; confirm the existing helper handles it or extend it explicitly.

### 4. Overdue completion feels harsh for household chores
The schedule-anchored choice (architecture decision B) keeps behavior predictable but may feel rigid for chore routines where the exact cadence matters less. If household use reveals this is a real friction point, a per-routine "completion-anchored" setting is the natural targeted amendment, and the current implementation does not make that future change harder.

### 5. Completion history volume
If a household uses Olivia for years, high-frequency routines (e.g., daily) will accumulate a large number of occurrence rows. The detail view should show the most recent N occurrences by default (e.g., 30) rather than all-time history, with a "show more" option if needed. This is a UI concern for Phase 6; the repository query should support a limit.
