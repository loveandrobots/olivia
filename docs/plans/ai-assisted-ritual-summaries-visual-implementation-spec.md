---
title: "Olivia — AI-Assisted Ritual Summaries: Visual Implementation Spec"
date: "March 2026"
status: "Design handoff for agentic implementation"
---

# Olivia — AI-Assisted Ritual Summaries
## Visual Implementation Spec

*March 2026 · Design handoff for agentic implementation*

---

> **Scope of this document**
>
> This spec defines every UI state required to implement AI-assisted planning ritual summaries — the first Horizon 5 feature. It covers the AI draft section layout in the review flow (Steps 1 and 2), loading state while generation is in progress, edit affordance for inline text editing, accept/dismiss interaction controls, the "Drafted by Olivia" attribution indicator before acceptance, error and offline degraded states, and the review record detail screen changes (accepted narrative display with "AI-assisted" attribution label, null narrative state).
>
> Key design decisions resolved here: draft section layout (AI narrative card above structured item list, always-visible structured list below), edit affordance (inline tap-to-edit within the draft card), accept/dismiss control placement (fixed footer pair, "Use this summary" primary + "Dismiss" ghost), Olivia-attribution visual indicator (lavender-tinted card with Olivia wordmark badge), loading state treatment (inline skeleton card in each section's draft area), error/offline state treatment (calm inline message in the draft area, no disruption to step controls), review record detail with accepted narrative (narrative card with "AI-assisted" badge above carry-forward section), and null narrative state in review record detail (section omitted entirely — no placeholder shown).
>
> **Reused without change:** The per-screen spouse read-only banner (L-009), bottom nav shell, review flow step shell (segmented progress indicator, fixed footer, step content area from the planning ritual support visual spec), and workflow-type color/icon system. The structured item list within review sections is unchanged from the Phase 1 planning ritual support implementation.

---

## 0. Design Decisions Resolved

The following questions were deferred from `docs/specs/ai-assisted-ritual-summaries.md` or designated as designer decisions. Each is resolved here with rationale.

---

### 0.1 Draft Section Layout: Narrative Card Above Structured Item List

**Decision:** Within Steps 1 (Last week recap) and 2 (Coming week overview) of the review flow, the AI narrative draft appears as a distinct card at the top of the step content area, above the structured item list. The structured item list remains fully visible and scrollable below the draft card at all times — it is never hidden.

**Rationale:** The feature spec requires the structured list to remain visible as a verification layer. Placing the draft card at the top makes it the first thing the household member reads (the desired interaction pattern: "Olivia wrote a summary — want to use it?") while the structured list sits naturally below as context. The card-over-list arrangement mirrors how pull-quotes and summaries work in reading interfaces: the summary is the lead, the source is the backup. Making both visible simultaneously ensures the household member can verify narrative accuracy against the underlying data in a single scroll.

**Layout structure (per step):**
```
[Draft card — AI narrative content, full width, with attribution badge]
[gap: 16px]
[Structured item list — unchanged from Phase 1 review flow]
```

The draft card occupies the top of the scroll content area. On step open, the draft card is immediately visible (loading state if generation is still in progress; content when ready). The scroll position opens at the top of the step, not at the structured list.

---

### 0.2 Olivia-Attribution Visual Indicator: Lavender-Tinted Draft Card

**Decision:** The AI draft card uses a `--lavender-soft` background with a small "Drafted by Olivia" badge in the top-left corner of the card. The badge uses the Olivia wordmark (Fraunces italic) at 11px in `--violet`, adjacent to a small sparkle-style icon (✦). The card border is `1.5px solid var(--lavender-mid)`.

**Rationale:** The attribution must be visually distinct but calm. A lavender background directly ties the AI content to Olivia's brand identity (lavender is the Olivia brand palette anchor) without introducing a new visual element that could feel alarming. The `--lavender-soft` treatment is already used for the spouse banner (L-009), which means it is a known "system-generated context" signal in the design language. The "✦ Drafted by Olivia" badge is small, positioned at the top of the card, and does not dominate the narrative text. It communicates the source without making the AI origin feel ominous or unreliable.

The draft card is visually distinct from:
- The white/`--surface` cards used in item lists (those have `--surface` bg, not lavender)
- The spouse banner (full-width banner, different layout context)
- The carry-forward notes textarea (plain `--surface` input field)

**Attribution badge specs:**
- Badge: `✦ Drafted by Olivia`
- Font: Fraunces italic 11px, `--violet`
- Icon: ✦ (sparkle, 10px, `--violet`, 4px right margin before text)
- Position: top-left inside card padding, 12px from top, 14px from left
- The badge does not have its own background or border — it sits on the `--lavender-soft` card bg

---

### 0.3 Edit Affordance: Tap-to-Edit Inline Within Draft Card

**Decision:** The draft narrative text is editable inline within the draft card. When the household member taps anywhere on the narrative text body, the text becomes an editable textarea in place. A thin `--violet` focus ring appears on the card border to signal edit mode. The "Drafted by Olivia" badge remains visible during editing. The "Use this summary" button in the footer remains active during editing — tapping it saves the current (edited) text.

**Rationale:** An inline tap-to-edit pattern is the simplest possible edit affordance on mobile — it requires no modal, no navigation, and no dedicated "edit mode" button. The household member can tap into the text and modify it directly, then tap "Use this summary" to accept the edited version. This matches how notes and caption editing works across iOS and Android. The discovery path is natural: the text looks like a paragraph, and tapping it behaves as expected on a mobile touch surface. No explicit "Edit" button is needed; a small "tap to edit" microcopy hint can appear below the narrative text for first-use guidance (visible until the first acceptance, then suppressed).

**Edit mode indicators:**
- Card border changes from `1.5px solid var(--lavender-mid)` to `1.5px solid var(--violet)` on focus
- The textarea renders with no visible background change (lavender remains) — only the border signals focus
- Keyboard appears from below; the draft card scrolls up to remain visible above the keyboard
- "Use this summary" button copy remains unchanged in edit mode

**Discoverability hint (first-use only):**
- Below the narrative text, before the household member has edited for the first time: `Tap to edit` in PJS 11px `--ink-3`, italicized
- Once the user has tapped the text (entered edit mode), this hint is never shown again (suppressed via local preference flag, not server state)
- The hint does not appear after an accepted narrative is viewed in the review record detail (the edit affordance only applies to the live draft, not stored narratives)

---

### 0.4 Accept/Dismiss Controls: Fixed Footer Pair

**Decision:** The accept and dismiss affordances are placed in the fixed footer of the review flow, replacing (or extending) the standard step navigation footer. The footer shows:

- **Primary action (left):** `"Dismiss"` — ghost button style (`--ink` text, no fill, `--ink-4` border)
- **Primary action (right):** `"Use this summary"` — filled button style (`--violet` bg, white text)

This footer pair is shown only when a draft is available (content state). During loading state, the footer shows only the standard step advance control in a disabled state ("Continue →" greyed out) until either the draft arrives or the timeout elapses. During error/offline state, the footer returns to the standard step controls immediately.

**Rationale:** Placing accept/dismiss in the footer ensures they are always reachable in a single tap without scrolling, per the spec's anti-pattern prohibition ("do not require scrolling to reach the accept/dismiss affordance"). The footer is already the fixed navigation zone for the review flow — adding the draft controls there is consistent with how the review flow's "Complete review" action works. The dismiss action is a ghost button to signal it is a secondary/opt-out action, not destructive — it is not styled as a red "delete" button because dismissing a summary is a normal, non-harmful choice.

**Footer layout (draft available state):**
```
┌──────────────────────────────────────────────────────┐
│  [Dismiss]                    [Use this summary →]  │
│  ghost, --ink-4 border        filled, --violet bg   │
└──────────────────────────────────────────────────────┘
```

**Footer layout (loading state):**
```
┌──────────────────────────────────────────────────────┐
│                                    [Continue → ]    │
│                           disabled, --ink-3 text    │
└──────────────────────────────────────────────────────┘
```

**Footer layout (after accept or dismiss — advancing to next step):**
```
┌──────────────────────────────────────────────────────┐
│                                    [Continue →]     │
│                                    standard active  │
└──────────────────────────────────────────────────────┘
```

After accepting, the footer immediately transitions to the standard "Continue →" state. The accept action is complete; the draft card collapses (see §3.3). After dismissing, same transition — the draft card disappears, structured list fills the section, footer becomes "Continue →".

---

### 0.5 Loading State: Inline Skeleton in Draft Area

**Decision:** While AI generation is in progress, the draft card area shows a skeleton loading state — three lines of animated shimmer content inside the `--lavender-soft` card, with the "Drafted by Olivia" badge visible but with reduced opacity (0.5) to signal that the content is pending. The shimmer animation uses the standard Olivia loading pattern (left-to-right gradient sweep).

**Rationale:** An inline loading state scoped to the draft card area keeps the overall review step layout stable. The structured item list is already visible below the draft card during loading — the household member can review items while waiting. The skeleton card communicates that content is coming (not that something is broken), and the lavender background ensures the loading state is attributed to Olivia even before content appears.

**Loading state specs:**
- Card background: `--lavender-soft`
- Badge "✦ Drafted by Olivia": visible at 50% opacity
- Content area: three shimmer lines
  - Line 1: 90% card width, 14px height, 8px radius, `--lavender-mid` bg with shimmer overlay
  - Line 2: 75% card width, 14px height, 8px radius
  - Line 3: 40% card width, 14px height, 8px radius
  - Line gap: 8px between lines
- Shimmer animation: 1.4s linear infinite, left-to-right gradient (`--lavender-mid` base, `--lavender-soft` highlight)
- Card height during loading: approximately 88px (matches a 2–3 line narrative card at rest)
- Loading copy (below shimmer): `"Olivia is drafting your recap…"` (Step 1) or `"Olivia is drafting your overview…"` (Step 2) in PJS 12px `--ink-3`, centered below the shimmer lines, 8px below line 3

---

### 0.6 Error and Offline State: Calm Inline Message, No Disruption

**Decision:** When AI generation fails (provider error, timeout, or network error) or the device is offline at review open, the draft card area shows a calm, non-alarming inline message. The card uses the same `--lavender-soft` background with the "Drafted by Olivia" badge, but the body text is the fallback message. No error icon, no red color, no modal. The footer immediately shows the standard "Continue →" state.

**Error state card content:**
```
✦ Drafted by Olivia
─────────────────────────────────────────
Olivia couldn't generate a summary right now.
PJS 14px 400, --ink-2, left-aligned
```

**Offline state:** When the device has no connectivity when the review opens, the draft card does not appear at all — neither the loading skeleton nor the error message. The step content renders only the structured item list (the same experience as Phase 1 planning ritual support, prior to this feature). The footer shows the standard "Continue →" state immediately. No "offline" message is shown in the draft area — the offline case should feel identical to Phase 1, not like a degraded feature.

**Rationale:** The spec explicitly states: "the review flow must always be completable." The offline case should feel like the pre-H5 experience, not like a broken feature. For the error case, showing the lavender card with a calm fallback message (rather than hiding the card entirely) preserves the layout stability — the section does not visually reflow between loading and error states. The card is always present; its content changes.

**Independent degradation:** Each section (recap and overview) degrades independently. If the recap draft loads successfully but the overview generation fails, Step 1 shows the normal draft and Step 2 shows the error state. The sections do not affect each other.

---

### 0.7 Review Record Detail — Accepted Narrative Layout

**Decision:** In the review record detail screen (accessed from activity history), when at least one narrative field is non-null, a narrative section appears above the carry-forward notes section. Each accepted narrative (recap and/or overview) is shown in a card with the same `--lavender-soft` background as the draft card, with an "AI-assisted" badge (replacing the "Drafted by Olivia" badge used in the live flow).

**Section order in review record detail (with narratives):**
1. Review metadata header (date, window, ritual name)
2. **Last week recap narrative** (if `recap_narrative` is non-null) — lavender card with "AI-assisted" badge
3. **Coming week overview narrative** (if `overview_narrative` is non-null) — lavender card with "AI-assisted" badge
4. Carry-forward notes (unchanged from Phase 1)
5. Window summary (structured item counts, unchanged from Phase 1)

If only one narrative is non-null, only that narrative card appears. The other is omitted — no placeholder, no "no summary" row.

**"AI-assisted" badge specs (review record detail only):**
- Badge: `✦ AI-assisted`
- Font: PJS 11px 500, `--violet`
- Icon: ✦ (10px, `--violet`, 4px right margin)
- Position: top-left inside card padding (same as "Drafted by Olivia" badge)
- Card background: `--lavender-soft`
- Card border: `1.5px solid var(--lavender-mid)`

**Rationale:** The "Drafted by Olivia" badge applies to the live draft flow (where the origin is relevant to the accept/dismiss decision). In the stored review record, the correct attribution is "AI-assisted" — the content has been accepted by the household member and is now their record, but its AI origin is preserved per the H5 behavioral guardrail. Using "AI-assisted" rather than "Drafted by Olivia" in the stored record signals that this is historical attribution, not an active proposal.

The lavender background is preserved in the stored view because it is the persistent attribution signal. Even after acceptance, the card remains visually distinct from carry-forward notes (which are in a plain `--surface` text area view) and from the structured item list rows. The household member must always be able to tell which content was AI-generated vs. which they wrote.

---

### 0.8 Null Narrative State in Review Record Detail

**Decision:** When both `recap_narrative` and `overview_narrative` are null (the household member dismissed both drafts, or the review predates the H5 feature), the review record detail renders exactly as it did in Phase 1: review metadata, carry-forward notes, window summary. No narrative sections appear, no "no AI summary" placeholder, no indication that an AI draft was available or dismissed.

**Rationale:** A "no AI summary" placeholder would imply the AI draft was expected but missing — which could feel like a failure state for reviews where the household member intentionally dismissed both drafts, or for reviews completed before H5 was available. Omitting the section entirely is the clearest, most neutral treatment: the review record detail looks and behaves exactly as it did before H5. This is the correct behavior per the spec ("show no narrative section at all").

---

## 1. Design System Constraints

All AI-Assisted Ritual Summaries UI must strictly conform to the Olivia design system (`docs/vision/design-foundations.md`). No new color tokens are introduced in this spec. All AI-draft UI uses existing `--lavender-soft`, `--lavender-mid`, and `--violet` tokens that are already in the design system.

### 1.1 New UI Element: Draft Card

The draft card is the primary new element introduced by this spec. It is not a standard item row, not a task card, and not a banner. It is a narrative container — a larger, prose-holding card that sits at the top of a review step.

| **Property** | **Value** |
|---|---|
| Background | `--lavender-soft` |
| Border | `1.5px solid var(--lavender-mid)` |
| Border radius | `16px` |
| Shadow | `var(--shadow-sm)` |
| Horizontal padding | `16px` |
| Vertical padding | `14px top, 12px bottom` |
| Min height | `88px` (approximately 3-4 lines of narrative text) |
| Max height | unconstrained — card grows with text |

The draft card does not have a tap-to-navigate behavior. The full-card tap activates inline editing (§0.3).

### 1.2 Typography for AI Content

| **Role** | **Font** | **Size** | **Weight** | **Usage** |
|---|---|---|---|---|
| Attribution badge | Fraunces italic | 11px | 400 | "✦ Drafted by Olivia" / "✦ AI-assisted" |
| Draft narrative text (read) | Plus Jakarta Sans | 14px | 400 | AI-generated paragraph in `--ink` |
| Draft narrative text (edit mode) | Plus Jakarta Sans | 14px | 400 | Editable textarea, same size |
| Loading fallback copy | Plus Jakarta Sans | 12px | 400 | "Olivia is drafting your recap…" in `--ink-3` |
| Error fallback copy | Plus Jakarta Sans | 14px | 400 | "Olivia couldn't generate a summary right now." in `--ink-2` |
| Tap-to-edit hint | Plus Jakarta Sans | 11px | 400 italic | "Tap to edit" in `--ink-3`, first-use only |
| Step label (above draft) | Plus Jakarta Sans | 11px | 600 | "LAST WEEK RECAP" or "COMING WEEK OVERVIEW" in `--ink-3` uppercase, 4px letter-spacing |

### 1.3 Color Token Usage

| **Visual Purpose** | **Token** |
|---|---|
| Draft card background | `--lavender-soft` |
| Draft card border (resting) | `--lavender-mid` |
| Draft card border (edit focus) | `--violet` |
| Attribution badge text + icon | `--violet` |
| Narrative text | `--ink` |
| Fallback / loading copy | `--ink-2` / `--ink-3` |
| Tap-to-edit hint | `--ink-3` |
| Accept button bg | `--violet` |
| Accept button text | white (`#FFFFFF`) |
| Dismiss button text | `--ink` |
| Dismiss button border | `--ink-4` |
| Step label | `--ink-3` |
| Shimmer base | `--lavender-mid` |
| Shimmer highlight | `--lavender-soft` |

### 1.4 Footer Button Specs

**"Use this summary" (accept):**
- Background: `--violet`
- Text: white, PJS 14px 600
- Border radius: 10px
- Padding: 12px horizontal, 10px vertical
- Min-width: 160px
- Tap state: `transform: scale(0.97)`, 150ms ease

**"Dismiss" (dismiss):**
- Background: transparent
- Border: `1.5px solid var(--ink-4)`
- Text: `--ink`, PJS 14px 500
- Border radius: 10px
- Padding: 12px horizontal, 10px vertical
- Min-width: 100px
- Tap state: border becomes `--ink-3`, 150ms

---

## 2. Screen Inventory

| **Identifier** | **Screen** | **State description** |
|---|---|---|
| AISUM-1 | Review Flow Step 1 (Recap) | Loading: AI generation in progress |
| AISUM-2 | Review Flow Step 1 (Recap) | Draft ready: narrative card with accept/dismiss |
| AISUM-3 | Review Flow Step 1 (Recap) | Edit mode: household member editing draft text |
| AISUM-4 | Review Flow Step 1 (Recap) | Error state: AI generation failed |
| AISUM-5 | Review Flow Step 1 (Recap) | Offline state: no draft shown, structured list only |
| AISUM-6 | Review Flow Step 1 (Recap) | Post-accept: narrative accepted, advancing to Step 2 |
| AISUM-7 | Review Flow Step 1 (Recap) | Post-dismiss: draft dismissed, structured list only |
| AISUM-8 | Review Flow Step 2 (Overview) | Same states as AISUM-1–7, for overview section |
| AISUM-9 | Review Record Detail | With accepted narratives (one or both) |
| AISUM-10 | Review Record Detail | Null narrative state (both dismissed or pre-H5 record) |

---

## 3. Screen Layouts

### 3.1 Review Flow Shell (H5 Extension)

The review flow shell is inherited unchanged from the planning ritual support visual spec. The AI draft additions are scoped to the step content area of Steps 1 and 2. Step 3 (carry-forward notes) and the review completion flow are unchanged.

```
┌──────────────────────────────────────────────────────┐
│  [Back ←]          Weekly Review          [close ×] │  ← nav header
├──────────────────────────────────────────────────────┤
│  [●──────────○──────────○]  Step 1 of 3             │  ← segmented progress
├──────────────────────────────────────────────────────┤
│                                                      │
│  Scroll area (step content):                         │
│  ─────────────────────────────────────────────────   │
│  LAST WEEK RECAP   ← step label (PJS 11px 600 --ink-3│
│                                                      │
│  [AISUM-1/2/3/4/5: draft card or empty area]         │
│                                                      │
│  [gap: 16px]                                         │
│                                                      │
│  [Structured item list — unchanged from Phase 1]     │
│  ─────────────────────────────────────────────────   │
│                                                      │
├──────────────────────────────────────────────────────┤
│  [Footer: Dismiss / Use this summary]                │  ← fixed footer
└──────────────────────────────────────────────────────┘
```

**Header measurements:** Inherited from planning ritual support visual spec.
**Progress indicator:** Unchanged — ● active, ○ incomplete.
**Step label:** All-caps small label directly above the draft card area.

---

### 3.2 AISUM-1: Loading State

```
LAST WEEK RECAP

┌──────────────────────────────────────────────────────┐  ← --lavender-soft bg, 16px radius
│  ✦ Drafted by Olivia   ← Fraunces italic 11px --violet, 50% opacity          │
│                                                      │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ [shimmer]  │  ← line 1: 90% width
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      [shimmer]  │  ← line 2: 75% width
│  ░░░░░░░░░░░░░░░░░░░░░░          [shimmer]  │  ← line 3: 40% width
│                                                      │
│  Olivia is drafting your recap…                      │  ← PJS 12px --ink-3, centered
└──────────────────────────────────────────────────────┘

[16px gap]

[Structured item list: routines, reminders, meals, etc. — fully rendered]
```

**Footer (loading state):**
```
┌──────────────────────────────────────────────────────┐
│                             [Continue →  disabled]  │  ← PJS 14px, --ink-3
└──────────────────────────────────────────────────────┘
```

**Design notes:**
- The "Continue →" button is visually disabled (greyed text, `--ink-3`, non-interactive) while loading is in progress
- The structured item list is fully rendered and scrollable — the household member can review items during the loading wait
- The shimmer animation is subtle, not attention-grabbing — it communicates "something is loading" without distracting from the item list below

---

### 3.3 AISUM-2: Draft Ready State

```
LAST WEEK RECAP

┌──────────────────────────────────────────────────────┐  ← --lavender-soft bg, 16px radius, --lavender-mid border
│  ✦ Drafted by Olivia   ← Fraunces italic 11px --violet                       │
│                                                      │
│  You had a productive week. Morning walk was         │  ← PJS 14px 400 --ink
│  completed every day, and the HVAC service was       │
│  finally closed out by Alex on Friday. Dinner        │
│  was covered Monday through Wednesday with           │
│  the salmon and pasta from your meal plan.           │
│                                                      │
│  Tap to edit   ← PJS 11px italic --ink-3 (first-use only, 8px above card bottom)
└──────────────────────────────────────────────────────┘

[16px gap]

[Structured item list]
```

**Footer (draft ready state):**
```
┌──────────────────────────────────────────────────────┐
│  [Dismiss]                    [Use this summary →]  │
└──────────────────────────────────────────────────────┘
```

**Animation on draft appearance:** The draft card fades in from 0 to 1 opacity over 200ms with a 6px upward translate (enters from slightly below its final position). This is a subtle arrival animation that signals content has loaded, not an intrusive notification.

**Design notes:**
- The narrative text is left-aligned, 14px, full `--ink` opacity — it reads as clean household copy, not as "AI output"
- The attribution badge is always the topmost element inside the card — it must never be scrolled off while the text body is visible
- Card max-width follows the scroll area width (full content width minus 22px horizontal padding on each side)
- No "regenerate" button in Phase 1

---

### 3.4 AISUM-3: Edit Mode

```
LAST WEEK RECAP

┌──────────────────────────────────────────────────────┐  ← --lavender-soft bg, --violet border (focus ring)
│  ✦ Drafted by Olivia                                 │
│                                                      │
│  You had a productive week. Morning walk was         │  ← editable textarea, PJS 14px, --ink
│  completed every day, and the HVAC service was       │  [cursor visible mid-text]
│  finally|closed out by Alex on Friday...             │
│                                                      │
└──────────────────────────────────────────────────────┘

[16px gap]

[Structured item list — scrollable below keyboard via adjusted viewport]
```

**Footer (edit mode — unchanged from draft ready):**
```
┌──────────────────────────────────────────────────────┐
│  [Dismiss]                    [Use this summary →]  │
└──────────────────────────────────────────────────────┘
```

**Design notes:**
- The "Tap to edit" hint disappears as soon as tap-to-edit is activated (replaced by the active cursor)
- The attribution badge remains visible during editing — it is not part of the editable text
- The "Use this summary" button accepts whatever text is currently in the field (original or edited)
- Tapping outside the card (on the structured list area) dismisses the keyboard but does not dismiss the draft — the edited text is preserved in the field
- There is no "revert to original" button in Phase 1 — if the user wants the original text, they must use the OS undo gesture (standard iOS/Android behavior)

---

### 3.5 AISUM-4: Error State (AI Generation Failed)

```
LAST WEEK RECAP

┌──────────────────────────────────────────────────────┐  ← --lavender-soft bg, --lavender-mid border
│  ✦ Drafted by Olivia                                 │
│                                                      │
│  Olivia couldn't generate a summary right now.       │  ← PJS 14px 400, --ink-2
│                                                      │
└──────────────────────────────────────────────────────┘

[16px gap]

[Structured item list — full display]
```

**Footer (error state — standard step advance, immediately active):**
```
┌──────────────────────────────────────────────────────┐
│                                    [Continue →]     │
└──────────────────────────────────────────────────────┘
```

**Design notes:**
- The card is still present with the attribution badge — this maintains layout stability (no reflow between loading → error)
- The error message is non-judgmental and non-technical ("couldn't generate" not "failed" or "error")
- No retry button in Phase 1 — the household member proceeds with the structured list
- The footer immediately shows "Continue →" as active (not disabled) so the review flow is not blocked
- The `--lavender-soft` card bg and `--lavender-mid` border are identical to the resting draft card — only the text content differs

---

### 3.6 AISUM-5: Offline State (No Draft Card)

When the device has no connectivity when the review opens, the step content area renders as it did in Phase 1 — with no draft card at all.

```
LAST WEEK RECAP

[Structured item list — full display, no draft card above it]
```

**Footer (offline — standard step advance):**
```
┌──────────────────────────────────────────────────────┐
│                                    [Continue →]     │
└──────────────────────────────────────────────────────┘
```

**Design notes:**
- No "offline" message, no "Olivia is unavailable" copy — the offline case is invisible to the user
- The review flow experience in the offline case is byte-for-byte identical to Phase 1 planning ritual support
- The "LAST WEEK RECAP" step label is still present (it labels the section, not the AI content)

---

### 3.7 AISUM-6: Post-Accept State (Transitioning to Next Step)

After the household member taps "Use this summary," the draft card briefly shows an acceptance confirmation and then the footer transitions to "Continue →."

**Acceptance animation (200ms):**
1. "Use this summary →" button: brief fill flash to `--mint` for 150ms, then footer transitions to "Continue →" state
2. Draft card: border transitions from `--lavender-mid` to `--mint` for 150ms, then holds at `--lavender-mid` as the card collapses
3. The draft card collapses (height animates to 0, 200ms ease) — the accepted state is "captured," the card is no longer needed for this step

After collapse, the structured item list occupies the full step content area. The footer shows "Continue →" active. The household member taps "Continue →" to advance to Step 2.

**Design note:** The collapse animation signals acceptance more clearly than an abrupt disappearance. The brief `--mint` flash ties the acceptance to the "done/completed" semantic in the design system (mint = completed routines, completion events). It should be brief enough to not interrupt the review flow rhythm.

---

### 3.8 AISUM-7: Post-Dismiss State

After the household member taps "Dismiss," the draft card disappears (200ms fade out + 6px downward translate) and the structured list occupies the full step content area. The footer immediately shows "Continue →" active.

**Dismiss animation:**
- Draft card: opacity 1 → 0 with 6px downward translate, 200ms ease
- No flash, no color change — dismissal is neutral

---

## 4. Review Record Detail Changes (AISUM-9 and AISUM-10)

### 4.1 AISUM-9: Review Record Detail With Accepted Narratives

The review record detail screen layout extends the Phase 1 design (from the planning ritual support visual spec) with narrative cards inserted above the carry-forward section.

**Full layout with both narratives accepted:**

```
┌──────────────────────────────────────────────────────┐
│  [Back ←]                             Weekly Review  │  ← nav header
├──────────────────────────────────────────────────────┤
│  [Spouse banner — conditional, L-009]                │
├──────────────────────────────────────────────────────┤
│  Scroll area:                                        │
│  ─────────────────────────────────────────────────   │
│  Review metadata (date, window, ritual name)         │  ← unchanged from Phase 1
│  ─────────────────────────────────────────────────   │
│  LAST WEEK RECAP   ← PJS 11px 600 --ink-3 uppercase  │
│  ┌────────────────────────────────────────────────┐  │
│  │ ✦ AI-assisted   ← PJS 11px 500 --violet        │  │
│  │                                                │  │
│  │ You had a productive week. Morning walk was    │  │  ← PJS 14px 400 --ink
│  │ completed every day, and the HVAC service      │  │
│  │ was finally closed out by Alex on Friday.      │  │
│  └────────────────────────────────────────────────┘  │
│  ─────────────────────────────────────────────────   │
│  COMING WEEK OVERVIEW                                │
│  ┌────────────────────────────────────────────────┐  │
│  │ ✦ AI-assisted                                  │  │
│  │                                                │  │
│  │ This week has three routines scheduled, two    │  │
│  │ reminders due by Thursday, and the grocery     │  │
│  │ list is overdue for an update.                 │  │
│  └────────────────────────────────────────────────┘  │
│  ─────────────────────────────────────────────────   │
│  Carry-forward notes   ← unchanged from Phase 1      │
│  ─────────────────────────────────────────────────   │
│  Window summary   ← unchanged from Phase 1           │
│  ─────────────────────────────────────────────────   │
└──────────────────────────────────────────────────────┘
```

**With only recap narrative accepted (overview dismissed):**
- Only the "LAST WEEK RECAP" section with the narrative card appears
- No "COMING WEEK OVERVIEW" card or section label
- The layout proceeds directly from recap card to the carry-forward divider

**Narrative card in review record detail:**
- Background: `--lavender-soft` (same as draft card)
- Border: `1.5px solid var(--lavender-mid)` (same, resting — no focus state in detail view)
- Border radius: `16px`
- Not tappable, not editable — pure display
- Badge: `✦ AI-assisted`, PJS 11px 500 `--violet` (not Fraunces italic — this is the stored attribution, not the live draft badge)
- Narrative text: PJS 14px 400 `--ink`
- The text is selectable (native behavior) but not editable

**Section label spacing:**
- `LAST WEEK RECAP` or `COMING WEEK OVERVIEW` label appears 16px above the narrative card
- 16px gap between consecutive narrative cards (if both present)
- 16px gap below the last narrative card before the carry-forward divider

---

### 4.2 AISUM-10: Null Narrative State (Both Dismissed or Pre-H5)

When `recap_narrative` and `overview_narrative` are both null, the review record detail renders exactly as in Phase 1 — no narrative sections, no placeholders. The layout is:

```
Review metadata → Carry-forward notes → Window summary
```

There is no "No AI summary for this review" message, no collapsed section, no visual indication that AI drafts were or were not available. The review record detail looks identical to all pre-H5 reviews.

---

## 5. Interaction Summary

### 5.1 Full Interaction Flow (Step 1 with AI Draft)

| **User action** | **System response** |
|---|---|
| Opens review flow | AI generation begins; Step 1 shows loading card + structured list |
| Generation completes (within timeout) | Loading card animates to draft card (fade in, 200ms) |
| Taps narrative text | Card enters edit mode (border → `--violet`, keyboard appears) |
| Types edits | Text updates inline |
| Taps outside card | Keyboard dismissed, edited text preserved |
| Taps "Use this summary" | Acceptance animation (mint flash, 150ms); card collapses (200ms); footer → "Continue →" |
| Taps "Dismiss" | Card fades out (200ms); footer → "Continue →"; structured list fills area |
| Taps "Continue →" | Advances to Step 2 (overview), same draft experience |

### 5.2 Keyboard and Safe Area Behavior

When the household member taps to edit the draft and the keyboard appears:
- The fixed footer (accept/dismiss) scrolls with the keyboard — it remains visible above the keyboard
- The draft card scrolls to remain above the keyboard, maintaining visibility of at least the attribution badge and the first line of text
- The structured item list may become partially hidden below the keyboard — this is acceptable; the household member can dismiss the keyboard to see items

### 5.3 Step Advance Blocking

The "Continue →" button is disabled only during the loading state. As soon as the loading state resolves (whether to a draft, an error message, or the timeout fallback), the footer transitions to the draft controls (accept/dismiss) if a draft is available, or to an active "Continue →" if no draft was generated. The household member is never blocked from advancing.

---

## 6. Dark Mode Notes

Dark mode behavior for the new AI-draft elements:

- **Draft card background:** `--lavender-soft` in dark mode resolves to `#2A2545` (deep indigo). The card is visually distinct from the `--surface` item cards (`#1C1A2E`) and the `--bg` screen background (`#12101C`).
- **Draft card border:** `--lavender-mid` in dark mode resolves to `#3D3660` — a muted deep indigo ring, subtle but visible.
- **Attribution badge:** `--violet` is `#6C5CE7` in dark mode (unchanged between modes). The badge text remains legible on the `#2A2545` card background.
- **Narrative text:** `--ink` in dark mode is `#EDE9FF` (warm near-white). Full-opacity narrative text is clearly readable.
- **Accept button:** `--violet` bg with white text — both are the same in dark mode. The button reads clearly.
- **Shimmer (loading state):** The shimmer gradient uses `--lavender-mid` (darker in dark mode, `#3D3660`) as the base and `--lavender-soft` (slightly lighter deep indigo, `#2A2545`) as the highlight. The animation remains perceptible.
- **No hardcoded hex values:** All color references in AI-draft components must use CSS custom properties.

---

## 7. Edge Cases

### 7.1 Very Short Narrative (Sparse Week)

When the AI generates a minimal narrative for a sparse week ("Nothing was recorded last week."), the draft card renders with a single short line. The card respects its min-height (88px) so there is no layout collapse. The "Tap to edit" hint is visible below the short text.

### 7.2 Very Long Narrative (Verbose AI Output)

If the AI returns more than the expected 100–150 word limit, the card grows to accommodate the text. No truncation in Phase 1 — the narrative is shown in full. The card scrolls naturally within the step content area.

### 7.3 Both Sections Fail Independently

If the recap AI call fails and the overview AI call succeeds, Step 1 shows the error state card and Step 2 shows the normal draft card. The household member accepts the overview and dismisses (via error fallback) the recap. The resulting review record has `recap_narrative: null`, `overview_narrative: "..."`. This is the expected independent degradation behavior.

### 7.4 Generation Completes After Timeout Fallback

If AI generation takes longer than the timeout threshold and the footer has already advanced to "Continue →," the late-arriving AI response should be silently discarded — the draft card does not appear after the timeout has elapsed. The household member has already seen the error state; injecting a late draft would be jarring.

### 7.5 Accepted Narrative Is Empty (User Deleted All Text)

If the household member enters edit mode and deletes all text before tapping "Use this summary," the acceptance should save an empty string rather than null. Implementation should coerce empty string to null at the persistence layer to preserve the null-means-not-accepted semantic. The review record detail would then omit the narrative section for that entry (same as null). Founding Engineer decision on exact null vs. empty string handling.

### 7.6 Tablet Layout

On tablet (768px+), the draft card follows the same max-width constraint as item cards (max-width: 560px, centered). All other layout rules unchanged.

### 7.7 Narrative in Review Record Detail When Carry-Forward Notes Are Empty

If the review record has accepted narratives but no carry-forward notes, the carry-forward section renders its empty state (from Phase 1) below the narrative cards. The narrative cards do not "fill in" for the missing carry-forward notes — they are a distinct content type in a distinct section.

---

## 8. Token Assignment Summary

Complete CSS token reference for AI-draft component implementation:

```css
/* Draft card */
.ai-draft-card {
  background: var(--lavender-soft);
  border: 1.5px solid var(--lavender-mid);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
  padding: 14px 16px 12px;
}
.ai-draft-card:focus-within {
  border-color: var(--violet);
}

/* Attribution badge */
.ai-draft-badge {
  color: var(--violet);
  font-family: Fraunces;
  font-style: italic;
  font-size: 11px;
  font-weight: 400;
  margin-bottom: 10px;
}

/* Review record detail badge (stored, non-italic) */
.ai-stored-badge {
  color: var(--violet);
  font-family: "Plus Jakarta Sans";
  font-style: normal;
  font-size: 11px;
  font-weight: 500;
  margin-bottom: 10px;
}

/* Narrative text */
.ai-narrative-text {
  color: var(--ink);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
}
.ai-narrative-text[contenteditable], .ai-narrative-textarea {
  background: transparent;
  border: none;
  outline: none;
  width: 100%;
  resize: none;
}

/* Edit hint */
.ai-edit-hint {
  color: var(--ink-3);
  font-size: 11px;
  font-style: italic;
  margin-top: 8px;
}

/* Loading state */
.ai-loading-badge { opacity: 0.5; }
.ai-shimmer-line {
  background: linear-gradient(
    90deg,
    var(--lavender-mid) 25%,
    var(--lavender-soft) 50%,
    var(--lavender-mid) 75%
  );
  background-size: 200% 100%;
  animation: ai-shimmer 1.4s linear infinite;
  border-radius: 8px;
  height: 14px;
}
@keyframes ai-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.ai-loading-copy {
  color: var(--ink-3);
  font-size: 12px;
  text-align: center;
  margin-top: 8px;
}

/* Fallback / error state */
.ai-error-text {
  color: var(--ink-2);
  font-size: 14px;
  font-weight: 400;
}

/* Footer buttons */
.ai-accept-btn {
  background: var(--violet);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  border-radius: 10px;
  padding: 10px 16px;
  min-width: 160px;
  border: none;
}
.ai-accept-btn:active { transform: scale(0.97); }

.ai-dismiss-btn {
  background: transparent;
  color: var(--ink);
  font-size: 14px;
  font-weight: 500;
  border: 1.5px solid var(--ink-4);
  border-radius: 10px;
  padding: 10px 16px;
  min-width: 100px;
}
.ai-dismiss-btn:active { border-color: var(--ink-3); }

/* Step section label */
.review-step-label {
  color: var(--ink-3);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 10px;
}
```

---

## 9. Design Checklist

Before marking this spec complete, the following criteria must be satisfied:

- [x] Both light and dark modes specified via CSS tokens — no hardcoded hex values
- [x] Draft card attribution visual indicator specified ("Drafted by Olivia" badge, lavender treatment)
- [x] Edit affordance specified (tap-to-edit inline, focus ring, keyboard behavior)
- [x] Accept/dismiss controls placed in fixed footer — always reachable without scrolling
- [x] Loading state specified with inline skeleton card (not full-screen loader)
- [x] Error state specified as calm inline message, non-blocking, no modal
- [x] Offline state specified as no draft card — identical to Phase 1 experience
- [x] Independent degradation behavior documented (each section degrades independently)
- [x] Post-accept and post-dismiss animations specified
- [x] Review record detail: accepted narrative layout specified (both narratives, one narrative, null state)
- [x] "AI-assisted" vs "Drafted by Olivia" badge distinction documented (live draft vs. stored record)
- [x] Null narrative state: section omitted entirely, no placeholder
- [x] Spouse banner placement specified (inherited L-009, unchanged from Phase 1 review flow)
- [x] All M16 exit criteria for visual spec resolved (draft layout, edit affordance, accept/discard, attribution indicator, error/loading state, review record detail, null narrative state)
- [x] Token assignment summary provided for implementation use
- [x] All 17 relevant acceptance criteria from the feature spec have corresponding visual coverage

---

## 10. Open Questions for Founding Engineer

The following implementation decisions are explicitly deferred to the Founding Engineer and are not resolved by this visual spec:

**Q1 — Timeout threshold:** What is the exact timeout threshold for AI generation (e.g., 10 seconds as suggested in the spec)? The visual spec specifies that the footer becomes active "Continue →" after timeout elapse, but the exact threshold is an implementation decision.

**Q2 — Null vs. empty-string coercion on acceptance of edited-to-empty text:** If the household member deletes all text before accepting, should the persistence layer store null or empty string for the narrative field? Recommendation: coerce to null so the null-means-not-accepted semantic is clean. Founding Engineer to confirm.

**Q3 — `ai_generation_used` flag:** Whether to include the `ai_generation_used` boolean flag on `review_records` in Phase 1 is a Founding Engineer decision (per the feature spec). The visual spec has no dependency on this field — it does not appear in the UI.

**Q4 — Draft card entrance animation on slow load:** If generation takes 5–8 seconds, the shimmer animation will run for a long time before the draft appears. If this feels disruptive, a subtle pulsing variant (opacity 0.7 → 1.0 → 0.7, 2s cycle) could replace the shimmer after 3 seconds. Founding Engineer can evaluate based on actual latency observed with the provider.

**Q5 — First-use "Tap to edit" hint suppression storage:** The "Tap to edit" hint should appear on first use and then be suppressed. Is this stored in `localStorage`/`IndexedDB` as a per-device preference flag? Founding Engineer to confirm the persistence mechanism. (This is not household state — it is UI preference state, per the local-first pattern.)

---

*This visual spec resolves all designer decisions listed in OLI-57 and the M16 exit criteria. The Founding Engineer should review Section 10 (Open Questions) before beginning implementation.*
