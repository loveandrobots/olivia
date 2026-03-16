# AI-Assisted Planning Ritual Summaries Implementation Plan

**Goal:** Implement the first Horizon 5 (Selective Trusted Agency) feature — AI-assisted draft narratives for the planning ritual review flow. When the household member opens the planning ritual review flow, Olivia generates a concise AI-drafted narrative for the "last week recap" and "coming week overview" sections from H4 temporal data. The member reviews the draft, optionally edits it, and accepts or dismisses it. Accepted narratives are stored in the review record. The existing review flow is always completable without AI.

**Architecture:** AI-assisted summaries layer on top of the existing planning ritual support implementation (M14). The changes are purely additive: a new database migration adds two nullable narrative columns to `review_records`; a new API endpoint (`POST /api/routines/:routineId/generate-ritual-summary`) assembles H4 data and calls the AI provider behind the D-008 adapter boundary; the `POST /api/routines/:id/complete-ritual` endpoint is extended to accept and store accepted narrative text; the PWA `ReviewFlowPage` gains AI draft state management with a loading skeleton, inline tap-to-edit, and accept/dismiss footer controls; the `ReviewRecordDetailPage` gains narrative sections with "AI-assisted" attribution badges. The AI call is server-side only — the provider adapter boundary (D-008) is never crossed from the PWA.

**Tech Stack:** TypeScript, Zod, Fastify, better-sqlite3, Drizzle, React, TanStack Router, TanStack Query, Dexie, Vitest. No new dependencies required for Phase 1.

**Visual spec dependency:** Phase 6 (PWA surface changes) depends on `docs/plans/ai-assisted-ritual-summaries-visual-implementation-spec.md`. All layout, color, typography, and interaction details are specified there. The structure below is the implementation guide; all visual details must come from the visual spec.

---

## Summary

AI-assisted ritual summaries extend the existing planning ritual support implementation in a layered sequence:

1. Add database migration for `recap_narrative` and `overview_narrative` columns on `review_records`
2. Extend shared contracts with narrative fields and ritual summary generation schemas
3. Extend the AI provider interface with `generateRitualSummaries` and add a stub implementation
4. Add API endpoint for server-side ritual summary generation; extend complete-ritual to store narratives
5. Extend PWA client/sync layer with `generateRitualSummary` and extend `submitRitualCompletion`
6. Build PWA surface changes: AI draft state in review flow, narrative sections in review record detail
7. Verify acceptance criteria end-to-end

---

## Architecture Decisions Resolved In This Plan

### Decision A: AI call is server-side behind the D-008 boundary

**Chosen approach:** The AI provider call is made by the API server, behind the `AiProvider` interface in `apps/api/src/ai.ts`. A new endpoint `POST /api/routines/:routineId/generate-ritual-summary` assembles the H4 data server-side, calls the `AiProvider`, and returns the narrative drafts to the PWA. The PWA never calls the AI provider directly.

**Rationale:** D-008 requires all AI calls to go through the internal adapter boundary. Keeping the call on the server ensures the prompt content and provider credentials never leave the API, the privacy surface of the call is bounded to what the server explicitly sends, and swapping or disabling the AI provider requires no PWA changes.

### Decision B: Summary generation is a separate endpoint from ritual completion

**Chosen approach:** A new `POST /api/routines/:routineId/generate-ritual-summary` endpoint handles summary generation. The existing `POST /api/routines/:id/complete-ritual` endpoint is extended with two optional nullable fields (`recapNarrative`, `overviewNarrative`) in the request body to receive accepted narrative text at completion time.

**Rationale:** Separating generation from completion keeps each endpoint's semantics clean. Generation is a transient, read-only server action (it assembles H4 data and calls the AI); completion is the durable write. This separation also means the ritual can be completed normally without ever calling the generation endpoint — the offline and graceful-degradation paths require no new logic in the completion endpoint beyond accepting optional nullable fields.

### Decision C: Narrative storage — accepted text only, dismissed drafts produce null

**Chosen approach:** `recap_narrative` and `overview_narrative` are nullable text columns on `review_records`. They are populated only when the household member explicitly accepts a draft (original or edited). Dismissed drafts result in null values — no state is stored for dismissed or never-shown drafts. An optional `ai_generation_used` boolean column (default false) is added and set true when the `generate-ritual-summary` endpoint is called successfully, for future analytics; Founding Engineer may omit if not needed.

**Rationale:** Per the feature spec trust model (D-002): "No record is modified by the draft generation itself. The draft exists only as transient session state until the user explicitly accepts it." Storing dismissed drafts would violate this principle. The null value is the correct representation for "no narrative accepted" and is backwards-compatible with Phase 1 review records.

### Decision D: Parallel generation, per-section independent fallback

