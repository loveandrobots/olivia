# Feature Spec: Proactive Household Nudges

## Status
- CEO-approved (D-039, 2026-03-15)

## Summary

Proactive household nudges is the second Horizon 5 (Selective Trusted Agency) feature. When household items cross a time threshold — an overdue routine occurrence, an approaching reminder deadline, or an overdue planning ritual — Olivia surfaces a visible nudge inside the app and optionally a push notification. The household member responds directly from the nudge: marking a routine done, snoozing or completing a reminder, or opening the planning ritual review flow. This is Olivia-initiated but advisory: Olivia proposes, the user acts. No record changes execute without an explicit user action tap.

## User Problem

Household members currently have to remember to check Olivia. If a routine goes overdue or a reminder approaches, Olivia does not reach out — the household member only discovers the gap during their next scheduled review or when they happen to open the relevant screen. This passive model places the full monitoring burden on the household. Proactive nudges shift this: Olivia notices time-sensitive items and brings them forward at the right moment, reducing the mental overhead of keeping track of states across multiple workflow types.

## Target Users

- Primary user: stakeholder (household primary operator)
- Secondary user: spouse — receives the same household nudges in Phase 1 (no household-member-specific targeting)
- Future users: not relevant for Phase 1

## Desired Outcome

Household members should be able to trust that Olivia will surface the most time-sensitive household items when they are approaching or past due — without the household member having to check proactively. A nudge that leads to a routine completion, reminder resolution, or ritual kickoff in a single interaction is a success. Over time, overdue backlogs should be shorter because nudges interrupt item drift before it accumulates.

## In Scope

- In-app nudge cards inside the PWA for three event types:
  - Overdue routine occurrence: `currentDueDate` is in the past, occurrence not yet completed or skipped
  - Approaching reminder deadline: reminder `dueDate` is within the configured threshold (default 24 hours) and reminder is not yet resolved
  - Overdue planning ritual occurrence: a routine with `ritualType = 'planning'` where `currentDueDate` is in the past
- Per-nudge action buttons appropriate to the workflow type:
  - Routine nudge: "Mark done" (complete the occurrence) and "Skip" (advance to the next due date)
  - Reminder nudge: "Done" (resolve the reminder) and "Snooze" (defer the due date by the configured snooze interval)
  - Planning ritual nudge: "Start review" (open the review flow for the overdue ritual occurrence)
- Nudge dismiss affordance: the household member can dismiss a nudge without taking action; dismissed nudges do not recur within the same calendar day for the same item
- Nudge priority ordering: planning ritual overdue > reminder approaching or overdue > routine overdue; within each tier, oldest overdue first
- Nudge deduplication: at most one active nudge per (entityType, entityId) pair at any time
- `GET /api/nudges` endpoint: returns the current list of active nudge payloads, computed from existing entity state, no new tables
- Client-local dismiss tracking: dismissed nudge state stored in the Dexie client store, daily-reset, not server-synced in Phase 1

## Boundaries, Gaps, And Future Direction

**Not in scope for Phase 1:**
- Push notifications (in-app push via PWA Service Worker + device push token management). Push is Phase 2 — in-app nudges are sufficient to validate the concept. See Open Question 1.
- Nudge preference settings per household member (quiet hours, opt-out per category). Phase 2.
- Nudge history or notification audit log. Phase 2.
- AI-enhanced nudge timing or prioritization based on observed household patterns. Phase 2 / H5 Phase 2+ per D-034.
- Smart snooze intervals (adapting snooze duration based on past behavior). Phase 2.
- Non-time-based nudges (e.g., "you haven't updated your grocery list this week"). Phase 2.
- Household-member-specific nudge targeting (different nudges for primary vs. spouse). Phase 2.

