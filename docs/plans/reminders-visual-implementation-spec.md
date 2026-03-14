---
title: "Olivia — Reminders: Visual Implementation Spec"
subtitle: "Variation B — Reminders woven into Home + Tasks"
date: "March 2025"
status: "Design handoff for agentic implementation"
---

# Olivia — Reminders
## Visual Implementation Spec
*Variation B — Reminders woven into Home + Tasks*

*March 2025 · Design handoff for agentic implementation*

---

> **Scope of this document**
>
> This spec defines every UI state required to implement the Reminders feature for Olivia using Variation B: reminders surfaced inline on the Home screen and inside Task Detail, with no new nav tab. It is a complete, self-contained handoff document for an implementer.
>
> Covers: design tokens and typography rules, component anatomy, all screen states with precise layout specs, interaction rules and approval model, data fields surfaced per component, and edge cases.

---

## 1. Design System Constraints

All reminder UI must strictly conform to the Olivia design system. No new tokens may be introduced. The complete token reference is in design-foundations.md. Key constraints are summarised below.

### 1.1 Typography

| **Role**         | **Font**          | **Size** | **Weight** | **Usage in Reminders**                |
|------------------|-------------------|----------|------------|---------------------------------------|
| Section title    | Fraunces          | 19px     | 700        | "Reminders" section header on home    |
| Screen title     | Fraunces          | 28px     | 700        | "Reminders" full-list screen          |
| Reminder title   | Plus Jakarta Sans | 13–14px  | 600        | Reminder row title                    |
| Olivia message   | Fraunces italic   | 15–16px  | 300        | Nudge card, omsg blocks, empty states |
| Meta / timestamp | Plus Jakarta Sans | 11–12px  | 400–500    | Due time, owner, recurrence pill      |
| Badge / label    | Plus Jakarta Sans | 10px     | 700        | Status badges, ALL CAPS headers       |
| Body / detail    | Plus Jakarta Sans | 13–14px  | 400–600    | Detail card fields and values         |

### 1.2 Color Token Usage

Never hardcode hex values. Always reference tokens via CSS custom properties. The reminder feature uses the following token assignments:

| **Visual Purpose**                  | **Token**                           | **Light Value**       | **Dark Value**        |
|-------------------------------------|-------------------------------------|-----------------------|-----------------------|
| Overdue accent (border, dot, badge) | --rose / --rose-soft                | #FF7EB3 / #FFE8F2   | #FF7EB3 / #3A1828   |
| Due accent (border, dot, badge)     | --violet / --violet-dim             | #6C5CE7 / rgba(…0.1) | same / rgba(…0.18)    |
| Soon / tomorrow accent              | --peach / --peach-soft              | #FFB347 / #FFF3E0   | #FFB347 / #2E1E08   |
| Snoozed accent                      | --sky / --sky-soft                  | #48CAE4 / #E0F7FC   | #48CAE4 / #0A2228   |
| Completed accent                    | --mint / --mint-soft                | #00C9A7 / #E0FFF9   | #00C9A7 / #0A2820   |
| Recurring pill                      | --lavender-soft / --violet-2        | #EDE9FF / #8B7FF5   | #2A2545 / #9D93F7   |
| Linked-task pill                    | --mint-soft / --mint                | #E0FFF9 / #00C9A7   | #0A2820 / #00C9A7   |
| Reminder block bg (task detail)     | --violet-dim + --violet-glow border | rgba(108,92,231,0.10) | rgba(108,92,231,0.18) |
| Sheet overlay                       | --surface                           | #FFFFFF              | #1C1A2E              |
| Card background                     | --surface                           | #FFFFFF              | #1C1A2E              |
| Olivia message bg                   | --surface-2                         | #F3F0FF              | #242038              |

### 1.3 Border-Left Accent Rule

Every reminder row uses a 3px left border to communicate due-state at a glance. This is the primary scannable signal in the home screen Reminders section and the All Reminders list.

| **Due-state**       | **Border color token** | **Row opacity**                 |
|---------------------|------------------------|---------------------------------|
| overdue             | --rose                 | 100%                            |
| due                 | --violet               | 100%                            |
| upcoming (tomorrow) | --peach                | 100%                            |
| upcoming (future)   | --ink-3 (neutral)      | 100%                            |
| snoozed             | --sky                  | 65%                             |
| completed           | --mint                 | 65% (shown in Done filter only) |

### 1.4 Border Radius Reference