**Chosen approach:** The `generate-ritual-summary` endpoint generates both recap and overview narratives in a single server-side request (the `AiProvider.generateRitualSummaries` method returns both). The PWA awaits this single call and renders both drafts when they arrive. If the call fails partially, both sections fall back to the structured list — the single-call shape is simpler than two independent calls. Section-level independence is handled in the PWA: if the returned `recapDraft` is null (AI provider returned null for that section), that section renders the error state; the other section is unaffected.

**Rationale:** A single API call for both sections minimizes round trips and latency. The `AiProvider` interface can handle partial failures internally by returning null for the failed section rather than throwing. This preserves the spec's requirement that "each section degrades independently."

### Decision E: Prompt privacy scope — item names included

**Chosen approach:** The AI prompt includes item names/titles from the H4 API responses (routine names, reminder titles, meal plan names, inbox item titles, list item titles). The privacy surface is documented here as the approved scope for Phase 1.

**Rationale:** Feature spec OQ-1 recommendation: "include item names/titles — they are necessary for a meaningful narrative ('You completed Morning Routine and Weekly Cleaning' is more useful than 'You completed 2 routines')." Item names from the H4 APIs are already household content that the household member can see; including them in the AI prompt is a necessary scope exception to the local-first principle, explicitly bounded to the H4 API response fields. Carry-forward notes from prior reviews and all other household free-text remain excluded per spec constraint.

### Decision F: Draft text length — 100–150 words per section

**Chosen approach:** The AI prompt constrains each narrative to 100–150 words. The `AiProvider.generateRitualSummaries` implementation enforces this as a prompt instruction.

**Rationale:** Feature spec OQ-3 recommendation. Keeps summaries scannable on mobile without becoming wall-of-text. The `DisabledAiProvider` stub returns a sample narrative within this range for testability.

---

## Source Artifacts

- `docs/specs/ai-assisted-ritual-summaries.md` — feature spec (approved, D-035)
- `docs/plans/ai-assisted-ritual-summaries-visual-implementation-spec.md` — visual spec
- `docs/roadmap/milestones.md` (M16 exit criteria)
- `docs/plans/planning-ritual-support-implementation-plan.md` — pattern reference (M14)
- `apps/api/src/ai.ts` — existing AI provider interface

Relevant durable guidance:
- `D-002`: advisory-only trust model — narrative is draft mode; user acceptance required before storage
- `D-008`: external AI must be called behind the narrow provider adapter boundary in `apps/api/src/ai.ts`
- `D-010`: non-destructive user-initiated actions execute immediately — accepting/dismissing a draft executes without confirmation

---

## Assumptions And Non-Goals

### Assumptions

- The planning ritual support implementation (M14) is complete: `review_records` table, `POST /api/routines/:id/complete-ritual`, `GET /api/review-records/:id`, `ReviewFlowPage`, and `ReviewRecordDetailPage` all exist and pass their acceptance criteria.
- `GET /api/activity-history` and `GET /api/weekly-view` are stable, built endpoints with confirmed data contracts (L-018).
- The existing `AiProvider` interface in `apps/api/src/ai.ts` is the correct extension point per D-008.
- `DisabledAiProvider` remains the default provider in Phase 1 of this implementation. The Founding Engineer may introduce a real provider (e.g., Anthropic Claude) in parallel or as a follow-on step.
- The PWA can detect online/offline status via `navigator.onLine` or the existing connectivity detection already used in the sync layer.

### Non-Goals

- A real (non-stub) AI provider implementation is not a Phase 1 gate requirement — the implementation plan is complete when the stub produces a testable, end-to-end verified result. Swapping in the real provider is a configuration and testing step, not an architecture change.
- Proactive household nudges (the second H5 capability per D-034).
- Carry-forward note AI suggestions.
- Regeneration UI (within-session restore of original draft).
- Opt-in toggle for AI generation.
- AI generation outside the planning ritual review flow.
- Reviewing or modifying accepted narratives after the review record is saved.

---

## Codebase Anchors

- `apps/api/drizzle/0006_ai_ritual_summaries.sql` — new migration (to be created)
- `apps/api/src/ai.ts` — extend `AiProvider` interface and `DisabledAiProvider`
- `packages/contracts/src/index.ts` — extend `reviewRecordSchema`, `completeRitualRequestSchema`; add `ritualSummaryResponseSchema`
- `apps/api/src/app.ts` — add `POST /api/routines/:routineId/generate-ritual-summary`; extend `POST /api/routines/:id/complete-ritual`
- `apps/api/src/repository.ts` — extend `createReviewRecord` to support narrative fields
- `apps/api/test/api.test.ts` — add summary generation and narrative storage tests
- `apps/pwa/src/lib/api.ts` — add `generateRitualSummary()`
- `apps/pwa/src/lib/sync.ts` — add `loadRitualSummaries()`; extend `submitRitualCompletion()`
- `apps/pwa/src/routes/review-flow-page.tsx` — add AI draft state, loading/accept/dismiss
- `apps/pwa/src/routes/review-record-detail-page.tsx` — add narrative sections with "AI-assisted" badge

