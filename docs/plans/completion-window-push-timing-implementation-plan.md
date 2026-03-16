# Completion-Window-Based Push Timing Implementation Plan

**Goal:** Extend the push notification scheduler so that routine nudge pushes are held until the household's historically-derived completion window opens, rather than delivering immediately on detection. This is H5 Phase 2 Layer 1 — data-driven heuristic timing with no LLM calls.

**Architecture:** The existing `evaluateNudgePushRule` in `jobs.ts` runs every 30 minutes, computes active nudges via `repository.getNudgePayloads(now)`, checks a 2-hour dedup window, and sends pushes to all subscribed devices. This plan inserts a new completion-window evaluation step between the dedup check and the push send — for routine nudges only. The window is computed on demand from existing `routine_occurrences.completedAt` data using an IQR (interquartile range) algorithm. No new database tables, columns, or migrations are required.

**Tech Stack:** TypeScript, Zod, Vitest, better-sqlite3, Drizzle ORM, Fastify, date-fns.

**Spec dependency:** All product decisions are resolved in `docs/specs/completion-window-push-timing.md` (CEO-approved, D-048, 2026-03-16). The 5 open questions are resolved as architecture decisions below.

---

## Summary

1. **Phase 1:** Constants and types — add configurable constants to `@olivia/contracts` and a `CompletionWindowDecision` type
2. **Phase 2:** Domain function — implement `computeCompletionWindow` pure function in `@olivia/domain` with IQR algorithm
3. **Phase 3:** Repository method — add `getRoutineCompletionTimestamps` to `InboxRepository`
4. **Phase 4:** Scheduler extension — integrate completion window evaluation into `evaluateNudgePushRule`
5. **Phase 5:** Unit tests — completion window computation, edge cases, decision logic
6. **Phase 6:** Integration tests — full scheduler cycle with window hold/deliver behavior
7. **Phase 7:** Verification and milestone update

---

## Architecture Decisions

### Decision A: Timezone source — `OLIVIA_HOUSEHOLD_TIMEZONE` env var with server-local fallback

**Chosen approach:** Introduce an `OLIVIA_HOUSEHOLD_TIMEZONE` environment variable (IANA timezone string, e.g., `'America/New_York'`). If unset, fall back to the server process timezone. Pass the resolved timezone string to the completion window function for hour-of-day conversion.

**Rationale:** The server's system timezone may not match the household (e.g., UTC cloud hosting). An explicit env var is the simplest reliable source. No database column needed — timezone is a deployment-level concern, not a per-household setting in the single-household Phase 2 model. Using an IANA string with `date-fns-tz` or `Intl.DateTimeFormat` gives correct DST handling.

**Implementation note:** Add `householdTimezone: string` to `AppConfig`. Map from `OLIVIA_HOUSEHOLD_TIMEZONE` with fallback to `Intl.DateTimeFormat().resolvedOptions().timeZone`. The domain function receives the timezone string as a parameter — it does not read config directly.

### Decision B: Maximum hold duration — 2 days

**Chosen approach:** If a routine has been overdue for more than 2 complete days (48 hours since `currentDueDate`), bypass the completion window and deliver immediately.

**Rationale:** Per spec recommendation. A routine neglected for 2+ days needs a push regardless of time-of-day. The max hold prevents the timing optimization from hiding genuinely forgotten items.

**Implementation note:** The `overdueSince` field on the nudge payload provides the `currentDueDate` as a `YYYY-MM-DD` string. Compare `now - overdueSinceDate > 48h` to determine bypass. This check happens in the scheduler, not the domain function, because it depends on nudge metadata.

### Decision C: Sample size — 8 most recent completions

**Chosen approach:** Query the last 8 `completedAt` timestamps (non-null, non-skipped) per routine for window computation.

**Rationale:** Per spec recommendation. 8 provides enough data for a meaningful IQR while focusing on recent behavior. Older completions may reflect outdated household patterns. At household scale, this is a trivially fast query on the existing `routine_occurrences` index.

### Decision D: Lead buffer — 1 hour before 25th percentile

