# Feature Spec: AI-Assisted Planning Ritual Summaries

## Status
- Approved (D-035, 2026-03-15)

## Summary

AI-assisted planning ritual summaries is the first Horizon 5 (Selective Trusted Agency) feature. When a household member opens the planning ritual review flow, Olivia uses the confirmed H4 temporal data sources — activity history (what happened last week) and the unified weekly view (what is coming up) — to generate a concise AI-drafted narrative for the "last week recap" and "coming week overview" sections. The household member reviews the draft, optionally edits it, and accepts or dismisses it. The accepted version becomes part of the durable review record. If the household member dismisses the draft, the existing structured data view remains the canonical display. If it works well, the planning ritual review should feel less like manually interpreting a list of items and more like reading a ready-made household recap that captures the week at a glance.

## User Problem

The planning ritual's recap and overview sections in Phase 1 display structured item lists — each completed routine, reminder, meal, inbox item, and list item rendered as a row. This is accurate but cognitively dense. To understand "how did last week actually go?", the household member must mentally integrate multiple lists of individual rows into a coherent picture. That synthesis step is friction. The same is true for the coming week: a calendar of individual items does not produce the "here's what to expect" summary that reduces planning anxiety.

AI-assisted summaries solve this by generating the narrative layer the household member would otherwise write themselves — in a few seconds, before they have read a single row.

## Target Users

- Primary user: stakeholder (household primary operator) — initiates and reviews the planning ritual
- Secondary user: spouse — views accepted narrative in completed review records in read-only mode (Phase 1)
- Future users: not relevant for Phase 1

## Desired Outcome

When the household member opens the planning ritual review flow, the recap and overview sections should lead with a short, accurate AI-generated paragraph summarizing the household's week. The member should be able to read, optionally revise, and accept the summary in less time than it would take to scan all the underlying rows. Over time, accepted summaries in review records should create a lightweight, searchable household narrative that is more readable than raw item lists.

## In Scope

- AI-generated draft narrative for the **last week recap** section of the planning ritual review flow, generated from the activity history data for the prior calendar week.
- AI-generated draft narrative for the **coming week overview** section of the planning ritual review flow, generated from the unified weekly view data for the current calendar week.
- Draft attribution: each AI-generated draft section is visibly labeled "Drafted by Olivia" before the household member accepts or edits it.
- User review, edit, and accept flow: the household member can accept the draft as-is, edit it inline, or dismiss it entirely. The accepted version (original or edited) becomes part of the durable review record.
- Dismiss option: if the household member dismisses the AI draft, the section reverts to the existing structured item list display. The review can still be completed normally.
- Storage extension: two nullable fields added to the `review_records` table — `recap_narrative` and `overview_narrative` — populated only when the household member accepts a draft (original or edited).
- Attribution preservation in the review record detail: when the review record is later viewed from activity history, accepted narratives are displayed with an "AI-assisted" visual indicator, distinguishing Olivia's draft from the household member's own carry-forward notes.
- Graceful degradation: if the external AI provider is unavailable or the AI call fails, the review flow proceeds normally using the existing structured item list display, without error or interruption.
- Offline behavior: if the device is offline when the review flow is opened, AI generation is skipped and the existing structured view is shown. The household member can still complete the ritual normally.
- Error state handling: a visible, calm indicator when AI generation is in progress; a calm fallback message when it fails, with no disruption to the review flow.

## Boundaries, Gaps, And Future Direction

**Not in scope for Phase 1:**
- AI generation for the carry-forward notes section. The carry-forward field is free-text household input — Olivia does not draft or suggest content for it in Phase 1.
- Proactive ritual nudges (in-app or push notifications for ritual due state). This is the second H5 capability, sequenced after Phase 1 AI-content validation (per D-034).
- Rule-based automation (e.g., auto-converting carry-forward notes to inbox items). Deferred to H5 Phase 2+ (per D-034).
- AI generation outside the planning ritual context (e.g., standalone weekly summaries, routine-level AI summaries, inbox AI-assisted drafts). Phase 1 is scoped narrowly to the planning ritual review flow.
- Regeneration UI: if the user accepts a draft and then wants a fresh draft, Phase 1 does not provide a regenerate button. The draft is generated once per review session. Revisit in Phase 2 if this is friction.
- Prompt customization or user-controlled AI persona settings.
- AI provider selection or model-switching UI.

