# Real AI Provider Wiring Implementation Plan

**Goal:** Implement `ClaudeAiProvider` behind the existing D-008 adapter boundary to make AI-assisted planning ritual summaries deliver real Claude-generated content for the first time. The scope is a single file change (`apps/api/src/ai.ts`) plus configuration wiring. No PWA changes, no new API routes, no new database tables.

**Architecture:** The `generate-ritual-summary` endpoint in `apps/api/src/app.ts` already calls `aiProvider.generateRitualSummaries(summaryInput)` on line 1841. The `aiProvider` is currently hard-coded to `new DisabledAiProvider()` on line 241. Phase 2 replaces that instantiation with a factory function that selects `ClaudeAiProvider` when `ANTHROPIC_API_KEY` is present, and falls back to `DisabledAiProvider` when it is not. Nothing else in the codebase changes.

**Tech Stack:** TypeScript, `@anthropic-ai/sdk` (add as new dependency), existing Fastify app.

**Spec dependency:** All product decisions are resolved in `docs/specs/real-ai-provider-wiring.md` (CEO-approved, 2026-03-15). This plan translates those decisions into concrete implementation steps for the Founding Engineer.

---

## Summary

1. Add `@anthropic-ai/sdk` as a production dependency
2. Implement `ClaudeAiProvider` in `apps/api/src/ai.ts`
3. Add provider factory function and `ANTHROPIC_API_KEY` startup wiring in `apps/api/src/app.ts`
4. Write unit tests for `ClaudeAiProvider` with mocked SDK
5. Write provider selection startup test
6. Write prompt privacy scope integration test
7. Verify regression — all existing API tests pass without `ANTHROPIC_API_KEY`

---

## Architecture Decisions Resolved In This Plan

### Decision A: Provider selection via factory function at startup

**Chosen approach:** Extract provider instantiation from `apps/api/src/app.ts` into a factory function `createAiProvider(config)` that reads `process.env.ANTHROPIC_API_KEY` (or `config.anthropicApiKey` if already threaded through the config object) and returns either a `ClaudeAiProvider` or a `DisabledAiProvider`.

**Rationale:** Keeps the selection logic testable independently of the HTTP server. The factory is a pure function: given a config object, return a provider. The existing `buildApp(config)` in `app.ts` calls it once at startup.

**Implementation note:** If the existing `config` type does not already include `anthropicApiKey`, add it as `anthropicApiKey?: string`. The factory reads `config.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY ?? ''`.

### Decision B: `ClaudeAiProvider` implements `generateRitualSummaries` with real SDK calls; all other methods stub

**Chosen approach:** `ClaudeAiProvider.generateRitualSummaries` makes real Anthropic SDK calls. The remaining methods — `parseDraft`, `parseReminderDraft`, `summarize`, `summarizeReminders` — delegate to the same stub behavior as `DisabledAiProvider`.

**Rationale:** Per spec: the M21 gate requirement is `generateRitualSummaries` delivering real AI output; the other methods are out of scope for Phase 2. Stubbing them avoids unplanned scope creep while keeping the interface fully satisfied.

### Decision C: Parallel generation for recap and overview

**Chosen approach:** `ClaudeAiProvider.generateRitualSummaries` calls the Anthropic SDK for recap and overview in parallel via `Promise.allSettled`. Each call is wrapped in an independent try/catch so a failure in one section does not prevent the other from succeeding.

**Rationale:** Per spec (Decision D from Phase 1 plan and spec OQ-2 recommendation): parallel generation minimizes total perceived latency. `Promise.allSettled` is the correct primitive — unlike `Promise.all`, it does not short-circuit on a single rejection, enabling the partial-failure return shape (`{ recapDraft: null, overviewDraft: "..." }`).

### Decision D: Prompt structure — item names included, carry-forward notes excluded

**Chosen approach:** The recap prompt includes routine names, reminder titles, meal names, inbox item titles, and list item bodies from `recapItems`. The overview prompt includes routine titles, reminder titles, meal names, and inbox item titles from `overviewDays`. The prompt does not include carry-forward notes, prior narrative text, or any household free-text not present in the H4 structured data passed to `generateRitualSummaries`.

