# Feature Spec: Data Freshness & Gentle Review

## Status
- Approved by CEO (D-058, 2026-03-17)
- **Implemented** (D-059, 2026-03-17). All 20 acceptance criteria pass. 57 tests across domain and API. Commits: e65ca4e, f15cb6a.

## Summary
Olivia currently detects staleness only for inbox items (14-day threshold). Every other workflow type — routines, reminders, shared lists, and meal plans — can silently drift from household reality with no detection or prompt. This spec extends staleness detection to all five workflow types, adds a monthly household health check surface, and introduces freshness nudges through the existing H5 nudge infrastructure. The goal: household data stays meaningfully accurate over weeks and months without overburdening the user with check-ins.

This is Phase 2 of the Improved Onboarding & Data Freshness feature (Phase 1 conversational onboarding shipped and validated, D-057).

## User Problem
- **Data drift is invisible**: After initial setup (now easier with Phase 1 onboarding), household reality changes constantly. Routines shift, reminders become irrelevant, lists go stale. If Olivia's data drifts from reality, the app becomes unreliable and eventually a burden.
- **No detection beyond inbox**: Only inbox items have staleness detection today (14-day `lastStatusChangedAt` threshold, A-004). A routine that hasn't been completed in months, a reminder from two weeks ago still marked pending, or a grocery list untouched for six weeks generate no signal.
- **Manual audit is a non-starter**: Asking the user to periodically review everything defeats the purpose of a household command center. The system should surface what needs attention, not require the user to go looking.

## Target Users
- Primary user: stakeholder (household primary operator)
- Secondary user: spouse (benefits from accurate shared state; sees the same nudges in Phase 1)

## Desired Outcome
- The household can trust that Olivia will gently surface items that may have drifted from reality
- Stale items are addressed with minimal friction — a single tap to confirm "still active" or archive
- The monthly health check feels like a quick pulse (under 2 minutes), not an audit
- Nudge frequency feels helpful, not nagging — the system errs on the side of calm

## In Scope

### Extended Staleness Detection
Per-type freshness rules that flag items when they cross a time threshold:

| Workflow type | Staleness rule | Threshold |
|---|---|---|
| Inbox items | No status change since `lastStatusChangedAt` | 14 days (existing, unchanged) |
| Routines | No occurrence completed in N× the recurrence interval | 2× interval (e.g., 14 days for a weekly routine) |
| Reminders | Active reminder with `scheduledAt` in the past and state still `pending` | 7 days past due |
| Shared lists | No list modification (item added/checked/unchecked) and unchecked items remain | 30 days since last modification |
| Meal plans | Current week has no meal plan entries and the user has previously used meal planning | 1 week with no entries (only if prior usage exists) |

Each entity gets a new nullable `freshnessCheckedAt` timestamp. When the user confirms "still active" via a nudge or health check, this timestamp is updated, resetting the freshness clock for that entity. The staleness rule checks `freshnessCheckedAt` first; if null, falls back to the type-specific activity timestamp.

### Monthly Household Health Check
A dedicated review surface that appears on the home screen once per month:

1. **Trigger**: A health check card appears on the home screen when ≥30 days have elapsed since the last completed health check (or since first app use, if no check has occurred).
2. **Card copy**: "Monthly check-up — want to make sure everything's still accurate?" Tapping opens the health check screen.
3. **Health check screen**: Shows items flagged as potentially stale across all five workflow types, grouped by type. For each item:
   - Item title and workflow type indicator
   - Last activity date (human-readable relative time: "Last completed 3 weeks ago")
   - One-tap actions: **"Still active"** (resets freshness clock) / **"Archive"** (archives or pauses the item, type-appropriate)
   - Optional: **"Update"** deep-link to the item's edit screen
4. **Item cap**: Maximum 10 items per health check. If more than 10 items are stale, show the 10 oldest and a "and N more — we'll catch those next time" note. This prevents the check from feeling like an audit.
5. **Completion state**: When all items are reviewed, show "All caught up!" with a brief celebration moment. The health check card disappears from the home screen.
6. **Dismissal**: The user can dismiss the health check card without opening it. It will not reappear until the next monthly cycle.
7. **Partial completion**: If the user opens the health check but doesn't review all items, progress is saved. The card remains on the home screen showing "N items left to review."

### Freshness Nudges
Between monthly health checks, individual items that cross freshness thresholds generate proactive nudges via the existing H5 nudge tray:

