# Feature Spec: Chat Interface

## Status
- Draft

## Summary
- Olivia has a chat UI prototype but no backend wiring — all messages are hardcoded. This spec defines the conversational interface as a household-aware assistant channel layered on top of existing domain capabilities. The chat lets users ask Olivia about household state, request summaries, and draft changes (tasks, reminders, list items, meals, routines) through natural language — with every proposed change requiring explicit confirmation before execution. If this feature works well, the household gains a faster, more flexible way to interact with Olivia's coordination layer without navigating individual workflow screens.

## User Problem
- The current PWA surfaces household state through structured screens (inbox, reminders, lists, routines, meals, weekly view). Each workflow has its own navigation path, which is effective for focused review but creates friction for quick, cross-cutting interactions.
- A user who wants to ask "what's on my plate this week?" must mentally assemble state from multiple screens. A user who wants to add a reminder while thinking about a grocery item must navigate away from the current context.
- The chat interface addresses this by providing a single conversational surface where Olivia can read across all household state, answer questions, and draft changes — without replacing the structured screens that remain better for focused workflow management.

## Target Users
- Primary user: stakeholder, as the primary operator who creates and manages household state.
- Secondary user: spouse, with the same read-only chat access they have across other workflows in the current model.
- Future users: multi-user chat with per-member context is not a target in this phase.

## Desired Outcome
- The household has a conversational entry point that makes quick questions and cross-cutting interactions faster than navigating individual screens.
- Users can ask Olivia about household state and get accurate, contextual answers grounded in real data.
- Users can ask Olivia to create tasks, set reminders, add list items, plan meals, or manage routines — with a preview-and-confirm step before any change is committed.
- The conversation feels like talking to a calm, knowledgeable household coordinator — not a generic chatbot or a novelty feature.
- Chat complements the structured screens rather than replacing them.

## In Scope
- Single-thread conversation model: one ongoing conversation per household, not multi-session or multi-topic threads.
- Sending a user message and receiving an Olivia response.
- Context assembly: injecting relevant household state into the LLM prompt so Olivia can answer questions about real data.
- Read capabilities: Olivia can read and summarize inbox items, reminders, routines, shared lists, meal plans, weekly view, and activity history.
- Draft capabilities: Olivia can propose creating or updating inbox items, reminders, list items, meal plan entries, and routine occurrences — surfaced as draft action cards the user must confirm or dismiss.
- Quick suggestion chips: contextual conversation starters derived from actual household state.
- System prompt with brand voice guidelines, trust model guardrails, and capability boundaries.
- Conversation persistence in the local SQLite store so the conversation survives app restarts.
- Conversation clear: user can reset the conversation history.
- Offline-tolerant message display: previously loaded messages remain visible when offline; sending new messages requires connectivity (because the LLM call is external).
- Streaming response display: Olivia's replies stream in progressively with a typing indicator.

## Boundaries, Gaps, And Future Direction
- Not handled in this spec:
  - Multi-session or multi-topic conversation threads. The conversation is a single rolling thread.
  - Spouse write access through chat. The spouse can read the chat but cannot send messages in this phase.
  - Voice input or output.
  - Proactive Olivia-initiated messages (Olivia only responds to user messages; proactive nudges remain in the nudge surface).
  - File attachments, images, or rich media in messages.
  - Chat-based notifications or push alerts for new Olivia messages.
  - Conversation search or message bookmarking.
  - Multi-device conversation sync beyond what the existing sync model provides.
  - Chat message editing or deletion of individual messages.
  - Rate limiting or usage metering UI (handled at the infrastructure level).
- Known gaps acceptable for this phase:
  - Conversation history may grow unbounded; no automatic summarization or truncation strategy is built in Phase 1. Token window management handles the LLM context limit, but old messages remain in storage.
  - Draft action cards in chat are functionally equivalent to the existing preview/confirm flow but presented inline. There is no batch-draft capability.
  - Quick chips are generated from a deterministic scan of household state, not from LLM inference. This keeps chip generation fast and offline-capable.