| **Element**                         | **Radius**                   |
|-------------------------------------|------------------------------|
| Reminder inline row (home / list)   | 16px                         |
| Detail card                         | 18px                         |
| Bottom sheet overlay                | 28px top corners, 0px bottom |
| Reminder block in task detail       | 16px                         |
| Nudge card                          | 24px                         |
| Action buttons (primary, secondary) | 16px                         |
| Input fields                        | 14px                         |
| Badge / pill                        | 20px (fully rounded)         |
| Add reminder button (dashed border) | 18px                         |
| Recurrence / toggle row             | 14px                         |
| Link-to-task row                    | 14px                         |


---

## 2. Component Anatomy

### 2.1 Reminder Inline Row

Used in: Home screen Reminders section, All Reminders list (full-page). The row is a touchable surface that navigates to Reminder Detail on tap.

| **Sub-element**  | **Description**                                                         | **Rules**                                              |
|------------------|-------------------------------------------------------------------------|--------------------------------------------------------|
| Container        | 16px border-radius card, background: --surface, box-shadow: --shadow-sm | border-left: 3px solid [state color token]           |
| Dot              | 8×8px circle, color matches border-left token                           | flex-shrink: 0; margin aligns with title midline       |
| Title            | 13px/600, --ink, truncated with ellipsis                                | Single line, max-width: 100%                           |
| Meta line        | 11px/400–500, --ink-2                                                   | Due time · Owner name, with optional pills inline      |
| Linked-task pill | 10px/700, --mint, bg --mint-soft, 2px/7px padding, 20px radius          | Only shown when linked to a task. Prefix: 🔗           |
| Recurrence pill  | 10px/700, --violet-2, bg --lavender-soft, 2px/7px padding               | Only shown when recurring. Prefix: ↻ and cadence label |
| Badge (right)    | Status badge — see badge table                                          | flex-shrink: 0; right-aligned                          |
| Snoozed opacity  | Entire row opacity: 0.65                                                | Applied only when due-state = snoozed                  |

### 2.2 Badge Component

Badges are used in reminder rows (right side), detail cards, and filter state labels. Never use plain text for due-state.

| **Due-state**          | **Text label**             | **Background token** | **Text color token** |
|------------------------|----------------------------|----------------------|----------------------|
| overdue                | Overdue                    | --rose-soft          | --rose               |
| due                    | Due                        | --violet-dim         | --violet             |
| upcoming (tomorrow)    | Tomorrow                   | --peach-soft         | --peach              |
| upcoming (future date) | e.g. "Mar 28"              | --surface-2          | --ink-2              |
| snoozed                | Snoozed                    | --sky-soft           | --sky                |
| completed              | Done                       | --mint-soft          | --mint               |
| recurring              | ↻ Weekly / Monthly / Daily | --lavender-soft      | --violet-2           |

### 2.3 Add Reminder Button

A dashed-border touchable row used as the primary creation entry point in the Home screen Reminders section, the All Reminders list, and the Task Detail screen.

- Container: 18px border-radius, border: 1.5px dashed --lavender-mid, background: transparent

- On hover / pressed: background fills with --violet-dim

- Icon: 26×26px, border-radius 8px, background --violet-dim, color --violet. Shows 🔔 emoji on home/list; ＋ on list page

- Label: 14px/600, color --violet

- Variant in Task Detail (no reminder): border-style solid, border-color --violet, background --violet-dim (more prominent CTA)

### 2.4 Reminder Block (inside Task Detail)

Displayed within the Task Detail screen when a linked reminder exists. Replaces the "Add reminder to this task" CTA.

- Container: 16px radius, background --violet-dim, border: 1.5px solid --violet-glow

- Header row: label text "🔔 REMINDER" (10px/700, --violet, letter-spacing 1.3px) + status badge on the right

- Title: 14px/600, --ink

- Meta: "Date · Time · One-time/Weekly/etc." 12px, --ink-2

- Actions row (due state): primary btn "✓ Done", secondary btn "😴 Snooze", ghost btn "✏️ Edit" — all 13px, padding 10px

- Actions row (upcoming/snoozed state): ghost btn "✏️ Edit" + danger btn "✕ Remove" only

- When task has no reminder: CTA button "Add a reminder to this task" replaces block (see 2.3 variant)

- When task has reminder and another can be added: "Add another reminder" dashed button appears below block

### 2.5 Olivia Message Block (omsg)

Used in: nudge card, reminder detail suggestions, empty states, create sheet confirmation, notification settings. Always written in Fraunces italic.

- Container: 18px radius, background --surface-2, padding 14px/16px

