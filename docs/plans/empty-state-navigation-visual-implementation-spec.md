---
title: "Olivia — Empty-State Navigation for Routines & Reminders: Visual Implementation Spec"
subtitle: "Always-visible section headers with empty-state slots on the home screen"
date: "March 2025"
status: "Design handoff for implementation"
---

# Olivia — Empty-State Navigation for Routines & Reminders
## Visual Implementation Spec
*Always-visible section headers with empty-state slots on the home screen*

*March 2025 · Design handoff for implementation*

---

> **Scope of this document**
>
> This spec defines the UI changes needed so that the ROUTINES and REMINDERS sections on the home screen are always navigable — even when no items exist for a given day. Currently, these sections are conditionally rendered only when items are present, creating a chicken-and-egg problem: users cannot reach `/routines` or `/reminders` to create their first item.
>
> Covers: recommended approach, component changes, layout specs, all relevant screen states, dark mode notes, and edge cases.

---

## 1. Problem Summary

OLI-108 added tappable "All →" section headers to ROUTINES, REMINDERS, and MEALS. However, the ROUTINES and REMINDERS sections only render when items exist for a given day. This means:

| Section | Current behavior | Gap |
|---------|-----------------|-----|
| ROUTINES | Section + header only renders when `day.routines.length > 0` | No routines on a day → no "All →" link → user cannot navigate to `/routines` |
| REMINDERS | Section + header only renders when `day.reminders.length > 0` | No reminders on a day → no "All →" link → user cannot navigate to `/reminders` |
| MEALS | Section **always** renders — shows MealCards or EmptyMealSlot | Already solved — EmptyMealSlot provides navigation path |

The MEALS section already handles this correctly with `EmptyMealSlot`. This spec extends that same pattern to ROUTINES and REMINDERS.

---

## 2. Recommended Approach: Always Show Sections with Empty-State Slots

**Option chosen: Option 1 — Always show section headers**, with empty-state placeholder slots matching the existing EmptyMealSlot pattern.

### Why this approach