- Likely future direction:
  - Conversation summarization to compress long histories for the LLM context window.
  - Proactive Olivia messages triggered by household events (natural extension of the nudge system into chat).
  - Spouse write access to chat once multi-user chat is scoped.
  - Richer tool-use patterns where Olivia can chain multiple reads or drafts in a single response.
  - Voice input as an alternative capture mode.

## Workflow

### Primary workflow: ask Olivia a question
1. User navigates to the `/olivia` chat screen.
2. User types a question (e.g., "What reminders do I have this week?").
3. User taps Send or presses Enter.
4. System sends the message to the chat API endpoint.
5. The API assembles household context relevant to the message, constructs the LLM prompt with system instructions and conversation history, and streams the response.
6. Olivia's response streams into the chat as a message bubble with a typing indicator.
7. The response references real household data (e.g., lists specific reminders with their due dates).
8. Both the user message and Olivia's response are persisted to the conversation store.

### Primary workflow: draft a change through chat
1. User types a request (e.g., "Add milk and eggs to the grocery list").
2. Olivia responds with a confirmation message and a draft action card showing the proposed changes (e.g., two new list items on the "Grocery" list).
3. User reviews the draft action card. Two options:
   - **Confirm**: the system executes the change through the existing domain write path (same as the structured UI).
   - **Dismiss**: the draft is discarded; Olivia acknowledges and the conversation continues.
4. If confirmed, Olivia posts a follow-up message confirming the change was applied.
5. If the user's request is ambiguous (e.g., "add to the list" but multiple lists exist), Olivia asks a clarifying question instead of guessing.

### Primary workflow: clear conversation
1. User taps the "Clear conversation" action in the chat header or settings.
2. System shows a confirmation prompt (destructive action).
3. On confirmation, all conversation messages are deleted from the local store.
4. The chat screen resets to the empty state with fresh quick chips.

### Secondary workflow: quick chip interaction
1. On load, the chat screen displays contextual quick chips based on current household state.
2. User taps a chip (e.g., "What's due today?").
3. The chip text is sent as if the user had typed it. The standard question workflow follows.
4. Quick chips refresh after each Olivia response to reflect updated context.

## Behavior

### What Olivia can do in chat
- **Read state**: query and summarize any household data — inbox items, reminders, routines, shared lists, meal plans, weekly view, activity history.
- **Summarize**: provide cross-workflow summaries ("What's my week look like?" draws from all workflow types).
- **Draft changes**: propose creating inbox items, reminders, list items, meal entries, and routine skip/complete actions. All drafts surface as action cards requiring explicit confirmation.
- **Answer questions**: respond to household-related questions using available data as context.
- **Clarify**: ask follow-up questions when the user's intent is ambiguous rather than guessing.

### What Olivia cannot do in chat
- **Auto-execute**: never commit a change without the user confirming the draft action card.
- **Send external messages**: no email, SMS, or notification sending through chat.
- **Modify without confirmation**: no direct writes to any domain entity from chat. All mutations flow through the existing preview/confirm pattern.
- **Access external data**: Olivia only references household data available through existing API endpoints. No web search, no external API calls.
- **Initiate conversation**: Olivia does not send unsolicited messages. Chat is user-initiated only.

### What Olivia does when uncertain
- States uncertainty explicitly rather than fabricating household data.
- Asks clarifying questions when the request maps to multiple possible actions.
- Declines gracefully when asked about topics outside household scope, steering back to what it can help with.

## Data And Memory

### Conversation storage
- **Conversations table**: `conversations` — id, householdId, createdAt, updatedAt. One active conversation per household.
- **Messages table**: `conversation_messages` — id, conversationId, role (user | assistant), content (text), toolCalls (JSON, nullable — stores draft action card data), createdAt.
- Both tables in the canonical SQLite store, consistent with the existing persistence model.
- Conversation data is household-owned and local. No conversation content is stored externally beyond the transient LLM API call.

