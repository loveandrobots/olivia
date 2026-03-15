# Shared Lists Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add shared lists to Olivia as the second Horizon 3 workflow, extending the existing modular monolith with list and list item domain objects, persistence, API routes, offline-tolerant PWA sync, and mobile-first list surfaces. Spouse access is read-only. No AI dependency in Phase 1.

**Architecture:** Implement shared lists as a sibling workflow to inbox items and reminders inside the existing TypeScript modular monolith. Reuse the current contracts/domain/API/PWA seams, immediate execution for non-destructive direct user actions, confirmation for all destructive actions, SQLite canonical persistence, Dexie offline cache and outbox, and versioned command concurrency semantics.

**Tech Stack:** TypeScript, Zod, Fastify, better-sqlite3, Drizzle schema definitions, React, TanStack Router, TanStack Query, Dexie.

---

## Summary

This plan turns the approved shared lists spec into an execution-ready build sequence without reopening product strategy. The shared list workflow extends Olivia's working implementation alongside inbox items and first-class reminders:

- shared lists are first-class records with a title and an owner
- list items are child records belonging to a single list
- checking and unchecking items are immediate user-initiated actions
- archive and delete are destructive and always require confirmation
- spouse access is read-only; write commands from spouse return an explicit error
- no AI dependency in the first implementation slice
- advisory-only trust rules remain in force
- no recurring list or template logic in this slice

Planning readiness is satisfied:

- `docs/specs/shared-lists.md` is approved
- `docs/roadmap/milestones.md` defines M6 as implementation-planning readiness for Horizon 3 workflows
- `docs/learnings/decision-history.md` records D-010 through D-012, which settle action-source confirmation semantics, the Horizon 3 priority order, and the rationale for treating lists as a sibling workflow
- `docs/specs/shared-lists.md` explicitly states there are no blocking product questions for the first implementation slice

## Source Artifacts
- `docs/specs/shared-lists.md`
- `docs/specs/shared-household-inbox.md`
- `docs/specs/first-class-reminders.md`
- `docs/roadmap/milestones.md`
- `docs/strategy/system-architecture.md`
- `docs/learnings/decision-history.md`
- `docs/learnings/assumptions-log.md`

Relevant durable guidance carried into this plan:

- `D-002`: advisory-only trust model remains active
- `D-004`: primary-operator model remains active; spouse write parity is deferred
- `D-007`: installable mobile-first PWA remains the canonical near-term surface
- `D-008`: local-first modular monolith with SQLite canonical storage and Dexie client cache/outbox
- `D-010`: non-destructive user-initiated writes execute immediately; agentic writes require confirmation; destructive writes always require confirmation regardless of initiator
- `D-011`: Horizon 2 is complete enough to move into Horizon 3
- `D-012`: shared lists are the second Horizon 3 implementation target after first-class reminders
- `A-006`: versioned command sync is sufficient for household-level list concurrency
- `A-007`: shared lists are distinct enough from inbox items to deserve a separate workflow model; this implementation validates that assumption

## Assumptions And Non-Goals

### Assumptions
- The current codebase with working inbox and first-class reminders is the base to extend, not replace.
- List item writes can continue to use versioned command semantics without stronger conflict machinery.
- No AI integration is needed in the first slice; all list operations work from structured fields.
- The existing outbox and sync plumbing used by reminders can be reused for list commands with minimal adaptation.
- Spouse read-only enforcement follows the same role-check pattern already used in reminder routes.

### Non-Goals
- Spouse write access to lists or items
- Per-item owner assignment, status, or due dates
- Fixed list types, categories, or templates
- Drag-to-reorder items
- Moving items between lists
- Batch clear-all-checked action
- Recurring list regeneration or scheduled list reset
- Meal planning integration or ingredient linking
- List or item notifications or push alerts
- Natural-language list or item parsing
- External sharing or export

## Shared Infrastructure Introduced Now Vs Deferred

