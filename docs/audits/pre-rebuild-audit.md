# Pre-Rebuild Codebase Audit

**Date:** 2026-04-02
**Scope:** Full monorepo audit of packages/domain, packages/contracts, apps/pwa, apps/api
**Purpose:** Determine what to keep, rework, or drop before wiping apps/pwa and apps/api for a clean rebuild
**Constraint:** No existing user data needs to be retained. The rebuild starts from an empty database and empty client cache.

---

## 1. packages/domain/ Audit

**File:** `packages/domain/src/index.ts` (2,344 lines, single-file module)

The domain package is a pure-logic library with zero I/O dependencies. It imports types/schemas from `@olivia/contracts` and date utilities from `date-fns` and `chrono-node`. All functions accept explicit parameters (including `now: Date` for testability) and return validated objects through Zod schemas. No side effects, no global state.

### Module: Inbox Item Lifecycle (lines 145-757)

**What it does:** Natural-language parsing of inbox items (`createDraft`), item creation with history tracking (`createInboxItem`), single-field updates with optimistic locking (`applyUpdate`), flag computation (overdue/stale/due-soon/unassigned via `computeFlags`), suggestion generation (`buildSuggestions`), and grouping by status (`groupItems`).

**Logic quality:** Sound. The parser strips prefixes, extracts status/due patterns via regex, delegates date parsing to chrono-node, and correctly reports ambiguities when parsing fails. `applyUpdate` enforces exactly-one-field-at-a-time mutations (line 617: `if (requestedKeys.length !== 1) throw`), which is a deliberate design choice that prevents multi-field race conditions. Flag thresholds are configurable via `Thresholds` parameter.

**Edge case:** `normalizeDueText` (line 751) returns null on parse failure, which propagates to the draft's `dueAt` field. The caller gets an ambiguity message but the draft is still created with `dueAt: null`. This is correct behavior.

**Tests:** 4 tests in `packages/domain/test/inbox-domain.test.ts` covering NL parsing with confidence levels, stale/due-soon flagging with threshold verification, and status update versioning. All assert concrete output values.

**Recommendation: KEEP.** Logic is correct, well-structured, fully tested. The single-field update constraint is intentional and should be preserved.

### Module: Reminder Lifecycle (lines 243-934)

**What it does:** Reminder creation/update/complete/snooze/cancel with full timeline tracking, recurring reminder support (daily/weekly/monthly), missed occurrence materialization for recurring reminders, state computation (upcoming/due/overdue/snoozed/completed/cancelled), grouping and ranking for surfacing.

**Logic quality:** Excellent. The `materializeMissedRecurringOccurrences` function (line 760) walks forward from the last scheduled occurrence to `now`, logging missed occurrences that aren't already in the timeline. It deduplicates against existing entries (line 780-789). The `resolveReminderOccurrenceAt` function (line 865) has a guard of 1024 iterations to prevent infinite loops. `completeReminderOccurrence` (line 426) correctly handles both one-shot (marks completed) and recurring (advances to next occurrence) reminders.

**Edge case handled well:** Snooze-then-complete correctly clears `snoozedUntil` on completion (line 449-450). Rescheduling also clears snooze state (line 412).

**Tests:** 14 tests in `packages/domain/test/reminders-domain.test.ts`. Tests state transitions, recurring advancement, missed occurrence logging (verifies 3 entries for 3 missed), timeline deduplication, and ranking. All validate actual computed values.

**Recommendation: KEEP.** This is the most complex module and it's well-implemented. The timeline-based audit trail is a good pattern for the rebuild.

### Module: Shared Lists (lines 940-1117)

**What it does:** CRUD for shared lists and list items, summary derivation (active/checked counts), history entry generation for all list events (created, title updated, archived, restored, item added/checked/unchecked/removed, bulk clear, bulk uncheck).

**Logic quality:** Clean and straightforward. All mutations validate through Zod schemas and increment versions. `deriveListSummary` (line 949) is a pure computation. History entry factory functions are verbose but correct.