**Known gaps acceptable in Phase 1:**
- Nudge polling depends on connectivity. If the device is offline, nudge state is not refreshed. The app remains functional; nudge tray shows the last-polled state or no nudges.
- Stale nudges may appear if an item is resolved on another device before the client's next sync. Resolution: after sync, the resolved item drops off the nudge list on the next poll.
- The nudge tray does not show count badges or deep notification summaries — in-app card display only.
- Phase 1 nudges are household-wide (not household-member-scoped), consistent with all other Phase 1 Olivia surfaces.

**Likely future direction:**
- Push notifications with server-side scheduling for time-sensitive item types.
- Nudge preference controls: per-category toggles, quiet hours, frequency caps.
- Nudge history accessible from activity history or a dedicated notification surface.
- AI-driven timing: Olivia nudges based on when the household member is most responsive, learned from past interaction patterns.

## Workflow

### In-App Nudge Flow

1. The PWA polls `GET /api/nudges` on a regular interval (Founding Engineer decision, e.g., every 15 minutes while the app is in the foreground).
2. If active nudges are returned, the PWA renders nudge cards in the nudge tray (designer decision for the exact placement — persistent banner, tray, or overlay area).
3. Each nudge card shows:
   - Item name and workflow type icon
   - Triggering condition ("Overdue since Monday", "Due in 2 hours", "Weekly review overdue")
   - Action buttons appropriate to the workflow type (see In Scope above)
   - Dismiss affordance (swipe or small X tap)
4. The household member taps an action:
   - Routine "Mark done" → calls existing `POST /api/routines/:id/complete-occurrence`; nudge removed from tray
   - Routine "Skip" → calls existing skip-occurrence endpoint; nudge removed from tray
   - Reminder "Done" → calls existing reminder resolution endpoint; nudge removed from tray
   - Reminder "Snooze" → advances the reminder `dueDate` by the configured snooze interval; nudge removed from tray (will resurface after the new threshold is crossed)
   - Planning ritual "Start review" → navigates to the review flow for the overdue ritual occurrence; nudge removed from tray when the review flow completes
5. If the household member dismisses without acting, the nudge is removed from the tray for the rest of the day. The item state is unchanged.

### Next Poll Reconciliation

After any action or dismiss, the nudge list is refreshed from the API (or updated locally based on the action taken). Items that were completed, resolved, or skipped no longer appear in subsequent poll responses.

## Behavior

**Nudge trigger logic (server-side, computed in `GET /api/nudges`):**

- **Routine occurrence overdue:** `routine_occurrences.currentDueDate < today` AND occurrence is not yet marked complete or skipped. One nudge per occurrence — if the same occurrence is overdue for multiple days, it still generates one nudge.
- **Reminder approaching deadline:** `reminders.dueDate` is within the configured threshold (default: 24 hours from now) AND reminder is not yet resolved, dismissed, or cancelled.
- **Planning ritual overdue:** `routines.ritualType = 'planning'` AND `currentDueDate < today` AND the ritual occurrence is not yet completed.

**Nudge deduplication:**
- The `GET /api/nudges` endpoint returns at most one nudge per (entityType, entityId) pair.
- Server-side: no state stored for deduplication — the endpoint is purely computed from entity state. If an item is still overdue or approaching, it appears; if resolved, it does not.
- Client-side: dismissed nudge state is tracked in the Dexie client store as a set of `{entityType, entityId, dismissedDate}` entries. On each poll response, nudges matching a dismissed-today entry are filtered out before display.

**Nudge priority ordering:**
1. Planning ritual overdue (compound effect on household awareness — ritual anchors the whole review loop)
2. Reminder approaching or overdue
3. Routine overdue
Within each tier: oldest overdue first (earliest `currentDueDate` or `dueDate`).

**Maximum simultaneously displayed nudges:** Founding Engineer decision (recommendation: cap at 5 in the nudge tray; if more are active, show the 5 with highest priority and a count indicator "+ N more"). This prevents the tray from becoming overwhelming if a long backlog exists.

