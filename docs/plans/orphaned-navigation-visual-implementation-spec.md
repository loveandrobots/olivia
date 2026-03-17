---
title: "Olivia — Orphaned List Page Navigation: Visual Implementation Spec"
subtitle: "Making /routines, /reminders, and /meals discoverable from the home screen"
date: "March 2025"
status: "Design handoff for implementation"
---

# Olivia — Orphaned List Page Navigation
## Visual Implementation Spec
*Making /routines, /reminders, and /meals discoverable from the home screen*

*March 2025 · Design handoff for implementation*

---

> **Scope of this document**
>
> This spec defines the UI changes required to make three orphaned list pages (`/routines`, `/reminders`, `/meals`) accessible via persistent navigation paths from the home screen. Currently, individual items within these sections link to detail pages, but the list-level index pages have no navigation entry point.
>
> Covers: recommended approach, component changes, layout specs, interaction rules, dark mode notes, and edge cases.

---

## 1. Problem Summary

The navigation audit (OLI-106) identified three list pages with no persistent navigation path:

| Page | Current state | Gap |
|------|--------------|-----|
| `/routines` | Individual routine cards on Home link to `/routines/$id` | The routines index page is unreachable |
| `/reminders` | Individual reminder cards on Home link to `/reminders/$id` | The reminders index page is unreachable |
| `/meals` | Only reachable via the empty-meal-slot CTA on Home | Once meals exist, users cannot browse the full list |

---

## 2. Recommended Approach: Tappable Section Headers

**Option chosen: Section headers on home page become tappable links to their respective list pages.**

### Why this approach

- **Most discoverable.** The labels are already visible on every day section — users see them every time they use the app.
- **Zero new UI surface.** No new nav tab, no new page, no "more" menu. Reduces cognitive load per product ethos principle #3.
- **Precedent exists.** The reminders visual spec (Section 5.1) already defines a "Reminders" + "All →" header pattern for list navigation. This spec extends that pattern consistently to routines and meals.
- **Minimal disruption.** Existing navigation flows remain intact. Individual item cards still link to detail pages.
- **Bottom nav is full.** The 5-tab layout (Home, Tasks, Olivia, Lists, Memory) has no room for additional tabs.

### What changes

The `wv-workflow-label` elements (currently plain `<div>` text) become tappable section header rows with a "View all →" affordance that links to the corresponding list page.

---

## 3. Design System Constraints

All changes must conform to the existing Olivia design system. No new tokens are introduced.

### 3.1 Typography Used

| Role | Font | Size | Weight | Usage |
|------|------|------|--------|-------|
| Section label | Plus Jakarta Sans | 10px | 700 | "ROUTINES" / "REMINDERS" / "MEALS" text (unchanged) |
| "All →" link | Plus Jakarta Sans | 12px | 600 | Right-aligned navigation affordance |

### 3.2 Color Token Usage

| Visual purpose | Token | Light | Dark |
|----------------|-------|-------|------|
| Section label text | `--ink-3` | `rgba(26,16,51,0.3)` | `rgba(237,233,255,0.35)` |
| "All →" link text | `--violet` | `#6C5CE7` | `#6C5CE7` |
| "All →" link hover | `--violet-2` | `#8B7FF5` | `#9D93F7` |
| Tap highlight (active state) | `--violet-dim` | `rgba(108,92,231,0.1)` | `rgba(108,92,231,0.18)` |

---

## 4. Component Anatomy

### 4.1 Section Header Row (updated `wv-workflow-label`)

The current section header is a plain `<div>` with uppercase label text. It becomes a flex row with the label on the left and a tappable "All →" link on the right.

**Current:**
```
ROUTINES
```

**Updated:**
```
ROUTINES                                          All →
```

| Sub-element | Description | Rules |
|-------------|-------------|-------|
| Container | Flex row, replaces current `wv-workflow-label` div | `display: flex; justify-content: space-between; align-items: center;` |
| Label text | Unchanged — uppercase section name | 10px/700, `--ink-3`, letter-spacing 1.2px, text-transform uppercase |
| "All →" link | Tappable text link to list page | 12px/600, `--violet`, no underline. The `→` is part of the text content |
| Tap target | The "All →" link must have a comfortable tap target | `min-height: 44px; padding: 8px 0 8px 16px;` (expanded hit area, left padding prevents accidental taps) |

**States:**

| State | Appearance |
|-------|-----------|
| Rest | Label: `--ink-3`. Link: `--violet`, no underline |
| Hover / focus | Link: `--violet-2`, underline appears |
| Active / press | Link: `--violet`, background flash `--violet-dim` on the link area (brief 150ms) |

**CSS specification:**

```css
.wv-workflow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.wv-workflow-header .wv-workflow-label {
  /* Existing styles unchanged */
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 10px;
  font-weight: 700;
  color: var(--ink-3);
  letter-spacing: 1.2px;
  text-transform: uppercase;
  padding: 0 2px;
}

.wv-workflow-header .wv-section-link {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--violet);
  text-decoration: none;
  padding: 8px 0 8px 16px;
  min-height: 44px;
  display: flex;
  align-items: center;
  border-radius: 8px;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.wv-workflow-header .wv-section-link:hover,
.wv-workflow-header .wv-section-link:focus-visible {
  color: var(--violet-2);
  text-decoration: underline;
}

.wv-workflow-header .wv-section-link:active {
  background-color: var(--violet-dim);
}
```

**Dark mode note:** Fully automatic via tokens. `--violet` is unchanged, `--violet-2` shifts to `#9D93F7`, `--violet-dim` shifts to `rgba(108,92,231,0.18)`. No explicit dark override needed.

### 4.2 Navigation Targets