1. **New nudge type**: `freshness` — joins the existing `routine`, `reminder`, and `planningRitual` nudge types.
2. **Nudge generation**: `GET /api/nudges` is extended to include freshness nudges. The server evaluates staleness rules for all five workflow types and returns freshness nudge payloads for items that have crossed their threshold.
3. **Nudge copy**: Contextual, calm copy per type:
   - Routine: "Weekly cleaning hasn't been marked done in 3 weeks — still on track?"
   - Reminder: "Pick up dry cleaning was due 10 days ago — still need this?"
   - List: "Grocery list hasn't been updated in 5 weeks — still using it?"
   - Inbox: Uses existing stale item nudge pattern (unchanged)
   - Meal plan: No inline freshness nudges (health-check-only per D-058)
4. **Nudge actions**: Each freshness nudge has two actions:
   - **"Still active"** — resets `freshnessCheckedAt`, removes nudge
   - **"Archive"** / **"Dismiss"** — archives/pauses the item (type-appropriate action), removes nudge
5. **Throttle**: Maximum 2 freshness nudges displayed per day. If more items are stale, they queue for subsequent days or the next health check.
6. **Priority**: Freshness nudges rank below all existing nudge types (routine overdue, reminder approaching, planning ritual overdue). Freshness is informational; the existing types are time-sensitive.
7. **Dismiss behavior**: Consistent with existing nudge dismiss — removed for the rest of the calendar day, client-local.
8. **Push notifications**: Freshness nudges do NOT generate push notifications in Phase 1. They are in-app only. Push is reserved for time-sensitive nudge types.

### "Still Active?" Confirmation Pattern
The core interaction pattern for freshness responses:

1. **Single tap**: "Still active" is always one tap — no confirmation dialog, no edit screen.
2. **Effect**: Updates `freshnessCheckedAt` to `now()` on the entity. The staleness clock resets.
3. **No side effects**: Confirming "still active" does not modify any other entity field. It's a lightweight signal that the item is still relevant.
4. **Archive action**: "Archive" triggers the type-appropriate archival:
   - Inbox item: status → `done`
   - Routine: status → `paused`
   - Reminder: state → `cancelled`
   - Shared list: (archive the list — mark as inactive)
   - Meal plan: no archive action (meal plans are weekly and ephemeral)
5. **Confirmation for archive**: Archive is a destructive action — show a brief confirmation: "Archive [item name]?" with Cancel / Archive buttons.

## Boundaries, Gaps, And Future Direction

**Not in scope:**
- Adaptive health check frequency (e.g., less frequent if the user always dismisses). Deferred — ship monthly fixed, reassess in 8 weeks per CEO decision.
- AI-generated health check summaries or recommendations. The health check is a simple list review, not an AI surface.
- Per-member freshness preferences (quiet hours, opt-out per category). Phase 2 of nudges (existing deferral).
- Freshness detection for conversation history or onboarding state.

**Known gaps acceptable in Phase 1:**
- The 2× recurrence interval threshold for routines is an assumption (A-004 extended). It may be too aggressive or too lenient — validation will tell.
- Meal plan freshness only triggers if the user has previously used meal planning. Users who haven't touched meal planning won't see freshness nudges for it.
- Health check item cap (10) means highly neglected households may need multiple months to catch up. This is intentional — each check should feel quick.

**Likely future direction:**
- Adaptive frequency based on dismiss/completion ratios
- AI-assisted health check that summarizes what changed and recommends what to archive
- Integration with planning ritual — "your weekly review found 3 stale items"
- Freshness push notifications for high-priority stale items

## Workflow

### Health Check Flow

1. Home screen shows health check card when ≥30 days since last completed check
2. User taps card → health check screen opens
3. Screen shows stale items grouped by workflow type (max 10)
4. For each item, user taps "Still active", "Archive", or "Update"
5. "Still active" → single tap, freshness clock resets, item removed from list
6. "Archive" → confirmation dialog → item archived, removed from list
7. "Update" → navigates to item edit screen; on return, item is removed from check list
8. When all items reviewed → "All caught up!" completion state
9. Health check card disappears; next check in 30 days

### Freshness Nudge Flow

1. `GET /api/nudges` evaluates staleness rules alongside existing nudge rules
2. Freshness nudges returned with priority below existing time-sensitive types
3. Nudge tray renders freshness cards (max 2/day) with "Still active" / "Archive" actions
4. User taps action → entity updated → nudge removed
5. Dismiss → nudge hidden for rest of calendar day (existing dismiss behavior)

## Behavior