---

## Implementation Phases

### Phase 1: Database migration for narrative fields

**Outcome:** The `review_records` table has `recap_narrative`, `overview_narrative`, and `ai_generation_used` columns. All existing rows default to null/false. No existing queries break.

**Primary files**
- Create: `apps/api/drizzle/0006_ai_ritual_summaries.sql`

**Work items**

```sql
-- Phase 1: Add AI narrative columns to review_records
ALTER TABLE review_records ADD COLUMN recap_narrative TEXT DEFAULT NULL;
ALTER TABLE review_records ADD COLUMN overview_narrative TEXT DEFAULT NULL;
ALTER TABLE review_records ADD COLUMN ai_generation_used INTEGER NOT NULL DEFAULT 0; -- 0=false, 1=true
```

The `ai_generation_used` flag records whether the `generate-ritual-summary` endpoint was successfully called for this review session (regardless of whether narratives were accepted). This enables future analytics on adoption without requiring null-check heuristics.

**Verification**
- Migration runs cleanly against an existing test database; existing `review_records` rows are unaffected.
- `recap_narrative` and `overview_narrative` are NULL on all existing rows.
- `ai_generation_used` is 0 on all existing rows.
- All existing API tests continue to pass after migration.

**Evidence required**
- Migration SQL diff
- Passing existing API test suite after migration applied

---

### Phase 2: Extend shared contracts

**Outcome:** All layers share a stable vocabulary for narrative fields and ritual summary generation before any implementation logic.

**Primary files**
- Modify: `packages/contracts/src/index.ts`

**Work items**

Extend `reviewRecordSchema` with narrative fields:
```typescript
export const reviewRecordSchema = z.object({
  // ... all existing fields unchanged ...
  recapNarrative: z.string().nullable().optional(),        // null = dismissed or not yet featured
  overviewNarrative: z.string().nullable().optional(),     // null = dismissed or not yet featured
  aiGenerationUsed: z.boolean().optional()                 // true = generation endpoint was called
});
```

Extend `completeRitualRequestSchema` with optional narrative fields:
```typescript
export const completeRitualRequestSchema = z.object({
  actorRole: actorRoleSchema,
  occurrenceId: z.string().uuid(),
  carryForwardNotes: z.string().max(2000).nullable(),
  recapNarrative: z.string().max(1000).nullable().optional(),      // accepted recap draft text
  overviewNarrative: z.string().max(1000).nullable().optional()    // accepted overview draft text
});
```

Add ritual summary response schema (returned by the new generation endpoint):
```typescript
export const ritualSummaryResponseSchema = z.object({
  recapDraft: z.string().nullable(),      // null if AI failed for this section
  overviewDraft: z.string().nullable()    // null if AI failed for this section
});

export type RitualSummaryResponse = z.infer<typeof ritualSummaryResponseSchema>;
```

Export derived type updates: `ReviewRecord`, `CompleteRitualRequest` types are re-derived automatically from the updated schemas.

Keep all existing schemas intact. These are purely additive extensions.

**Verification**
- `tsc --noEmit` across all packages passes.
- A `ReviewRecord` with `recapNarrative: 'some text'` and `overviewNarrative: null` parses without error.
- The extended `CompleteRitualRequest` with all four fields parses without error.
- An existing `ReviewRecord` without narrative fields parses without error (`.optional()` handles absence).

**Evidence required**
- Contract diff showing field additions
- Passing typecheck output

---

### Phase 3: Extend AI provider interface and add `generateRitualSummaries`

**Outcome:** The `AiProvider` interface has a `generateRitualSummaries` method. `DisabledAiProvider` provides a deterministic stub that returns sample narrative text within the 100–150 word constraint. The implementation is ready for a real provider to be wired in.

**Primary files**
- Modify: `apps/api/src/ai.ts`

**Work items**

Define the input type for ritual summary generation. Add to `apps/api/src/ai.ts`:

```typescript
import type {
  InboxItem, Reminder, ActivityHistoryItem, WeeklyViewDay
} from '@olivia/contracts';

// Input assembled from H4 API responses
export interface RitualSummaryInput {
  // Recap section — activity from the prior calendar week (from GET /api/activity-history window)
  recapItems: ActivityHistoryItem[];         // grouped or flat; includes all 5 types
  lastWeekWindowStart: string;               // YYYY-MM-DD, for prompt context
  lastWeekWindowEnd: string;                 // YYYY-MM-DD

  // Overview section — upcoming items for the current calendar week (from GET /api/weekly-view)
  overviewDays: WeeklyViewDay[];             // all 7 days; includes all 4 workflow types
  currentWeekWindowStart: string;            // YYYY-MM-DD
  currentWeekWindowEnd: string;
}

export interface RitualSummaryOutput {
  recapDraft: string | null;      // null if AI could not generate for this section
  overviewDraft: string | null;   // null if AI could not generate for this section
}
```