**Record changes from nudge actions:**
- All action endpoints are existing endpoints already used in the PWA. No new write paths required.
- "Skip" on a routine occurrence: uses the existing skip endpoint, which advances `currentDueDate` to the next scheduled occurrence.
- "Snooze" on a reminder: advances `dueDate` by the configured interval (Founding Engineer decision, recommendation: 1 hour). The implementation should reuse or extend the existing reminder update path rather than creating a new endpoint.

**Dismiss behavior:**
- Dismiss state is purely client-local. It is not sent to the server.
- Dismiss entries are keyed by `{entityType, entityId, dismissedDate}`. On each subsequent day, the dismiss entry is stale and the nudge resurfaces if the item is still outstanding.
- Dismiss state is not synced across devices in Phase 1. A dismissed nudge on one device still appears on a spouse's device.

## Data And Memory

**New API endpoint:**
- `GET /api/nudges` — returns a list of active nudge payloads for the household, computed from existing entity state. No new tables required. Response shape: an array of nudge objects with fields: `entityType` ('routine' | 'reminder' | 'planningRitual'), `entityId`, `entityName`, `triggerReason`, `overdueSince` (ISO date, optional), `dueAt` (ISO datetime, optional). Founding Engineer defines the full contract.

**No new server-side tables in Phase 1.** The `GET /api/nudges` response is computed on demand from:
- `routine_occurrences` (currentDueDate, completedAt, skippedAt)
- `reminders` (dueDate, resolvedAt, dismissedAt)
- `routines` (ritualType, to distinguish planning rituals)

**Client-local dismiss state:**
- Stored in Dexie: a new table or a store-key set, keyed by `{entityType, entityId, dismissedDate}`.
- Not synced to server, not included in the outbox. It is purely session-level client state that resets daily.

**Push subscription storage (deferred to Phase 2):**
- If push notifications are added in Phase 2, device push tokens will require a new `push_subscriptions` table. This is out of scope for Phase 1.

## Permissions And Trust Model

- Proactive nudges are Olivia-initiated (Olivia surfaces them without the household member requesting them), but strictly advisory: no record is modified by the nudge appearing. The nudge is a proposal; the user acts.
- Action taps execute the underlying action immediately (consistent with D-010: non-destructive user-initiated actions execute immediately). The action endpoints are the same ones already used in the PWA with the same trust semantics.
- "Skip" on a routine: although it has state implications (advances the occurrence), this is not destructive — it is the normal skip behavior already available in the routine index. Executes immediately on tap.
- "Snooze" on a reminder: defers the due date forward. Not destructive. Executes immediately on tap.
- Dismiss without action: no record change. Client-only state update.
- **What Olivia must never do in this workflow:**
  - Mark an occurrence complete or skip it without an explicit user tap on the nudge action button.
  - Dismiss a reminder without the user tapping "Done."
  - Modify any reminder's `dueDate` without a user-initiated "Snooze" tap.
  - Generate multiple simultaneous nudges for the same item on the same day.
  - Send push notifications without explicit household member push permission grant (Phase 2).
  - Surface nudges for items that have already been completed, resolved, or skipped.

## AI Role

- No AI involvement in Phase 1 proactive nudges. Trigger logic is entirely deterministic: overdue state and time thresholds derived from existing entity fields.
- This is intentionally distinct from H5 Phase 1 (AI-Assisted Content). Nudges are rule-based, not model-generated.
- **Future AI extension (Phase 2+):** smart timing of nudges based on observed household activity patterns; smarter prioritization based on past resolution behavior. This must be introduced behind the D-008 provider adapter boundary.
- Parts of the workflow that must not depend on AI to remain correct: all trigger logic, all action endpoints, all record state changes, all dismiss tracking.

## Risks And Failure Modes