- Label row: "✦ Olivia" or "✦ Olivia noticed" or "✦ Olivia parsed" — 10px/700, --violet, letter-spacing 1.2px, uppercase

- Text: Fraunces italic 15px weight-300, --ink, line-height 1.5

- Appears only when Olivia has a suggestion — never rendered empty

### 2.6 Bottom Sheet (Create / Edit / Snooze / Confirm)

All reminder write actions use a bottom sheet overlay pattern. The sheet lifts from the bottom, dims the content behind it.

- Sheet: background --surface, border-radius 28px 28px 0 0

- Shadow (light): box-shadow 0 -8px 40px rgba(26,16,51,0.12)

- Shadow (dark): box-shadow 0 -8px 40px rgba(0,0,0,0.5)

- Handle: 40×4px pill, background --ink-4, centered, margin-bottom 18px

- Sheet title: Fraunces 22px/700, --ink, margin-bottom 20px

- Content behind sheet: filter: blur(2px); opacity: 0.3 on the page content (not the nav)

- Bottom nav remains visible and unblurred above the sheet

### 2.7 Detail Card

Full-page view for a single reminder. Reached by tapping a reminder row from home or the All Reminders list.

- Back link: "← Reminders" or "← Home" — 13px/600, --violet

- Label: "REMINDER" — 10px/700, --violet, letter-spacing 1.3px, uppercase

- Title: Fraunces 22px/700, --ink, margin-bottom 10px

- Field rows: label 10px/700/--ink-3/uppercase left, value 13px/600/--ink right. Separated by 1px --ink-4 divider. Last row has no divider.

- History section: timeline component — 2px left border --ink-4, dots 8×8px circles (--lavender-mid default, --violet for current/active event)

- Completed state: title gets text-decoration: line-through; opacity 0.6


---

## 3. Screen States Reference

All states are implemented in the companion screens file (olivia-reminders-screens.html). This section provides implementation notes for each screen ID.

**Group 1 — Home Screen**

| **Screen ID** | **State**                    | **Mode** | **Key implementation notes**                                                                                                                        |
|---------------|------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| HOME-1        | No reminders yet             | Light    | Reminders section shows empty Olivia message + Add button. No nudge card. Subtitle: "Nothing urgent today".                                         |
| HOME-2        | Upcoming reminders, none due | Dark     | Reminders section shows 1+ upcoming rows. Snoozed row at 65% opacity. No nudge card. Subtitle: "N reminder(s) coming up".                           |
| HOME-3        | Reminder due + Olivia nudge  | Light    | Nudge card present above Needs doing. Due reminder row in Reminders section shows violet border + "Due" badge. Subtitle: "N things need you today". |
| HOME-4        | Overdue reminder(s) present  | Dark     | Rose-border overdue row + violet due row both visible. Subtitle shows count. No nudge (nudge shown separately for linked-task context).             |

> *HOME-3 nudge copy is driven by the linked task context, not a generic reminder nudge. If the due reminder has no linked task, show: "You have a reminder due: [title]. Want to take care of it now?"*

**Group 2 — All Reminders View (full-page)**

Reached by tapping "All →" on the Home screen Reminders section header. Back link returns to Home.

| **Screen ID** | **State**            | **Mode** | **Key implementation notes**                                                                                                                      |
|---------------|----------------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| REM-LIST-1    | Mixed active states  | Light    | Default view. All filter chip active. Rows grouped: Overdue → Due today → Upcoming → Snoozed. Add button below filter row.                        |
| REM-LIST-2    | Filtered: Done       | Dark     | Done chip active. Shows completed rows at 65% opacity with strikethrough title. Empty-state Olivia message if none. No Add button in Done filter. |
| REM-LIST-3    | Empty — no reminders | Light    | All chip active. Large empty state with 🔔 emoji + Olivia message. Add button below.                                                              |

> *Filter chips scroll horizontally if they overflow the viewport. The "All" chip always shows first. Each chip except "All" shows a count badge only if count \> 0 and the chip is not active.*

**Group 3 — Reminder Detail**