**Known gaps acceptable in Phase 1:**
- If the household has sparse H3 activity in a given week, the AI draft may be very short ("No routines were completed last week. No items were scheduled this week."). This is accurate and expected — not an error.
- The AI draft may occasionally produce phrasing the household member finds mildly inaccurate or overstated. The edit affordance is the mitigation. Over time, prompt refinement can improve quality.
- AI latency: generation takes time. The household member sees a loading state. If the draft takes too long (implementation-defined timeout, e.g., 10 seconds), the flow falls back to the structured view gracefully.
- Accepted narrative text is sent to the external AI provider as prompt input content. Carry-forward notes from prior reviews are not included in the AI context, to contain the privacy surface of the external call.

**Likely future direction:**
- Proactive household nudges (H5 Phase 2, per D-034): Olivia initiates in-app prompts and push notifications for overdue routines, approaching reminder deadlines, and planning ritual due dates.
- Carry-forward AI suggestions: based on the coming week overview, Olivia suggests potential carry-forward items ("Your grocery list hasn't been updated — want to add one?").
- Natural-language note annotation: AI-assisted structuring of carry-forward notes.
- Review record search and narrative browsing across completed rituals.

## Workflow

**Modified planning ritual review flow (Phase 1 + AI):**

1. The household member opens the planning ritual review flow by tapping the ritual occurrence in the routine index.
2. Olivia begins assembling the review sections. Simultaneously, it initiates the AI draft generation for both the recap and overview sections (parallel calls) using the H4 API data.
3. The review flow opens at Step 1 (Last week recap). While AI generation is in progress, a brief inline loading indicator is shown in place of the narrative draft (e.g., "Olivia is drafting your recap…"). The structured item list is already rendered below as a fallback.
4. When the AI draft is ready (or when the timeout is reached), the draft narrative appears above the structured item list, clearly labeled "Drafted by Olivia."
5. The household member can:
   - **Accept** the draft as-is (tap "Use this summary") — the draft is saved as the accepted narrative for this section.
   - **Edit then accept** (tap an edit affordance on the draft, modify text inline, then tap "Use this summary") — the edited version is saved.
   - **Dismiss** the draft (tap "Dismiss") — the narrative draft disappears; the existing structured item list is the section content. No narrative is saved to the review record.
6. The household member advances to Step 2 (Coming week overview). Same AI draft experience.
7. The household member advances to Step 3 (Carry-forward notes) — no AI involvement. The existing free-text field behavior is unchanged.
8. The household member taps "Complete review." The ritual occurrence is marked complete and the review record is saved. If narratives were accepted, `recap_narrative` and `overview_narrative` are populated in the review record. If both were dismissed, these fields remain null.
9. Completed ritual occurrence appears in activity history with the planning ritual visual indicator. Tapping opens the review record detail, which now includes the accepted narratives (if present) alongside carry-forward notes. Each accepted narrative is labeled "AI-assisted" to preserve attribution (per H5 behavioral guardrail).

**If AI generation fails at any step:**
- The loading indicator resolves to a calm, non-alarming message: "Olivia couldn't generate a summary right now."
- The structured item list is the sole content for that section.
- The review flow continues normally. No error dialog or interruption.

## Behavior