- **Nudge fatigue:** if overdue items accumulate (e.g., the household has skipped several weeks of routines), the nudge tray could show many items at once. Mitigation: priority ordering, maximum display cap, same-day dismiss deduplication. Long-term mitigation: Phase 2 nudge frequency controls and quiet-hours settings.
- **Stale nudge after cross-device resolution:** if an item is completed on another device before the current device's next sync, the nudge may briefly appear for an already-resolved item. Mitigation: nudge action taps check current item state before executing; stale nudges resolve after the next poll cycle. This is an acceptable Phase 1 gap.
- **Network dependency:** `GET /api/nudges` requires connectivity. If offline, nudge data is not refreshed. The app must work fully without the nudge endpoint — the tray can show an empty or stale state. Nudge absence must not cause errors or degrade the core app surfaces.
- **Polling interval too aggressive:** if the PWA polls too frequently, it increases background API load and battery drain on mobile. Mitigation: Founding Engineer decision on polling interval; polling should pause when the app is backgrounded or the screen is off (PWA visibility API or equivalent).
- **Routine "Skip" misuse:** if a nudge surface makes "Skip" too easy to tap accidentally, household members may skip occurrences without meaning to. Mitigation: clear button labeling, sufficient tap target separation between "Mark done" and "Skip," and the existing skip behavior already available elsewhere in the app.

## UX Notes

- Nudges should feel like a quiet, helpful tap on the shoulder — not an alarm or a badge of shame for overdue items.
- Tone for nudge copy: calm, household-appropriate, non-judgmental ("Your morning routine is overdue" not "You missed your morning routine again").
- The nudge tray placement is a designer decision for the visual spec. Candidates: a persistent strip at the top of the home screen, a dedicated "Nudges" section in the home screen, or a floating card above the bottom navigation.
- Action buttons must be large enough for easy mobile tapping without misfire between adjacent options ("Mark done" and "Skip").
- Dismiss affordance: swipe-to-dismiss or a small X. Should not require a confirmation dialog — dismiss is non-destructive.
- Planning ritual nudges should feel more prominent than routine or reminder nudges. The planning ritual is a synthesis moment — surfacing it proactively has more household impact than surfacing a single routine.
- Nudge count indicator in navigation (e.g., a badge on the home tab or a persistent nudge icon) helps members know nudges exist without requiring them to see the tray immediately. Designer decision.
- Empty nudge state: if no nudges are active, the nudge area should not be present or should show nothing — not an empty state message. The absence of nudges is the normal state.
- Anti-patterns to avoid:
  - Showing all overdue items in the nudge tray at once without priority filtering — cap at 5 with "+ N more."
  - Requiring a confirmation dialog before executing a routine "Mark done" tap — this defeats the fast-resolution purpose of nudges.
  - Surfacing nudges on screens where they are contextually irrelevant (e.g., a list-editing screen) — nudges are most useful on or near home and summary screens.
  - Auto-completing items if the user has dismissed a nudge three times — automation is explicitly out of scope in Phase 1.

## Acceptance Criteria

1. `GET /api/nudges` returns active nudge payloads for overdue routine occurrences, approaching reminder deadlines, and overdue planning ritual occurrences, computed from existing entity state.
2. The API returns an empty list when no items meet the nudge trigger conditions.
3. The PWA polls `GET /api/nudges` periodically while the app is in the foreground and displays nudge cards for active nudges.
4. Each routine nudge displays the routine name, triggering condition, and two action buttons: "Mark done" and "Skip."
5. Each reminder nudge displays the reminder title, triggering condition, and two action buttons: "Done" and "Snooze."
6. Each planning ritual nudge displays the ritual name, triggering condition ("Weekly review overdue" or equivalent), and one action button: "Start review."
7. Tapping "Mark done" on a routine nudge completes the occurrence via the existing completion endpoint and removes the nudge from the tray.
8. Tapping "Skip" on a routine nudge skips the occurrence via the existing skip endpoint and removes the nudge from the tray.
9. Tapping "Done" on a reminder nudge resolves the reminder and removes the nudge from the tray.
10. Tapping "Snooze" on a reminder nudge advances the reminder `dueDate` by the configured snooze interval and removes the nudge from the tray.
11. Tapping "Start review" on a planning ritual nudge opens the review flow for the overdue ritual occurrence.
12. The household member can dismiss any nudge without taking action; the dismissed nudge does not reappear for the same item for the rest of that calendar day.
13. Dismissed nudge state is stored client-locally; it is not sent to the server.
14. At most one nudge is shown per (entityType, entityId) pair in the nudge tray at any time.
15. Nudges are displayed in priority order: planning ritual overdue first, then reminder approaching or overdue, then routine overdue; within each tier, oldest overdue first.
16. If the device is offline, the nudge endpoint is not polled; the app remains fully functional with no nudge-related errors.
17. No record changes execute without an explicit user action tap — nudge appearance alone modifies no household state.
18. Nudges do not appear for items that are already completed, resolved, or skipped.

