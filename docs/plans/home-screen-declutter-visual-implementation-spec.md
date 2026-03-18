---
title: "Olivia — Home Screen Declutter: Visual Implementation Spec"
subtitle: "Today-Forward layout — calm daily briefing over full weekly calendar"
date: "March 2025"
status: "Approved and implemented (D-055, OLI-114)"
---

# Olivia — Home Screen Declutter
## Visual Implementation Spec
*Today-Forward layout — calm daily briefing over full weekly calendar*

*March 2025 · Revised with accessibility fixes — resubmitted for final sign-off*

---

> **Problem statement**
>
> The current home screen renders a full 7-day weekly view where every day shows three workflow sections (Routines, Reminders, Meals) — even when they are empty. With 7 day headers, up to 21 section headers, and empty-state slots for every empty section, the result is an overwhelming wall of scaffolding that directly violates the product ethos: "Every feature should reduce coordination burden, not create another inbox, dashboard, or maintenance task."
>
> **Design goal**
>
> Restore the Home screen to a **calm daily briefing** — glanceable, grounded, and warm. Show what matters today. Tuck the rest of the week behind a single tap.

---

## 1. Design Principles Applied

This redesign is guided by three product ethos principles:

| Principle | How it applies |
|---|---|
| **Reduce cognitive load** | Only surface today's content in full detail. Future days are collapsed or hidden. Empty sections don't render at all. |
| **Calm competence** | The home screen should orient the user in under 10 seconds (per design-screens.md). A 7-day scaffolding fails this test. |
| **Shared clarity over individual heroics** | Today's items are clear and prominent. The "rest of the week" is accessible but not competing for attention. |

---

## 2. Screen Inventory

| Screen ID | State | Mode | Description |
|---|---|---|---|
| HOME-NEW-1 | Today has items, upcoming days have items | Light | Primary state: today section expanded, upcoming summary visible |
| HOME-NEW-2 | Today has items, no upcoming items | Dark | Today section only, no upcoming preview, calm empty |
| HOME-NEW-3 | Today is empty, upcoming days have items | Light | Warm empty-today message from Olivia, upcoming summary below |
| HOME-NEW-4 | Everything empty (new user / clear week) | Dark | Full empty state with Olivia welcome message |
| HOME-NEW-5 | Overdue items present | Light | Overdue badge on today items, nudge card visible |
| HOME-NEW-6 | Today with nudge tray active | Dark | Proactive nudge tray + today section |

---

## 3. Layout Architecture

The new Home screen has four vertical zones, replacing the current 7-day grid:

```
┌──────────────────────────┐
│  Header                  │  Sticky. Greeting + wordmark + avatars.
├──────────────────────────┤
│  Nudge area (optional)   │  Nudge tray + Olivia suggestion card.
├──────────────────────────┤
│  Today section           │  Full-detail cards for today's items.
│  (hero zone)             │  Only populated workflow sections render.
├──────────────────────────┤
│  Workflow nav row        │  Persistent pill links: Routines · Reminders
│  (always visible)        │  · Meals · Lists. Always rendered.
├──────────────────────────┤
│  Upcoming preview        │  Compact summary rows for next 1-3 days
│  (collapsed)             │  that have content. "This week →" link.
├──────────────────────────┤
│  Bottom nav              │  Always visible.
└──────────────────────────┘
```

### 3.1 Semantic landmarks

Each content zone should map to an appropriate HTML landmark for screen reader navigation:

| Zone | Element | Accessible name |
|---|---|---|
| Header | `<header>` | Greeting text (e.g. "Good morning, Lexi") |
| Today section | `<section aria-label="Today">` | "Today" |
| Workflow nav row | `<nav aria-label="Workflows">` | "Workflows" |
| Upcoming preview | `<section aria-label="Coming up">` | "Coming up" |

### 3.2 What changed from the current layout

