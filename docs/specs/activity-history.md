# Feature Spec: Activity History

## Status
- Draft

## Summary

Activity history is a reverse-chronological log of what the household has actually done — completed routines, resolved reminders, past meal plans, and closed inbox items — drawn from all four Horizon 3 workflow types. It is the second Horizon 4 surface and pairs with the unified weekly view to form Olivia's temporal layer: the weekly view shows the present and near future; activity history shows the recent past. The view introduces no new entities — it surfaces the completed or resolved state of existing H3 entities in a cross-workflow chronological context. If it works well, the household should be able to look back at a period and understand what was accomplished, what meals were made, and what routines ran — without trying to reconstruct this from four separate workflow screens.

## User Problem

After four Horizon 3 workflows, Olivia has good visibility into what is open and upcoming but none into what has already happened. To recall what the household accomplished last week, a household member must check each workflow screen individually — and the inbox and reminder screens are generally cleaned up once items are done, making recent history hard to retrieve. There is no single answer to "what did we do this week?" or "what did we eat last Tuesday?" The activity history surface solves this by assembling a unified, time-ordered view of resolved household activity across all workflow types.

## Target Users

- Primary user: stakeholder (household primary operator)
- Secondary user: spouse (read-only view, consistent with all H3 and H4 workflows)
- Future users: not relevant for Phase 1

## Desired Outcome

The household should be able to open a single screen and see a recent record of what was actually done: routines completed, reminders resolved, meals made, inbox items closed. This should enable quick recall ("did we do the weekly cleaning last week?"), reinforce the sense that Olivia tracks household momentum over time, and provide the data foundation for future AI-generated summaries and planning ritual support.

## In Scope

- A reverse-chronological activity log showing the last 30 days of completed and resolved H3 entity activity, grouped by day.
- **Completed recurring routine occurrences:** routine occurrences that were marked complete, shown with routine name, day, and completion time.
- **Resolved reminders:** reminders whose status is `completed` or `dismissed`, shown with reminder title and resolution time.
- **Past meal plan entries:** individual meal entries (breakfast, lunch, dinner) from meal plans whose `week_start_date` is before the current Monday, shown with meal name, day, and plan name.
- **Closed inbox items:** inbox items with `done` status, shown with item title, owner, and completion time.
- **Checked-off shared list items:** individual list items that have been checked off (with a check timestamp), shown with item name and list name. This provides a record of completed shopping runs and checklist work.
- Items grouped by day (most recent day first), within each day ordered reverse-chronologically by completion or resolution time.
- Visual differentiation by workflow type using the same color or icon indicators established in the unified weekly view.
- Tapping any item deep-links to its source workflow screen for full detail (where still accessible).
- An empty-period state when no activity exists in the visible 30-day window.
- Spouse read-only access with the per-screen spouse banner (L-009).
- Offline-tolerant rendering from locally cached H3 state; no new sync primitive is needed.

## Boundaries, Gaps, And Future Direction

**Not in scope for Phase 1:**
- Activity older than 30 days. Phase 1 shows only a rolling 30-day window. Pagination or load-more for older history is deferred.
- AI-generated summaries of what the household accomplished (e.g., "you completed 12 routines last week"). Deferred to a later H4 slice; the Phase 1 view is a structured assembly, not an AI narrative.
- Filtering or search within activity history. The first version shows all workflow types interleaved. Per-type filtering is a likely Phase 2 addition.
- Activity from prior weeks in the unified weekly view. The activity history screen is the dedicated surface for past activity; the weekly view remains anchored to the current week only.
- Editing or re-opening resolved items from the activity history screen. The view is read-only; all writes happen in the source workflow screen.
- Exporting or sharing activity history.
- Routine occurrences that were skipped or overdue without completion — only actually-completed occurrences appear.