**Rationale:** Per Decision E from the Phase 1 implementation plan and spec privacy boundary: item names from H4 APIs are necessary for a meaningful narrative and are the approved scope. Carry-forward notes are household free-text outside the approved privacy surface. The `RitualSummaryInput` type does not include carry-forward notes — the input shape itself enforces the boundary.

### Decision E: Error propagation — catch all errors, return null drafts, never throw

**Chosen approach:** Each SDK call is wrapped in a try/catch. Any thrown value — network error, SDK error, timeout, rate limit — is caught. If the recap call fails, `recapDraft` is `null`; if the overview call fails, `overviewDraft` is `null`. The method never throws from `generateRitualSummaries`. The outer catch in `app.ts` line 1846 is a defense-in-depth layer, but the provider itself handles all errors internally.

**Rationale:** Per spec error propagation model. The existing catch in `app.ts` already ensures the route returns null drafts rather than a 500 — but requiring the provider to never throw makes the contract explicit and independently testable.

### Decision F: Timeout — 10-second `AbortSignal` per SDK call

**Chosen approach:** Each Anthropic SDK call is given a `signal` from an `AbortController` with a 10-second timeout. The abort triggers the same catch block as any other SDK error, returning `null` for that section.

**Rationale:** Per spec: "Catch timeout, return null drafts." The Anthropic SDK respects `AbortSignal` passed in the request options.

---

## Source Artifacts

- `docs/specs/real-ai-provider-wiring.md` — approved spec (CEO-approved, 2026-03-15)
- `apps/api/src/ai.ts` — `AiProvider` interface and `DisabledAiProvider` (lines 1–70)
- `apps/api/src/app.ts` — provider instantiation (line 241), `generate-ritual-summary` endpoint (lines 1671–1850)
- `docs/plans/ai-assisted-ritual-summaries-implementation-plan.md` — Phase 1 plan: prompt design boundary (Decision E), token budget context, provider call shape
- `docs/roadmap/milestones.md` (M21) — exit criteria

---

## Assumptions And Non-Goals

### Assumptions

- `@anthropic-ai/sdk` is not yet in `apps/api/package.json` — it must be added. Check `pnpm list @anthropic-ai/sdk` first; if already present as a transitive dependency, still add it as an explicit production dependency.
- The existing `config` object passed to `buildApp(config)` has a type that can be extended with `anthropicApiKey?: string` without breaking existing tests.
- The test environment does not set `ANTHROPIC_API_KEY`. Existing tests instantiate `DisabledAiProvider` and must continue to do so after this change.
- `@anthropic-ai/sdk` supports `AbortSignal` via request options (confirmed in SDK documentation).

### Non-Goals

- Real AI calls for `parseDraft`, `parseReminderDraft`, `summarize`, or `summarizeReminders`.
- Streaming response delivery.
- Per-household rate limiting or quota enforcement.
- Cost tracking or token usage logging.
- In-app API key configuration.
- Any PWA changes.
- Any new API routes or database tables.
- Prompt quality tuning beyond the spec's 100–150 word constraint (prompt refinement is a Phase 2 follow-on after household observation).

---

## Codebase Anchors

- `apps/api/src/ai.ts` — add `ClaudeAiProvider` class; add `createAiProvider` factory
- `apps/api/src/app.ts` — replace `new DisabledAiProvider()` with `createAiProvider(config)` call; thread `anthropicApiKey` through config if needed
- `apps/api/package.json` — add `@anthropic-ai/sdk` as production dependency
- `apps/api/test/api.test.ts` — add unit and integration tests for provider selection and `ClaudeAiProvider`

---

## Implementation Phases

### Phase 1: Add `@anthropic-ai/sdk` dependency

**Outcome:** The Anthropic SDK is available as an explicit production dependency in `apps/api`.

**Work items**

From the `apps/api` directory:
```bash
pnpm add @anthropic-ai/sdk
```

Pin the version in `package.json` to the resolved version. Do not use `latest` as a tag — pin the exact semver so SDK updates are deliberate.

**Verification**
- `pnpm list @anthropic-ai/sdk` in `apps/api` shows the pinned version.
- `tsc --noEmit` still passes.

**Evidence required**
- `package.json` diff showing explicit `@anthropic-ai/sdk` dependency with pinned version

---

### Phase 2: Implement `ClaudeAiProvider` in `apps/api/src/ai.ts`

