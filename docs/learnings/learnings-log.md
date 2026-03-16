# Learnings Log

## Purpose
This log captures durable lessons that future agents and collaborators should inherit. Entries should focus on reusable understanding, not session-by-session narration.

## Entry Template
Use this structure for future entries:

### L-XXX: Short learning title
- Date:
- Area:
- Learning:
- Why it matters:
- Implication:
- Source:
- Related docs:

## Current Learnings

### L-024: Proactive nudges confirm purely-computed API pattern — no new tables, client-only dismiss state
- Date: 2026-03-15
- Area: H5 architecture / Dexie / API design
- Learning: `GET /api/nudges` is a wholly-computed, read-only endpoint that derives its payload from existing entity state (routine occurrences, reminders, routines table). It requires no new server-side tables. Dismiss state is stored client-only in a Dexie v7 `nudgeDismissals` table, daily-reset, never synced. This cleanly separates ephemeral UI state (dismiss) from durable household data.
- Why it matters: any time a feature needs a "recent state" or "currently relevant items" view, a computed endpoint over existing tables is preferable to a new audit table. The pattern scales to other advisory surfaces.
- Implication: future "surface-active-items" features should default to computed endpoints over new tables unless they need persistence beyond the current session.
- Source: OLI-65 implementation (M19)
- Related docs: `docs/specs/proactive-household-nudges.md`, `docs/plans/proactive-household-nudges-implementation-plan.md`

### L-025: DST timezone issue in domain tests — use noon UTC (T12:00:00.000Z) for all routine due date fixtures
- Date: 2026-03-15
- Area: testing / domain
- Learning: Routine due date fixtures using midnight UTC (T00:00:00.000Z) cause DST-boundary failures when `scheduleNextRoutineOccurrence` uses `setDate()` arithmetic — the result can land at 11pm UTC the previous day when DST springs forward. The fix is to use noon UTC (T12:00:00.000Z) for all `currentDueDate` test fixtures.
- Why it matters: DST-related test failures appear non-deterministically (only around DST transitions) and are hard to diagnose.
- Implication: all future routine occurrence date fixtures in tests should use T12:00:00.000Z, not T00:00:00.000Z.
- Source: OLI-65 Phase 2 domain test debugging
- Related docs: `packages/domain/test/nudges-domain.test.ts`

### L-023: H5 Phase 1 validated the advisory-only AI integration pattern — strictly additive, no regressions, trust model holds
- Date: 2026-03-15
- Area: product validation / H5 architecture
- Learning: The M17 build (AI-assisted planning ritual summaries) confirmed that advisory-only AI can be introduced as a strictly additive layer on top of an existing workflow without breaking any of the underlying flow's behavior, data model, or tests. All 220 existing tests continued to pass. The AI layer added two nullable columns to `review_records` (no new tables), a new server-side API endpoint, and new PWA surface states — none of which affected ritual completion, occurrence scheduling, or review record creation when AI was absent or failed.
- Why it matters: this validates the H5 behavioral guardrail approach. Proactive nudges (H5 Phase 2) and future AI features can follow the same pattern: introduce new behavior as additive capability that degrades cleanly rather than introducing new dependencies that could break existing workflows.
- Implication: when scoping subsequent H5 features, the Phase 1 constraint should remain "additive with clean degradation." Any H5 feature that requires modifying existing endpoint behavior (rather than adding new endpoints or new nullable fields) should be treated as a higher-risk change requiring explicit review.
- Source: OLI-59 implementation (M17 complete, D-037)
- Related docs: `docs/specs/ai-assisted-ritual-summaries.md`, `docs/roadmap/milestones.md` (M17), D-037, D-034

