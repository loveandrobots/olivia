# Olivia Conventions — Skill

## When to load

Load this skill for every implement and review stage. It defines the technical patterns all code must follow.

## Monorepo structure

```
apps/pwa/          — React + TypeScript PWA
apps/api/          — Fastify + better-sqlite3 API
packages/domain/   — Pure business logic (zero I/O)
packages/contracts/ — Zod schemas (single source of truth for types)
docs/              — Brand, vision, architecture, audits
_forge/            — Pipeline artifacts (do not edit)
gates/             — Quality gate scripts
```

## Dependency direction

This is a hard rule enforced by gates:

```
contracts ← domain ← api
contracts ← domain ← pwa
```

- `packages/contracts/` imports only from `zod`. Nothing else.
- `packages/domain/` imports from `@olivia/contracts`, `date-fns`, `chrono-node`. Never from `@olivia/api` or `@olivia/pwa`.
- `apps/api/` imports from `@olivia/domain` and `@olivia/contracts`.
- `apps/pwa/` imports from `@olivia/domain` and `@olivia/contracts`.
- No circular dependencies. If you need to share code between api and pwa, it goes in domain or contracts.

## TypeScript patterns

**Strict mode is on.** `tsconfig.base.json` has `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`. Do not disable these.

**No `any`.** ESLint enforces `@typescript-eslint/no-explicit-any`. If you need a generic type, use `unknown` and narrow with type guards or Zod parsing.

**Types come from contracts.** Do not define TypeScript interfaces or types outside `packages/contracts/`. Use `z.infer<typeof schema>` to derive types from Zod schemas. This keeps the type system unified.

## Domain package patterns

The domain package is pure — zero I/O, zero side effects, zero global state.

**All functions accept explicit parameters.** Time-dependent functions take `now: Date` as a parameter for testability. No `new Date()` inside domain functions.

**All mutations validate output.** Every function that creates or modifies an entity must call the relevant Zod schema's `.parse()` on the return value. This prevents schema drift.

**Single-field updates with optimistic locking.** `applyUpdate` enforces exactly one field change per call with a version check. This prevents multi-field race conditions in the offline-first architecture.

**ID generation.** Use `crypto.randomUUID()` for all entity IDs. The domain's `createId()` function handles the browser/Node.js fallback.

## Contracts package patterns

**Schemas are the source of truth.** Every request shape, response shape, and entity type is defined here as a Zod schema. The API validates incoming requests and outgoing responses against these schemas.

**Preview-confirm pattern.** Every mutation has paired schemas: `previewXRequestSchema`/`previewXResponseSchema` and `confirmXRequestSchema`/`confirmXResponseSchema`. Do not add mutations without this pair.

**Outbox commands.** The `outboxCommandSchema` discriminated union defines the offline-first protocol. Every new mutation type needs a corresponding command variant added here. Both PWA and API must handle it.

## API patterns

**Fastify with the test client.** All API tests must use `app.inject()` (Fastify's built-in test client) to make real HTTP requests against the app. Never call route handler functions directly. Never mock the HTTP layer.

**Modular route files.** Routes should be organized by feature domain (inbox routes, reminder routes, list routes, etc.), not in a single monolithic file. Each route module registers itself as a Fastify plugin.

**Real SQLite in tests.** Tests run against a real in-memory SQLite database, not mocked repositories. Use a test fixture that creates a fresh database for each test.

**Repository pattern.** SQL queries are encapsulated in repository classes/modules, not inlined in route handlers. Route handlers call domain functions and repository methods.

**Error responses.** Use standard HTTP status codes. 409 for version conflicts (optimistic locking). 400 for validation errors. 404 for not found. Return a JSON body with a `message` field. Do not leak internal error details.

**Auth middleware.** All non-public routes require a valid session. The session is validated via the auth middleware plugin, which decorates the request with the authenticated user. See `docs/architecture/patterns-reference.md` for the full auth pattern.

## PWA patterns

**React + TanStack Router + TanStack Query.** Follow TanStack conventions for routing and data fetching. No custom routing or state management solutions.

**Offline-first via outbox.** Mutations go through the outbox command queue when offline. On reconnect, the queue flushes. See `docs/architecture/patterns-reference.md` for the sync engine pattern.

**Connectivity via health check.** Never trust `navigator.onLine` alone. Use the `isEffectivelyOnline()` check from the connectivity module, which pings `/api/health`. See `docs/architecture/patterns-reference.md`.

**Capacitor for iOS.** Native features (push notifications, haptics) go through Capacitor plugins. These must be mockable in Vitest — never import Capacitor plugins directly in domain logic. Wrap them in service modules that can be stubbed in tests.

**No browser storage APIs in tests.** Use Dexie for IndexedDB access. Mock Dexie in tests rather than trying to use real IndexedDB in Node.js.

## Testing standards

**Domain tests:** Call public functions with explicit parameters. Assert concrete output values. No mocking — domain is pure, there's nothing to mock.

**API tests:** Use `app.inject()` for HTTP requests. Set up test data via the API itself (or direct DB setup via the test fixture). Assert response status codes and body content. Test error paths, not just happy paths.

**PWA lib tests:** Test utility functions and sync logic directly. Mock the API client and Dexie for isolation.

**No hollow tests.** Every test must assert something meaningful. "Assert it doesn't throw" is not a test. "Assert the response has a body" is not a test. Assert specific values that would break if behavior changed.

**Test file location:** Test files live alongside source files or in a `test/` directory within each package. Use `.test.ts` suffix.

## Key reference documents

Before starting work, read:
- `CLAUDE.md` (root) — Architecture rules and brand rules summary
- `docs/audits/pre-rebuild-audit.md` — What to keep, what to drop, and why
- `docs/architecture/patterns-reference.md` — Extracted code patterns with implementation details
- `docs/vision/product-vision.md` — What Olivia is
- `docs/vision/product-ethos.md` — Trust model and design philosophy

## Development environment

All development and testing happens on Linux. There is no local macOS. iOS builds run via GitHub Actions macOS runner only.

Commands that must pass before any commit:
```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Run them in this order. If any fails, fix it before committing.