**AI draft generation:**
- Triggered when the review flow opens, immediately after the ritual occurrence is tapped.
- Both recap and overview drafts are generated in parallel to minimize perceived latency.
- Input data for recap draft: the same activity history data that populates the last week recap section — completed routine occurrences, resolved reminders, past meal plan entries, closed inbox items, and checked-off list items from the prior Monday–Sunday window. This data is assembled by the API (`GET /api/activity-history` with the appropriate date range) before being passed to the AI provider.
- Input data for overview draft: the same weekly view data that populates the coming week overview section — routine occurrences due, reminders scheduled, meal plan entries, and inbox items with due dates in the current Monday–Sunday window. This data is assembled by the API (`GET /api/weekly-view`) before being passed to the AI provider.
- The AI call is made via the provider adapter boundary established in D-008. The Founding Engineer defines the prompt, provider, and call shape in the implementation plan. The spec's constraint: the prompt input must include only structured H4 data and must not include prior carry-forward notes, prior review narrative content, or any other household free-text content.
- The AI output is a short narrative paragraph (recommend maximum ~150 words per section) summarizing the input data in natural, household-appropriate language. Exact format is implementation-defined.
- The AI draft is generated fresh each time the review flow is opened. It is not cached across sessions.

**Draft attribution display:**
- Before acceptance: the draft is labeled "Drafted by Olivia" with a distinct visual treatment (designer decision for the visual spec: could be a lavender background, an Olivia icon, or a bordered section).
- After acceptance: when the review record detail is viewed later, accepted narrative sections show an "AI-assisted" label. The household member's own accepted text (even if unchanged from the draft) is shown as the narrative content.
- The household member must always be able to distinguish what Olivia generated from what they wrote themselves (per H5 behavioral guardrail).

**Review record storage extension:**
- Two new nullable fields on `review_records`: `recap_narrative` (text, nullable) and `overview_narrative` (text, nullable).
- These fields store the accepted narrative text (original or edited). They are null if the household member dismissed both drafts.
- No change to other review record fields. All existing fields remain as defined in the planning ritual support spec.
- An `ai_generation_used` boolean flag on `review_records` (nullable/false by default) allows future analytics or audit use. Founding Engineer decision whether to include in Phase 1.

**Section layout in the review flow:**
- AI narrative draft appears above the structured item list in each section.
- The structured item list remains visible below the draft (collapsed or scroll-accessible) so the household member can verify the narrative against the underlying data.
- Accepting the draft does not hide the item list — the member can still scroll to the detail.

**Offline and degraded states:**
- Offline (device has no connectivity when review opens): skip AI generation entirely. Show the structured item list only. No loading indicator. No error message — this should feel like the normal Phase 1 experience without AI.
- AI call timeout (default: implementation-defined, e.g., 10 seconds): fall back to structured view with a calm message.
- AI call error (provider error, rate limit, unexpected response): same fallback. The review flow must always be completable.
- Partially generated drafts (recap ready but overview fails): show the recap draft, fall back to structured view for the overview section only. Each section degrades independently.

## Data And Memory

**Data created:**
- No new tables or entity types.
- Two new nullable columns on `review_records`: `recap_narrative`, `overview_narrative`.
- Optional: `ai_generation_used` boolean flag (Founding Engineer decision).
- These fields are added via a database migration.

**Data consumed (read-only from H4):**
- `GET /api/activity-history` — activity history data for the prior calendar week, used as AI prompt input for the recap section.
- `GET /api/weekly-view` — weekly view data for the current calendar week, used as AI prompt input for the overview section.
- These endpoints are already built and stable. No modifications needed for Phase 1.

**Data sent to external AI provider:**
- Structured H4 data only (counts, names, dates from the above endpoints).
- No free-text household content (no carry-forward notes, no item titles that may contain sensitive household details unless they are already in the H4 data).
- The Founding Engineer must confirm the privacy boundary of the prompt in the implementation plan. If item titles from activity history or weekly view are included in the prompt, this must be documented and treated as the approved privacy surface for Phase 1.

**Durability:**
- Accepted narrative fields are durable household content. They must be preserved if the planning ritual is archived, consistent with review record durability in the planning ritual support spec.
- Dismissed drafts produce no durable state — nothing is stored.

**Local cache:**
- The AI draft is transient session state. It is not cached in the client store. If the user exits and re-opens the review flow, a fresh AI draft is generated.
- The review record (including accepted narratives) follows the same outbox-and-sync pattern as all other household writes.

**Sensitive content handling:**
- Accepted narratives are household content. They must be stored local-first, consistent with carry-forward notes and routine titles (per product ethos).
- The prompt content sent to the external AI provider is treated as a necessary scope exception to the local-first principle, explicitly bounded: only H4 data sent to the provider adapter, no other household records. This is the same constraint that governs future AI feature calls per D-008.