**Outcome:** A `ClaudeAiProvider` class that fully implements the `AiProvider` interface is added to `apps/api/src/ai.ts`. The class makes real Anthropic SDK calls for `generateRitualSummaries`; all other methods use stub behavior matching `DisabledAiProvider`.

**Primary files**
- Modify: `apps/api/src/ai.ts`

**Work items**

Add to the top import block of `apps/api/src/ai.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk';
```

Add the `ClaudeAiProvider` class after `DisabledAiProvider`:

```typescript
export class ClaudeAiProvider implements AiProvider {
  private readonly client: Anthropic;
  private readonly model = 'claude-haiku-4-5-20251001';

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  // --- Stub methods (same behavior as DisabledAiProvider) ---

  async parseDraft(inputText: string): Promise<ParseDraftResult> {
    return createDraft({ inputText });
  }

  async parseReminderDraft(inputText: string): Promise<ParseReminderDraftResult> {
    return createReminderDraft({ inputText });
  }

  async summarize(items: InboxItem[]): Promise<string> {
    return `AI disabled. ${items.length} items available.`;
  }

  async summarizeReminders(reminders: Reminder[]): Promise<string> {
    return `AI disabled. ${reminders.length} reminders available.`;
  }

  // --- Real AI method ---

  async generateRitualSummaries(input: RitualSummaryInput): Promise<RitualSummaryOutput> {
    const [recapResult, overviewResult] = await Promise.allSettled([
      this.generateSection(this.buildRecapPrompt(input)),
      this.generateSection(this.buildOverviewPrompt(input))
    ]);

    return {
      recapDraft: recapResult.status === 'fulfilled' ? recapResult.value : null,
      overviewDraft: overviewResult.status === 'fulfilled' ? overviewResult.value : null
    };
  }

  private async generateSection(prompt: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: 300,
          system:
            'You are a helpful household assistant. Write concise, warm summaries based on the structured data provided. Do not present outputs as confirmed or completed — write in a helpful summary tone. Do not include any information not present in the provided data.',
          messages: [{ role: 'user', content: prompt }]
        },
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      const block = response.content[0];
      if (block?.type === 'text') {
        return block.text;
      }
      return null;
    } catch {
      clearTimeout(timeout);
      return null;
    }
  }

  private buildRecapPrompt(input: RitualSummaryInput): string {
    const lines: string[] = [
      `Write a concise summary of approximately 100–150 words in warm, direct household language summarizing last week's household activity.`,
      `Last week period: ${input.lastWeekWindowStart} to ${input.lastWeekWindowEnd}.`,
      ``,
      `Completed items last week:`
    ];

    for (const item of input.recapItems) {
      switch (item.type) {
        case 'routine':
          lines.push(`- Routine completed: "${item.routineTitle}" (owner: ${item.owner}, due: ${item.dueDate})`);
          break;
        case 'reminder':
          lines.push(`- Reminder ${item.resolution}: "${item.title}" (owner: ${item.owner})`);
          break;
        case 'meal':
          lines.push(`- Meal entry: "${item.name}" from plan "${item.planTitle}" on ${item.date}`);
          break;
        case 'inbox':
          lines.push(`- Task completed: "${item.title}" (owner: ${item.owner})`);
          break;
        case 'listItem':
          lines.push(`- List item checked: "${item.body}" from list "${item.listName}"`);
          break;
      }
    }

    if (input.recapItems.length === 0) {
      lines.push('(No items recorded for last week)');
    }

    return lines.join('\n');
  }

  private buildOverviewPrompt(input: RitualSummaryInput): string {
    const lines: string[] = [
      `Write a concise summary of approximately 100–150 words in warm, direct household language previewing the coming week's household activity.`,
      `This week period: ${input.currentWeekWindowStart} to ${input.currentWeekWindowEnd}.`,
      ``,
      `Upcoming items this week (by day):`
    ];

    for (const day of input.overviewDays) {
      const dayItems: string[] = [];
      for (const r of day.routines) {
        dayItems.push(`routine "${r.routineTitle}" (owner: ${r.owner})`);
      }
      for (const r of day.reminders) {
        dayItems.push(`reminder "${r.title}" (owner: ${r.owner})`);
      }
      for (const m of day.meals) {
        dayItems.push(`meal "${m.name}"`);
      }
      for (const i of day.inboxItems) {
        dayItems.push(`task "${i.title}" (owner: ${i.owner})`);
      }
      if (dayItems.length > 0) {
        lines.push(`${day.date}: ${dayItems.join(', ')}`);
      }
    }

    const totalItems = input.overviewDays.reduce(
      (sum, d) => sum + d.routines.length + d.reminders.length + d.meals.length + d.inboxItems.length,
      0
    );
    if (totalItems === 0) {
      lines.push('(No items scheduled for this week)');
    }

    return lines.join('\n');
  }
}
```

**Implementation notes:**

- `max_tokens: 300` is sufficient for 100–150 word outputs (approximately 200–250 tokens at typical English token density, with 300 as a comfortable ceiling). The spec's prompt instruction ("approximately 100–150 words") reinforces the length constraint at the model level.
- The `generateSection` method returns `null` rather than throwing on any error — this covers SDK errors, network errors, timeout aborts, and unexpected response shapes. `Promise.allSettled` in `generateRitualSummaries` collects both results regardless of individual failures.
- `ANTHROPIC_API_KEY` is received as a constructor argument, not read directly from `process.env` inside the class. This keeps the class testable without environment variable manipulation.
- The prompt does not include carry-forward notes or any field not present in `RitualSummaryInput`. The input type itself enforces the privacy boundary: `recapItems` contains only H4 structured data, and `overviewDays` contains only H4 weekly view data.

**Verification**
- `tsc --noEmit` passes.
- `ClaudeAiProvider` satisfies the `AiProvider` interface (TypeScript will enforce this at compile time).

**Evidence required**
- Updated `ai.ts` diff showing `ClaudeAiProvider` class
- Passing typecheck output

---

### Phase 3: Wire provider selection at startup in `apps/api/src/app.ts`

**Outcome:** The API server instantiates `ClaudeAiProvider` when `ANTHROPIC_API_KEY` is set and non-empty, and falls back to `DisabledAiProvider` with a warning log when it is not. The test environment (no API key set) continues to use `DisabledAiProvider` transparently.

**Primary files**
- Modify: `apps/api/src/ai.ts` — add `createAiProvider` factory (or add it directly in `app.ts`; see note below)
- Modify: `apps/api/src/app.ts` — replace `new DisabledAiProvider()` with factory call; thread API key from config

**Work items**

Add `createAiProvider` factory to `apps/api/src/ai.ts`:

```typescript
export function createAiProvider(apiKey: string | undefined, log?: { warn: (msg: string) => void }): AiProvider {
  if (apiKey && apiKey.trim().length > 0) {
    return new ClaudeAiProvider(apiKey.trim());
  }
  log?.warn('ANTHROPIC_API_KEY is not set — falling back to DisabledAiProvider. AI-assisted summaries will return placeholder text.');
  return new DisabledAiProvider();
}
```

**Note:** The factory accepts an optional `log` argument so that `app.ts` can pass the Fastify logger for the startup warning. In tests, the log argument can be omitted or mocked.

Extend the `AppConfig` type (wherever it is defined — search for `AppConfig` or the config shape in `app.ts`) to add:
```typescript
anthropicApiKey?: string;
```

In `apps/api/src/app.ts`, replace line 241:
```typescript
// Before:
const aiProvider = new DisabledAiProvider();