### L-022: SQLite FK circular dependencies require a 3-step insert pattern — insert parent with null FK, insert child, update parent
- Date: 2026-03-15
- Area: data integrity / SQLite
- Learning: When two tables have mutually-referencing FKs (A.ref → B.id and B.ref → A.id) with `PRAGMA foreign_keys = ON`, any single-INSERT order will violate one constraint. The correct pattern is: (1) insert the table whose FK field is nullable first (with null value), (2) insert the second table (first now exists, FK satisfied), (3) UPDATE the first table to set the FK back-reference. This must happen atomically inside a transaction.
- Why it matters: the `review_records` / `routine_occurrences` circular reference is a real pattern in the schema. Getting the insert order wrong causes a silent 400 error at runtime (FK constraint propagated as SQLITE_CONSTRAINT_FOREIGNKEY through the Fastify error handler).
- Implication: any schema with circular FKs must use this pattern. When reviewing new migrations, check for circular references and ensure the repository methods follow the 3-step pattern. Also: always test with `foreign_keys = ON` enabled — bugs in this area only appear when FK enforcement is active.
- Source: OLI-59 implementation (AI-assisted planning ritual summaries, Phase 4/7)
- Related docs: `apps/api/src/repository.ts` (`completeRitualOccurrence`), D-037

### L-001: The product should be framed as a household command center, not a general AI assistant
- Date: 2026-03-08
- Area: product framing
- Learning: The most useful and executable product framing is a household command center focused on reducing coordination overhead, not a broad assistant identity.
- Why it matters: this creates a clearer product boundary and improves roadmap discipline.
- Implication: future specs should bias toward household operations, shared state, reminders, planning, and memory rather than open-ended assistant capabilities.
- Source: initial product-definition planning with the stakeholder
- Related docs: `docs/vision/product-vision.md`

### L-002: Durable project memory is a core project need, not optional process overhead
- Date: 2026-03-08
- Area: project operations
- Learning: Because Olivia is intended to be built agentically over time, learnings, assumptions, and decisions must be curated into durable docs rather than left in transient conversation history.
- Why it matters: future agents may start with limited context and still need to make coherent product decisions.
- Implication: strategic docs, learnings logs, and decision history should be maintained as part of normal delivery work.
- Source: stakeholder requirement during planning
- Related docs: `docs/strategy/agentic-development-principles.md`, `docs/learnings/README.md`

### L-003: Product management guidance must be explicit for agent-authored documentation
- Date: 2026-03-08
- Area: process design
- Learning: The project benefits from a documented PM operating model so future agents know they are expected to synthesize stakeholder input into recommendations rather than merely transcribe ideas.
- Why it matters: without this guidance, future agents may produce passive or low-signal documentation.
- Implication: product docs should reflect recommendation, rationale, and trade-offs rather than only option catalogs.
- Source: planning refinement with the stakeholder
- Related docs: `docs/strategy/agentic-development-principles.md`

### L-004: Local-first shared household products need a canonical shared store plus device-local caches
- Date: 2026-03-09
- Area: system architecture
- Learning: For Olivia's household use case, local-first should not mean browser-local-only storage. Shared household continuity works better when a household-controlled canonical store exists alongside device-local caches and offline outboxes.
- Why it matters: this clarifies a key architectural ambiguity that would otherwise recur whenever the project discusses privacy, offline behavior, or spouse visibility.
- Implication: future implementation work should distinguish clearly between canonical durable memory, client caches, and sync semantics rather than treating all local storage as equivalent.
- Source: architecture exploration for the shared household inbox workflow
- Related docs: `docs/strategy/system-architecture.md`, `docs/specs/shared-household-inbox.md`

### L-005: Stack cohesion matters less than keeping product-shaping seams explicit
- Date: 2026-03-09
- Area: architecture decision-making
- Learning: A single broader ecosystem can reduce integration overhead, but for Olivia's current phase the more important property is explicit control over product-shaping seams such as persistence, sync, approvals, and AI boundaries.
- Why it matters: this helps future agents evaluate frameworks without over-valuing single-stack consistency at the expense of trust, reversibility, or architectural legibility.
- Implication: Olivia should use TanStack heavily where it clearly fits the client problem, but remain selective about adopting broader ecosystem pieces when they would also define core data or AI boundaries prematurely.
- Source: architecture recommendation and follow-up stack evaluation
- Related docs: `docs/strategy/system-architecture.md`

### L-006: Once implementation exists, code and tests become meaningful orientation artifacts
- Date: 2026-03-13
- Area: agent workflow
- Learning: Olivia's docs remain the source of truth for product intent, but once the MVP exists, the codebase structure, shared contracts, domain rules, and tests become essential context for understanding current system behavior.
- Why it matters: future agents should not spend their token budget re-reading every strategic doc for routine implementation work when task-relevant code and tests provide more precise context.
- Implication: orientation guidance should be tiered by task, and implementation work should read the relevant spec or plan plus the corresponding code paths rather than defaulting to a full strategic reread.
- Source: Horizon 3 documentation refresh
- Related docs: `docs/strategy/agentic-development-principles.md`, `AGENTS.md`

