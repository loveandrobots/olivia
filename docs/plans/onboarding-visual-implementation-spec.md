---
title: "Olivia — Phase 1 Onboarding: Visual Implementation Spec"
subtitle: "Welcome Card, Onboarding Chat, Continue Setup, and Completion"
date: "March 2025"
status: "Design handoff for agentic implementation"
---

# Olivia — Phase 1 Onboarding
## Visual Implementation Spec
*Welcome Card, Onboarding Chat, Continue Setup, and Completion*

*March 2025 · Design handoff for agentic implementation*

---

> **Scope of this document**
>
> This spec defines every UI state required to implement Phase 1 of the Improved Onboarding & Data Freshness feature — the conversational "brain dump" onboarding flow. It is a complete, self-contained design handoff.
>
> Covers: design tokens and typography rules, component anatomy for all new UI surfaces, all screen states with layout specs, interaction rules and approval model, dark mode notes, edge cases, and open design questions.
>
> Full product spec: `docs/specs/onboarding-and-data-freshness.md`

---

## 1. Design System Constraints

All onboarding UI must strictly conform to the Olivia design system. No new tokens may be introduced. The complete token reference is in `docs/vision/design-foundations.md`.

### 1.1 Typography

| **Role** | **Font** | **Size** | **Weight** | **Usage in Onboarding** |
|---|---|---|---|---|
| Welcome card headline | Fraunces | 22px | 700 | "Let's get your household set up" |
| Welcome card body | Plus Jakarta Sans | 14px | 400 | Supporting copy and time estimate |
| Olivia chat message | Fraunces italic | 15–17px | 300 | All Olivia messages in onboarding chat |
| Topic label | Plus Jakarta Sans | 10px | 700 | ALL CAPS topic headers ("TASKS", "ROUTINES", etc.) |
| Draft entity title | Plus Jakarta Sans | 14px | 600 | Parsed item name in batch review |
| Draft entity detail | Plus Jakarta Sans | 12px | 400–500 | Metadata, confidence, owner assignment |
| Template label | Plus Jakarta Sans | 13px | 600 | Starter template suggestion titles |
| Template description | Plus Jakarta Sans | 12px | 400 | Template detail text |
| Section title (home) | Fraunces | 19px | 700 | "Continue setup" section header |
| Completion summary | Fraunces italic | 17px | 300 | "Here's what we set up together" |
| Completion count | Plus Jakarta Sans | 14px | 600 | Entity count summaries |
| Button labels | Plus Jakarta Sans | 13px | 700 | All CTA buttons |

### 1.2 Color Token Usage

All onboarding surfaces use existing tokens. No new tokens are introduced.

| **Visual Purpose** | **Token** | **Light Value** | **Dark Value** |
|---|---|---|---|
| Welcome card gradient | --violet → --violet-2 | #6C5CE7 → #8B7FF5 | #6C5CE7 → #9D93F7 |
| Welcome card decorative circles | white @ 8–12% opacity | same | same |
| Continue setup card bg | --surface | #FFFFFF | #1C1A2E |
| Continue setup accent | --violet / --violet-dim | #6C5CE7 / rgba(…0.1) | same / rgba(…0.18) |
| Onboarding chat bg | --bg | #FAF8FF | #12101C |
| User message bubble | --violet → --violet-2 gradient | standard | standard |
| Olivia message bubble | --surface | #FFFFFF | #1C1A2E |
| Draft entity card bg | --surface | #FFFFFF | #1C1A2E |
| Draft entity border | --lavender-mid | #D4CCFF | #3D3660 |
| Confidence: high | --mint / --mint-soft | #00C9A7 / #E0FFF9 | #00C9A7 / #0A2820 |
| Confidence: medium | --peach / --peach-soft | #FFB347 / #FFF3E0 | #FFB347 / #2E1E08 |
| Confidence: low | --rose / --rose-soft | #FF7EB3 / #FFE8F2 | #FF7EB3 / #3A1828 |
| Topic progress indicator (done) | --mint | #00C9A7 | #00C9A7 |
| Topic progress indicator (current) | --violet | #6C5CE7 | #6C5CE7 |
| Topic progress indicator (future) | --ink-4 | rgba(26,16,51,0.15) | rgba(237,233,255,0.1) |
| Template suggestion bg | --surface-2 | #F3F0FF | #242038 |
| Template toggle on | --violet / --violet-dim | standard | standard |
| Template toggle off | --ink-4 | standard | standard |
| Completion checkmark | --mint | #00C9A7 | #00C9A7 |
| Completion card bg | --surface | #FFFFFF | #1C1A2E |

### 1.3 Border Radius Reference