| Current behavior | New behavior |
|---|---|
| 7 day sections always rendered | Only today rendered in full; upcoming days collapsed |
| Empty workflow sections show dashed empty-state slots | Empty sections are **hidden entirely** — no header, no slot |
| "This week" title, neutral tone | Time-aware greeting restored: "Good morning, Lexi." |
| Day headers for every day including empty ones | Days with no content are invisible on home |
| User must scroll through empty days to find content | Content density is high — every visible element has data |
| Weekly date range label as subtitle | Contextual subtitle: "N things today" or "Nothing urgent — enjoy your day" |

---

## 4. Header

Restore the warm, time-aware greeting from the original design (per design-screens.md Home Screen > Header).

```
wordmark ("olivia" — Fraunces italic, violet-text, 30px) [Avatar stack]
Good morning,                                            ← Fraunces 700, 32px
Lexi.                                                    ← Fraunces italic 400, violet (large text — AA passes at 3:1)
Monday, March 16 · 2 things today                       ← Plus Jakarta Sans 13px, --ink
```

### 4.1 Greeting logic

| Time range | Greeting |
|---|---|
| 4:00 AM – 11:59 AM | Good morning, |
| 12:00 PM – 4:59 PM | Good afternoon, |
| 5:00 PM – 3:59 AM | Good evening, |

### 4.2 User name source

The greeting name ("Lexi" in examples) must be sourced from **household config** — the existing member data that stores household member names. It must not be hardcoded. The current implementation has hardcoded avatar initials; the engineer will need to read the member name from household config for this greeting. Fallback: omit the name line entirely if no name is configured (render only "Good morning," without a second line).

### 4.3 Subtitle logic

The subtitle dynamically reflects today's state:

| Condition | Subtitle text |
|---|---|
| N items due/overdue today (N > 0) | "{day}, {date} · {N} things today" |
| No items today, upcoming items exist | "{day}, {date} · Nothing urgent — enjoy your day" |
| No items at all this week | "{day}, {date} · Your week looks clear" |

### 4.4 Token usage

| Element | Token |
|---|---|
| "Good morning," text | `--ink`, Fraunces 700, 32px |
| User name ("Lexi.") | `--violet`, Fraunces italic 400, 32px (large text — passes AA at 3:1 in dark mode) |
| Subtitle line | `--ink`, Plus Jakarta Sans 13px, 400 |
| Wordmark | `--violet-text`, Fraunces italic, 30px |
| Settings gear icon | `--ink-2`, 20px |

---

## 5. Today Section (Hero Zone)

This is the primary content area. It replaces the current per-day `DaySection` for today only.

### 5.1 Section header

```
TODAY                                                    ← Plus Jakarta Sans 11px/700, --violet-text, letter-spacing 1.4px
Monday, March 16                                         ← Plus Jakarta Sans 12px/500, --ink
```

The "TODAY" badge uses the existing `wv-today-badge` styling. The date label sits on the same row, right-aligned.

### 5.2 Workflow rendering rules

**Critical change:** Only render a workflow section if it has at least one item for today.

| Today has… | What renders |
|---|---|
| 2 routines, 1 reminder, 0 meals | Routines section + Reminders section. No Meals section at all. |
| 0 routines, 0 reminders, 1 meal | Meals section only. |
| 0 everything | Olivia empty-today message (see §5.4). No section headers. |

### 5.3 Workflow section layout (when items exist)

Each workflow section that has items renders identically to the current `wv-workflow-section`, minus the empty-state slots:

```
┌─ ROUTINES ────────────────────────── All → ─┐
│  [RoutineCard]                               │
│  [RoutineCard]                               │
└──────────────────────────────────────────────┘
```

- Section header: `wv-workflow-header` with label + "All →" link (unchanged)
- Item cards: existing `WeekItemCard` components (unchanged)
- Spacing: `wv-workflow-section` margin-bottom: 16px between sections
- Max items shown: **4 per section**. If more, show "N more →" link below last card