### System Records (Facts)
- Per-entity `freshnessCheckedAt` timestamp (nullable, updated on "still active" confirmation)
- Health check history: `lastHealthCheckOfferedAt`, `lastHealthCheckCompletedAt` (household-level, persisted locally)
- Health check partial progress: list of reviewed item IDs within the current check session

### Suggestions Olivia Makes (Advisory)
- Health check timing (monthly prompt)
- Staleness flags based on threshold rules
- Freshness nudge copy (contextual per type)

### Actions Olivia Proposes (Require Confirmation)
- Archiving items flagged as stale (always requires confirmation tap)

### Actions That Execute Immediately
- "Still active" confirmation (single tap, non-destructive)
- Health check dismissal (single tap)
- Nudge dismissal (single tap)

## Data And Memory

- `freshnessCheckedAt`: new nullable timestamp column on `inbox_items`, `routines`, `reminders`, `lists`, and `meal_plans` tables
- Health check state: `lastHealthCheckOfferedAt` and `lastHealthCheckCompletedAt` stored in a lightweight `household_settings` or similar table (or as config values in the existing config pattern)
- Health check session progress: local client state (Dexie) — survives app restart but not cross-device
- All data remains local-first per existing architecture
- No sensitive data introduced — freshness timestamps are operational metadata

## Permissions And Trust Model
- This feature remains **advisory-only**
- **Agentic actions** (Olivia surfaces → user confirms): archiving stale items during health check or from nudge
- **User-initiated actions** (direct → immediate): "still active" confirmation, health check dismissal, nudge dismissal
- **Destructive actions** (always confirm): archiving or pausing any item, even from the health check
- **Olivia must never**: auto-archive stale items, skip showing the confirmation for archive actions, or make freshness nudges block normal app usage

## AI Role
- **Nudge copy**: AI may generate contextual nudge text (e.g., incorporating the item name and staleness duration). Falls back to template copy if AI is unavailable.
- **Health check**: No AI involvement in Phase 1. The health check is a simple list review.
- **Staleness detection**: Entirely rule-based. Does not depend on AI. All thresholds are deterministic.

## Risks And Failure Modes
- **Nudge fatigue**: Too many freshness prompts become annoying. Mitigation: hard cap of 2 freshness nudges/day, freshness nudges rank last in priority, monthly health check handles bulk review.
- **Incorrect thresholds**: The 2× recurrence interval for routines or 30-day list threshold may be wrong. Mitigation: thresholds are constants that can be tuned without schema changes. Validation during household use will inform adjustments.
- **Health check feels like a chore**: Mitigation: 10-item cap, under 2 minutes target, skippable, celebration on completion.
- **Archive regret**: User archives something they shouldn't have. Mitigation: confirmation dialog before every archive. Future: undo capability (deferred).
- **Stale item volume**: A household that ignores the app for months could have dozens of stale items. Mitigation: 10-item cap per health check, freshness nudge throttle.

## UX Notes
- Freshness prompts should feel **calm and helpful**, not nagging. The ethos principle "reduce cognitive load, not increase it" is the north star.
- The health check should feel like a **quick pulse**, not an audit. Under 2 minutes is the target.
- "Still active" should be **the easiest action** — one tap, done. Don't make users think about whether to confirm.
- Archive should feel **safe** — always confirm, never irreversible (paused routines can be reactivated, resolved inbox items remain in history).
- The health check card should be **noticeable but not urgent** — it's a monthly housekeeping prompt, not an alarm.

## Acceptance Criteria

### Staleness Detection
1. Routines with no completed occurrence in 2× their recurrence interval are flagged as stale
2. Reminders that are 7+ days past their `scheduledAt` and still `pending` are flagged as stale
3. Shared lists with no modification in 30+ days and unchecked items remaining are flagged as stale
4. Meal plans trigger a freshness prompt when the current week has no entries and the user has prior meal planning history
5. Existing inbox staleness (14-day threshold) continues to work unchanged

### Health Check
6. A health check card appears on the home screen when ≥30 days since last completed check
7. The health check screen shows up to 10 stale items grouped by workflow type
8. Each item has "Still active" / "Archive" / "Update" actions
9. "Still active" resets `freshnessCheckedAt` with a single tap (no confirmation dialog)
10. "Archive" shows a confirmation dialog before executing the type-appropriate archive action
11. Health check can be dismissed from the home screen without opening
12. Partial health check progress is saved across app restarts
13. Completing all items shows "All caught up!" and removes the card

