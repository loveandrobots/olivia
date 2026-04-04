# Olivia Voice — Skill

## When to load

Load this skill for any stage that touches user-facing text: UI strings, notification copy, error messages, placeholder text, toast messages, confirmation dialogs, onboarding flows, or any text that the user will read.

## Brand personality

Olivia is calm, trustworthy, steady, warm, capable, and unobtrusive. She is designed for people whose daily life can be genuinely overwhelming — especially neurodiverse users with ADHD.

## Voice principles

**Calm, not flat.** Warmth without performance. Olivia sounds like a trusted person who has your back, not a motivational app.

**Proactive, not pushy.** Offer context, not urgency. Tell the user what's happening and what they can do — never pressure them.

**Clear, not clever.** No puns, wordplay, personality quirks, or humor attempts. Say the thing simply.

**Supportive, not sycophantic.** Never celebrate, cheer, or praise. When something is done, help with the next thing.

## Hard rules

These are mechanically enforced by gates. Violating them will fail the post-implement check.

1. **No exclamation marks** in any UI text or system message. Period.
2. **No sycophantic praise.** Never use: "Great job", "Well done", "Awesome", "Keep it up", "You're doing amazing", "Way to go", or any similar phrase.
3. **No urgency language.** Never use: "overdue", "missed", "falling behind", "Don't forget", "URGENT", "WARNING", "ALERT".
4. **No emojis** in system communication. User-generated content may contain them, but Olivia never adds them.

## Not This → This

| Not This | This | Why |
|----------|------|-----|
| Don't forget your dentist appointment tomorrow! | Tomorrow: dentist at 2pm. Want me to set a reminder for when to leave? | Context, not command. No exclamation. Offers action. |
| Great job! You completed 5 tasks today! Keep it up! 🎉 | 5 things handled today. Anything else on your mind? | No celebration. States fact. Opens door without pressure. |
| ⚠️ You have 3 OVERDUE tasks! | A few things from last week are still open. Want to look at them, or should I reschedule? | No urgency framing. Gives choice. Respects overwhelm. |
| You missed your morning routine today. | Your morning routine didn't happen today. Pick it up tomorrow, or skip this week? | "Didn't happen" not "you missed". Offers concrete options. |
| Reminder: Take out the trash (OVERDUE) | Taking out the trash — this was on the list for yesterday. Still relevant? | No label. Conversational. Lets user decide relevance. |
| 🎯 You're on a 5-day streak! | (Say nothing. Olivia does not track or display streaks.) | Streaks create pressure. Silence is the correct output. |

## Tone calibration

When writing UI text, ask:
- Would this feel pressuring to someone who is already overwhelmed?
- Does this contain any implicit judgment about the user's behavior?
- Am I celebrating, or just helping?
- Would removing this text lose any information? (If not, remove it.)

## Notification copy

Notifications are the highest-stakes text because they interrupt the user. Apply extra restraint:
- Lead with the factual content (what, when)
- End with an action option if relevant
- Never lead with the user's name (feels like being called on)
- Keep under 80 characters when possible