### 5.4 Empty today state

When today has zero items across all workflows, show an Olivia message instead of empty scaffolding:

```
┌──────────────────────────────────────────────┐
│  ✦ Olivia                                    │  11px/700, --violet-text, uppercase
│                                              │
│  Nothing on the calendar today —             │  Fraunces italic 16px/400, --ink
│  a good day to check on your routines        │
│  or plan the week ahead.                     │
│                                              │
│  [Browse routines →]  [Browse reminders →]   │  Ghost buttons, --ink text, violet left-border accent
│  [Browse meals →]                            │
└──────────────────────────────────────────────┘
```

- Container: `background: var(--surface-2)`, `border-radius: 18px`, `padding: 16px 18px`
- Text: Fraunces italic 16px/400, `--ink`, `line-height: 1.5`
- Ghost buttons: Plus Jakarta Sans 12px/600, `--ink` text, `border-left: 2px solid var(--violet)`, padding 8px 0 8px 10px. The violet accent preserves brand presence while `--ink` text ensures legibility on `--surface-2` (which fails AA with `--violet` in light mode at 4.33:1).

### 5.5 Dark mode notes (Today section)

No special overrides needed. All components use token-based styling that resolves automatically. The `--surface-2` empty-state container shifts from `#F3F0FF` to `#242038`.

---

## 6. Workflow Navigation Row (Persistent)

A compact row of pill-style links that provides persistent navigation to all workflow list pages, regardless of whether today has items for that workflow. This preserves the OLI-110 intent (empty-state navigation) without re-introducing empty scaffolding sections.

### 6.1 Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [Routines]   [Reminders]   [Meals]   [Lists]               │
└──────────────────────────────────────────────────────────────┘
```

- **Always visible** on the Home screen, between the Today section and the "COMING UP" preview
- Renders in all states: items present, today empty, everything empty
- Each pill links to its respective list page (`/routines`, `/reminders`, `/meals`, `/lists`)

### 6.2 Pill styling

| Property | Value |
|---|---|
| Font | Plus Jakarta Sans 11px/600 |
| Color | `--violet-text` |
| Background | transparent |
| Border | 1px solid `--violet-border` (~30% opacity violet, meets WCAG 1.4.11 non-text contrast 3:1) |
| Border radius | 20px |
| Padding | 6px 14px |
| Min tap target | 44px height (with padding/margin) |
| Gap between pills | 8px |
| Row padding | 16px horizontal, 12px vertical |

### 6.3 Interaction

- Tap navigates to the corresponding list page (same behavior as tappable section headers from OLI-108)
- No active/selected state — these are navigation shortcuts, not tabs

### 6.4 Dark mode

`--violet-text` resolves to `--violet-2` (#9D93F7) in dark mode, ensuring pill text meets AA contrast (7.12:1 on `--bg`). `--violet-border` maintains perceivable boundaries in both modes.

---

## 7. Upcoming Preview (Collapsed)

Below the Today section, show a compact summary of the next few days — but only days that have content.

### 7.1 Rendering rules

- Scan the remaining 6 days of the week (or next 6 days if near week boundary)
- For each day that has **at least one item** across any workflow, render a compact summary row
- Show at most **3 upcoming summary rows**
- Days with zero items are skipped entirely
- If no upcoming days have content, hide this entire section

### 7.2 Summary row anatomy

Each upcoming day with content renders as a single tappable row:

```
┌──────────────────────────────────────────────┐
│  Tue 17     2 routines · 1 reminder          │
│             ───────────────────────────────── │
│  Wed 18     1 meal                           │
│             ───────────────────────────────── │
│  Fri 20     3 reminders                      │
└──────────────────────────────────────────────┘
                This week →
