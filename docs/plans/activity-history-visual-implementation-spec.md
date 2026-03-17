---
title: "Olivia — Activity History: Visual Implementation Spec"
date: "March 2026"
status: "Design handoff for agentic implementation"
---

# Olivia — Activity History
## Visual Implementation Spec

*March 2026 · Design handoff for agentic implementation*

---

> **Scope of this document**
>
> This spec defines every UI state required to implement the Activity History screen — the second Horizon 4 surface. It covers navigation placement, design system constraints, component anatomy, all screen states with precise layout specs, item row designs for all five workflow types, dark mode behavior, and edge cases.
>
> Key design decisions resolved here: navigation entry point (Memory tab as primary + weekly view footer link as secondary), day section format (no workflow-type sub-headers, items interleaved chronologically), shared list item visual treatment (5th workflow type using `--violet` + checkmark icon), completed-item title treatment (full opacity, no strikethrough — history items are always resolved), today/yesterday/older day header labeling, and empty-state copy.
>
> **Reused without change:** The per-screen spouse read-only banner (`--lavender-soft` bg, `--violet` text, per L-009), the bottom nav shell, and the four H3 workflow-type color/icon assignments (routines → mint/↻, reminders → peach/🔔, meals → rose/◆, inbox → sky/▷) are all directly inherited from the unified weekly view visual spec. Activity history introduces one new workflow-type mapping: shared list items (→ violet/✓).

---

## 0. Design Decisions Resolved

The following questions were open in `docs/specs/activity-history.md` (OQ-1 through OQ-4) or were designated as designer decisions. Each is resolved here with rationale.

---

### 0.1 Navigation Entry Point

**Decision:** Activity history is accessible via two entry points:

1. **Primary:** The Memory tab (🗂️, Tab 5) in the bottom nav. Tapping Memory navigates to `/history` — activity history becomes the primary screen in the Memory section. The Memory tab is active when viewing `/history`.
2. **Secondary:** A "View history →" text link at the bottom of the weekly view Home screen, positioned below the Sunday day section before the bottom nav safe area. This provides a natural "look back" path from the forward-looking weekly view.

**Rationale:** A dedicated 6th nav tab would crowd the mobile bottom nav beyond comfortable density and imply activity history is a peer-level workflow (like Tasks or Household), which it is not — it is a recall surface. The Memory tab (🗂️) is the semantically correct home for a history and recall screen; "memory" describes exactly what activity history provides. The weekly view footer link gives power users a direct, low-friction path from the household command center into its backward-looking complement, reinforcing the temporal-pair relationship described in L-014. This resolves OQ-3 from the feature spec.

**Memory tab (updated H4 role):**
- Route: `/history`
- Tab 5 is active when on the activity history screen
- The 🗂️ icon and "Memory" label are retained unchanged

**Weekly view footer link (secondary):**
```
──────────────────────────────────────────────────
[History →]  View the last 30 days of activity    → taps to /history
──────────────────────────────────────────────────
```
- Font: Plus Jakarta Sans 13px, 500, `--violet`
- Positioned below the Sunday section, above bottom nav safe area padding
- Right-aligned chevron icon (›) in `--violet`

**Implementation notes:**
- Route: `/history` (new route, separate from `/` weekly view)
- The Memory tab button in `<BottomNav>` updates its `href` from its current target to `/history`
- No other nav structure change is required

---

### 0.2 Item Ordering Within a Day: Chronological Interleaving, No Workflow Sub-Headers

**Decision:** Items within each day section are ordered reverse-chronologically by their completion/resolution timestamp. Workflow types are interleaved in this chronological order — no ALL CAPS workflow-type sub-headers are used within day sections.

**Rationale:** The weekly view uses ALL CAPS sub-headers (ROUTINES, REMINDERS, MEALS, INBOX) because that screen shows upcoming items grouped by workflow type for planning clarity. Activity history has the opposite purpose — recall. When recalling what happened on a given day, chronological interleaving answers "what happened at 9am on Tuesday?" better than type grouping. The workflow type is communicated by the left-edge accent color + icon, which provides adequate differentiation without sub-headers. Removing sub-headers also keeps high-activity days more compact.

**Implementation note:** No workflow-type label rows are rendered within day sections. Each item row carries its own type signal via left border and icon.

---

### 0.3 Workflow-Type Visual Differentiation: 5-Type System

Activity history surfaces five workflow types. The four types from the weekly view are inherited unchanged. A fifth type is added here for shared list items.

| Workflow type | Accent color token | Icon | Rationale |
|---|---|---|---|
| Recurring routines | `--mint` | `↻` | Inherited from weekly view — steady, recurring household obligations |
| Reminders | `--peach` | `🔔` | Inherited from weekly view — reminder bell |
| Meal entries | `--rose` | `◆` | Inherited from weekly view — warm, food-adjacent |
| Inbox items | `--sky` | `▷` | Inherited from weekly view — tracked action |
| Shared list items | `--violet` | `✓` | New for activity history — checkmark signals completion; violet is Olivia's household-collaboration color; visually distinct from all four accent colors |