**Known gaps acceptable in Phase 1:**
- Inbox items closed before Horizon 3 implementation may not have a precise completion timestamp depending on how the domain layer stores resolution time. The spec assumes a `completed_at` or `closed_at` timestamp is available or can be inferred; this is a Founding Engineer implementation note.
- Dismissed reminders (user explicitly dismissed without completing the underlying work) appear alongside completed reminders. The history does not distinguish between "done" and "dismissed" in Phase 1.
- Checked-off shared list items may generate high volume for households with frequent grocery runs. If this proves noisy in practice, they can be collapsed by list or suppressed by default in a Phase 2 revision.
- Past meal plan entries appear based on the plan's `week_start_date`. If a plan was never populated for a given week, that week has no meal history — this is expected and not shown as a gap.

**Likely future direction:**
- AI-generated period summaries ("last week you completed 8 of 10 scheduled routines and made 14 meals").
- Streak or pattern visualization for recurring routines (how consistently has this routine been completed?).
- Filtering by workflow type for households with high activity volume.
- Load-more or date-picker navigation for history older than 30 days.
- Integration with planning ritual support (the third H4 target): the weekly review ritual auto-populates from activity history rather than requiring manual reconstruction.

## Workflow

1. The household member opens activity history from a navigation entry point — either a dedicated tab, a "History" link within the weekly view, or a secondary nav item.
2. The view loads and shows the last 30 days of completed and resolved activity across all four H3 workflow types.
3. Items are grouped by day (most recent day first), within each day ordered reverse-chronologically.
4. The household member scans recent days to recall what was done: which routines ran, which reminders were addressed, what meals were made, what inbox work was closed.
5. Tapping an item navigates to the source workflow screen for full detail. Completed inbox items navigate to the item detail screen. Completed routines navigate to the routine detail screen. Resolved reminders navigate to the reminder detail screen. Past meal entries navigate to the meal plan day view. Checked-off list items navigate to the list screen.
6. If no activity exists for a day within the 30-day window, that day is not shown (empty days are suppressed, unlike the weekly view where days are always shown).

## Behavior

**Item inclusion rules per workflow type:**

- **Recurring routines:** include any routine occurrence with `completion_state = completed` and a `completed_at` date within the last 30 days. Show: routine name, day it was due, time marked complete.
- **Reminders:** include any reminder with `status = completed` or `status = dismissed` and a `resolved_at` date within the last 30 days. Show: reminder title, resolution time, status (completed vs. dismissed if the distinction is surfaced in Phase 1).
- **Meal plan entries:** include any meal entry (breakfast, lunch, dinner per day) from a meal plan whose `week_start_date` is before the current Monday and whose day falls within the last 30 days. Show: meal name, day, plan name.
- **Inbox items:** include any inbox item with `status = done` and a `completed_at` date within the last 30 days. Show: item title, owner, completion time.
- **Shared list items:** include any list item with `checked = true` and a `checked_at` date within the last 30 days. Show: item name, list name, check time.

**Day grouping:**
- Days are grouped with the most recent day first.
- Within each day, items are ordered reverse-chronologically by their resolution/completion timestamp.
- Empty days within the 30-day window are suppressed (not shown as blank sections). This differs from the weekly view, where all seven days are always shown. In history, only days with activity appear.
- Within each day, workflow type is visually differentiated by the same color or icon indicators used in the unified weekly view, but items are interleaved chronologically rather than grouped by type. Chronological order is more useful for recall ("what happened at 9am on Tuesday?") than type-grouped order.

**30-day window:**
- The 30-day window is a rolling window: today minus 29 days, through today (inclusive of today for items completed earlier today).
- The window anchor is local device time, consistent with all other Olivia temporal calculations.

**Shared list item handling:**
- Only checked items appear in activity history. Unchecked items are not shown.
- Items are shown with their parent list name so the household member understands the context (e.g., "Milk — Grocery List").
- If an item is unchecked after appearing in history (e.g., the list is reused), it is removed from the history view on the next render — it is no longer a "completed" item.

## Data And Memory

The activity history view does not create or modify any data. It is a read-only assembly of completed or resolved H3 state.

