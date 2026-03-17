---
title: "Olivia — Chat UX: Interaction Design Spec"
subtitle: "Streaming states, empty states, errors, action cards, context indicators, and conversation management"
date: "March 2025"
status: "Design handoff for agentic implementation"
---

# Olivia — Chat UX
## Interaction Design Spec
*Streaming states, empty states, errors, action cards, context, and conversation management*

*March 2025 · Design handoff for agentic implementation*

---

> **Scope of this document**
>
> This spec defines every UX state and interaction pattern required to implement the Olivia chat interface for real conversational use. The UI prototype (OliviaView.tsx) already exists with message bubbles, quick chips, and draft action cards. This document covers the interaction design layer on top of that visual foundation.
>
> Covers: streaming response states, empty state, error states, action card patterns, context indicators, conversation management, quick chip generation strategy, and all edge cases.
>
> Does **not** cover: backend API contracts, LLM prompt design, or data storage strategy (see OLI-98 feature spec for those).

---

## 1. Design System Constraints

All chat UI must strictly conform to the Olivia design system. No new tokens may be introduced. Key constraints from design-foundations.md are summarized below.

### 1.1 Typography in Chat

| **Role** | **Font** | **Size** | **Weight** | **Usage in Chat** |
|---|---|---|---|---|
| Header title | Fraunces | 22px | 700 | "Olivia" in header |
| Header subtitle | Plus Jakarta Sans | 12px | 400 | "Your household assistant · always here" |
| Olivia message text | Fraunces italic | 14px | 300 | All Olivia response bubbles |
| User message text | Plus Jakarta Sans | 14px | 400 | All user message bubbles |
| Message label | Plus Jakarta Sans | 10px | 700 | "OLIVIA" / "YOU" above bubbles, uppercase, letter-spacing 0.8px |
| Action card label | Plus Jakarta Sans | 10px | 700 | "DRAFT MESSAGE", "NEW TASK", etc., uppercase |
| Action card preview | Fraunces italic | 13px | 300 | Draft content within action cards |
| Quick chip text | Plus Jakarta Sans | 12px | 600 | Suggestion chip labels |
| Typing indicator | Plus Jakarta Sans | 12px | 500 | "Olivia is thinking..." |
| Context badge | Plus Jakarta Sans | 10px | 600 | "Based on your inbox" context labels |
| Date separator | Plus Jakarta Sans | 10px | 700 | "TODAY", "YESTERDAY", uppercase, letter-spacing 1.2px |
| Empty state heading | Fraunces | 19px | 700 | Welcome title in empty state |
| Empty state body | Fraunces italic | 15px | 300 | Welcome message text |
| Error message | Plus Jakarta Sans | 13px | 500 | Inline error text |
| Timestamp | Plus Jakarta Sans | 10px | 400 | Message timestamps |

### 1.2 Color Token Usage

| **Visual Purpose** | **Token** | **Light** | **Dark** |
|---|---|---|---|
| Chat background | --bg | #FAF8FF | #12101C |
| Olivia bubble bg | --surface | #FFFFFF | #1C1A2E |
| User bubble bg | --violet → --violet-2 gradient | #6C5CE7 → #8B7FF5 | #6C5CE7 → #9D93F7 |
| Olivia bubble border | --ink-4 | rgba(26,16,51,0.15) | rgba(237,233,255,0.1) |
| Action card bg | --surface | #FFFFFF | #1C1A2E |
| Action card border | --lavender-mid | #D4CCFF | #3D3660 |
| Action card preview bg | --lavender-soft | #EDE9FF | #2A2545 |
| Quick chip bg | --surface | #FFFFFF | #1C1A2E |
| Quick chip border | --ink-4 | rgba(26,16,51,0.15) | rgba(237,233,255,0.1) |
| Quick chip hover bg | --lavender-soft | #EDE9FF | #2A2545 |
| Typing indicator dots | --violet | #6C5CE7 | #6C5CE7 |
| Context badge bg | --violet-dim | rgba(108,92,231,0.1) | rgba(108,92,231,0.18) |
| Context badge text | --violet | #6C5CE7 | #6C5CE7 |
| Error bg | --rose-soft | #FFE8F2 | #3A1828 |
| Error text | --rose | #FF7EB3 | #FF7EB3 |
| Error icon | --rose | #FF7EB3 | #FF7EB3 |
| Date separator line | --ink-4 | rgba(26,16,51,0.15) | rgba(237,233,255,0.1) |
| Date separator text | --ink-3 | rgba(26,16,51,0.3) | rgba(237,233,255,0.35) |
| Empty state text | --ink-2 | rgba(26,16,51,0.55) | rgba(237,233,255,0.6) |
| Success confirmation bg | --mint-soft | #E0FFF9 | #0A2820 |
| Success confirmation text | --mint | #00C9A7 | #00C9A7 |