### Introduce now
- List and list item domain objects in `packages/domain`
- List and list item schemas, commands, and query payloads in `packages/contracts`
- List and list item Drizzle table definitions and additive SQL migration
- List repository methods alongside existing inbox and reminder methods
- List API routes following the same Fastify structure as reminder routes
- List-aware Dexie tables and outbox support in the PWA client
- List PWA surfaces: index, detail, create flow, archive and delete confirmation

### Explicitly defer
- A cross-workflow item-history unification with inbox or reminder timelines
- A generalized confirmation modal beyond reuse of the existing reminder cancel pattern
- Any list-level notification or subscription infrastructure
- Natural-language parsing for lists or items
- Spouse write paths

## Canonical List And Item Record Model
- One `shared_lists` row per list. Lists do not have per-item child rows separate from `list_items`.
- One `list_items` row per item, with a foreign key to the parent list.
- Item order is stored as an integer `position` field and is append-only in Phase 1: new items receive `position = MAX(position) + 1` for the parent list.
- Checking and unchecking update `checked` and `checked_at` on the item row in place.
- Archiving sets `archived_at` and `status = 'archived'` on the list row. Items are not deleted on archive.
- Deletion permanently removes the list row and cascades to all item rows.
- Version fields on both lists and items support optimistic concurrency detection.
- An `item_history` table (or equivalent lightweight log) captures add, edit, check, uncheck, and remove events for future auditability. No separate undo flow is built in Phase 1.

## Current Codebase Anchors
Use these existing modules as the extension points:

- `packages/contracts/src/index.ts`: shared schemas, commands, query payloads, outbox command shapes
- `packages/domain/src/index.ts`: domain helpers and derivation logic
- `packages/domain/test/inbox-domain.test.ts`: current domain test home
- `apps/api/src/app.ts`: Fastify routes and role enforcement
- `apps/api/src/repository.ts`: SQLite persistence transactions
- `apps/api/src/db/schema.ts`: Drizzle schema declarations
- `apps/api/drizzle/0001_first_class_reminders.sql`: most recent migration; new list migration follows as `0002`
- `apps/api/src/db/client.ts`: ordered runtime migration runner
- `apps/api/test/api.test.ts`: API integration test home
- `apps/pwa/src/lib/api.ts`: typed client API calls
- `apps/pwa/src/lib/sync.ts`: offline-aware command/query wrapper
- `apps/pwa/src/lib/client-db.ts`: Dexie cache and outbox
- `apps/pwa/src/router.tsx`: route tree
- `apps/pwa/src/routes/home-page.tsx`: home summary surface
- `apps/pwa/src/routes/tasks-page.tsx`: inbox list surface (structural reference for list index)
- `apps/pwa/src/routes/reminders-page.tsx`: reminder list surface (structural reference for list index layout)
- `apps/pwa/src/routes/reminder-detail-page.tsx`: reminder detail (structural reference for list detail layout)
- `apps/pwa/src/routes/settings-page.tsx`: settings surface

---

## Implementation Phases

### Phase 1: Expand shared contracts for lists
**Outcome:** Client, server, and domain share a stable list and list item vocabulary and API contract before implementation logic spreads across layers.

**Primary files**
- Modify: `packages/contracts/src/index.ts`

**Work items**
- Add list and item enums and base schemas:
  - `listStatusSchema`: `active | archived`
  - List and item event type values for create, edit, check, uncheck, archive, delete
- Add list entity schemas:
  - `sharedListSchema`: id, title, owner, status, item count summary fields, created/updated/archived timestamps, version
  - `listItemSchema`: id, listId, body, checked, checkedAt, position, created/updated timestamps, version
  - `listItemHistoryEntrySchema`: id, listId, itemId, actorRole, eventType, fromValue, toValue, createdAt
- Add list query response schemas:
  - active list index response (array of `sharedListSchema` with item count summary)
  - archived list index response
  - list detail response (list plus full array of `listItemSchema`)
- Add list command/request schemas:
  - create list (title, owner)
  - update list title
  - archive list
  - restore archived list
  - delete list
  - add item (body, listId)
  - update item body
  - check item
  - uncheck item
  - remove item (destructive; requires confirmation)