**Data sources (read-only):**
- Routine occurrence records: `completion_state`, `completed_at`, `due_date`, `routine_title`, `owner`
- Reminder records: `status` (completed or dismissed), `resolved_at`, `title`, `owner`
- Meal plan records and meal entry records: `week_start_date`, `day_of_week`, `meal_name`, `plan_title`
- Inbox item records: `status` (done), `completed_at`, `title`, `owner`
- Shared list item records: `checked`, `checked_at`, `name`, `list_name`

**Implementation note:**
Completed timestamps (`completed_at`, `resolved_at`, `checked_at`) must be available in the domain layer for each workflow type. If any workflow type does not currently store a precise completion timestamp, the Founding Engineer should evaluate whether to add this field or infer the timestamp from available state. This is an architectural note for implementation planning, not a product blocker — the spec assumes timestamps are available or inferable.

**Local cache:**
- Activity history renders from locally cached H3 state, consistent with the offline-first model throughout Olivia.
- No new sync primitive is introduced. Completed state for each workflow type already propagates through existing sync.

**Transient state:**
- Scroll position within activity history is transient UI state and does not need to be persisted.

## Permissions And Trust Model

- Activity history is a read-only advisory surface. It does not propose, initiate, or execute any actions.
- All interactions are navigational: tapping an item opens the source workflow screen, which applies that screen's own trust model.
- The view never triggers confirmation dialogs — it contains no write actions.
- Spouse sees the same activity history in read-only mode. The per-screen spouse banner (L-009) is applied to the activity history header, consistent with all H3 and H4 workflow screens.
- What Olivia must never do in this workflow: auto-reopen resolved items, modify any record, or display items outside the 30-day window without explicit user action.

## AI Role

- No AI is required for Phase 1. Activity history is a structured assembly of completed state — it does not need inference, summarization, or classification.
- AI-driven enhancements (e.g., "you completed 85% of your routines last week" or "salmon appeared in your meal plan 3 times last month") are deferred to a later H4 slice, likely tied to planning ritual support.
- The view must remain fully functional without AI. Its value comes from aggregation and chronological assembly, not from AI-generated content.

## Risks And Failure Modes

- **Empty history:** A household that is new to Olivia or has few completed items will see a sparse or empty activity history. The empty state should feel informative rather than broken — a message like "No activity in the last 30 days. Completed routines, reminders, meals, and tasks will appear here." is appropriate.
- **High volume from daily routines:** A household with multiple daily routines (medication, morning checklist) could generate 30–60+ routine completion entries per week, making the history dense. Phase 1 accepts this and relies on visual differentiation to keep the view scannable; Phase 2 may add type-based filtering or collapsing.
- **High volume from shared list items:** Frequent grocery shoppers could check off 20–40 list items per trip, creating a long run of list-item entries in a single day. If this proves noisy, list items can be grouped by list (e.g., "23 items checked in Grocery List — Tuesday") in a Phase 2 revision.
- **Missing timestamps:** If a workflow type does not store precise completion timestamps, history items for that type may default to midnight on the completion day, causing them to sort differently than expected. This is acceptable in Phase 1 with a clear implementation note.
- **Stale offline data:** If the client cache is outdated (e.g., a routine was completed on another device and not yet synced), the activity history may be incomplete until sync resumes. This is an accepted limitation of the local-first model — consistent with the weekly view behavior.
- **Re-opened items:** An inbox item marked done and then re-opened should disappear from activity history on re-render. The implementation should not persist a snapshot of completed state in the history layer — it should derive history from current completed-state records each time.

## UX Notes