### Freshness Nudges
14. `GET /api/nudges` returns freshness nudges for items that have crossed their staleness threshold
15. Freshness nudges rank below routine, reminder, and planning ritual nudges in priority
16. Maximum 2 freshness nudges are displayed per day
17. Freshness nudges have "Still active" and "Archive" action buttons
18. Freshness nudges do not generate push notifications

### General
19. `freshnessCheckedAt` is a new nullable timestamp on all five entity tables
20. "Still active" confirmation updates `freshnessCheckedAt` without modifying any other entity field

## Validation And Testing
- **Threshold validation**: Run for 4+ weeks after deployment. Observe whether flagged items were genuinely stale. Adjust thresholds if false-positive rate is high.
- **Nudge frequency**: Monitor whether the 2/day cap feels right. If users consistently dismiss freshness nudges, reduce frequency or increase thresholds.
- **Health check completion rate**: Track whether users complete health checks or dismiss them. Low completion rates suggest the check is too long or too frequent.
- **Unit tests**: Staleness threshold calculations for each workflow type; `freshnessCheckedAt` reset logic.
- **Integration tests**: Health check scheduling; nudge generation including freshness type; freshness nudge throttle; nudge priority ordering with mixed types.

## Dependencies And Related Learnings
- Existing H5 nudge infrastructure (M19): `GET /api/nudges`, nudge tray, dismiss behavior, action buttons
- Existing push notification infrastructure (M24): freshness nudges explicitly excluded from push in Phase 1
- Existing inbox staleness (A-004): extended, not replaced
- Phase 1 Onboarding (D-057): shipped — Phase 2 can now proceed
- D-055 (Today-Forward home screen): health check card lives on this surface
- L-024 (computed API pattern): `GET /api/nudges` freshness extension follows the same computed-endpoint pattern

## Resolved Questions

### CEO Decisions (D-058, 2026-03-17)
1. **Health check frequency**: Monthly (30 days). Keeps D-056 decision. Easier to increase frequency later than to walk back something that feels nagging.

2. **Health check item cap**: 10 items. The under-2-minute target is the real constraint; 10 items with single-tap actions clears well under that. If validation shows otherwise, we cut it.

3. **Freshness nudge daily cap**: Separate 2/day cap, not shared with the existing 4-nudge display cap. Freshness nudges are low-urgency informational — separate caps keep both channels clean and prevent crowding out in either direction.

4. **Meal plan freshness**: Health-check-only. No inline freshness nudges for meal plans. Meal planning is optional and weekly — nudging someone who intentionally skipped a week creates false urgency. The monthly health check is the right surface.

5. **"Update" action in health check**: Include the deep-link. Three actions (Still active / Archive / Update) is fine — it's one primary action and two alternatives. The deep-link saves a real navigation step for users who want to edit.

### For Founding Engineer
6. **`freshnessCheckedAt` storage**: Should this be a new column on each entity table, or a separate `freshness_checks` table with (entity_type, entity_id, checked_at)? Separate table avoids schema changes on five tables but adds a join.

7. **Health check state storage**: Local Dexie table, or server-side? Server-side enables cross-device consistency but adds a new table. Local is simpler and consistent with dismiss state pattern.

8. **Staleness computation location**: Should staleness be computed in `GET /api/nudges` (extending the existing endpoint) or a separate `GET /api/freshness` endpoint? Extending nudges keeps the polling model simple; a separate endpoint allows independent refresh intervals.

## Facts, Assumptions, And Decisions
- **Fact**: Staleness detection currently only covers inbox items (14-day threshold).
- **Fact**: The nudge infrastructure (M19) supports multiple nudge types with per-type actions and priority ordering.
- **Fact**: Push notifications (M24) are functional for time-sensitive nudge types.
- **Fact**: Phase 1 onboarding shipped (D-057) — the household now has a way to populate data, making freshness detection meaningful.
- **Assumption**: 2× recurrence interval is the right staleness threshold for routines (extends A-004; needs validation).
- **Assumption**: Monthly health checks are frequent enough to catch drift without feeling nagging (CEO decision from D-056, to be reconfirmed).
- **Assumption**: 2 freshness nudges/day is a good throttle — enough to surface drift, not enough to annoy.
- **Decision**: Freshness nudges do not generate push notifications in Phase 1 — they are in-app only.
- **Decision**: Health check is a simple list review — no AI involvement in Phase 1.
- **Decision**: Archive always requires confirmation (consistent with trust model).

## Deferred Decisions
- Adaptive health check frequency based on completion/dismiss ratios
- AI-assisted health check summaries
- Freshness push notifications
- Per-member freshness preferences
- Undo for archive actions
- Integration of freshness signals into the planning ritual review flow