### Context assembly
- The system assembles a household context snapshot before each LLM call. This snapshot includes:
  - Active inbox items (open, in_progress) — title, status, owner, due state
  - Active reminders (upcoming, due, overdue, snoozed) — title, scheduledAt, state, owner
  - Active routines — title, recurrence rule, current due state, owner
  - Active shared lists with their items — list title, item text, checked state
  - Current meal plan entries for the week — meal name, date
  - Today's date and day of week for temporal grounding
- The context snapshot is assembled from existing API/repository queries. No new data sources are introduced.
- Context is pruned to fit within the LLM token budget. Priority order for pruning: activity history (omit first), meal plan details, list item details, routine details, reminder details, inbox item details. Active counts are always included even when details are pruned.

### Transient versus durable
- Conversation messages are durable (persisted in SQLite, survive app restarts).
- The assembled household context snapshot is transient (rebuilt for each LLM call, not stored).
- Draft action card state is transient UI state until confirmed, at which point the domain write is durable through the existing persistence path.

## Permissions And Trust Model
- The chat feature operates under the same **advisory-only** trust model as all other Olivia capabilities.
- **Agentic actions** (Olivia proposes → user confirms):
  - All draft changes proposed by Olivia in chat: creating inbox items, reminders, list items, meal entries, routine completions/skips. Every proposed change surfaces as a draft action card that requires explicit user confirmation.
- **User-initiated actions** (execute immediately, non-destructive):
  - Sending a chat message.
  - Tapping a quick chip.
- **Destructive actions** (always confirm regardless of initiator):
  - Clearing conversation history.
- **Olivia must never**:
  - Commit any domain change without the user confirming the draft action card.
  - Send messages or notifications to external systems.
  - Store conversation content outside the household-controlled local store (beyond the transient LLM API call).
  - Claim to have done something it has not actually done.
  - Fabricate household data it does not have.

## AI Role

### Where AI adds value
- **Natural language understanding**: interpreting user intent from conversational input and mapping it to household operations.
- **Contextual responses**: generating helpful, grounded answers by reasoning over assembled household state.
- **Draft generation**: translating natural language requests into structured draft data (e.g., "remind me to call the dentist Friday" → reminder draft with title and scheduledAt).
- **Summarization**: composing cross-workflow summaries that would require visiting multiple screens.
- **Conversational flow**: maintaining coherent multi-turn dialogue, asking clarifying questions, and steering gracefully.

### When AI is unavailable
- The chat input is disabled with a clear message: "Olivia is unavailable right now. You can still use the app to manage your household."
- Previously loaded conversation messages remain visible.
- Quick chips are still generated (they are deterministic, not AI-dependent).
- All structured screens and workflows continue to function normally.
- No silent failure: the user always knows when AI is not available.

### What must not depend on AI
- Domain writes: all mutations go through deterministic domain validation, identical to the structured UI path. The AI proposes; domain services validate and execute.
- Conversation storage: message persistence is a straightforward database write, not AI-dependent.
- Quick chip generation: driven by deterministic household state queries, not LLM inference.

## API Contracts

### POST /api/chat/messages
Send a user message and receive Olivia's response.

**Request:**
```json
{
  "content": "string (user message text, required, max 2000 characters)"
}
```

**Response (streamed via Server-Sent Events):**
```
event: text
data: {"delta": "string (partial response text)"}

event: tool_call
data: {"toolCall": { "id": "string", "type": "string (create_inbox_item | create_reminder | add_list_item | create_meal_entry | complete_routine | skip_routine)", "data": { ... draft payload matching existing preview schemas ... } }}

event: done
data: {"messageId": "string", "conversationId": "string"}
```

The `tool_call` event carries draft action card data. The frontend renders this as an inline action card. The `type` field maps to an existing domain operation, and `data` contains the draft payload in the same shape as the corresponding `preview-create` response.

**Errors:**
- `503 Service Unavailable` — AI provider is unavailable.
- `429 Too Many Requests` — rate limit exceeded.
- `400 Bad Request` — empty or oversized message content.