### L-007: The inbox reminder deferral becomes a limiting constraint once Horizon 3 expands into routines and planning
- Date: 2026-03-13
- Area: product scope evolution
- Learning: Treating reminders only as inbox item properties was a useful MVP simplification, but it becomes a constraint once Olivia expands into first-class reminders, recurring routines, and broader planning support.
- Why it matters: Horizon 3 should build on the inbox without forcing every future workflow into the inbox's original data model.
- Implication: reminder and recurrence concepts should be reconsidered explicitly during Horizon 3 scoping rather than inherited unchanged from the MVP.
- Source: Horizon 3 roadmap and milestone update
- Related docs: `docs/roadmap/roadmap.md`, `docs/learnings/decision-history.md`

### L-008: The tap-checkbox interaction pattern established in Shared Lists should be the standard for all completion interactions in Horizon 3
- Date: 2026-03-15
- Area: design system
- Learning: The Designer explicitly designed the tap-checkbox pattern in Shared Lists to be directly reusable for Recurring Routines. No new design decisions are needed for that primitive.
- Why it matters: this accelerates the Recurring Routines design phase because the core completion interaction has already been validated.
- Implication: Recurring Routines implementation should reuse the checkbox component from Shared Lists rather than introducing a new completion interaction. Drag-to-reorder, swipe-to-complete, and other variations remain deferred.
- Source: Designer review of OLI-16 (Shared Lists implementation), OLI-17 comments
- Related docs: `docs/plans/shared-lists-visual-implementation-spec.md`, `docs/specs/shared-lists.md`

### L-009: The per-screen spouse banner is the standard pattern for communicating read-only role across all Horizon 3 workflows
- Date: 2026-03-15
- Area: design system / trust model
- Learning: The per-screen banner approach (established in reminders, validated in Shared Lists) is now the confirmed standard for communicating the spouse's read-only role. Per-component disabled controls create confusion about whether the interface is broken.
- Why it matters: Recurring Routines and all future Horizon 3 workflows can adopt the banner pattern without reopening the design decision.
- Implication: any new Horizon 3 workflow with a spouse read-only state should use the same `--lavender-soft` bg, `--violet` text banner pinned below the screen header. No new design token or pattern is needed.
- Source: Designer review and visual spec for Shared Lists (Section 2.6 and screen state LIST-IDX-5 / LIST-DET-4)
- Related docs: `docs/plans/shared-lists-visual-implementation-spec.md`

### L-010: Horizon 3 workflows follow a predictable spec-then-design-then-implement cycle; the cycle itself is now stable and documented
- Date: 2026-03-15
- Area: project operations
- Learning: Two full Horizon 3 feature cycles (reminders, shared lists) established a clear pattern: VP of Product writes spec → Designer writes visual spec → Founding Engineer implements. Reviews and milestone updates run at the end of each cycle.
- Why it matters: future agents can follow this cycle without re-deriving process conventions, and each cycle ends with a predictable set of artifacts.
- Implication: the Recurring Routines cycle should follow the same pattern. Implementation tasks should not be created until the spec has CEO approval and the visual spec is complete.
- Source: Shared Lists cycle review (OLI-17)
- Related docs: `docs/roadmap/milestones.md`, `docs/learnings/decision-history.md`

### L-011: All four Horizon 3 workflows share a coherent coordination-layer model that emerged from building rather than design
- Date: 2026-03-15
- Area: product architecture
- Learning: Reminders, Shared Lists, Recurring Routines, and Meal Planning each introduce distinct workflow types, but all share the same underlying household-coordination model: named entities that can be viewed, actioned, and shared in a household context. This coherence was not designed in advance — it emerged from building all four workflows in sequence.
- Why it matters: the coordination layer is more unified than might have been expected. Future workflows can follow this same pattern without needing to re-justify each new surface.
- Implication: post-M7 planning should explicitly build on this model (reminders, lists, routines, meal plans as first-class household entities) rather than introducing disconnected tool surfaces. Adjacent problems — shopping-list integration with meal plans, household calendar, chore rotation — are natural extensions of this model.
- Source: completion of all four Horizon 3 workflows (OLI-34 and predecessors, 2026-03-15)
- Related docs: `docs/roadmap/roadmap.md`, `docs/specs/`