**Shared list item rationale:** Violet is Olivia's brand identity color and is associated with household action and shared context throughout the design system. Using it for shared list items (which represent completed collaborative household work — grocery runs, packing lists) is semantically appropriate. The checkmark icon (✓) is the universally understood completion signal, which fits perfectly for list items that have been explicitly checked off. The left-edge use of `--violet` is narrow (3px border + 12px icon only) — it does not conflict with the TODAY badge or nav active state, which use `--violet` in separate layout regions.

**Accessibility note:** Color is never the sole differentiator. Each workflow type carries a distinct icon. All five icons are distinct shapes: ↻ (rotate), 🔔 (bell), ◆ (diamond), ▷ (arrow), ✓ (checkmark).

---

### 0.4 Completed-Item Title Treatment: Full Opacity, No Strikethrough

**Decision:** Item titles in activity history are rendered at full `--ink` opacity with no strikethrough. Items do not use the strikethrough treatment established in the weekly view.

**Rationale:** In the weekly view, strikethrough on completed items is meaningful because it differentiates completed items from upcoming items *within the same view*. In activity history, every single item is already completed or resolved — the entire view is a history log. Applying strikethrough universally would make the whole screen feel visually "cancelled" and reduce legibility for recall. Full-opacity titles make the history feel like a clean, readable log — the fact that these are past completed items is communicated by context (you are on the History screen) and by the subtle completion-time metadata, not by text decoration.

**Completion signal:** Each item row shows its completion or resolution time as the primary metadata line. This is the visual cue that the item is in the past. No additional completion badge or icon is needed in Phase 1.

**Dismissed reminders:** Reminders with `status = dismissed` receive an additional secondary label "Dismissed" in `--ink-3` weight below the reminder title. This addresses OQ-2 from the feature spec. The label is small and non-judgmental — the household can see whether a reminder was completed or dismissed without it being prominently flagged as a "failure."

---

### 0.5 Day Header Format: Relative Labels for Recent Days

**Decision:** Day section headers use relative labeling for the two most recent days:
- Today's date: **"Today"** (no explicit date — positioned at top of screen, context is clear)
- Yesterday's date: **"Yesterday — [Day Abbr] [Date]"** (e.g., "Yesterday — Sat 14")
- All earlier dates: **"[Day name], [Month Abbr] [Date]"** (e.g., "Fri, Mar 13")

A "Last 30 days" subtitle in the screen header provides the time-range frame for the whole view.

**Rationale:** "Today" and "Yesterday" are the most natural labels for recent activity recall — they match how people think ("what did I do today?", "what happened yesterday?"). Older dates use an explicit day+date format to make them unambiguous at a glance.

**Implementation note:** Day header labels are computed at render time from the current device date. The "Today" label only appears if the rolling 30-day window includes today (which it always does, per the spec).

---

### 0.6 Shared List Item Volume: Individual Item Display in Phase 1

**Decision:** Shared list items are shown individually in Phase 1 — not grouped by list. Each item shows its name and parent list name in the metadata line ("Milk — Grocery List").

**Rationale:** This resolves OQ-1 from the feature spec. The grouped approach ("23 items in Grocery List — Tuesday") is a safer, less noisy presentation, but it obscures which specific items were bought or checked off, reducing the value of activity history for grocery recall. Individual item display is more useful for "what did we buy on Tuesday?" recall. If noise proves to be a real problem in household usage, list-grouped display can be added as a Phase 2 option. Phase 1 should optimize for completeness over compactness.

---

## 1. Design System Constraints

All Activity History UI must strictly conform to the Olivia design system (`docs/vision/design-foundations.md`). No new tokens are introduced in this spec — the fifth workflow type (shared list items) uses the existing `--violet` token.

### 1.1 Typography

