# Implementation Plan: Application Prototype Redesign

## Status
Current execution-ready redesign plan for aligning the existing PWA with Olivia's documented visual system and rendered prototype target.

## Summary
This plan redesigns the current Olivia PWA so the shipped application matches the documented prototype styling in `docs/vision/olivia-prototype.html`, the four-tab screen model in the design docs, and the rendered home-screen target provided in the current request. The implementation should preserve the approved shared-household-inbox behavior and advisory-only trust model while replacing the current generic review shell with the warmer Olivia-specific visual language, information hierarchy, and mobile framing already defined in the repository.

The most important visible outcome is explicit:

- the `/` route becomes the Olivia `Home` screen, not the current review dashboard
- the light-mode mobile rendering of `/` should match the rendered prototype target for hierarchy, spacing, typography, card treatment, and bottom navigation
- user-facing demo names should use `Lexi` and `Alexander` instead of placeholder role labels or the older `Jamie` / `Alex` examples
- the final redesign must pass the relevant sections of `docs/vision/design-checklist.md`, not merely resemble the prototype loosely

Planning readiness is satisfied for this work:

- the project already has an approved workflow spec in `docs/specs/shared-household-inbox.md`
- the current application exists and provides concrete routes, data flows, and supporting seams to redesign rather than invent from scratch
- the design system docs are concrete enough to drive implementation without re-deriving layout or styling intent
- the user explicitly requested this redesign plan even though the current MVP implementation is already in progress

## Source Artifacts
- `docs/vision/olivia-prototype.html`
- `docs/vision/design-foundations.md`
- `docs/vision/design-components.md`
- `docs/vision/design-screens.md`
- `docs/vision/design-motion-voice.md`
- `docs/vision/design-checklist.md`
- `docs/specs/shared-household-inbox.md`
- `docs/plans/shared-household-inbox-implementation-plan.md`
- `docs/strategy/interface-direction.md`
- `docs/vision/product-vision.md`
- `docs/vision/product-ethos.md`
- `docs/roadmap/milestones.md`
- `docs/learnings/decision-history.md`
- `docs/learnings/assumptions-log.md`
- `apps/pwa/src/router.tsx`
- `apps/pwa/src/components/layout.tsx`
- `apps/pwa/src/routes/review-page.tsx`
- `apps/pwa/src/routes/add-page.tsx`
- `apps/pwa/src/routes/item-detail-page.tsx`
- `apps/pwa/src/routes/re-entry-page.tsx`
- `apps/pwa/src/routes/settings-page.tsx`
- `apps/pwa/src/styles.css`

Durable guidance this plan carries forward:

- D-002: advisory-only writes remain mandatory
- D-004: primary-operator model remains in force even if user-facing names become concrete
- D-007: the canonical surface remains an installable mobile-first PWA
- D-009: the inbox workflow remains the approved product slice; the redesign must not silently change its product scope
- the design docs define the visual source of truth for navigation, layout, component behavior, and motion

## Current-State Snapshot
The current application is functionally aligned with the inbox workflow but visually and structurally diverges from the documented Olivia interface direction:

- `/` currently renders a `Review` dashboard rather than the `Home` briefing screen
- the primary navigation exposes `Review`, `Add item`, and `Settings` rather than `Home`, `Tasks`, `Olivia`, and `Memory`
- the app shell uses a broader dashboard layout rather than the mobile-first phone frame, status-bar spacing, and bottom-nav pattern defined in the design docs
- current UI copy still exposes role labels such as `Stakeholder` and `Spouse` in user-facing surfaces
- the CSS token set partially overlaps the design system but does not yet implement the full theming, typography, and component rules required by the checklist

This redesign is therefore a structural UI migration, not a surface-level restyle.

## Assumptions And Non-Goals
### Assumptions
- The redesign preserves the existing domain model, API contracts, and approval-gated write behavior unless a visual requirement forces a bounded UI-facing adjustment.
- Internal role enums may remain `stakeholder` and `spouse` in code if that avoids unnecessary domain churn, but user-facing labels and demo content should render as `Lexi` and `Alexander`.
- The user-provided rendered screenshot is treated as a binding visual target for the light-mode home screen even though it is not yet stored in `docs/`; the prototype HTML plus updated design docs should act as the durable in-repo surrogate.
- The design checklist is part of the definition of done for implementation, not an optional QA pass after the redesign.