## Permissions And Trust Model

- AI-Assisted Content (per glossary): the AI draft is generated by Olivia using H4 temporal data as input. It is always draft mode — Olivia proposes, the user accepts or edits. The accepted version is the canonical record.
- The AI draft generation is an agentic action initiated by Olivia when the review flow opens (Olivia does not wait for a user command to generate the draft). However, no record is modified by the draft generation itself. The draft exists only as transient session state until the user explicitly accepts it.
- Accepting the draft is a user-initiated action (the user taps "Use this summary") that executes immediately, consistent with D-010 (non-destructive user actions execute immediately).
- Editing the draft before accepting is also user-initiated. The user-authored edit plus the accept tap are a single user action.
- Dismissing the draft is a user-initiated action that executes immediately. No record is modified.
- **What Olivia must never do in this workflow:**
  - Store any accepted narrative content to the server before the user explicitly accepts it.
  - Present the AI draft as the canonical review content without user acceptance.
  - Include carry-forward notes from prior review records in the AI prompt without explicit user consent.
  - Send any household record content to the external AI provider beyond the approved H4 data scope.
  - Prevent the review from being completed because AI generation failed.
  - Describe the AI draft as "complete" or "confirmed" before the user accepts it.
- Spouse access: the spouse can view accepted narratives in review record detail (read-only), consistent with all other review record content. The per-screen spouse banner (L-009) applies.

## AI Role

- The external AI provider is called to generate a natural-language summary of the structured H4 data for each review section.
- The provider adapter boundary (D-008) governs how the call is made. The implementation plan defines prompt design, provider choice, output schema, and error handling.
- If the external AI provider is unavailable (offline, error, timeout): the review flow degrades gracefully to the structured item list display. All review functionality, including ritual completion and review record creation, remains fully operational without AI.
- The accepted narrative (if provided) is stored as plain text in the review record. It has no computational dependency after acceptance — it is just text.
- **Parts of the workflow that must not depend on AI to remain correct:**
  - Review window date calculations (prior and current Monday–Sunday).
  - Structured item assembly for both review sections.
  - Review record creation and field population.
  - Ritual completion and next-occurrence scheduling.
  - All existing Phase 1 planning ritual behavior.
- Phase 2 AI extensions (deferred):
  - Carry-forward note suggestions based on the coming week overview.
  - Trend narrative: "You've completed your weekly review for 4 consecutive weeks."
  - Spouse-specific summary phrasing when spouse participation in the review flow becomes available.

## Risks And Failure Modes

- **AI draft is inaccurate or misleadingly confident:** A generated summary may overstate or understate household activity. Mitigation: the structured item list is always visible below the draft for verification; the edit affordance allows correction before acceptance; the "Drafted by Olivia" attribution makes the source explicit.
- **AI generation latency disrupts review flow rhythm:** If the draft takes several seconds to generate, the review flow may feel slow. Mitigation: parallel generation for both sections; loading indicator communicates that work is in progress; timeout fallback prevents indefinite waiting.
- **Household member always dismisses drafts:** If drafts are consistently dismissed, the feature adds latency with no value. Mitigation: the timeout and offline fallback ensure dismissal is fast and frictionless; if household observation confirms low adoption, the AI call can be made opt-in in Phase 2.
- **Privacy leakage via prompt content:** If item titles or carry-forward notes are included in the AI prompt without clear household understanding, this could feel like a privacy violation. Mitigation: strict prompt scope (H4 structured data only, no free-text unless explicitly scoped and documented); the Founding Engineer must confirm the privacy surface in the implementation plan.
- **Review record detail feels ambiguous:** If it is not clear which parts of a review record were AI-generated vs. user-written, the "Drafted by Olivia" attribution requirement exists to address this. The implementation must make attribution visible and persistent.
- **Network dependency introduced into a previously offline-capable flow:** The review flow was previously fully offline-capable. Adding an AI call creates a new network dependency. Mitigation: offline detection before attempting the AI call; skip generation silently when offline; the structured view is always the primary fallback.

