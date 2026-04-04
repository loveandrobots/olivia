# Olivia Implementation Plan Writer

You are turning an approved or sufficiently concrete feature spec into an execution-ready implementation plan for an engineering agent. The plan refines execution sequencing and verification — it does not re-decide the product.

The argument passed to this skill (if any) is the path to the target feature spec. If no argument was given, ask the user which spec to plan against before proceeding.

## Step 1: Load the source artifacts

Read these files before writing anything:

1. The target feature spec
2. `docs/vision/product-vision.md` — product boundaries
3. `docs/vision/product-ethos.md` — trust model and behavioral non-negotiables
4. `docs/roadmap/milestones.md` — current milestone and readiness gates
5. `docs/learnings/decision-history.md` — prior decisions that constrain the plan
6. `docs/learnings/assumptions-log.md` — active assumptions relevant to the feature
7. Any related specs or learnings referenced by the target spec

## Step 2: Confirm planning readiness

Before drafting, check:

- Is the project at M3 (Build Readiness) or higher? If not, note that planning is premature and ask the user to confirm they want to proceed anyway.
- Is the spec concrete enough to implement without major product ambiguity? If open questions in the spec are blocking, surface them before writing the plan.
- Are remaining open questions bounded and non-blocking, or do they need resolution first?

If readiness conditions are not met, do not hide the ambiguity inside the plan. Surface the blocker and ask the user how to proceed.

## Step 3: Draft the implementation plan

Create the plan file. If the user specified a path, use it. Otherwise, use a clearly named file in the project's planning area (e.g., `_forge/plans/<feature-name>-plan.md`).

Include these sections:

### Summary
What will be built and why. One paragraph linking back to the source spec.

### Source Artifacts
List the exact docs and specs the plan derives from, with file paths.

### Assumptions And Non-Goals
- Bounded assumptions the plan relies on (reference A-XXX IDs where they exist)
- Work that is explicitly out of scope for this plan

### Implementation Steps
Ordered work items. For each step:
- Name the user-visible or system outcome
- Reference the relevant spec section or decision (by ID) where useful
- Define how completion will be verified
- Do not mix product discovery with engineering tasks

### Verification
- Unit tests required
- Integration tests required
- Manual or household validation steps
- How to confirm advisory-only compliance in the running feature

### Evidence Required
What artifacts or outputs prove each major step succeeded. Be specific — name the test file, the API response, or the UI state.

### Risks / Open Questions
Only issues that still affect execution. For each, note whether it is blocking or can be resolved during implementation.

## Step 4: Self-review before saving

Check that:

- [ ] The plan cites every source doc it derives from
- [ ] The plan does not quietly resolve open product questions — those belong in the spec
- [ ] Every implementation step has a verification method
- [ ] Advisory-only compliance is called out wherever the feature proposes user-facing actions
- [ ] The plan is explicit enough for another agent to execute end to end without guessing intent

## Step 5: Report

After saving, report:

1. The file path
2. A one-paragraph summary of the plan scope
3. The number of implementation steps
4. The most significant risk or open question that could affect execution

## Principles

- Implementation plans refine execution, not product intent.
- If the feature requires advisory exceptions or trust-model changes, call them out explicitly instead of burying them in steps.
- Prefer reversible technical choices when the product shape is still being validated.
- Treat `docs/` as the source of truth if another instruction layer conflicts.