### 1.3 Border Radius Reference

| **Element** | **Radius** |
|---|---|
| Olivia message bubble | 4px 20px 20px 20px |
| User message bubble | 20px 4px 20px 20px |
| Action card (within bubble) | 16px |
| Action card preview block | 10px |
| Quick chips | 20px (fully rounded) |
| Chat input bar | 20px |
| Send button | 12px |
| Typing indicator container | 4px 20px 20px 20px (same as Olivia bubble) |
| Context badge pill | 20px |
| Date separator pill | 20px |
| Error banner | 14px |
| Confirmation banner | 14px |

---

## 2. Streaming Response States

When Olivia processes a user message, her response goes through distinct visual phases. These must feel like she is thinking and then speaking — not like a loading spinner.

### 2.1 Phase 1 — Thinking (0–900ms typical)

After the user sends a message, Olivia's "thinking" state appears.

**Typing indicator component:**
- Appears as a new Olivia message bubble (left-aligned, same position as a normal response)
- Contains three animated dots in a row
- Bubble: `background: var(--surface)`, `border: 1.5px solid var(--ink-4)`, same radius as Olivia bubble
- Dots: 6px circles, `background: var(--violet)`, spaced 6px apart
- Animation: sequential bounce, each dot offset by 150ms

```css
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 14px 18px;
}

.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--violet);
  animation: typingBounce 1.2s ease infinite;
}

.typing-dot:nth-child(2) { animation-delay: 0.15s; }
.typing-dot:nth-child(3) { animation-delay: 0.30s; }

@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}
```

**Orb animation intensification:**
- While Olivia is thinking, the orb pulse speed increases from 3s to 1.5s
- The orb shadow strengthens: add a class `.orb-active` that overrides `orbPulse` duration
- When response completes, ease back to 3s over 500ms

```css
.olivia-orb.orb-active {
  animation-duration: 1.5s;
}
```

**Label text:**
- Above the typing indicator bubble, the label reads "OLIVIA" (same as normal messages)
- No additional "thinking" or "typing" text in the label — the dots communicate it

### 2.2 Phase 2 — Streaming Text

Once text begins arriving from the LLM:

- The typing indicator bubble is **replaced in place** by the Olivia message bubble
- Text appears word-by-word or chunk-by-chunk as it streams in
- Use `opacity: 1` for revealed text — no character-by-character fade, which would be distracting
- The bubble grows in height naturally as text flows in; the chat area auto-scrolls to keep the latest text visible
- Font and styling are identical to a completed Olivia message (Fraunces italic, 14px, 300)

**Cursor indicator during streaming:**
- A small blinking violet bar appears at the end of the last streamed word
- `width: 2px`, `height: 14px`, `background: var(--violet)`, `animation: blink 1s infinite`
- Removed when streaming completes

```css
.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 14px;
  background: var(--violet);
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 1s infinite;
}
```

### 2.3 Phase 3 — Complete

When the full response is received:

- Streaming cursor is removed
- If the response includes an action card, the card animates in below the text using `popIn` (200ms, cubic-bezier(0.22,1,0.36,1))
- Orb returns to normal pulse speed (3s)
- Quick chips may update if the response changes relevant household context

### 2.4 Streaming Interruption

If the user sends a new message while Olivia is still streaming:

- Current streaming response completes visually where it is (truncated is fine)
- No "interrupted" label or visual treatment — the conversation just continues
- Olivia's new response begins its own thinking → streaming cycle

---

## 3. Empty State

### 3.1 First Visit / Fresh Conversation

When the chat has no messages (first visit or after clearing):

