# Feature Spec: First-Class Reminders

## Status
- Approved

## Summary
- Olivia's MVP inbox already captures household work and surfaces due-soon or overdue items, but reminders are still only implied through inbox due fields. This spec defines first-class reminders as a focused Horizon 3 workflow that adds explicit time-based follow-through without replacing the inbox. A reminder may stand alone when the household simply needs to remember something later, or it may link to an inbox item when there is concrete work to track. If this workflow works well, the household gains a clearer, calmer way to surface what needs attention at the right time without creating a second disconnected task system.

## User Problem
- Household reminders do not always map cleanly to "tasks with due dates."
- Some obligations are really "surface this at the right time" rather than "track this as active work right now."
- In the current inbox model, due fields help with urgency, but they do not yet express a first-class reminder workflow with explicit reminder state, lightweight standalone reminders, snoozing, or recurring reminder behavior.
- The result is either overloading inbox items with reminder intent or keeping time-based follow-through in human memory, which recreates the mental overhead Olivia is meant to reduce.

## Target Users
- Primary user: stakeholder, acting as the primary operator who creates, reviews, and resolves reminders.
- Secondary user: spouse, with shared visibility into household reminders and linked inbox context, but without full write parity in this first spec.
- Future users: other household members, richer collaborator roles, and broader shared editing are not a target in this phase.

## Desired Outcome
- The household has a dedicated, legible way to say "surface this later" without forcing everything into the inbox as active work.
- Inbox items that genuinely need time-based follow-through can have reminders attached without changing what inbox ownership or status means.
- Recurring reminder needs such as basic weekly or monthly obligations can be handled without fully designing recurring routines yet.
- Olivia surfaces reminders in a calm, trustworthy way that improves follow-through without becoming noisy or demanding.

## In Scope
- Creating a standalone reminder with a title, owner, scheduled time, and optional note.
- Creating a reminder linked to an existing inbox item.
- Viewing reminders in upcoming, due, overdue, completed, and snoozed states.
- Completing, snoozing, editing, or cancelling a reminder.
- Supporting one-time reminders and a minimum recurring reminder model of daily, weekly, or monthly cadence.
- Surfacing reminders in-app as part of Olivia's household coordination layer.
- Supporting calm, stakeholder-focused push notifications as an optional secondary delivery path.
- Supporting a minimal reminder notification settings model with an overall notification enable or disable control plus per-type controls for `due reminders` and `daily summary`.
- Preserving reminder history and enough reminder metadata to support later implementation planning.
- Reusing the current owner vocabulary of `stakeholder`, `spouse`, and `unassigned`.

## Boundaries, Gaps, And Future Direction
- Not handled in this spec:
- Full recurring-routines design for chores, maintenance, or broader repeating work.
- Shared-list behavior, meal planning behavior, or calendar-event behavior.
- Advanced recurrence rules such as custom intervals, weekday sets, exception dates, skips, backfill, or catch-up logic.
- Full spouse write parity, richer multi-user permissions, or proactive spouse notifications.
- External calendar sync, messaging integrations, email, SMS, or external-channel reminder delivery.
- Location-based reminders, attachment support, or rich note threads.
- Automatic conversion between reminders and inbox items without explicit user intent.
- Direct reminder-to-inbox conversion in the first implementation slice.
- Quiet hours, delivery windows, per-reminder notification rules, or richer notification preference systems.
- A separate missed-occurrence workflow for recurring reminders.
- Known gaps acceptable for this phase:
- Reminder notification delivery is advisory support, not a guaranteed exact-time alarm system.
- Standalone reminders remain intentionally lightweight and should not become a second general-purpose notes system.
- Linked reminders do not redefine inbox item status; they add time-based follow-through alongside the existing inbox model.
- Missed recurring reminders are preserved in the reminder timeline, but do not create a separate first-class missed state.
- Likely future direction:
- Shared recurrence infrastructure across reminders, recurring routines, and later planning workflows.
- Better conversion flows between a standalone reminder and an inbox item when a reminder turns into active work.
- Richer notification controls if real household usage shows the calm default is insufficient.

## Workflow
- Primary workflow: create a standalone reminder
1. User tells Olivia to create a reminder, for example "Remind me next Thursday to bring the vet records."
2. Olivia parses the title, owner, and scheduled time into a reminder draft.
3. Olivia presents the parsed reminder for confirmation before saving when natural-language parsing is involved.
4. User confirms or corrects the draft.
5. System saves the reminder as a first-class reminder.
6. Olivia confirms the reminder and shows when it will next surface.

- Primary workflow: attach a reminder to an inbox item
1. User selects or references an existing inbox item and asks Olivia to add a reminder.
2. Olivia keeps the inbox item as the source of work context and creates a linked reminder draft with the chosen time.
3. Olivia presents the reminder draft for confirmation if parsing or inferred linkage needs verification.
4. User confirms.
5. System saves the reminder linked to the inbox item.
6. Olivia later surfaces the reminder without changing the inbox item's status automatically.