| **Role** | **Font** | **Size** | **Weight** | **Usage in Activity History** |
|---|---|---|---|---|
| Screen title | Fraunces | 28px | 700 | "History" screen header |
| Screen subtitle | Plus Jakarta Sans | 13px | 400 | "Last 30 days" in `--ink-2` |
| Day section header — today | Plus Jakarta Sans | 13px | 700 | "Today" in `--ink` |
| Day section header — yesterday | Plus Jakarta Sans | 13px | 600 | "Yesterday — Sat 14" in `--ink` |
| Day section header — older | Plus Jakarta Sans | 13px | 500 | "Fri, Mar 13" in `--ink-2` |
| Item title | Plus Jakarta Sans | 14px | 500 | All workflow types — full `--ink` opacity |
| Item metadata — primary | Plus Jakarta Sans | 12px | 400 | Completion time, context; `--ink-2` |
| Item metadata — dismissed label | Plus Jakarta Sans | 11px | 500 | "Dismissed" label; `--ink-3` |
| List context label | Plus Jakarta Sans | 12px | 400 | "— Grocery List"; `--ink-2` |
| Empty state headline | Fraunces italic | 17px | 300 | Main empty message; `--ink-2` |
| Empty state body | Plus Jakarta Sans | 13px | 400 | Supporting empty state text; `--ink-3` |
| Footer history end label | Plus Jakarta Sans | 12px | 400 | "No more activity in this window"; `--ink-3` |
| Weekly view footer link | Plus Jakarta Sans | 13px | 500 | "View history →"; `--violet` |
| Spouse banner | Plus Jakarta Sans | 13px | 500 | Read-only role indicator (inherited L-009) |

### 1.2 Color Token Usage

| **Visual Purpose** | **Token** |
|---|---|
| Screen bg | `--bg` |
| Screen title text | `--ink` |
| Screen subtitle text ("Last 30 days") | `--ink-2` |
| Day section header — today/yesterday | `--ink` |
| Day section header — older | `--ink-2` |
| Day section divider | `--ink-4` |
| Item card bg | `--surface` |
| Item card border at rest | `--ink-4` |
| Item title text | `--ink` |
| Item metadata text | `--ink-2` |
| Dismissed reminder label text | `--ink-3` |
| Routine item left border + icon | `--mint` |
| Reminder item left border + icon | `--peach` |
| Meal item left border + icon | `--rose` |
| Inbox item left border + icon | `--sky` |
| List item left border + icon | `--violet` |
| Empty state headline text | `--ink-2` |
| Empty state body text | `--ink-3` |
| Footer end-of-window label | `--ink-3` |
| Weekly view footer link | `--violet` |
| Spouse banner bg | `--lavender-soft` |
| Spouse banner text | `--violet` |

### 1.3 Border Radius Reference

| **Element** | **Radius** |
|---|---|
| Item card (all workflow types) | `14px` |
| Spouse banner | `0px` (full-width, no radius) |
| Day header row | `0px` (flat layout element) |

### 1.4 Shadows

Item cards use `var(--shadow-sm)` at rest. No hover shadow is needed — activity history is a read-only surface. Tapping an item triggers navigation, not an in-place state change.

---

## 2. Screen Inventory

| **Identifier** | **Screen** | **State description** |
|---|---|---|
| HIST-1 | Activity History | Default: household has activity in the last 30 days (mixed workflow types) |
| HIST-2 | Activity History | Empty state: no completed activity in the last 30 days |
| HIST-3 | Activity History | High-volume day: a day with 10+ items (routines + list items) |
| HIST-4 | Activity History | Recent-only state: activity only in the last 3–4 days, older days sparse |
| HIST-5 | Activity History | Spouse view: per-screen read-only banner displayed |

---

## 3. Screen Layout

### 3.1 Screen Shell (All Activity History States)

```
┌──────────────────────────────────────────────────┐
│  Status bar (44px — native, not rendered)        │
├──────────────────────────────────────────────────┤
│  Header bar                                      │
│  ─────────────────────────────────────────────   │
│  [olivia wordmark — Fraunces italic, violet 30px]│
│                              [L avatar] [A avatar]│
│                                                  │
│  History              ← Fraunces 700, 28px        │
│  Last 30 days         ← PJS 13px, --ink-2         │
├──────────────────────────────────────────────────┤
│  [Spouse banner — conditional, full-width]       │
│  ← visible only for spouse sessions (L-009)      │
├──────────────────────────────────────────────────┤
│                                                  │
│  Scroll area                                     │
│  ─────────────────────────────────────────────   │
│  [Today — most recent day section]               │
│  [Yesterday — day-1 section]                     │
│  [Fri, Mar 13 — day-2 section]                   │
│  [Thu, Mar 12 — day-3 section]                   │
│  ...                                             │
│  ─────────────────────────────────────────────   │
│  [End-of-window footer — if all 30 days shown]   │
│  Bottom padding (safe area + 16px)               │
│                                                  │
├──────────────────────────────────────────────────┤
│  Bottom nav (66px)                               │
│  🏡 Home · ✅ Tasks · ✦ AI · ☑ Household · 🗂️Mem │
│  Memory tab (🗂️) is ACTIVE                       │
└──────────────────────────────────────────────────┘
```

**Header measurements:**
- Horizontal padding: 22px
- Wordmark + avatar row height: 44px
- Title row top margin: 8px
- Title to subtitle gap: 4px
- Header bottom padding: 16px
- Total header height (approximate): 96px

