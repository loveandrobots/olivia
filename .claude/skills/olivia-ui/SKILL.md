# Olivia UI — Skill

## When to load

Load this skill for any stage that creates or modifies UI components, layouts, screens, styles, or visual design.

## Core design philosophy

Olivia's interface is designed for people who are easily overwhelmed. Every design decision should reduce cognitive load, never increase it. The interface should feel like a quiet room, not a command center.

**Absorb, don't add.** The UI should absorb complexity on behalf of the user. If something can be inferred, don't ask. If something can be deferred, don't show it now.

**Progressive disclosure.** Show the minimum needed for the current moment. Details are available on demand, never forced into view. Default states should be calm and sparse.

**Steady, not peppy.** No animations that celebrate. No confetti, no bouncing elements, no achievement unlocks. Transitions should be subtle and functional (indicating state change), never decorative.

## Color palette

Olivia uses muted, low-saturation colors. The palette is designed to avoid visual anxiety.

**Never use:**
- Red in any context (no red badges, borders, text, or backgrounds)
- High-saturation alert colors (bright orange, bright yellow warnings)
- High-contrast color combinations that create visual urgency

**Prefer:**
- Muted earth tones and soft neutrals
- Low-contrast text hierarchy (primary, secondary, tertiary)
- Soft accent colors for interactive elements
- Generous whitespace as a design element

Refer to `docs/vision/design-foundations.md` for specific color values, and `docs/brand/` for the full brand palette.

## Typography

- Use the app's established type scale consistently
- Body text should be comfortable reading size (16px minimum on mobile)
- Hierarchy through size and weight, not color or decoration
- No ALL CAPS for emphasis (it reads as shouting)
- No bold for emphasis in body text (use hierarchy instead)

Refer to `docs/vision/design-foundations.md` for the type scale.

## Spacing

- Generous margins and padding — cramped layouts create anxiety
- Consistent spacing scale (use the design system tokens, not arbitrary values)
- Touch targets minimum 44x44px (iOS HIG)
- Lists should breathe — items need vertical space between them

## Component patterns

**Empty states:** Calm and brief. "No reminders right now" not "You have no reminders! Add one to get started!" Never use empty states to upsell features or push engagement.

**Loading states:** Simple skeleton or subtle indicator. No spinner with motivational text. No "Almost there!" messages.

**Error states:** State what happened and what to do. No blame ("Something went wrong" not "You entered an invalid..."). No dramatic styling.

**Confirmation dialogs:** Used only for destructive or irreversible actions. The confirm button should describe the action ("Archive this list") not be generic ("OK", "Confirm"). Never use red for confirm buttons.

**Toast messages:** Brief, factual, auto-dismiss. "Reminder saved" not "Your reminder has been saved successfully!" No exclamation marks.

## Things that must not exist in the UI

These are mechanically enforced by gates:
- Red notification badges or dot indicators
- Streak counters, streaks, or "days in a row" displays
- Achievement badges, scores, points, levels, or leaderboards
- Dense dashboards with multiple data-heavy widgets
- Auto-playing sounds or haptic buzzing
- Comparative or competitive language ("You did more than last week")

## Layout principles

- Single-column layouts preferred on mobile
- One primary action per screen
- Navigation should be simple and predictable
- Back navigation must always work and be obvious
- No modals stacked on modals
- Bottom sheets for secondary actions (not modals)