## UX Notes

- The AI draft should feel like a helpful starting point, not a commitment. The interaction should be "Olivia wrote a summary — want to use it?" rather than "here is your recap, confirm."
- Draft attribution must be visually distinct but not alarming. A subtle, calm indicator ("Drafted by Olivia") is appropriate. The design should not emphasize that AI was involved to the point of undermining the household member's confidence in the content.
- The edit affordance should be discoverable but not dominant. The majority of users who find the draft accurate should not have to navigate around an aggressive edit UI to accept it.
- Accept and dismiss actions should be clearly labeled and accessible in a single tap. Do not require scrolling to reach the accept/dismiss affordance.
- Accepted narrative sections in the review record detail should display clearly alongside carry-forward notes. "AI-assisted" labeling should be visually present but not distracting — a small badge or label is appropriate.
- Empty-section behavior for AI drafts: if the relevant week has no H3 activity, the AI draft for that section should not generate an awkward or confusing summary. The graceful approach: the AI call is still made, but the expected output for an empty week is a short, honest sentence ("Nothing was recorded last week."). This is consistent with the structured empty-state behavior already defined in the planning ritual support spec. If the AI generates something misleading for a sparse week, the edit affordance is the mitigation.
- Loading state: show a brief inline loading indicator per section, not a full-screen loader. The review flow header and navigation should remain visible while the draft is loading.
- Anti-patterns to avoid:
  - Requiring the household member to review the AI draft before they can advance to the next section — the draft should be interactable but not blocking.
  - Displaying the AI draft only (hiding the structured item list) — the structured list must remain accessible as a verification layer.
  - Showing a generic "AI error" dialog when generation fails — use a quiet fallback message within the section, not an interrupting modal.
  - Storing narrative content to the review record without explicit user acceptance.
  - Presenting accepted narrative content in the review record detail without the "AI-assisted" attribution label.

## Acceptance Criteria

1. When the planning ritual review flow opens, Olivia initiates AI draft generation for the last week recap and coming week overview sections immediately, in parallel.
2. A visible loading indicator is shown in each section while the AI draft is being generated.
3. When the AI draft is ready, it appears above the structured item list in the relevant section, labeled "Drafted by Olivia" with a visually distinct attribution treatment.
4. The household member can accept the AI draft as-is with a single tap.
5. The household member can edit the AI draft inline before accepting, with the edited version becoming the accepted narrative.
6. The household member can dismiss the AI draft with a single tap; dismissal reverts the section to the existing structured item list display.
7. Accepting a draft does not hide the structured item list — the underlying items remain visible below the narrative.
8. If the AI call fails, times out, or the device is offline when the review opens, the section displays only the structured item list with a calm fallback message (no error dialog, no disruption to the review flow).
9. Each section degrades independently — recap draft failure does not affect the overview section, and vice versa.
10. Completing the review saves a review record. If a narrative was accepted for the recap section, `recap_narrative` in the review record is populated with the accepted text. If dismissed, `recap_narrative` is null.
11. Completing the review saves a review record. If a narrative was accepted for the overview section, `overview_narrative` is populated. If dismissed, `overview_narrative` is null.
12. The review record creation, ritual completion, and next-occurrence scheduling are not affected by whether AI drafts were accepted, edited, or dismissed.
13. When the review record is viewed from activity history, accepted narratives are displayed with a visible "AI-assisted" attribution label that distinguishes them from the household member's carry-forward notes.
14. The AI prompt input is scoped strictly to H4 structured data (activity history and weekly view API responses). No carry-forward notes from prior reviews, no other household free-text, is included in the prompt.
15. The review flow is fully functional when the device is offline: structured item lists display correctly, the ritual can be completed, and the review record is saved to the client store and synced on reconnect — all without AI.
16. The spouse can view accepted narratives in the review record detail in read-only mode with the per-screen spouse banner (L-009).
17. All existing planning ritual support acceptance criteria (from `docs/specs/planning-ritual-support.md`) remain satisfied after this feature is introduced. The AI layer is additive — it must not break any Phase 1 planning ritual behavior.