| **Element** | **Radius** |
|---|---|
| Welcome card (home) | 24px |
| Continue setup card (home) | 18px |
| Olivia message bubble | 4px 20px 20px 20px |
| User message bubble | 20px 4px 20px 20px |
| Draft entity card | 16px |
| Draft batch container | 18px |
| Template suggestion row | 14px |
| Confidence badge | 20px (fully rounded) |
| Topic progress dots | 50% (circle) |
| Action buttons | 16px |
| Input bar | 20px |
| Completion summary card | 18px |

---

## 2. Component Anatomy

### 2.1 Welcome Card (Home Screen)

The welcome card replaces the nudge card position on the home screen for new/empty households (≤2 total entities). It is the most prominent element below the header.

**Structure:**
```
┌──────────────────────────────────────────────┐
│  ○ ○ ○                (decorative circles)   │
│                                               │
│  ✦ OLIVIA                                    │
│                                               │
│  Let's get your                               │
│  household set up.                            │
│                                               │
│  It takes about 10 minutes — just tell me     │
│  what's on your plate and I'll organize it.   │
│                                               │
│  ┌────────────────────────────┐               │
│  │    Let's go →              │               │
│  └────────────────────────────┘               │
│                                               │
│                        Skip for now           │
└──────────────────────────────────────────────┘
```

**Sub-elements:**

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Container | Full-width card, 24px radius | `background: linear-gradient(135deg, var(--violet), var(--violet-2))`, `box-shadow: var(--shadow-violet)`, padding: 24px |
| Decorative circles | 3 semi-transparent white circles | Same pattern as nudge card: `rgba(255,255,255,0.08–0.12)`, positioned top-right, `pointer-events: none` |
| Eyebrow label | "✦ OLIVIA" | 10px/700, white @ 80% opacity, letter-spacing: 1.3px, uppercase |
| Headline | "Let's get your household set up." | Fraunces 22px/700, white, line-height: 1.3 |
| Body | Supporting copy | Plus Jakarta Sans 14px/400, white @ 85% opacity, line-height: 1.5 |
| Primary button | "Let's go →" | `background: white`, `color: var(--violet)`, 13px/700, padding: 12px 24px, 16px radius. Same style as nudge primary button. |
| Skip link | "Skip for now" | `color: rgba(255,255,255,0.65)`, 12px/500, no underline. Tap target ≥ 44px. |

**Dark mode note:** The violet gradient is unchanged between modes (same as nudge card). `--shadow-violet` strengthens automatically in dark. White text on violet gradient reads well in both modes.

**Interaction:**
- Tapping "Let's go →" opens the onboarding chat session
- Tapping "Skip for now" dismisses the card; a "Continue setup" card appears in its place on subsequent visits
- The full card is NOT tappable (unlike the nudge card) — only the explicit buttons are interactive
- Card animates in with `popIn` (0.3s, `cubic-bezier(0.22, 1, 0.36, 1)`)

**Visibility rules:**
- Shown when household has ≤2 total entities AND onboarding state is `not_started`
- Hidden when onboarding state is `finished` or entity count exceeds threshold
- Replaces the nudge card slot — nudge card is not shown while welcome card is visible

### 2.2 Continue Setup Card (Home Screen)

Shown when onboarding has been started but not completed. Replaces the welcome card. Sits in the same position (below header, above today section).

**Structure:**
```
┌──────────────────────────────────────────────┐
│  ✦ Continue setting up                       │
│                                               │
│  You've set up tasks and routines.            │
│  Ready to keep going?                         │
│                                               │
│  ●●●○○   3 of 5 topics covered               │
│                                               │
│  ┌────────────────┐  ┌─────────────────┐     │
│  │  Continue →     │  │  I'm good ✓    │     │
│  └────────────────┘  └─────────────────┘     │
└──────────────────────────────────────────────┘
```

**Sub-elements:**

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Container | Standard card | `background: var(--surface)`, `border: 1.5px solid var(--lavender-mid)`, `border-left: 3px solid var(--violet)`, 18px radius, padding: 18px, `box-shadow: var(--shadow-sm)` |
| Eyebrow | "✦ Continue setting up" | 10px/700, `color: var(--violet)`, letter-spacing: 1.2px, uppercase |
| Body | Progress summary | Fraunces italic 15px/300, `color: var(--ink)`, line-height: 1.5 |
| Progress dots | Topic completion indicator | 8px circles in a row, gap: 6px. Completed: `var(--mint)`. Remaining: `var(--ink-4)`. |
| Progress label | "3 of 5 topics covered" | 11px/500, `color: var(--ink-2)` |
| Primary button | "Continue →" | Standard `.btn-primary` style |
| Secondary button | "I'm good ✓" | Standard `.btn-secondary` style |