**Chosen approach:** The completion window opens 1 hour before the 25th percentile of completion hours.

**Rationale:** Per spec recommendation. Accounts for natural daily variation without opening the window so early that the optimization loses value. A household that typically completes at 7pm gets a window opening at ~5:30pm (depending on IQR), which is reasonable for an early-evening push.

### Decision E: Variance threshold — 6-hour IQR span

**Chosen approach:** If the IQR (75th percentile minus 25th percentile) spans more than 6 hours, the routine has no meaningful pattern. Return `no_window` and use immediate delivery.

**Rationale:** Per spec recommendation. A 6-hour IQR means completions are spread across a quarter of the day — no single time-of-day captures the pattern. Immediate delivery is the safe fallback.

### Decision F: Completion window applies only to routine nudges in the push path

**Chosen approach:** Only `entityType === 'routine'` nudges are evaluated for completion windows. `'reminder'` and `'planningRitual'` nudges use immediate delivery (existing behavior). The evaluation happens inside `evaluateNudgePushRule` only — the in-app nudge tray (`GET /api/nudges`) is completely unaffected.

**Rationale:** Per spec scope. Reminders have less structured completion-time data. Planning rituals are rare and high-priority. Both should push immediately.

### Decision G: No new config env vars beyond timezone

**Chosen approach:** The five configurable constants (min occurrences, sample size, lead buffer, variance threshold, max hold days) are exported as named constants from `@olivia/contracts`. They are not env-var-configurable in this phase.

**Rationale:** These values are algorithm parameters, not deployment configuration. Changing them requires understanding the algorithm's statistical properties — not something an operator adjusts per-environment. If tuning is needed later, env var overrides can be added without changing the contract boundary.

---

## Source Artifacts

- `docs/specs/completion-window-push-timing.md` — CEO-approved spec (D-048)
- `apps/api/src/jobs.ts` — `evaluateNudgePushRule` (lines 325-380), `startBackgroundJobs`
- `apps/api/src/repository.ts` — `InboxRepository`, `getNudgePayloads` (line 1465), push subscription methods
- `apps/api/src/config.ts` — `AppConfig`, `loadConfig`
- `apps/api/test/push.test.ts` — existing push notification tests (259 lines)
- `packages/contracts/src/index.ts` — `nudgeSchema`, `NUDGE_*` constants
- `packages/domain/src/index.ts` — `sortNudgesByPriority`
- `packages/domain/test/nudges-domain.test.ts` — existing nudge domain tests

---

## Assumptions And Non-Goals

### Assumptions

- `routine_occurrences` has an existing index on `(routine_id, due_date DESC)` that can be leveraged. The new query orders by `completed_at DESC` — a new composite index is not required at household scale but can be added if profiling shows a need.
- The `overdueSince` field on nudge payloads is a `YYYY-MM-DD` string representing `currentDueDate`. It is always populated for routine nudges.
- `date-fns-tz` is available or can be added as a dependency for timezone conversion. If not, `Intl.DateTimeFormat` with the `timeZone` option provides equivalent hour extraction.

### Non-Goals

- LLM-based timing decisions (Layer 2 — Phase 3+).
- Per-household-member completion windows.
- Completion windows for reminder or planning ritual nudges.
- UI to display or configure completion windows.
- Caching or storing computed windows.
- New database tables, columns, or migrations.
- Changes to the in-app nudge tray display.

---

## Codebase Anchors

| Anchor | Location | Purpose |
|--------|----------|---------|
| Nudge constants | `packages/contracts/src/index.ts:1331` | Add new completion window constants alongside existing `NUDGE_*` constants |
| Nudge type | `packages/contracts/src/index.ts:1335` | `nudgeSchema` — `overdueSince` field used for max-hold check |
| Domain functions | `packages/domain/src/index.ts:1834` | Add `computeCompletionWindow` near `sortNudgesByPriority` |
| Domain tests | `packages/domain/test/nudges-domain.test.ts` | Add completion window unit tests |
| Repository | `apps/api/src/repository.ts:1459` | Add `getRoutineCompletionTimestamps` near nudge section |
| Scheduler | `apps/api/src/jobs.ts:354` | Insert completion window check in the nudge loop |
| Config | `apps/api/src/config.ts:11` | Add `householdTimezone` to `AppConfig` |
| Push tests | `apps/api/test/push.test.ts:145` | Add completion window integration tests |