- Secondary workflow: review reminders
1. User asks what is coming up, what is due today, or what reminders are overdue.
2. Olivia returns a structured reminder view grouped by due-state.
3. Linked reminders show their associated inbox item context when relevant.
4. Olivia may suggest a small number of follow-up actions, such as completing, snoozing, or opening the linked inbox item.
5. Any Olivia-proposed write action requires explicit confirmation before execution.

- Secondary workflow: resolve a due reminder
1. A reminder reaches its scheduled time and becomes due.
2. Olivia surfaces it in-app and may also send a stakeholder push notification if the user has enabled reminder notifications.
3. User can complete the reminder, snooze it, edit it, or cancel it.
4. Non-destructive user-initiated actions execute immediately.
5. If the reminder is recurring and the user completes it, the system schedules the next occurrence according to the reminder's cadence.

- Secondary workflow: snooze a reminder
1. User chooses to snooze a due or overdue reminder.
2. Olivia applies the new reminder time immediately when the user directly chose the snooze action.
3. The reminder moves into a snoozed state until the new time is reached.
4. Olivia does not create a new inbox item, send an external message, or otherwise escalate without explicit user approval.

## Behavior
- Facts the system records:
- Reminder title.
- Optional reminder note.
- Owner: `stakeholder`, `spouse`, or `unassigned`.
- Reminder timing: scheduled time for the next surfacing event.
- Whether the reminder is one-time or recurring.
- If recurring, the cadence: `daily`, `weekly`, or `monthly`.
- Optional linked inbox item identifier.
- Created timestamp and updated timestamp.
- Completion timestamp, cancellation timestamp, and most recent snooze-until timestamp when applicable.
- Enough history to explain when the reminder was created, rescheduled, snoozed, completed, or cancelled.
- Basic timeline history when a recurring reminder occurrence is missed and later resurfaced.

- Reminder due-state Olivia derives and surfaces:
- `upcoming`: the reminder is scheduled for the future and not snoozed past that time.
- `due`: the scheduled time has arrived and the reminder is still active.
- `overdue`: the scheduled time has passed and the reminder has not been completed, cancelled, or snoozed.
- `snoozed`: the reminder was deferred to a later explicit time.
- `completed`: the current reminder occurrence was completed by the user.
- `cancelled`: the reminder was intentionally dismissed and should no longer surface.

- Suggestions Olivia may make:
- "This reminder is due now. Want to snooze it for tonight?"
- "This recurring reminder has come up three times without completion. Is the cadence still right?"
- "This reminder is linked to an open inbox item. Want to open the item?"
- "You have several reminders due tomorrow. Want a quick summary?"

- Actions and approval requirements:

| Action | User-initiated | Agentic (Olivia-proposed) |
|---|---|---|
| Create reminder from structured input | Execute immediately | Confirm before save |
| Create reminder from natural language parse | Confirm parsed draft before save | Confirm before save |
| Edit reminder timing, owner, note, or recurrence | Execute immediately | Confirm before apply |
| Complete reminder | Execute immediately | Confirm before apply |
| Snooze reminder | Execute immediately | Confirm before apply |
| Cancel or archive reminder | Always confirm | Always confirm |
| Send push notification | User enables delivery; system may deliver matching reminder notifications after setup | Not a separate agentic action once the user has explicitly enabled reminder notifications |

## Data And Memory
- Durable state:
- Reminder records and their full property set.
- Reminder linkage to inbox items when present.
- Reminder history, including creation, reschedule, snooze, completion, and cancellation events.
- Notification preference and subscription state needed for reminder delivery.
- Notification type preferences for `due reminders` and `daily summary`.
- Recurrence metadata for recurring reminders.
- Transient state:
- Parsed reminder draft awaiting user confirmation.
- Current reminder review surface or detail view.
- Pending Olivia suggestions before the user accepts or declines them.
- Sensitive data handling:
- Reminder titles, notes, linked item context, and schedule data are household-sensitive and should remain local-first.
- If AI assists with parsing or summarization, only the minimum necessary content should be sent externally, and no external provider becomes the system of record.
- Reminder delivery settings should be treated as user-controlled operational state, not implicit permission for broader automation.

## Permissions And Trust Model
- This feature remains advisory-only.
- User-initiated, non-destructive reminder actions execute immediately.
- Agentic reminder actions require explicit confirmation before any write.
- Destructive reminder actions such as cancel, archive, or permanent removal always require confirmation regardless of who initiated them.
- Olivia may surface a due reminder automatically because surfacing information is advisory, but it may not modify reminder state, create linked work, or escalate externally without explicit user approval.
- Olivia must never:
- mark a reminder completed because it infers the household probably handled it.
- create a new inbox item from a reminder on its own judgment.
- notify the spouse proactively in this first spec.
- send reminder data to an external channel automatically.
- change reminder cadence automatically based on observed behavior.