**Tests:** 25 tests in `packages/domain/test/lists-domain.test.ts`. Covers full lifecycle, summary derivation, and all history entry types. Solid coverage.

**Recommendation: KEEP.** Simple, correct, well-tested.

### Module: Routines (lines 1119-1474)

**What it does:** Recurring routine management with 7 recurrence rules (`daily`, `weekly`, `monthly`, `every_n_days`, `weekly_on_days`, `every_n_weeks`, `ad_hoc`). Schedule-anchored advancement (advances from original due date, not completion date). Pause/resume/archive/restore state machine. Due state computation. First-due-date calculation. Recurrence label formatting.

**Logic quality:** Well-implemented. `scheduleNextRoutineOccurrence` (line 1143) handles all 7 rules including month-end clamping for monthly (line 1162: `Math.min(targetDay, daysInNextMonth)`). `completeRoutineOccurrence` (line 1322) correctly differentiates ad-hoc (records occurrence, no advancement) from scheduled (advances from original due date). The weekday conversion helpers (`jsWeekdayToSpec`/`specWeekdayToJs`, lines 1124-1133) correctly map between JS 0=Sun and spec 0=Mon conventions.

**Tests:** 46 tests in `packages/domain/test/routines-domain.test.ts`. Covers all 7 recurrence rules, schedule-anchored advancement, mid-cycle rule edits, pause/resume/archive/restore state machine, first due date calculation. The most thorough test suite in the codebase.

**Recommendation: KEEP.** The recurrence logic is complex and correct. Would be expensive and risky to rewrite.

### Module: Meal Planning (lines 1522-1683)

**What it does:** Meal plan CRUD, meal entry management, shopping item parsing from free text, grocery item collection across entries, summary derivation, week range formatting.

**Logic quality:** Correct. `createMealPlan` validates weekStartDate is a Monday (line 1555). `parseMealEntryItemsFromText` (line 1657) splits on newlines/commas and filters empties. `collectGroceryItems` (line 1667) sorts by day-of-week then position.

**Tests:** 20 tests in `packages/domain/test/meal-planning-domain.test.ts`. Covers title trimming, state transitions, version increments, shopping item parsing, grocery collection, summary derivation.

**Recommendation: KEEP.** Clean utility code, well-tested.

### Module: Weekly View (lines 1685-1844)

**What it does:** Week bounds calculation, routine occurrence projection across a calendar week, occurrence status computation, formatting helpers.

**Logic quality:** The `getRoutineOccurrenceDatesForWeek` function (line 1720) is the most complex here. It handles weekly_on_days separately (direct weekday matching) and uses backward/forward stepping for other rules. The backward step limit (line 1749-1768) is bounded per recurrence type. The forward walk (line 1806-1813) collects all dates in range.

**Tests:** 16 tests in `packages/domain/test/weekly-view-domain.test.ts`. Covers all recurrence types and status computation.

**Recommendation: KEEP.** Projection logic would be hard to get right a second time.

### Module: Activity History (lines 1846-1920)

**What it does:** Rolling 30-day window calculation, grouping activity items by day with reverse-chronological sorting. Handles 5 item types (routine, reminder, meal, inbox, listItem).

**Tests:** 11 tests in `packages/domain/test/activity-history-domain.test.ts`.

**Recommendation: KEEP.** Simple grouping/sorting logic, well-tested.

### Module: Planning Ritual (lines 1922-1964)

**What it does:** Review window computation anchored to occurrence due date, ISO date formatting.

**Tests:** 8 tests in `packages/domain/test/planning-ritual-domain.test.ts`.

**Recommendation: KEEP.** Small but tricky date boundary logic.

### Module: Nudges & Skip (lines 1966-2042)

**What it does:** Routine skip (schedule-anchored), nudge priority sorting (planningRitual > reminder > routine > freshness).

**Tests:** 13 tests in `packages/domain/test/nudges-domain.test.ts`. Includes timezone and DST boundary testing.