**Dark mode note:** Fully automatic via tokens. `--surface` becomes `#1C1A2E`, `--lavender-mid` becomes `#3D3660`. The violet left border reads well on both backgrounds.

**Interaction:**
- "Continue →" opens the onboarding chat, resuming at the next incomplete topic
- "I'm good ✓" marks onboarding as `finished` — card is permanently hidden, replaced by normal home screen content
- Card animates in with `fadeUp` (0.35s)

**Visibility rules:**
- Shown when onboarding state has `started` with at least one `topic_completed` but is not `finished`
- Hidden when onboarding state is `not_started` (show welcome card instead) or `finished`
- Still appears even if household now has >2 entities (user started onboarding, got value, hasn't explicitly finished)

**Tone:**
- The body copy must acknowledge what the user HAS done, not what they haven't. Examples:
  - "You've set up tasks and routines. Ready to keep going?"
  - "You've added your tasks. Want to tackle routines next?"
  - Never: "You still need to complete 2 more topics."

### 2.3 Onboarding Chat Session

A dedicated chat experience using a special `onboarding` conversation type. Visually similar to the existing Olivia chat but with additional UI elements for topic navigation, batch review, and templates.

#### 2.3.1 Chat Header

```
┌──────────────────────────────────────────────┐
│  ← Back                                      │
│                                               │
│  [Olivia orb]  Getting set up                 │
│                Your household, organized       │
│                                               │
│  ●●●○○  Tasks · Routines · Reminders ·       │
│         Lists · Meals                         │
└──────────────────────────────────────────────┘
```

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Back link | "← Back" | 13px/600, `color: var(--violet)`. Returns to home screen. |
| Olivia orb | Standard orb | Same as Olivia screen header. `orbPulse` animation. |
| Title | "Getting set up" | Fraunces 22px/700, `color: var(--ink)` |
| Subtitle | "Your household, organized" | 13px/400, `color: var(--ink-2)` |
| Topic progress bar | Horizontal dots + labels | See 2.3.2 below |

**Sticky behavior:** Header is sticky (does not scroll with chat content).

#### 2.3.2 Topic Progress Bar

A horizontal indicator showing which topics have been completed, which is current, and which are ahead.

```
  ● Tasks  ·  ● Routines  ·  ◉ Reminders  ·  ○ Lists  ·  ○ Meals
  (done)      (done)          (current)        (ahead)     (ahead)
```

| **State** | **Dot style** | **Label style** |
|---|---|---|
| Completed | 8px circle, `background: var(--mint)` | 10px/600, `color: var(--ink-2)` |
| Current | 10px circle, `background: var(--violet)`, `box-shadow: 0 0 0 4px var(--violet-dim)` | 10px/700, `color: var(--violet)` |
| Ahead | 8px circle, `background: var(--ink-4)` | 10px/500, `color: var(--ink-3)` |

- Progress bar scrolls horizontally if labels overflow (`overflow-x: auto; scrollbar-width: none`)
- Tapping a completed topic label scrolls to that topic's section in the chat history (future enhancement — not required for MVP)
- The bar updates in real-time as topics are completed

#### 2.3.3 Chat Area

Standard Olivia chat layout with `--bg` background. Message bubbles use the same patterns as the existing Olivia screen:

- **User messages:** Right-aligned, violet gradient, `border-radius: 20px 4px 20px 20px`
- **Olivia messages:** Left-aligned, `background: var(--surface)`, `border: 1.5px solid var(--ink-4)`, `border-radius: 4px 20px 20px 20px`. Text in Fraunces italic.

New message types specific to onboarding are defined in sections 2.4–2.7.

#### 2.3.4 Input Bar

Same as existing Olivia chat input bar:
- `background: var(--surface)`, `border: 2px solid var(--lavender-mid)`, 20px radius
- Focus: `border-color: var(--violet)`, `box-shadow: 0 0 0 4px var(--violet-glow)`
- Placeholder (Fraunces italic, `color: var(--ink-3)`): varies by topic:
  - Tasks: *"List your tasks, to-dos, anything on your mind…"*
  - Routines: *"What recurring chores does your household do?"*
  - Reminders: *"Any deadlines or dates you don't want to forget?"*
  - Lists: *"Groceries, shopping, packing — any shared lists?"*
  - Meals: *"Do you plan meals? Tell me about your pattern…"*
- `Enter` sends, `Shift+Enter` for new line

### 2.4 Olivia Topic Prompt (Chat Message)

When Olivia introduces a new topic, the message includes a topic label badge above the message text.

```
┌──────────────────────────────────────────────┐
│  ┌──────────┐                                │
│  │ 📋 TASKS │                                │
│  └──────────┘                                │
│                                               │
│  Let's start with the things on your mind.    │
│  What tasks, to-dos, or obligations are you   │
│  tracking right now? Just list them — I'll    │
│  organize everything.                         │
└──────────────────────────────────────────────┘
```

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Topic badge | Category label | 10px/700, uppercase, letter-spacing: 1.2px. `background: var(--violet-dim)`, `color: var(--violet)`, padding: 3px 10px, 20px radius. Emoji prefix. Sits above the message text with 8px margin-bottom. |
| Message text | Olivia prompt | Fraunces italic 15px/300, `color: var(--ink)`, line-height: 1.5 |

**Topic badge variants:**

| Topic | Badge text | Emoji |
|---|---|---|
| Tasks | TASKS | 📋 |
| Routines | ROUTINES | 🔄 |
| Reminders | REMINDERS | 🔔 |
| Lists | LISTS | 📝 |
| Meals | MEALS | 🍽️ |

### 2.5 Draft Entity Batch (Chat Message)

After the user provides freeform input for a topic, Olivia parses it and presents a batch of draft entities for review. This is an inline chat message (not a bottom sheet).

```
┌──────────────────────────────────────────────┐
│  Here's what I captured — look right?         │
│                                               │
│  ┌──────────────────────────────────────────┐ │
│  │  ☐  Pick up dry cleaning        ● HIGH  │ │
│  │     Due: Tomorrow · Owner: Jamie         │ │
│  ├──────────────────────────────────────────┤ │
│  │  ☐  Schedule dentist appt       ● MED   │ │
│  │     No due date · Owner: Jamie           │ │
│  ├──────────────────────────────────────────┤ │
│  │  ☐  Call plumber about leak     ● HIGH  │ │
│  │     Due: This week · Owner: Jamie        │ │
│  ├──────────────────────────────────────────┤ │
│  │  ☐  Return library books        ● LOW   │ │
│  │     Due: Friday · Owner: unassigned      │ │
│  └──────────────────────────────────────────┘ │
│                                               │
│  ┌─────────────┐  ┌─────────┐  ┌──────────┐ │
│  │ ✓ Confirm   │  │ ✏ Edit  │  │ ✕ Skip  │ │
│  │    all      │  │  items  │  │  topic   │ │
│  └─────────────┘  └─────────┘  └──────────┘ │
└──────────────────────────────────────────────┘
```

**Sub-elements:**

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Intro text | "Here's what I captured — look right?" | Fraunces italic 15px/300, `color: var(--ink)`. Part of the Olivia message bubble. |
| Batch container | Wraps all draft items | `background: var(--surface)`, `border: 1.5px solid var(--lavender-mid)`, 18px radius, overflow hidden. Sits inside the Olivia message bubble. |
| Draft item row | Individual parsed entity | padding: 14px 16px. Separated by 1px `var(--ink-4)` divider. Last row has no divider. |
| Checkbox | Per-item selection | 20px circle, `border: 2px solid var(--ink-4)`. Checked by default. Checked state: `background: var(--violet)`, white ✓. Tap to deselect individual items. |
| Item title | Parsed entity name | 14px/600, `color: var(--ink)`. Single line, ellipsis overflow. |
| Confidence dot | Parse confidence | 8px circle inline with title. High: `var(--mint)`. Medium: `var(--peach)`. Low: `var(--rose)`. |
| Confidence label | "HIGH" / "MED" / "LOW" | 9px/700, uppercase, `color` matches dot token. Hidden on high confidence to reduce noise — only shown for medium and low. |
| Meta line | Due date, owner | 11px/400, `color: var(--ink-2)`. Format: "Due: {date} · Owner: {name}" |
| Confirm all button | Primary action | `.btn-primary` style. "✓ Confirm all" or "✓ Confirm 3 of 4" if some deselected. |
| Edit items button | Secondary action | `.btn-secondary` style. "✏ Edit items" — expands inline editing (see 2.5.1). |
| Skip topic button | Ghost/dismiss | `color: var(--ink-2)`, 12px/500, no background. "✕ Skip topic" |

**Interaction:**
- All items are checked by default — user deselects items they don't want
- "Confirm all" creates all checked items in bulk. Unchecked items are discarded.
- "Edit items" transitions the batch to inline edit mode (2.5.1)
- "Skip topic" dismisses the batch entirely. Olivia asks about the next topic.
- After confirmation, the batch container collapses with a success state: "✓ {N} items created" in mint, with a subtle `fadeUp` animation

**Confidence dot rules:**
- High confidence (≥0.85): mint dot only, no label (clean appearance)
- Medium confidence (0.5–0.84): peach dot + "MED" label
- Low confidence (<0.5): rose dot + "LOW" label — these items deserve user attention before confirming

#### 2.5.1 Inline Edit Mode

When "Edit items" is tapped, each draft row expands to show editable fields:

```
┌──────────────────────────────────────────────┐
│  ☑  [Pick up dry cleaning          ]  ● HIGH│
│     Due: [Tomorrow    ▾]                     │
│     Owner: [Jamie     ▾]                     │
│     ┌────────┐                               │
│     │ Remove │                               │
│     └────────┘                               │
├──────────────────────────────────────────────┤
│  ... next item ...                           │
└──────────────────────────────────────────────┘
```

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Title input | Editable text field | `background: var(--surface-2)`, `border: 1.5px solid var(--lavender-mid)`, 14px radius. 14px/600, `color: var(--ink)`. Focus: `border-color: var(--violet)`, `box-shadow: 0 0 0 4px var(--violet-glow)`. |
| Due date selector | Date chips or text | Same chip pattern as reminder create: Today, Tomorrow, This week, Custom. 11px/600. |
| Owner selector | Toggle or dropdown | Plus Jakarta Sans 11px/500. Toggle between household members. |
| Remove button | Ghost destructive | 11px/500, `color: var(--rose)`. "Remove" — removes item from batch. |

- Editing happens in-place — no sheet overlay
- "Save changes" button replaces "Confirm all" when in edit mode
- Transition between view and edit mode uses `fadeUp` animation (0.2s)

### 2.6 Starter Template Suggestions (Chat Message)

After the user completes a routines or lists topic, Olivia offers starter templates as a separate message.

```
┌──────────────────────────────────────────────┐
│  Many households track routines like these.   │
│  Want me to add any?                          │
│                                               │
│  ┌──────────────────────────────────────────┐ │
│  │  ☐  Weekly cleaning                     │ │
│  │     Every Saturday                       │ │
│  ├──────────────────────────────────────────┤ │
│  │  ☐  Trash & recycling                   │ │
│  │     Twice a week                         │ │
│  ├──────────────────────────────────────────┤ │
│  │  ☐  Laundry                             │ │
│  │     Twice a week                         │ │
│  ├──────────────────────────────────────────┤ │
│  │  ☐  Grocery shopping                    │ │
│  │     Weekly                               │ │
│  ├──────────────────────────────────────────┤ │
│  │  ☐  Pay bills                           │ │
│  │     Monthly                              │ │
│  └──────────────────────────────────────────┘ │
│                                               │
│  ┌────────────────────┐  ┌──────────────────┐ │
│  │ ✓ Add selected     │  │ Skip templates  │ │
│  └────────────────────┘  └──────────────────┘ │
└──────────────────────────────────────────────┘
```

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Intro text | Template offer | Fraunces italic 15px/300, `color: var(--ink)` |
| Template container | Wraps all suggestions | `background: var(--surface-2)`, `border: 1.5px solid var(--ink-4)`, 18px radius |
| Template row | Individual suggestion | padding: 12px 16px. Separated by 1px `var(--ink-4)` divider. |
| Checkbox | Toggle inclusion | Same as draft checkbox (2.5). All UNCHECKED by default — templates are opt-in, never pre-selected. |
| Template title | Routine/list name | 13px/600, `color: var(--ink)` |
| Template detail | Cadence or description | 11px/400, `color: var(--ink-2)` |
| Add selected button | Primary CTA | `.btn-primary`. Disabled state when none selected (`opacity: 0.5`, `pointer-events: none`). Label updates: "✓ Add 3 selected" |
| Skip templates | Secondary | `.btn-secondary`. "Skip templates" |

**Key rule:** All template checkboxes start UNCHECKED. Templates are suggestions, never auto-applied. This is a CEO decision and a product ethos requirement.

**Template sets (conservative — CEO guidance: 5-7 routines, 2-3 lists):**

Routines:
1. Weekly cleaning — Every Saturday
2. Trash & recycling — Twice a week
3. Laundry — Twice a week
4. Grocery shopping — Weekly
5. Pay bills — Monthly
6. Water plants — Weekly (optional 6th)

Lists:
1. Grocery list — Shared shopping list
2. To-buy list — Non-grocery purchases
3. Packing list — Travel preparation (optional 3rd)

### 2.7 Progressive Exit Prompt (Chat Message)

After each topic's entities are confirmed (or skipped), Olivia offers the choice to continue or stop.

```
┌──────────────────────────────────────────────┐
│  Nice — your tasks are set up! Want to        │
│  keep going, or is this enough for now?       │
│                                               │
│  ┌──────────────────┐  ┌───────────────────┐ │
│  │ Keep going →     │  │ That's enough ✓  │ │
│  └──────────────────┘  └───────────────────┘ │
└──────────────────────────────────────────────┘
```

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Message text | Celebration + prompt | Fraunces italic 15px/300, `color: var(--ink)`. Must acknowledge what was just accomplished. |
| Continue button | Primary | `.btn-primary`. "Keep going →" |
| Stop button | Secondary | `.btn-secondary`. "That's enough ✓" |

**Tone rules:**
- Always celebrate what was done: "Nice — your tasks are set up!"
- Never pressure to continue: "Want to keep going, or is this enough for now?"
- The "stop" option must never feel like failure

### 2.8 Completion Summary (Chat Message)

Shown when the user finishes all topics or explicitly says "That's enough."

```
┌──────────────────────────────────────────────┐
│  Here's what we set up together ✨             │
│                                               │
│  ┌──────────────────────────────────────────┐ │
│  │  📋  8 tasks created                    │ │
│  │  🔄  5 routines created                 │ │
│  │  🔔  3 reminders created                │ │
│  │  📝  2 lists created                    │ │
│  └──────────────────────────────────────────┘ │
│                                               │
│  You're all set! I'll be here whenever you    │
│  need help managing things.                   │
│                                               │
│  ┌────────────────────┐                       │
│  │  Go to home →      │                       │
│  └────────────────────┘                       │
└──────────────────────────────────────────────┘
```

| **Sub-element** | **Description** | **Rules** |
|---|---|---|
| Headline | "Here's what we set up together ✨" | Fraunces italic 17px/300, `color: var(--ink)` |
| Summary card | Entity counts | `background: var(--surface-2)`, 18px radius, padding: 16px. |
| Summary row | Per-type count | 14px/600, `color: var(--ink)`. Emoji prefix matches topic badge. Only show rows with count > 0. |
| Closing text | Warm farewell | Fraunces italic 15px/300, `color: var(--ink)` |
| Home button | Navigation CTA | `.btn-primary`. "Go to home →" |

**Rules:**
- Only show entity types that were actually created (hide rows with 0 count)
- If user stopped early (e.g., only did tasks and routines), the summary shows only those
- Tapping "Go to home →" navigates to the home screen. The welcome/continue card is gone; normal home screen content shows.

---

## 3. Screen States Reference

### Group 1 — Home Screen (Onboarding Cards)

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| ONBOARD-HOME-1 | New user, welcome card | Light | Welcome card in nudge position. No today section (empty). Empty today Olivia message below card. Subtitle: "Let's get started." |
| ONBOARD-HOME-2 | Partial onboarding, continue card | Dark | Continue setup card with progress dots. Today section may now have items from completed topics. Nudge card hidden. |
| ONBOARD-HOME-3 | Onboarding complete, normal home | Light | No onboarding card. Normal Today-Forward layout. Nudge card may reappear. |
| ONBOARD-HOME-4 | User skipped, continue card | Dark | Continue card with 0 of 5 dots filled. Body: "Whenever you're ready, I can help organize your household." |

### Group 2 — Onboarding Chat

| **Screen ID** | **State** | **Mode** | **Key implementation notes** |
|---|---|---|---|
| ONBOARD-CHAT-1 | First topic (tasks), fresh start | Light | Olivia welcome message + tasks topic prompt. Empty input bar with tasks placeholder. Progress bar: tasks current, all others ahead. |
| ONBOARD-CHAT-2 | User submitted brain dump, drafts shown | Dark | User freeform message visible. Olivia draft batch response below. All items checked by default. Confidence dots visible. |
| ONBOARD-CHAT-3 | Drafts confirmed, progressive exit | Light | Confirmed batch shows collapsed success state. Progressive exit prompt with "Keep going" and "That's enough" buttons. |
| ONBOARD-CHAT-4 | Mid-flow, routines topic with templates | Dark | Routine drafts confirmed. Template suggestions shown below. All templates unchecked. |
| ONBOARD-CHAT-5 | Edit mode active on draft batch | Light | Draft items expanded with editable fields. "Save changes" replaces "Confirm all". |
| ONBOARD-CHAT-6 | Completion summary | Dark | All topics done or user chose to stop. Summary card with entity counts. "Go to home" button. |
| ONBOARD-CHAT-7 | Resumed session (from continue card) | Light | Chat history preserved from previous session. Progress bar reflects completed topics. Next incomplete topic prompt shown. |
| ONBOARD-CHAT-8 | Low confidence parse results | Dark | Several items showing peach/rose confidence dots. "LOW" and "MED" labels visible. Olivia message: "I wasn't sure about a few of these — take a look before confirming." |

---

## 4. Interaction & Approval Rules

### 4.1 Agentic Actions (Always Require Confirmation)

All entity creation during onboarding follows the existing `createDraft` → confirm pattern. Olivia proposes, user confirms.

| **Olivia proposes** | **Confirmation required?** | **Notes** |
|---|---|---|
| Batch create entities from brain dump | Yes — "Confirm all" or per-item selection | Drafts shown for review before any creation |
| Add starter templates | Yes — user must check individual templates | All templates unchecked by default |
| Parse freeform text into entities | Automatic (no confirmation for parsing) | But resulting drafts require confirmation |

### 4.2 User-Initiated Actions (Execute Immediately)

| **Action** | **Behavior** |
|---|---|
| Deselect an item from batch | Immediate — item visually unchecked |
| Edit a draft item's fields | Immediate — in-place editing |
| Remove an item from batch | Immediate — item removed with `fadeUp` exit animation |
| Skip a topic | Immediate — Olivia moves to next topic |
| "That's enough" (stop onboarding) | Immediate — shows completion summary |
| "I'm good" (dismiss continue card) | Immediate — card hidden, onboarding marked finished |

### 4.3 Navigation Model

Onboarding uses a dedicated route, not the existing Olivia tab:

1. Home screen → Welcome card "Let's go →" → `/onboarding` route (onboarding chat)
2. Home screen → Continue card "Continue →" → `/onboarding` route (resumes session)
3. Onboarding chat → "← Back" → Home screen (session preserved, can resume)
4. Onboarding chat → "Go to home →" (completion) → Home screen (onboarding finished)

The bottom nav remains visible during onboarding. The Olivia tab does NOT highlight — onboarding is a separate context.

---

## 5. Layout & Spacing Spec

### 5.1 Welcome Card (Home Screen)

| **Element** | **Spacing / size** |
|---|---|
| Card margin from header | Same as nudge card: 0px (sits directly below greeting area) |
| Card horizontal margin | 16px (matches card container padding) |
| Card internal padding | 24px all sides |
| Eyebrow to headline | 14px |
| Headline to body | 10px |
| Body to primary button | 20px |
| Primary button to skip link | 12px |
| Card to next section below | 20px |

### 5.2 Continue Setup Card (Home Screen)

| **Element** | **Spacing / size** |
|---|---|
| Card horizontal margin | 16px |
| Card internal padding | 18px |
| Eyebrow to body | 10px |
| Body to progress dots | 14px |
| Progress dots to button row | 16px |
| Button row gap | 10px |
| Card to next section below | 20px |

### 5.3 Onboarding Chat Header

| **Element** | **Spacing / size** |
|---|---|
| Back link to title | 14px |
| Orb size | 40×40px (same as Olivia screen) |
| Orb to title | 12px horizontal |
| Title to subtitle | 2px |
| Subtitle to progress bar | 14px |
| Progress bar to chat area | 16px |
| Header horizontal padding | 22px |
| Header bottom border | 1px solid `var(--ink-4)` |

### 5.4 Draft Batch (Chat Message)

| **Element** | **Spacing / size** |
|---|---|
| Intro text to batch container | 12px |
| Batch container padding | 0 (items have their own padding) |
| Draft item row padding | 14px 16px |
| Checkbox to title | 12px |
| Title to confidence dot | 8px |
| Title to meta line | 4px |
| Item divider | 1px `var(--ink-4)`, full width of container |
| Batch container to button row | 14px |
| Button row gap | 8px |

### 5.5 Template Suggestions

| **Element** | **Spacing / size** |
|---|---|
| Template container padding | 0 |
| Template row padding | 12px 16px |
| Checkbox to template title | 12px |
| Template title to detail | 3px |
| Button row gap | 8px |

---

## 6. Data Fields Surfaced per Component

### 6.1 Onboarding Session State

| Field | Type | Description |
|---|---|---|
| `status` | enum: `not_started`, `started`, `finished` | Global onboarding state |
| `topicsCompleted` | string[] | Array of completed topic keys: `tasks`, `routines`, `reminders`, `lists`, `meals` |
| `entitiesCreated` | Record<string, number> | Count of entities created per topic |
| `conversationId` | string | ID of the onboarding chat session (for resuming) |

### 6.2 Draft Entity (per batch item)

| Field | Type | Description |
|---|---|---|
| `id` | string | Temporary draft ID |
| `title` | string | Parsed entity name |
| `entityType` | enum: `task`, `routine`, `reminder`, `list`, `meal` | What kind of entity |
| `parseConfidence` | number (0–1) | AI parsing confidence score |
| `dueText` | string \| null | Parsed due date as text ("Tomorrow", "This week") |
| `owner` | string \| null | Assigned owner name |
| `recurrenceRule` | string \| null | For routines: "daily", "weekly", etc. |
| `selected` | boolean | Whether user has selected this for creation (default: true) |

### 6.3 Welcome Card

Requires: `onboardingState.status`, household entity count.

### 6.4 Continue Setup Card

Requires: `onboardingState.status`, `onboardingState.topicsCompleted`, `onboardingState.entitiesCreated`.

---

## 7. Edge Cases & Failure Modes

### 7.1 AI Parse Fallback

If AI is unavailable when parsing freeform input, show a message: *"I'm having trouble organizing that right now. Want to try again, or add items one at a time?"*

Offer two buttons:
- "Try again" — resubmits the text
- "Add manually" — opens the existing structured add-item form (routes to `/add`)

Never show a blank or error batch container.

### 7.2 Empty Brain Dump

If the user sends a message that contains no parseable entities (e.g., "I don't know" or "skip"), Olivia responds conversationally:

*"No worries! We can always come back to this. Want to try the next topic?"*

Buttons: "Next topic →" / "That's enough for now"

### 7.3 Very Large Brain Dump

If AI parses more than 12 items from a single message:
- Show the first 10 items in the batch
- Add a "Show {N} more" expandable row at the bottom (12px/600, `color: var(--violet)`)
- The expand row uses `fadeUp` animation for the revealed items

### 7.4 Session Persistence

Onboarding session state must survive app restarts. If the user force-closes mid-conversation:
- On next open, the continue card appears on the home screen
- Tapping "Continue" resumes at the next incomplete topic
- Chat history from the previous session is restored
- Entity counts from previous topics are preserved

### 7.5 User Types Free Text But Also Taps Template

If the user provides freeform routines AND then also selects templates, both are created. Olivia deduplicates by title (case-insensitive). If a template matches a user-provided item, the user-provided version wins.

### 7.6 Household Already Has Items

If the household has more than 2 entities but onboarding state is `not_started` (e.g., user manually created items before onboarding), the welcome card is hidden. The user accesses the app normally.

If household drops back to ≤2 entities (deletions), the welcome card reappears only if onboarding state is still `not_started`.

### 7.7 Dark Mode: Draft Batch

In dark mode, the batch container uses `var(--surface)` background (`#1C1A2E`) which is the same as the Olivia message bubble. To create visual separation between the message text and the batch, add a 1px `var(--ink-4)` top border on the batch container when it sits inside an Olivia message bubble.

### 7.8 Accessibility

- All interactive elements: minimum 44×44px tap target
- Draft item checkboxes: include `aria-label` with item title ("Select: Pick up dry cleaning")
- Confidence dots: include `aria-label` ("Parse confidence: high")
- Topic progress bar: `role="progressbar"` with `aria-valuenow` and `aria-valuemax`
- Template checkboxes: `aria-label` with template title
- All Fraunces italic text meets 4.5:1 contrast in both modes
- `prefers-reduced-motion`: disable `popIn`, `fadeUp`, stagger animations. Elements render immediately at full opacity.

---

## 8. Animation Notes

| **Element** | **Animation** | **Duration** | **Notes** |
|---|---|---|---|
| Welcome card entrance | `popIn` | 0.3s | On first home screen render |
| Continue card entrance | `fadeUp` | 0.35s | On home screen render |
| Olivia chat messages | `msgIn` | 0.3s | Standard chat message entrance |
| Draft batch appearance | `fadeUp` | 0.35s | After ~900ms Olivia "thinking" delay |
| Individual draft items | Stagger `taskIn` | 0.05s per item | Within the batch container |
| Batch confirmation collapse | Custom: height collapse + opacity | 0.25s | Batch shrinks to single "✓ N items created" line |
| Template suggestions | `fadeUp` | 0.35s | After draft confirmation |
| Completion summary | `popIn` | 0.3s | Celebratory entrance |
| Topic progress bar updates | `transition: all 0.2s ease` | 0.2s | Dot color/size transitions smoothly |

All animations use `cubic-bezier(0.22, 1, 0.36, 1)` easing unless otherwise noted.

**`prefers-reduced-motion`:** All animations disabled. Elements appear immediately.

---

## 9. Open Design Questions

1. **Onboarding conversation history limit**: Should the full chat history be preserved on resume, or should Olivia provide a brief summary of what was done and start fresh for the next topic? Full history may make the chat feel long; summary may lose context. **Recommendation:** Show a condensed summary of completed topics at the top, then fresh messages for the current topic.

2. **Template customization**: Should users be able to edit template details (e.g., change "Every Saturday" to "Every Sunday" for weekly cleaning) before adding? Current spec says no — templates are added as-is. If editing friction is observed during validation, add inline editing as a follow-up.

3. **Onboarding re-entry after "I'm good"**: If a user taps "I'm good ✓" on the continue card (marking onboarding as finished), should there be any way to re-enter onboarding later? **Recommendation:** No — users can create items via normal flows. Onboarding is a one-time guided experience.

---

*— End of specification —*