## Validation And Testing

**Household validation:**
- After shipping, observe whether overdue backlogs are shorter (items addressed sooner after going overdue) compared to the pre-nudge baseline.
- Track dismiss rate vs. action rate per nudge type. High dismiss rates on routine nudges may indicate fatigue; high dismiss rates on planning ritual nudges may indicate the ritual cadence is wrong.
- Observe whether the planning ritual nudge improves completion regularity of the weekly review.
- If the nudge tray frequently hits the display cap ("+ N more"), investigate whether routine overdue backlogs are a product problem to surface to the household rather than a nudge-engineering problem.

**Unit tests:**
- `GET /api/nudges`: given overdue routines, approaching reminders, and overdue rituals, returns the expected nudge payloads in priority order.
- `GET /api/nudges`: given no overdue items, returns an empty list.
- `GET /api/nudges`: given a resolved item, it does not appear in the nudge list.
- `GET /api/nudges`: same (entityType, entityId) does not appear twice.
- Approaching reminder threshold: reminder due in 23 hours triggers nudge; reminder due in 25 hours does not (given a 24-hour default threshold).
- Planning ritual nudge: a routine with `ritualType = 'planning'` and `currentDueDate < today` appears; a standard routine with `currentDueDate < today` appears as a routine nudge (not a ritual nudge).

**Integration tests:**
- Routine completion via nudge: nudge appears for overdue occurrence; user taps "Mark done"; occurrence is marked complete; next poll shows nudge is gone.
- Reminder snooze via nudge: nudge appears for approaching reminder; user taps "Snooze"; `dueDate` advances; nudge is removed from tray; nudge does not reappear until the new threshold is crossed.
- Planning ritual nudge navigation: overdue ritual occurrence surfaces ritual nudge; tapping "Start review" navigates to the review flow; completing the review removes the nudge.
- Dismiss and re-appearance: nudge dismissed; same nudge does not reappear within the same calendar day; reappears on the next day if item is still outstanding.
- Stale nudge resolution: item completed on server (simulating another device); next poll response excludes the item; nudge tray updates correctly.

**Manual validation:**
- Nudge cards display correctly on mobile screen sizes with readable action buttons.
- "Mark done" and "Skip" buttons are clearly separated and tappable without misfire.
- Dismiss affordance works correctly (swipe or X tap).
- Nudge priority ordering is visually correct in the tray.
- Nudge tray is empty when no items are overdue.
- App remains fully functional when offline (no nudge-related errors or crashes).

## Dependencies And Related Learnings

- L-023: H5 Phase 1 validated the advisory-only AI integration pattern — the same trust model applies to nudges: Olivia initiates, user confirms before any record change.
- L-021: H4 temporal layer creates the AI and nudge input foundation; the `currentDueDate` and `dueDate` fields are the nudge timing signals.
- D-034: M15 complete; proactive household nudges is the second H5 target, sequenced after Phase 1 AI-content validation. D-034 explicitly sequenced nudges after AI-assisted summaries because push notification infrastructure was not yet validated.
- D-002: Advisory-only trust model. No record changes without user-initiated action.
- D-010: Non-destructive user-initiated actions execute immediately. All nudge actions (mark done, skip, done, snooze) execute immediately on tap.
- D-008: If AI is added to nudge timing or prioritization in Phase 2, the provider adapter boundary must be respected.
- Depends on: `docs/specs/recurring-routines.md` — routine occurrence model, `currentDueDate`, complete and skip endpoints
- Depends on: `docs/specs/first-class-reminders.md` — reminder `dueDate`, resolution semantics, and any existing snooze behavior
- Depends on: `docs/specs/planning-ritual-support.md` — planning ritual occurrence model, `ritualType`, review flow navigation