// After:
const aiProvider = createAiProvider(config.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY, app.log);
```

Update the import at the top of `app.ts` to include `createAiProvider`:
```typescript
import { createAiProvider } from './ai.js';
// (or add to the existing import from './ai.js' if one already exists)
```

**Note on config threading:** If `config.anthropicApiKey` does not exist in the config type, add it as optional. The fallback to `process.env.ANTHROPIC_API_KEY` ensures the production server picks up the environment variable without explicit config. The config option exists for test injection (pass a known key or `undefined` to control which provider is selected in tests).

**Startup behavior summary:**
- `ANTHROPIC_API_KEY` set and non-empty → `ClaudeAiProvider` instantiated; no warning logged
- `ANTHROPIC_API_KEY` missing or empty → `DisabledAiProvider` instantiated; warning logged: `ANTHROPIC_API_KEY is not set — falling back to DisabledAiProvider`
- Invalid API key (e.g., wrong value) → `ClaudeAiProvider` is instantiated (no startup key validation); the first real API call will catch the 401 and return `null` drafts; a warning should be logged on first-use 401 if desired (Founding Engineer judgment call)

**Verification**
- `tsc --noEmit` passes.
- Running the API with `ANTHROPIC_API_KEY=` (empty) logs the fallback warning; running with a key set does not log it.
- All existing API tests pass without `ANTHROPIC_API_KEY` set in the test environment.

**Evidence required**
- Updated `app.ts` diff showing provider selection wiring
- Test run output confirming existing tests pass

---

### Phase 4: Unit tests for `ClaudeAiProvider`

**Outcome:** The `ClaudeAiProvider` has unit test coverage for the four behavioral cases specified in the feature spec.

**Primary files**
- Modify: `apps/api/test/api.test.ts` (or create a dedicated `apps/api/test/ai.test.ts` if the test file grows large — Founding Engineer judgment call)

**Work items**

Mock the Anthropic SDK client in tests. Use Vitest's `vi.mock('@anthropic-ai/sdk')` or construct a fake client object and pass it directly. The preferred pattern for injectable testability: extract the SDK client as a constructor parameter type and inject a mock in tests.

If direct injection is not convenient with the constructor approach above, use Vitest module mocking:

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate }
    })),
    __mockCreate: mockCreate
  };
});
```

