# Feature Spec: Real AI Provider Wiring

## Status
- CEO-approved (2026-03-15)

## Summary

Real AI provider wiring is the first H5 Phase 2 capability. It connects the `DisabledAiProvider` stub — already integrated into the API — to a real Claude API provider, making AI-assisted planning ritual summaries functional for real households for the first time. The implementation is bounded by the existing D-008 adapter boundary: the `AiProvider` interface, the API routes that call it, and the prompt definitions are already in place. Phase 2 work is implementing `ClaudeAiProvider` behind that boundary, wiring API key configuration via environment variable, and validating error propagation and rate limiting behavior. No changes to the PWA, no new API routes, no new database tables.

## User Problem

AI-assisted planning ritual summaries is a fully built, fully user-facing feature — the review flow already presents draft sections, loading states, and accept/dismiss controls. But the `DisabledAiProvider` stub returns generic placeholder text: "Last week, your household completed N items." For real households, this is indistinguishable from broken. The feature is visible to the user but inert. Connecting a real Claude provider makes the feature actually deliver value: a narrative draft grounded in the household's real activity data, generated fresh each time the review flow opens.

## Target Users

- Primary user: household primary operator (stakeholder) — the person who opens the planning ritual review flow and interacts with the AI-drafted summaries.
- Secondary user: spouse — views accepted narratives in completed review records.
- Not a user-facing configuration feature: API key setup is a server operator concern, not an in-app household setting.

## Desired Outcome

When a household member opens the planning ritual review flow, the recap and overview sections should contain AI-generated narrative paragraphs based on their actual household activity — not placeholder text. The generation should complete within a few seconds and degrade gracefully if the provider is unavailable. The household member should not need to know that a new provider was wired; the change should feel like the feature starting to work as designed.

## In Scope

- `ClaudeAiProvider` class implementing the existing `AiProvider` interface (`apps/api/src/ai.ts`), with a real Anthropic SDK call for `generateRitualSummaries`.
- API key configuration via `ANTHROPIC_API_KEY` environment variable — read at startup, not stored in the database or PWA.
- Error propagation model: `ClaudeAiProvider` must not throw from `generateRitualSummaries`. All provider errors (SDK error, network failure, timeout, rate limit) are caught internally; the method returns `{ recapDraft: null, overviewDraft: null }` on total failure, or a partial result if one section succeeded.
- Rate limiting approach: use Anthropic SDK's built-in retry/backoff for transient errors. Do not implement custom queuing or per-household rate limiting in Phase 2 — a single household's ritual review cadence (at most a few times per month per household) does not approach API rate limits.
- Model target: `claude-haiku-4-5-20251001` (Claude Haiku). Rationale: ritual summary prompts are straightforward summarization tasks with modest input size (~150–300 words of structured data). Haiku delivers the latency appropriate for an interactive review flow (target: sub-3-second generation) at a cost appropriate for a household-scale product. Sonnet or Opus are not appropriate for Phase 2: the latency would degrade the review flow experience and the cost would be disproportionate to the output quality gain for this task.
- Prompt token budget: input prompts should target ~500 tokens or fewer per section (structured H4 data is compact). Output target: 100–150 words per section, enforced via prompt instruction. Total per review call: ~2,000 tokens input + output across both sections.
- Streaming: not in scope for Phase 2. The review flow already shows a loading indicator; streaming adds implementation complexity without meaningfully changing the user experience for 100–150 word outputs.
- `parseDraft`, `parseReminderDraft`, `summarize`, and `summarizeReminders` methods: these methods remain unchanged in behavior. The `ClaudeAiProvider` may implement them with real Anthropic calls or may delegate to the same stub logic as `DisabledAiProvider` — Founding Engineer decision. The M21 gate requirement is `generateRitualSummaries` delivering real AI output; the other methods are out of scope for Phase 2.
- Startup validation: if `ANTHROPIC_API_KEY` is not set (empty or missing), the API server should log a clear warning and fall back to `DisabledAiProvider` rather than failing to start. This makes local development and testing environments work without an API key.

## Boundaries, Gaps, And Future Direction