- **Consistency.** MEALS already uses this pattern. Applying it to ROUTINES and REMINDERS unifies the experience — all three workflow sections behave identically.
- **Most discoverable.** Users always see all three sections on every day view, making the app's structure immediately legible.
- **Minimal new UI.** Two new empty-state slot components, following an existing pattern. No new navigation surfaces, menus, or pages.
- **Solves both cases.** Works for the per-day empty case (some days have items, others don't) AND the all-empty-week case (user has zero routines/reminders globally).
- **Conforms to product ethos.** Reduces cognitive load (principle #3) by making navigation predictable — the user always knows where to find each section.

### What changes

1. The ROUTINES section always renders in `DaySection`, regardless of `day.routines.length`.
2. The REMINDERS section always renders in `DaySection`, regardless of `day.reminders.length`.
3. When a section has no items for that day, an empty-state slot is shown (similar to `EmptyMealSlot`).
4. The empty-day state ("Nothing scheduled") only appears when ALL four sections (routines, reminders, meals, inbox) are empty — but the three workflow sections still render with their empty slots.

---

## 3. Design System Constraints

No new tokens are introduced. All changes use existing Olivia design system tokens.

### 3.1 Color Token Usage

Each section's empty-state slot uses its established accent color, matching the left-border accent color used on item cards:

| Section | Accent token | Soft token | Dashed border | Empty text | Icon |
|---------|-------------|------------|---------------|------------|------|
| ROUTINES | `--mint` | `--mint-soft` | 1.5px dashed `--mint` | `--mint` | Repeat (↻) or ListChecks |
| REMINDERS | `--peach` | `--peach-soft` | 1.5px dashed `--peach` | `--peach` | Bell (🔔) |
| MEALS (existing) | `--rose` | `--rose-soft` | 1.5px dashed `--rose` | `--rose` | ForkKnife |

### 3.2 Typography

| Role | Font | Size | Weight | Usage |
|------|------|------|--------|-------|
| Empty slot text | Fraunces italic | 13px | 300 | Placeholder message (Olivia's voice) |
| Empty slot icon | — | 18px | — | Phosphor icon, section accent color |
| Section label | Plus Jakarta Sans | 10px | 700 | Unchanged — "ROUTINES" / "REMINDERS" |
| "All →" link | Plus Jakarta Sans | 12px | 600 | Unchanged — links to list page |

---

## 4. Component Anatomy

### 4.1 EmptyRoutineSlot

A dashed-border button that invites the user to navigate to `/routines`. Follows the exact same structural pattern as `EmptyMealSlot`.

**Anatomy:**
```
┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
╎  [↻]  No routines today — browse all →   ╎
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
```

| Sub-element | Description | Rules |
|-------------|-------------|-------|
| Container | Touchable `<button>` | `display: flex; align-items: center; gap: 8px; border: 1.5px dashed var(--mint); border-radius: 14px; background: transparent; padding: 10px 12px; cursor: pointer; width: 100%;` |
| Icon | ListChecks or Repeat icon from Phosphor | `color: var(--mint); font-size: 18px; flex-shrink: 0;` |
| Text | Fraunces italic, Olivia's voice | `font-family: 'Fraunces', serif; font-style: italic; font-size: 13px; font-weight: 300; color: var(--mint);` |

**States:**

| State | Appearance |
|-------|-----------|
| Rest | Dashed `--mint` border, transparent background |
| Hover / focus | `background: var(--mint-soft)` |
| Active / press | `background: var(--mint-soft); opacity: 0.8;` |

**Click behavior:** Navigate to `/routines`.

**CSS specification:**

```css
.wv-empty-routine-slot {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1.5px dashed var(--mint);
  border-radius: 14px;
  background: transparent;
  padding: 10px 12px;
  cursor: pointer;
  width: 100%;
  transition: background-color 0.15s ease;
}

.wv-empty-routine-slot:hover,
.wv-empty-routine-slot:focus-visible {
  background: var(--mint-soft);
}

.wv-empty-routine-slot:active {
  background: var(--mint-soft);
  opacity: 0.8;
}

.wv-empty-routine-slot-icon {
  color: var(--mint);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.wv-empty-routine-text {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 13px;
  font-weight: 300;
  color: var(--mint);
}
```

**Dark mode note:** Fully automatic via tokens. `--mint` is unchanged between modes. `--mint-soft` shifts from `#E0FFF9` to `#0A2820` — a dark teal that reads correctly as a hover fill on dark surfaces.

### 4.2 EmptyReminderSlot

Identical structure to `EmptyRoutineSlot`, using the reminders accent color (peach).

**Anatomy:**
```
┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
╎  [🔔]  No reminders today — browse all → ╎
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
```

| Sub-element | Description | Rules |
|-------------|-------------|-------|
| Container | Touchable `<button>` | Same structure as EmptyRoutineSlot, but `border-color: var(--peach)` |
| Icon | Bell icon from Phosphor | `color: var(--peach); font-size: 18px; flex-shrink: 0;` |
| Text | Fraunces italic, Olivia's voice | `color: var(--peach);` (all other text properties identical) |

**States:**

| State | Appearance |
|-------|-----------|
| Rest | Dashed `--peach` border, transparent background |
| Hover / focus | `background: var(--peach-soft)` |
| Active / press | `background: var(--peach-soft); opacity: 0.8;` |

**Click behavior:** Navigate to `/reminders`.

**CSS specification:**

```css
.wv-empty-reminder-slot {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1.5px dashed var(--peach);
  border-radius: 14px;
  background: transparent;
  padding: 10px 12px;
  cursor: pointer;
  width: 100%;
  transition: background-color 0.15s ease;
}

.wv-empty-reminder-slot:hover,
.wv-empty-reminder-slot:focus-visible {
  background: var(--peach-soft);
}

.wv-empty-reminder-slot:active {
  background: var(--peach-soft);
  opacity: 0.8;
}

.wv-empty-reminder-slot-icon {
  color: var(--peach);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.wv-empty-reminder-text {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 13px;
  font-weight: 300;
  color: var(--peach);
}
```

**Dark mode note:** Fully automatic. `--peach` is unchanged. `--peach-soft` shifts from `#FFF3E0` to `#2E1E08` — a warm dark amber.

### 4.3 EmptyMealSlot (Existing — No Changes)

The existing `EmptyMealSlot` component remains unchanged. It is documented here for completeness and to confirm the pattern being extended:

- Border: `1.5px dashed var(--rose)`
- Icon: ForkKnife, `color: var(--rose)`
- Text: `"No meal planned yet — add in Meals →"`, Fraunces italic 13px/300, `color: var(--rose)`
- Hover: `background: var(--rose-soft)`
- Click: navigates to `/meals`

---

## 5. Screen States Reference

### 5.1 Day Section — All Sections Have Items (No Change)

```
┌─────────────────────────────────────┐
│ ROUTINES                     All →  │
│ ┌─ Routine card ─────────────────┐  │
│ └────────────────────────────────┘  │
│                                     │
│ REMINDERS                    All →  │
│ ┌─ Reminder card ────────────────┐  │
│ └────────────────────────────────┘  │
│                                     │
│ MEALS                        All →  │
│ ┌─ Meal card ────────────────────┐  │
│ └────────────────────────────────┘  │
└─────────────────────────────────────┘
```

Behavior is unchanged when items exist.

### 5.2 Day Section — No Routines for This Day (NEW)

```
┌─────────────────────────────────────┐
│ ROUTINES                     All →  │
│ ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐  │
│ ╎ [↻] No routines today —      ╎  │
│ ╎     browse all →              ╎  │
│ └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘  │
│                                     │
│ REMINDERS                    All →  │
│ ┌─ Reminder card ────────────────┐  │
│ └────────────────────────────────┘  │
│                                     │
│ MEALS                        All →  │
│ ┌─ Meal card ────────────────────┐  │
│ └────────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 5.3 Day Section — No Reminders for This Day (NEW)

```
┌─────────────────────────────────────┐
│ ROUTINES                     All →  │
│ ┌─ Routine card ─────────────────┐  │
│ └────────────────────────────────┘  │
│                                     │
│ REMINDERS                    All →  │
│ ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐  │
│ ╎ [🔔] No reminders today —    ╎  │
│ ╎      browse all →             ╎  │
│ └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘  │
│                                     │
│ MEALS                        All →  │
│ ┌─ Meal card ────────────────────┐  │
│ └────────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 5.4 Day Section — All Three Sections Empty (NEW)

When routines, reminders, and meals all have no items for that day, all three sections render with their empty-state slots. This replaces the previous "Nothing scheduled" empty-day message.

```
┌─────────────────────────────────────┐
│ ROUTINES                     All →  │
│ ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐  │
│ ╎ [↻] No routines today —      ╎  │
│ ╎     browse all →              ╎  │
│ └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘  │
│                                     │
│ REMINDERS                    All →  │
│ ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐  │
│ ╎ [🔔] No reminders today —    ╎  │
│ ╎      browse all →             ╎  │
│ └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘  │
│                                     │
│ MEALS                        All →  │
│ ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐  │
│ ╎ [🍴] No meal planned yet —   ╎  │
│ ╎      add in Meals →           ╎  │
│ └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘  │
└─────────────────────────────────────┘
```

**Note:** The INBOX section continues to be conditionally rendered (only when `day.inboxItems.length > 0`). Inbox items are managed through the Tasks tab, so no empty-state navigation is needed.

### 5.5 Empty-Day Logic Change

**Before:** `isEmpty = routines.length === 0 && reminders.length === 0 && meals.length === 0 && inboxItems.length === 0` → shows "Nothing scheduled"

**After:** The "Nothing scheduled" empty-day message is removed. The three workflow sections (ROUTINES, REMINDERS, MEALS) always render with either item cards or empty-state slots. A day only appears visually "empty" when all three show their empty slots plus no inbox items — but the sections themselves are still navigable.

If only inbox items exist (no routines, reminders, or meals), the three empty slots render above the inbox section. This is correct — it provides navigation context while still surfacing the inbox items.

### 5.6 Empty Week State (Entire Week Empty)

When the entire week view has no items across any day, day sections still render with their empty-state slots. At minimum, "today" always shows the three empty-state slots, ensuring navigation paths exist even for a brand-new user.

---

## 6. Layout & Spacing Spec

### 6.1 Empty-State Slot

| Element | Spacing / size |
|---------|---------------|
| Slot container | `padding: 10px 12px; border-radius: 14px; gap: 8px;` |
| Icon | 18px, flex-shrink 0 |
| Text | Fraunces italic 13px/300 |
| Slot within section | Same position as item cards — directly below section header |

### 6.2 Section Spacing (Unchanged)

| Element | Spacing |
|---------|---------|
| Section header (`wv-workflow-header`) margin-bottom | 6px |
| Between sections (`wv-workflow-section`) | Existing margin/gap (no change) |
| Item card / empty slot margin-bottom | 0 (single item per section in empty state) |

### 6.3 Impact on Day Section Height

When all three sections show empty slots, the day section is taller than the previous "Nothing scheduled" one-liner. This is acceptable and intentional — the empty slots provide navigation value that justifies the space. The visual weight is light (dashed borders, muted accent colors) so it does not feel heavy.

---

## 7. Interaction Rules

### 7.1 Empty Slot Tap

- **Tap EmptyRoutineSlot:** Navigate to `/routines` (same as tapping "All →" in the ROUTINES header).
- **Tap EmptyReminderSlot:** Navigate to `/reminders` (same as tapping "All →" in the REMINDERS header).
- **Tap EmptyMealSlot:** Navigate to `/meals` (existing behavior, unchanged).

Both the empty slot AND the "All →" header link navigate to the same destination. This is intentional — the slot is a larger, more visible tap target that makes the navigation affordance clearer for new users.

### 7.2 No Confirmation Required

All empty-slot taps are navigation only. No state changes, no confirmation sheets.

---

## 8. Accessibility Notes

- Empty-state slots must have `aria-label` attributes: `"No routines today, browse all routines"`, `"No reminders today, browse all reminders"`.
- Minimum tap target of 44px is met by the slot's `padding: 10px 12px` plus content height.
- The dashed border + accent color provides a visual distinction from item cards. Screen readers receive the full label text.
- Focus-visible states should show `background: var(--mint-soft)` / `var(--peach-soft)` respectively.

---

## 9. Implementation Checklist

For the Founding Engineer:

- [ ] Create `EmptyRoutineSlot` component following the pattern of existing `EmptyMealSlot`
- [ ] Create `EmptyReminderSlot` component following the same pattern
- [ ] **Change ROUTINES section rendering** in `DaySection`: remove the `day.routines.length > 0` conditional — always render the section. Show routine cards when items exist, `EmptyRoutineSlot` when empty.
- [ ] **Change REMINDERS section rendering** in `DaySection`: remove the `day.reminders.length > 0` conditional — always render the section. Show reminder cards when items exist, `EmptyReminderSlot` when empty.
- [ ] **Update empty-day logic**: remove or adjust the `isEmpty` check that shows "Nothing scheduled". The three workflow sections now always render; only suppress the full day section if there is truly nothing to show (which should no longer happen since the three sections always render).
- [ ] Add CSS for `.wv-empty-routine-slot` and `.wv-empty-reminder-slot` to `styles.css` (see Section 4.1 and 4.2)
- [ ] Add `aria-label` attributes to both new empty-state slots
- [ ] Test both light and dark modes — verify accent colors read correctly against both backgrounds
- [ ] Verify navigation: tapping empty slots navigates to correct list pages
- [ ] Verify that days with items in some sections but not others show the correct mix of cards and empty slots

---

## 10. Open Design Questions

None. This spec extends an established pattern (EmptyMealSlot) to two additional sections. The design decisions are consistent with existing precedent and the Olivia design system.

---

*— End of specification —*