| Section label | "All →" links to | Back link from list page |
|--------------|-------------------|--------------------------|
| ROUTINES | `/routines` | "← Home" |
| REMINDERS | `/reminders` | "← Home" |
| MEALS | `/meals` | "← Home" |
| INBOX | No link — inbox items are managed in Tasks | N/A |

**INBOX exception:** The INBOX section does not receive an "All →" link because inbox items are task items managed through the existing Tasks tab. Adding a link here would create confusion about where inbox management lives.

---

## 5. Screen States Reference

### 5.1 Home Screen — Day Section with Items Present

**Before (current):**
```
┌─────────────────────────────────────┐
│ ROUTINES                            │
│ ┌─ Routine card ─────────────────┐  │
│ └────────────────────────────────┘  │
│                                     │
│ REMINDERS                           │
│ ┌─ Reminder card ────────────────┐  │
│ └────────────────────────────────┘  │
│                                     │
│ MEALS                               │
│ ┌─ Meal card ────────────────────┐  │
│ └────────────────────────────────┘  │
└─────────────────────────────────────┘
```

**After (updated):**
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

### 5.2 Home Screen — Day Section with Empty Meals (Empty Slot)

The MEALS header still shows "All →" even when the empty meal slot is displayed. This is important because the `/meals` page allows browsing all meal plans, not just the current day's assignment.

```
┌─────────────────────────────────────┐
│ MEALS                        All →  │
│ ┌─ No meal planned yet...  ──────┐  │
│ └────────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 5.3 Home Screen — Day Section with No Routines / Reminders

When a day has no routines or reminders, those sections are not rendered (current behavior, unchanged). The "All →" links only appear when the section is visible. Users who want to access the full list on days without items can navigate to a day that does show the section, or use the re-entry page.

**Note for engineer:** If this proves to be a usability issue in testing, a future iteration could add persistent links elsewhere (e.g., settings page or a "quick links" section at the bottom of the home screen). For now, keep the implementation simple.

### 5.4 Home Screen — Empty Week State (WEEK-2)

When the entire week is empty (`allEmpty` state), none of the day sections render, so none of the section header links appear. This is acceptable because there is nothing to browse on any of the list pages either. The existing "Go to Household →" CTA remains the primary action in this state.

---

## 6. Layout & Spacing Spec

### 6.1 Section Header Row

| Element | Spacing / size |
|---------|---------------|
| Header row container | `display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;` |
| Label text (left) | Unchanged from current `wv-workflow-label` styling |
| "All →" link (right) | `font-size: 12px; font-weight: 600; padding: 8px 0 8px 16px;` |
| Gap between label and link | Automatic via `justify-content: space-between` |

### 6.2 Impact on Existing Spacing

The section header row height increases slightly due to the "All →" link's 44px min-height tap target. The visual change is minimal because the link text (12px) is close in height to the label (10px), and the padding is mostly vertical. No downstream spacing adjustments are needed.

---

## 7. Interaction Rules

### 7.1 Link Behavior

- **Tap "All →":** Navigate to the corresponding list page (`/routines`, `/reminders`, or `/meals`).
- **Tap individual card:** Navigate to the detail page (existing behavior, unchanged).
- **Navigation method:** Use client-side routing (`<Link>` component from TanStack Router). No full page reload.

### 7.2 Back Navigation from List Pages

Each list page should show a back link ("← Home") that returns to the home screen. If the list page already has its own back navigation, no change is needed. If not, the engineer should add a `← Home` link following the existing back-link pattern from the reminders spec (Section 2.7):

```
← Home    (13px/600, --violet, tap target ≥ 44px)
```

### 7.3 No Confirmation Required

All navigation is read-only traversal. No confirmation sheets, no state changes.

---

## 8. Edge Cases

### 8.1 Section Appears on Multiple Days

Each day section renders its own section headers independently. The "All →" links will appear on every day that has items in that section. This is correct — the link always goes to the same list page regardless of which day the user taps it from. No deduplication needed.

### 8.2 Long Section Label

All section labels are short, fixed strings (ROUTINES, REMINDERS, MEALS, INBOX). There is no risk of label/link overlap. No truncation logic needed.

### 8.3 Accessibility

- The "All →" link must have a descriptive `aria-label` for screen readers: e.g., `aria-label="View all routines"`, `aria-label="View all reminders"`, `aria-label="View all meals"`.
- The section label (`wv-workflow-label`) remains a `<span>` or `<div>` — it is not itself a link.
- Minimum tap target of 44px is enforced via `min-height` and padding on the link element.

### 8.4 Keyboard Navigation

The "All →" link should be focusable and activatable via Enter key. Using a `<Link>` component handles this automatically. `focus-visible` styling should show the `--violet-2` color and underline.

---

## 9. Implementation Checklist

For the Founding Engineer:

- [ ] Create a `wv-workflow-header` wrapper element (flex row) around each section's label + link
- [ ] Add `wv-section-link` `<Link>` elements with correct `to` props: `/routines`, `/reminders`, `/meals`
- [ ] Add `aria-label` attributes to each link
- [ ] Do NOT add an "All →" link to the INBOX section
- [ ] Add the CSS from Section 4.1 to `styles.css`
- [ ] Verify that each list page (`/routines`, `/reminders`, `/meals`) has a "← Home" back link
- [ ] Test both light and dark modes
- [ ] Verify 44px minimum tap targets on the "All →" links
- [ ] Verify VoiceOver/TalkBack reads "View all routines" (etc.) for each link

---

## 10. Open Design Questions

None. This is a straightforward navigation fix with a well-precedented pattern (reminders spec Section 5.1). No new design decisions are required.

---

*— End of specification —*