**Layout:**
- Centered vertically in the chat area (flexbox, `align-items: center`, `justify-content: center`)
- The Olivia orb is shown larger: 56px diameter, centered above the text
- Orb pulses normally

**Content:**
- Heading: "What can I help with?" — Fraunces 19px/700, `color: var(--ink)`
- Body: "I can check on your household, help plan your week, draft messages, or just keep track of things." — Fraunces italic 15px/300, `color: var(--ink-2)`, `line-height: 1.5`, max-width 280px, centered
- No illustration or emoji — the orb is the visual anchor

**Quick chips are always visible in the empty state** — they serve as suggested conversation starters. See Section 7 for chip content strategy.

### 3.2 Returning User (Conversation Exists)

When the user returns and a previous conversation exists:

- Messages load from storage and display immediately
- No empty state shown
- Auto-scroll to the most recent message
- Quick chips are **hidden** if the conversation has 4+ messages

---

## 4. Error States

Errors must feel calm and recoverable — never alarming. Olivia's brand is steady and reliable. An error should feel like "let me try that again" not "something went wrong."

### 4.1 Network Failure

When the device is offline or the API request fails due to network issues:

**Presentation:** An inline error message appears in the chat as an Olivia-style bubble (left-aligned), but with error styling:

```css
.msg-error .msg-bubble {
  background: var(--rose-soft);
  color: var(--ink);
  border: 1.5px solid var(--rose);
  border-radius: 4px 20px 20px 20px;
  padding: 13px 16px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  line-height: 1.5;
}
```

**Copy:** "I couldn't reach the server just now. Your message is saved — I'll try again when the connection is back."

**Retry behavior:**
- A "Retry" text button appears below the error bubble: `color: var(--violet)`, `font-size: 12px`, `font-weight: 600`
- Tapping retries the last user message
- If connection is restored, auto-retry once silently (no user action needed)
- The error bubble is **replaced** by Olivia's actual response when the retry succeeds

### 4.2 LLM Timeout

When the AI model takes too long to respond (>15s):

**Presentation:** Same error bubble style as network failure.

**Copy:** "I'm taking longer than usual to think this through. Give me another moment, or try asking in a different way."

**Behavior:**
- Show the typing indicator for the first 15 seconds (normal)
- At 15s, replace the typing indicator with the timeout message
- Include a "Try again" button (same style as Retry)
- The user can also just send a new message, which implicitly abandons the timed-out request

### 4.3 Rate Limiting

When the user hits a rate limit:

**Copy:** "I need a brief pause — too many messages in a short time. I'll be ready again in a moment."

**Behavior:**
- Same error bubble style
- Input bar becomes temporarily disabled: `opacity: 0.5`, `pointer-events: none`
- After the rate limit window passes (show a subtle countdown in the input placeholder: "Ready in 30s..."), re-enable the input bar
- No retry button needed — the user simply waits and sends again

### 4.4 General / Unknown Error

**Copy:** "Something unexpected happened on my end. Try sending your message again."

**Behavior:** Same as network failure with Retry button.

### 4.5 Error Design Rules

- **Never use red backgrounds.** Use `--rose-soft` (light pink / deep rose in dark mode) which maintains warmth.
- **Never use technical language.** No "500 Internal Server Error" or "Request failed."
- **Always in first person.** "I couldn't" not "The system was unable to."
- **Error bubbles do not use Fraunces italic** — they use Plus Jakarta Sans to distinguish them from Olivia's conversational voice. Errors are system/UI messages, not Olivia speaking.
- **Error bubbles animate in** with the same `msgIn` animation as normal messages.

---

## 5. Action Card Patterns

Action cards appear within Olivia's message bubbles when she drafts a change or suggests a concrete action. They are the primary mechanism for the advisory-only trust model in conversation.

### 5.1 Card Types

| **Card Type** | **Label** | **When Shown** | **Preview Content** |
|---|---|---|---|
| Draft message | DRAFT MESSAGE | Olivia composes a message for the user | Full message text in preview block |
| New task | NEW TASK | Olivia suggests creating a task | Task title + optional due date + assignee |
| New reminder | NEW REMINDER | Olivia suggests setting a reminder | Reminder title + scheduled time |
| List item | LIST ITEM | Olivia suggests adding to a shared list | Item name + target list name |
| Summary | SUMMARY | Olivia compiles a household summary | Bullet-point summary text |

