---
title: "Olivia — Proactive Household Nudges: Visual Implementation Spec"
date: "March 2026"
status: "Design handoff for agentic implementation"
---

# Olivia — Proactive Household Nudges
## Visual Implementation Spec

*March 2026 · Design handoff for agentic implementation*

---

> **Scope of this document**
>
> This spec defines every UI state required to implement proactive household nudges — the second Horizon 5 feature. It covers the nudge tray section on the home screen, the anatomy and visual treatment of each nudge card variant (routine, reminder, planning ritual), action button affordances, dismiss interaction, the "+" overflow indicator, the navigation count badge, empty state, offline and error states, and dark mode behavior.
>
> Key design decisions resolved here: nudge tray placement (dedicated section at the top of home screen content, above all other sections); nudge card design (compact surface card with left accent stripe and workflow-type icon, distinct from the AI voice Olivia Nudge Card); workflow-type visual differentiation (mint/↻ for routines, rose/bell for reminders, violet/calendar for planning rituals, matching existing H3/H4 color/icon language); action button affordances (primary + ghost pair for routine and reminder; full-width primary for planning ritual); dismiss interaction (× tap in top-right corner, no confirmation); navigation count badge (rose dot badge on the Home tab icon); "+" overflow row (shown when active nudge count exceeds display cap); and empty state treatment (tray section completely absent — no placeholder rendered).

---

## 0. Design Decisions Resolved

The following questions were open in `docs/specs/proactive-household-nudges.md` or were designated as designer decisions in the task description. Each is resolved here with rationale.

---

### 0.1 Nudge Tray Placement

**Decision:** The nudge tray appears as a dedicated section at the **top of the home screen content area**, immediately below the greeting header and above all other home screen sections ("Needs doing," "Coming up," etc.).

**Rationale:** Nudges are time-sensitive and represent the highest-priority household actions at the moment of opening the app. Placing them first — before passive summary sections — ensures they receive attention without requiring the household member to scroll. A dedicated section (not a floating card, not an overlay above the bottom nav) keeps the layout clean and fits the home screen's established sectional rhythm. When no nudges are active, the section is completely absent and the home screen reverts to its normal composition — no empty region, no collapsed control. This follows the empty-state principle from the feature spec: "the absence of nudges is the normal state."

The nudge tray is NOT the same as the existing AI voice "Olivia Nudge Card" gradient component. Those two elements may coexist on the home screen: the new nudge tray (if active nudges exist) appears first, followed by the existing Olivia Nudge Card (if an AI-voice suggestion exists), then the standard content sections. In practice, if neither is active, both are absent and the home screen shows its normal sections.

**Anti-pattern rejected:** A floating card above the bottom nav would interfere with navigation affordances and create a cramped, ambiguous interaction zone. A persistent strip at the very top of the viewport would feel alarm-like and increase visual anxiety — contrary to Olivia's calm-competence principle.

---

### 0.2 Nudge Card Design — Compact Action Card, Not AI Voice Card

**Decision:** Each nudge card is a **compact surface card** with:
- A left accent stripe (3px wide) in the workflow-type accent color
- A workflow-type icon container (32×32px, 12px radius, soft tinted background)
- Item name and trigger condition text
- A dismiss × control in the top-right
- Action buttons in a row at the bottom of the card

This is visually distinct from the AI voice Olivia Nudge Card (gradient violet, decorative circles, Fraunces italic, full-bleed). The two component types serve different purposes and must not be confused.

**Rationale:** The AI voice Olivia Nudge Card is a first-person voice from Olivia, presenting an open-ended suggestion. Proactive nudge cards are structured, action-specific prompts for defined household states. Using the compact card treatment (consistent with how task cards and routine cards work throughout the app) makes them recognizable as household items while the workflow-type accent differentiates them clearly. The priority hierarchy (planning ritual → reminder → routine) is communicated through visual prominence: the planning ritual card gets an additional visual weight cue (see §0.5).

---

### 0.3 Action Button Affordances

**Decision:**

- **Routine nudge:** Two buttons — "Mark done" (primary, left) and "Skip" (ghost, right). Sufficient horizontal separation (8px minimum gap) to prevent accidental taps.
- **Reminder nudge:** Two buttons — "Done" (primary, left) and "Snooze" (ghost, right).
- **Planning ritual nudge:** One full-width button — "Start review →" (primary).