### L-012: Meal planning confirms the household command center thesis extends credibly into proactive planning
- Date: 2026-03-15
- Area: product validation
- Learning: Meal planning's recipe catalog plus weekly scheduling model goes beyond task and reminder management into proactive household planning. Its successful implementation confirms that the "household command center" framing can encompass planning workflows without losing coherence or overreaching into disconnected territory.
- Why it matters: this is the strongest structural evidence to date that Olivia's scope (shared state, reminders, routines, and planning) holds together as a coordination platform rather than a loosely related feature collection.
- Implication: the household command center is now validated as a product frame across four distinct workflow types. Post-M7 prioritization should identify adjacent planning and coordination problems that compound on these primitives — not new categories that would fragment the platform model.
- Source: meal planning spec (OLI-28), visual spec (OLI-32), implementation plan (OLI-33), full implementation (OLI-34)
- Related docs: `docs/specs/meal-planning.md`, `docs/plans/meal-planning-visual-implementation-spec.md`

### L-015: The unified weekly view established the cross-workflow temporal query pattern — activity history should follow the same shape backward in time
- Date: 2026-03-16
- Area: product architecture
- Learning: The unified weekly view implementation (OLI-45) delivered three domain helpers (getWeekBounds, getRoutineOccurrenceDatesForWeek, getRoutineOccurrenceStatusForDate) and a dedicated API endpoint (GET /api/weekly-view) that assembles cross-workflow scheduled state for a given calendar week. This pattern — a single query boundary, a domain layer that provides temporal helpers, a dedicated read-only API endpoint, and PWA assembly from cached H3 state — is the right shape for activity history as well, but looking backward at completed state rather than forward at scheduled state.
- Why it matters: the activity history implementation does not need to invent a new architectural approach. It can follow the weekly view pattern directly, substituting `completed_at`/`resolved_at` window queries for the weekly view's schedule-projection logic.
- Implication: the activity history implementation plan should describe the GET /api/activity-history endpoint, the 30-day window domain helper, and per-workflow-type completed-state queries in explicit parallel to the weekly view's domain and API layers. The Founding Engineer should confirm completion timestamp availability for all five H3 data sources before beginning Phase 1 implementation.
- Source: unified weekly view implementation (OLI-45, 2026-03-16)
- Related docs: `docs/specs/activity-history.md`, `docs/specs/unified-weekly-view.md`, `docs/plans/unified-weekly-view-implementation-plan.md`

### L-014: Activity history and the unified weekly view form a complete temporal pair for Olivia's H4 layer
- Date: 2026-03-16
- Area: product architecture
- Learning: The unified weekly view (forward-looking: current week) and activity history (backward-looking: last 30 days) together provide continuous household time coverage without gaps or overlap. This temporal pair is the defining architectural pattern for Horizon 4's memory layer — present and future in one surface, recent past in the other.
- Why it matters: future H4 work (planning ritual support, AI summaries) should treat this pair as the foundation, not as two isolated features. Planning ritual support in particular will draw on activity history data to auto-populate weekly review content.
- Implication: the planning ritual support spec (the third H4 target) should explicitly reference activity history as its data source rather than re-deriving a separate history model. The data contract between the two should be defined in the planning ritual spec.
- Source: activity history feature spec (OLI-41, 2026-03-16)
- Related docs: `docs/specs/activity-history.md`, `docs/specs/unified-weekly-view.md`, `docs/roadmap/roadmap.md`

### L-016: Review mode and recall mode require fundamentally different display patterns — grouped-by-type vs. reverse-chronological
- Date: 2026-03-16
- Area: product architecture / design system
- Learning: Activity history uses reverse-chronological interleaving within each day section because its purpose is recall ("what happened at 9am?"). The planning ritual review flow uses grouped-by-type display within each review section because its purpose is review-mode orientation ("how many routines did we complete last week?"). These are not stylistic choices — they reflect a fundamental UX difference between recall (timeline answers the question) and review (type-grouping answers the question).
- Why it matters: future features that surface household history should explicitly choose between recall mode and review mode, not default to one pattern for all contexts. Mixing the two patterns within a single screen creates cognitive friction.
- Implication: if future H4 surfaces (e.g., AI summaries, review analytics) present assembled household history, they should decide upfront whether they are a recall surface (reverse-chronological) or a review surface (grouped by type). The planning ritual review flow is the first review-mode surface; activity history is the first recall-mode surface. The two should not be treated as equivalent.
- Source: planning ritual support visual spec (OLI-51), activity history visual spec (OLI-48)
- Related docs: `docs/plans/planning-ritual-support-visual-implementation-spec.md`, `docs/plans/activity-history-visual-implementation-spec.md`

