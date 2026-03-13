# Olivia Agent Guide

This file is a derivative convenience layer for agentic tools such as Cursor. The `docs/` directory remains the source of truth. If any instruction here, in `.cursor/rules/`, or in `skills/` conflicts with `docs/`, follow `docs/` and update the derivative files later.

## Context Orientation

Do not reread the full project packet for every task. Orient proportionally to the work:

### Tier 0: Always-loaded guidance

Use the context already injected into the session first:
- `.cursor/rules/` for project guardrails and writing standards
- `AGENTS.md` for repo posture and orientation guidance

### Tier 1: Minimal orientation

For most tasks, read:
1. `docs/roadmap/milestones.md`
2. the single most relevant artifact for the task at hand

Examples:
- coding task: relevant spec or implementation plan
- learnings update: the triggering doc plus the relevant learnings log
- doc cleanup: the doc being edited plus any directly upstream source

### Tier 2: Workflow-specific orientation

Use a slightly broader read when the work affects product direction or system behavior:
- PM and roadmap work: `docs/vision/product-vision.md`, `docs/vision/product-ethos.md`, `docs/roadmap/roadmap.md`, `docs/roadmap/milestones.md`, `docs/learnings/decision-history.md`
- feature-spec work: vision, ethos, relevant existing specs, `docs/specs/spec-template.md`, `docs/glossary.md`
- implementation work: relevant spec, relevant implementation plan, `docs/strategy/system-architecture.md`, then the corresponding code in `packages/domain` and `packages/contracts`
- doc review: the target artifact, `docs/vision/product-ethos.md`, `docs/glossary.md`, `docs/strategy/agentic-development-principles.md`, and `docs/learnings/decision-history.md`
- learnings updates: `docs/learnings/decision-history.md`, `docs/learnings/assumptions-log.md`, `docs/learnings/learnings-log.md`, plus the doc that triggered the update

### Tier 3: Full orientation

Use `skills/olivia-orient.md` when:
- starting a major planning session
- recovering after a long context gap
- unsure which milestone or horizon is active
- needing a broad project-state summary before deciding what to do next

## Source-Of-Truth Hierarchy

When multiple artifacts touch the same topic, prefer:

1. vision and ethos docs for product intent
2. roadmap and milestone docs for sequencing and readiness
3. learnings and decision-history docs for durable context
4. feature specs for workflow scope and acceptance criteria
5. implementation plans for execution details
6. working code and tests for current system behavior
7. transient chat history only when no durable artifact exists yet

## Repo Posture

- Olivia is an agentic project with a working codebase and a durable documentation system.
- Durable docs are part of the delivery system, not project overhead.
- Product-definition work should follow the PM operating model: gather focused input, recommend a direction, record rationale, and leave execution-ready artifacts.
- Avoid reopening settled decisions without naming the conflict and the reason to revisit it.

## Codebase Orientation

When implementation exists, use the codebase as part of orientation:
- `apps/pwa`: installable mobile-first client and route-level UX
- `apps/api`: HTTP API, jobs, AI adapters, and persistence-facing application logic
- `packages/domain`: workflow rules, item logic, flags, and suggestion behavior
- `packages/contracts`: shared schemas and typed client-server boundaries

Read `packages/domain` before proposing behavior changes. Read `packages/contracts` before changing API or sync shape.

## Product Guardrails

- Build toward a household command center, not a general-purpose assistant.
- Preserve a local-first posture for sensitive household data and durable records.
- Treat external AI providers as replaceable dependencies, never the source of truth.
- Default to an advisory-only trust model: Olivia may suggest, summarize, draft, and organize, but should not take consequential actions without explicit approval.
- Optimize for reduced cognitive load, shared clarity, calm competence, and reversible decisions.
- In early workflows, assume the stakeholder is the primary operator; spouse visibility or lightweight participation may be useful, but full collaboration parity is deferred.

## Writing And Artifact Rules

- Use glossary terms consistently.
- Explicitly separate `Facts`, `Decisions`, `Assumptions`, `Open Questions`, and `Deferred Decisions` in durable docs when relevant.
- Optimize every artifact for handoff: state the problem, intended outcome, rationale, and linked upstream or downstream docs.
- Prefer curated memory over transcript history. If a discussion changes direction or resolves a trade-off, update durable docs.
- Keep writing explicit, structured, concise, and honest about uncertainty.

## Specs, Plans, And Milestones

- Check `docs/roadmap/milestones.md` before claiming readiness or starting major implementation work.
- Do not begin major implementation for a new workflow area unless the relevant readiness milestone is satisfied or the user explicitly asks to work earlier.
- Use `docs/specs/spec-template.md` for new feature or workflow specs.
- Implementation plans should reference the source docs they derive from, define verification evidence, and avoid resolving product ambiguity inside engineering tasks.

## Durable Memory Maintenance

Update the learnings system when:

- an assumption is validated, disproven, or superseded
- a meaningful product or project decision is made or reversed
- a prototype or implementation reveals a reusable lesson
- a user interaction changes understanding of the problem

Use the correct log:

- `docs/learnings/assumptions-log.md` for active beliefs
- `docs/learnings/learnings-log.md` for durable takeaways
- `docs/learnings/decision-history.md` for chosen directions

## Available Skills

- `skills/olivia-orient.md`: use for full-project orientation, milestone assessment, and context recovery when Tier 3 orientation is warranted.
- `skills/olivia-feature-spec.md`: use when drafting or revising a feature spec.
- `skills/olivia-doc-review.md`: use when reviewing a strategic doc, spec, or plan for compliance and clarity.
- `skills/olivia-learnings-update.md`: use when adding or updating assumptions, learnings, or decisions.
- `skills/olivia-implementation-plan.md`: use when turning an approved spec into an execution-ready implementation plan.