Add method to `AiProvider` interface:
```typescript
export interface AiProvider {
  parseDraft(inputText: string): Promise<ParseDraftResult>;
  parseReminderDraft(inputText: string): Promise<ParseReminderDraftResult>;
  summarize(items: InboxItem[]): Promise<string>;
  summarizeReminders(reminders: Reminder[]): Promise<string>;
  generateRitualSummaries(input: RitualSummaryInput): Promise<RitualSummaryOutput>;
}
```

Extend `DisabledAiProvider` with a stub:
```typescript
async generateRitualSummaries(input: RitualSummaryInput): Promise<RitualSummaryOutput> {
  // Stub returns sample text for testability — not connected to a real model
  const recapCount = input.recapItems.length;
  const overviewCount = input.overviewDays.flatMap(d => d.items).length;
  return {
    recapDraft: recapCount > 0
      ? `Last week, your household completed ${recapCount} item${recapCount !== 1 ? 's' : ''} across routines, reminders, and other workflows. ` +
        `The week ran smoothly overall, with most planned activities wrapped up by the end of the week. ` +
        `A few carry-forward opportunities may be worth noting as you look ahead.`
      : null,
    overviewDraft: overviewCount > 0
      ? `This week has ${overviewCount} item${overviewCount !== 1 ? 's' : ''} across your routines and schedule. ` +
        `The week looks moderately busy with a mix of recurring routines and upcoming reminders. ` +
        `A few meal plan entries are already in place for the week ahead.`
      : null
  };
}
```

**Stub behavior notes:**
- Returns null for either section when input data is empty — consistent with the spec's expected "no activity" case.
- Returns non-null text for non-empty inputs — enables the full accept/dismiss/edit flow to be tested end-to-end without a real AI provider.
- Does not throw — consistent with the degradation model (provider errors produce null, not exceptions).

**Verification**
- `tsc --noEmit` passes.
- `DisabledAiProvider.generateRitualSummaries` called with a non-empty input returns two non-null strings within the expected length range.
- Called with empty `recapItems` and empty `overviewDays` returns `{ recapDraft: null, overviewDraft: null }`.
- Method never throws for any input.

**Evidence required**
- Updated `ai.ts` diff showing interface and stub implementation
- Passing typecheck output

---

### Phase 4: Add API endpoints for summary generation; extend complete-ritual

**Outcome:** Two API changes are available and tested:
1. New `POST /api/routines/:routineId/generate-ritual-summary` — assembles H4 data and generates draft narratives
2. Extended `POST /api/routines/:id/complete-ritual` — accepts and stores `recapNarrative` and `overviewNarrative`