**Recommendation: KEEP.**

### Module: Completion Window (lines 2044-2146)

**What it does:** Statistical analysis of completion times to determine hold/deliver/no_window decisions. Uses IQR (interquartile range) variance thresholds. Timezone-aware hour extraction via `Intl.DateTimeFormat`.

**Logic quality:** Sound statistical approach. The `localDateToUtcNoon` function (line 2086) handles DST drift correction.

**Tests:** Covered in nudges-domain.test.ts with quartile calculations and timezone testing.

**Recommendation: KEEP.**

### Module: Data Freshness (lines 2148-2344)

**What it does:** Staleness detection for inbox items (14 days), routines (2x interval), reminders (7 days past due), shared lists (30 days), meal plans (no current week entries). Health check display logic. Human-readable freshness descriptions. Nudge copy generation.

**Tests:** 27 tests in `packages/domain/test/freshness-domain.test.ts`. Covers all entity types, override logic, state-specific behavior.

**Recommendation: KEEP.**

### Overall domain/ assessment

**Total: 2,344 lines, 10 test files, ~184 domain tests.** All tests validate real behavior through public function entry points. No hollow assertions found in domain tests. The package is the strongest asset in the codebase.

**Structural note:** Everything is in a single `index.ts` file. For the rebuild, consider splitting into modules (inbox.ts, reminders.ts, routines.ts, etc.) with a barrel export. This doesn't affect correctness but would improve maintainability.

---

## 2. packages/contracts/ Audit

**File:** `packages/contracts/src/index.ts` (1,896 lines, single-file module)

The contracts package defines Zod schemas for all domain types, API request/response shapes, and derives TypeScript types via `z.infer<>`. It imports only from `zod`.

### Schema Groups

#### Inbox Contracts (lines 1-165)
Schemas for: `draftItem`, `inboxItem`, `historyEntry`, `itemFlags`, `suggestion`, `itemsByStatus`, `inboxViewResponse`, preview/confirm create/update request/response pairs.

**Assessment:** Well-structured. The preview/confirm pattern enforces the advisory-only trust model (user must approve before writes). `previewCreateRequestSchema` (line 93) uses `.refine()` to require either `inputText` or `structuredInput`. All schemas use strict Zod validators (uuid, datetime, positive integers).

**Domain alignment:** Domain functions create objects that pass these schemas (all domain mutations end with `schema.parse()`). No drift detected.

**Recommendation: KEEP.**

#### Reminder Contracts (lines 167-371)
Schemas for: `draftReminder`, `reminder` (extends draft), `reminderTimelineEntry`, notification preferences, `remindersByState`, preview/confirm create/update, complete/snooze/cancel request/response.

**Assessment:** Complete and aligned with domain. The `reminderSchema` (line 216) extends `draftReminderSchema` with state, lifecycle timestamps, and version. The reuse via `reminderMutationResponseSchema` (line 331) for 5 different response types is clean.

**Recommendation: KEEP.**

#### Shared List Contracts (lines 396-567)
Schemas for: `sharedList`, `listItem`, `listItemHistoryEntry`, all CRUD request/response schemas, bulk action responses.

**Assessment:** Clean. Proper use of `z.literal(true)` for destructive confirmation fields.

**Recommendation: KEEP.**

#### Routine Contracts (lines 569-738)
Schemas for: `routine` (with 4 `.refine()` validators for recurrence rule constraints), `routineOccurrence`, all CRUD/lifecycle request/response schemas.

**Assessment:** The `.refine()` validators (lines 608-619) enforce business rules at the schema level (e.g., `every_n_days` requires `intervalDays > 0`, `weekly_on_days` requires non-empty weekdays). `createRoutineRequestSchema` duplicates these refinements (lines 660-671). This duplication is intentional and correct since request schemas may have different optional patterns.

**Recommendation: KEEP.**

#### Meal Planning Contracts (lines 742-847)
Schemas for: `mealPlan`, `mealEntry`, `generatedListRef`, all CRUD request/response schemas.

