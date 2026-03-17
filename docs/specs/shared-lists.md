# Feature Spec: Shared Lists

## Status
- Approved

## Summary
- The shared household inbox captures open work and the reminder workflow surfaces time-based follow-through, but neither model fits the collaborative list use case — grocery runs, packing lists, shopping errands — where the household needs a shared checklist rather than a tracked task or a timed prompt. This spec defines shared lists as a lightweight, distinct Horizon 3 workflow: household-scoped, mobile-first, and low-friction. A shared list is a titled collection of checkable items that both household members can view and that the stakeholder can write to in the first implementation slice. If this workflow works well, the household gains a calmer way to coordinate recurring list-based tasks without routing them through the inbox.

## User Problem
- Grocery, shopping, and packing needs do not map cleanly to inbox work items or timed reminders.
- The current inbox model creates overhead when used as a list: one item per grocery entry is too granular, one item per shopping trip loses the details, and neither approach supports the check-off-as-you-go interaction pattern.
- Without a shared list surface, one household member still holds the list in their head or in a private notes app, recreating the invisible coordination labor Olivia is meant to reduce.
- Shared visibility matters: both household members should be able to see the current grocery or packing list without one person having to share it manually.

## Target Users
- Primary user: stakeholder, acting as the primary operator who creates, manages, and writes to shared lists.
- Secondary user: spouse, with shared read visibility into all household lists and list items, but without write access in this first spec.
- Future users: other household members, richer collaborator roles, and broader shared editing are not a target in this phase.

## Desired Outcome
- The household has a simple, shared checklist surface that reduces coordination overhead for recurring list-based tasks.
- Creating a list and adding items feels faster and lighter than creating inbox work items.
- Both household members can see the current state of any shared list without one person having to relay it.
- Checking items off is immediate and reversible; no confirmation friction on ordinary actions.
- The workflow integrates cleanly into the household coordination layer without needing to become a full grocery or inventory system.

## In Scope
- Creating a named shared list (title required; no fixed type categories in Phase 1).
- Adding text items to a list inline, without a modal.
- Checking and unchecking list items.
- Editing a list title or an item's text.
- Archiving a list (confirmation required; list remains accessible in an archived view).
- Deleting a list (owner-only; higher-friction confirmation than archive; permanent).
- Viewing a list index showing all active lists for the household.
- Viewing an archived list index.
- Viewing list detail showing all items in a list with their checked state.
- Spouse read-only view of the list index and all list details with a clear role indicator.
- Offline-tolerant creation and item updates using the same client outbox pattern as inbox and reminders.
- Preserving enough item history for later auditing or undo, even if no undo UI is built in this slice.

## Boundaries, Gaps, And Future Direction
- Not handled in this spec:
  - Spouse write access to lists or items.
  - Item categories, tags, quantities, or rich item metadata.
  - Fixed list types such as grocery template or packing template.
  - Item ordering control beyond append-order (reorder drag is deferred).
  - Moving items between lists.
  - Recurring or scheduled list regeneration (this is a recurring routines concern).
  - Meal planning integration or ingredient linking.
  - Shared list notifications or push alerts for item adds or checks.
  - Exporting or sharing lists outside the app.
  - Multi-user simultaneous editing or CRDT conflict resolution.
  - Per-item assignments or per-item due dates.
- Known gaps acceptable for this phase:
  - Checked items remain in the list and do not auto-archive; the user decides when to clear them.
  - There is no batch clear-all-checked action in Phase 1 (this is a convenience feature to defer).
  - Item order is append-only in the first implementation; drag reordering comes later.
  - Offline conflicts on the same item from two devices are handled by versioned command semantics, same as the inbox; no richer CRDT machinery needed at current household concurrency.
- Likely future direction:
  - Spouse write access for list items (a natural next collaboration step once the primary workflow is proven).
  - Batch operations such as clear all checked items or archive a completed list.
  - List templates for common household recurring list needs.
  - Meal planning connecting shared lists to planned meals and recurring ingredient capture.

## Workflow
- Primary workflow: create a list
  1. User navigates to the Shared Lists index.
  2. User taps "New List."
  3. User enters a list title and confirms.
  4. System saves the list immediately (user-initiated, non-destructive).
  5. New list appears in the index optimistically.

- Primary workflow: add an item
  1. User opens a list and taps the inline item input.
  2. User types item text and submits.
  3. Item appears at the bottom of the list immediately (optimistic).
  4. No modal, no category selection, no owner assignment.