**Primary files**
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/repository.ts`
- Modify: `apps/api/test/api.test.ts`

**Work items**

**Add `POST /api/routines/:routineId/generate-ritual-summary`:**

```
POST /api/routines/:routineId/generate-ritual-summary
Path param: routineId
Body: { occurrenceId: string }
Response: RitualSummaryResponse { recapDraft: string | null, overviewDraft: string | null }
Auth: stakeholder only (spouse cannot initiate AI generation)
```

Route handler logic:
1. Fetch the routine by `routineId`. If not found: 404.
2. Verify `routine.ritualType === 'weekly_review'`. If not: 400 "Not a planning ritual".
3. Fetch the occurrence by `occurrenceId`. Verify it belongs to this routine and is in due/overdue state. If not found or completed: 404/409.
4. Compute review windows using `getReviewWindowsForOccurrence(new Date(occurrence.dueDate))`.
5. Assemble recap input: call the activity history query logic (reuse the repository method behind `GET /api/activity-history`) filtered to the `lastWeekWindowStart`–`lastWeekWindowEnd` range from step 4.
6. Assemble overview input: call the weekly view query logic (reuse the repository method behind `GET /api/weekly-view`) for the `currentWeekWindowStart`–`currentWeekWindowEnd` range from step 4.
7. Call `await aiProvider.generateRitualSummaries({ recapItems, lastWeekWindowStart, lastWeekWindowEnd, overviewDays, currentWeekWindowStart, currentWeekWindowEnd })`.
8. On success: return `ritualSummaryResponseSchema.parse({ recapDraft, overviewDraft })`.
9. On AI provider error (caught): return `{ recapDraft: null, overviewDraft: null }` — do not propagate the error to the client; let the review flow handle null drafts as the error state.

**Note on data assembly:** The activity history repository method returns items from a date range. The endpoint uses the same window-anchored date range computed in step 4. If the occurrence's due date was in the past (late completion), the recap data is assembled from the historical H4 records for that past week — confirming the data is available because it was written to the database at the time.

**Extend repository for narrative fields:**

Extend `repository.createReviewRecord` to accept and write the new fields:
```typescript
createReviewRecord(data: Omit<ReviewRecord, 'createdAt' | 'updatedAt'> & {
  recapNarrative?: string | null;
  overviewNarrative?: string | null;
  aiGenerationUsed?: boolean;
}): ReviewRecord
```
The INSERT statement should include the three new columns, defaulting to NULL/false when not provided.

Extend `repository.getReviewRecordById` to return the new columns in the mapped result.

**Extend `POST /api/routines/:id/complete-ritual`:**

The existing endpoint accepted `{ actorRole, occurrenceId, carryForwardNotes }`. Extend the handler to also read `recapNarrative?: string | null` and `overviewNarrative?: string | null` from the request body (validated via the updated `completeRitualRequestSchema`). Pass these through to `repository.createReviewRecord`. Also set `aiGenerationUsed: !!(recapNarrative || overviewNarrative)` — true if at least one narrative was accepted.

**Verification**

API integration tests in `apps/api/test/api.test.ts`:

For `POST /api/routines/:routineId/generate-ritual-summary`:
- Happy path: ritual routine with a due occurrence → 200, `recapDraft` and `overviewDraft` non-null (stub text).
- Routine not found: → 404.
- Not a ritual routine: → 400.
- Occurrence already completed: → 409.
- Spouse role: → 403.
- Window anchoring: occurrence with `dueDate = '2026-03-08'` → recap window March 2–8, overview window March 9–15 confirmed in (or derivable from) the response.

For extended `POST /api/routines/:id/complete-ritual`:
- With `recapNarrative` and `overviewNarrative` populated → 200, saved in review record.
- With `recapNaritative: null, overviewNarrative: null` (dismissed) → 200, narrative fields null in review record.
- Without narrative fields (backwards-compatible call) → 200, fields null.
- `GET /api/review-records/:id` on a review record with accepted narratives → response includes `recapNarrative` and `overviewNarrative`.
- `GET /api/review-records/:id` on a Phase 1 review record (no narrative fields) → response has `recapNarrative: null`, `overviewNarrative: null`.

**Evidence required**
- Passing API test output
- Sample response JSON for both endpoints

---

### Phase 5: Extend PWA client/sync layer

**Outcome:** The PWA can call the summary generation endpoint and include accepted narrative text in the ritual completion call.

**Primary files**
- Modify: `apps/pwa/src/lib/api.ts`
- Modify: `apps/pwa/src/lib/sync.ts`

**Work items**

**Add to `apps/pwa/src/lib/api.ts`:**
```typescript
export async function generateRitualSummary(
  routineId: string,
  occurrenceId: string
): Promise<RitualSummaryResponse> {
  const res = await apiFetch(`/api/routines/${routineId}/generate-ritual-summary`, {
    method: 'POST',
    body: JSON.stringify({ occurrenceId })
  });
  return ritualSummaryResponseSchema.parse(await res.json());
}
```

This function is used online only — the draft is transient session state and is never cached.

**Extend `submitRitualCompletion` in `apps/pwa/src/lib/sync.ts`:**

The existing `submitRitualCompletion(routineId, occurrenceId, carryForwardNotes)` signature is extended:
```typescript
export async function submitRitualCompletion(
  routineId: string,
  occurrenceId: string,
  carryForwardNotes: string | null,
  recapNarrative: string | null,      // accepted draft text, or null if dismissed
  overviewNarrative: string | null    // accepted draft text, or null if dismissed
): Promise<CompleteRitualResponse>
```

The online path passes the narrative fields through to `completeRitual(routineId, { occurrenceId, carryForwardNotes, recapNarrative, overviewNarrative })`.

The offline path creates the provisional review record locally including narrative fields — so that when the outbox flushes, the narrative content is included in the server request. The provisional `ReviewRecord` stored in Dexie should include the narrative fields.

**Add to `apps/pwa/src/lib/sync.ts`:**
```typescript
export async function loadRitualSummaries(
  routineId: string,
  occurrenceId: string
): Promise<RitualSummaryResponse> {
  // Online only — drafts are transient session state per spec
  // If offline or call fails, return null drafts (graceful degradation)
  if (!navigator.onLine) {
    return { recapDraft: null, overviewDraft: null };
  }
  try {
    return await generateRitualSummary(routineId, occurrenceId);
  } catch {
    return { recapDraft: null, overviewDraft: null };
  }
}
```

The timeout (default 10 seconds per spec) is implemented here as an `AbortController` on the fetch:
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10_000);
try {
  const result = await generateRitualSummary(routineId, occurrenceId, controller.signal);
  clearTimeout(timeout);
  return result;
} catch {
  clearTimeout(timeout);
  return { recapDraft: null, overviewDraft: null };
}
```