**Test 1: Happy path — valid H4 input returns non-null drafts**

```typescript
it('ClaudeAiProvider.generateRitualSummaries returns non-null recap and overview drafts on success', async () => {
  mockCreate.mockResolvedValue({
    content: [{ type: 'text', text: 'This is a generated narrative summary for the household.' }]
  });

  const provider = new ClaudeAiProvider('test-api-key');
  const result = await provider.generateRitualSummaries(validRitualSummaryInput);

  expect(result.recapDraft).toBeTruthy();
  expect(result.overviewDraft).toBeTruthy();
});
```

**Test 2: Network error — returns `{ recapDraft: null, overviewDraft: null }` without throwing**

```typescript
it('ClaudeAiProvider.generateRitualSummaries returns null drafts on SDK network error', async () => {
  mockCreate.mockRejectedValue(new Error('Network error'));

  const provider = new ClaudeAiProvider('test-api-key');
  const result = await provider.generateRitualSummaries(validRitualSummaryInput);

  expect(result.recapDraft).toBeNull();
  expect(result.overviewDraft).toBeNull();
});
```

**Test 3: Rate limit error (429) — returns null drafts without throwing**

```typescript
it('ClaudeAiProvider.generateRitualSummaries returns null drafts on 429 rate limit error', async () => {
  const rateLimitError = new Error('Rate limit exceeded');
  (rateLimitError as any).status = 429;
  mockCreate.mockRejectedValue(rateLimitError);

  const provider = new ClaudeAiProvider('test-api-key');
  const result = await provider.generateRitualSummaries(validRitualSummaryInput);

  expect(result.recapDraft).toBeNull();
  expect(result.overviewDraft).toBeNull();
});
```

**Test 4: Partial failure — recap succeeds, overview fails → returns partial result**

```typescript
it('ClaudeAiProvider.generateRitualSummaries returns partial result when one section fails', async () => {
  mockCreate
    .mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Recap narrative text.' }]
    })
    .mockRejectedValueOnce(new Error('Overview generation failed'));

  const provider = new ClaudeAiProvider('test-api-key');
  const result = await provider.generateRitualSummaries(validRitualSummaryInput);

  expect(result.recapDraft).toBeTruthy();
  expect(result.overviewDraft).toBeNull();
});
```

**Fixture: `validRitualSummaryInput`**

```typescript
const validRitualSummaryInput: RitualSummaryInput = {
  recapItems: [
    { type: 'routine', routineId: 'r1', routineTitle: 'Morning Routine', owner: 'stakeholder', dueDate: '2026-03-08', completedAt: '2026-03-08T08:00:00Z', reviewRecordId: null },
    { type: 'reminder', reminderId: 'rem1', title: 'Grocery Run', owner: 'stakeholder', resolvedAt: '2026-03-07T12:00:00Z', resolution: 'completed' }
  ],
  lastWeekWindowStart: '2026-03-02',
  lastWeekWindowEnd: '2026-03-08',
  overviewDays: [
    { date: '2026-03-09', dayOfWeek: 0, routines: [{ routineId: 'r1', routineTitle: 'Morning Routine', owner: 'stakeholder', recurrenceRule: 'daily', intervalDays: null, dueDate: '2026-03-09', dueState: 'due', completed: false }], reminders: [], meals: [], inboxItems: [] }
  ],
  currentWeekWindowStart: '2026-03-09',
  currentWeekWindowEnd: '2026-03-15'
};
```