**Scroll behavior:**
- Header is sticky — does not scroll
- Scroll area begins below the header (and below the optional spouse banner)
- On open, scroll position is anchored to the top — the most recent day is immediately visible
- No auto-scroll to a specific date; the view always opens at the top

---

### 3.2 HIST-1: Default State (Household Has Recent Activity)

This is the primary use state. The household has completed and resolved activity across multiple workflow types in the last 30 days.

**Header area:**
```
olivia                                     [L] [A]
History
Last 30 days
```

**[Today section]:**
```
──────────────────────────────────────────────────────  ← no divider above today (it's the first item)
Today   ← PJS 13px 700, --ink

  ┌────────────────────────────────────────────────┐  ← --surface bg, 14px radius
  │ ↻  Morning walk                               │  ← mint 3px left border
  │    Completed · 7:04 AM                        │  ← PJS 12px, --ink-2
  └────────────────────────────────────────────────┘
  gap: 6px
  ┌────────────────────────────────────────────────┐
  │ ✓  Milk                                       │  ← violet 3px left border
  │    Grocery List · checked 10:32 AM             │
  └────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────┐
  │ ✓  Eggs                                       │  ← violet 3px left border
  │    Grocery List · checked 10:31 AM             │
  └────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────┐
  │ 🔔  Call insurance company                    │  ← peach 3px left border
  │     Completed · 2:15 PM                       │
  └────────────────────────────────────────────────┘
```

**[Yesterday section]:**
```
──────────────────────────────────────────────────────  ← --ink-4 divider, mx 0, full-width
Yesterday — Sat 14   ← PJS 13px 600, --ink

  ┌────────────────────────────────────────────────┐
  │ ↻  Evening tidy-up                            │  ← mint 3px left border
  │    Completed · 9:08 PM                        │
  └────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────┐
  │ ◆  Salmon with roasted vegetables             │  ← rose 3px left border
  │    Dinner · Week of Mar 9                     │
  └────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────┐
  │ ▷  Schedule HVAC service                      │  ← sky 3px left border
  │    Closed · Alex · 4:50 PM                    │
  └────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────┐
  │ 🔔  Review lease renewal                      │  ← peach 3px left border
  │     Dismissed · 11:02 AM                      │
  │     Dismissed                                 │  ← PJS 11px 500, --ink-3 (appears below metadata)
  └────────────────────────────────────────────────┘
```

**[Older day section]:**
```
──────────────────────────────────────────────────────
Fri, Mar 13   ← PJS 13px 500, --ink-2

  ┌────────────────────────────────────────────────┐
  │ ↻  Morning walk                               │
  │    Completed · 6:58 AM                        │
  └────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────┐
  │ ◆  Pasta carbonara                            │  ← rose
  │    Dinner · Week of Mar 9                     │
  └────────────────────────────────────────────────┘
```

**[End of window — when all days rendered or user reaches bottom of history]:**
```
──────────────────────────────────────────────────────
  No more activity in this 30-day window
  ← PJS 12px, --ink-3, centered, 24px vertical padding
```

---

### 3.3 HIST-2: Empty State (No Activity in Last 30 Days)

Shown when the household is new to Olivia or has no completed activity recorded in the rolling 30-day window.

```
┌──────────────────────────────────────────────────┐
│  olivia                              [L] [A]     │
│  History                                         │
│  Last 30 days                                    │
├──────────────────────────────────────────────────┤
│                                                  │
│       [centered, vertically mid-screen]          │
│                                                  │
│  *No activity yet.*                              │
│  ← Fraunces italic 17px, --ink-2                │
│                                                  │
│  Completed routines, resolved reminders, meals,  │
│  inbox items, and checked-off list items         │
│  will appear here.                               │
│  ← PJS 13px, --ink-3, centered, max-width 280px  │
│                                                  │
└──────────────────────────────────────────────────┘
│  🏡 Home · ✅ Tasks · ✦ AI · ☑ Household · 🗂️Mem │
└──────────────────────────────────────────────────┘
```

**Design notes:**
- No illustration, no graphic, no emoji decoration — the spec explicitly asks for a quiet record-keeper tone with no gamification
- The message is factual and informative, not apologetic
- Fraunces italic for the headline is consistent with how Olivia delivers calm informational messages throughout the app (e.g., "Nothing scheduled" in the weekly view empty day state)
- Centered layout uses top 30% of the scroll area for the content block so it appears mid-screen on a phone

---

### 3.4 HIST-3: High-Volume Day (10+ Items From Routines + List Items)

A day with many routine completions (e.g., multiple daily routines) and a full grocery run (many checked list items). This is the density stress test.

**Design approach:** All items are rendered. No clamping, no "show more". The section scrolls normally. The compact 52px row height keeps the section manageable even with 15–20 items.