**Verification**
- Unit test: `loadRitualSummaries` when `navigator.onLine = false` returns `{ recapDraft: null, overviewDraft: null }` without calling the API.
- Unit test: `loadRitualSummaries` when the API call throws returns `{ recapDraft: null, overviewDraft: null }`.
- Unit test: `submitRitualCompletion` with narrative fields populates the API request body correctly.
- Unit test: offline `submitRitualCompletion` includes narrative fields in the outbox entry.

**Evidence required**
- Passing unit test output for new sync functions

---

### Phase 6: Build PWA surface changes

**⚠️ VISUAL SPEC DEPENDENCY:** This phase requires `docs/plans/ai-assisted-ritual-summaries-visual-implementation-spec.md`. All layout, color, typography, and interaction details are specified there. The structure below is the implementation guide; all visual details must come from the visual spec (§0.1–§0.8, §3.x).

**Outcome:** Two existing PWA screens are extended:
1. `ReviewFlowPage` — Steps 1 and 2 gain AI draft state with loading skeleton, draft card, accept/dismiss, and inline edit
2. `ReviewRecordDetailPage` — narrative sections with "AI-assisted" badges; null state omits sections

#### 6.1 Extend `ReviewFlowPage` — AI draft state

**File to modify:** `apps/pwa/src/routes/review-flow-page.tsx`

**New state variables (per section):**
```typescript
const [recapDraftState, setRecapDraftState] = useState<
  | { status: 'loading' }
  | { status: 'available'; text: string }
  | { status: 'accepted'; text: string }
  | { status: 'dismissed' }
  | { status: 'error' }
>({ status: 'loading' });

const [overviewDraftState, setOverviewDraftState] = useState<
  // same union type
>({ status: 'loading' });

// Editing state (tap-to-edit)
const [recapEditText, setRecapEditText] = useState('');
const [overviewEditText, setOverviewEditText] = useState('');
```

**On review flow mount:**
```typescript
useEffect(() => {
  // Check offline before attempting — offline state should feel like Phase 1
  if (!navigator.onLine) {
    setRecapDraftState({ status: 'dismissed' }); // treat offline as no-draft (not error)
    setOverviewDraftState({ status: 'dismissed' });
    return;
  }

  loadRitualSummaries(routineId, occurrenceId).then(({ recapDraft, overviewDraft }) => {
    setRecapDraftState(recapDraft
      ? { status: 'available', text: recapDraft }
      : { status: 'error' }
    );
    setOverviewDraftState(overviewDraft
      ? { status: 'available', text: overviewDraft }
      : { status: 'error' }
    );
  });
}, [routineId, occurrenceId]);
```

**Note on offline state:** Per visual spec §0.6 — when offline, the draft card does not appear at all (not the error state; not the loading skeleton). The section renders only the structured item list. Implementing this as `status: 'dismissed'` with no draft card rendered is correct. The offline state should be visually indistinguishable from Phase 1.

**Draft card rendering (steps 1 and 2):**

In the step content area, above the structured item list:

- `status: 'loading'` → render loading skeleton card (visual spec §0.5)
- `status: 'available'` → render draft card with "✦ Drafted by Olivia" badge and narrative text; below text show "Tap to edit" hint (first-use only); footer: `[Dismiss]` + `[Use this summary →]`
- `status: 'error'` → render calm inline error card with fallback message (visual spec §0.6)
- `status: 'accepted'` → draft card is dismissed; structured item list fills section; footer: standard `[Continue →]`
- `status: 'dismissed'` → no draft card; structured item list fills section; footer: standard `[Continue →]`

**Accept handler:**
```typescript
function handleAcceptRecap() {
  const text = recapEditText || (recapDraftState.status === 'available' ? recapDraftState.text : '');
  setRecapDraftState({ status: 'accepted', text });
}
```

**Dismiss handler:**
```typescript
function handleDismissRecap() {
  setRecapDraftState({ status: 'dismissed' });
}
```

**Inline edit:** When in `status: 'available'`, tapping the narrative text body transitions to an edit textarea in place within the draft card. The edit value is tracked via `recapEditText`. On acceptance, the current `recapEditText` value (if non-empty) is used as the narrative text; if the user never edited, the original draft text is used.

**Complete review integration:**

The existing "Complete review" handler is extended to collect accepted narrative text:
```typescript
const acceptedRecapNarrative = recapDraftState.status === 'accepted' ? recapDraftState.text : null;
const acceptedOverviewNarrative = overviewDraftState.status === 'accepted' ? overviewDraftState.text : null;

await submitRitualCompletion(
  routineId,
  occurrenceId,
  notes || null,
  acceptedRecapNarrative,
  acceptedOverviewNarrative
);
```

**Footer state logic (per step):**