**Evidence required**
- Passing test output for all four test cases

---

### Phase 5: Provider selection startup test

**Outcome:** `createAiProvider` is tested: API key set → `ClaudeAiProvider`; API key missing → `DisabledAiProvider` with warning.

**Work items**

```typescript
import { createAiProvider, ClaudeAiProvider, DisabledAiProvider } from '../src/ai.js';

describe('createAiProvider', () => {
  it('returns ClaudeAiProvider when API key is set', () => {
    const provider = createAiProvider('sk-ant-test-key');
    expect(provider).toBeInstanceOf(ClaudeAiProvider);
  });

  it('returns DisabledAiProvider and logs warning when API key is empty', () => {
    const warnMock = vi.fn();
    const provider = createAiProvider('', { warn: warnMock });
    expect(provider).toBeInstanceOf(DisabledAiProvider);
    expect(warnMock).toHaveBeenCalledWith(expect.stringContaining('ANTHROPIC_API_KEY is not set'));
  });

  it('returns DisabledAiProvider when API key is undefined', () => {
    const provider = createAiProvider(undefined);
    expect(provider).toBeInstanceOf(DisabledAiProvider);
  });
});
```

**Evidence required**
- Passing test output for all three cases

---

### Phase 6: Prompt privacy scope integration test

**Outcome:** A test verifies that the prompt payload sent to the Anthropic SDK contains only H4 structured data — specifically that carry-forward notes or other household free-text not present in `RitualSummaryInput` cannot appear in the prompt.

**Rationale:** Per spec acceptance criterion 8 and the privacy scope section. This test captures the SDK call arguments and asserts on their contents.

**Work items**

```typescript
it('ClaudeAiProvider sends only H4 structured data in the prompt — no carry-forward notes or free-text', async () => {
  const capturedPrompts: string[] = [];
  mockCreate.mockImplementation(async (params: { messages: { content: string }[] }) => {
    const userMessage = params.messages[0]?.content ?? '';
    capturedPrompts.push(userMessage);
    return { content: [{ type: 'text', text: 'Generated summary.' }] };
  });

  const provider = new ClaudeAiProvider('test-api-key');
  await provider.generateRitualSummaries({
    recapItems: [
      { type: 'routine', routineId: 'r1', routineTitle: 'Morning Routine', owner: 'stakeholder', dueDate: '2026-03-08', completedAt: '2026-03-08T08:00:00Z', reviewRecordId: null }
    ],
    lastWeekWindowStart: '2026-03-02',
    lastWeekWindowEnd: '2026-03-08',
    overviewDays: [],
    currentWeekWindowStart: '2026-03-09',
    currentWeekWindowEnd: '2026-03-15'
  });

  // Recap prompt should contain the routine name
  expect(capturedPrompts[0]).toContain('Morning Routine');

  // Prompt should NOT contain carry-forward note text (this field is not in RitualSummaryInput)
  const sensitiveText = 'private household note that must not be in prompt';
  expect(capturedPrompts.join(' ')).not.toContain(sensitiveText);

  // Prompt should reference only the date window and item data from the input
  expect(capturedPrompts[0]).toContain('2026-03-02');
  expect(capturedPrompts[0]).toContain('2026-03-08');
});
```

**Note for Founding Engineer:** This test is a structural guard, not a comprehensive content audit. The primary enforcement is the `RitualSummaryInput` type: because carry-forward notes are not present in the input type, the prompt builder cannot include them. The test confirms the prompt contains expected H4 data (routine name, date window) and documents the privacy intent.

**Evidence required**
- Passing test output

---

### Phase 7: Regression verification

**Outcome:** All 50+ existing API tests continue to pass with no `ANTHROPIC_API_KEY` set. The `generate-ritual-summary` endpoint returns `DisabledAiProvider` stub text in tests, confirming the fallback path is exercised.

**Work items**

Run the full API test suite from the repo root:
```bash
pnpm test --filter @olivia/api
```

Or from `apps/api`:
```bash
pnpm test
```