---

## Phase 1: Constants and Types

**Outcome:** Configurable constants and a `CompletionWindowDecision` type are available for use by the domain function and scheduler.

### 1.1 Add constants to `@olivia/contracts`

Add to `packages/contracts/src/index.ts` near the existing `NUDGE_*` constants (line ~1333):

```ts
// ─── Completion Window Constants (H5 Phase 2 Layer 1) ────────────────────────
export const COMPLETION_WINDOW_MIN_OCCURRENCES = 4;
export const COMPLETION_WINDOW_SAMPLE_SIZE = 8;
export const COMPLETION_WINDOW_LEAD_BUFFER_HOURS = 1;
export const COMPLETION_WINDOW_VARIANCE_THRESHOLD_HOURS = 6;
export const COMPLETION_WINDOW_MAX_HOLD_DAYS = 2;
```

### 1.2 Add `CompletionWindowResult` type to `@olivia/contracts`

```ts
export const completionWindowResultSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('hold'), windowStartHour: z.number(), windowEndHour: z.number() }),
  z.object({ decision: z.literal('deliver'), windowStartHour: z.number(), windowEndHour: z.number() }),
  z.object({ decision: z.literal('no_window'), reason: z.enum(['insufficient_data', 'high_variance']) }),
]);
export type CompletionWindowResult = z.infer<typeof completionWindowResultSchema>;
```

### 1.3 Add `householdTimezone` to `AppConfig`

In `apps/api/src/config.ts`:

```ts
// In AppConfig type:
householdTimezone: string;

// In loadConfig():
householdTimezone: process.env.OLIVIA_HOUSEHOLD_TIMEZONE
  ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
```

### Verification

- `packages/contracts` compiles cleanly (`tsc --noEmit`).
- `apps/api/src/config.ts` compiles cleanly.
- `loadConfig()` returns a `householdTimezone` string (server-local timezone when env var is unset).

---

## Phase 2: Domain Function — `computeCompletionWindow`

**Outcome:** A pure, tested function that takes an array of completion timestamps and a timezone, and returns a `CompletionWindowResult`.

### 2.1 Implement `computeCompletionWindow` in `@olivia/domain`

Add to `packages/domain/src/index.ts` near `sortNudgesByPriority`:

```ts
import {
  COMPLETION_WINDOW_MIN_OCCURRENCES,
  COMPLETION_WINDOW_LEAD_BUFFER_HOURS,
  COMPLETION_WINDOW_VARIANCE_THRESHOLD_HOURS,
  type CompletionWindowResult,
} from '@olivia/contracts';

/**
 * Computes a completion window from an array of completedAt ISO timestamps.
 * Returns a hold/deliver/no_window decision based on the IQR of completion hours.
 *
 * @param completedAtTimestamps - ISO 8601 datetime strings (already filtered to non-null, non-skipped)
 * @param timezone - IANA timezone string for hour-of-day conversion
 * @param currentHour - current local hour (fractional, e.g. 18.5 = 6:30pm)
 */
export function computeCompletionWindow(
  completedAtTimestamps: string[],
  timezone: string,
  currentHour: number
): CompletionWindowResult {
  if (completedAtTimestamps.length < COMPLETION_WINDOW_MIN_OCCURRENCES) {
    return { decision: 'no_window', reason: 'insufficient_data' };
  }

  // Convert timestamps to fractional hours in local timezone
  const hours = completedAtTimestamps.map((ts) => {
    const date = new Date(ts);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    return hour + minute / 60;
  });

  // Sort for percentile computation
  hours.sort((a, b) => a - b);

  // Compute IQR (25th and 75th percentiles)
  const q1 = percentile(hours, 0.25);
  const q3 = percentile(hours, 0.75);
  const iqrSpan = q3 - q1;

  // Variance guard
  if (iqrSpan > COMPLETION_WINDOW_VARIANCE_THRESHOLD_HOURS) {
    return { decision: 'no_window', reason: 'high_variance' };
  }

  // Window: lead buffer before Q1, ends at Q3
  const windowStart = q1 - COMPLETION_WINDOW_LEAD_BUFFER_HOURS;
  const windowEnd = q3;

  if (currentHour < windowStart) {
    return { decision: 'hold', windowStartHour: windowStart, windowEndHour: windowEnd };
  }
  return { decision: 'deliver', windowStartHour: windowStart, windowEndHour: windowEnd };
}

/** Linear interpolation percentile for a sorted array. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = p * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const fraction = index - lower;
  return sorted[lower] + fraction * (sorted[upper] - sorted[lower]);
}
```