**Assessment:** Clean. `dayOfWeekSchema` (line 745) correctly constrains 0-6.

**Recommendation: KEEP.**

#### Weekly View Contracts (lines 849-901)
Schemas for: `weeklyRoutineOccurrence`, `weeklyReminder`, `weeklyMealEntry`, `weeklyInboxItem`, `weeklyDay`, `weeklyViewResponse`.

**Assessment:** Read-only response schemas. Aligned with domain projection functions.

**Recommendation: KEEP.**

#### Outbox Command Contracts (lines 903-1120)
A `discriminatedUnion` with ~25 command variants covering all mutation types.

**Assessment:** Comprehensive. Each command variant has its own shape with appropriate fields. Used by the PWA sync engine for offline command queuing.

**Recommendation: KEEP.** This is the offline-first contract. Critical for the rebuild.

#### Activity History Contracts (lines 1256-1331)
Schemas for 5 history item types as a discriminated union, day grouping, response envelope.

**Recommendation: KEEP.**

#### Planning Ritual Contracts (lines 1333-1380)
Schemas for `reviewRecord`, `ritualSummaryResponse`, complete ritual request/response.

**Recommendation: KEEP.**

#### Nudge Contracts (lines 1382-1427)
Schemas for nudge entities with entity type discrimination, constants for thresholds and display caps.

**Recommendation: KEEP.**

#### Completion Window Contracts (lines 1428-1440)
Discriminated union for hold/deliver/no_window decisions.

**Recommendation: KEEP.**

#### Chat Contracts (lines 1442-1523)
Schemas for `chatMessage`, `conversation`, tool calls (8 types), send/query/clear/confirm/dismiss.

**Recommendation: KEEP.**

#### Onboarding Contracts (lines 1525-1571)
Schemas for onboarding session, state response, topic enum, constants.

**Recommendation: KEEP.**

#### Data Freshness Contracts (lines 1573-1626)
Schemas for stale items, confirm/archive requests, health check state.

**Recommendation: KEEP.**

#### Auth & Identity Contracts (lines 1628-1752)
Schemas for user, authUser, magic link, PIN, setup, invite, household members.

**Recommendation: KEEP.**

#### Feedback Contracts (lines 1754-1810)
Schemas for feedback submission, listing, status updates.

**Recommendation: KEEP.**

#### Automation Rules Contracts (lines 1812-1896)
Schemas for automation rules (trigger/action/scope), log entries, CRUD request/response.

**Recommendation: KEEP.**

### Overall contracts/ assessment

**Total: 1,896 lines.** No tests exist for contracts specifically, which is acceptable because all schemas are validated transitively through domain tests (every domain function calls `.parse()`) and API tests.

**Schema-domain alignment:** No drift detected. Domain functions produce objects that satisfy these schemas because they call `.parse()` at every mutation boundary.

**Schema-API alignment:** API routes use these schemas for request validation and response shaping. Verified through API test files which exercise the full preview-confirm flow.

**Recommendation: KEEP the entire package.** It is the single source of truth for the type system. The rebuild should import from it unchanged.

---

## 3. Test Quality Assessment

### Tests That Validate Behavior (STRONG)

**Domain tests (10 files, ~184 tests):** All validate real behavior through public function entry points with concrete assertions on output values. Highlights:
- `routines-domain.test.ts`: 46 tests covering all 7 recurrence rules, schedule-anchored advancement, state machine transitions
- `reminders-domain.test.ts`: 14 tests including missed occurrence materialization, timeline deduplication, recurring advancement
- `freshness-domain.test.ts`: 27 tests covering all entity types, threshold arithmetic, override logic
- `nudges-domain.test.ts`: 13 tests including DST boundary testing (March spring-forward, November fall-back) and timezone conversions (UTC, America/New_York, Asia/Tokyo, Pacific/Auckland)

