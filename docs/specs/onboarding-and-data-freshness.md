# Feature Spec: Improved Onboarding & Data Freshness

## Status
- Approved (CEO approved 2026-03-17, Phase 1 first)
- **Phase 1 shipped** (CEO final validation 2026-03-17). 7/8 AC pass, 1 accepted tradeoff (inline edit deferred to fast-follow). 294 tests passing. Commits: 426ae8f, 23ea9e0, 91deb3c.
- Phase 2 (data freshness) planning next — same sequence: spec refinement → CEO approval → design → build.

## Summary
Olivia currently has no guided onboarding experience. New users land on an empty home screen and must manually create every inbox item, routine, reminder, list, and meal plan from scratch — the exact kind of cognitive labor the product exists to reduce. This spec proposes a two-part solution: (1) a conversational onboarding flow that makes initial setup feel lightweight and progressive, and (2) a data freshness system that prevents household state from drifting out of sync with reality over time.

## User Problem
- **Onboarding burden**: Setting up a household command center from zero requires entering dozens of items across five workflow types. Without integrations (calendars, task apps, etc.), this is pure manual entry — a one-time cost that feels like the opposite of the product's promise.
- **Data drift**: Even after setup, household reality changes constantly. Items become stale, routines shift, lists go unreviewed. If the app's data drifts from reality, Olivia becomes unreliable and eventually a burden rather than a help.
- **Current state**: The staleness system only covers inbox items (14-day threshold). Routines, reminders, lists, and meal plans have no drift detection. There is no periodic review ritual or freshness prompt.

## Target Users
- Primary user: stakeholder (primary operator and initial data entry person)
- Secondary user: spouse (benefits from populated state; may contribute items via chat)

## Desired Outcome
- A new user can go from install to "useful household state" in a single 10–15 minute session, without feeling like they're filling out forms
- Household data stays meaningfully accurate over weeks and months without requiring the user to manually audit everything
- The app feels alive and trustworthy rather than stale and abandoned

## In Scope

### Phase 1: Conversational Onboarding ("Brain Dump")
- A guided first-run experience triggered when the app detects an empty or near-empty household state
- Chat-driven setup using Olivia's existing AI conversation interface
- Progressive topic prompts: Olivia walks the user through household areas one at a time
- Bulk entity creation from freeform natural language input
- Starter templates for common routines and lists
- A "done for now, continue later" escape hatch at any point

### Phase 2: Data Freshness & Gentle Review
- Extend staleness detection beyond inbox items to routines, reminders, lists, and meal plans
- A periodic "household health check" — a lightweight, opt-in review surface
- Proactive nudges when data appears to have drifted (leveraging existing H5 nudge infrastructure)
- A "still accurate?" confirmation pattern that takes one tap to dismiss

## Boundaries, Gaps, And Future Direction
- **No integrations**: This spec does not add calendar import, Google Tasks sync, or any external data source. The goal is to make manual entry as painless as possible within Olivia's local-first model.
- **No mandatory flows**: Onboarding is guided but never required. Users can skip or exit at any point and use the app normally.
- **No spouse onboarding path**: The spouse role remains secondary. Spouse-specific onboarding is deferred.
- **Future**: Calendar/contact import, photo-to-list capture (photograph a whiteboard or fridge list), and voice-driven bulk entry are natural extensions but out of scope.

## Workflow

### Onboarding Flow

1. **Trigger**: User opens the app for the first time (or household has ≤2 total entities across all workflow types). Home screen displays a welcome card: "Let's get your household set up. It takes about 10 minutes."
2. **Entry point**: Tapping the welcome card opens a dedicated onboarding chat session with Olivia (distinct from the regular `/olivia` chat — uses a special `onboarding` conversation type).
3. **Topic-guided prompts**: Olivia walks through household areas progressively:
   - "Let's start with the things on your mind. What tasks, to-dos, or obligations are you tracking right now? Just list them — I'll organize them."
   - "Any recurring chores or routines your household does regularly? Things like cleaning, laundry, taking out trash, paying bills?"
   - "Do you have any upcoming reminders or deadlines you want to make sure you don't forget?"
   - "Do you keep any shared lists — groceries, shopping, packing lists?"
   - "Do you plan meals for the week? If so, tell me about your typical pattern."