```
──────────────────────────────────────────────────────
Yesterday — Sat 14

  ┌────────────────────────────────────────────────┐
  │ ↻  Morning walk              Completed · 7:01 AM│
  └────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────┐
  │ ↻  Medication                Completed · 8:00 AM│
  └────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────┐
  │ ✓  Milk                   Grocery List · 10:12 AM│
  └────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────┐
  │ ✓  Eggs                   Grocery List · 10:12 AM│
  └────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────┐
  │ ✓  Butter                 Grocery List · 10:13 AM│
  └────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────┐
  │ ✓  Bread                  Grocery List · 10:13 AM│
  └────────────────────────────────────────────────┘
  [... more list items ...]
  ┌────────────────────────────────────────────────┐
  │ ↻  Evening tidy-up           Completed · 9:15 PM│
  └────────────────────────────────────────────────┘
```

**Design notes:**
- Items with the same timestamp (list items checked within the same second) are ordered by item name alphabetically as a tiebreaker
- A run of many list items from the same list creates a visually coherent violet stripe column on the left — this actually helps the eye group them as a "grocery run" even without an explicit group header
- The compact row design (52px) means 10 items occupies approximately 520px — about half a phone screen — which is acceptable for a scroll-through history view
- Phase 2 note: if household usage reveals that list-item runs are consistently noisy, a grouped presentation ("17 items in Grocery List · 10:12 AM") should be evaluated

---

### 3.5 HIST-4: Recent-Only Activity (Sparse Older History)

When the household has activity in the last 3–4 days but nothing further back (typical for a new Olivia user or a household in a quiet period), the view shows the recent days followed quickly by the "no more activity" footer.

```
Today

  [item rows for today]

──────────────────────────────────────────────────────
Yesterday — Sat 14

  [item rows for yesterday]

──────────────────────────────────────────────────────
Fri, Mar 13

  [item rows for Friday]

──────────────────────────────────────────────────────

  No more activity in this 30-day window
  ← PJS 12px, --ink-3, centered
```

**Design notes:**
- No "this is as far back as Olivia has data" explanation is needed — the "Last 30 days" subtitle in the screen header already frames the window
- The end-of-window label is rendered at the bottom of the scroll content regardless of how many days have activity — it confirms to the user that they have reached the boundary of the view

---

### 3.6 HIST-5: Spouse View (Read-Only Banner)

The spouse sees the same history as the primary user, with the L-009 banner below the screen header.

```
┌──────────────────────────────────────────────────┐
│  olivia                              [L] [A]     │
│  History                                         │
│  Last 30 days                                    │
├──────────────────────────────────────────────────┤
│  [read-only banner — full width, 0px radius]     │
│  You're viewing in read-only mode                │
│  bg: --lavender-soft, text: --violet             │
│  PJS 13px 500                                    │
├──────────────────────────────────────────────────┤
│  [history content — identical to HIST-1]         │
│  ...                                             │
└──────────────────────────────────────────────────┘
```

**Design notes:**
- The banner does not include any affordances — no "Request access" or similar CTA. Activity history is inherently read-only for all users in Phase 1; the banner communicates this to the spouse without implying a privilege difference for this specific screen.
- Banner placement is consistent with all other H3 and H4 workflow screens (pinned below the header, above scroll content)

---

## 4. Item Row Anatomy

### 4.1 Standard Item Row (All Workflow Types)

All five workflow types use the same row shell with type-specific content in the metadata line.

```
┌──────────────────────────────────────────────────┐  ← --surface bg, 14px radius
│ ┃ [icon]  [Title text — 14px 500 --ink]          │  ← ┃ = 3px left border in accent color
│         [Metadata — 12px 400 --ink-2]             │
└──────────────────────────────────────────────────┘
```

**Measurements:**
- Row height: 52px (2-line content) or 64px for rows with a dismissed label (3-line)
- Left border: 3px, flush to card left edge, full row height, accent color
- Icon: 12px, rendered in accent color, 12px from left edge, vertically centered
- Title text left margin: 32px (12px border + 8px gap + 12px icon + 0px)
- Horizontal padding right: 16px
- Title line: 14px Plus Jakarta Sans 500, `--ink`
- Metadata line: 12px Plus Jakarta Sans 400, `--ink-2`, 2px below title

**Border and shadow:**
- Card border: `1.5px solid var(--ink-4)`
- Card shadow: `var(--shadow-sm)`
- Card spacing (between items in a day): 6px gap

**Tap behavior:**
- Full row is tappable — navigates to source workflow screen
- Press state: `transform: scale(0.98)` (200ms ease) — same as task card component
- No hover state on touch devices; hover: `box-shadow: var(--shadow-md)` on pointer devices

---

### 4.2 Routine Item Row

```
┌────────────────────────────────────────────────────────┐
│ ┃ ↻  Morning walk                                     │  ← mint left border + icon
│         Completed · 7:04 AM                           │
└────────────────────────────────────────────────────────┘
```