**API tests (11 files, ~111 tests):** Test through HTTP endpoints against a real SQLite database. No mocked repositories. Highlights:
- `auth.test.ts`: 10 tests covering setup, magic link, PIN, invite lifecycle, 2-user household limit, session invalidation
- `freshness.test.ts`: 16 tests covering stale item detection, confirm/archive endpoints, version conflicts (409), spouse write access
- `automation-rules.test.ts`: 13 tests covering rule creation, validation, 20-rule household limit, listing/patching/deletion
- `regression.test.ts`: 3 targeted regression tests for OLI-234 (URL interpolation), OLI-186 (onboarding 503), and onboarding state

**PWA lib tests (5 files, ~33 tests):** Validate utility behavior with concrete assertions.
- `connectivity.test.ts`: 9 tests covering OLI-207 state transitions, health check probing, CORS vs network failure differentiation
- `sync.test.ts`: 6 tests covering offline queueing, outbox flushing, version conflict handling

### Tests That Are Happy-Path Only (ACCEPTABLE)

- `apps/pwa/src/lib/error-reporter.test.ts`: 4 tests covering capture order, cap, copy semantics, and truncation. No error handling paths tested. No multi-caller scenarios.

### Tests That Are Hollow or Weak (CONCERN)

**E2E tests (17 files, ~65 tests):** The Playwright E2E suite is the weakest layer.

- `apps/pwa/e2e/smoke.spec.ts` (8 tests): Only checks that pages return status < 400 and have a non-empty body. Example from line 34:
  ```typescript
  await expect(page.locator('body')).not.toBeEmpty();
  ```
  This asserts that *something* rendered, not that the correct content rendered.

- Most E2E tests use `expect().toBeVisible()` as their primary assertion. They verify the add-preview-confirm workflow produces a visible element but don't validate data correctness (e.g., that a task with due date "tomorrow" actually shows the correct date).

- No error state testing: no tests for API failures, network errors, or validation rejections in the UI.

- DOM selectors use class names (`.tf-name`, `.screen-sub`) rather than accessibility roles. Brittle to CSS refactors.

- Several auth-related E2E tests are skipped (marked with `-` prefix in Playwright output), including the full invite-to-access flow (tests 21-27).

**E2E verdict:** These tests confirm the app doesn't crash on happy paths. They do not protect against regressions in data display, error handling, or edge cases. Since apps/pwa is being wiped, this is acceptable — but the rebuild should not replicate this pattern.

### Test Infrastructure Observations

- **No coverage thresholds:** `vitest.config.ts` line 15-17 configures coverage reporters but no minimum thresholds. Tests can pass with zero coverage.
- **No contract-level tests:** Schemas are validated transitively through domain/API tests. This is fine but means a schema change with no domain test coverage could slip through.

---

## 4. apps/pwa and apps/api State

### apps/api/ (15 source files)

**Architecture:** Fastify HTTP server with all routes defined inline in `app.ts` (~900 lines). Repository pattern over better-sqlite3 with `repository.ts` (~1,500+ lines). Auth middleware as Fastify plugin. Background jobs for notifications. AI provider abstraction (Claude Haiku).

**What's worth preserving:**

1. **Database schema** (`apps/api/src/db/schema.ts`): Drizzle ORM definitions for all tables. Clean, correct. Worth referencing for the new schema design, but the rebuild is free to redesign from scratch (e.g., integer timestamps, explicit foreign keys).

2. **Auth patterns** (`auth-middleware.ts`, `auth-repository.ts`): Timing-safe token comparison, SHA-256 PIN hashing, magic link lifecycle, invite code generation (6 chars, excludes confusable characters). Good security practices worth carrying forward.

3. **API route structure** (`app.ts`): The preview-confirm pattern enforced across all mutations is a product-level design choice, not just implementation detail. The rebuild must preserve this pattern.

4. **Outbox sync protocol**: The API's handling of outbox commands from the PWA client. The contract is in `packages/contracts` but the server-side processing logic in `app.ts` is worth referencing.