### Non-Goals
- Changing the approved household-inbox product scope, trust model, or permissions model
- Expanding spouse write access, notification scope, or workflow autonomy
- Replacing the current backend, persistence, or sync architecture
- Inventing new tabs, new top-level routes, or a desktop-first information architecture
- Using the redesign to reopen product questions already settled by the shared-household-inbox spec and related decisions

## Design Checklist Application Map
Use this matrix during implementation so the redesign stays tied to the repository's existing design QA system.

### Home (`/`)
- Universal Checks
- Bottom Navigation Checks
- Animation Checks
- Card Checks: Task Card, Event Tile
- Olivia Nudge Card Checks

### Tasks (`/tasks`)
- Universal Checks
- Bottom Navigation Checks
- Animation Checks
- Card Checks: Task Card
- Forms & Input Checks

### Olivia (`/olivia`)
- Universal Checks
- Bottom Navigation Checks
- Animation Checks
- Chat / Olivia Screen Checks
- Forms & Input Checks

### Memory (`/memory`)
- Universal Checks
- Bottom Navigation Checks
- Animation Checks
- Card Checks: Memory Card
- Forms & Input Checks

### Cross-cutting infrastructure
- Theming Infrastructure
- Accessibility
- Reduced-motion compliance

## Implementation Steps
### Step 1: Lock the redesign route map and preserve behavior boundaries
**Outcome:** The current PWA route structure is translated into the design-doc screen model without losing inbox functionality.

**Work items**
- Replace the current primary route map with the documented four-tab shell:
  - `/` -> `Home`
  - `/tasks` -> `Tasks`
  - `/olivia` -> `Olivia`
  - `/memory` -> `Memory`
- Produce a one-to-one migration table from current routes and components to target surfaces:
  - `review-page.tsx` -> split into `Home` summary content plus `Tasks` full-list content
  - `add-page.tsx` -> fold capture affordances into `Tasks` and `Olivia`
  - `item-detail-page.tsx` -> retain only if needed as a temporary supporting seam; do not leave it as primary IA without an explicit follow-up decision
  - `settings-page.tsx` -> remove from primary navigation because `design-screens.md` places Settings outside MVP
  - `re-entry-page.tsx` -> redirect into the relevant tab surface rather than standing alone visually
- Document which current routes remain temporary implementation seams during the redesign and which are removed from the user-facing nav.
- Explicitly preserve approval-gated writes, spouse read-only behavior, and offline-aware sync while remapping screens.

**Notes**
- The design docs are the source of truth for primary navigation and screen purpose.
- If supporting routes remain during migration, they should be treated as transition seams, not proof that the old IA is still acceptable.

### Step 2: Rebuild the theme, typography, and shell infrastructure from the design foundations
**Outcome:** The application shell and token layer match Olivia's documented visual foundations in both light and dark mode.

**Work items**
- Replace the current partial token layer with the exact design-token model from `design-foundations.md`.
- Add dark-mode infrastructure using `[data-theme="dark"]`, `prefers-color-scheme`, and the `localStorage` initialization rule defined in the design docs.
- Enforce the typography pair exactly:
  - `Fraunces` for display, section titles, and Olivia-authored text
  - `Plus Jakarta Sans` for UI chrome and body text
- Rebuild the outer shell as a mobile-first single-column frame with:
  - 390px reference width behavior
  - 44px status-bar allowance
  - 66px always-visible bottom nav
  - ambient background blobs constrained to the documented maximum
- Remove hardcoded white, black, gray, and generic shadow values from component styles in favor of tokens.

**Notes**
- This step is complete only when the checklist's universal checks and theming checks can pass across all tab surfaces.
- Dark mode is not optional; the screenshot target is light mode, but the design docs require both.

### Step 3: Rebuild the app shell and bottom navigation to match the prototype
**Outcome:** The application looks and behaves like the Olivia prototype before route-specific content is fully migrated.

**Work items**
- Replace the current top header and wide dashboard nav with the prototype shell:
  - Olivia wordmark
  - stacked avatar treatment
  - fixed bottom navigation with the four documented tabs
- Use the exact active-state, icon, label, border, and shadow behaviors from `design-components.md` and `design-checklist.md`.
- Implement screen transitions using the documented `screenIn` motion pattern and nav-sync behavior.
- Ensure each tab has a single sentence worth of purpose aligned to `design-screens.md`.