**Button sizing:** Minimum 44px height for all action buttons (mobile tap target standard). On the standard 390px frame with 16px horizontal card padding, two-button rows have each button spanning approximately 140px width with the 8px gap and remaining edge padding.

**Primary button style:** Standard `.btn-primary` variant (`background: var(--violet)`, `color: white`, `border-radius: 12px`), not a workflow-type–colored button. The workflow type is already communicated by the left stripe and icon; using violet for all primary actions keeps the action hierarchy consistent and predictable.

**Ghost button style:** `.btn-secondary` variant (`background: var(--lavender-soft)`, `color: var(--violet)`, `border-radius: 12px`). This makes both buttons feel equal in tap affordance while maintaining clear primary/secondary hierarchy.

**Rationale for single-button ritual card:** The planning ritual has no skip or dismiss-style secondary action — it either gets started or the household member dismisses the whole nudge. Adding a "Skip" or "Snooze" button to the ritual card would normalize avoiding the review ritual, which is the wrong behavioral signal. The household member can always dismiss the nudge card if they don't want to start now.

---

### 0.4 Dismiss Interaction

**Decision:** A small **× icon button** in the top-right corner of each nudge card. No confirmation dialog. Tap executes dismiss immediately (consistent with D-010: non-destructive user-initiated actions execute immediately). The card animates out (see §0.9 for motion).

**Touch target:** The × button renders as a 20×20px icon (`color: var(--ink-3)`) within a 40×40px touch target area.

**Rationale:** Swipe-to-dismiss is a reasonable pattern but introduces ambiguity about direction and requires the household member to understand the swipe affordance without a visible hint. A visible × icon is immediately legible on first use. Swipe-to-dismiss may be added in a future iteration once the interaction is well-understood by the household.

---

### 0.5 Planning Ritual Nudge — Elevated Visual Treatment

**Decision:** The planning ritual nudge card is visually elevated relative to routine and reminder nudge cards:
- Left accent stripe: `--violet` (3px) instead of the workflow-type mint or rose
- Icon container background: `--lavender-soft` with a violet calendar/clipboard icon
- Card border: `1.5px solid var(--lavender-mid)` instead of the standard `--ink-4`
- The card appears first in the tray (priority ordering follows the spec)