**What should NOT be preserved:**

1. **Monolithic `app.ts`**: All ~60 route handlers in one file with direct repository calls. Should be split into feature modules.

2. **Monolithic `repository.ts`**: All SQL queries for all entity types in one class. Should be split per entity.

3. **Hardcoded `householdId: 'household'`** (`auth-routes.ts` line 72): All accounts map to same household string. Since no data is being retained, the rebuild can implement a proper household ID scheme from day one.

4. **Missing Node.js globals in ESLint config**: API code uses `Buffer`, `setTimeout`, `setInterval`, `AbortController` etc. but the ESLint config doesn't include Node.js globals (only browser globals). This causes 30+ false positive lint errors across API source files.

5. **No rate limiting on auth endpoints**: Magic link, setup, and PIN verification are all unprotected.

6. **`drizzle/` migration history**: SQLite migration files accumulated over the project's history. Since no data is being retained, these should be deleted. The rebuild starts with a fresh schema.

**Verdict:** Wipe is appropriate. Reference DB schema for table structure and auth security patterns for the rebuild. Delete migration history.

### apps/pwa/ (~80 source files)

**Architecture:** React + TanStack Router + TanStack Query. Offline-first via Dexie (IndexedDB) + outbox command queue. Capacitor for native iOS. Global error reporting.

**What's worth preserving:**

1. **Offline sync engine** (`apps/pwa/src/lib/sync.ts`): Outbox command queue with optimistic cache updates, server sync on reconnect, conflict detection. This is the most complex PWA logic and implements the offline-first contract defined in `packages/contracts`.

2. **Connectivity monitoring** (`apps/pwa/src/lib/connectivity.ts`): Addresses WKWebView bug where `navigator.onLine` is always true. Active health-check pinging with diagnostic probing (CORS vs network failure). Subscriber pattern compatible with `useSyncExternalStore`.

3. **Client DB cache patterns** (`apps/pwa/src/lib/client-db.ts`): Dexie IndexedDB usage for offline cache, outbox commands, nudge dismissal throttling, and health check progress. Since no data is being retained, the 10-version migration history is irrelevant — the rebuild starts at Dexie version 1. The *patterns* (cache structure, outbox command storage, daily-reset dismissal logic) are worth referencing.

4. **Push notification registration** (`apps/pwa/src/lib/push-opt-in.ts`): Service Worker token storage pattern, VAPID key handling, permission management.

5. **API client URL resolution** (`apps/pwa/src/lib/api.ts`): Handles relative bases, absolute hosts, Tailscale IPs, and duplicate `/api` prefix avoidance. Small but tricky.

**What should NOT be preserved:**

1. **Route files** (~25 files in `src/routes/`): Tightly coupled to current component structure, query patterns, and layout. The rebuild should design routes from scratch.

2. **Components** (~40 files): Functional but tightly coupled to current data flow. Bottom sheet patterns, list/meal/reminder components — all should be rebuilt.

3. **Storybook stories** (`src/stories/`): 4 story files, all have lint errors (`'React' is not defined`), and don't exercise real component behavior.

**Verdict:** Wipe is appropriate. Extract `sync.ts`, `connectivity.ts`, and `push-opt-in.ts` patterns into the rebuild. The rest can be rewritten cleanly.

---

## 5. Tooling and Config Health

### TypeScript: CLEAN
```
npm run typecheck → all 4 packages pass with zero errors
```
`tsconfig.base.json` has `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`. This is a healthy baseline.

**Missing:** `noUncheckedIndexedAccess` is not enabled. This means `array[0]` returns `T` instead of `T | undefined`, hiding potential runtime errors.

### ESLint: 981 ERRORS (misleading)

The raw count (981 errors, 55 warnings) is inflated by two config problems:

1. **Bundled iOS build artifact linted** (`apps/pwa/ios/App/App/public/assets/index-CGZp-bEn.js`): A minified production JS bundle is being linted. This file alone accounts for ~900+ errors (all `no-undef` for browser globals). The ESLint ignore patterns don't exclude `ios/` or the build output.