## Open Questions

1. **Phase 1 scope: in-app only or in-app + push?** Should Phase 1 include push notifications (PWA Service Worker push, device token storage, server-side scheduling) or focus entirely on in-app nudges? **Recommendation: Phase 1 = in-app nudges only. Push adds significant infrastructure (token storage, server-side scheduling, platform permission flows) that should be validated separately after confirming the household finds nudges useful at all.** Founding Engineer and CEO to confirm.

2. **Snooze interval:** What should the default snooze duration be for reminders? **Recommendation: 1 hour.** The household member is typically snoozing because they are in the middle of something. This is a Founding Engineer decision and should be an API-level constant rather than hardcoded.

3. **Approaching reminder threshold:** How many hours before a reminder's due date should a nudge surface? **Recommendation: 24 hours.** Enough notice to act without triggering nudges too early. Founding Engineer decision; configurable constant.

4. **Maximum simultaneous nudge display cap:** How many nudges should be shown in the tray at once before collapsing to "+ N more"? **Recommendation: 5.** Prevents the tray from becoming a stress-inducing backlog view. Designer decision for visual spec.

5. **Snooze for planning ritual nudges:** Should the planning ritual nudge offer a snooze action in addition to "Start review"? **Recommendation: no snooze for planning ritual in Phase 1.** The planning ritual due date is already a weekly cadence — if the household member doesn't want to do it now, they can dismiss the nudge. Snooze for rituals is a Phase 2 consideration if dismiss-rate data suggests it is needed.

## Facts, Assumptions, And Decisions

**Facts:**
- `routine_occurrences.currentDueDate` exists and is the canonical due-state field for all routine types including planning rituals.
- `reminders.dueDate` exists; reminder resolution endpoint is built.
- `routines.ritualType` exists, introduced in M14.
- All action endpoints (complete-occurrence, skip-occurrence, reminder resolution, ritual review flow) are built and stable.

**Assumptions:**
- Household members find in-app nudges sufficient for Phase 1; push notifications are not needed immediately to validate whether nudges change household behavior.
- A 24-hour reminder threshold and daily-reset dismiss deduplication are appropriate for a household context — not so aggressive as to be fatiguing.
- The `GET /api/nudges` endpoint can be computed efficiently on demand from existing entity state without new tables or indexes. If performance is a concern, the Founding Engineer can add a targeted index (Founding Engineer decision).

**Decisions:**
- Phase 1 = in-app nudges only. Push notification support is explicitly Phase 2.
- No new server-side tables in Phase 1. Nudge payloads are computed from existing entities.
- `GET /api/nudges` is a read-only computed endpoint. No new write paths.
- Nudge dismiss state is client-local, daily-reset, not server-synced.

## Deferred Decisions

- Push notification implementation (device token storage, server-side scheduling, platform permission flows) — Phase 2.
- Nudge preference settings per household member (quiet hours, per-category opt-out) — Phase 2.
- AI-enhanced nudge timing and prioritization — Phase 2 / H5 Phase 2+ per D-034.
- Nudge audit log or notification history surface — Phase 2.
- Exact visual design for the nudge card, nudge tray placement, dismiss affordance, and navigation count badge — designer decision for the visual spec.
- Exact polling interval for `GET /api/nudges` — Founding Engineer decision in the implementation plan.
- Snooze interval constant (recommendation: 1 hour) — Founding Engineer decision.
- Approaching reminder threshold constant (recommendation: 24 hours) — Founding Engineer decision.
- Maximum nudge display cap (recommendation: 5) — Founding Engineer decision.
- Snooze affordance for planning ritual nudges — Phase 2 pending dismiss-rate data.
