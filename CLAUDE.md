# Olivia — Claude Code Instructions

## What is Olivia

Olivia is an iOS household management app designed for neurodiverse users, especially those with ADHD. It is built as a PWA with Capacitor wrapping for iOS.

## Repo structure

- `apps/pwa/` — React + TypeScript PWA (TanStack Router, TanStack Query, Dexie for offline)
- `apps/api/` — Fastify + better-sqlite3 API server
- `packages/domain/` — Pure business logic, zero I/O. All functions accept explicit parameters including `now: Date`.
- `packages/contracts/` — Zod schemas defining all types, request/response shapes. Single source of truth for the type system.
- `docs/` — Brand guidelines, product vision, architecture, audit reports
- `_forge/` — Pipeline artifacts (specs, plans, reviews). Do not edit manually.
- `gates/` — Quality gate scripts run by the Forge pipeline after each stage.

## Development commands

- `npm run typecheck` — TypeScript strict mode across all packages
- `npm run lint` — ESLint across all packages
- `npm test` — Vitest across all packages
- `npm run build` — Production build

All four must pass before any commit. Run them in this order.

## Architecture rules

1. **Domain is pure.** `packages/domain/` has zero I/O dependencies. All functions accept explicit parameters and return validated objects through Zod schemas. Every mutation calls `.parse()` on its return value. Do not add I/O, global state, or side effects to domain.

2. **Contracts are the source of truth.** All types flow from Zod schemas in `packages/contracts/`. Do not define types outside this package. Domain and API both import from contracts.

3. **Dependency direction is one-way.** contracts ← domain ← api, contracts ← domain ← pwa. No cycles. Domain never imports from api or pwa. Contracts never import from anything.

4. **Preview-confirm mutation pattern.** Every user-facing mutation has two endpoints: preview (dry run, returns what would happen) and confirm (executes the write). This enforces the advisory-only trust model. No mutation should write data without the user explicitly confirming.

5. **Tests must validate real behavior.** API tests use the Fastify test client against a real SQLite database. No mocking the HTTP layer. No calling handler functions directly. Domain tests call public functions and assert concrete output values.

6. **Offline-first.** The PWA queues mutation commands in an outbox (IndexedDB) and syncs when connectivity is restored. The outbox command schema in contracts is the protocol. Both PWA and API must agree on it.

## Brand rules (enforced by gates)

Olivia's brand is calm, trustworthy, and steady. These are hard rules, not style preferences:

- No exclamation marks in UI text or system messages
- No sycophantic praise ("Great job!", "You're doing amazing!", "Keep it up!")
- No urgency language ("overdue", "missed", "falling behind", "Don't forget")
- No red notification badges or urgent color coding
- No streak counters or gamification
- No dense dashboards — progressive disclosure only

See `docs/brand/` for full guidelines.

## Key reference documents

- `docs/audits/pre-rebuild-audit.md` — Full codebase audit with keep/rework/drop recommendations
- `docs/architecture/patterns-reference.md` — Extracted code patterns from pre-wipe codebase
- `docs/vision/product-vision.md` — What Olivia is and why
- `docs/vision/product-ethos.md` — Design philosophy

## Development happens on Linux

There is no local macOS environment. iOS builds run only via GitHub Actions macOS runner. All code must be testable on Linux. Capacitor plugins should be mockable for Vitest.