2. **Node.js globals not declared for API code**: The ESLint config (`eslint.config.js` lines 31-48) only declares browser globals (`window`, `document`, `navigator`, etc.). API files that use `Buffer`, `setTimeout`, `setInterval`, `AbortController`, `clearTimeout`, `clearInterval` get false `no-undef` errors. This accounts for ~30 errors.

**Real errors in source code (excluding iOS bundle and global false positives):**
- `@typescript-eslint/no-unused-vars`: ~6 instances across API code (unused function parameters prefixed with `_`)
- `react-hooks/preserve-manual-memoization`: 2 instances in PWA components where React Compiler can't preserve manual `useMemo` calls
- `react-hooks/exhaustive-deps`: 1 missing dependency warning
- `no-undef` for `__dirname` in `vitest.config.ts`: CJS global used in ESM context
- 4 `no-undef` errors in Storybook stories (missing React import)

**Suppressed rules:**
- `@typescript-eslint/no-explicit-any: 'off'` (`eslint.config.js` line 59): **This hides real type safety issues.** Any `any` usage bypasses TypeScript's protection. Should be re-enabled for the rebuild.

### Tests: ALL PASS

```
Domain:  184 tests passed (10 files)
API:     214 tests passed (11 files)
PWA lib:  33 tests passed (5 files)
E2E:    ~65 tests (some skipped for auth state reasons)
```

Total: ~431 unit/integration tests pass. ~65 E2E tests run (some skipped).

**Hidden weakness:** No coverage thresholds enforced. `vitest.config.ts` lines 15-17 configure reporters but no gates. A PR could remove all tests and the CI would still pass.

### Config Concerns

| Config | Issue | Severity |
|--------|-------|----------|
| `eslint.config.js:59` | `no-explicit-any: 'off'` | HIGH — hides type safety issues |
| `eslint.config.js:9-20` | Missing `ios/**` ignore, no Node.js globals for API | HIGH — inflates error count, masks real issues |
| `vitest.config.ts:15-17` | No coverage thresholds | MEDIUM — no regression protection |
| `tsconfig.base.json` | Missing `noUncheckedIndexedAccess` | MEDIUM — allows unsafe array access |
| `vitest.config.ts:7-8` | Uses `__dirname` (CJS) in ESM config | LOW — works at runtime but lints as error |

---

## 6. Risks and Surprises

### Hardcoded Values That Will Matter

1. **`householdId: 'household'`** (`apps/api/src/auth-routes.ts`): All users are assigned to the same hardcoded household string. Since no data is being retained, the rebuild should implement a proper household ID scheme from day one rather than carrying this forward.

2. **Freshness thresholds** (`packages/domain/src/index.ts:2150-2155`):
   ```typescript
   export const FRESHNESS_THRESHOLDS = {
     inbox: 14, routine: 2, reminder: 7, list: 30,
   } as const;
   ```
   These are hardcoded in the domain package, not configurable. The rebuild should consider making them configurable per household.

3. **Session lifetime: 30 days** (`apps/api/src/auth-repository.ts`): Hardcoded, no refresh mechanism. Sessions just expire.

4. **AI model version** (`apps/api/src/ai.ts`): Hardcoded to `'claude-haiku-4-5-20251001'`. Should be moved to config.

5. **Notification delivery window** (`apps/api/src/jobs.ts`): Daily summary timing is based on UTC hour, not configurable per household timezone.

6. **Context truncation** (`apps/api/src/chat.ts`): Household context for AI chat is truncated at 8,000 characters with a max of 15 active items. Large households could lose critical context.

### Implicit Coupling

1. **Domain ↔ Contracts coupling is healthy:** Domain imports types and schemas from contracts. Contracts has zero internal imports. Clean one-way dependency.

2. **API ↔ Domain coupling is tight but correct:** API calls domain functions directly and uses contract schemas for request/response validation. The coupling is structural, not accidental.