### GET /api/chat/conversation
Retrieve the current conversation history.

**Query params:**
- `limit` (optional, default 50): number of most recent messages to return.
- `before` (optional): cursor for pagination (message ID).

**Response:**
```json
{
  "conversationId": "string",
  "messages": [
    {
      "id": "string",
      "role": "user | assistant",
      "content": "string",
      "toolCalls": [ { "id": "string", "type": "string", "data": { ... }, "status": "pending | confirmed | dismissed" } ] | null,
      "createdAt": "ISO 8601 timestamp"
    }
  ],
  "hasMore": "boolean"
}
```

### POST /api/chat/conversation/clear
Clear the conversation history.

**Request:** empty body.

**Response:**
```json
{ "cleared": true }
```

### POST /api/chat/actions/{toolCallId}/confirm
Confirm a draft action card from chat, executing the proposed change.

**Request:** empty body (the draft data was already captured in the tool call).

**Response:**
```json
{
  "result": { ... domain entity created/updated, matching existing confirm response schemas ... }
}
```

### POST /api/chat/actions/{toolCallId}/dismiss
Dismiss a draft action card without executing.

**Request:** empty body.

**Response:**
```json
{ "dismissed": true }
```

## System Prompt Guidelines

The system prompt sent to the LLM with each request establishes Olivia's behavior in chat. It must encode:

### Identity and voice
- You are Olivia, a household command center assistant.
- Speak in a calm, steady, present tone. Be warm but not performative.
- Be clear, not clever. No puns, jokes, or personality quirks.
- Be supportive, not sycophantic. Do not praise the user for basic tasks.
- Keep responses concise and grounded in household data.

### Capability boundaries
- You can read and summarize household state: inbox items, reminders, routines, shared lists, meal plans, and the weekly view.
- You can propose changes by calling tools. Every proposed change will be shown to the user as a draft for confirmation — you never execute changes directly.
- You cannot send messages, access external services, or take actions outside the household data you have been given.
- When you do not have enough information to answer, say so. Do not fabricate data.

### Behavioral rules
- When the user's request is ambiguous, ask a clarifying question rather than guessing.
- When referencing household data, be specific (use titles, dates, names from the context).
- Do not volunteer information the user did not ask about unless it is directly relevant.
- Do not generate long lists unprompted. Summarize and offer to detail.
- Steer off-topic requests back to household management gracefully.
- Never claim to have done something you have not done. Proposed changes are drafts until confirmed.

### Tool use rules
- Use the provided tools to propose changes when the user asks to create, update, or modify household items.
- Each tool call generates a draft action card. Do not describe the draft in prose — the card is the interface.
- If you need to create multiple items, make multiple tool calls. Each gets its own confirmation.
- After calling a tool, briefly acknowledge what you proposed and let the action card speak for itself.

## Quick Chips Strategy

Quick chips are contextual conversation starters displayed below the chat input when the conversation is empty or after an Olivia response.

### Generation rules (deterministic, not AI-driven)
- Scan current household state and generate up to 4 chips from the following priority-ordered categories:
  1. **Overdue items**: if any reminders are overdue or routines are past due → "What's overdue?"
  2. **Today's schedule**: if the weekly view has items for today → "What's on for today?"
  3. **Due soon**: if reminders or routines are due within 48 hours → "What's coming up?"
  4. **Active lists**: if any shared lists have unchecked items → "What's on [list name]?"
  5. **This week**: always available as a fallback → "How's my week looking?"
  6. **Meal plan**: if a meal plan exists for the current week → "What's for dinner tonight?"
- Chips are generated client-side from cached household state (works offline for display, though sending requires connectivity).
- After each Olivia response, chips refresh based on any state that may have changed.