## AI Role
- Where AI adds essential value:
- Parsing natural-language reminder requests into structured reminder drafts.
- Generating concise reminder summaries across upcoming, due, and overdue states.
- Suggesting helpful reminder follow-up actions in a calm, advisory posture.
- Where AI is a convenience, not essential:
- Improving the phrasing of reminder summaries or suggestion text.
- Suggesting that a reminder might be better linked to an existing inbox item.
- What must work without AI:
- Creating reminders from structured fields.
- Listing reminders by due-state.
- Completing, snoozing, editing, cancelling, and reviewing reminders.
- Running recurrence scheduling based on stored cadence rules.
- Fallback behavior if AI is unavailable:
- Olivia accepts structured reminder input rather than natural-language parsing.
- Reminder views remain available as structured lists.
- Suggestions may be omitted or replaced with simple rule-based prompts.
- Reminder delivery and core reminder state remain functional.

## Risks And Failure Modes
- Risk 1: reminders duplicate inbox work and create ambiguity.
- If the same obligation is tracked separately as both an inbox item and an unrelated standalone reminder, the household may lose trust in which record matters.
- Mitigation: the product should encourage linking when the reminder is clearly about an existing inbox item, and the spec should keep standalone reminders intentionally narrow.
- Risk 2: recurring reminders drift into recurring-routines scope.
- If reminder recurrence tries to capture every repeating household workflow, the product will absorb routine modeling complexity before that workflow is specified.
- Mitigation: limit the first spec to daily, weekly, and monthly recurrence only.
- Risk 3: reminder notifications become noisy or guilt-inducing.
- Too many pushes or overly aggressive overdue behavior would conflict with Olivia's calm posture.
- Mitigation: in-app surfacing is primary, push is optional, and the first notification posture remains stakeholder-focused and restrained.
- Risk 4: due-state becomes confusing when snooze and recurrence interact.
- If users cannot tell whether a reminder is overdue, snoozed, or awaiting its next recurrence, the workflow will feel unreliable.
- Mitigation: derive reminder state from explicit timestamps and show the next scheduled surfacing time clearly.
- Risk 5: linked reminders accidentally mutate inbox meaning.
- If a linked reminder silently changes item status or ownership, the inbox foundation becomes less legible.
- Mitigation: linked reminders may reference inbox items, but reminder resolution does not change inbox fields automatically.

## UX Notes
- This feature should feel like a calm timing layer for household follow-through, not a loud notification engine.
- Standalone reminders should feel faster to create than a full inbox item when the household only needs a future prompt.
- Linked reminders should feel like an extension of inbox work, not a separate system the user must reconcile manually.
- Anti-patterns to avoid:
- Forcing users to decide between too many reminder types or schedule options.
- Sending push notifications by default without explicit enablement.
- Treating overdue reminders as guilt-inducing alarms.
- Making recurrence editing feel like calendar software.
- Hiding linked inbox context when the reminder exists to support that work.

## Acceptance Criteria
- 1. Given a user creates a standalone one-time reminder with a title and scheduled time, when the reminder is saved, then it remains durably available in later sessions and appears in upcoming reminder views until resolved.
- 2. Given a user creates a reminder linked to an existing inbox item, when Olivia surfaces that reminder later, then the reminder clearly references the linked inbox item without automatically changing the item's status or owner.
- 3. Given a reminder reaches its scheduled time and remains active, when Olivia evaluates reminder state, then the reminder is surfaced as `due` or `overdue` according to time and remains visible until completed, snoozed, cancelled, or rescheduled.
- 4. Given a user directly completes a reminder, when Olivia processes that user action, then the reminder is marked completed immediately without an extra confirmation step.
- 5. Given Olivia proposes completing or snoozing a reminder on its own initiative, when the user accepts the suggestion, then Olivia presents the proposed write for confirmation before applying it.
- 6. Given a user snoozes a reminder to a later time, when the reminder is saved, then it no longer appears as currently due and resurfaces at the snoozed time.
- 7. Given a reminder is recurring with daily, weekly, or monthly cadence, when the current occurrence is completed, then the next occurrence is scheduled automatically according to that cadence.
- 8. Given external AI is unavailable, when a user provides structured reminder fields, then the reminder is still created, stored, edited, and reviewed correctly.
- 9. Given the user enables reminder notifications, when Olivia presents notification settings, then the first implementation exposes only an overall notification enable or disable control plus per-type controls for `due reminders` and `daily summary`.
- 10. Given reminder notifications are not enabled for a type, when a reminder becomes due or daily summary time arrives, then Olivia still surfaces reminders in-app without assuming push delivery is available for that type.
- 11. Given a recurring reminder is missed for one or more cycles, when the reminder later resurfaces, then the reminder timeline preserves that history without creating a separate missed-occurrence workflow or state.
- 12. Given the spouse views the reminder workflow, when Olivia presents reminder state, then the spouse can review reminders and linked item context but cannot modify reminder records in this first spec.