| **Screen ID** | **State**             | **Mode** | **Key notes**                                                                                                                               |
|---------------|-----------------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------|
| DET-1         | Standalone · Upcoming | Light    | No linked task ctx. No Olivia suggestion (not yet due). Actions: Edit, Snooze, Cancel.                                                      |
| DET-2         | Linked · Due          | Dark     | Linked task context card shown above Olivia suggestion. Olivia suggests drafting a follow-up. Actions: Done, Snooze, Edit, Cancel.          |
| DET-3         | Recurring · Overdue   | Light    | Olivia suggests reviewing cadence if missed 3+ times. Actions: Done, Snooze, Edit cadence, Cancel series. History shows missed occurrences. |
| DET-4         | Completed             | Dark     | Title strikethrough + opacity. Green confirmation banner. "Undo completion" ghost button. Edit/cancel actions hidden.                       |

> *DET-3: "Cancel series" triggers the recurring cancel confirmation sheet (ACTION-3). "Cancel this reminder" on a non-recurring item triggers single cancel (ACTION-2).*

**Group 4 — Task Detail + Reminder Block**

| **Screen ID** | **State**                   | **Mode** | **Key notes**                                                                                                                               |
|---------------|-----------------------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------|
| TASK-DET-1    | Task + linked reminder, due | Dark     | Reminder block shows violet-dim bg + violet-glow border. Actions within block: Done, Snooze, Edit. "Add another reminder" dashed btn below. |
| TASK-DET-2    | Task + no reminder          | Light    | "Add a reminder to this task" button uses solid violet border variant (more prominent). No reminder block.                                  |
| TASK-DET-3    | Task + upcoming reminder    | Light    | Reminder block uses subdued variant: --surface-2 bg, --lavender-mid border. Actions: Edit, Remove only (no Done/Snooze until due).          |

> *The reminder block sits between the Item Detail card and the Update Item card in the task detail scroll. Its visual weight should be lower than the primary task action area when not due.*

**Group 5 — Create & Edit Sheets**

| **Screen ID** | **State**                     | **Mode** | **Key notes**                                                                                                                         |
|---------------|-------------------------------|----------|---------------------------------------------------------------------------------------------------------------------------------------|
| CREATE-1      | Structured input — blank      | Light    | Title input focused/empty. Date chips: Today, Tonight, Tomorrow, + Custom. Owner toggle: Jamie default. Recur off. Link row visible.  |
| CREATE-2      | NLP parsed draft confirmation | Dark     | Olivia parsed message shown above form. Fields pre-filled from parse. User can edit before saving. Buttons: Save / Edit (not Cancel). |
| CREATE-3      | Recurring reminder            | Light    | Recur toggle on. Cadence picker expands inline below recur row. First-occurrence date chips replace single-date chips.                |
| EDIT-1        | Edit existing reminder        | Dark     | Sheet shows current values pre-filled. Title editable. Scheduled chip shows current time as active. Buttons: Save changes / Discard.  |

> *CREATE-2 (NLP flow): The "Save reminder" button is the primary action. The "Edit" ghost button opens the structured form (CREATE-1) with pre-filled values. There is no Cancel in the parsed draft view — user must tap Edit to correct the parse.*

**Group 6 — Action Sheets**

| **Screen ID** | **State**                         | **Mode** | **Key notes**                                                                                                             |
|---------------|-----------------------------------|----------|---------------------------------------------------------------------------------------------------------------------------|
| ACTION-1      | Snooze sheet                      | Dark     | Olivia omsg above options. 5 options: 1hr, This afternoon, Tonight, Tomorrow morning, Custom. Ghost Cancel btn at bottom. |
| ACTION-2      | Cancel confirm (single)           | Light    | Reminder title quoted in confirmation copy. Buttons stacked: danger "Yes, cancel reminder" + ghost "Keep it".             |
| ACTION-3      | Cancel confirm (recurring series) | Dark     | Two cancel choices: "this occurrence only" (secondary) vs "entire series" (danger). Ghost "Keep it" below both.           |
| ACTION-4      | Snoozed detail state              | Light    | Sky banner shows snooze-until time. Actions: Change snooze, Un-snooze, Mark done now, Cancel.                             |

> *Snooze sheet times are calculated relative to the user's current local time and date. "This afternoon" = 3:00 PM same day. "Tonight" = 7:00 PM same day. If it is past 3:00 PM, "This afternoon" is replaced by "In 3 hours".*

**Group 7 — Notification Settings**

| **Screen ID** | **State**                     | **Mode** | **Key notes**                                                                                                                     |
|---------------|-------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------|
| NOTIF-1       | Push disabled (default)       | Light    | Master toggle off. Per-type toggles visually disabled (opacity 0.4) and non-interactive. Olivia message explains in-app fallback. |
| NOTIF-2       | Due reminders on, summary off | Dark     | Master toggle on. "Due reminders" on. "Daily summary" off. Olivia message reflects current configuration.                         |