**Metadata format:** `Completed · [time]`
- Time is formatted as 12-hour with AM/PM: "7:04 AM", "9:15 PM"

---

### 4.3 Reminder Item Row (Completed)

```
┌────────────────────────────────────────────────────────┐
│ ┃ 🔔  Call insurance company                          │  ← peach left border + icon
│         Completed · 2:15 PM                           │
└────────────────────────────────────────────────────────┘
```

**Metadata format:** `Completed · [time]`

---

### 4.4 Reminder Item Row (Dismissed)

```
┌────────────────────────────────────────────────────────┐
│ ┃ 🔔  Review lease renewal                            │  ← peach left border + icon
│         Dismissed · 11:02 AM                          │
│         Dismissed                        ← 11px, --ink-3│
└────────────────────────────────────────────────────────┘
```

**Row height:** 64px (3-line)
**Metadata format:** `Dismissed · [time]` (primary line) + `Dismissed` label (secondary line, `--ink-3`, 11px 500)

**Design note:** The "Dismissed" label below the metadata line is a soft disambiguation for the household — it distinguishes "I completed the underlying task" from "I dismissed this reminder without completing the work." The label is deliberately understated (small, muted) to avoid making dismissed reminders feel accusatory. The household should be able to scan past dismissed reminders without feeling surveilled or judged.

---

### 4.5 Meal Entry Row

```
┌────────────────────────────────────────────────────────┐
│ ┃ ◆  Pasta carbonara                                  │  ← rose left border + icon
│         Dinner · Week of Mar 9                        │
└────────────────────────────────────────────────────────┘
```

**Metadata format:** `[Meal slot] · Week of [Mon date]`
- Meal slot: "Breakfast", "Lunch", or "Dinner"
- Week of: Monday date of the plan week, formatted as "Mar 9", "Mar 16", etc.

**Design note:** Meal entries do not have a precise time-of-day timestamp (they are associated with a plan week and day, not a clock time). In reverse-chronological ordering within a day, meal entries with midnight timestamps (00:00:00 inferred) sort to the bottom of their day section. This is acceptable — a meal plan entry for a given day represents "this is what we had that day" rather than a time-specific completion event.

---

### 4.6 Inbox Item Row

```
┌────────────────────────────────────────────────────────┐
│ ┃ ▷  Schedule HVAC service                            │  ← sky left border + icon
│         Closed · Alex · 4:50 PM                       │
└────────────────────────────────────────────────────────┘
```

**Metadata format:** `Closed · [owner] · [time]` — owner is included because inbox items have ownership semantics; seeing who closed an item is useful for household recall.

If no owner is assigned: `Closed · [time]`

---

### 4.7 Shared List Item Row

```
┌────────────────────────────────────────────────────────┐
│ ┃ ✓  Milk                                             │  ← violet left border + icon
│         Grocery List · 10:32 AM                       │
└────────────────────────────────────────────────────────┘
```

**Metadata format:** `[List name] · [time]`

**Design notes:**
- The list name is the primary secondary context — the household member needs to know which list this item belongs to (grocery vs. packing vs. other)
- If the list name is long, it is truncated with ellipsis at the end of the metadata line (max 1 line)
- No owner is shown for list items — they do not have owner semantics

---

## 5. Day Section Anatomy

### 5.1 Day Section Structure

```
[divider — --ink-4, 1px, full-width, except before first section]

[day header]
  ← PJS 13px, weight varies by day age (see §0.5)
  ← padding: 8px top, 8px bottom, 22px horizontal

[item rows — 6px gap between items]
  ← 16px horizontal padding (card container)
  ← 8px gap below last item row and before next divider
```

**Day header sizing:**
- Today: 13px 700 `--ink`
- Yesterday: 13px 600 `--ink`
- Older (within last 7 days): 13px 500 `--ink`
- Older (beyond 7 days): 13px 500 `--ink-2` (slightly more muted — emphasizes recent over distant)

**No divider before first section:** The first day section (most recent day with activity) has no divider above it — it follows directly from the header area.

---

### 5.2 Weekly View Footer Link (Secondary Nav Entry)

This element appears in the weekly view Home screen (`/`), below the Sunday day section and above the bottom nav safe area. It is part of the weekly view spec extension, not the activity history screen itself.

```
──────────────────────────────────────────────────────
  View history                              →
  ← PJS 13px 500, --violet, right-aligned chevron
  ← padding: 16px vertical, 22px horizontal
  ← taps to /history
──────────────────────────────────────────────────────
```

**Tap behavior:** Full-width tap target (consistent with other footer links). Navigates to `/history`.

**Implementation note:** This element is new to the weekly view (`home-page.tsx`). It should be added as a simple footer row below the last day section in the weekly view scroll content.