## Risks And Failure Modes
- **Hallucinated household data**: Olivia references items that do not exist. Mitigated by grounding every response in the assembled context snapshot and instructing the LLM to only reference provided data.
- **Stale context**: the context snapshot assembled at request time may not reflect changes made seconds before. Acceptable for Phase 1; the snapshot is consistent within a single request.
- **Token budget exceeded**: if the household has extensive data, the context may not fit the LLM token window. Mitigated by the prioritized pruning strategy and by including counts even when details are pruned.
- **LLM latency**: slow responses degrade the conversational feel. Mitigated by streaming and a typing indicator.
- **Provider outage**: the external AI provider becomes unavailable. Mitigated by clear unavailability messaging and zero impact on structured workflows.
- **Ambiguous draft intent**: the user asks for something that maps to multiple possible actions. Mitigated by instructing Olivia to ask clarifying questions rather than guess.
- **Draft confirmation confusion**: user is unsure whether a draft was confirmed or just proposed. Mitigated by explicit visual state on action cards (pending → confirmed/dismissed) and a follow-up message on confirmation.

## UX Notes
- The chat should feel like a fast, focused assistant conversation — not a slow, loading-heavy AI experience.
- Streaming responses are essential. A blank wait followed by a wall of text feels worse than progressive reveal.
- Draft action cards should be visually distinct from message bubbles — they are interactive, not just text.
- The empty state should be inviting, not blank. Quick chips and a brief greeting (not conversation — just orientation) help the user know what to do.
- The chat should never feel like Olivia is trying to keep the user in conversation. Short, complete answers are better than verbose ones.
- Error states (provider unavailable, rate limited) should be calm and clear, consistent with brand voice. No alarm language.