**Notes**
- The shell should feel correct even before all content parity work is finished.
- Do not keep a second competing navigation pattern visible anywhere in the user-facing app.

### Step 4: Make the index route match the rendered home-screen target
**Outcome:** The `/` route renders the `Home` screen shown by the rendered prototype target and the updated prototype docs.

**Work items**
- Build the `Home` screen hierarchy exactly as documented:
  - wordmark + avatar stack
  - time-aware greeting
  - subtitle with the actual due/overdue count
  - single Olivia nudge card
  - `Needs doing` summary section with the top three tasks
  - `Coming up` horizontal event strip
  - fixed bottom nav
- Match the target light-mode hierarchy for spacing, type scale, card radius, badge treatment, accent stripes, and lavender-violet palette.
- Use live or derived app data so the home view is a real briefing surface rather than static mock markup.
- Update visible example names and avatar initials so the primary operator reads as `Lexi` and the spouse reads as `Alexander`.
- Treat the current attached screenshot as the acceptance target for the finished `/` route and the updated `olivia-prototype.html` as the durable repo reference.

**Notes**
- This is the highest-priority visual step because the user explicitly defined the index page target.
- If the redesign lands nowhere else, this route still needs to match the screenshot target convincingly.

### Step 5: Refactor Tasks to the documented task-management surface
**Outcome:** The current inbox review and capture behavior is folded into the `Tasks` tab instead of a separate review-plus-add IA.

**Work items**
- Convert the current `Review` dashboard into the `Tasks` screen defined in `design-screens.md`.
- Implement:
  - title and summary line
  - filter tabs
  - top-of-list add-task affordance
  - open task grouping
  - completed section styling
- Reuse the current inbox data and approval model while restyling task cards to the documented component anatomy.
- Rehome add-item capture so the stakeholder can create tasks from the `Tasks` surface without relying on a separate primary-nav route.
- Ensure spouse mode remains read-only even if the surface styling becomes less obviously "form-driven."

**Notes**
- The redesign should preserve task-management usefulness while removing the current generic card-grid dashboard feel.

### Step 6: Refactor Olivia to the documented conversational surface
**Outcome:** Advisory interactions and draft confirmations live inside the `Olivia` tab with the correct visual identity and motion.

**Work items**
- Build the `Olivia` tab shell from `design-screens.md` and `design-motion-voice.md`:
  - Olivia orb header
  - message history
  - quick suggestion chips
  - sticky multiline input
- Carry proactive continuity from the Home nudge card into the first Olivia message.
- Re-style the current preview/confirm flows so action previews use the documented Olivia action-card treatment.
- Preserve advisory-only confirmation before any write, even if the UI becomes more conversational.
- Apply Olivia-specific voice rules to system-authored copy, including the use of Fraunces italic where Olivia is speaking.

**Notes**
- This step should make Olivia feel like a product surface, not an admin control panel with chat elements added on top.

### Step 7: Refactor Memory to the documented browse-and-search surface
**Outcome:** Household memory becomes a visually coherent fourth tab rather than a lightly skinned list.

**Work items**
- Rebuild the `Memory` screen with the documented header, search bar, category sections, and memory-card anatomy.
- Map current stored records into the default categories described in `design-screens.md`.
- Ensure card icon treatments, metadata age indicators, and grouping labels use the component and typography rules from the design docs.
- Keep search behavior lightweight and client-driven unless a stronger requirement emerges.

**Notes**
- The goal is calm browseability and recall, not a dense admin index.

### Step 8: Reconcile supporting routes and prototype-only utilities with the final IA
**Outcome:** The redesigned app does not leak implementation scaffolding into the primary experience.

**Work items**
- Move notification re-entry into the relevant destination tab or stateful deep link rather than a standalone user-facing page.
- Decide whether task detail and settings remain:
  - hidden/internal during prototype validation
  - folded into tab-local interactions
  - or explicitly deferred pending a follow-up design decision
- Remove any user-facing surface that contradicts the four-tab MVP IA unless the docs are updated first.
- Keep developer diagnostics available in a way that does not distort the end-user prototype.

**Notes**
- This step is where the redesign resolves the current mismatch between implementation seams and the design-doc screen model.
- Do not quietly keep conflicting routes in the main experience just because they already exist.

### Step 9: Run a dedicated naming and copy pass
**Outcome:** User-facing prototype copy matches the requested household names and Olivia voice.