### 2.2 Export helper: `getCurrentLocalHour`

```ts
/**
 * Returns the current fractional hour in the given timezone.
 * E.g., 18.5 for 6:30pm.
 */
export function getCurrentLocalHour(now: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour + minute / 60;
}
```

### Verification

- `packages/domain` compiles cleanly.
- The spec's documented example produces the correct result:
  - Input: `[19:00, 19:30, 20:00, 20:15, 20:30, 21:00, 21:00, 22:00]`
  - Q1 ≈ 19.625 (19:37), Q3 ≈ 21.0
  - Window start: 19.625 - 1.0 = 18.625 (≈ 18:37)
  - At 18:00 (before window) → `hold`
  - At 19:00 (within window) → `deliver`

---

## Phase 3: Repository Method — `getRoutineCompletionTimestamps`

**Outcome:** The repository can efficiently query the last N completion timestamps for a given routine.

### 3.1 Add `getRoutineCompletionTimestamps` to `InboxRepository`

Add to `apps/api/src/repository.ts` in the nudge section (near line 1540):

```ts
/**
 * Returns the last N completedAt timestamps for a routine, ordered newest-first.
 * Excludes skipped occurrences and null completedAt values.
 */
getRoutineCompletionTimestamps(routineId: string, limit: number): string[] {
  const rows = this.db.prepare(`
    SELECT completed_at
    FROM routine_occurrences
    WHERE routine_id = ?
      AND completed_at IS NOT NULL
      AND skipped = 0
    ORDER BY completed_at DESC
    LIMIT ?
  `).all(routineId, limit) as Array<{ completed_at: string }>;

  return rows.map((r) => r.completed_at);
}
```

### Verification

- Method compiles cleanly.
- Given a routine with 10 completed occurrences, returns the 8 most recent `completedAt` values.
- Excludes rows where `skipped = 1` or `completed_at IS NULL`.

---

## Phase 4: Scheduler Extension — Integrate Into `evaluateNudgePushRule`

**Outcome:** The scheduler holds routine nudge pushes when the current time is before the completion window, while preserving all existing behavior for reminders, planning rituals, and routines without sufficient data.

### 4.1 Modify `evaluateNudgePushRule` in `jobs.ts`

Insert the completion window check after the dedup check (line ~359) and before the push send. The modified inner loop becomes:

```ts
import {
  COMPLETION_WINDOW_SAMPLE_SIZE,
  COMPLETION_WINDOW_MAX_HOLD_DAYS,
} from '@olivia/contracts';
import { computeCompletionWindow, getCurrentLocalHour } from '@olivia/domain';

// Inside the nudge loop, after the dedup check:
for (const nudge of nudges) {
  const alreadySent = repository.hasPushNotificationLog(
    subscription.id, nudge.entityType, nudge.entityId, DEDUP_WINDOW_MS, now
  );
  if (alreadySent) continue;

  // ─── Completion window evaluation (routine nudges only) ──────────────
  if (nudge.entityType === 'routine') {
    // Max hold bypass: if overdue > MAX_HOLD_DAYS, deliver immediately
    const maxHoldMs = COMPLETION_WINDOW_MAX_HOLD_DAYS * 24 * 60 * 60 * 1000;
    const overdueSinceDate = nudge.overdueSince ? new Date(nudge.overdueSince) : null;
    const overdueAge = overdueSinceDate ? now.getTime() - overdueSinceDate.getTime() : 0;
    const bypassWindow = overdueAge > maxHoldMs;

    if (!bypassWindow) {
      const timestamps = repository.getRoutineCompletionTimestamps(
        nudge.entityId, COMPLETION_WINDOW_SAMPLE_SIZE
      );
      const currentHour = getCurrentLocalHour(now, config.householdTimezone);
      const windowResult = computeCompletionWindow(timestamps, config.householdTimezone, currentHour);

      if (windowResult.decision === 'hold') {
        logger.debug({
          entityId: nudge.entityId,
          windowStart: windowResult.windowStartHour,
          currentHour,
        }, 'nudge push held: before completion window');
        continue; // Skip this nudge for this cycle — no dedup entry
      }
    }
  }
  // ─── End completion window evaluation ────────────────────────────────

  const notification = buildNudgeNotification(nudge, config.pwaOrigin);
  // ... existing push send logic continues unchanged
}
```