- Extend `outboxCommandSchema` with list command variants for:
  - list create
  - list title update
  - list archive
  - list restore
  - list delete
  - item add
  - item body update
  - item check
  - item uncheck
  - item remove
- Keep inbox and reminder contracts intact; do not fold list fields into existing schemas.

**Verification**
- Typecheck all packages.
- Add schema parsing tests for representative list and item command payloads.
- Confirm check and uncheck are modeled as dedicated direct-action commands consistent with D-010 semantics.
- Confirm archive and delete are modeled as commands that require the server to enforce a confirmation requirement (i.e., there is no implicit auto-confirm path).

**Evidence required**
- Contract diff showing new list and item schemas and outbox variants
- Passing contract/typecheck output

---

### Phase 2: Add list domain rules and helpers
**Outcome:** List and item behavior is deterministic and testable without API, UI, or AI dependencies.

**Primary files**
- Modify: `packages/domain/src/index.ts`
- Create or modify: `packages/domain/test/lists-domain.test.ts`

**Work items**
- Add list creation helpers:
  - `createSharedList(title, owner)` producing a new list record
  - `updateListTitle(list, newTitle)` returning an updated list record
  - `archiveList(list)` setting status and archived timestamp
  - `restoreList(list)` clearing archived state
- Add list item helpers:
  - `addListItem(listId, body, nextPosition)` producing a new item record
  - `updateItemBody(item, newBody)` returning an updated item record
  - `checkItem(item)` setting checked and checkedAt
  - `uncheckItem(item)` clearing checked state
  - `removeItem(item)` returning a tombstone or deleted item record
- Add list summary derivation:
  - `deriveListSummary(list, items)` returning active item count, checked item count, and an `allChecked` boolean
- Add role enforcement helpers:
  - `assertStakeholderWrite(actorRole)` throwing a clear read-only error when spouse attempts a write
- Keep inbox and reminder domain helpers separate from list helpers; do not unify domain modules prematurely.

**Verification**
- Domain tests for:
  - list creation and title update
  - list archive and restore semantics
  - item add, body update, check, uncheck, and remove
  - list summary derivation with mixed checked state
  - spouse write assertion behavior

**Evidence required**
- Passing list domain test output
- Representative tests showing summary derivation and role enforcement

---

### Phase 3: Add persistence schema and repository support
**Outcome:** SQLite can durably store shared lists, list items, and list item history alongside existing inbox and reminder data.

**Primary files**
- Create: `apps/api/drizzle/0002_shared_lists.sql`
- Modify: `apps/api/src/db/schema.ts`
- Modify: `apps/api/src/repository.ts`

**Work items**
- Add list tables in `0002_shared_lists.sql`:
  - `shared_lists`: id, title, owner, status, created_at, updated_at, archived_at, version
  - `list_items`: id, list_id, body, checked, checked_at, position, created_at, updated_at, version
  - `list_item_history`: id, list_id, item_id, actor_role, event_type, from_value, to_value, created_at
- Register `0002_shared_lists.sql` in the ordered runtime migration runner in `apps/api/src/db/client.ts`.
- Confirm the migration runner remains idempotent: existing databases with inbox and reminder tables should upgrade through `0002` without data loss.
- Add Drizzle table declarations to `apps/api/src/db/schema.ts`.
- Add repository methods:
  - `listSharedLists(status?)` — all active lists (default) or filtered by status
  - `getSharedList(listId)` — single list by id
  - `getListItems(listId)` — all items for a list ordered by position
  - `getListItemHistory(listId)` — audit log entries for a list
  - `createSharedList(fields)` — insert list row
  - `updateSharedList(id, changes, expectedVersion)` — transactional update with version check
  - `deleteSharedList(id)` — hard delete list and cascade to items and history
  - `addListItem(fields)` — insert item row with history entry
  - `updateListItem(id, changes, expectedVersion)` — transactional item update with version check and history entry
  - `removeListItem(id, listId)` — delete item row and append history entry
- Preserve transactionality: list row updates and history entries must commit together.
- Keep repository method boundaries explicit; do not collapse list tables into inbox or reminder tables.