**Work items**
- Replace prototype example names `Jamie` and `Alex` with `Lexi` and `Alexander` in user-facing UI examples and rendered demo content.
- Replace visible role labels in the redesigned interface with household-specific presentation where appropriate, while leaving internal code enums unchanged unless there is a clear reason to rename them.
- Review CTAs, nudge copy, empty states, and helper text against `design-motion-voice.md`.

**Notes**
- This is a content pass, not a permissions-model change.
- Internal role semantics still matter for trust-model enforcement and test clarity.

## Verification
### Step 1 verification
- Confirm the final route map exposes the four-tab shell as the only primary navigation model.
- Verify that write-gating, read-only spouse behavior, and re-entry behavior still have explicit homes after the route migration.

### Step 2 verification
- Run lint and targeted UI tests successfully after the token and shell refactor.
- Manually verify light mode, dark mode, and reduced-motion behavior against the design docs.

### Step 3 verification
- Manually verify the bottom nav is always visible, always synced, and visually matches the component spec in both modes.

### Step 4 verification
- Compare the rendered `/` route at mobile width against the screenshot target and `olivia-prototype.html`.
- Verify the Home screen passes the applicable checklist sections for universal checks, animation, nudge card, task cards, event tiles, and bottom nav.

### Step 5 verification
- Run targeted interaction tests for task filtering, add-item capture, read-only spouse mode, and completed/open grouping.
- Manually verify that the Tasks tab matches the information hierarchy in `design-screens.md`.

### Step 6 verification
- Run targeted interaction tests for Olivia chat input, quick chips, action-preview rendering, and confirmation before write.
- Manually verify message styling, orb motion, and Olivia-authored typography.

### Step 7 verification
- Run targeted UI tests for Memory search and category grouping.
- Manually verify memory-card anatomy, section labels, and age-indicator rendering.

### Step 8 verification
- Confirm old prototype/debug routes are not exposed in the main user-facing nav.
- Confirm deep links and notification re-entry land in the correct redesigned surface.

### Step 9 verification
- Manually review user-facing copy for `Lexi` / `Alexander` consistency.
- Confirm no visible `Stakeholder` / `Spouse` labels remain in the polished prototype UI unless intentionally retained in clearly internal tooling.

## Evidence Required
### Core redesign evidence
- A demo video showing all four tabs in the redesigned shell
- A screenshot of the final light-mode `/` route at mobile width matching the target home screen
- At least one dark-mode screenshot proving token-driven theming works after the redesign

### Behavior-preservation evidence
- Passing targeted automated tests for task review, add-item preview/confirm, spouse read-only access, and key Olivia interactions
- Manual notes confirming advisory-only confirmation still gates writes after the redesign

### Design-compliance evidence
- A completed checklist pass record noting which sections of `design-checklist.md` were applied to each screen
- Before/after screenshots or short notes for any intentional deviations from the prototype, with rationale

### Copy and naming evidence
- Final screenshots showing `Lexi` and `Alexander` in the redesigned prototype content

## Risks / Open Questions
### 1. The current implementation IA conflicts with the design-screen IA
`design-screens.md` defines a flat four-tab MVP and explicitly places Settings and Task Detail outside MVP, while the current app ships `settings-page.tsx` and `item-detail-page.tsx` as first-class routes. The redesign should not hide this conflict. It should either demote those routes to supporting seams or trigger a docs follow-up if they must remain first-class.

### 2. Screenshot fidelity can drift if the target remains only in chat
The attached rendered screenshot is currently transient conversation input. The updated prototype HTML and design docs reduce this risk, but if implementation needs pixel-level fidelity checks later, the team should add a durable screenshot asset under `docs/vision/`.

### 3. User-facing naming could be confused with role semantics
Renaming visible personas to `Lexi` and `Alexander` should not accidentally blur the difference between presentation copy and internal access-control semantics. The redesign should keep that distinction explicit in code and tests.

### 4. A pure restyle will not be enough
Because the current app's route map and shell differ materially from the documented prototype, the work is larger than a CSS refresh. Implementation should treat this as a navigation and screen-architecture migration with regression testing, not a token-only restyle.

## Deferred Follow-Ups
- Decide whether task detail should return later as a documented MVP-plus surface once the prototype-aligned shell is stable.
- Decide whether Settings should become a first-class route only after the current four-tab design direction has been implemented and validated.
- Add a durable screenshot asset to `docs/vision/` if future implementation work needs image-based visual diffing rather than prototype HTML alone.