- Activity history should feel like a quiet record-keeper, not an achievement tracker. Avoid gamification language or streak counters in Phase 1 — those belong to a later, AI-enhanced slice.
- The most recent day should be immediately visible without scrolling when the view loads.
- Because empty days are suppressed, the view should clearly communicate the time span being shown — e.g., a "Last 30 days" label or section header.
- Within each day, items should be visually differentiated by workflow type using the same icon or color system as the unified weekly view, for consistency.
- Completed routines and done inbox items should appear with a clear visual completion state (e.g., checkmark or muted style) but their titles should remain legible for recall purposes.
- Shared list items should be clearly grouped by their parent list name to distinguish "Milk — Grocery List" from "Milk — Holiday Packing List" if a household reuses item names across lists.
- The spouse banner should not dominate the view on shared access; it should be the same calm informational element established by L-009.
- Tapping items that navigate to the source workflow screen should feel natural even when the item is "done" — the household member may want to review the detail or re-open the item (from within the source screen, not from history).

## Acceptance Criteria

1. The activity history screen exists and is reachable from the primary navigation or from a link within the unified weekly view.
2. The view shows activity from the last 30 days (today minus 29 days through today), grouped by day with the most recent day first.
3. Completed recurring routine occurrences from the last 30 days appear in the correct day section with routine name and completion time.
4. Resolved reminders (completed or dismissed) from the last 30 days appear in the correct day section with reminder title and resolution time.
5. Past meal plan entries from meal plans with `week_start_date` before the current Monday appear in the correct day sections within the 30-day window, showing meal name and plan name.
6. Closed inbox items (status `done`) from the last 30 days appear in the correct day section with item title and owner.
7. Checked-off shared list items from the last 30 days appear in the correct day section with item name and list name.
8. Items from before the 30-day window do not appear.
9. Days with no completed activity are not shown (suppressed, not blank).
10. Tapping a routine occurrence navigates to the routine detail screen.
11. Tapping a resolved reminder navigates to the reminder detail screen.
12. Tapping a past meal entry navigates to the meal plan day view.
13. Tapping a completed inbox item navigates to the inbox item detail screen.
14. Tapping a checked-off list item navigates to the list screen.
15. Items within each day are ordered reverse-chronologically by completion/resolution time.
16. Workflow types are visually differentiated using consistent color or icon indicators.
17. When no activity exists in the 30-day window, a clear empty state is shown with an informative message.
18. The spouse sees the activity history in read-only mode with the per-screen spouse banner.
19. The view renders from local cache when offline without crashing or showing an error.
20. No write actions are possible from the activity history screen.

## Validation And Testing

**Household validation:**
- After actual use, observe whether the household member refers to activity history to recall past actions (e.g., "did we do the cleaning last week?"). If it is used for recall, the feature is successful.
- If the view is perceived as too noisy (too many list item entries or daily routine entries), evaluate whether type filtering or grouping is needed in Phase 2.
- Observe whether the 30-day window feels sufficient. If users express frustration about not seeing older history, that is a signal to add load-more or date navigation.

**Unit tests:**
- 30-day window calculation (correct start and end date for any given today, including edge cases around month and year boundaries).
- Item assembly per workflow type (correct filter by completion/resolution date, correct exclusion of items outside the window).
- Suppression of empty days (days with zero completed items from all five sources are not rendered).
- Re-opened items: an item moved from `done` back to `open` should not appear in history.
- Shared list items: unchecked items (or items re-unchecked after appearing) should be excluded.

**Integration tests:**
- End-to-end: given a household with recent completed routines, resolved reminders, past meal entries, done inbox items, and checked-off list items, all appear in the correct day sections in reverse-chronological order.
- Offline: the view renders correctly from cached state without a network connection.

**Manual validation:**
- The view renders correctly across mobile screen sizes (primary: phone; secondary: tablet).
- The spouse banner appears for a spouse session.
- Tapping each workflow type navigates to the correct source screen.
- A 30-day window with no completed activity renders the empty state without errors.
- A high-volume day (many routine completions and list item checks) renders without layout breakdown.

## Dependencies And Related Learnings