**Rationale:** The feature spec states: "Planning ritual nudges should feel more prominent than routine or reminder nudges. The planning ritual is a synthesis moment — surfacing it proactively has more household impact." Giving the ritual card the violet treatment (Olivia's brand color) signals its special status without making it garish. It reads as "Olivia considers this important" rather than "this item is urgent/overdue."

---

### 0.6 Navigation Count Badge

**Decision:** A **rose dot badge** with a count number appears on the Home tab icon in the bottom navigation when one or more active nudges exist.

**Badge anatomy:**
- Position: top-right of the Home tab icon, partially overlapping
- Size: 16px diameter circle
- Background: `--rose` (`#FF7EB3` / accent rose, same in both modes)
- Text: count number, 10px bold PJS, white, centered
- Cap: shows "9+" when count > 9

**When empty:** Badge is completely absent (not a hollow ring, not a 0 count).

**Rationale:** A count badge on the nav tab allows the household member to know nudges are waiting without requiring them to first arrive at the home screen. The rose accent is distinct from the violet active-nav highlight and from any other badge color in the system, giving nudge count its own identity. Rose is also appropriate — it's the same color as overdue/urgent states elsewhere in the app, reinforcing "these need attention."

The badge is NOT placed on a separate "Notifications" icon or floating button. The home screen is the natural location for the nudge tray; the badge belongs on the home nav item.

---

### 0.7 "+" Overflow Indicator

**Decision:** When active nudges exceed the display cap (Founding Engineer decision; visual spec uses 5 as the recommended cap), a single text row appears below the last displayed nudge card:

```
+ 3 more items   →
```

- Typography: 13px PJS medium, `color: var(--ink-2)`
- Trailing arrow: same style
- Tap target: full-width row, 44px height
- Tap behavior: Founding Engineer decision — could expand the tray to show all nudges, or navigate to a full nudge list view (not yet defined for Phase 1)

**Rationale:** Showing all overdue items without a cap would turn the nudge tray into a stress-inducing backlog list, exactly counter to Olivia's calm-competence principle. The cap + count row communicates "there's more" without displaying everything simultaneously.

---

### 0.8 Empty Nudge State

**Decision:** When no nudges are active, the nudge tray section is **completely absent from the home screen DOM**. No empty state message, no collapsed container, no placeholder.

**Rationale:** The feature spec explicitly states: "If no nudges are active, the nudge area should not be present or should show nothing — not an empty state message. The absence of nudges is the normal state." Showing any empty state would normalize the tray's presence and add visual clutter during the majority of interactions when no items are overdue.

---

### 0.9 Nudge Card Motion — Entry and Exit

**Decision:**
- **Entry (nudge tray appears):** The tray section fades and slides in from the top — `opacity: 0 → 1`, `transform: translateY(-8px) → translateY(0)`, duration 220ms, ease-out. Each card staggers by 40ms.
- **Exit (single card dismissed or actioned):** The individual card collapses — `opacity: 1 → 0`, `height: current → 0` with `overflow: hidden`, duration 200ms, ease-in. The card below slides up to fill the gap without jarring reflow.
- **Tray disappears (last card gone):** Entire section fades out, duration 180ms.

This follows the motion principles in `docs/vision/design-motion-voice.md`: "Transitions should feel deliberate and calm, not bouncy or attention-seeking."

---

## 1. Screen Inventory

| Screen State ID | Screen | Description |
|---|---|---|
| NUDGE-HOME-1 | Home (nudges active, 1–5) | Normal active nudge state |
| NUDGE-HOME-2 | Home (nudges active, >5) | Overflow state with "+ N more" row |
| NUDGE-HOME-3 | Home (no nudges) | Normal home screen — no tray rendered |
| NUDGE-HOME-4 | Home (spouse read-only, nudges active) | Spouse banner + nudge tray, actions disabled |
| NUDGE-CARD-ROUTINE | Nudge card | Routine overdue card anatomy |
| NUDGE-CARD-REMINDER | Nudge card | Reminder approaching/overdue card anatomy |
| NUDGE-CARD-RITUAL | Nudge card | Planning ritual overdue card anatomy (elevated) |
| NUDGE-ACTION-DONE | Nudge card transition | Card exits after "Mark done" or "Done" tap |
| NUDGE-ACTION-DISMISS | Nudge card transition | Card exits after × dismiss tap |
| NUDGE-BADGE | Bottom nav | Count badge on Home tab |
| NUDGE-OFFLINE | Home | Offline state — stale or empty nudge tray |

---

## 2. Home Screen — Nudge Tray Section

### 2.1 NUDGE-HOME-1: Active Nudges (1–5 cards)

The home screen with the nudge tray present renders as:

```
┌──────────────────────────────────────────┐
│  [header: olivia wordmark + avatars]     │
│  Good morning,                           │
│  Lexi.                                   │
│  Sunday, Mar 15 · 2 things need you      │
├──────────────────────────────────────────┤
│  ╔════════════════════════════════════╗  │  ← nudge tray section (no section title)
│  ║  NUDGE-CARD-RITUAL                 ║  │    starts here; planning ritual first
│  ╚════════════════════════════════════╝  │
│                                          │
│  ╔════════════════════════════════════╗  │
│  ║  NUDGE-CARD-REMINDER               ║  │
│  ╚════════════════════════════════════╝  │
│                                          │
│  ╔════════════════════════════════════╗  │
│  ║  NUDGE-CARD-ROUTINE                ║  │
│  ╚════════════════════════════════════╝  │
│                                          │
├──────────────────────────────────────────┤
│  [Olivia Nudge Card — if AI suggestion   │
│   is present, appears here below tray]   │
├──────────────────────────────────────────┤
│  Needs doing                  All → │
│  [task cards...]                         │
│                                          │
│  Coming up                               │
│  [event tiles...]                        │
└──────────────────────────────────────────┘
```

**Section layout details:**
- Nudge tray has no section header label (unlike "Needs doing" which has a title). The cards speak for themselves.
- Vertical gap between nudge cards: `12px`
- Tray left/right margin: `16px` (matches card container horizontal padding)
- Tray top padding: `16px` below the greeting header divider
- Tray bottom padding: `16px` before the next section begins

**When the Olivia AI voice nudge card also exists:** Both sections are visible. The nudge tray (actionable household items) appears above the AI voice card (Olivia's authored suggestion). The AI card retains its existing gradient treatment. These are visually distinct: nudge tray cards are compact/white; AI card is full-width violet gradient.

**When only 1 nudge exists:** A single nudge card fills the tray. The section collapses to exactly that card's height.

---

### 2.2 NUDGE-HOME-2: Overflow State (>5 nudges)

Same as NUDGE-HOME-1 but the 5th card is followed by the overflow row:

```
│  ╔════════════════════════════════════╗  │
│  ║  NUDGE-CARD-ROUTINE (5th card)     ║  │
│  ╚════════════════════════════════════╝  │
│                                          │
│  + 3 more items  →                       │  ← overflow row
│                                          │
```

**Overflow row styling:**
- Text: "**+** 3 more items  →", 13px PJS medium, `color: var(--ink-2)`
- Left padding: 4px (aligns loosely with card content, not card edge)
- Height: 44px (full touch target)
- No border, no background — bare text row
- Tap behavior: Founding Engineer decision for Phase 1. Acceptable options: expand tray to show all, or no-op with a future full-list navigation. The visual spec makes no requirement here.

---

### 2.3 NUDGE-HOME-3: No Active Nudges

Identical to the pre-nudge home screen. The nudge tray section is not rendered. No change to home screen layout.

---

### 2.4 NUDGE-HOME-4: Spouse Read-Only State

When the household member is the spouse (read-only role):
- Per-screen spouse banner appears pinned below the screen header (consistent with L-009 pattern)
- Banner: `background: var(--lavender-soft)`, `color: var(--violet)`, 13px PJS medium, full-width, ~44px height
- Banner copy: *"You're viewing as a household member. Nudge actions are read-only."*
- Nudge tray renders below the banner, cards fully visible
- **Action buttons are disabled** on all nudge cards: greyed out (`opacity: 0.4`), non-tappable
- Dismiss × is also disabled for spouse (since dismiss state is per-device, this decision may be revisited by Founding Engineer — see §6)
- Navigation badge still visible (spouse can see how many nudges are active)

**Rationale:** Consistent with the established spouse read-only pattern (L-009). The spouse should see household nudges to maintain shared visibility, but should not take actions that would modify household records from a shared device.

---

## 3. Nudge Card Anatomy

### 3.1 NUDGE-CARD-ROUTINE: Routine Overdue

```
┌─────────────────────────────────────────┐
│ ┃  ┌────┐                            × │  ← 3px mint left stripe, × dismiss top-right
│ ┃  │ ↻  │  Morning routine             │  ← 32×32 icon container, --mint-soft bg, ↻ mint icon
│ ┃  └────┘  Overdue since Monday        │  ← item name 14px semibold / trigger 12px ink-2
│ ┃                                      │
│ ┃  ┌────────────────┐ ┌──────────────┐ │  ← action buttons, 44px height each
│ ┃  │   Mark done    │ │     Skip     │ │
│ ┃  └────────────────┘ └──────────────┘ │
└─────────────────────────────────────────┘
```

**Detailed token usage:**
- Card: `background: var(--surface)`, `border-radius: 18px`, `border: 1.5px solid var(--ink-4)`, `box-shadow: var(--shadow-sm)`, `padding: 14px 16px`
- Left accent stripe: `3px solid var(--mint)` (rendered as `border-left`)
- Icon container: `32×32px`, `border-radius: 12px`, `background: var(--mint-soft)`
- Icon: `↻` (recycle/repeat glyph), `color: var(--mint)`, 18px
- Item name: 14px PJS semibold, `color: var(--ink)`
- Trigger text: 12px PJS regular, `color: var(--ink-2)`, e.g. "Overdue since Monday"
- Dismiss × button: 20px × glyph, `color: var(--ink-3)`, positioned absolute top-right, 40×40px touch target
- "Mark done" button: `.btn-primary` — `background: var(--violet)`, `color: white`, `border-radius: 12px`, 44px height, grows to fill ~50% of card width minus gap
- "Skip" button: `.btn-secondary` — `background: var(--lavender-soft)`, `color: var(--violet)`, `border-radius: 12px`, 44px height, same width

**Trigger text copy examples:**
- "Overdue since Monday" (for currentDueDate = last Monday)
- "Overdue — due last week" (when >7 days overdue)
- "Overdue since yesterday" (for yesterday)

**Dark mode:** Fully automatic — all tokens resolve correctly. `--mint-soft` shifts from `#E0FFF9` to `#0A2820`; `--ink-4` border becomes a subtle light ring; `--lavender-soft` button bg shifts to `#2A2545`.

---

### 3.2 NUDGE-CARD-REMINDER: Reminder Approaching/Overdue

```
┌─────────────────────────────────────────┐
│ ┃  ┌────┐                            × │  ← 3px rose left stripe, × dismiss top-right
│ ┃  │ 🔔 │  Grocery run                 │  ← 32×32 icon container, --rose-soft bg, bell icon
│ ┃  └────┘  Due in 2 hours              │  ← item name 14px semibold / trigger 12px ink-2
│ ┃                                      │
│ ┃  ┌────────────────┐ ┌──────────────┐ │
│ ┃  │      Done      │ │    Snooze    │ │
│ ┃  └────────────────┘ └──────────────┘ │
└─────────────────────────────────────────┘
```

**Token changes vs. routine card:**
- Left accent stripe: `3px solid var(--rose)`
- Icon container: `background: var(--rose-soft)`
- Icon: bell glyph (🔔 or an outlined bell SVG icon), `color: var(--rose)`, 18px
- Buttons: same primary/ghost pattern but copy changes to "Done" / "Snooze"

**Trigger text copy examples:**
- "Due in 2 hours" (when approaching threshold, ≤24h)
- "Due in 45 minutes"
- "Overdue since 9am" (if past due date)
- "Due today" (if within current day, no specific time precision needed)

**Dark mode:** Fully automatic. `--rose-soft` shifts from `#FFE8F2` to `#3A1828`.

---

### 3.3 NUDGE-CARD-RITUAL: Planning Ritual Overdue (Elevated)

```
┌─────────────────────────────────────────┐
│ ┃  ┌────┐                            × │  ← 3px VIOLET left stripe, × dismiss
│ ┃  │ 📋 │  Weekly household review     │  ← 32×32 icon container, --lavender-soft bg
│ ┃  └────┘  Weekly review overdue       │  ← violet icon, item name, trigger text
│ ┃                                      │
│ ┃  ┌────────────────────────────────┐  │  ← single full-width primary button
│ ┃  │        Start review  →         │  │
│ ┃  └────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Visual elevation details:**
- Left accent stripe: `3px solid var(--violet)` (not mint or rose)
- Card border: `1.5px solid var(--lavender-mid)` — slightly more prominent than `--ink-4`
- Icon container: `background: var(--lavender-soft)`, `border-radius: 12px`
- Icon: calendar or clipboard SVG glyph, `color: var(--violet)`, 18px
- Item name: 14px PJS semibold, `color: var(--ink)` — same as other cards
- Trigger text: 12px PJS regular, `color: var(--ink-2)`, e.g. "Weekly review overdue"
- "Start review →" button: full-width `.btn-primary`, `border-radius: 12px`, 44px height

**Visual summary of the elevation difference:** The violet left stripe and lavender-mid border ring give the ritual card a distinct visual identity in the tray. When ritual, reminder, and routine cards are all present, the ritual card (first in tray, violet accent) draws the eye first without being alarming.

**Copy examples:**
- "Weekly review overdue" (when `currentDueDate` is in the past)
- "Weekly review · Overdue since Sunday"

**Dark mode:** Fully automatic. `--lavender-soft` → `#2A2545`, `--lavender-mid` → `#3D3660`.

---

## 4. Navigation Count Badge

### 4.1 NUDGE-BADGE: Home Tab Count Badge

When one or more active nudges exist (after filtering dismissed-today entries client-side), a count badge appears on the Home tab icon:

```
┌─────────────────────────────────────────────────────┐
│  [🏠]⬤  Routines    Reminders    Memory    Olivia   │
│   Home  (nudge badge ↑)                              │
└─────────────────────────────────────────────────────┘
```

**Badge token usage:**
- Shape: 16px × 16px circle (or 16×20px pill for counts ≥ 10)
- Background: `--rose` (`#FF7EB3`) — same in both modes
- Text: count integer, 10px PJS bold, `color: white`
- Count cap: display "9+" when count > 9
- Position: absolute top-right of the Home tab icon, offset so the badge overlaps the icon edge: `top: -4px, right: -4px` relative to the icon container
- When count = 0: badge completely absent (no zero display)

**Dark mode:** `--rose` is unchanged between modes. The badge reads cleanly against both the light nav bar (`--surface: #FFFFFF`) and dark nav bar (`--surface: #1C1A2E`).

---

## 5. Offline and Error States

### 5.1 NUDGE-OFFLINE: Device Offline

When the device is offline and no prior poll data exists:
- Nudge tray is simply absent (no tray section rendered)
- No error message is shown inside the tray
- The home screen renders normally without the nudge section
- No nudge-related errors or crash states

When the device is offline and prior poll data is stale (from an earlier foreground session):
- The nudge tray shows the last-polled state with a quiet note below the tray: *"Nudges may be outdated"* — 11px PJS, `color: var(--ink-3)`, centered, shown only when offline
- This note does not appear when online; it disappears as soon as connectivity is restored and the next poll completes

**Rationale:** The feature spec states: "If the device is offline, nudge data is not refreshed. The app remains fully functional; nudge tray shows the last-polled state or no nudges." Showing a quiet informational note on stale data is acceptable; showing an error banner or an empty-looking tray with an error message would be anxiety-inducing.

### 5.2 Poll Failure (Online but Endpoint Unavailable)

Same behavior as offline: the last-polled state is shown (or the tray is absent if no prior data). The quiet "may be outdated" note is shown. No error toast or error banner.

---

## 6. Designer Decisions Deferred to Founding Engineer

The following questions are left for Founding Engineer resolution in the implementation plan. They are noted here so the Founding Engineer knows they are not design decisions.

1. **Dismiss interaction for spouse:** Whether the spouse's per-device dismiss state is tracked despite the read-only role. Recommendation: allow spouse device dismiss (it's client-only state, no server impact). If the Founding Engineer's implementation naturally includes spouse dismiss, no design change is needed. If not, the spouse read-only state in §2.4 takes precedence.

2. **Overflow row tap behavior:** Whether tapping "+ N more" expands the tray in place or navigates to a full nudge list. Phase 1 has no defined nudge list screen; the Founding Engineer may implement as expand-in-place or no-op until a list screen is designed.

3. **Polling interval:** Not a design decision. Founding Engineer defines interval (recommendation: 15 minutes while foregrounded).

4. **Display cap:** Whether 5 is the cap or a different value. The visual spec is designed for 5 and renders correctly at values 3–7 without rework.

5. **Snooze interval for reminders:** 1 hour recommended in the spec. Not a visual decision.

---

## 7. Token Usage Summary

| Visual element | Token(s) |
|---|---|
| Card background | `--surface` |
| Card border (routine, reminder) | `--ink-4` |
| Card border (planning ritual) | `--lavender-mid` |
| Card shadow | `--shadow-sm` |
| Routine left stripe | `--mint` |
| Routine icon container | `--mint-soft` |
| Routine icon | `--mint` |
| Reminder left stripe | `--rose` |
| Reminder icon container | `--rose-soft` |
| Reminder icon | `--rose` |
| Planning ritual left stripe | `--violet` |
| Planning ritual icon container | `--lavender-soft` |
| Planning ritual icon | `--violet` |
| Item name text | `--ink` |
| Trigger condition text | `--ink-2` |
| Dismiss × icon | `--ink-3` |
| Primary action button bg | `--violet` |
| Primary action button text | `white` |
| Ghost action button bg | `--lavender-soft` |
| Ghost action button text | `--violet` |
| Navigation badge bg | `--rose` |
| Navigation badge text | `white` |
| Offline stale note | `--ink-3` |
| Overflow row text | `--ink-2` |
| Spouse banner bg | `--lavender-soft` |
| Spouse banner text | `--violet` |

---

## 8. Dark Mode Notes

All nudge tray components theme automatically via the token system. No explicit dark-mode overrides required for any nudge card variant. Key token shifts in dark mode that affect the nudge tray:

- `--surface: #1C1A2E` — card bodies become the warm dark indigo surface, slightly elevated above `--bg`
- `--mint-soft: #0A2820` — routine icon containers become deep teal-black
- `--rose-soft: #3A1828` — reminder icon containers become deep rose-black
- `--lavender-soft: #2A2545` — ritual icon containers become deep indigo
- `--ink-4: rgba(237,233,255,0.1)` — card borders become subtle light-on-dark lines
- `--lavender-mid: #3D3660` — ritual card border shifts to a mid-dark indigo ring
- `--shadow-sm` increases in opacity for dark mode, maintaining card elevation perception
- Navigation badge: `--rose` is unchanged, reads clearly on the dark nav surface

The left accent stripes (`--mint`, `--rose`, `--violet`) are all unchanged between modes — they serve as the primary visual differentiator and must remain consistent.

---

## 9. Nudge Copy Tone Reference

All nudge copy must be calm, factual, and non-judgmental. Olivia is observing and surfacing — not scolding.

**Routine overdue:**
- ✓ "Morning routine · Overdue since Monday"
- ✓ "Evening check-in · Overdue since yesterday"
- ✗ "You missed your morning routine"
- ✗ "Morning routine still incomplete"

**Reminder approaching:**
- ✓ "Vet appointment · Due in 2 hours"
- ✓ "Grocery run · Due today"
- ✓ "Car service · Due in 40 minutes"
- ✗ "You haven't done the car service yet"
- ✗ "Vet appointment is coming up (don't forget!)"

**Planning ritual overdue:**
- ✓ "Weekly household review · Overdue since Sunday"
- ✓ "Weekly review · Overdue"
- ✗ "You skipped last week's review"
- ✗ "Weekly review not completed"

**Overflow row:**
- ✓ "+ 3 more items  →"
- ✗ "3 more overdue items"
- ✗ "You have 3 more things to do"

---

## 10. Open Questions (Resolved)

All nine designer decisions listed in the task description are resolved above:

1. **Nudge tray placement** → dedicated section at top of home screen content, above all other sections (§0.1)
2. **Nudge card layout** → compact surface card with left stripe, icon container, item name, trigger text, dismiss ×, and action buttons (§0.2, §3.1–3.3)
3. **Action button affordances** → primary + ghost pair (routine, reminder); full-width primary (ritual); standard violet button colors; 44px tap targets (§0.3)
4. **Dismiss interaction** → × tap, top-right, no confirmation, immediate exit animation (§0.4)
5. **Navigation count badge** → rose dot badge with count, on Home tab icon (§0.6)
6. **Workflow-type differentiation** → mint/↻ routine, rose/bell reminder, violet/calendar ritual, matching existing H3/H4 color language (§3.1–3.3)
7. **"+ N more" indicator** → text row below the 5th card (§0.7)
8. **Empty nudge state** → tray section completely absent, no placeholder (§0.8)
9. **Tone** → calm, factual, non-judgmental copy; see §9 for examples

---

## Design Checklist

Before marking implementation complete, verify:

- [ ] Nudge tray appears at the top of home screen content when active nudges exist
- [ ] Nudge tray is completely absent when no nudges are active
- [ ] Planning ritual card has violet stripe and lavender-mid border (elevated treatment)
- [ ] Routine card has mint stripe and mint-soft icon container
- [ ] Reminder card has rose stripe and rose-soft icon container
- [ ] All action buttons are minimum 44px height
- [ ] "Mark done" and "Skip" have sufficient separation (≥8px) to prevent misfire
- [ ] Dismiss × renders with 40×40px touch target
- [ ] Planning ritual card shows single full-width "Start review →" button
- [ ] Navigation badge appears on Home tab when nudges are active, absent when empty
- [ ] Badge shows count (9+ cap), rose background, white text
- [ ] Overflow row appears below 5th card when count exceeds cap
- [ ] Offline stale-data note appears in italic --ink-3 when offline with stale data
- [ ] Spouse read-only banner appears above nudge tray for spouse role
- [ ] Action buttons disabled for spouse (opacity 0.4, non-tappable)
- [ ] Card exit animation: opacity fade + height collapse, 200ms
- [ ] All colors use CSS tokens — no hardcoded hex values
- [ ] All screen states render correctly in dark mode
- [ ] Nudge copy is calm and non-judgmental per §9 examples
