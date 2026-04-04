# Olivia Brand Gate — Skill

## When to load

Load this skill at the **end** of the implement stage, before committing. Use it as a pre-flight checklist. Every item here is mechanically checked by `gates/post-implement.sh` — if you skip this checklist, the gate will catch it and you'll bounce back to implement.

## Pre-commit checklist

Before committing any code that touches UI, notifications, API responses, or user-facing text, verify all of the following:

### Text content

- [ ] No exclamation marks in UI strings, toast messages, notifications, error messages, or placeholder text
- [ ] No sycophantic phrases: "Great job", "Well done", "Awesome", "Keep it up", "You're doing amazing", "Way to go"
- [ ] No urgency phrases: "overdue", "missed", "falling behind", "Don't forget", "URGENT", "WARNING", "ALERT"
- [ ] No emojis added by the system (user content may contain them)
- [ ] No comparative language: "You did more than...", "Better than last week", "Compared to..."
- [ ] Notification text is under 80 characters and leads with factual content

### Visual design

- [ ] No red colors anywhere: no red text, backgrounds, borders, badges, dots, or icons
- [ ] No high-saturation alert colors (bright orange warnings, yellow caution)
- [ ] No streak counters, day counts, or "X in a row" displays
- [ ] No badges, scores, points, levels, achievements, or leaderboards
- [ ] No dense dashboard layouts — each screen has one clear purpose
- [ ] No ALL CAPS text used for emphasis

### Interaction patterns

- [ ] No auto-playing sounds or haptic feedback triggered without user action
- [ ] No modals stacked on modals
- [ ] Destructive confirmations describe the action ("Archive this list") not generic ("OK")
- [ ] No dark patterns: no guilt trips for declining, no hidden options, no manufactured urgency

### Architecture

- [ ] Domain package has no I/O imports (no fetch, no fs, no database)
- [ ] Contracts package imports only from zod
- [ ] No reverse dependency direction (domain importing from api/pwa, contracts importing from domain)
- [ ] Every domain mutation ends with `.parse()` on its return value
- [ ] API tests use Fastify test client, not direct function calls
- [ ] Every user-facing mutation follows the preview-confirm pattern

## What to do when you find a violation

1. Fix it. Don't comment it out or add a TODO.
2. If fixing requires a design decision (e.g., what color to use instead of red), refer to `docs/vision/design-foundations.md` and `docs/brand/`.
3. If the violation is in existing code you didn't write, fix it anyway if it's in your diff. Don't introduce a fix in one file while leaving the same violation in another file you touched.

## Common mistakes agents make

**Writing hollow confirmations:** "Saved successfully!" → "Saved" (no exclamation, no "successfully")

**Excitement in empty states:** "No items yet! Add your first one!" → "No items right now."

**Red for errors:** Using red text or borders for validation errors. Use the app's muted error color from the design system instead.

**Urgency in time displays:** "Due in 2 hours!" or "OVERDUE" labels. Just show the time: "Due at 3pm" or "Was due Tuesday".

**Celebrating completion:** "All done! Great work!" → "All caught up." or simply show the empty state.