- L-011: All four H3 workflows share a coherent coordination-layer model — activity history builds directly on this model by surfacing completed state across all four workflow types.
- L-013: The H4 layer should start by synthesizing existing H3 state before introducing AI or new primitives — activity history follows this principle exactly.
- D-022: Confirmed unified weekly view as first H4 target and activity history as second; this spec fulfills that sequencing.
- A-001 (validated): shared household state as the first wedge — activity history extends this into temporal recall of past shared state.
- Depends on: `docs/specs/first-class-reminders.md`, `docs/specs/recurring-routines.md`, `docs/specs/meal-planning.md`, `docs/specs/shared-household-inbox.md`, `docs/specs/shared-lists.md`
- Pairs with: `docs/specs/unified-weekly-view.md` — the weekly view is the forward-looking complement; activity history is the backward-looking complement. Together they form Olivia's temporal layer.

## Open Questions

1. **Shared list item volume:** Will checked-off grocery items generate too much noise in daily activity history? If so, should list items be grouped by list (e.g., "23 items in Grocery List") rather than shown individually in Phase 1?
2. **Dismissed vs. completed reminders:** Should Phase 1 visually distinguish a "completed" reminder (the underlying need was addressed) from a "dismissed" reminder (acknowledged but not necessarily acted on)? This distinction may be valuable for households reviewing whether reminders are working as intended.
3. **Navigation entry point:** Should activity history be a primary nav tab alongside the weekly view and H3 workflow screens, or should it be a secondary entry point accessible from within the weekly view (e.g., a "View history" link in the weekly view footer)? Given that it is a recall tool rather than a daily-use surface, a secondary entry point may be more appropriate.
4. **Completion timestamps availability:** Does the current domain layer store precise completion timestamps for all five data sources (routines, reminders, meal entries, inbox items, list items)? The Founding Engineer should confirm before implementation planning begins.
5. **Future H4 integration with planning ritual support:** Activity history is the natural data source for an AI-generated weekly summary during a planning ritual. Should the spec explicitly define the data contract or interface that planning ritual support will later consume, or leave that to the planning ritual spec?

## Facts, Assumptions, And Decisions

**Facts:**
- All four H3 workflow types produce completed or resolved state: routine occurrences are marked complete, reminders are resolved, meal entries are associated with past plan weeks, inbox items are marked done.
- Shared list items have a `checked` boolean; this spec assumes a `checked_at` timestamp is available or can be added.
- The unified weekly view covers the current calendar week. Activity history covers the 30 days before today. Together they provide continuous household time coverage from 30 days ago through the current week.
- All H3 workflows store their state locally first — activity history can render from existing cache.

**Assumptions:**
- A 30-day rolling window is sufficient for the household's primary recall needs. Older history (last quarter, last year) is a Phase 2 concern.
- Reverse-chronological grouping by day is more useful for recall purposes than grouping by workflow type. Workflow type visual differentiation within the day-grouped view provides enough orientation.
- The household will most often use activity history to recall recent past (last few days to last week) rather than to browse the full 30-day archive.
- Completed timestamps are available or inferable for all five H3 data sources. If any are missing, the Founding Engineer should add them during implementation planning.

**Decisions:**
- Time window for Phase 1: rolling 30 days (today minus 29 days through today).
- Day grouping order: most recent day first (reverse chronological).
- Within-day item order: reverse-chronological by completion/resolution time (items from later in the day appear first).
- Empty days are suppressed (not shown as blank sections). This differs from the weekly view, where all seven days of the current week are always visible.
- No write actions in Phase 1. All interactions are navigational.
- Shared list checked items are included in Phase 1 activity history, subject to the open question about volume.
- Workflow types are interleaved chronologically within each day (not grouped by type within the day).

## Deferred Decisions

- Navigation entry point: primary tab vs. secondary entry from within the weekly view — designer decision.
- Whether shared list items should be individually listed or grouped by list name — depends on household usage patterns; revisit after Phase 1.
- Filtering by workflow type — deferred to Phase 2.
- Load-more or date-picker navigation for history older than 30 days — deferred to Phase 2.
- AI-generated period summaries and streak visualization — deferred to a later H4 slice.
- Data contract for planning ritual support's consumption of activity history — deferred to the planning ritual support spec.