---

## 6. Interaction and Navigation

### 6.1 Item Tap → Deep Link to Source Screen

All item rows are tappable and navigate to the source workflow screen:

| **Item type** | **Navigation target** |
|---|---|
| Routine occurrence | Routine detail screen (`/household/routines/:routineId`) |
| Reminder (completed or dismissed) | Reminder detail screen (`/household/reminders/:reminderId`) |
| Meal entry | Meal plan day view (`/household/meals/:planId?day=:dayOfWeek`) |
| Inbox item | Inbox item detail screen (`/tasks/:itemId`) |
| Shared list item | List screen (`/household/lists/:listId`) |

**Design note:** Navigating to a completed or resolved item in its source screen is intentional — the household member may want to review details, re-open the item (from the source screen, not from history), or simply confirm what was done. Activity history never re-opens items directly.

### 6.2 Scroll Behavior

- Standard scroll — no sticky day headers within the scroll area (headers scroll with content)
- No "back to top" affordance in Phase 1
- Standard iOS/Android momentum scrolling

### 6.3 Pull-to-Refresh

No pull-to-refresh in Phase 1. Activity history renders from cached H3 state. If data is outdated (synced from another device), it updates automatically on next sync. A manual refresh is not needed for a history view.

---

## 7. Dark Mode Notes

Activity history requires no custom dark mode overrides beyond what token inheritance already provides. Key behaviors in dark mode:

- **Item cards:** `--surface` shifts to `#1C1A2E` (warm indigo, not cold grey). Cards remain legible and warm against the `--bg: #12101C` app background.
- **Day section dividers:** `--ink-4` in dark mode is `rgba(237,233,255,0.1)` — a very subtle warm white line, barely visible but provides structural rhythm.
- **Workflow-type accent colors:** All five accent colors (`--mint`, `--peach`, `--rose`, `--sky`, `--violet`) are unchanged between modes — they are vivid enough to read on the dark surface without adjustment.
- **Day headers:** `--ink` in dark mode is `#EDE9FF` (warm near-white), `--ink-2` is `rgba(237,233,255,0.6)`. Older day headers in `--ink-2` appear gently muted.
- **Spouse banner:** `--lavender-soft` shifts to `#2A2545` (deep indigo), `--violet` text remains `#6C5CE7`. The banner is identifiable but calm.
- **Empty state:** The Fraunces italic message in `--ink-2` and supporting text in `--ink-3` both resolve correctly in dark mode to warm near-white variants.

**No hardcoded hex values:** All color references in activity history components must use CSS custom properties. No hardcoded values.

---

## 8. Edge Cases

### 8.1 Today Has No Activity