**Verification**
- Fresh database boot succeeds with all three migration files applied.
- Existing databases with only inbox data upgrade successfully through `0001` and then `0002` without data loss.
- Existing databases with inbox and reminder data upgrade successfully through `0002` without data loss.
- Repository tests or API-backed persistence tests prove list create, item add, check, uncheck, archive, and delete flows persist correctly.
- Version conflict detection rejects stale updates with an explicit error.

**Evidence required**
- Schema/migration diff showing `0002_shared_lists.sql`
- Passing upgrade tests from inbox-only and inbox-plus-reminders database fixtures
- Passing persistence or API integration evidence against a fresh SQLite database
- Sample DB inspection showing list row and item rows

---

### Phase 4: Add API routes and role enforcement
**Outcome:** The server exposes list queries and commands, preserves trust-model rules, and returns clear errors for spouse write attempts.

**Primary files**
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/test/api.test.ts`

**Work items**
- Add list query routes:
  - `GET /api/lists` — active lists with item count summary
  - `GET /api/lists/archived` — archived lists
  - `GET /api/lists/:listId` — single list with all items
  - `GET /api/lists/:listId/history` — item history log (optional Phase 1 surface; can be a stub)
- Add list command routes:
  - `POST /api/lists` — create list (stakeholder only)
  - `PATCH /api/lists/:listId/title` — update list title (stakeholder only)
  - `POST /api/lists/:listId/archive` — archive list (always confirm; stakeholder only)
  - `POST /api/lists/:listId/restore` — restore archived list (stakeholder only)
  - `DELETE /api/lists/:listId` — delete list permanently (always confirm; stakeholder only)
  - `POST /api/lists/:listId/items` — add item (stakeholder only)
  - `PATCH /api/lists/:listId/items/:itemId` — update item body (stakeholder only)
  - `POST /api/lists/:listId/items/:itemId/check` — check item (stakeholder only)
  - `POST /api/lists/:listId/items/:itemId/uncheck` — uncheck item (stakeholder only)
  - `DELETE /api/lists/:listId/items/:itemId` — remove item (stakeholder only)
- Reuse existing role enforcement pattern:
  - stakeholder write commands allowed
  - spouse GET queries allowed
  - spouse write commands return an explicit `403` read-only error
- Apply D-010 trust semantics at the API layer:
  - check and uncheck are direct user-action commands that execute immediately; no preview/confirm cycle needed for these
  - archive and delete routes should require a `confirmed: true` field in the request body or an equivalent explicit confirmation signal, preventing accidental execution
- Preserve fallback behavior:
  - all list commands operate from structured fields only; no AI dependency in this slice
  - list query routes must not depend on AI

**Verification**
- API integration tests for:
  - stakeholder create/edit/check/uncheck/archive/delete flows
  - spouse read access to list index and detail succeeds
  - spouse write commands return `403` read-only errors
  - version conflicts on list and item updates return a clear conflict error
  - archive and delete routes reject requests without explicit confirmation signal
  - archived lists appear in the archived filter and not in the active index
  - deleted lists and items are permanently removed

**Evidence required**
- Passing API test output
- Request/response examples for list create, item add, item check, archive, and delete flows
- Evidence that spouse write attempts return clean `403` errors

---

### Phase 5: Extend PWA API client, sync, and offline cache
**Outcome:** List data participates in the same offline-tolerant client architecture as inbox and reminder data.

**Primary files**
- Modify: `apps/pwa/src/lib/api.ts`
- Modify: `apps/pwa/src/lib/sync.ts`
- Modify: `apps/pwa/src/lib/client-db.ts`
- Modify or create: `apps/pwa/src/lib/api.test.ts`

**Work items**
- Add typed list API clients:
  - fetch active list index
  - fetch archived list index
  - fetch list detail
  - create list
  - update list title
  - archive list
  - restore list
  - delete list
  - add item
  - update item body
  - check item
  - uncheck item
  - remove item
- Extend Dexie schema with list stores:
  - `shared_lists` cache table
  - `list_items` cache table
  - list-aware outbox command variants
- Add list cache builders:
  - active list index from cached list records with derived item count summary
  - list detail fallback when offline
- Extend outbox flushing for list command variants.
- Preserve D-010 client behavior:
  - check, uncheck, and non-destructive field edits execute via direct confirm commands
  - archive and delete require the explicit confirmation signal before the outbox command is queued
- Keep outbox FIFO and do not queue unconfirmed destructive commands.
- Preserve existing inbox and reminder sync behavior; do not regress either workflow.

**Verification**
- Client sync tests for:
  - offline list creation
  - offline item add and check
  - reconnect outbox flush
  - version-conflict marking for list and item commands
  - cached list index and detail fallback when offline

**Evidence required**
- Passing `apps/pwa/src/lib/api.test.ts` or equivalent sync test output
- Dexie schema diff showing list cache tables and outbox variants

---

### Phase 6: Build list surfaces in the PWA
**Outcome:** Olivia has a list-aware user experience that adds the shared list workflow without displacing the inbox or reminder surfaces.

**Primary files**
- Modify: `apps/pwa/src/router.tsx`
- Modify: `apps/pwa/src/routes/home-page.tsx`
- Create: list index route and component (e.g., `apps/pwa/src/routes/lists-page.tsx`)
- Create: list detail route and component (e.g., `apps/pwa/src/routes/list-detail-page.tsx`)
- Create: list creation component or flow integrated into the index or as a route
- Consider adapt: `apps/pwa/src/routes/tasks-page.tsx` as a structural reference for the list index layout

**Work items**
- Add shared list navigation entry point:
  - A discoverable route to the list index from the main nav or a household section.
  - Do not add a fifth primary bottom-nav tab; use a discoverable secondary entry point consistent with the visual spec direction.
- Build the list index surface:
  - Active list cards showing title, active item count, and checked item count.
  - "New List" creation affordance.
  - Archived list filter accessible from the index.
  - Empty state for zero active lists.
  - Loading skeleton state.
  - Offline indicator when data is from cache.
- Build the list detail surface:
  - All items for the list in append order.
  - Inline item add input at the bottom (or top; deferred to visual spec decision); no modal.
  - Checkbox per item; check and uncheck immediately.
  - Checked items visually distinct (strikethrough or muted + checkmark) but not removed.
  - Empty state for zero items.
  - Loading skeleton state.
  - Offline indicator for pending sync items.
  - Archive and delete actions accessible from a detail menu with appropriate confirmation flows.
- Build list creation flow:
  - Title input with submit.
  - Optimistic appearance in the index on submit.
  - Validation error for empty title.
- Build archive confirmation flow:
  - Confirmation prompt: "Archive this list? It will be hidden but not deleted."
  - Reuse existing confirmation modal pattern.
- Build delete confirmation flow:
  - Higher-friction confirmation: "Permanently delete this list and all its items? This cannot be undone."
  - Reuse existing confirmation modal pattern with a more emphatic copy variant.
- Build spouse read-only rendering:
  - Same list index and detail layout as stakeholder.
  - Write actions (add item, check, archive, delete) are not visible or are clearly disabled.
  - Role indicator (banner or label) communicating the read-only state once per screen.
  - Do not show disabled checkboxes that produce errors on tap; hide or replace with a visible read-only indicator.
- Offline and pending sync indicators:
  - Items created or checked offline show a subtle pending sync badge.
  - Reuse the offline state banner pattern used elsewhere in the PWA if one exists.

**Verification**
- UI tests or route-level integration tests for:
  - list index rendering with active lists
  - list creation optimistic flow
  - list detail rendering with items
  - inline item add
  - item check and uncheck
  - archive confirmation and list disappearing from active index
  - delete confirmation and permanent removal
  - archived list visible in archived filter
  - spouse read-only rendering with role indicator and no write controls
  - offline pending sync indicator on items

**Evidence required**
- Screenshots or demo recording of: list index, list detail with items checked, create flow, archive confirmation, spouse read-only view
- Manual QA notes for mobile viewport and installed-PWA behavior
- Confirmation that existing inbox and reminder surfaces are not regressed

---

### Phase 7: Final verification, documentation sync, and milestone evidence
**Outcome:** The feature is implementable end to end with clear proof it meets the approved spec scope and has not absorbed deferred workflows.

**Primary files**
- Modify as needed: tests in `packages/domain/test`, `apps/api/test`, `apps/pwa/src/lib/api.test.ts`, and UI/e2e test locations
- Update durable docs only if implementation reveals a genuine conflict or new durable decision

**Work items**
- Run the highest-signal automated suites for:
  - domain (list and item helpers, summary derivation, role enforcement)
  - API (list queries, commands, role checks, version conflicts)
  - PWA sync and client logic (outbox flush, cached view fallback)
  - List UI or end-to-end flows
- Execute a manual checklist covering:
  - Create list, add items, check off items, uncheck items
  - Archive list: confirmation presented, list moves to archived view
  - Delete list: higher-friction confirmation, permanent removal
  - Spouse read-only: index and detail visible, write controls absent or clearly disabled, role indicator present
  - Offline create and check: optimistic UI, pending badge, flush on reconnect
  - No list action mutates inbox items or reminder records
  - Existing inbox and reminder flows still pass
- Review the implementation against deferred boundaries:
  - no spouse write paths
  - no natural-language parsing
  - no recurring list or schedule logic
  - no per-item owner, status, or due date fields
  - no list notifications or push infrastructure
- If implementation forces a durable decision about list data modeling, concurrency, or UI patterns beyond this scope, update `docs/learnings/decision-history.md` or `docs/learnings/assumptions-log.md` explicitly instead of burying it in code.
- Update `docs/roadmap/milestones.md` to reflect Shared Lists implementation completion within M7.

**Verification**
- All targeted automated suites pass.
- Manual QA confirms acceptance criteria coverage.
- A review pass confirms no deferred product area was quietly implemented.
- Milestone evidence documented.

**Evidence required**
- Command output for the passing targeted suites
- Manual QA notes or video evidence covering the acceptance criteria list from `docs/specs/shared-lists.md`
- Confirmation that A-007 (shared lists deserve a distinct workflow model) is validated or documented with any nuance discovered during implementation

---

## Verification Matrix

### Contracts and domain
- Schema parsing tests for list and item command payloads pass.
- Domain tests prove list creation, title update, archive, restore, item add, check, uncheck, remove, list summary derivation, and spouse write rejection.

### API and persistence
- Fresh database boot and list/item persistence succeed.
- Existing inbox-only and inbox-plus-reminders databases upgrade successfully before list routes are exercised.
- API tests prove stakeholder write access, spouse read access, spouse write rejection, version conflicts, archive and delete confirmation enforcement, and archived filter behavior.

### PWA and offline behavior
- Client sync tests prove list and item commands can queue offline and flush later.
- List index and detail render from cache when offline.
- Installed-PWA behavior works on mobile-sized layouts.

### Scope control
- Review confirms the implementation does not include spouse write access, natural-language parsing, recurring list logic, per-item assignments, list notifications, or any deferred workflow described in the spec boundaries.

---

## Risks / Open Questions

### 1. Item order management may become a demand sooner than expected
Append-only position is a known Phase 1 simplification. If household usage immediately surfaces drag-to-reorder as a hard requirement, this should be escalated to VP of Product as a spec amendment rather than silently implemented.

### 2. The check-off interaction pattern needs a visual spec decision
The design brief deferred the canonical check-off interaction (tap checkbox, swipe, etc.) to the Designer. Engineering should block on this decision before building the item check UX in Phase 6, or implement a tap-checkbox default that is easy to revise.

### 3. Spouse write access may arrive before the next full spec cycle
If the stakeholder decides spouse write access for list items is a high-priority gap after real household use, a targeted spec amendment can add it without rewriting this plan. The role enforcement infrastructure introduced here is intentionally designed to be removed rather than worked around.

### 4. A-007 assumption validation
This implementation is the primary validation artifact for A-007 (shared lists deserve a distinct workflow model). If implementation reveals that list behavior is closer to the inbox than expected, update the assumptions log and surface the finding for future product decisions rather than bending the implementation to fit the assumption.