**Not in scope for Phase 2:**
- In-app API key configuration or household-level AI toggle — Phase 3 if usage signals suggest opt-in is needed.
- Prompt customization by household members.
- Model selection UI or per-household model configuration.
- Streaming response delivery to the PWA.
- AI calls for `parseDraft`, `parseReminderDraft`, `summarize`, or `summarizeReminders` — these methods are used in other flows and are not the M21 target.
- Per-household rate limiting or quota enforcement.
- Cost tracking or token usage logging (beyond what the Anthropic SDK provides in development).
- The second H5 Phase 2 capability (push notifications for nudges) — sequenced after real AI wiring is confirmed working.

**Known gaps acceptable in Phase 2:**
- Prompt quality is implementation-defined (Founding Engineer responsibility). Phase 2 does not require prompt A/B testing or quality measurement tooling.
- API key rotation workflow is not specified — treated as a server operator responsibility.
- The `ClaudeAiProvider` will be instantiated unconditionally when the API key is present. No lazy instantiation, connection pooling, or warm-up is required.

**Likely future direction:**
- Real AI calls for `parseDraft` and `parseReminderDraft` — the inbox AI draft feature would benefit from real AI, but is deferred until AI-assisted ritual summaries is validated.
- AI-enhanced nudge timing (H5 Phase 2, third target per D-042 roadmap) — requires Phase 1 trust signal evidence first (D-034).
- Household-level opt-in toggle for AI features — Phase 3 if dismissal rates suggest it is needed.

## Workflow

This feature has no household-facing workflow change. From the household member's perspective:

1. The household member opens the planning ritual review flow.
2. The review flow shows a loading indicator while AI draft generation is in progress.
3. The AI draft appears — now with real Claude-generated content instead of generic placeholder text.
4. The household member reviews, accepts, edits, or dismisses the draft. This workflow is identical to Phase 1.

The change is entirely within the server-side `ClaudeAiProvider` implementation. The PWA does not change.

**Server-side flow (new in Phase 2):**

1. `POST /api/generate-ritual-summary` is called by the PWA when the review flow opens (unchanged).
2. The route handler calls `aiProvider.generateRitualSummaries(input)` — same call, same input shape.
3. `ClaudeAiProvider.generateRitualSummaries` assembles the prompt from the `RitualSummaryInput` and calls the Anthropic API using the SDK.
4. The SDK call returns a generated narrative. The method extracts the text and returns `{ recapDraft, overviewDraft }` in the existing `RitualSummaryOutput` shape.
5. If the SDK call fails for any reason, the method returns `{ recapDraft: null, overviewDraft: null }` without throwing.
6. The API route returns the result to the PWA, which displays the draft or falls back to the structured view — no change from Phase 1.

## Behavior

**Provider selection at startup:**
- If `ANTHROPIC_API_KEY` is set and non-empty: instantiate `ClaudeAiProvider`.
- If `ANTHROPIC_API_KEY` is missing or empty: log a warning (`AI provider not configured — falling back to DisabledAiProvider`) and instantiate `DisabledAiProvider`. The API server continues to start normally.

**`ClaudeAiProvider.generateRitualSummaries` behavior:**
- Assembles two prompts from `RitualSummaryInput`: one for the recap section, one for the overview section.
- Calls the Anthropic SDK with the recap prompt and the overview prompt. Whether these are sequential or parallel is a Founding Engineer decision (parallel is preferred for latency).
- On success: returns `{ recapDraft: <string>, overviewDraft: <string> }`.
- On partial failure (one section fails, one succeeds): returns `{ recapDraft: null, overviewDraft: <string> }` or vice versa.
- On total failure: returns `{ recapDraft: null, overviewDraft: null }`. Does not throw.
- Does not retry beyond the SDK's built-in retry behavior.

**Prompt design (Founding Engineer responsibility, bounded by this spec):**
- Input: structured H4 data from `RitualSummaryInput` — `recapItems` (activity history items) and `overviewDays` (weekly view days). Item names and titles are in scope for prompt inclusion (per Decision E in the AI-assisted summaries implementation plan). Carry-forward notes from prior reviews are explicitly excluded.
- Output instruction: "Write a concise summary of approximately 100–150 words in warm, direct household language."
- System prompt: Founding Engineer decision. Must not instruct the model to present outputs as confirmed or completed — the narrative should feel like a helpful summary, not an authoritative report.
- The privacy boundary is defined in `docs/specs/ai-assisted-ritual-summaries.md`: H4 structured data only, no carry-forward notes or other free-text from the household record store.