Confirm:
- All tests pass.
- No test requires `ANTHROPIC_API_KEY` to be set.
- The `generate-ritual-summary` test coverage from Phase 1 (happy path returning stub text) still passes, confirming `DisabledAiProvider` is the active provider in test runs.

**Evidence required**
- Full passing test suite output showing 50+ tests pass
- Confirm: zero tests skipped due to missing API key

---

## Verification Matrix

### Provider implementation
- `ClaudeAiProvider` implements `AiProvider` interface — TypeScript enforces at compile time.
- `ClaudeAiProvider.generateRitualSummaries` makes real SDK calls for recap and overview in parallel.
- `generateRitualSummaries` never throws — catch blocks in `generateSection` and `Promise.allSettled` at the top level.
- Partial failure returns `{ recapDraft: null, overviewDraft: "..." }` or vice versa — verified by Phase 4 Test 4.
- Total failure returns `{ recapDraft: null, overviewDraft: null }` — verified by Phase 4 Tests 2 and 3.
- Stub methods (`parseDraft`, `parseReminderDraft`, `summarize`, `summarizeReminders`) match `DisabledAiProvider` behavior.

### Provider selection at startup
- `ANTHROPIC_API_KEY` set → `ClaudeAiProvider` — verified by Phase 5 test.
- `ANTHROPIC_API_KEY` missing → `DisabledAiProvider` + warning — verified by Phase 5 test.
- Test environment (no key) → `DisabledAiProvider` — verified by Phase 7 regression run.

### Privacy and security
- Prompt built from `RitualSummaryInput` fields only (routine names, reminder titles, meal names, inbox titles, list item bodies, date strings) — verified by Phase 6 integration test.
- `ANTHROPIC_API_KEY` not logged at INFO or above — Founding Engineer confirms via code review.
- `ANTHROPIC_API_KEY` not returned in any API response — enforced by existing route structure (key never touches the response path).
- `ANTHROPIC_API_KEY` not stored in the database — no database schema change in this plan.

### Regression
- All 50+ existing API tests pass without `ANTHROPIC_API_KEY` set.
- `generate-ritual-summary` route continues to return valid `RitualSummaryResponse` for all error states — no 500 from the route regardless of provider state.

---

## Risks and Mitigations

### 1. First-use 401 on invalid API key

**Risk:** If `ANTHROPIC_API_KEY` is set but invalid, the first real ritual review will return null drafts silently. The operator may not immediately know the key is wrong.

**Mitigation:** The catch block in `generateSection` can log the error at WARN level (without logging the key value): `log.warn('ClaudeAiProvider: SDK call failed', { error: err.message })`. This produces a visible warning in server logs on first failure. The Founding Engineer should add this logging to the catch block.

### 2. SDK version drift

**Risk:** Anthropic SDK updates could change retry semantics, `AbortSignal` behavior, or response shape.

**Mitigation:** Pin the SDK version in `package.json`. Update only deliberately. The `max_tokens` and model name should also be pinned as constants in the class (not dynamic).

### 3. Test mock fragility

**Risk:** Mocking `@anthropic-ai/sdk` at the module level may become fragile if the SDK's export shape changes.

**Mitigation:** Use Vitest's `vi.mock` with a factory that returns the minimal interface needed (`messages.create`). If the SDK is injectable via constructor, prefer constructor injection over module mocking — it is more robust to SDK changes.

### 4. Latency in CI with real provider

**Risk:** Accidental use of a real API key in CI would cause latency, cost, and flaky tests.

**Mitigation:** All tests mock the SDK. The `createAiProvider` factory in test helpers should always be called with `undefined` or empty string to guarantee `DisabledAiProvider` is selected. CI environment must not set `ANTHROPIC_API_KEY`.

---

## Handoff Notes

- This plan is scoped entirely to `apps/api/src/ai.ts` and `apps/api/src/app.ts`. No other files change.
- After implementation, assign back to VP of Product for review, then CEO for M21 milestone gate advancement.
- Once M21 is complete, the next H5 Phase 2 target per D-042 is push notifications for proactive household nudges.
- Prompt quality refinement is an expected Phase 2 follow-on. The first real prompt may feel generic. The edit affordance in the review flow is the in-flow mitigation. Household validation (draft acceptance rate vs. placeholder baseline) is the signal to watch.