Step 1 footer:
- While `recapDraftState.status === 'loading'`: show `[Continue →]` disabled
- While `recapDraftState.status === 'available'`: show `[Dismiss]` + `[Use this summary →]`
- All other states: show `[Continue →]` active

Step 2 footer (same logic for overview draft state).

Step 3 footer: unchanged — always shows `[Complete review]`.

#### 6.2 Extend `ReviewRecordDetailPage` — narrative sections

**File to modify:** `apps/pwa/src/routes/review-record-detail-page.tsx`

**Narrative section rendering (conditional on non-null field values):**

After the review metadata header and before the carry-forward notes section, conditionally render:

```tsx
{data.recapNarrative && (
  <NarrativeCard
    label="Last week"
    text={data.recapNarrative}
  />
)}
{data.overviewNarrative && (
  <NarrativeCard
    label="This week"
    text={data.overviewNarrative}
  />
)}
```

`NarrativeCard` is a local component (inline, no separate file needed):
- Background: `--lavender-soft`
- Border: `1.5px solid var(--lavender)`
- Attribution badge: `✦ AI-assisted` (PJS 11px 500, `--violet`, top-left of card padding)
- Section label below badge: `label` prop in PJS 12px 600, `--ink-2`, uppercase tracking
- Narrative text: PJS 14px 400, `--ink`, padding 14px

Null state: when both `recapNarrative` and `overviewNarrative` are null, no narrative sections render. The review record detail looks identical to Phase 1. No placeholder, no "AI not used" indicator.

**Note for Founding Engineer:** The `ReviewRecord` type now includes `recapNarrative` and `overviewNarrative` as optional nullable fields. Review records created before this migration will have these fields as null/undefined — the conditional rendering handles both cases (null and undefined are both falsy).

---

### Phase 7: Verification, documentation sync, and milestone evidence

**Outcome:** AI-assisted ritual summaries are verifiable end-to-end. All 17 acceptance criteria from the feature spec are met. M16 milestone gate readiness can be assessed.

**Primary files**
- Modify as needed: all test files touched in prior phases
- Modify: `docs/roadmap/milestones.md` (M16 progress notes → completion)
- Modify: `docs/learnings/decision-history.md` if new durable decisions were made during implementation
- Modify: `docs/learnings/learnings-log.md` with H5 Phase 1 build outcomes

**Work items**

Run targeted automated suites:
- `packages/contracts` — extended schemas parse correctly
- `apps/api/test` — summary generation, narrative storage, extended complete-ritual
- `apps/pwa/src/lib` — offline summary loading, submitRitualCompletion with narratives
- Full domain + API + PWA test suite — confirm no regressions from planning ritual support

Execute manual acceptance criteria checklist against `docs/specs/ai-assisted-ritual-summaries.md`:

1. ✓ When the planning ritual review flow opens, Olivia initiates AI draft generation for the last week recap and coming week overview sections immediately, in parallel.
2. ✓ A visible loading indicator (skeleton card) is shown in each section while the AI draft is being generated.
3. ✓ When the AI draft is ready, it appears above the structured item list in the relevant section, labeled "Drafted by Olivia" with a visually distinct lavender-tinted attribution treatment.
4. ✓ The household member can accept the AI draft as-is with a single tap ("Use this summary").
5. ✓ The household member can edit the AI draft inline before accepting, with the edited version becoming the accepted narrative.
6. ✓ The household member can dismiss the AI draft with a single tap; dismissal reverts the section to the existing structured item list display.
7. ✓ Accepting a draft does not hide the structured item list — the underlying items remain visible below the narrative.
8. ✓ If the AI call fails, times out, or the device is offline when the review opens, the section displays only the structured item list with a calm fallback message (error state) or no draft at all (offline state).
9. ✓ Each section degrades independently — recap draft failure does not affect the overview section.
10. ✓ Completing the review saves a review record with `recap_narrative` populated if accepted, null if dismissed.
11. ✓ Completing the review saves a review record with `overview_narrative` populated if accepted, null if dismissed.
12. ✓ Review record creation, ritual completion, and next-occurrence scheduling are not affected by whether AI drafts were accepted or dismissed.
13. ✓ When the review record is viewed from activity history, accepted narratives are displayed with "AI-assisted" attribution labels distinguishing them from carry-forward notes.
14. ✓ The AI prompt input is scoped strictly to H4 structured data from `GET /api/activity-history` and `GET /api/weekly-view`. No carry-forward notes or other free-text is included.
15. ✓ The review flow is fully functional offline: structured item lists display correctly, ritual can be completed, review record saved to outbox and synced on reconnect — without AI.
16. ✓ The spouse can view accepted narratives in the review record detail in read-only mode with the per-screen spouse banner (L-009).
17. ✓ All existing planning ritual support acceptance criteria (18 criteria from `docs/specs/planning-ritual-support.md`) remain satisfied. The AI layer is additive.