**Error propagation model — each failure mode:**

| Failure mode | `ClaudeAiProvider` behavior | Household-visible result |
|---|---|---|
| `ANTHROPIC_API_KEY` missing | Fall back to `DisabledAiProvider` at startup | Placeholder text (same as pre-Phase 2) |
| `ANTHROPIC_API_KEY` invalid (401) | Catch error, return `null` drafts | Calm fallback message in review flow |
| Anthropic API network error | Catch error, return `null` drafts | Calm fallback message |
| Rate limit hit (429) | SDK retries; if exhausted, catch and return `null` drafts | Calm fallback message |
| Timeout (>10 seconds) | Catch timeout, return `null` drafts | Calm fallback message |
| Unexpected/malformed response | Catch and return `null` drafts | Calm fallback message |
| One section fails, one succeeds | Return partial `{ recapDraft: null, overviewDraft: "..." }` | Recap falls back to structured list; overview shows draft |

**Rate limiting:**
- No custom rate limiting is implemented. The Anthropic SDK handles retries for transient errors (429, 5xx). If the SDK exhausts retries, the error is caught and `null` drafts are returned.
- A household completing one planning ritual per week generates at most two AI calls per review session (recap + overview). This is negligible relative to Anthropic API rate limits.

## Data And Memory

- No new database tables or columns.
- No new API routes.
- No new PWA state.
- `ANTHROPIC_API_KEY` is a server environment variable. It must not be logged, stored in the database, or transmitted to the PWA.
- AI-generated narrative text sent to the Anthropic API: the same privacy boundary as defined in `docs/specs/ai-assisted-ritual-summaries.md` — H4 structured data (item names, dates, counts) only. No carry-forward notes, no other household free-text.
- The accepted narrative stored in `review_records` (from Phase 1) is unchanged. Phase 2 does not modify the storage model.

## Permissions And Trust Model

- This spec introduces no new user-facing permissions or trust model changes.
- `ClaudeAiProvider` inherits the full trust model from `docs/specs/ai-assisted-ritual-summaries.md`: the AI draft is always advisory, user acceptance is required before any content is stored, and the structured item list is always available as a fallback.
- API key configuration is a server operator action, not a household-level permission. The household member has no visibility into which provider is active.
- **What the provider must never do:**
  - Log the contents of the AI prompt or response at a level that would expose household data in production logs.
  - Throw uncaught errors that propagate to the API route and cause a 500 response — the generate-ritual-summary endpoint must always return a valid `RitualSummaryOutput`.
  - Cache AI-generated content across sessions or households.
  - Include carry-forward notes or any household free-text beyond H4 structured data in the prompt.

## AI Role

- The Anthropic Claude API (Haiku model) generates the ritual summary narratives from structured H4 data.
- If the provider is unavailable (any failure mode): the `generateRitualSummaries` method returns `null` drafts. The existing fallback in the review flow (structured item list + calm fallback message) is the degraded state. This fallback is already implemented and tested.
- **Parts of the workflow that must not depend on AI to remain correct:**
  - All existing planning ritual behavior (occurrence completion, next-occurrence scheduling, review record creation).
  - Activity history display and weekly view display.
  - The review flow's ability to complete, save a review record, and sync via the outbox.
  - All acceptance criteria from `docs/specs/planning-ritual-support.md` and `docs/specs/ai-assisted-ritual-summaries.md`.

## Risks And Failure Modes

- **API key misconfiguration in production:** If the key is wrong, every ritual review will return `null` drafts silently. Mitigation: log a clear warning on startup when the key is present but invalid (detected on first use); the fallback ensures the review flow remains functional.
- **Latency regression:** Claude Haiku is fast for this task, but network variability could push generation past the 10-second timeout. Mitigation: the existing timeout fallback is already implemented. If production latency is consistently high, the timeout threshold is a Founding Engineer tuning decision.
- **Prompt quality below household expectations:** The first real prompt may produce outputs that feel generic despite being personalized. Mitigation: accept iterative prompt refinement as a normal Phase 2 follow-on after household observation. The edit affordance in the review flow is the in-flow mitigation.
- **Privacy scope creep in prompt construction:** If the Founding Engineer includes carry-forward notes or other free-text in the prompt, this violates the privacy boundary. Mitigation: the spec and implementation plan must explicitly bound the prompt to H4 API response data only; the integration test for provider scope (from the Phase 1 spec) should be extended to verify the real provider's prompt payload.
- **Unexpected SDK behavior:** Anthropic SDK updates could change retry semantics. Mitigation: pin the SDK version in `package.json`; update only deliberately.