## Validation And Testing
- Unit-level:
- Reminder due-state derivation across upcoming, due, overdue, snoozed, completed, and cancelled conditions.
- Recurrence scheduling for daily, weekly, and monthly reminders.
- Linking logic that preserves separation between reminder state and inbox item state.
- Rule-based notification eligibility for stakeholder reminder notifications.
- Integration-level:
- Create, edit, snooze, complete, and cancel reminder flows persist correctly across sessions.
- Linked reminders render with the correct inbox context and survive inbox review flows.
- Recurring reminders schedule the next occurrence only after completion, not merely because time passed.
- Missed recurring occurrences are represented in the reminder timeline and do not create separate actionable reminder records.
- Agentic reminder suggestions always require confirmation before writes.
- User-initiated non-destructive reminder writes execute immediately.
- Household validation:
- The stakeholder uses reminders for real household follow-through and reports whether standalone reminders reduce the need to overload the inbox.
- The stakeholder evaluates whether the first recurrence model covers ordinary reminder needs without reopening routine complexity.
- The household evaluates whether the notification posture feels helpful and calm rather than noisy.

## Dependencies And Related Learnings
- `D-002`: advisory-only trust model remains in force for reminders.
- `D-004`: primary-operator model still applies; spouse write parity remains deferred.
- `D-005`: the MVP choice to keep reminders as inbox properties was valid for the inbox spec and is now superseded by Horizon 3 reminder work.
- `D-007`: the installable mobile-first PWA remains the near-term canonical surface, shaping how reminder surfacing and notifications should be framed.
- `D-010`: non-destructive user-initiated reminder actions should execute immediately, while agentic actions still require confirmation.
- `D-011`: Horizon 2 is complete enough to expand beyond the inbox.
- `D-012`: first-class reminders are the next Horizon 3 spec target.
- `D-013`: Horizon 3 explicitly reopens the MVP reminder simplification.
- `D-014`: first-class reminders use a hybrid model that allows standalone or linked reminders while preserving the inbox as the foundation.
- `D-015`: the first reminder implementation slice stays narrowly bounded around deferred conversion, minimal notification settings, and timeline-only missed recurrence history.
- `A-007`: shared lists may deserve a distinct workflow model, so reminder scope should not absorb list behavior.
- `A-008`: recurrence may become shared infrastructure across reminders and recurring routines; this spec should define only the minimum needed now.
- `A-010`: lightweight standalone reminders may reduce pressure to misuse the inbox for pure memory prompts.
- `A-009`: meal planning remains later Horizon 3 work and should not shape this reminder spec prematurely.
- `docs/specs/shared-household-inbox.md`: the reminder workflow extends the inbox foundation rather than replacing it.

## Open Questions
- No blocking product questions remain for the first implementation slice.

## Facts, Assumptions, And Decisions
- Facts:
- Olivia already has a working inbox workflow with due fields, urgency flags, and stakeholder-oriented notification scaffolding.
- Horizon 3 work should extend the inbox foundation rather than replace it.
- The trust model remains advisory-only.
- Assumptions:
- `A-008`: the minimum reminder recurrence model can later share infrastructure with recurring routines.
- `A-010`: a lightweight standalone reminder model will reduce pressure to misuse inbox items for pure memory prompts without creating a second full task system.
- Decisions:
- `D-014`: first-class reminders use a hybrid model; reminders may stand alone or link to inbox items.
- Standalone reminders are allowed, but they remain intentionally lightweight.
- The first reminder spec includes only one-time, daily, weekly, and monthly recurrence.
- Reminder notifications are stakeholder-focused, calm, and optional rather than default or spouse-directed.
- `D-015`: the first implementation slice defers reminder-to-inbox conversion, uses only a minimal per-type reminder notification model, and preserves missed recurring reminder history only in the reminder timeline.

## Deferred Decisions
- Whether reminder records should support richer notification preferences such as quiet hours, digest bundling, or per-reminder delivery rules.
- Whether reminder completion should ever offer one-tap conversion into inbox follow-through work.
- Whether recurring reminders and recurring routines should eventually share a single visible scheduling model in the UI.
- Whether spouse write access for reminders should arrive before broader collaboration permissions.
- Whether missed recurring occurrences later need a richer workflow beyond the basic reminder timeline.