### 4.2 Key behavioral notes

- **Hold = skip without logging.** No dedup log entry is created for held nudges. The nudge will be re-evaluated on the next 30-minute cycle.
- **`no_window` = deliver immediately.** Routines with insufficient data or high variance fall through to the existing push logic.
- **`deliver` = deliver immediately.** The current time is within or after the window; proceed normally.
- **Max hold bypass uses `overdueSince`.** The `overdueSince` field on the nudge payload is the `currentDueDate` as `YYYY-MM-DD`. If the routine has been overdue for more than 2 days, the window is bypassed entirely.
- **Reminders and planning rituals are unaffected.** The `if (nudge.entityType === 'routine')` guard ensures only routine nudges enter the window evaluation path.
- **In-app nudge tray is unaffected.** The `GET /api/nudges` endpoint and tray display have no completion window logic.

### Verification

- All existing push tests pass (regression).
- Routine nudge with sufficient completion data and current time before window → push not sent, no dedup log entry.
- Same routine, next cycle after window opens → push sent normally.
- Routine with < 4 completions → push sent immediately (no change).
- Reminder nudge → push sent immediately regardless of any routine's completion data.
- Planning ritual nudge → push sent immediately.
- Routine overdue > 2 days → push sent immediately regardless of completion window.

---

## Phase 5: Unit Tests — Completion Window Domain Function

**Outcome:** Comprehensive unit test coverage for `computeCompletionWindow` and `getCurrentLocalHour`.

### 5.1 Add tests to `packages/domain/test/nudges-domain.test.ts`