> *Per-type toggles must be non-interactive (pointer-events: none) when master toggle is off. They remain visually present but grayed out to show what will be available when push is enabled.*


---

## 4. Interaction & Approval Rules

### 4.1 User-Initiated Actions (Execute Immediately)

The following actions execute immediately with no confirmation step when user-initiated. They are also immediately reversible (undo button shown in a brief confirmation banner for 5s).

- Mark reminder as done

- Snooze reminder (after user selects a time from the snooze sheet)

- Edit reminder fields (title, time, owner, note, recurrence)

> *Confirmation banner: mint background, "✓ Done" or "😴 Snoozed until [time]" with an "↩ Undo" link. Banner dismisses after 5 seconds or on swipe.*

### 4.2 Actions Requiring Confirmation (Always Confirm)

The following actions always require explicit confirmation regardless of who initiates them.

- Cancel / delete a reminder (single occurrence)

- Cancel entire recurring series

> *The cancel confirmation sheet (ACTION-2 / ACTION-3) must always be triggered before any delete write. There is no undo for cancellation.*

### 4.3 Agentic (Olivia-Proposed) Actions

When Olivia suggests an action (via omsg or nudge card), it always requires user confirmation before executing any write.

| **Olivia suggestion**      | **Confirmation required?**           | **Notes**                                      |
|----------------------------|--------------------------------------|------------------------------------------------|
| Draft follow-up message    | Yes — user taps "Yes, draft it"      | Draft shown for review, not sent automatically |
| Complete a reminder        | Yes — always shown in confirm sheet  | Never auto-completes                           |
| Snooze a reminder          | Yes — user must select time          | Never auto-snoozes                             |
| Review cadence (recurring) | Yes — user must accept edit          | Olivia suggests, user applies change           |
| Create a reminder from NLP | Yes — parsed draft shown for confirm | CREATE-2 flow                                  |

### 4.4 Navigation Model

Variation B uses no new nav tab. All reminder navigation is done through:

1.  Home screen Reminders section → "All →" link → All Reminders full-page view (back: Home)

2.  All Reminders list → row tap → Reminder Detail (back: Reminders)

3.  Reminder Detail → "Edit" → Edit sheet (sheet overlay, no nav change)

4.  Task Detail → "Add a reminder to this task" → Create sheet (sheet overlay, no nav change)

5.  Task Detail → Reminder Block → "Edit" → Edit sheet (sheet overlay)

6.  Task Detail → Reminder Block → badge tap → Reminder Detail (back: task)

> *When navigating from Task Detail to Reminder Detail, the back link reads "← Back to task" and returns to the task, not the reminder list.*


---

## 5. Layout & Spacing Spec

### 5.1 Home Screen — Reminders Section

| **Element**                                | **Spacing / size**                                                                        |
|--------------------------------------------|-------------------------------------------------------------------------------------------|
| Section header row ("Reminders" + "All →") | display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px |
| "Reminders" title                          | Fraunces 19px/700 (section-title class)                                                   |
| "All →" link                               | 12px/600, --violet; tap target ≥ 44px                                                     |
| Reminder inline row                        | margin-bottom: 8px; last-row: margin-bottom: 0                                            |
| Add reminder button                        | margin-top: 10px                                                                          |
| Section from previous divider              | margin-top: 16px (divider height 1px + 16px below)                                        |
| Max rows shown on home                     | 3 active + 1 snoozed. "All →" shows count if more.                                        |

### 5.2 All Reminders Screen

| **Element**                                             | **Spacing / size**                                                                            |
|---------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| Back link                                               | margin-bottom: 18px                                                                           |
| Screen title                                            | margin-bottom: 4px                                                                            |
| Subtitle (count)                                        | margin-bottom: 16px                                                                           |
| Filter chips row                                        | margin-bottom: 20px; overflow-x auto; no scrollbar                                            |
| Add reminder button                                     | margin-bottom: 20px                                                                           |
| Group header (Overdue, Due today, etc.)                 | font: Plus Jakarta Sans 10px/700/--ink-3/uppercase; letter-spacing 1.4px; margin: 18px 0 10px |
| Reminder row inside group                               | margin-bottom: 8px                                                                            |
| Spacing between last row of group and next group header | 10px (row margin) + 8px (header top margin) = covered by 18px header margin                   |

### 5.3 Sheet Padding & Internal Spacing