### L-017: The planning ritual closes the Horizon 4 temporal loop — past, present, and synthesis are now all defined
- Date: 2026-03-16
- Area: product architecture
- Learning: The three H4 workflows together create a complete temporal architecture: the unified weekly view covers the present and near future (current week), activity history covers the recent past (last 30 days), and the planning ritual creates a structured synthesis moment (review prior week, acknowledge current week, record carry-forward notes). No new entity type is needed for the synthesis layer — it reuses the recurring routines infrastructure for scheduling and the activity history / weekly view data contracts for content.
- Why it matters: the H4 temporal loop is complete. Future work can build AI-generated narrative or trend analysis on top of this foundation, but the structural layer is closed. Phase 2 H4 extensions (AI summaries, carry-forward conversion, shared spouse review) are now clearly additive, not foundational.
- Implication: new work post-M13 should be evaluated as Phase 2 additions to the existing temporal layer, not as new architecture. The right question is: "how does this compound on the weekly view + activity history + planning ritual foundation?" — not "what new surface does Olivia need?"
- Source: planning ritual support spec (OLI-43), implementation plan (OLI-51), D-025, D-022
- Related docs: `docs/specs/planning-ritual-support.md`, `docs/specs/activity-history.md`, `docs/specs/unified-weekly-view.md`

### L-018: OQ-4 resolved — all five H3/H2 timestamp sources are confirmed and the temporal query pattern is validated
- Date: 2026-03-16
- Area: product architecture / implementation validation
- Learning: The activity history build (OLI-50) fully resolved OQ-4 (timestamp availability) and confirmed the L-015 prediction that the weekly view's temporal query pattern transfers directly backward in time. All five timestamp sources are confirmed: `completedAt` on RoutineOccurrence; `completedAt`/`cancelledAt` on Reminder (state computed from these fields, not a separate `state` column — one implementation fix required); date derived from `weekStartDate + dayOfWeek` for meal entries; `lastStatusChangedAt` on InboxItem; `checkedAt` on ListItem. The domain helpers `getActivityHistoryWindow` and `groupActivityHistoryByDay` parallel `getWeekBounds` and related weekly view helpers exactly.
- Why it matters: the planning ritual support implementation can now use both `GET /api/weekly-view` and `GET /api/activity-history` as stable, confirmed data sources. There are no remaining timestamp availability questions for Phase 1 of any H4 workflow.
- Implication: future implementations that query household completion state should model their domain helpers and API endpoints after the activity history and weekly view patterns. The one structural note to carry forward: Reminder has no `state` column — completion state must be inferred from `completedAt`/`cancelledAt` fields.
- Source: activity history implementation (OLI-50, 2026-03-16)
- Related docs: `docs/specs/activity-history.md`, `docs/plans/activity-history-implementation-plan.md`, L-015, L-014

### L-019: Planning ritual Phase 1 minimal scope is sufficient — structured synthesis adds value without AI or automation
- Date: 2026-03-16
- Area: product validation
- Learning: The planning ritual support Phase 1 delivered a complete weekly review experience (3-step flow: last week recap, coming week overview, carry-forward notes) while deliberately deferring AI summaries, automatic carry-forward conversion, shared spouse participation in the review flow, draft-save, and push notifications for ritual due state.
- Why it matters: validates that L-013's synthesis-first principle (synthesize existing H3 state before AI enhancement) extends successfully through Phase 1 delivery. The minimal ritual has clear standalone value without any AI or automation layer.
- Implication: Phase 2 H4 extensions should be sequenced based on observed household use of Phase 1, not pre-specified. The most valuable next addition (AI summaries vs. carry-forward conversion vs. spouse participation) should emerge from actual ritual use rather than product assumption. This is the post-H4 validation loop that informs H5 planning.
- Source: OLI-52 implementation and deferred boundary list, 2026-03-16
- Related docs: `docs/specs/planning-ritual-support.md`, L-013, L-017