4. **AI parsing**: For each topic, Olivia parses freeform text into draft entities (using the existing `createDraft` pattern with confidence levels). Drafts are presented as a reviewable batch: "Here's what I captured — look right?"
5. **Batch confirm**: User can confirm all, edit individual items, or dismiss. Confirmed items are created in bulk.
6. **Starter templates**: For routines and lists, Olivia also offers common templates: "Many households track routines like weekly cleaning, trash day, and laundry. Want me to add any of these?" Templates are presented as toggleable suggestions, not auto-created.
7. **Progressive exit**: After each topic, Olivia offers: "Want to keep going, or is this enough for now?" The user can stop at any time. A "Continue setup" card appears on the home screen for incomplete onboarding.
8. **Completion**: When the user has covered all topics (or explicitly says they're done), Olivia summarizes what was created and the welcome card is replaced with the normal home screen.

### Data Freshness Flow

1. **Extended staleness detection**: Each workflow type gets a freshness rule:
   - Inbox items: existing 14-day `lastStatusChangedAt` threshold (unchanged)
   - Routines: flagged if no occurrence completed in 2× the recurrence interval (e.g., a weekly routine with no completion in 14 days)
   - Reminders: flagged if active reminder's `scheduledAt` is >7 days past and state is still `pending`
   - Shared lists: flagged if a list has not been modified in 30 days and still has unchecked items
   - Meal plans: flagged if the current week has no meal plan and the user has used meal planning before
2. **Household health check**: A monthly (configurable) summary card appears on the home screen: "It's been a month — want to do a quick household check-up?" Tapping opens a focused review screen showing:
   - Items flagged as potentially stale across all workflow types
   - For each item: title, last activity date, and one-tap actions: "Still active" / "Archive" / "Update"
   - A completion state: "All caught up!" when everything is reviewed
3. **Inline freshness nudges**: Between monthly reviews, individual items that cross freshness thresholds generate proactive nudges via the existing H5 nudge tray: "Weekly cleaning hasn't been marked done in 3 weeks — still on track?"
4. **"Still accurate?" pattern**: For nudges, the user can respond with a single tap: "Yes, still active" (resets the freshness clock) or "No, archive/pause" (marks the item accordingly). This must be lower friction than opening and editing the item.

## Behavior

### System Records (Facts)
- Onboarding session state: `started`, `topic_completed[]`, `finished` — persisted so the "continue setup" card knows where to resume
- Per-entity `freshnessCheckedAt` timestamp: updated when user confirms "still active" during a health check or nudge response
- Monthly health check history: when the last check was offered and completed

### Suggestions Olivia Makes (Advisory)
- Topic prompts during onboarding
- Starter template suggestions
- Health check timing
- Staleness nudges

### Actions Olivia Proposes (Require Confirmation)
- Batch entity creation from parsed freeform input
- Archiving or pausing items flagged as stale
- No auto-creation or auto-archival without explicit user confirmation

## Data And Memory
- Onboarding state is local, session-level data — not sensitive but should survive app restarts
- Entity creation during onboarding uses the same domain model and persistence as normal CRUD
- `freshnessCheckedAt` is a new per-entity field (nullable timestamp)
- Health check history is a lightweight local record (last offered date, last completed date)
- All data remains local-first per existing architecture

## Permissions And Trust Model
- This feature remains **advisory-only**
- **Agentic actions** (Olivia proposes → user confirms): batch entity creation from parsed text, archive/pause suggestions during health checks
- **User-initiated actions** (direct command → immediate): confirming "still active", manually editing items during review, skipping onboarding topics
- **Destructive actions** (always confirm): archiving or deleting items, even during health check review
- **Olivia must never**: auto-create entities without confirmation, auto-archive stale items, skip showing drafts during onboarding

## AI Role
- **Onboarding**: AI parses freeform natural language into structured entity drafts. This is the core value — turning a "brain dump" into organized household state.
- **Freshness nudges**: AI generates contextual nudge copy (e.g., "Your weekly grocery list hasn't been updated in a month — still using it?"). Could use the existing nudge generation pipeline.
- **If AI is unavailable**: Onboarding falls back to a structured form-based flow (less magical but functional). Freshness detection is rule-based and does not depend on AI. Nudge copy falls back to templates.

## Risks And Failure Modes
- **Onboarding abandonment**: User starts but doesn't finish. Mitigation: progressive exit + "continue later" card. Even partial setup is valuable.
- **AI parsing errors**: Freeform text is parsed incorrectly. Mitigation: always show drafts for review before creating. Use confidence levels (existing pattern) to flag uncertain parses.
- **Nudge fatigue**: Too many freshness prompts become annoying. Mitigation: throttle nudges (max 2 freshness nudges per day), monthly health check is opt-in, "still active" is a single tap.
- **Over-templating**: Starter templates don't match the household. Mitigation: templates are suggestions, never auto-applied. Start with a small, conservative set.
- **Health check feels like a chore**: Mitigation: keep it short (5 items max per check), make it skippable, celebrate completion ("All caught up!").

## UX Notes
- Onboarding should feel like a **conversation**, not a form wizard. Olivia's existing chat interface is the right surface.
- The brain dump parsing should feel **magical** — "I just told Olivia everything and it organized it all."
- Freshness prompts should feel **calm and helpful**, not nagging. The ethos principle "reduce cognitive load, not increase it" is the north star.
- The health check should feel like a **quick pulse**, not an audit. Under 2 minutes is the target.
- Empty states after onboarding should feel **earned** ("Nothing here yet — add your first routine") not abandoned.
- The "Continue setup" card should be **prominent but not obnoxious**. If someone exits after tasks and routines, they got value — don't make it feel like they failed by not finishing all five topics.

## Acceptance Criteria

### Onboarding
1. A new user with an empty household sees a welcome card on the home screen
2. Tapping the welcome card opens a guided onboarding chat with Olivia
3. Olivia prompts through at least 4 household topics (tasks, routines, reminders, lists)
4. Freeform text input is parsed into reviewable entity drafts with confidence indicators
5. User can confirm, edit, or dismiss drafts before creation
6. User can exit at any point and resume later via a "Continue setup" home screen card
7. Starter templates are offered for routines and lists as optional suggestions
8. Onboarding chat is distinct from regular Olivia chat (separate conversation type)

### Data Freshness
9. Staleness detection covers all five workflow types with type-appropriate thresholds
10. A monthly health check card appears on the home screen at the configured interval
11. Health check shows stale items with one-tap "Still active" / "Archive" actions
12. Freshness nudges appear in the nudge tray for individually stale items (max 2/day)
13. "Still active" confirmation resets the freshness clock without requiring item edit
14. Health check and nudges are skippable and never block normal app usage

## Validation And Testing
- **Onboarding**: Have the stakeholder go through onboarding with their real household data. Measure: (a) time to "useful state", (b) accuracy of AI-parsed entities, (c) completion rate across topics.
- **Freshness**: Run for 4+ weeks after setup. Measure: (a) whether flagged items were genuinely stale, (b) whether nudge frequency felt right, (c) whether the health check was completed or dismissed.
- **Unit tests**: AI parsing accuracy for common household text patterns; staleness threshold calculations for each workflow type.
- **Integration tests**: Onboarding session state persistence across app restarts; health check scheduling and nudge throttling.

## Dependencies And Related Learnings
- Existing chat infrastructure (`apps/api/src/chat.ts`) — onboarding uses a specialized system prompt
- Existing `createDraft` / `previewCreateCommand` / `confirmCreateCommand` patterns — batch creation builds on this
- Existing H5 proactive nudge system — freshness nudges are a new nudge type
- A-004 (14-day staleness threshold, low confidence) — this spec extends staleness across all types and should help validate appropriate thresholds
- A-010 (standalone reminders reduce inbox misuse) — onboarding should guide users to the right workflow type
- D-055 (Today-Forward home screen) — welcome card and health check card live on this surface

## Open Questions
All resolved — CEO decisions recorded 2026-03-17:
1. **Onboarding trigger threshold**: ≤2 entities. Decided: keep it. Someone who manually created one grocery list still needs the guided tour.
2. **Health check frequency**: Monthly fixed. Don't over-engineer with adaptive cadence yet. Ship monthly, reassess in 8 weeks based on dismiss rates.
3. **Template set**: Small (5-7 routines, 2-3 lists). Conservative is correct — bad templates erode trust fast. Expand only when user behavior signals demand.
4. **Spouse onboarding**: Deferred. Not worth the scope right now.
5. **Batch creation UX**: Inline in chat. Keeps the conversational feel. If editing friction shows up in validation, add a review sheet as a follow-up — don't build both upfront.

## Facts, Assumptions, And Decisions
- **Fact**: No onboarding flow currently exists. Users land on an empty home screen.
- **Fact**: Staleness detection only covers inbox items today (14-day threshold).
- **Fact**: The chat interface and AI parsing infrastructure already exist and can be extended.
- **Assumption**: A conversational brain-dump approach will feel less burdensome than structured forms for initial data entry.
- **Assumption**: Monthly health checks are frequent enough to catch drift without feeling nagging.
- **Assumption**: 2× recurrence interval is the right staleness threshold for routines (needs validation).
- **Decision**: Onboarding uses a dedicated chat session, not the general Olivia chat, to keep conversation context focused and allow session state tracking.
- **Decision**: Starter templates are opt-in suggestions, never auto-applied.
- **Decision**: Freshness nudges are throttled to max 2/day to prevent fatigue.
- **Decision**: Onboarding trigger threshold is ≤2 entities (CEO, 2026-03-17).
- **Decision**: Health check frequency is monthly fixed — no adaptive cadence yet (CEO, 2026-03-17).
- **Decision**: Template set is small and conservative: 5-7 routines, 2-3 lists (CEO, 2026-03-17).
- **Decision**: Spouse onboarding deferred (CEO, 2026-03-17).
- **Decision**: Batch creation UX is inline in chat — no separate review sheet unless editing friction surfaces in validation (CEO, 2026-03-17).
- **Decision**: Phase 1 (onboarding) ships first. Phase 2 (freshness) only starts after onboarding is shipped and validated (CEO, 2026-03-17).

## Deferred Decisions
- Calendar/contact import and other integration-based onboarding
- Photo-to-list capture (OCR from whiteboard/fridge photos)
- Voice-driven bulk entry
- Spouse-specific onboarding flow
- Adaptive health check frequency based on user behavior patterns
- Whether to add a "household profile" concept (household name, members, preferences) as part of onboarding