## Validation And Testing

**Household validation:**
- After several ritual completions with AI summaries available, observe whether the household member accepts, edits, or dismisses drafts more often. Acceptance rate is the primary adoption signal.
- Observe whether accepted narratives in review records are read again when accessed from activity history. If members regularly re-read past narratives, the feature adds recall value beyond the ritual moment itself.
- Observe whether AI latency (the loading state) affects review completion rates. If members abandon the review during the loading state more than before, optimize generation time or make the draft appear asynchronously after initial section rendering.
- If drafts are dismissed consistently, investigate whether the prompt quality, privacy framing, or UX interaction model needs adjustment before investing in Phase 2 extensions.

**Unit tests:**
- AI provider adapter: given structured H4 data, produces a narrative string within the expected length range; handles provider error by returning a fallback value rather than throwing.
- Review record creation with accepted narratives: `recap_narrative` and `overview_narrative` are populated correctly when acceptance state is provided; fields are null when drafts are dismissed.
- Review flow behavior when AI generation is skipped (offline, timeout): section renders structured list only; review flow remains completable; review record created without narrative fields.
- Attribution field: `ai_generation_used` (if implemented) is set correctly based on whether any narrative was accepted.

**Integration tests:**
- End-to-end: given a household with H3 activity in the prior week and scheduled items in the current week, opening the planning ritual review flow triggers AI generation, the household member accepts both drafts, completes the ritual, and the resulting review record has both `recap_narrative` and `overview_narrative` populated with non-null values.
- Degraded mode end-to-end: AI provider returns an error; review flow shows structured item lists; household member completes ritual; review record is saved with null narrative fields. All existing planning ritual tests continue to pass.
- Offline end-to-end: device offline; review flow opens with structured lists and no AI loading state; ritual completed and saved to outbox; narratives null in review record.
- Review record detail: accepted narratives displayed with "AI-assisted" label; null narratives display no narrative section (or an appropriate "no summary" state).
- Provider scope test: confirm that the AI prompt payload contains only H4 data, not any carry-forward notes or other free-text from the household record store.

**Manual validation:**
- The loading indicator appears and resolves correctly across mobile screen sizes.
- The "Drafted by Olivia" attribution is visible and distinct before acceptance.
- The edit affordance is discoverable and works correctly on mobile keyboards.
- The dismiss interaction is accessible and does not require a confirmation dialog.
- The accepted narrative displays with "AI-assisted" label in the review record detail when accessed from activity history.
- A ritual completed without accepting any AI drafts produces a review record with all existing fields intact and null narrative fields — existing review record detail behavior is unchanged.

## Dependencies And Related Learnings

- L-021: H4 temporal layer creates the AI input foundation; AI-assisted summaries is the natural first H5 capability.
- L-019: Planning ritual Phase 1 minimal scope is sufficient — AI enhancement is additive, not foundational.
- L-017: The planning ritual closes the H4 temporal loop. AI-assisted summaries make the synthesis layer richer without altering its structure.
- L-020: H5 should evaluate new storage carefully. This spec introduces two new nullable columns only (no new tables), consistent with the H4 minimal-storage principle.
- L-013: H4 synthesizes existing H3 state before AI enhancement. AI-assisted summaries follow this principle: the structured data is assembled first, then AI generates a narrative layer on top.
- D-034: M15 complete; AI-assisted planning ritual summaries is the first H5 spec target, advisory-only, using confirmed H4 data sources, behind the D-008 provider adapter boundary.
- D-008: External AI must be called behind a narrow provider adapter boundary. Prompt design, provider choice, and output schema are implementation decisions for the Founding Engineer.
- D-002: Advisory-only trust model. The AI draft is always draft mode; user acceptance is required before any content is stored.
- D-010: Non-destructive user-initiated actions execute immediately. Accepting or dismissing the AI draft is a user action that executes immediately without a confirmation step.
- Depends on: `docs/specs/planning-ritual-support.md` (review flow, review record schema, carry-forward notes, ritual completion behavior)
- Depends on (data contracts): `docs/specs/activity-history.md` (recap section data sources), `docs/specs/unified-weekly-view.md` (overview section data sources)
- Depends on (architecture): `docs/strategy/system-architecture.md` (D-008 provider adapter boundary)