## Acceptance Criteria
1. A user can send a text message and receive a streamed Olivia response grounded in real household data.
2. Olivia can accurately reference specific inbox items, reminders, routines, shared lists, and meal plan entries by name and date when answering questions.
3. A user can ask Olivia to create an inbox item, and a draft action card appears in the conversation for confirmation.
4. A user can ask Olivia to set a reminder, and a draft action card appears with the correct title and scheduled time.
5. A user can ask Olivia to add items to a shared list, and a draft action card appears for each item (or a batch card).
6. Confirming a draft action card executes the domain write through the existing preview/confirm path and persists the result.
7. Dismissing a draft action card discards the draft and the conversation continues normally.
8. Conversation history persists across app restarts (stored in SQLite).
9. Clearing the conversation deletes all messages and resets to the empty state with fresh chips.
10. Quick chips reflect real household state (overdue items, today's schedule, upcoming items, active lists).
11. When the AI provider is unavailable, the chat input is disabled with a clear message and all other app workflows remain functional.
12. Olivia never fabricates household data. When data is unavailable, she says so.
13. Olivia asks clarifying questions when a request is ambiguous rather than guessing.
14. Olivia's responses follow brand voice guidelines: calm, clear, supportive, not sycophantic or clever.
15. The advisory-only trust model is enforced: no domain changes occur without explicit user confirmation of a draft action card.

## Validation And Testing

### Unit tests
- Context assembly: verify that the correct household data is included in the LLM context snapshot for various household states (empty, full, pruned).
- System prompt construction: verify that the system prompt includes all required behavioral instructions and current household context.
- Quick chip generation: verify chips are generated correctly from household state (overdue, due soon, today's items, active lists).
- Tool call parsing: verify that LLM tool call responses are correctly mapped to draft action card data.
- Draft confirmation: verify that confirming a tool call invokes the correct domain write path with the correct payload.

### Integration tests
- End-to-end message flow: send a message, verify the conversation is persisted, verify the response references real household data.
- Draft-to-confirm flow: send a request that triggers a tool call, confirm the draft, verify the domain entity was created.
- Draft-to-dismiss flow: send a request that triggers a tool call, dismiss the draft, verify no domain change occurred.
- Conversation clear: clear a conversation with messages, verify all messages are deleted.
- Provider unavailability: simulate AI provider failure, verify the user sees a clear unavailability message.

### Manual validation
- Conversational quality: Olivia's responses feel natural, grounded, and aligned with brand voice.
- Cross-workflow questions: asking "what's my week look like?" produces a coherent summary drawing from all workflow types.
- Edge cases: very long messages, rapid successive messages, household with no data, household with extensive data.

## Dependencies And Related Learnings
- `docs/vision/product-ethos.md` — advisory-only trust model and behavioral guidance. Chat must enforce the same boundaries.
- `docs/brand/03-tone-of-voice.md` — voice guidelines that inform the system prompt.
- `docs/strategy/system-architecture.md` — AI adapter boundary (D-008), deterministic core principle, local-first persistence.
- `docs/roadmap/roadmap.md` — chat fits within the active H5 Phase 3 direction; complements rather than replaces existing structured workflows.
- D-008: AI access behind an internal adapter boundary. Chat extends the existing `AiProvider` interface.
- D-044: `ClaudeAiProvider` is already built and operational for ritual summaries. Chat adds a new method to this provider.
- L-023: Advisory-only AI integrates as a strictly additive layer. Chat follows the same pattern.
- Existing preview/confirm pattern across inbox, reminders, lists, meals, and routines. Chat draft action cards reuse this pattern.

## Open Questions
1. **Token budget allocation**: what is the right split between conversation history and household context in the LLM token window? Should conversation history be truncated to a fixed number of recent messages (e.g., last 20), or should it be dynamically sized based on context needs?
2. **Conversation retention policy**: should old conversations be automatically archived or summarized after a certain age or length, or should this be purely user-managed via clear?
3. **Batch drafts**: when a user says "add milk, eggs, and bread to the grocery list," should Olivia produce one batch action card or three individual cards? Batch is simpler UX but requires a batch-create API path.
4. **Actor role in chat**: should the chat message include the actor role (stakeholder/spouse), or is it always assumed to be the stakeholder since spouse write access is deferred?
5. **Streaming provider compatibility**: does the current `ClaudeAiProvider` support streaming responses, or does a new streaming method need to be added to the `AiProvider` interface?

## Facts, Assumptions, And Decisions

### Facts
- A chat UI prototype exists at `/olivia` (OliviaView.tsx) with message bubbles, quick chips, and draft action cards — but all content is hardcoded.
- The `AiProvider` interface exists with `ClaudeAiProvider` delivering real Claude Haiku content for ritual summaries.
- The preview/confirm pattern is established across all domain workflows and can be reused for chat draft actions.
- All household data is queryable through existing repository functions.
- The system uses SQLite for canonical storage with Drizzle ORM.

### Assumptions
- A single-thread conversation model is sufficient for household chat in Phase 1. Users do not need topic-based threading yet.
- The LLM can produce useful, grounded responses when given a structured household context snapshot. The prompt engineering required is tractable.
- Streaming responses via SSE are supported by the current Fastify infrastructure or can be added without significant rework.
- Quick chip generation from deterministic state queries provides enough conversational entry-point value without needing LLM-generated suggestions.
- Chat message volume per household will be low enough that unbounded conversation storage is acceptable in Phase 1.

### Decisions
- D-CHAT-01: Single rolling conversation thread, not multi-session. Simpler model, lower storage complexity, and consistent with the "one household, one Olivia" mental model.
- D-CHAT-02: Context assembly at request time using existing repository queries, not a pre-built context cache. Avoids cache staleness and keeps the implementation simple.
- D-CHAT-03: Quick chips are deterministic, not LLM-generated. This keeps them fast, offline-capable, and predictable.
- D-CHAT-04: Draft action cards reuse existing preview/confirm domain paths. No separate "chat write" path — all mutations go through the same validation.
- D-CHAT-05: Conversation stored in canonical SQLite, not IndexedDB-only. Consistent with the household-owned data principle and enables future multi-device sync.

## Deferred Decisions
- Conversation summarization strategy for long-running conversations (relevant when token limits become a practical constraint).
- Spouse write access to chat and per-member conversation context.
- Proactive Olivia-initiated messages in the chat surface.
- Voice input integration.
- Chat message search or export.
- Exact LLM model selection and cost optimization strategy for chat (may differ from the ritual summary model).