3. **PWA ↔ Domain coupling:** The PWA sync engine (`sync.ts`) imports and calls domain functions client-side for optimistic updates. This means domain logic runs in both browser and server. The `createId()` function (domain line 59) accounts for this with a `crypto.randomUUID` fallback for non-secure contexts.

4. **PWA ↔ Contracts coupling for outbox:** The outbox command schema (`outboxCommandSchema` in contracts) is the offline-first protocol. Both PWA and API must agree on this schema. Any change requires coordinated updates.

### Schema Drift Risk

No drift detected today. The architecture prevents drift by design: domain functions call `.parse()` on every mutation return, so any mismatch between domain output and contract schema would cause a runtime Zod error caught by tests. However, the rebuild should maintain this pattern — removing `.parse()` calls would silently allow drift.

### Circular Dependencies

**None detected.** Dependency graph is strictly: `contracts` ← `domain` ← `api`, `contracts` ← `domain` ← `pwa`. No cycles.

### iOS Build Artifact in Source Control

`apps/pwa/ios/App/App/public/assets/index-CGZp-bEn.js` is a minified production build committed to the repository. It's linted (generating ~900 false errors) and should be in `.gitignore`.

### E2E Tests Require Running Server

The Playwright E2E tests hit a real API server. Tests 1-6 and 10, 12, 21-27 were skipped in this run, likely due to missing server state (no admin user set up). This means CI must orchestrate server setup before E2E runs, and test results depend on database state.

### Single-File Architecture in Domain and Contracts

Both `packages/domain/src/index.ts` (2,344 lines) and `packages/contracts/src/index.ts` (1,896 lines) are single files. This works today but will become a merge conflict hotspot if multiple developers or agents work on different features simultaneously. The rebuild should split these into module files with barrel exports.

---

## Summary of Recommendations

### Keep As-Is
- `packages/domain/` — all modules, all tests
- `packages/contracts/` — all schemas, all types
- Monorepo structure and workspace configuration

### Keep as Reference for Rebuild
- `apps/api/src/db/schema.ts` — table definitions (reference for new schema design; no need to preserve migration history since no data is being retained)
- `apps/api/src/auth-middleware.ts` — security patterns (timing-safe comparison, hashing)
- `apps/api/src/auth-routes.ts` — invite code generation, magic link lifecycle
- `apps/pwa/src/lib/sync.ts` — offline sync engine pattern
- `apps/pwa/src/lib/connectivity.ts` — health-check pinging pattern
- `apps/pwa/src/lib/client-db.ts` — cache structure and outbox patterns (migration history not needed; rebuild starts at Dexie version 1)

### Wipe
- All other `apps/api/src/` files (rebuild with modular route handlers)
- All `apps/pwa/src/` files (rebuild components, routes, and layout from scratch)
- `apps/pwa/e2e/` tests (rebuild with meaningful assertions)
- `apps/pwa/src/stories/` (broken, not exercising real behavior)
- `drizzle/` migration history (no data retention needed; rebuild starts with a fresh schema)

### Freed by No Data Retention
Since no existing data needs to be preserved:
- DB schema can be redesigned from scratch (e.g., integer timestamps, explicit foreign keys, normalized tables) rather than maintaining backward compatibility
- `householdId: 'household'` hardcoding can be replaced with a proper scheme from day one
- IndexedDB client cache starts fresh at Dexie version 1 with no migration path from prior versions
- No need to maintain migration tooling or coordinate schema changes with existing deployments

### Fix in Rebuild Config
1. Enable `@typescript-eslint/no-explicit-any` (warn or error)
2. Enable `noUncheckedIndexedAccess` in tsconfig
3. Add Node.js globals to ESLint config for API code
4. Add `ios/**` to ESLint ignore patterns
5. Add coverage thresholds to vitest config
6. Move hardcoded values (session lifetime, AI model, household ID) to config
7. Split domain/contracts into multi-file modules