```ts
describe('computeCompletionWindow', () => {
  // Test 1: Spec example produces correct window
  it('computes correct window for spec example timestamps', () => {
    // Completions at [19:00, 19:30, 20:00, 20:15, 20:30, 21:00, 21:00, 22:00] UTC
    const timestamps = [
      '2026-03-10T19:00:00Z', '2026-03-11T19:30:00Z',
      '2026-03-12T20:00:00Z', '2026-03-13T20:15:00Z',
      '2026-03-14T20:30:00Z', '2026-03-15T21:00:00Z',
      '2026-03-08T21:00:00Z', '2026-03-09T22:00:00Z',
    ];
    // At 18:00 UTC → before window → hold
    const result = computeCompletionWindow(timestamps, 'UTC', 18.0);
    expect(result.decision).toBe('hold');

    // At 19:00 UTC → within window → deliver
    const result2 = computeCompletionWindow(timestamps, 'UTC', 19.0);
    expect(result2.decision).toBe('deliver');
  });

  // Test 2: Fewer than 4 completions → no_window (insufficient_data)
  it('returns no_window when fewer than 4 completions', () => {
    const timestamps = [
      '2026-03-10T19:00:00Z', '2026-03-11T20:00:00Z', '2026-03-12T21:00:00Z',
    ];
    const result = computeCompletionWindow(timestamps, 'UTC', 18.0);
    expect(result).toEqual({ decision: 'no_window', reason: 'insufficient_data' });
  });

  // Test 3: High variance (IQR > 6h) → no_window (high_variance)
  it('returns no_window when completion times span > 6 hour IQR', () => {
    const timestamps = [
      '2026-03-10T02:00:00Z', '2026-03-11T06:00:00Z',
      '2026-03-12T14:00:00Z', '2026-03-13T16:00:00Z',
      '2026-03-14T20:00:00Z', '2026-03-15T22:00:00Z',
      '2026-03-08T08:00:00Z', '2026-03-09T23:00:00Z',
    ];
    const result = computeCompletionWindow(timestamps, 'UTC', 12.0);
    expect(result).toEqual({ decision: 'no_window', reason: 'high_variance' });
  });

  // Test 4: Exactly 4 completions (minimum threshold) → valid window
  it('computes window with exactly 4 completions', () => {
    const timestamps = [
      '2026-03-10T08:00:00Z', '2026-03-11T08:30:00Z',
      '2026-03-12T09:00:00Z', '2026-03-13T09:30:00Z',
    ];
    const result = computeCompletionWindow(timestamps, 'UTC', 6.0);
    expect(result.decision).toBe('hold');
  });

  // Test 5: Current time after window end → deliver
  it('returns deliver when current time is after window end', () => {
    const timestamps = [
      '2026-03-10T08:00:00Z', '2026-03-11T08:30:00Z',
      '2026-03-12T09:00:00Z', '2026-03-13T09:30:00Z',
      '2026-03-14T08:15:00Z', '2026-03-15T09:15:00Z',
    ];
    const result = computeCompletionWindow(timestamps, 'UTC', 12.0);
    expect(result.decision).toBe('deliver');
  });

  // Test 6: Timezone conversion — same UTC timestamps produce different hours
  it('respects timezone for hour extraction', () => {
    // 19:00 UTC = 14:00 America/New_York (EST, -5)
    const timestamps = [
      '2026-03-10T19:00:00Z', '2026-03-11T19:30:00Z',
      '2026-03-12T20:00:00Z', '2026-03-13T20:30:00Z',
    ];
    // At 13:00 New York time → before window (window opens ~13:00-13:15 area)
    // The window in NY time is roughly [14:00 - 1h buffer, 15:30] = [13:00, 15:30]
    const result = computeCompletionWindow(timestamps, 'America/New_York', 12.0);
    expect(result.decision).toBe('hold');
  });

  // Test 7: Empty array → no_window
  it('returns no_window for empty timestamps', () => {
    const result = computeCompletionWindow([], 'UTC', 12.0);
    expect(result).toEqual({ decision: 'no_window', reason: 'insufficient_data' });
  });
});
```

### Verification

- All domain tests pass (`cd packages/domain && npx vitest run`).
- The spec's documented example (AC #14) produces a window opening at approximately 18:30-18:40.

---

## Phase 6: Integration Tests — Scheduler With Completion Windows

**Outcome:** Full scheduler-cycle tests verify that completion windows correctly hold and deliver routine pushes without breaking existing behavior.

### 6.1 Add tests to `apps/api/test/push.test.ts`

Add a new `describe('completion window push timing')` block:

```ts
// Helper: insert completed occurrences for a routine
function insertCompletedOccurrences(
  db: ReturnType<typeof createDatabase>,
  routineId: string,
  completedAtTimes: string[]
) {
  for (const completedAt of completedAtTimes) {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO routine_occurrences (id, routine_id, due_date, completed_at, completed_by, skipped, created_at)
      VALUES (?, ?, ?, ?, 'stakeholder', 0, datetime('now'))
    `).run(id, routineId, completedAt.slice(0, 10), completedAt);
  }
}