### 5.2 Card Anatomy (All Types)

```
┌─────────────────────────────────────────┐
│  LABEL TEXT                         ← 10px/700 uppercase, --violet-2     │
│                                                                           │
│  ┌─────────────────────────────────┐                                      │
│  │  Preview content block          │  ← Fraunces italic 13px,            │
│  │  (the drafted content)          │    --lavender-soft bg,              │
│  │                                 │    3px left border --violet          │
│  └─────────────────────────────────┘                                      │
│                                                                           │
│  [ Primary action ]  [ Secondary action ]  ← Two buttons side by side    │
└─────────────────────────────────────────┘
```

- Container: `background: var(--surface)`, `border: 1.5px solid var(--lavender-mid)`, `border-radius: 16px`, `padding: 14px 16px`, `margin-top: 8px`
- Shadow: `var(--shadow-sm)`
- Preview block: `background: var(--lavender-soft)`, `border-left: 3px solid var(--violet)`, `border-radius: 10px`, `padding: 10px 12px`

### 5.3 Action Buttons per Card Type

| **Card Type** | **Primary Button** | **Secondary Button** |
|---|---|---|
| Draft message | "Send it" | "Edit first" |
| New task | "Add task" | "Edit first" |
| New reminder | "Set reminder" | "Edit first" |
| List item | "Add to list" | "Skip" |
| Summary | (no primary) | "Got it" (dismiss only) |

**Button styles:**
- Primary: `background: var(--violet)`, `color: white`, `box-shadow: 0 3px 10px rgba(108,92,231,0.2)`
- Secondary: `background: var(--lavender-soft)`, `color: var(--violet)`
- Both: `border-radius: 12px`, `padding: 9px`, `font-size: 12px`, `font-weight: 700`, `min-height: 36px`, `flex: 1`

**Button copy rules:**
- Primary button is always a verb. Never "OK", "Confirm", or "Yes".
- Secondary button always offers an alternative, not just a cancel.
- If "Edit first" is tapped, the relevant creation/edit sheet opens (reuse existing sheet patterns from reminders spec).

### 5.4 Card State Transitions

**After primary action (e.g., "Send it"):**
1. Both buttons are replaced by a single-line confirmation: "Sent" / "Added" / "Set" — in `--mint`, with a small checkmark icon
2. The confirmation text uses Plus Jakarta Sans 12px/600
3. Confirmation fades in with `fadeUp` animation (200ms)
4. The card is no longer interactive after confirmation