## UX Notes

- No household-facing UX changes in Phase 2. The loading state, accept/dismiss controls, and fallback message are identical to Phase 1.
- From the household member's perspective, the only change is that the draft content is now meaningful ("You completed Morning Routine and Grocery Run last week…") rather than generic placeholder text.
- The calm, non-alarming fallback behavior from Phase 1 applies identically in Phase 2 for all error states.

## Acceptance Criteria

1. When `ANTHROPIC_API_KEY` is set and valid, opening the planning ritual review flow triggers a real Claude API call and returns a narrative draft based on the household's actual H4 data — not the `DisabledAiProvider` placeholder text.
2. The narrative draft is 100–150 words per section (enforced via prompt instruction).
3. When `ANTHROPIC_API_KEY` is not set, the API server starts normally, logs a warning, and falls back to `DisabledAiProvider` behavior. No startup failure.
4. When `ANTHROPIC_API_KEY` is invalid (401), `generateRitualSummaries` catches the error and returns `{ recapDraft: null, overviewDraft: null }`. The review flow displays the calm fallback message. No 500 error from the API route.
5. When the Anthropic API times out (>10 seconds), `generateRitualSummaries` catches the timeout and returns `null` drafts. The review flow falls back gracefully.
6. When the Anthropic API returns a rate limit error (429), `generateRitualSummaries` catches the error after SDK retries are exhausted and returns `null` drafts.
7. If the recap generation fails but the overview succeeds, the recap section shows the calm fallback and the overview section shows the real AI draft. Each section degrades independently.
8. The prompt sent to the Anthropic API contains only H4 structured data (activity history items, weekly view days, date ranges). No carry-forward notes or other household free-text.
9. `ANTHROPIC_API_KEY` is not logged, stored in the database, or returned in any API response.
10. All existing acceptance criteria from `docs/specs/ai-assisted-ritual-summaries.md` remain satisfied — real AI wiring is additive; it does not change any behavior observable by the household member beyond the quality of the draft content.
11. All existing API tests continue to pass. The test environment uses `DisabledAiProvider` (no API key required for test runs).

## Validation And Testing

**Unit tests:**
- `ClaudeAiProvider.generateRitualSummaries` with a mocked Anthropic SDK: given valid H4 input, returns a non-null `recapDraft` and `overviewDraft` string.
- `ClaudeAiProvider.generateRitualSummaries` with SDK throwing a network error: returns `{ recapDraft: null, overviewDraft: null }` without throwing.
- `ClaudeAiProvider.generateRitualSummaries` with SDK throwing a 429 rate limit error: returns `null` drafts without throwing.
- Provider selection at startup: `ANTHROPIC_API_KEY` set → `ClaudeAiProvider` instantiated; `ANTHROPIC_API_KEY` missing → `DisabledAiProvider` instantiated with warning logged.

**Integration tests (extending existing Phase 1 suite):**
- Provider scope test: verify the prompt payload sent to the Anthropic SDK contains only H4 structured data — no carry-forward notes or other free-text from the household record store (mock the SDK to capture the prompt).
- End-to-end with real provider (manual/optional): with a valid API key in a local dev environment, open the review flow and verify that a real narrative draft appears. Not required for CI.

**Regression:**
- All 50+ existing API tests must pass without `ANTHROPIC_API_KEY` set (using `DisabledAiProvider`).
- The `generate-ritual-summary` route must never return a 500 regardless of provider error state.

**Household validation:**
- After Phase 2 is deployed, observe whether draft acceptance rates increase compared to the placeholder text baseline. An increase would confirm that real AI content is adding value.
- Observe whether review completion rates change. If latency from real AI generation causes more review flow abandonment, optimize the timeout threshold or consider parallel generation optimization.