| **Element**                           | **Spec**                         |
|---------------------------------------|----------------------------------|
| Sheet horizontal padding              | 20px left and right              |
| Sheet top padding (below handle)      | 20px above sheet-title           |
| Sheet bottom padding                  | 100px (clears bottom nav)        |
| Handle margin-bottom                  | 18px                             |
| Form field (inp-grp) margin-bottom    | 14px                             |
| Input field padding                   | 11px top/bottom, 14px left/right |
| Toggle group (cadence picker) padding | 4px; item padding 9px            |
| Action row gap                        | 10px between buttons             |
| omsg margin-bottom (in sheet)         | 16px                             |


---

## 6. Data Fields Surfaced per Component

### 6.1 Fields required by inline row

- id — for navigation to detail

- title — displayed, truncated to single line

- due_state — determines border color, badge, opacity

- scheduled_time — formatted as relative label (Today, Tomorrow, Mar 28, etc.)

- owner — shown in meta line (hidden if same as current user to reduce noise)

- recurrence.cadence — shown as recurrence pill (↻ Weekly) if recurring

- linked_item_id — presence triggers linked-task pill

### 6.2 Fields required by detail card

All inline row fields plus:

- note — optional field, shown in Note row if present

- created_at — shown in History timeline

- completed_at — shown in History if completed

- snoozed_until — shown as banner if snoozed; in History timeline

- cancelled_at — only relevant if viewing from Done/Cancelled filter

- history[] — array of timeline events: { event_type, timestamp, actor }

- linked_item — full task object (title, owner, status) for context card

- next_occurrence — shown in recurring detail as "Next after done: [date]"

### 6.3 Fields required by create/edit sheet

- title — text input

- scheduled_time — date picker chips + custom

- owner — toggle (stakeholder \| spouse \| unassigned)

- is_recurring — boolean toggle

- recurrence.cadence — daily \| weekly \| monthly (only if is_recurring)

- note — optional textarea

- linked_item_id — optional, set via link-task row


---

## 7. Edge Cases & Failure Modes

### 7.1 NLP Parse Fallback

If AI is unavailable when the user tries to create a reminder via Olivia chat, fall back to CREATE-1 (structured form). Show a brief note in the sheet: "I couldn't parse that — fill in the details below." No error state, no broken screen.

### 7.2 Reminder List Order

Within each group, sort by scheduled_time ascending (earliest first). Recurring reminders with missed occurrences are ordered by their most recent scheduled time.

### 7.3 Home Section Truncation

Show at most 3 active (overdue + due + upcoming combined) + 1 snoozed row on the home screen. If there are more, the "All →" link shows a count: "All (7) →". Prioritise overdue rows over upcoming rows when truncating.

### 7.4 Recurring Completion

When user marks a recurring reminder done: (1) current occurrence transitions to completed, (2) next occurrence is automatically scheduled per cadence and appears in the upcoming list. Do not show a confirmation sheet for this scheduling — it is silent and automatic.

### 7.5 Snooze Time Edge Cases

"This afternoon" option is hidden if current time is after 2:00 PM — replaced by "In 3 hours". "Tonight" is hidden if current time is after 6:00 PM. Times shown in user's local timezone.

### 7.6 Linked Task Deleted

If a linked task is deleted after a reminder was linked to it: the reminder becomes a standalone reminder. The linked-task context card and linked-task pill are removed. The 🔗 pill is removed from the row. No error is shown — the reminder continues to function normally.

### 7.7 Dark Mode Sheet

Sheet overlay background must use --surface token (#1C1A2E in dark), not --bg. Form inputs inside the sheet use --surface-2 as background and --lavender-mid as active border — not the default light-mode values.

### 7.8 Long Reminder Titles

In inline rows: single line, overflow ellipsis. In detail cards: title wraps to 2 lines max; beyond 2 lines, truncate with ellipsis. In sheets: title input does not expand — user scrolls within the input field.


---

## 8. Accessibility Notes

- All interactive elements must have a minimum tap target of 44×44px

- Badge text must not be the only signal for due-state — border-left color provides a second channel

- Empty state text must meet contrast ratio ≥ 4.5:1 against --bg (Fraunces italic at 15px/300 on --surface-2 passes)

- Sheet overlays must trap focus while open; focus returns to the triggering element on close

- Snooze options should be navigable via VoiceOver/TalkBack with full labels (e.g. "In 1 hour, 10:41 AM")

- Recurring badge (↻) uses text ↻ which may need a visually hidden label for screen readers: aria-label="Recurring weekly"

*— End of specification —*

---

*— End of specification —*