**After secondary action (e.g., "Edit first"):**
1. The relevant creation/edit sheet opens as a bottom sheet overlay (same pattern as reminders)
2. The action card remains visible in the chat (it's historical context)
3. After the user saves from the sheet, a new Olivia message confirms: "Done — I've added that for you."

**After dismissal (e.g., "Skip" / "Got it"):**
1. The card fades to `opacity: 0.5` over 200ms
2. Buttons are removed
3. The label changes to include "(dismissed)" in `--ink-3`

### 5.5 Multiple Action Cards

If Olivia's response includes multiple actions (rare but possible — e.g., "I'll draft a message and set a reminder"):

- Each action card appears stacked vertically within the same Olivia message bubble
- Gap between cards: `10px`
- Each card is independently actionable
- Maximum 3 action cards per message. If more are needed, Olivia should split across multiple messages.

---

## 6. Context Indicators

Context indicators help the user understand what Olivia is aware of when she responds. They build trust by making the AI's inputs visible.

### 6.1 Context Badge (Above Olivia Response)

When Olivia's response draws on specific household data, a context badge appears between the message label and the bubble:

```
  OLIVIA
  [ Based on your inbox ]    ← context badge
  ┌──────────────────────┐
  │  Response text...    │
  └──────────────────────┘
```

**Badge styling:**
```css
.context-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 20px;
  background: var(--violet-dim);
  color: var(--violet);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 10px;
  font-weight: 600;
  margin-bottom: 6px;
}
```

### 6.2 Context Badge Labels

Badges are short, specific, and tied to the data source Olivia used:

| **Data Source** | **Badge Label** |
|---|---|
| Inbox items | "Based on your inbox" |
| Reminders | "Based on your reminders" |
| Task list | "Based on your tasks" |
| Weekly routines | "Based on your routines" |
| Meal plan | "Based on your meal plan" |
| Household memory | "From household memory" |
| Calendar | "Based on your calendar" |
| Multiple sources | "Based on your household" (generic fallback) |

### 6.3 When to Show Context Badges

- Show when Olivia references specific data (tasks, reminders, routines, etc.) in her response
- Do **not** show for general conversation, greetings, or follow-up questions
- Do **not** show for error messages
- Maximum one badge per message. If multiple sources, use "Based on your household."
- The badge is informational only — not tappable in MVP

### 6.4 Freshness Indicator (Future Enhancement)

Not required for initial implementation, but spec'd for later: a small timestamp on the badge showing when context was last synced (e.g., "Based on your inbox · 2m ago"). Defer this to a future iteration.

---

## 7. Quick Chip Generation

Quick chips are contextual suggestion prompts shown above the input bar. They must reflect real household state, not generic suggestions.

### 7.1 Chip Visibility Rules

| **Condition** | **Show Chips?** |
|---|---|
| Empty state (no messages) | Yes — always |
| Conversation with < 4 messages | Yes |
| Conversation with 4+ messages | No — hide to maximize chat space |
| After Olivia sends a response | Refresh chip content (may change based on context) |
| After clearing conversation | Yes — show with fresh content |

### 7.2 Chip Content Strategy

Chips are generated from household state, not hardcoded. The content engine should select the most relevant 3-4 chips from this priority list:

**Priority 1 — Urgent/timely (always show if applicable):**
- Items due today: "3 things due today" / "What's due today?"
- Overdue items: "Anything overdue?"
- Reminders due: "Check my reminders"

**Priority 2 — Contextual (show based on current state):**
- Empty week: "Plan my week"
- Unread inbox items: "What's in my inbox?"
- Upcoming routines: "What's the routine today?"
- Meal plan gap: "What's for dinner?"

**Priority 3 — Exploratory (fill remaining slots):**
- "What should I remember?"
- "Household summary"
- "What's [person] working on?"

### 7.3 Chip Anatomy

Each chip contains:
- Optional leading icon (Phosphor icon, 16px, `color: currentColor`)
- Label text (12px/600, Plus Jakarta Sans)
- Minimum tap target: 36px height (via min-height + padding)

**Icon mapping:**
| **Chip category** | **Icon** |
|---|---|
| Calendar/schedule | CalendarBlank |
| Tasks/due items | CheckSquare |
| Reminders | Bell |
| Inbox | Tray |
| Routines | Repeat |
| Meals | CookingPot |
| Memory/recall | Lightbulb |
| People | User |
| Summary | ListBullets |

### 7.4 Chip Interaction

- **Tap:** Fills the input bar with the chip text. Does **not** auto-send.
- **After fill:** Input bar gains focus. User can edit before sending.
- **After send:** Chips refresh with new contextual suggestions (unless 4+ messages threshold is reached).

---

## 8. Conversation Management

### 8.1 Conversation Persistence

- Conversation is stored locally (IndexedDB for offline, synced to SQLite backend when available)
- On app open, the most recent conversation loads automatically
- Messages appear instantly from local cache — no loading spinner for cached content
- New messages sync to backend when connectivity is available

### 8.2 Scroll Behavior

- **New message arrival:** Auto-scroll to bottom with `behavior: 'smooth'`, 100ms delay (allows render to complete)
- **User has scrolled up:** If the user has manually scrolled more than 100px above the bottom, do **not** auto-scroll on new messages. Instead, show a "New message" pill at the bottom:

```css
.new-message-pill {
  position: sticky;
  bottom: 8px;
  align-self: center;
  padding: 6px 14px;
  border-radius: 20px;
  background: var(--violet);
  color: white;
  font-size: 11px;
  font-weight: 600;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  animation: fadeUp 0.2s cubic-bezier(0.22,1,0.36,1);
}
```

- Tapping the pill scrolls to the newest message and dismisses the pill.

### 8.3 Date Separators

When a conversation spans multiple days, show date separators between messages from different calendar days.

**Design:**
```
───────  TODAY  ───────
```

- Horizontal lines: 1px, `background: var(--ink-4)`
- Label: 10px/700, `color: var(--ink-3)`, uppercase, `letter-spacing: 1.2px`
- Center-aligned with lines extending to fill width
- Padding: `20px 0` (generous spacing around separators)

**Labels:**
- Same calendar day: no separator
- Yesterday: "YESTERDAY"
- Today: "TODAY"
- Older: "MON, MAR 10" (abbreviated day + date)

### 8.4 Clear Conversation

**Trigger:** Settings or a subtle "Clear" action in the chat header (icon-only, no text label). Use the Trash icon (Phosphor), 20px, `color: var(--ink-3)`, positioned right-aligned in the header row.

**Confirmation:** Inline confirmation — the icon is replaced by a text confirmation: "Clear chat?" with two small text buttons: "Yes" (`--rose`) and "No" (`--ink-2`). This avoids a disruptive modal.

**After clear:**
- All messages are removed
- Empty state (Section 3.1) is shown
- Quick chips refresh with new content
- Conversation is cleared from local storage and backend
- Orb returns to normal pulse

### 8.5 Conversation Length

- No hard message limit in the UI
- For very long conversations (50+ messages), older messages above the viewport are virtualized (rendered on scroll) to maintain performance
- The backend may truncate LLM context window internally, but the full conversation history remains visible to the user

---

## 9. Screen States Reference

### Group 1 — Empty & Welcome States

| **Screen ID** | **State** | **Mode** | **Key Implementation Notes** |
|---|---|---|---|
| CHAT-EMPTY-1 | First visit, no conversation | Light | Large orb (56px) centered. Welcome text. 4 quick chips visible. Input bar ready. |
| CHAT-EMPTY-2 | First visit, no conversation | Dark | Same layout. Orb glow stronger via `--shadow-violet`. Surface/bg contrast creates depth. |
| CHAT-EMPTY-3 | Cleared conversation | Light | Same as EMPTY-1 but chips refresh to current household context. |

### Group 2 — Active Conversation States

| **Screen ID** | **State** | **Mode** | **Key Implementation Notes** |
|---|---|---|---|
| CHAT-ACTIVE-1 | Early conversation (1-3 messages) | Light | Quick chips still visible. Context badge on Olivia response. |
| CHAT-ACTIVE-2 | Mid conversation (4+ messages) | Dark | Chips hidden. Messages fill chat area. Date separator if conversation spans days. |
| CHAT-ACTIVE-3 | Olivia thinking (typing indicator) | Light | Three-dot bounce in Olivia bubble position. Orb pulse at 1.5s. Input bar still active. |
| CHAT-ACTIVE-4 | Olivia streaming response | Dark | Text revealing word-by-word. Streaming cursor visible. Orb still at 1.5s pulse. |
| CHAT-ACTIVE-5 | Response with action card | Light | Text message + action card below with "Send it" / "Edit first" buttons. Context badge above. |

### Group 3 — Error States

| **Screen ID** | **State** | **Mode** | **Key Implementation Notes** |
|---|---|---|---|
| CHAT-ERR-1 | Network failure | Light | Rose-soft error bubble. Retry button below. User's failed message still visible above. |
| CHAT-ERR-2 | LLM timeout | Dark | Error bubble after 15s. "Try again" button. Typing indicator was shown for first 15s. |
| CHAT-ERR-3 | Rate limited | Light | Error bubble. Input bar disabled with countdown placeholder. |

### Group 4 — Action Card States

| **Screen ID** | **State** | **Mode** | **Key Implementation Notes** |
|---|---|---|---|
| CHAT-ACTION-1 | Draft message card (pending) | Dark | Full action card with preview block. Both buttons active. |
| CHAT-ACTION-2 | Draft message card (confirmed) | Light | Buttons replaced by mint "Sent" confirmation. Card no longer interactive. |
| CHAT-ACTION-3 | Task creation card (pending) | Light | Task title + due date in preview. "Add task" / "Edit first" buttons. |
| CHAT-ACTION-4 | Action card (dismissed) | Dark | Card at 50% opacity. Buttons removed. Label shows "(dismissed)". |
| CHAT-ACTION-5 | Multiple action cards | Light | Two cards stacked within one Olivia message. 10px gap. Each independently actionable. |

### Group 5 — Conversation Management

| **Screen ID** | **State** | **Mode** | **Key Implementation Notes** |
|---|---|---|---|
| CHAT-MGMT-1 | Scrolled up, new message | Dark | "New message" pill at bottom of chat area. Messages continue below viewport. |
| CHAT-MGMT-2 | Clear chat confirmation | Light | Trash icon replaced by "Clear chat? Yes / No" inline. |
| CHAT-MGMT-3 | Multi-day conversation | Light | Date separator between yesterday's and today's messages. |

---

## 10. Edge Cases & Failure Modes

### 10.1 Offline Message Queuing

If the user sends a message while offline:
- The user message appears immediately in the chat (optimistic UI)
- A small `--peach` dot (6px) appears next to the message label, indicating "pending"
- When connectivity returns, the message is sent automatically
- The pending dot is removed and Olivia's response streams in normally
- If the message fails after reconnection, show the network error state (Section 4.1)

### 10.2 Long Olivia Responses

- No maximum display length — Olivia's bubble grows as needed
- For very long responses (> 500 words), the bubble includes a subtle "Show more" link after the first ~200 words
- "Show more" expands the full text in place (no new screen)
- Collapsed state shows a `linear-gradient(to bottom, transparent 80%, var(--bg))` overlay at the bottom of the truncated text

### 10.3 Empty Olivia Response

If the LLM returns an empty or unparseable response:
- Do not show an empty bubble
- Show a soft error: "I had trouble with that one. Could you try rephrasing?"
- Same error bubble styling as Section 4

### 10.4 Rapid Consecutive Messages

If the user sends multiple messages before Olivia responds:
- Each user message appears in the chat immediately
- Olivia responds to the most recent message (the backend batches context)
- No visual indication of "skipped" messages — the conversation flows naturally

### 10.5 Action Card + Streaming Conflict

If Olivia is streaming a response that will include an action card:
- Text streams first, completely
- The action card appears only after streaming completes (via `popIn` animation)
- Never show a partially-rendered action card during streaming

### 10.6 Dark Mode Chip Contrast

Quick chips use `--surface` background. In dark mode, `--surface` (#1C1A2E) against `--bg` (#12101C) may have insufficient contrast. If verified during implementation:
- Upgrade chip background to `--surface-2` (#242038) in dark mode only
- Or add a `border: 1.5px solid var(--ink-4)` (already in the prototype — confirm it's sufficient)

### 10.7 Input Bar with Long Text

- Textarea auto-resizes up to 80px max height (3 lines)
- Beyond 80px, the textarea becomes scrollable internally
- Send button stays bottom-aligned (`align-items: flex-end` on the input bar)

### 10.8 Keyboard Interaction

- `Enter` sends the message
- `Shift+Enter` inserts a newline
- On mobile, the virtual keyboard pushes the input bar up (standard iOS/Android behavior for fixed-bottom inputs)
- Input bar must stay above the bottom nav at all times

---

## 11. Accessibility Notes

- All interactive elements must have a minimum tap target of 44x44px
- Chat area uses `role="log"` and `aria-live="polite"` to announce new messages to screen readers
- Typing indicator should have `aria-label="Olivia is thinking"`
- Action card buttons must have descriptive `aria-label` values (e.g., "Send draft message" not just "Send it")
- Error messages should use `role="alert"` for immediate screen reader announcement
- Quick chips use `role="list"` with `role="listitem"` on each chip
- The streaming cursor is `aria-hidden="true"` (decorative)
- Context badges are `aria-hidden="true"` (supplementary — the information is also in the message text)
- Focus trap: when an edit sheet is open over the chat, focus must be trapped within the sheet
- `prefers-reduced-motion`: disable typing dot bounce, streaming cursor blink, message entrance animations, orb pulse intensification

```css
@media (prefers-reduced-motion: reduce) {
  .typing-dot { animation: none; opacity: 0.7; }
  .streaming-cursor { animation: none; }
  .msg { animation: none; opacity: 1; transform: none; }
  .olivia-orb.orb-active { animation-duration: 3s; }
  .new-message-pill { animation: none; }
}
```

---

*— End of specification —*