- Primary workflow: check off an item
  1. User taps the checkbox next to an item.
  2. Item transitions to checked state immediately (optimistic).
  3. User may uncheck it by tapping again.
  4. No confirmation required; checking and unchecking are reversible user-initiated actions.

- Secondary workflow: spouse read-only view
  1. Spouse opens the app and navigates to Shared Lists.
  2. Spouse sees the same list index and item detail as the stakeholder.
  3. Write actions are not visible or are disabled with a clear role indicator.
  4. Spouse does not see a misleading blank state; the read-only nature is communicated explicitly.

- Secondary workflow: archive a list
  1. User selects the archive action from the list card or list detail menu.
  2. System presents a confirmation: "Archive this list? It will be hidden from the active view but not deleted."
  3. User confirms.
  4. List moves to the archived state and disappears from the active list index.
  5. List is accessible from the archived list filter view.

- Secondary workflow: delete a list
  1. Owner selects the delete action from an archived or active list.
  2. System presents a higher-friction confirmation: "Permanently delete this list and all its items? This cannot be undone."
  3. User confirms.
  4. List and all items are permanently removed.

## Behavior
- Facts the system records per list:
  - List id.
  - List title.
  - Owner (the household member who created the list; `stakeholder` or `spouse` are the valid values, but only stakeholder can create lists in Phase 1).
  - Status: `active` or `archived`.
  - Created timestamp, updated timestamp, archived timestamp when applicable.
  - Version counter for optimistic concurrency.

- Facts the system records per list item:
  - Item id.
  - Parent list id.
  - Item body text.
  - Checked state: `true` or `false`.
  - Checked timestamp when the item was most recently checked.
  - Position (integer, append-order for Phase 1).
  - Created timestamp, updated timestamp.
  - Version counter.

- Derived state Olivia surfaces:
  - Active list item count and checked item count for list cards.
  - Whether a list has all items checked (useful signal for visual affordance; does not auto-archive).
  - Whether the viewing user is read-only (spouse role).

- Actions and approval requirements:

| Action | User-initiated | Agentic |
|---|---|---|
| Create list | Execute immediately | Confirm before save |
| Edit list title | Execute immediately | Confirm before apply |
| Add item | Execute immediately | Confirm before save |
| Edit item text | Execute immediately | Confirm before apply |
| Check item | Execute immediately | Confirm before apply |
| Uncheck item | Execute immediately | Confirm before apply |
| Archive list | Always confirm | Always confirm |
| Delete list | Always confirm | Always confirm |
| Restore archived list | Execute immediately | Confirm before apply |

## Data And Memory
- Durable state:
  - List records with full property set.
  - List item records with full property set.
  - Item history log with enough event entries to reconstruct when items were added, checked, unchecked, edited, or removed.
- Transient state:
  - Pending item input in the inline add field.
  - Optimistic item state before server acknowledgment.
  - Offline outbox commands awaiting reconnect flush.
- Sensitive data handling:
  - List titles and item bodies may contain household-sensitive content such as medical supplies, financial items, or personal errands.
  - All list data is local-first and household-controlled. No list content should be sent to external AI providers unless the user explicitly invokes an AI-assisted feature.
  - If AI assists with natural-language list or item creation in a future slice, only the minimum necessary content should be sent and no external provider becomes the system of record.

## Permissions And Trust Model
- This feature remains advisory-only; no AI or Olivia-proposed action may modify a list or item without explicit user confirmation.
- Non-destructive user-initiated actions (create list, add item, check item, uncheck item, edit text) execute immediately without a confirmation step. These actions are reversible through normal UI interactions.
- Destructive actions (archive list, delete list) always require confirmation regardless of who initiated them.
- Spouse access is read-only in this first spec. Spouse can view lists and items but cannot create, edit, check, archive, or delete anything.
- The read-only state must be communicated clearly so the spouse does not interpret the absence of write controls as a broken interface.
- Olivia must never:
  - Auto-archive a list because all items are checked.
  - Automatically clear checked items on a list.
  - Notify the spouse when items are added or checked in this first spec.
  - Infer that a list is "done" and change its state without explicit user action.

## AI Role
- Where AI adds potential value (deferred to future slices):
  - Parsing natural-language list creation or item addition ("add milk and eggs to the grocery list").
  - Suggesting whether a new list item might belong to an existing list.
  - Summarizing the current state of a list or household lists on request.