## Dependencies And Related Learnings

- D-008: all external AI calls behind the provider adapter boundary — this spec implements behind that boundary, not outside it.
- D-042: M20 complete; real AI provider wiring confirmed as first H5 Phase 2 target; M21 activated.
- D-035: AI-assisted ritual summaries spec approved; `generateRitualSummaries` interface, prompt scope, and fallback model established.
- L-023: H5 Phase 1 validated the additive-with-clean-degradation pattern — Phase 2 extends it with a real provider, not a structural change.
- `docs/specs/ai-assisted-ritual-summaries.md`: defines the `RitualSummaryInput`/`RitualSummaryOutput` contract, the privacy boundary, and all fallback behavior that Phase 2 inherits unchanged.
- `apps/api/src/ai.ts`: defines `AiProvider`, `DisabledAiProvider`, `RitualSummaryInput`, `RitualSummaryOutput` — the interface `ClaudeAiProvider` must implement.
- `docs/plans/ai-assisted-ritual-summaries-implementation-plan.md`: defines the prompt design boundary (Decision E: item names in scope), token budget context, and provider call shape established in Phase 1.

## Open Questions

1. **Should `ClaudeAiProvider` implement `parseDraft`, `parseReminderDraft`, `summarize`, and `summarizeReminders` with real AI calls or stub behavior?** Recommendation: stub behavior (same as `DisabledAiProvider`) for Phase 2. These methods are not on the M21 critical path and adding real AI calls would expand scope without clear household value. The Founding Engineer may differ. Confirm before implementation.

2. **Sequential or parallel generation for recap and overview?** Recommendation: parallel (two concurrent SDK calls) to minimize total perceived latency. The existing Phase 1 spec recommends this. Confirm with Founding Engineer as an implementation decision.

3. **Should the API key validity be checked at startup (by making a lightweight test call)?** Recommendation: no — a startup health check call adds latency and consumes tokens. Rely on the first real request to surface an invalid key error, which is caught and logged. The fallback handles it gracefully.

## Facts, Assumptions, And Decisions

**Facts:**
- The `AiProvider` interface, `RitualSummaryInput`, and `RitualSummaryOutput` are already defined in `apps/api/src/ai.ts`.
- `DisabledAiProvider.generateRitualSummaries` already returns placeholder text — the API route, PWA client, and all Phase 1 tests work against this stub.
- The `generate-ritual-summary` API route already calls `aiProvider.generateRitualSummaries` — no route changes needed.
- Claude Haiku is the current latest Haiku model (`claude-haiku-4-5-20251001`) per environment knowledge.
- The Anthropic TypeScript SDK (`@anthropic-ai/sdk`) is already available in the environment (confirmed by claude-api skill context).

**Assumptions:**
- A single household's ritual review cadence (at most weekly) will not approach Anthropic API rate limits.
- Claude Haiku will generate 100–150 word summaries within 3 seconds under normal network conditions.
- The Anthropic SDK's built-in retry behavior is sufficient for transient errors without custom queuing.

**Decisions:**
- Target model: `claude-haiku-4-5-20251001`. Rationale: latency-appropriate for interactive review flow, cost-appropriate for household scale, sufficient capability for structured summarization.
- Streaming: not in scope for Phase 2.
- Error propagation: always return `null` drafts on failure, never throw. The existing fallback covers all degraded states.
- API key via environment variable only (`ANTHROPIC_API_KEY`). No database storage, no in-app configuration.
- Missing API key: warn and fall back to `DisabledAiProvider`. Do not fail to start.
- `parseDraft`, `parseReminderDraft`, `summarize`, `summarizeReminders`: out of scope for Phase 2 real AI wiring.

## Deferred Decisions

- Exact prompt text and system prompt — Founding Engineer responsibility in the implementation plan.
- Sequential vs. parallel generation for the two summary sections — Founding Engineer implementation decision (parallel recommended).
- Whether to add structured logging for AI generation latency and outcome (null vs. non-null) — Phase 2 operational visibility; Founding Engineer decision.
- Opt-in toggle for AI features — Phase 3 if household dismissal rates suggest it is needed.
- Real AI calls for `parseDraft` and other `AiProvider` methods — deferred to a future phase based on feature prioritization.