```

| Element | Spec |
|---|---|
| Day label | Plus Jakarta Sans 13px/600, `--ink` |
| Item summary | Plus Jakarta Sans 12px/400, `--ink` |
| Row padding | 12px vertical, 16px horizontal |
| Divider | 1px `--ink-4`, margin 0 16px |
| Row tap action | Navigates to `/week` route (filtered to that day if feasible) |
| Container | `background: var(--surface)`, `border-radius: 18px`, `box-shadow: var(--shadow-sm)` |

### 7.3 "This week" link

Below the last summary row (or below the Today section if no upcoming days have content):

```
This week →
```

- Plus Jakarta Sans 12px/600, `--violet-text`
- Tap navigates to a dedicated `/week` route
- Tap target: 44px minimum height

### 7.4 Item summary text format

Combine counts by workflow type, separated by ` · `:

| Items for day | Summary text |
|---|---|
| 2 routines, 1 reminder | "2 routines · 1 reminder" |
| 1 meal | "1 meal" |
| 1 routine, 2 reminders, 1 meal | "1 routine · 2 reminders · 1 meal" |
| 3 inbox items | "3 inbox items" |

Use singular/plural correctly: "1 routine" vs "2 routines".

**Accessibility note:** The ` · ` separator should use `<span aria-hidden="true"> · </span>` so screen readers don't announce "middle dot" or "bullet". The accessible text should use commas or natural list reading instead.

### 7.5 Section header

Above the summary rows, a subtle section label:

```
COMING UP                                                ← Plus Jakarta Sans 11px/700, --ink-2, letter-spacing 1.4px
```

Only rendered if at least one upcoming day has content.

---

## 8. State Transitions & Interactions

### 8.1 Initial load

1. Header renders immediately (greeting, avatars)
2. Nudge tray loads asynchronously (existing behavior)
3. Today section skeleton: 2 loading bars while `weeklyQuery` resolves
4. On data arrival: today items animate in with `taskIn` stagger (0.05s interval)
5. Upcoming preview fades in after today items complete (0.15s delay)

### 8.2 No auto-scroll needed

Since the full 7-day grid is gone, there is no need to `scrollIntoView('#today-section')`. Today is always the first content section. Remove the `useEffect` that currently does this scroll.

### 8.3 Pull-to-refresh

Existing query refresh behavior is unchanged. On data refresh:
- Today section items re-stagger with `taskIn`
- Upcoming preview recalculates

### 8.4 Completing an item from Home

When a user taps a card and completes an item:
- Card animates out (`opacity → 0, translateX(20px)`, 200ms)
- If the workflow section becomes empty after this, the section header also fades out (300ms)
- Subtitle count updates
- If today becomes fully empty, the Olivia empty message fades in (400ms)

### 8.5 Reduced motion support

All animations described in §8.1–8.4 must respect `prefers-reduced-motion: reduce`. When reduced motion is preferred:

- Items appear immediately — no stagger delay, no `taskIn` animation
- Section show/hide is instant — no fade-in or fade-out transitions
- Card completion uses `opacity → 0` only (no `translateX` slide), duration reduced to 0ms
- Upcoming preview appears immediately — no delay after today items

This can be implemented with a single CSS media query that overrides animation durations and delays to `0s`.

---

## 9. Token Usage Summary

| Visual element | CSS token(s) |
|---|---|
| App background | `--bg` |
| Today section card bg | `--surface` |
| Upcoming preview card bg | `--surface` |
| Empty-today message bg | `--surface-2` |
| "TODAY" badge text | `--violet-text` (new semantic token) |
| "TODAY" badge bg | `--violet-dim` |
| Greeting name | `--violet`, Fraunces italic 400 (large text — passes AA at 3:1 in dark) |
| Subtitle | `--ink` |
| Section labels (ROUTINES) | `--violet-text` |
| Section label (COMING UP) | `--ink-2` |
| Summary row day label | `--ink` |
| Summary row item text | `--ink` |
| Dividers | `--ink-4` |
| "This week →" / "All →" links | `--violet-text` |
| Card shadows | `--shadow-sm` |
| Workflow nav pills text | `--violet-text` |
| Workflow nav pills border | `--violet-border` (~30% opacity) |
| Ghost buttons (empty-today) | `--ink` text, `--violet` left-border accent |
| Wordmark | `--violet-text` |
| Workflow item cards | Unchanged — use existing token bindings |

---

## 10. Dark Mode Notes

This redesign introduces two new semantic tokens for accessibility. All other elements use existing CSS variable tokens that resolve correctly in both modes:

**New tokens:**
- `--violet-text`: resolves to `--violet` (#6C5CE7) in light mode, `--violet-2` (#9D93F7) in dark mode. Used for all small-text violet elements (badges, links, pill labels, wordmark). Achieves 7.12:1 on dark `--bg` vs the 3.87:1 that raw `--violet` produces.
- `--violet-border`: ~30% opacity violet for UI component boundaries. Meets WCAG 1.4.11 non-text contrast (3:1) in both modes, unlike `--violet-dim` (10-18% opacity, ~1.1:1).

**Existing token behavior (unchanged):**
- The empty-today `--surface-2` container becomes `#242038` in dark — warm and distinct from `--bg`
- Upcoming preview card uses `--surface` → `#1C1A2E`, naturally elevated
- All text uses `--ink` / `--ink-2` which invert correctly
- Shadow tokens automatically strengthen in dark mode
- The greeting italic name in `--violet` at 32px qualifies as large text and passes AA at 3:1 in dark mode