- What must work without AI:
  - Creating lists from a title input.
  - Adding, checking, unchecking, editing, and removing items.
  - Archiving and deleting lists.
  - Viewing all lists and items.
- Fallback behavior if AI is unavailable:
  - All structured interactions remain fully functional.
  - No AI dependency in the first implementation slice.

## Risks And Failure Modes
- Risk 1: lists become a second inbox for open work.
  - If users route general household tasks into lists instead of the inbox, the household ends up with fragmented ownership tracking.
  - Mitigation: the spec keeps lists intentionally lightweight and without per-item status or ownership. Lists are for collectible items to check off, not for trackable responsibilities. This separation should be visible in the UX.
- Risk 2: spouse finds the read-only state confusing or limiting.
  - Mitigation: the read-only state must be communicated explicitly, not just implied by absent controls. A role indicator or tooltip prevents the spouse from thinking the app is broken.
- Risk 3: offline conflicts between two devices on the same list.
  - Mitigation: versioned command semantics handle low-concurrency conflicts, same as the inbox. The household concurrency assumption (A-006) covers typical two-device household usage.
- Risk 4: lists grow large and become hard to use on mobile.
  - Mitigation: mobile-first layout with a sticky inline add input and clean item rows keeps long lists scannable. Batch-clear and reorder remain deferred; they are convenience improvements, not launch blockers.
- Risk 5: archive and delete semantics are unclear to users.
  - Mitigation: explicit confirmation copy ("hidden but not deleted" for archive; "cannot be undone" for delete) makes the distinction clear before the action completes.

## UX Notes
- Lists should feel faster and lighter to create than inbox items; the creation flow should be minimal and immediate.
- Item addition must be inline in the list detail view, not behind a modal. A modal would break the low-friction capture experience.
- Checked items should be visually distinct (strikethrough and muted style, or checkmark icon with reduced opacity) but should remain visible in the list until the user explicitly chooses to clear them.
- The list index card should show the list title, active item count, and checked item count so users can scan list state at a glance.
- The spouse read-only state should be indicated once per screen, not per individual control. A subtle role banner or indicator keeps the interface clean while communicating the constraint.
- No list types, categories, or templates should be visible in Phase 1. Users create general-purpose titled lists; Olivia does not impose structure.
- Dark mode must be supported using existing design tokens.
- Offline-created or offline-checked items should show a pending sync indicator (subtle, not alarming).
- Anti-patterns to avoid:
  - Requiring any confirmation for checking or unchecking items.
  - Auto-archiving or auto-clearing on any system-inferred trigger.
  - Treating a list with all items checked as automatically "done."
  - Showing write controls to the spouse that produce errors when tapped.

## Acceptance Criteria
- 1. Given a stakeholder creates a new list with a title, when the list is saved, then it appears immediately in the active list index and remains available in later sessions.
- 2. Given a stakeholder adds an item to a list, when the item is submitted, then it appears at the bottom of the list immediately without requiring a modal or extra confirmation.
- 3. Given a stakeholder checks an item, when the check action is applied, then the item transitions to checked state immediately and the action does not require a confirmation step.
- 4. Given a stakeholder unchecks a previously checked item, when the uncheck action is applied, then the item returns to unchecked state immediately.
- 5. Given a stakeholder archives a list, when the archive action is chosen, then Olivia presents a confirmation prompt before archiving, and the list moves to the archived view after confirmation.
- 6. Given a stakeholder deletes a list, when the delete action is chosen, then Olivia presents a higher-friction confirmation prompt before deletion, and the list and all its items are permanently removed after confirmation.
- 7. Given a list is archived, when the user opens the archived list filter, then the archived list is visible and browsable.
- 8. Given the spouse is logged in, when the spouse navigates to Shared Lists, then the spouse sees the same list index and item detail as the stakeholder but cannot create, add, check, edit, archive, or delete anything.
- 9. Given the spouse is logged in, when Olivia renders the list index or detail, then a clear role indicator communicates that the spouse is in read-only view.
- 10. Given the user is offline, when the stakeholder adds an item or checks off an item, then the action is recorded in the outbox and the UI reflects the optimistic state, and the action is flushed to the server on reconnect.
- 11. Given a list exists on the server and the device is offline, when the user opens the list detail, then the cached list and item state is shown with an offline indicator.
- 12. Given Olivia is in an agentic context and proposes creating or modifying a list or item, when the proposal is presented, then the user must explicitly confirm before any write executes.