Review deferred boundaries — confirm not quietly implemented:
- No regeneration UI (within-session restore of original draft)
- No opt-in toggle for AI generation
- No carry-forward note AI suggestions
- No proactive household nudges
- No AI generation outside the planning ritual review flow
- No modification of accepted narratives after review record is saved

If implementation surfaces new durable decisions, document in `docs/learnings/decision-history.md`.

**Evidence required**
- Passing targeted automated suite output
- Manual QA checklist confirming all 17 acceptance criteria
- `docs/roadmap/milestones.md` M16 completion note added

---

## Verification Matrix

### Contracts and AI provider
- `reviewRecordSchema` with all new fields parses correctly (with and without narrative fields, for backwards compatibility with Phase 1 records).
- `completeRitualRequestSchema` accepts the optional narrative fields without breaking existing tests.
- `DisabledAiProvider.generateRitualSummaries` returns non-null text for non-empty input; null for empty input; never throws.

### API and data assembly
- `POST /api/routines/:routineId/generate-ritual-summary` assembles the correct H4 data for the window anchored to the occurrence's due date and returns stub narrative text.
- Window anchoring confirmed: occurrence due March 8 → recap window March 2–8, overview window March 9–15.
- Spouse role blocked from calling the generation endpoint.
- `POST /api/routines/:id/complete-ritual` stores accepted narratives in `review_records.recap_narrative` and `overview_narrative`.
- `GET /api/review-records/:id` returns narrative fields when present; null when absent; accessible to spouse role.

### PWA and offline behavior
- Review flow mounts, calls `loadRitualSummaries`, and renders loading skeleton immediately.
- On success: draft card appears above structured list; `[Dismiss]` and `[Use this summary]` footer pair shown.
- Accept path: narrative text captured in component state; passed to `submitRitualCompletion`; stored in review record.
- Dismiss path: section reverts to structured list; narrative null in review record.
- Edit path: edited text used as narrative on acceptance; original draft discarded.
- Offline: no draft card shown; review flow behaves identically to Phase 1.
- API error / timeout: error state card shown (not offline card); footer shows standard `[Continue →]`.
- Review record detail: narrative cards visible when non-null; "AI-assisted" badge present; null narrative sections omitted.

### Scope control
- No AI calls from PWA (all AI calls via server endpoint).
- Prompt content confirmed to contain only H4 structured data.
- No narrative storage before user acceptance.
- All existing planning ritual support, activity history, and weekly view tests pass without regression.

---

## Risks / Open Questions

### 1. Real AI provider wiring (out of scope for plan; Founding Engineer follow-on)

This plan delivers an end-to-end testable implementation using `DisabledAiProvider`. Wiring in a real AI provider (e.g., `ClaudeAiProvider` using the Anthropic SDK) is the follow-on step. The `AiProvider` interface is the integration surface; the implementation pattern from existing `summarize`/`summarizeReminders` methods provides the precedent. When the real provider is added, the prompt design (including exact item field inclusion, narrative length constraint enforcement, and system prompt text) must be confirmed per Decision E and the feature spec's prompt privacy constraint.

### 2. Activity history repository method reuse in summary generation endpoint

The `generate-ritual-summary` endpoint assembles recap data by querying the activity history tables for a specific date window. The existing activity history repository method (from M12) queries a rolling 30-day window. Confirm whether the M12 method accepts a custom date range parameter or if a new query variant is needed. If the M12 method uses a hardcoded 30-day window, a lightweight wrapper that accepts `windowStart`/`windowEnd` parameters is needed — this should be a non-breaking addition.

### 3. Weekly view data for non-current weeks

The `GET /api/weekly-view` endpoint was built to return the current calendar week. For late ritual completions, the "coming week" as of the occurrence's due date may be a past or different week. The summary generation endpoint must be able to assemble weekly view data for the week anchored to the occurrence's due date, not necessarily the current week. Confirm whether the weekly view repository method accepts a `weekStart` parameter or if a variant is needed. Same as risk 2 — a parameter extension is likely sufficient.

### 4. Offline narrative state in Dexie

When the ritual is completed offline (narrative fields included in the outbox entry), the outbox flush must pass the narrative fields to the server. Confirm that the existing outbox `complete-ritual` entry shape and flush logic in `client-db.ts` is extended to include the narrative fields. The provisional `ReviewRecord` stored locally should also include narrative text so the review record detail screen can display it before the sync is confirmed.

### 5. Test coverage for timeout behavior

The 10-second timeout in `loadRitualSummaries` requires a test that simulates a slow/non-responding server. The Vitest `vi.useFakeTimers()` + `vi.advanceTimersByTime(10_001)` pattern can simulate this. Confirm the AbortController + fetch pattern is compatible with the PWA's fetch mock/intercept setup.
