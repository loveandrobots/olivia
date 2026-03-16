---
title: "Olivia — Planning Ritual Support: Visual Implementation Spec"
date: "March 2026"
status: "Design handoff for agentic implementation"
---

# Olivia — Planning Ritual Support
## Visual Implementation Spec

*March 2026 · Design handoff for agentic implementation*

---

> **Scope of this document**
>
> This spec defines every UI state required to implement planning ritual support — the third and final Horizon 4 workflow. It covers the planning ritual card in the routine index, the structured three-section review flow screen, the review record detail screen (accessed from activity history), how the ritual appears in the activity history and unified weekly view surfaces, and all edge cases.
>
> Key design decisions resolved here: planning ritual card affordance (dedicated "Start review" button in routine index, not tap-anywhere), review flow screen layout (segmented progress indicator + step content + fixed footer action), review record detail design (review metadata + carry-forward notes + window summary), activity history ritual entry visual distinction (inherited mint/↻ type with "Review" secondary label), weekly view ritual card (standard routine appearance with "Start review" replacing the due-state checkbox), and multiple overdue ritual occurrences UX.
>
> **Reused without change:** The per-screen spouse read-only banner (L-009), bottom nav shell, and workflow-type color/icon system (routines → mint/↻). The review flow sections reuse the same grouped-by-type item display established in the routine detail screen and the unified weekly view, adapted for a read-only review context.

---

## 0. Design Decisions Resolved

The following questions were open in `docs/specs/planning-ritual-support.md` (OQ-1 through OQ-5) or were designated as designer decisions. Each is resolved here with rationale.

---

### 0.1 Planning Ritual Card Affordance in the Routine Index (OQ-3)

**Decision:** The planning ritual card in the routine index shows a dedicated **"Start review"** button in the card body instead of the standard tap-to-complete checkbox interaction used by standard routine cards.

**Rationale:** The planning ritual has a fundamentally different completion interaction from standard routines — tapping it opens a multi-step review flow, not an immediate checkbox toggle. Showing a standard checkbox would mislead the household member about what the tap will do, potentially creating a confusing first-tap experience. A "Start review" button makes the affordance explicit and communicates the richer interaction before the household member taps. The feature spec recommends this explicitly: "A dedicated 'Start review' action affordance to make the behavior explicit. Do not show a standard completion checkbox for planning rituals." This resolves OQ-3.

**Due/overdue state:**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ↻  Weekly Household Review          [due badge]        │
│     Every Sunday                                        │
│                                                         │
│  ┌──────────────────────────────────┐                   │
│  │  Start review →                 │  ← primary button │
│  └──────────────────────────────────┘                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Completed state:**
- Standard completed routine card appearance (mint ↻, title, "Completed [date]" metadata), no "Start review" button.
- Tapping a completed ritual occurrence navigates to the review record detail screen instead of the standard routine detail screen. This is a behavior difference from standard routine completions; see §3.4.

**Overdue state:** Same card structure as due state, with the overdue visual treatment (see §0.7 and §3.2).

---

### 0.2 Review Flow Screen Layout

**Decision:** The review flow is a full-screen, non-modal screen (new route: `/household/routines/:routineId/review/:occurrenceId`) with:
- A **segmented progress indicator** below the screen header showing 3 equal segments, with the active segment highlighted.
- A **content area** (scrollable if section items are many) showing the current step's grouped items or input field.
- A **fixed footer** with the primary action button ("Next →" on steps 1 and 2; "Complete review" on step 3).

**Rationale:** A full-screen route (not a modal sheet) gives the review flow appropriate visual weight — it is a meaningful household moment, not a quick confirmation. A segmented progress indicator (not text like "Step 1 of 3") is visually elegant and immediately conveys position in the flow without taking vertical space. The fixed footer keeps the primary action always accessible, even on scroll, so the household member can advance without scrolling to the bottom of a long section.

**Navigation:**
- Opening: Tapping "Start review" on the ritual card navigates to this route.
- Exiting mid-flow: A close button (✕) in the header returns to the routine index without saving state. The occurrence remains in due state.
- Completing: Tapping "Complete review" on step 3 triggers the ritual completion command and navigates back to the routine index.

---

### 0.3 Review Section Display Format — Grouped by Workflow Type, Not Reverse-Chronological

**Decision:** Items within each review section (last week recap and coming week overview) are displayed grouped by workflow type, not in reverse-chronological order.

**Rationale:** Activity history uses reverse-chronological interleaving for recall ("what happened at 9am?"). Review mode has a different purpose: orientation and acknowledgment at a household level. Grouped-by-type display allows the household member to scan "all my routines last week" in one pass, then "all my reminders," and so on. This is more efficient for review than a raw timeline. The feature spec explicitly specifies grouped display for both sections: "Display: grouped by workflow type (routines → reminders → meals → inbox items → list items)."

The order for the last week recap:
1. Routines (completed routine occurrences)
2. Reminders (resolved)
3. Meals (past meal plan entries)
4. Inbox items (closed)
5. Lists (checked-off items)