### L-020: Horizon 4 introduced zero new entity types and only one new persistence table — minimal storage validates the synthesis model
- Date: 2026-03-16
- Area: product architecture / implementation validation
- Learning: All three Horizon 4 workflows introduced zero new entity types and only one new database table across the entire H4 build phase. Unified weekly view: zero new tables. Activity history: zero new tables. Planning ritual support: one new table (`review_records`) plus two new columns on existing tables (`ritual_type` on routines, `review_record_id` on routine_occurrences). The direct link from occurrence to review record (`review_record_id`) enables navigation from activity history to review record detail without a separate lookup.
- Why it matters: confirms that H4's synthesis model — building temporal views and synthesis moments on top of H3 state — is architecturally sound and does not require new entity proliferation. The H4 temporal loop is closed with minimal persistence overhead.
- Implication: H5 (Selective Trusted Agency) should evaluate new storage requirements carefully. Trusted action execution and audit trails will likely require new tables, but those should be scoped narrowly and explicitly justified in terms of the trust model rather than assumed. The H4 pattern of minimal new storage is the right discipline to carry forward.
- Source: all three H4 build phases — OLI-45 (unified weekly view), OLI-50 (activity history), OLI-52 (planning ritual support)
- Related docs: L-017, L-018, `docs/specs/planning-ritual-support.md`

### L-021: H4 temporal layer creates the data foundation H5 needs — AI-assisted content is the natural first trusted-agency capability
- Date: 2026-03-16
- Area: product strategy / H5 scoping
- Learning: Horizon 4's three workflows (unified weekly view, activity history, planning ritual) together produce a structured, queryable temporal dataset — present/future, past 30 days, and weekly synthesis — that makes AI-assisted content generation meaningful rather than speculative. The planning ritual in particular has an immediate AI-assist angle: Olivia can draft "last week recap" and "coming week overview" from real H4 data rather than requiring the user to reconstruct them manually. This is the most natural first trusted-agency capability because it is advisory-only, uses confirmed H4 data sources, and reduces genuine cognitive load without introducing record-modification risk.
- Why it matters: H5 should not begin by specifying low-level automation rules. It should begin with the capability that best demonstrates that H4's data is now worth reasoning about — and that capability is AI-assisted draft content for the planning ritual, not rule-based automation.
- Implication: the first H5 spec target is AI-assisted planning ritual summaries. Rule-based automation (e.g., auto-advance routines) is explicitly H5 Phase 2+ and should not be scoped in Phase 1. The second H5 target — proactive household nudges — bridges from advisory AI content to Olivia-initiated surface prompts, sequenced after Phase 1 validation.
- Source: M15 scoping (2026-03-16), L-017, L-019, L-020
- Related docs: `docs/roadmap/roadmap.md`, `docs/roadmap/milestones.md` (M15), `docs/specs/planning-ritual-support.md`

### L-013: The unified weekly view is the natural first Horizon 4 surface — cross-workflow temporal context was the missing layer after four H3 workflows
- Date: 2026-03-16
- Area: product architecture
- Learning: After four Horizon 3 workflows (reminders, shared lists, recurring routines, meal planning), each operating in its own dedicated screen, the most immediately valuable Horizon 4 contribution is not a new entity type or AI capability — it is a unified temporal view that assembles existing H3 entities into a day-by-day picture of the household's week. The unified weekly view introduces no new data entities; it surfaces existing scheduled state in a cross-workflow context.
- Why it matters: this confirms that Olivia's H4 layer should start by synthesizing what already exists, not by introducing new primitives. The weekly view has clear value without AI — its value comes from aggregation and temporal context, not inference.
- Implication: future H4 specs (activity history, planning ritual support) should follow the same pattern: synthesize and surface existing H3 state before adding AI-generated narrative or new entity types. AI enhancement is a Phase 2 addition, not a Phase 1 requirement.
- Source: unified weekly view spec (OLI-38), D-022, D-024
- Related docs: `docs/specs/unified-weekly-view.md`, `docs/roadmap/roadmap.md`