## Validation And Testing
- Unit-level:
  - List and item state derivation (active item count, checked count, list status transitions).
  - Versioned command conflict detection for concurrent list item edits.
  - Role enforcement returning read-only errors for spouse write attempts.
- Integration-level:
  - Create, edit, check, uncheck, archive, delete flows persist correctly across sessions.
  - Archived lists are not returned in the active list query and appear correctly in the archived filter.
  - Delete permanently removes the list and all associated items.
  - Spouse read queries succeed; spouse write commands return a read-only error.
  - Offline outbox commands for list creation and item updates flush correctly on reconnect.
  - Version conflicts on list items are detected and surfaced rather than silently overwriting.
- Household validation:
  - The stakeholder uses shared lists for real grocery or packing coordination and reports whether the creation friction is low enough to replace ad hoc notes.
  - The spouse can view and follow the list without needing to ask the stakeholder for updates.
  - The household evaluates whether the checked-item visual treatment makes it easy to track in-progress list consumption without needing to clear items mid-run.

## Dependencies And Related Learnings
- `D-002`: advisory-only trust model remains in force; Olivia cannot modify lists or items on its own initiative.
- `D-004`: primary-operator model continues; spouse write parity is deferred to a later slice.
- `D-007`: installable mobile-first PWA is the canonical surface; all list UX is designed for mobile-first interaction.
- `D-008`: local-first modular monolith with SQLite and Dexie remains the architecture center.
- `D-010`: non-destructive user-initiated writes execute immediately; agentic writes still require confirmation; destructive writes always require confirmation.
- `D-011`: Horizon 2 is complete; Horizon 3 coordination layer is now active.
- `D-012`: shared lists are the second Horizon 3 spec target after first-class reminders.
- `A-006`: versioned command sync is sufficient for household-level list concurrency.
- `A-007`: shared lists are distinct enough from inbox items to deserve their own workflow model; this spec validates that assumption.
- `A-008`: shared recurrence infrastructure may later apply to recurring list regeneration; this spec does not introduce recurrence.
- `docs/specs/shared-household-inbox.md`: the inbox remains the capture foundation for open household work; shared lists are a sibling workflow, not a replacement.
- `docs/specs/first-class-reminders.md`: reminders established the sibling-workflow extension pattern this spec follows.

## Open Questions
- None blocking the first implementation slice.
- Design decision deferred to visual spec: where does "Shared Lists" appear in the main nav? Separate tab, or under a household section?
- Design decision deferred to visual spec: what is the canonical check-off interaction? Tap checkbox, swipe, or something else? This choice should be documented for reuse in recurring routines.
- Design decision deferred to visual spec: do checked items move to the bottom of the list or stay in place?
- Design decision deferred to visual spec: how is the archived list filter surfaced without cluttering the active index?
- Design decision deferred to visual spec: is the spouse read-only state indicated per-screen (banner) or per-component (disabled controls with tooltip)?

## Facts, Assumptions, And Decisions
- Facts:
  - Olivia has a working inbox and first-class reminder implementation that this workflow extends alongside.
  - The household trust model is advisory-only and requires explicit confirmation for destructive actions.
  - The PWA uses versioned command sync and a Dexie client cache for offline tolerance.
  - Spouse access is currently read-only across all Horizon 3 workflows.
- Assumptions:
  - `A-007`: shared lists are behaviorally distinct enough from inbox items that they deserve a separate workflow model. This spec is the validation artifact for that assumption.
  - `A-006`: versioned command sync handles household-level list concurrency without CRDT machinery.
- Decisions:
  - Lists are general-purpose titled collections; no fixed categories or templates in Phase 1.
  - Item addition is inline and immediate; no modal.
  - Checking and unchecking are immediate user-initiated actions with no confirmation.
  - Archive requires confirmation; delete requires higher-friction confirmation.
  - Spouse is read-only with a clear role indicator.
  - No AI dependency in the first implementation slice.

## Deferred Decisions
- Whether spouse write access for list items arrives before or alongside broader collaboration permissions.
- Whether a batch "clear all checked" action belongs in Phase 2 or requires a separate spec decision.
- Whether drag-to-reorder items is worth the implementation complexity before household usage reveals whether order matters.
- Whether a recurring-list capability (auto-reset a checked list on a schedule) should be handled inside this workflow or by the recurring routines spec.
- Whether per-list notification subscriptions make sense once spouse write access exists.
- Whether a natural-language item entry mode ("add milk and eggs to grocery list") belongs in the first slice or waits for a reminders-style parsing spec.