The order for the coming week overview (mirrors unified weekly view):
1. Routines (due this week)
2. Reminders (scheduled this week)
3. Meals (this week's plan)
4. Inbox items (due this week)

---

### 0.4 Empty Section State

**Decision:** Each empty workflow-type group within a review section shows a single-line quiet message in italics. An entirely empty section (no activity at all in all workflow types) shows a centered calm message.

**Per-group empty state (inline, within the group header):**
- Last week recap groups: *"Nothing recorded"* in `--ink-3`, Fraunces italic 13px, below the group header.
- Coming week overview groups: *"Nothing scheduled"* in `--ink-3`, Fraunces italic 13px.

**Entire section empty state (when all groups have no items):**
```
*Nothing recorded last week.*
← Fraunces italic 17px, --ink-2, centered

This is your quiet week — the review is still worth completing.
← PJS 13px, --ink-3, centered, max-width 260px
```

For the coming week:
```
*Nothing scheduled this week.*
← Fraunces italic 17px, --ink-2, centered

You're starting the week open — the review is still worth completing.
← PJS 13px, --ink-3, centered, max-width 260px
```

**Rationale:** The feature spec explicitly says: "Empty sections should feel calm: 'Nothing recorded last week.' or 'Nothing scheduled this week.' is appropriate — not an error state or a blank section." The secondary copy gently encourages completing the review even for sparse weeks (sparse activity is expected especially for new households), consistent with the spec guidance to handle sparse sections "gracefully, not surfaced as an error."

---

### 0.5 Review Record Detail Screen (OQ-5)

**Decision:** The review record detail screen is a new route (suggested: `/household/review-records/:reviewRecordId`). It is navigated to by tapping a completed ritual entry in activity history. It shows:

1. **Screen header**: "Review" (Fraunces 28px 700) with a subtitle of the review date ("Sunday, Mar 15" — formatted as full day name, abbreviated month, date).
2. **Window metadata block**: Two compact date-range chips showing the last week window (e.g., "Mar 9 – Mar 15") and the current week window (e.g., "Mar 16 – Mar 22") at the time of the review.
3. **Carry-forward notes section**: If carry-forward notes exist, shows a card with a "Notes" section header and the notes content. If no notes were entered, shows a quiet empty state: "No carry-forward notes."
4. **Completion metadata**: "Completed [time] · [completed-by identity]" in small muted text (`--ink-3`, PJS 12px).
5. **Spouse banner** (if spouse session): full-width read-only banner per L-009.

**What the screen does NOT show:** A snapshot of the assembled recap or overview data. Per the feature spec decision: "The review record does not snapshot the full data from the recap and overview sections." The detail screen is a record of what was noted and when, not a replay of the full review flow.

**Rationale:** The household member opening a past review record wants to see: "When did we do this review? What did I write down?" — not a full replay of the assembled history. The review record is a lightweight household journal entry, not a full activity replay. This resolves OQ-5.

---

### 0.6 Activity History Ritual Entry Visual Treatment

**Decision:** Completed planning ritual occurrences in activity history use the routine workflow-type visual system (`--mint` left border + `↻` icon) **with an additional "Review" secondary label** below the title, in `--ink-3` PJS 11px 500. This distinguishes ritual completions from standard routine completions without introducing a new workflow-type color or icon.

```
┌────────────────────────────────────────────────────────┐
│ ┃ ↻  Weekly Household Review                          │  ← mint 3px left border
│         Completed · 7:03 PM                           │  ← standard metadata
│         Review                           ← 11px --ink-3│  ← ritual distinction label
└────────────────────────────────────────────────────────┘
```

**Row height:** 64px (3-line, same as dismissed reminder row pattern).

**Tap behavior:** Navigates to the review record detail screen (`/household/review-records/:reviewRecordId`) instead of the routine detail screen.

**Rationale:** Introducing a new color or icon for the ritual type would break the established 5-type workflow color system and create visual noise for what is ultimately a routine-family variant. The secondary "Review" label is sufficient disambiguation at the household recall level — the household member can see at a glance that this was a review completion, not a standard chore completion. This approach is consistent with how the dismissed reminder label adds context to the peach/bell row without changing the color or icon.

---

### 0.7 Unified Weekly View Ritual Card

**Decision:** The planning ritual occurrence in the unified weekly view appears under the **ROUTINES** section with the same `--mint`/`↻` visual system as standard routine cards. The only difference: in the due or overdue state, the card shows a **"Start review"** micro-label (instead of a due-state checkbox) as a visual affordance.

```
ROUTINES
  ┌─────────────────────────────────────────────────────┐
  │ ↻  Weekly Household Review                         │
  │    [Start review]                    · Sunday       │
  └─────────────────────────────────────────────────────┘
```

The `[Start review]` text is a static label (not a tappable button in the weekly view — the weekly view is navigational read-only per the spec). Tapping the card navigates to the routine detail screen, consistent with the weekly view's deep-link pattern.

**Completed state in weekly view:** Standard completed routine appearance — title with strikethrough, completion badge. No "Start review" label. No tap-to-review-record from the weekly view (the weekly view links to routine detail; review record detail is accessed from activity history).

**Rationale:** The weekly view is a read-only temporal planning surface. The review flow must not be launchable from the weekly view (per spec: "The review flow is not launched directly from the weekly view"). However, marking the ritual card as a "review" type item gives the household member useful context when scanning the week ahead, avoiding a confusing moment of "why doesn't this have a checkbox?"

---

### 0.8 Multiple Overdue Ritual Occurrences UX

**Decision:** Multiple overdue ritual occurrences in the routine index are shown as individual cards in the overdue section, ordered oldest first. Each card shows the overdue occurrence with its scheduled date (e.g., "Due Sunday, Mar 8") and the standard overdue visual treatment.

```
[Overdue section]

┌─────────────────────────────────────────────────────────┐
│  ↻  Weekly Household Review         [overdue]           │
│     Due Sunday, Mar 8                                   │
│  ┌────────────────────────────┐                         │
│  │  Start review →           │                         │
│  └────────────────────────────┘                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ↻  Weekly Household Review         [overdue]           │
│     Due Sunday, Mar 15                                  │
│  ┌────────────────────────────┐                         │
│  │  Start review →           │                         │
│  └────────────────────────────┘                         │
└─────────────────────────────────────────────────────────┘
```

**No batching or catch-up UI.** The household can complete occurrences one at a time or pause the ritual. The feature spec explicitly states: "the ritual does not support catch-up reviews in Phase 1."

**Rationale:** Showing individual overdue cards is the existing overdue treatment for all routines. Creating a special batching UI would add complexity, could obscure the accumulation signal (3 missed weeks is meaningful feedback), and is not needed in Phase 1. The household member can pause the ritual from the routine detail screen if the accumulation is unwanted.

---

## 1. Design System Constraints

All planning ritual support UI must strictly conform to the Olivia design system (`docs/vision/design-foundations.md`). No new tokens are introduced in this spec — the ritual workflow is part of the routine family and uses the existing `--mint` token. The review flow introduces one new screen color usage: the review section header background uses `--surface` (same as cards) with a hairline `--ink-4` divider above each section.

### 1.1 Typography

| **Role** | **Font** | **Size** | **Weight** | **Usage** |
|---|---|---|---|---|
| Screen title (review flow, review record detail) | Fraunces | 28px | 700 | "Weekly Review" (step title), "Review" (detail screen) |
| Screen subtitle (review flow progress label) | Plus Jakarta Sans | 13px | 400 | "Step 1 of 3 — Last week" in `--ink-2` |
| Progress segment (active) | — | — | — | Filled `--violet` segment |
| Progress segment (inactive) | — | — | — | `--ink-4` segment |
| Review section header | Plus Jakarta Sans | 13px | 700 | "ROUTINES", "REMINDERS", etc. in `--ink`, uppercase |
| Review section empty (per-group) | Fraunces italic | 13px | 300 | "Nothing recorded" in `--ink-3` |
| Review section empty (full section) | Fraunces italic | 17px | 300 | Main message in `--ink-2` |
| Review section empty body | Plus Jakarta Sans | 13px | 400 | Supporting text in `--ink-3` |
| Review item title | Plus Jakarta Sans | 14px | 500 | Item names, `--ink` |
| Review item metadata | Plus Jakarta Sans | 12px | 400 | Context, time, `--ink-2` |
| Carry-forward notes textarea | Plus Jakarta Sans | 15px | 400 | Input text `--ink` |
| Notes textarea placeholder | Plus Jakarta Sans | 15px | 400 | Placeholder `--ink-3` |
| Notes optional label | Plus Jakarta Sans | 12px | 400 | "Optional" chip `--ink-3` |
| Review record detail — review date | Plus Jakarta Sans | 15px | 500 | "Sunday, Mar 15" `--ink` |
| Review record detail — window chips | Plus Jakarta Sans | 12px | 500 | Date range chips `--ink-2` |
| Review record detail — notes content | Plus Jakarta Sans | 15px | 400 | Notes text `--ink` |
| Review record detail — no-notes label | Fraunces italic | 14px | 300 | "No carry-forward notes." `--ink-3` |
| Review record detail — completion meta | Plus Jakarta Sans | 12px | 400 | "Completed 7:03 PM · Alex" `--ink-3` |
| "Start review" button | Plus Jakarta Sans | 14px | 600 | Button label `--violet` |
| "Next →" footer button | Plus Jakarta Sans | 15px | 600 | Button label; inverse (white on `--violet` bg) |
| "Complete review" footer button | Plus Jakarta Sans | 15px | 600 | Button label; inverse (white on `--violet` bg) |
| Activity history ritual label | Plus Jakarta Sans | 11px | 500 | "Review" secondary label `--ink-3` |

### 1.2 Color Token Usage

| **Visual Purpose** | **Token** |
|---|---|
| Review flow screen bg | `--bg` |
| Progress segment (active) | `--violet` |
| Progress segment (inactive) | `--ink-4` |
| Review section header label | `--ink` |
| Review section divider | `--ink-4` |
| Review item card bg | `--surface` |
| Review item card border | `--ink-4` |
| Review item title | `--ink` |
| Review item metadata | `--ink-2` |
| Ritual left border + icon in review items | `--mint` |
| Reminder left border + icon in review items | `--peach` |
| Meal left border + icon in review items | `--rose` |
| Inbox left border + icon in review items | `--sky` |
| List item left border + icon in review items | `--violet` |
| Empty section full-section headline | `--ink-2` |
| Empty section per-group text | `--ink-3` |
| Notes textarea bg | `--surface` |
| Notes textarea border | `--ink-3` (at rest) / `--violet` (focused) |
| "Start review" button bg | `--bg` |
| "Start review" button border | `--violet` |
| "Start review" button text | `--violet` |
| "Next →" / "Complete review" button bg | `--violet` |
| "Next →" / "Complete review" button text | `#FFFFFF` |
| Review record detail — window chip bg | `--surface` |
| Review record detail — window chip border | `--ink-4` |
| Review record detail — notes card bg | `--surface` |
| Activity history ritual label | `--ink-3` |
| Spouse banner bg | `--lavender-soft` |
| Spouse banner text | `--violet` |

### 1.3 Border Radius Reference

| **Element** | **Radius** |
|---|---|
| Review item card | `14px` |
| Notes textarea | `12px` |
| "Start review" button | `10px` |
| "Next →" / "Complete review" footer button | `14px` (full-width) |
| Window chips (review record detail) | `8px` |
| Review record notes card | `14px` |
| Spouse banner | `0px` |

---

## 2. Screen Inventory

| **Identifier** | **Screen** | **State** |
|---|---|---|
| RIT-1 | Routine index — ritual card | Due state with "Start review" button |
| RIT-2 | Routine index — ritual card | Overdue state (single overdue occurrence) |
| RIT-3 | Routine index — ritual card | Multiple overdue occurrences |
| REV-1 | Review flow | Step 1 — Last week recap (with content) |
| REV-2 | Review flow | Step 1 — Last week recap (all sections empty) |
| REV-3 | Review flow | Step 2 — Coming week overview |
| REV-4 | Review flow | Step 3 — Carry-forward notes |
| RRD-1 | Review record detail | With carry-forward notes |
| RRD-2 | Review record detail | No notes entered |
| RRD-3 | Review record detail | Spouse view (read-only banner) |
| HIST-R | Activity history extension | Ritual entry row (3-line with "Review" label) |

---

## 3. Screen Layouts

### 3.1 Review Flow — Shell (All Steps)

```
┌──────────────────────────────────────────────────────┐
│  Status bar (44px — native)                          │
├──────────────────────────────────────────────────────┤
│  Header bar                                          │
│  ─────────────────────────────────────────────────   │
│  [olivia wordmark — Fraunces italic, violet 30px]    │
│                                            [✕ close] │
│                                                      │
│  Weekly Household Review ← Fraunces 700 28px         │
│  Step 1 of 3 — Last week ← PJS 13px --ink-2          │
├──────────────────────────────────────────────────────┤
│  Progress indicator (3 equal segments, 4px height)   │
│  ████████████ ░░░░░░░░░░░░ ░░░░░░░░░░░░              │
│  (active=--violet, inactive=--ink-4)                 │
│  ← 22px horizontal padding, 12px vertical padding   │
├──────────────────────────────────────────────────────┤
│  Scroll content area                                 │
│  ─────────────────────────────────────────────────   │
│  [Step content — see §3.2, §3.3, §3.4]              │
│  Bottom padding: 100px (clears fixed footer)         │
│                                                      │
├──────────────────────────────────────────────────────┤
│  Fixed footer (safe area aware)                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Next →   (or "Complete review" on step 3)      │ │
│  │  ← PJS 15px 600, white on --violet, 56px height │ │
│  └─────────────────────────────────────────────────┘ │
│  (16px horizontal margin on each side)               │
└──────────────────────────────────────────────────────┘
```

**Header measurements:**
- Close button: 44px touch target, `--ink-2` ✕ icon, right-aligned
- Title row top margin: 8px
- Title to subtitle gap: 4px
- Header bottom padding: 12px (progress indicator follows immediately)
- Total header height (approximate): 88px

**Progress indicator:**
- 3 equal-width segments with 4px gap between them
- Active segment: `--violet` fill
- Inactive segment: `--ink-4` fill
- Height: 4px, border-radius: 2px (pill shape)
- Transitions: segment animates to filled on step advance (200ms ease)

---

### 3.2 REV-1: Review Flow — Step 1 (Last Week Recap, With Content)

**Progress indicator:** Segment 1 filled, segments 2 and 3 empty.

**Step subtitle:** "Step 1 of 3 — Last week · Mar 9 – Mar 15"

**Section content (scroll area):**

```
[Date range context line]
Mar 9 – Mar 15   ← PJS 13px 400 --ink-2, 22px padding, 8px top margin

[Section group — ROUTINES]
──────────────────────────────────────────────────
ROUTINES   ← PJS 13px 700 --ink uppercase, 22px horizontal

  ┌────────────────────────────────────────────────┐  ← --surface, 14px radius
  │ ┃ ↻  Morning walk                             │  ← mint 3px left border
  │       Completed · Mon, Mar 9                  │
  └────────────────────────────────────────────────┘
  gap: 6px
  ┌────────────────────────────────────────────────┐
  │ ┃ ↻  Morning walk                             │
  │       Completed · Tue, Mar 10                  │
  └────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────┐
  │ ┃ ↻  Evening tidy-up                          │
  │       Completed · Sat, Mar 14                  │
  └────────────────────────────────────────────────┘

[Section group — REMINDERS]
──────────────────────────────────────────────────
REMINDERS

  ┌────────────────────────────────────────────────┐
  │ ┃ 🔔  Call insurance company                  │  ← peach 3px left border
  │         Completed · Wed, Mar 11                │
  └────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────┐
  │ ┃ 🔔  Review lease renewal                    │  ← peach 3px left border
  │         Dismissed · Fri, Mar 13                │
  └────────────────────────────────────────────────┘

[Section group — MEALS]
──────────────────────────────────────────────────
MEALS

  ┌────────────────────────────────────────────────┐
  │ ┃ ◆  Pasta carbonara                          │  ← rose 3px left border
  │         Dinner · Mon, Mar 9                    │
  └────────────────────────────────────────────────┘
  [more meal entries...]

[Section group — INBOX]
──────────────────────────────────────────────────
INBOX

  ┌────────────────────────────────────────────────┐
  │ ┃ ▷  Schedule HVAC service                    │  ← sky 3px left border
  │         Closed · Thu, Mar 12                   │
  └────────────────────────────────────────────────┘

[Section group — LISTS]
──────────────────────────────────────────────────
LISTS

  ┌────────────────────────────────────────────────┐
  │ ┃ ✓  Milk                                     │  ← violet 3px left border
  │         Grocery List · Tue, Mar 10             │
  └────────────────────────────────────────────────┘
  [more list items...]
```

**Section group design:**
- Group header: ALL CAPS PJS 13px 700 `--ink`, 22px horizontal padding, 12px top margin, 4px bottom margin
- Divider: 1px `--ink-4`, full-width, above each group header (not above first group)
- Items: same card anatomy as activity history item rows (§4), but item metadata uses day-of-week abbreviated date format (e.g., "Mon, Mar 9") rather than a clock time — in the review context, what day an item occurred is more relevant than what time

**Fixed footer:** "Next →" button, `--violet` bg, white text

---

### 3.3 REV-2: Review Flow — Step 1 (All Sections Empty)

**Progress indicator:** Segment 1 filled, segments 2 and 3 empty.

**Section content:**

```
[Date range context line]
Mar 9 – Mar 15   ← same as REV-1

[Full-section empty state — centered in scroll area]

              *Nothing recorded last week.*
              ← Fraunces italic 17px, --ink-2, centered

     This is your quiet week — the review
     is still worth completing.
     ← PJS 13px, --ink-3, centered, max-width 260px
     ← top margin: 32px from date context line
```

**Fixed footer:** "Next →" button (still enabled — empty sections do not block advancing).

---

### 3.4 REV-3: Review Flow — Step 2 (Coming Week Overview)

**Progress indicator:** Segments 1 and 2 filled, segment 3 empty.

**Step subtitle:** "Step 2 of 3 — Coming week · Mar 16 – Mar 22"

**Section content:**

Same grouped layout as step 1 but with coming-week items and four workflow-type groups (ROUTINES, REMINDERS, MEALS, INBOX — no LISTS section in coming week per the spec's four data sources for the coming week overview).

Items in coming week groups show metadata appropriate to upcoming items (not completion dates):
- Routines: "Due [day]" (e.g., "Due Sunday")
- Reminders: "Scheduled [day, time]" (e.g., "Scheduled Mon, 9:00 AM")
- Meals: "Dinner · Week of Mar 16" (same format as weekly view)
- Inbox: "Due [day]" (e.g., "Due Fri, Mar 20")

**Design note:** Coming week items are shown in a read-only review context. They use the same card anatomy as step 1 (left border accent color, icon, title, metadata), but there is no tap behavior — these are informational cards for review, not tappable navigation links. Touch targets are still rendered at full card size for visual consistency.

**Fixed footer:** "Next →" button.

---

### 3.5 REV-4: Review Flow — Step 3 (Carry-Forward Notes)

**Progress indicator:** All three segments filled.

**Step subtitle:** "Step 3 of 3 — Notes"

**Section content:**

```
[Notes label area]
Notes, decisions, or items to carry forward
← PJS 14px 500, --ink, 22px padding, 16px top margin

Optional   ← PJS 12px 400, --ink-3, adjacent to or below label

[Textarea]
┌──────────────────────────────────────────────────┐
│                                                  │
│  Write anything worth remembering from          │
│  this week's review...                          │  ← placeholder text, --ink-3
│                                                  │
│                                                  │
│                                                  │
│                                                  │
└──────────────────────────────────────────────────┘
← --surface bg, 12px radius, 1.5px border
← at rest: --ink-3 border; focused: --violet border
← min-height: 160px; expands with content
← PJS 15px 400, --ink for typed text

Character guidance (optional, visible when >1500 characters):
  [1500 / 2000]   ← PJS 11px 400, --ink-3, right-aligned below textarea
```

**Skip affordance:** No explicit "Skip" button — the section header labels the field as "Optional." The household member can tap "Complete review" without entering any text.

**Fixed footer:** "Complete review" button, `--violet` bg, white text, 56px height.

**Complete review tap behavior:**
- Immediate execution (no confirmation step — per D-010, non-destructive user-initiated action).
- Shows a brief loading state on the button (spinner replaces text) while the review record is saved.
- On success: navigates back to the routine index. No success toast or celebration — the act of returning to the routine index with the ritual card now showing "Completed" is the feedback signal.
- On error: shows an inline error below the button ("Couldn't save your review. Try again.") with a retry; the button remains active.

---

### 3.6 RRD-1: Review Record Detail (With Carry-Forward Notes)

```
┌──────────────────────────────────────────────────┐
│  [← back chevron]   olivia      [L] [A]         │
│                                                  │
│  Review                 ← Fraunces 700 28px      │
│  Sunday, Mar 15         ← PJS 15px 500 --ink     │
├──────────────────────────────────────────────────┤
│  [Spouse banner — conditional]                   │
├──────────────────────────────────────────────────┤
│  Scroll area                                     │
│                                                  │
│  [Window metadata section]                       │
│  ─────────────────────────────────────────────   │
│                                                  │
│  Weeks reviewed                                  │
│  ← PJS 13px 600 --ink, 22px padding, 16px top   │
│                                                  │
│  ┌──────────────────┐  ┌───────────────────────┐ │
│  │ Last week        │  │ Coming week           │ │
│  │ Mar 9 – Mar 15   │  │ Mar 16 – Mar 22       │ │
│  └──────────────────┘  └───────────────────────┘ │
│  ← chips: --surface bg, --ink-4 border, 8px r   │
│  ← PJS 12px 500 --ink-2 (top label, muted)      │
│  ← PJS 14px 500 --ink (date range, prominent)   │
│                                                  │
│  [Carry-forward notes section]                   │
│  ─────────────────────────────────────────────   │
│                                                  │
│  Notes                                           │
│  ← PJS 13px 600 --ink, 22px padding, 20px top   │
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │ Call contractor about the basement before   ││
│  │ end of month. Also: Jordan's school pickup  ││
│  │ schedule changing starting Apr 1.           ││
│  └──────────────────────────────────────────────┘│
│  ← --surface bg, 14px radius, --ink-4 border   │
│  ← PJS 15px 400 --ink, 16px padding all sides  │
│                                                  │
│  ─────────────────────────────────────────────   │
│  Completed 7:03 PM · Alex                        │
│  ← PJS 12px 400, --ink-3, 22px padding          │
│                                                  │
└──────────────────────────────────────────────────┘
│  Bottom nav                                      │
└──────────────────────────────────────────────────┘
```

**Navigation:** Back chevron in header returns to activity history (the navigation entry point). No edit affordance — review records are read-only.

---

### 3.7 RRD-2: Review Record Detail (No Notes Entered)

Same as RRD-1 but the notes section shows:

```
Notes
  ← PJS 13px 600 --ink

  *No carry-forward notes.*
  ← Fraunces italic 14px 300 --ink-3, 22px padding
```

---

### 3.8 RRD-3: Review Record Detail (Spouse View)

Same as RRD-1 or RRD-2 but with the full-width L-009 spouse banner below the header. Content is identical — the spouse can read the carry-forward notes but cannot edit or delete the record.

---

### 3.9 RIT-1: Routine Index — Planning Ritual Card (Due State)

This extends the existing routine card design. The planning ritual card is a visual variant of the standard routine card that replaces the completion checkbox with the "Start review" button affordance.

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ↻  Weekly Household Review              [due badge]     │
│     Every Sunday                                         │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Start review  →                                  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**"Start review" button:**
- Width: full card content width (16px horizontal padding from card edges)
- Height: 44px
- Background: `--bg` (not a filled primary button — it reads as an outlined accent)
- Border: 1.5px `--violet`
- Border-radius: 10px
- Label: "Start review  →" — PJS 14px 600 `--violet`, centered or left-leaning
- Tap state: `transform: scale(0.97)` (150ms ease), same micro-feedback pattern

**Full card tap target:** The entire card area (including outside the button) is tappable and also opens the review flow. The explicit button ensures the affordance is visible before tapping.

**Due badge:** Same "Due" badge used for standard due routine cards.

---

### 3.10 RIT-2: Routine Index — Planning Ritual Card (Single Overdue)

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ↻  Weekly Household Review         [overdue badge]      │
│     Due Sunday, Mar 8                                    │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Start review  →                                  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Overdue badge and card styling:** Same as standard overdue routine card (red/warm overdue badge, card left border may use overdue accent). The "Start review" button remains `--violet` (not overdue-colored) to preserve the positive "this is a good thing to do" affordance even in overdue state.

---

## 4. Item Row Anatomy (Review Flow Cards)

Review flow item cards share the same shell as activity history item rows, with two differences:
1. Metadata shows abbreviated day-of-week date format rather than clock time.
2. Cards in the coming week overview section (step 2) are not tappable (informational only).

### 4.1 Standard Review Item Row

```
┌──────────────────────────────────────────────────┐  ← --surface bg, 14px radius
│ ┃ [icon]  [Title text — 14px 500 --ink]          │  ← ┃ = 3px left border in accent
│         [Day metadata — 12px 400 --ink-2]        │
└──────────────────────────────────────────────────┘
```

**Row height:** 52px (2-line).
**Left border, icon, spacing:** Identical to activity history item row anatomy (see activity history visual spec §4.1).

**Day metadata format (last week recap):**
- Routine: `Completed · Mon, Mar 9`
- Reminder (completed): `Completed · Wed, Mar 11`
- Reminder (dismissed): `Dismissed · Fri, Mar 13`
- Meal: `Dinner · Mar 9`
- Inbox: `Closed · Thu, Mar 12`
- List item: `Grocery List · Tue, Mar 10`

**Day metadata format (coming week overview):**
- Routine: `Due Sunday`
- Reminder: `Scheduled Mon, 9:00 AM`
- Meal: `Dinner · Week of Mar 16`
- Inbox: `Due Fri, Mar 20`

---

## 5. Navigation and Interaction

### 5.1 Review Flow Entry Points

| **Surface** | **Tap target** | **Navigates to** |
|---|---|---|
| Routine index — ritual card (due/overdue) | Card tap or "Start review" button | `/household/routines/:routineId/review/:occurrenceId` |
| Routine index — ritual card (completed) | Card tap | Review record detail via activity history deep link, or routine detail (Founding Engineer decision — see §10) |

### 5.2 Review Flow Navigation

| **Action** | **Result** |
|---|---|
| Tap "Next →" (step 1 or 2) | Advance to next step, update progress indicator |
| Tap "Complete review" (step 3) | Execute completion, navigate to routine index |
| Tap ✕ (close) | Exit flow, return to routine index; occurrence remains in due state; no data saved |
| OS back gesture (step 2 or 3) | Return to previous step |
| OS back gesture (step 1) | Exit flow (same as ✕ tap) |

### 5.3 Review Record Deep Links

| **Surface** | **Tap target** | **Navigates to** |
|---|---|---|
| Activity history — ritual entry row | Full row | Review record detail screen |
| Review record detail | Back chevron | Activity history screen |

---

## 6. Dark Mode Notes

Planning ritual support requires no custom dark mode overrides beyond what token inheritance provides.

- **Review flow cards:** `--surface` shifts to `#1C1A2E` in dark mode. All five workflow-type accent colors are unchanged.
- **Progress indicator:** `--violet` for active segment (unchanged in dark mode); `--ink-4` in dark mode is `rgba(237,233,255,0.1)` — very subtle inactive segments. This low contrast is acceptable; the filled active segment provides sufficient positional signal.
- **Notes textarea:** `--surface` for bg in dark mode; `--violet` focus ring unchanged. No hardcoded hex values.
- **"Start review" button:** `--bg` background (`#12101C` in dark mode), `--violet` border and text — distinctive and legible.
- **Review record window chips:** `--surface` bg in dark mode, `--ink-4` border, `--ink-2` label, `--ink` date range text — all resolve correctly via token inheritance.

**No hardcoded hex values:** All color references in planning ritual support components must use CSS custom properties.

---

## 7. Edge Cases

### 7.1 Ritual With a Long Title

Review flow header title and routine index card title both truncate at 1 line with ellipsis. The maximum household-sensible ritual name fits comfortably within 1 line on all phone widths; this is the expected case.

### 7.2 Very Long Carry-Forward Notes

The notes textarea expands vertically to fit content up to 2000 characters (implementation-defined limit from the spec). If the content pushes beyond the viewport, the scroll area within the notes step accommodates normal scroll. The fixed footer button remains anchored to the bottom. At 1500 characters, the character counter appears ("1500 / 2000").

### 7.3 Review Record With No Carry-Forward Notes

Render as RRD-2: the notes section shows the italic empty state message rather than a blank card. This is the more common case for households that routinely skip the notes field.

### 7.4 Review Flow on Tablet (768px+)

- Scroll content area: max-width 560px, centered
- Fixed footer button: max-width 560px, centered (matches content width)
- Item cards and notes textarea: same max-width constraint
- Progress indicator: same max-width constraint
- All other layout rules unchanged

### 7.5 OS Back Gesture Ambiguity in Review Flow

On step 2 and 3, the OS back gesture returns to the previous step (not to the routine index), consistent with standard multi-step form navigation. On step 1, OS back exits the flow entirely. This is the expected behavior on both iOS and Android. No custom back stack manipulation is required.

### 7.6 Coming Week Overview with No Items Due This Week

Shows the full-section empty state message for step 2:
```
*Nothing scheduled this week.*

You're starting the week open — the review
is still worth completing.
```
Step 2 still renders; the household member can still advance to step 3 and complete the review.

### 7.7 Ritual Completion During Offline State

The review flow renders from locally cached H3 state when offline. Steps 1 and 2 display whatever is in the local Dexie cache. Step 3 (carry-forward notes) is always functional offline — it is pure local input.

On tapping "Complete review" when offline:
- The review record is saved to the outbox.
- The occurrence is marked complete locally.
- Navigation returns to routine index.
- The next occurrence appears per the recurrence rule (computed locally).
- When the network reconnects, the outbox syncs the review record and occurrence update to the canonical store.
- No error state is shown during offline completion — the experience is identical to online completion.

---

## 8. Token Assignment Summary

```css
/* Review flow screen */
background: var(--bg);

/* Progress indicator */
.progress-segment-active { background: var(--violet); height: 4px; border-radius: 2px; }
.progress-segment-inactive { background: var(--ink-4); height: 4px; border-radius: 2px; }

/* Section headers within review flow */
.review-section-header { color: var(--ink); font-size: 13px; font-weight: 700; letter-spacing: 0.04em; }
.review-section-divider { border-top: 1px solid var(--ink-4); }

/* Review item card (inherited from activity history) */
.review-item { background: var(--surface); border: 1.5px solid var(--ink-4); border-radius: 14px; box-shadow: var(--shadow-sm); }
.review-item-title { color: var(--ink); font-size: 14px; font-weight: 500; }
.review-item-meta { color: var(--ink-2); font-size: 12px; font-weight: 400; }
.review-item-routine { border-left: 3px solid var(--mint); }
.review-item-reminder { border-left: 3px solid var(--peach); }
.review-item-meal { border-left: 3px solid var(--rose); }
.review-item-inbox { border-left: 3px solid var(--sky); }
.review-item-list { border-left: 3px solid var(--violet); }

/* Empty states */
.review-empty-headline { color: var(--ink-2); font-family: Fraunces; font-style: italic; font-size: 17px; font-weight: 300; }
.review-empty-body { color: var(--ink-3); font-size: 13px; font-weight: 400; }
.review-empty-group { color: var(--ink-3); font-family: Fraunces; font-style: italic; font-size: 13px; font-weight: 300; }

/* Notes textarea */
.notes-textarea { background: var(--surface); border: 1.5px solid var(--ink-3); border-radius: 12px; color: var(--ink); font-size: 15px; }
.notes-textarea:focus { border-color: var(--violet); }
.notes-textarea::placeholder { color: var(--ink-3); }
.notes-optional-label { color: var(--ink-3); font-size: 12px; }
.notes-char-count { color: var(--ink-3); font-size: 11px; }

/* Action buttons */
.btn-start-review { background: var(--bg); border: 1.5px solid var(--violet); border-radius: 10px; color: var(--violet); font-size: 14px; font-weight: 600; }
.btn-primary-footer { background: var(--violet); border-radius: 14px; color: #FFFFFF; font-size: 15px; font-weight: 600; height: 56px; }

/* Review record detail */
.review-record-date { color: var(--ink); font-size: 15px; font-weight: 500; }
.review-window-chip { background: var(--surface); border: 1.5px solid var(--ink-4); border-radius: 8px; }
.review-window-chip-label { color: var(--ink-2); font-size: 12px; font-weight: 500; }
.review-window-chip-range { color: var(--ink); font-size: 14px; font-weight: 500; }
.review-notes-card { background: var(--surface); border: 1.5px solid var(--ink-4); border-radius: 14px; }
.review-notes-content { color: var(--ink); font-size: 15px; font-weight: 400; }
.review-notes-empty { color: var(--ink-3); font-family: Fraunces; font-style: italic; font-size: 14px; font-weight: 300; }
.review-completion-meta { color: var(--ink-3); font-size: 12px; font-weight: 400; }

/* Activity history ritual label */
.activity-ritual-label { color: var(--ink-3); font-size: 11px; font-weight: 500; }

/* Spouse banner (inherited L-009) */
.spouse-banner { background: var(--lavender-soft); color: var(--violet); }
```

---

## 9. Design Checklist

- [x] Planning ritual card affordance resolved — dedicated "Start review" button, no completion checkbox (OQ-3)
- [x] Review flow screen layout specified — progress indicator, step content, fixed footer
- [x] Review flow progress indicator design specified (3-segment bar, `--violet` active)
- [x] All three review flow steps designed (last week recap, coming week overview, carry-forward notes)
- [x] Empty state per group and full-section empty state designed for both step 1 and step 2
- [x] Carry-forward notes textarea design specified (expand, character limit at 1500)
- [x] "Complete review" button behavior specified (immediate, no confirmation, brief loading)
- [x] Review record detail screen designed — with notes (RRD-1), no notes (RRD-2), spouse view (RRD-3)
- [x] Activity history ritual entry visual treatment resolved — inherited `--mint`/`↻` with "Review" secondary label (OQ-5)
- [x] Weekly view ritual card treatment specified — standard routine appearance with "Start review" micro-label
- [x] Multiple overdue ritual occurrences UX resolved — individual cards, no batching (OQ-4)
- [x] Offline completion behavior specified (outbox pattern, no error state)
- [x] Both light and dark modes specified via CSS tokens — no hardcoded hex values
- [x] Spouse banner placement specified for review record detail screen (L-009)
- [x] All 18 acceptance criteria from the feature spec have corresponding visual coverage
- [x] Tablet layout addressed for review flow
- [x] Token assignment summary provided for implementation use

---

## 10. Open Questions for Founding Engineer

### Q1 — Review Record Navigation from Completed Ritual Card

In the routine index, when a household member taps a **completed** ritual card (as opposed to the due/overdue "Start review" card), should this navigate to:

a. The ritual's routine detail screen (standard completed routine tap behavior), OR
b. The most recent review record for that ritual occurrence

**Recommendation:** Option (a) — routine detail screen — to maintain consistent tap behavior from the routine index. Review record access is the activity history path. This avoids a scenario where the same card does different things depending on its state (due → review flow; completed → review record). Founding Engineer should confirm whether this is the correct behavior or whether a direct link to the most recent review record from the completed card would be more useful.

### Q2 — Review Flow Route Structure and Occurrence Binding

The visual spec assumes a route structure of `/household/routines/:routineId/review/:occurrenceId`. If multiple overdue occurrences exist, each has a distinct `occurrenceId` — the review flow for a given overdue occurrence covers the week windows associated with **that specific occurrence's due date** (per feature spec OQ-4 resolution: each occurrence anchors to its scheduled week). Confirm the route handles multiple overdue occurrences correctly and that the window calculation uses the occurrence's scheduled due date, not the current date, when completing a late occurrence.

### Q3 — ritual_type Field Migration

Adding a `ritual_type` field to the routines table requires a SQLite migration. Confirm that the migration pattern follows the existing Drizzle migration approach in the project. The field should be nullable (null = standard routine; 'weekly_review' = planning ritual) to maintain backwards compatibility with all existing routines.

### Q4 — review_record_id on Routine Occurrences

The feature spec specifies a `review_record_id` FK field on routine occurrences. This requires a migration to the `routine_occurrences` table. Confirm whether the FK should be enforced at the SQLite level (with a foreign key constraint on `review_records.id`) or stored as a nullable UUID with soft-reference only. Recommendation: soft-reference (nullable UUID, no DB-level FK constraint), consistent with how other cross-entity references are handled in the local-first SQLite model.

### Q5 — Review Section Data at Time of Late Completion

When a ritual occurrence from 3 weeks ago is completed today, the review flow shows data anchored to that occurrence's scheduled week (per OQ-4 resolution in the feature spec). Confirm that the window calculation in the review flow uses `occurrence.dueDate` as the anchor (not `new Date()`) to derive the last-week and coming-week windows. This ensures the review reflects the household state at the time of that occurrence, not the current week.

---

*This visual spec resolves all designer decisions deferred in the planning ritual support feature spec. The Founding Engineer should review Section 10 (Open Questions) before beginning the implementation.*