## Open Questions

1. **Prompt scope and privacy surface:** What structured fields from the activity history and weekly view API responses should be included in the AI prompt? Specifically: should routine names, reminder titles, or inbox item titles be included, or only counts and dates? This is a privacy boundary decision with product implications. Recommendation: include item names/titles in the prompt (they are necessary for a meaningful narrative — "You completed Morning Routine and Weekly Cleaning" is more useful than "You completed 2 routines"). The privacy surface is documented and bounded to the H4 API responses. Confirm before implementation.

2. **AI call timing:** Should both recap and overview drafts be generated when the review flow first opens (before the user reads either section), or should the overview draft be generated only when the user advances to Step 2? Recommendation: generate both in parallel at flow open to minimize total perceived latency. The recap generation should not block rendering of the recap section's structured list — both appear immediately, with the draft appearing when ready. Founding Engineer decision for implementation.

3. **Maximum narrative length:** What is the maximum acceptable length for a generated narrative? Recommendation: 100–150 words per section as a prompt constraint. This keeps summaries scannable and avoids wall-of-text patterns on mobile. Founding Engineer confirms with prompt design.

4. **Regeneration within a session:** If the user edits the narrative and then wants the original AI draft back, can they restore it? Phase 1 recommendation: no restore button — the edit is a forward-only action. The original draft is not stored separately. Revisit in Phase 2 if this is friction.

5. **Review record detail when narratives are null:** If neither narrative was accepted, how should the review record detail screen handle the narrative sections? Recommendation: show no narrative section at all (the detail screen remains exactly as it was in Phase 1). The "AI-assisted" attribution label only appears when at least one narrative field is non-null. Designer decision for the visual spec.

## Facts, Assumptions, And Decisions

**Facts:**
- `GET /api/activity-history` and `GET /api/weekly-view` are stable, built H4 endpoints with confirmed data contracts (L-018).
- The `review_records` table was introduced in M14. Adding two nullable nullable columns does not require a new table.
- The provider adapter boundary (D-008) is the established pattern for all external AI calls in Olivia.
- All five activity history timestamp sources are confirmed (L-018). All four weekly view data sources are confirmed.

**Assumptions:**
- Household members find the narrative layer useful enough to accept rather than dismiss, at least some of the time. If dismissal is near-universal, make the feature opt-in in Phase 2.
- AI generation latency of ~2–5 seconds is acceptable given the review context (the household member is settling in to review content, not performing a time-sensitive action).
- Item names from H4 API responses are appropriate to include in the AI prompt scope. If the household considers this a privacy concern, restrict the prompt to counts and categories and accept a less personalized narrative.

**Decisions:**
- AI-Assisted Content (per glossary): draft mode always; user acceptance required before any narrative is stored.
- Storage extension: two nullable columns on `review_records` only. No new tables.
- Graceful degradation: the review flow must be completable and fully functional without AI at any point.
- Attribution: accepted narratives must be labeled "AI-assisted" in the review record detail view.
- Prompt scope: H4 structured data only (activity history + weekly view API responses). No prior carry-forward notes or other free-text in the prompt.

## Deferred Decisions

- Exact prompt design, provider choice, and output schema — Founding Engineer responsibility in the implementation plan.
- Specific visual design for the AI draft section, attribution label, edit affordance, and accept/dismiss controls — designer decision for the visual spec.
- Review record detail layout when narratives are present alongside carry-forward notes — designer decision.
- Whether to include an `ai_generation_used` flag on `review_records` in Phase 1 — Founding Engineer decision.
- Regeneration affordance (within-session restore of original AI draft) — Phase 2 based on usage feedback.
- Opt-in toggle for AI summary generation — Phase 2 if dismissal rate suggests the feature is not adding value for this household.
- AI-assisted carry-forward suggestions — H5 Phase 2 (second H5 target, per D-034).
- Proactive household nudges — H5 Phase 2 (sequenced after Phase 1 AI-content validation, per D-034).