If the current calendar day has no completed activity (the household hasn't completed anything yet today), the "Today" section is omitted entirely. The most recent section with activity becomes the first visible section. The "Last 30 days" subtitle still frames the window.

**Design note:** Unlike the weekly view, where all seven days of the current week are always shown (including empty days with "Nothing scheduled"), activity history only shows days with activity. An empty today is silently omitted, not shown as "Nothing done today." This is consistent with the feature spec's empty-day suppression rule.

### 8.2 Single Activity Day in the Entire 30-Day Window

If only one day in the 30-day window has activity, the screen shows:
- The single day section with its items
- The end-of-window footer ("No more activity in this 30-day window") immediately below

This is correct behavior — no "something went wrong" state is needed.

### 8.3 Long Item Titles

Item titles that exceed one line are truncated with ellipsis on mobile:
- Title area: single line, max available width (row width minus 32px left margin and 16px right padding)
- No wrapping in Phase 1 — all titles are single-line

If a title is truncated, it is still fully accessible on the source screen via the tap-through navigation.

### 8.4 Items with No Precise Timestamp (Midnight Default)

Workflow types that default to midnight (00:00:00) when no precise completion time is available (primarily meal entries, potentially some inbox items) will appear at the end of their day section in reverse-chronological order. The metadata line for these items omits the clock time and shows only the contextual label:

- Meal entries: `Dinner · Week of Mar 9` (no clock time shown — meal entries never have one)
- Inbox items with missing timestamp: `Closed · Alex` (clock time omitted if not available)

This avoids showing "Closed · Alex · 12:00 AM" as a misleading precision artifact.

### 8.5 Unchecked-After-Checked List Items

If a list item was checked and then unchecked (reuse of the list), it does not appear in activity history on the next render. No visual artifact or "removed" state is shown. The item simply is not present.

### 8.6 Tablet Layout

On tablet (768px+ viewport), the scroll area gains horizontal margins:
- Item cards max-width: 560px, centered
- Day section horizontal padding: 32px (from 22px)
- All other layout rules unchanged

No grid or multi-column layout — activity history remains single-column on all surfaces.

---

## 9. Token Assignment Summary

A complete reference of CSS token usage for the activity history implementation:

```css
/* Screen */
background: var(--bg);

/* Header */
.history-title { color: var(--ink); font-family: Fraunces; font-size: 28px; font-weight: 700; }
.history-subtitle { color: var(--ink-2); font-size: 13px; font-weight: 400; }

/* Day headers */
.day-header-today { color: var(--ink); font-size: 13px; font-weight: 700; }
.day-header-yesterday { color: var(--ink); font-size: 13px; font-weight: 600; }
.day-header-recent { color: var(--ink); font-size: 13px; font-weight: 500; }
.day-header-older { color: var(--ink-2); font-size: 13px; font-weight: 500; }

/* Day section divider */
.day-divider { border-top: 1px solid var(--ink-4); }

/* Item card */
.history-item {
  background: var(--surface);
  border: 1.5px solid var(--ink-4);
  border-radius: 14px;
  box-shadow: var(--shadow-sm);
}
.history-item:active { transform: scale(0.98); }

/* Item content */
.item-title { color: var(--ink); font-size: 14px; font-weight: 500; }
.item-meta { color: var(--ink-2); font-size: 12px; font-weight: 400; }
.item-dismissed-label { color: var(--ink-3); font-size: 11px; font-weight: 500; }

/* Workflow-type left borders */
.item-routine { border-left: 3px solid var(--mint); }
.item-routine .item-icon { color: var(--mint); }
.item-reminder { border-left: 3px solid var(--peach); }
.item-reminder .item-icon { color: var(--peach); }
.item-meal { border-left: 3px solid var(--rose); }
.item-meal .item-icon { color: var(--rose); }
.item-inbox { border-left: 3px solid var(--sky); }
.item-inbox .item-icon { color: var(--sky); }
.item-list { border-left: 3px solid var(--violet); }
.item-list .item-icon { color: var(--violet); }

/* Empty state */
.empty-headline { color: var(--ink-2); font-family: Fraunces; font-style: italic; font-size: 17px; font-weight: 300; }
.empty-body { color: var(--ink-3); font-size: 13px; font-weight: 400; }

/* End-of-window footer */
.history-end-label { color: var(--ink-3); font-size: 12px; font-weight: 400; }

/* Weekly view footer link */
.view-history-link { color: var(--violet); font-size: 13px; font-weight: 500; }

/* Spouse banner */
.spouse-banner { background: var(--lavender-soft); color: var(--violet); }
```

---

## 10. Design Checklist

Before marking this spec complete, the following criteria must be satisfied:

- [x] Both light and dark modes specified via CSS tokens — no hardcoded hex values
- [x] All five workflow types have distinct color + icon pairings
- [x] Shared list item type (5th type) introduced with rationale and token assignment
- [x] Navigation entry point resolved (Memory tab primary + weekly view footer link secondary)
- [x] Empty state designed with correct tone (quiet record-keeper, no gamification)
- [x] Spouse banner placement specified consistent with L-009
- [x] High-volume day edge case addressed (HIST-3)
- [x] Dismissed reminder visual treatment resolved (OQ-2)
- [x] Item title treatment resolved (full opacity, no strikethrough — rationale documented in §0.4)
- [x] Meal entry timestamp handling specified (no clock time shown)
- [x] Tablet layout addressed
- [x] All 20 acceptance criteria from the feature spec have corresponding visual coverage
- [x] Token assignment summary provided for implementation use

---

## 11. Open Questions for Founding Engineer

The following questions from the feature spec (OQ-4) remain open and should be resolved before Phase 6 (PWA screen component) implementation begins:

**Q1 — Completion timestamp availability:** Does the current domain layer store precise completion timestamps for all five data sources? Specifically:
- Routine occurrences: `completed_at` field — available?
- Reminders: `resolved_at` field — available?
- Inbox items: resolved as `lastStatusChangedAt` per the implementation plan (Decision B)
- Shared list items: `checked_at` field — available? (assumed in spec)
- Meal entries: no clock time needed — date-only derivation confirmed

**Q2 — Memory tab current content:** If the Memory tab currently routes to non-history content, what should the tab's behavior be? Options:
- Activity history fully replaces Memory tab content (parallel to how weekly view replaced Home tab content)
- Memory tab shows a screen with activity history as the primary section
- Founding Engineer confirms current Memory tab route and content before `/history` routing is finalized

**Implementation note from plan:** The implementation plan (OLI-49) specifies Phase 5 as "PWA route entry point (router + nav wiring)" — this includes confirming the Memory tab route update. Visual spec supports the `/history` route with Memory tab active.

---

*This visual spec resolves all seven designer decisions listed in OLI-48. The Founding Engineer should review Section 11 (Open Questions) before beginning Phase 6 implementation.*