describe('completion window push timing', () => {
  // Test 1: Routine with reliable evening window, current time is morning → hold
  it('holds push when current time is before completion window', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T10:00:00Z'); // 10am UTC
    insertOverdueRoutine(db, 'r1', 'Evening cleanup', '2026-03-14T08:00:00Z');
    // Evening completion pattern: 19:00-21:00 UTC
    insertCompletedOccurrences(db, 'r1', [
      '2026-03-07T19:00:00Z', '2026-03-08T19:30:00Z',
      '2026-03-09T20:00:00Z', '2026-03-10T20:15:00Z',
      '2026-03-11T20:30:00Z', '2026-03-12T21:00:00Z',
      '2026-03-06T21:00:00Z', '2026-03-05T22:00:00Z',
    ]);
    repository.savePushSubscription('https://push.example.com/sub', 'key', 'auth');

    await evaluateNudgePushRule(repository, push, config, makeLogger(), now);
    expect(push.sends).toHaveLength(0); // held — before window
  });

  // Test 2: Same routine, current time within window → deliver
  it('delivers push when current time is within completion window', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T19:30:00Z'); // 7:30pm UTC — within window
    insertOverdueRoutine(db, 'r1', 'Evening cleanup', '2026-03-14T08:00:00Z');
    insertCompletedOccurrences(db, 'r1', [
      '2026-03-07T19:00:00Z', '2026-03-08T19:30:00Z',
      '2026-03-09T20:00:00Z', '2026-03-10T20:15:00Z',
      '2026-03-11T20:30:00Z', '2026-03-12T21:00:00Z',
      '2026-03-06T21:00:00Z', '2026-03-05T22:00:00Z',
    ]);
    repository.savePushSubscription('https://push.example.com/sub', 'key', 'auth');

    await evaluateNudgePushRule(repository, push, config, makeLogger(), now);
    expect(push.sends).toHaveLength(1); // delivered
  });

  // Test 3: Routine with < 4 completions → immediate delivery (no window)
  it('delivers immediately when routine has fewer than 4 completions', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T06:00:00Z'); // 6am — would be held if window existed
    insertOverdueRoutine(db, 'r1', 'New routine', '2026-03-14T08:00:00Z');
    insertCompletedOccurrences(db, 'r1', [
      '2026-03-07T20:00:00Z', '2026-03-08T20:30:00Z', // only 2 completions
    ]);
    repository.savePushSubscription('https://push.example.com/sub', 'key', 'auth');

    await evaluateNudgePushRule(repository, push, config, makeLogger(), now);
    expect(push.sends).toHaveLength(1); // delivered — insufficient data for window
  });

  // Test 4: Reminder nudge → immediate delivery regardless of any windows
  it('delivers reminder nudge immediately regardless of completion windows', async () => {
    // (Reminders don't go through window evaluation — entityType check)
    // Insert an approaching reminder
    const push = createMockPush();
    const now = new Date('2026-03-15T06:00:00Z');
    // Insert reminder due in 2 hours (approaching)
    db.prepare(`
      INSERT INTO reminders (id, title, owner, scheduled_at, created_at, updated_at)
      VALUES ('rem1', 'Call dentist', 'stakeholder', ?, datetime('now'), datetime('now'))
    `).run(new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString());
    repository.savePushSubscription('https://push.example.com/sub', 'key', 'auth');

    await evaluateNudgePushRule(repository, push, config, makeLogger(), now);
    expect(push.sends).toHaveLength(1); // delivered immediately
  });

  // Test 5: Routine overdue > 2 days → bypass window and deliver immediately
  it('bypasses window when routine overdue > 2 days', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T06:00:00Z'); // 6am — before any evening window
    // Overdue since March 12 → 3 days overdue
    insertOverdueRoutine(db, 'r1', 'Evening cleanup', '2026-03-12T08:00:00Z');
    insertCompletedOccurrences(db, 'r1', [
      '2026-03-04T19:00:00Z', '2026-03-05T19:30:00Z',
      '2026-03-06T20:00:00Z', '2026-03-07T20:15:00Z',
      '2026-03-08T20:30:00Z', '2026-03-09T21:00:00Z',
      '2026-03-03T21:00:00Z', '2026-03-02T22:00:00Z',
    ]);
    repository.savePushSubscription('https://push.example.com/sub', 'key', 'auth');

    await evaluateNudgePushRule(repository, push, config, makeLogger(), now);
    expect(push.sends).toHaveLength(1); // delivered — max hold bypass
  });

  // Test 6: Held nudge does NOT create a dedup log entry
  it('does not create dedup log entry for held nudges', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T10:00:00Z');
    insertOverdueRoutine(db, 'r1', 'Evening cleanup', '2026-03-14T08:00:00Z');
    insertCompletedOccurrences(db, 'r1', [
      '2026-03-07T19:00:00Z', '2026-03-08T19:30:00Z',
      '2026-03-09T20:00:00Z', '2026-03-10T20:15:00Z',
      '2026-03-11T20:30:00Z', '2026-03-12T21:00:00Z',
      '2026-03-06T21:00:00Z', '2026-03-05T22:00:00Z',
    ]);
    repository.savePushSubscription('https://push.example.com/sub', 'key', 'auth');

    await evaluateNudgePushRule(repository, push, config, makeLogger(), now);
    const logCount = (db.prepare('SELECT COUNT(*) as cnt FROM push_notification_log').get() as { cnt: number }).cnt;
    expect(logCount).toBe(0); // no log entry for held nudge
  });

  // Test 7: Regression — all existing push tests still pass
  // (This is verified by running the full test suite, not a separate test case)
});
```

### 6.2 Update `createConfig` helper in push.test.ts

Add `householdTimezone: 'UTC'` to the test config factory so the completion window uses UTC for test determinism.

### Verification

- All new integration tests pass.
- All existing push tests pass (regression).
- Full test suite green: `cd apps/api && npx vitest run`.

---

## Phase 7: Verification and Milestone Update

**Outcome:** All acceptance criteria are verified, milestone progress is updated.

### 7.1 Acceptance criteria verification matrix

| AC # | Criterion | Verified By |
|------|-----------|-------------|
| 1 | Routine nudge with ≥ 4 completions + before window → not delivered | Integration test 1 |
| 2 | Same nudge, next cycle within window → delivered | Integration test 2 |
| 3 | Routine with < 4 completions → immediate delivery | Integration test 3 |
| 4 | Reminder nudge → immediate delivery | Integration test 4 |
| 5 | Planning ritual nudge → immediate delivery | Scheduler guard (`entityType === 'routine'`); extend test 4 pattern |
| 6 | Window computed from `completedAt` only; `skippedAt` excluded | Repository query `WHERE skipped = 0` |
| 7 | IQR > 6h → immediate delivery | Unit test 3 |
| 8 | 1-hour lead buffer before Q1 | Unit test 1 (window start ≈ Q1 - 1) |
| 9 | Overdue > 2 days → bypass window | Integration test 5 |
| 10 | No dedup log for held nudges | Integration test 6 |
| 11 | In-app nudge tray unaffected | No code changes to `GET /api/nudges` or tray component |
| 12 | No new tables or columns | No migration file in this plan |
| 13 | All existing push tests pass | Regression test suite |
| 14 | Spec example produces ≈ 18:30 window | Unit test 1 |

### 7.2 Update milestones.md

Update M26 progress notes to reflect implementation plan completion:

```
Progress notes:
- Feature spec drafted and approved (OLI-79, D-048): `docs/specs/completion-window-push-timing.md`
- Implementation plan complete (OLI-80): `docs/plans/completion-window-push-timing-implementation-plan.md`
  — 7 phases, 5 open questions resolved as architecture decisions, 14 acceptance criteria mapped to tests
```

### 7.3 Update decision history

Add a decision entry for the implementation plan completion (D-049) documenting the 5 resolved open questions.

---

## Implementation Sequence and Phase Gates

| Phase | Artifact | Verify Before Moving On |
|-------|----------|------------------------|
| 1 | Constants in `@olivia/contracts`, type, config field | Contracts + config compile cleanly |
| 2 | `computeCompletionWindow` in `@olivia/domain` | Domain compiles; manual verification of spec example |
| 3 | `getRoutineCompletionTimestamps` in repository | Repository compiles; query returns expected results |
| 4 | Modified `evaluateNudgePushRule` in `jobs.ts` | All existing push tests still pass |
| 5 | Unit tests in `nudges-domain.test.ts` | All 7+ domain tests pass |
| 6 | Integration tests in `push.test.ts` | All 7+ integration tests pass; full suite green |
| 7 | Milestone + decision history updates | Docs updated; M26 exit criteria satisfied |