---

## 11. Edge Cases

### 11.1 Week boundary

If today is Saturday or Sunday, "upcoming" should look ahead into the next week's data. This may require fetching two weeks of data when near the boundary. Fallback: show only the remaining days in the current week.

### 11.2 Overdue items from previous days

Overdue routines or reminders from past days should surface in the Today section with an "OVERDUE" / "NEEDS ATTENTION" badge — they should not silently disappear because their original day has passed.

### 11.3 Inbox items

Inbox items follow the same rule: only render the INBOX workflow section in Today if there are inbox items for today. No empty state for inbox (consistent with current behavior).

### 11.4 Spouse banner

The SpouseBanner continues to render in the header area when `role === 'spouse'` (unchanged).

### 11.5 Long weeks

If all 6 upcoming days have content, show only the first 3 in the preview. The "This week →" link provides access to the rest.

---

## 12. What Is NOT Changing

To limit scope and preserve consistency:

- **Item card components** (`WeekItemCard`, `RoutineCard`, `ReminderCard`, `MealCard`, `InboxItemCard`) — unchanged
- **Nudge card and nudge tray** — unchanged
- **Bottom nav** — unchanged
- **Create/edit sheets** — unchanged
- **Navigation to detail views** — unchanged (tap card → navigate to detail route)
- **Data fetching** (`loadWeeklyView`) — unchanged, but the rendering layer filters to today + upcoming summary
- **All other screens** (Tasks, Olivia, Memory) — unchanged

---

## 13. Resolved Design Questions

1. **"This week →" routing** — **Resolved: new `/week` route.** The engineer should extract the existing 7-day grid rendering into a dedicated `/week` route. Home stays focused; the full weekly view becomes an opt-in surface.

2. **Overdue items** — **Resolved: surface inline in Today with overdue badges**, not a separate section. Overdue items from past days appear in the Today hero zone with existing `NEEDS ATTENTION` badge styling.

3. **Max items per section** — **Resolved: 4 with "N more →" link.** Engineer can adjust later based on real usage.

4. **Day expansion (previously §6.3)** — **Deferred to fast-follow (M29).** Summary rows are tap targets for the `/week` route (filtered to that day if feasible), not dead UI. Inline expand/collapse adds significant implementation complexity for a nice-to-have — ship without it first, add based on usage feedback.

---

*— End of specification —*
