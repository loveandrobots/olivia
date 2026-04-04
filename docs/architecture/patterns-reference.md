# Olivia — Patterns Reference

> Extracted from the v0.x codebase before the apps/pwa and apps/api wipe.
> These patterns proved their worth in production and should be carried forward into the rebuild.
> This document is self-contained — assume the reader cannot access the original source files.

---

## 1. Auth Security Patterns

Source files: `apps/api/src/auth-repository.ts`, `apps/api/src/auth-middleware.ts`, `apps/api/src/auth-routes.ts`

### Token Hashing and Generation

Session tokens and magic link tokens are never stored in plaintext. The raw token is given to the client; only the SHA-256 hash is persisted server-side. Session lookup hashes the incoming token and compares against the stored hash.

```ts
import { randomUUID, randomBytes, createHash, timingSafeEqual } from 'node:crypto';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}
```

### SHA-256 PIN Hashing with Salt

PINs are a convenience mechanism for switching users on a shared device, not the primary auth path. Each PIN is hashed with a random salt. Verification uses `timingSafeEqual` to prevent timing attacks.

```ts
function hashPin(pin: string): string {
  // For a household app with 4-6 digit PINs, SHA-256 with salt is sufficient.
  // PINs are a convenience mechanism, not the primary auth path.
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(salt + pin).digest('hex');
  return `${salt}:${hash}`;
}

function verifyPin(pin: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const computed = createHash('sha256').update(salt + pin).digest('hex');
  // Use timingSafeEqual to prevent timing attacks on PIN hash comparison
  const computedBuf = Buffer.from(computed, 'utf-8');
  const storedBuf = Buffer.from(hash, 'utf-8');
  if (computedBuf.length !== storedBuf.length) return false;
  return timingSafeEqual(computedBuf, storedBuf);
}
```

**Rebuild note:** Consider using `scrypt` or `argon2` instead of SHA-256 for PINs, even though the low entropy of 4-6 digit PINs limits the benefit. Also consider adding rate limiting on PIN verification to prevent brute-force attacks.

### Magic Link Lifecycle

Magic links use the same hash-and-store pattern as session tokens. The flow:
1. User requests a link — server generates a token, stores its hash, and sends the raw token via email
2. User clicks the link — server hashes the incoming token and looks up the matching row
3. Token is single-use: marked `used_at` on successful verification
4. Token expires after 15 minutes
5. Requesting a new link invalidates all unused tokens for that email

```ts
const MAGIC_LINK_LIFETIME_MS = 15 * 60 * 1000; // 15 minutes

createMagicLinkToken(email: string): string {
  const id = randomUUID();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_LIFETIME_MS).toISOString();
  const now = new Date().toISOString();

  // Invalidate any existing unused tokens for this email
  this.db
    .prepare('UPDATE magic_link_tokens SET used_at = ? WHERE email = ? AND used_at IS NULL')
    .run(now, email.toLowerCase());

  this.db
    .prepare(`
      INSERT INTO magic_link_tokens (id, email, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(id, email.toLowerCase(), tokenHash, expiresAt, now);

  return token;
}

validateMagicLinkToken(token: string): { email: string } | null {
  const tokenHash = hashToken(token);
  const now = new Date().toISOString();

  const row = this.db
    .prepare(`
      SELECT id, email FROM magic_link_tokens
      WHERE token_hash = ? AND expires_at > ? AND used_at IS NULL
    `)
    .get(tokenHash, now) as { id: string; email: string } | undefined;

  if (!row) return null;

  // Mark as used (single-use)
  this.db
    .prepare('UPDATE magic_link_tokens SET used_at = ? WHERE id = ?')
    .run(now, row.id);

  return { email: row.email };
}
```

**Anti-enumeration:** The magic link request endpoint always returns the same success message regardless of whether the email exists, preventing email enumeration attacks.

```ts
// Always return success to prevent email enumeration
const user = authRepository.findUserByEmail(body.email);
if (!user) {
  return reply.send({
    sent: true,
    message: 'If that email is associated with a household, a sign-in link has been sent.'
  });
}
```

### Invite Code Generation

Invite codes are 6 uppercase alphanumeric characters with confusable characters excluded (0/O and 1/I removed). Codes expire after 7 days and are single-use.

```ts
export function generateInviteCode(): string {
  // 6 alphanumeric characters, uppercase
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude confusable chars: 0/O, 1/I
  let code = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i]! % chars.length];
  }
  return code;
}
```

**Rebuild note:** The modulo bias in `bytes[i] % chars.length` is negligible for a 32-character alphabet with 256 possible byte values, but the rebuild could use rejection sampling for correctness.

### Session Validation Middleware

Authentication is a Fastify plugin that extracts tokens from Bearer header or cookie, validates the session, and decorates the request. A public-route allowlist skips auth for unauthenticated endpoints. Sessions have sliding expiry — refreshed on each authenticated request.

```ts
const PUBLIC_ROUTES = new Set([
  '/api/health',
  '/api/auth/magic-link',
  '/api/auth/verify',
  '/api/auth/setup',
  '/api/auth/status',
  '/api/household/invite/claim',
  '/api/errors'
]);

const PUBLIC_PREFIXES = ['/api/auth/'];

function isPublicRoute(url: string): boolean {
  const path = url.split('?')[0]!;
  if (PUBLIC_ROUTES.has(path)) return true;
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function extractSessionToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  const cookieHeader = request.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/olivia_session=([^;]+)/);
    if (match) return match[1]!;
  }
  return null;
}

// Session validation with sliding expiry
validateSession(token: string): AuthUser | null {
  const tokenHash = hashToken(token);
  const now = new Date().toISOString();

  const row = this.db
    .prepare(`
      SELECT s.id AS session_id, s.expires_at, u.id, u.name, u.email, u.household_id, u.role
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?
    `)
    .get(tokenHash, now);

  if (!row) return null;

  // Sliding expiry: refresh on each authenticated request
  const newExpiry = new Date(Date.now() + SESSION_LIFETIME_MS).toISOString();
  this.db
    .prepare('UPDATE sessions SET expires_at = ? WHERE id = ?')
    .run(newExpiry, row.session_id);

  return { userId: row.id, householdId: row.household_id, role: row.role, name: row.name, email: row.email };
}
```

**Rebuild notes:**
- Add rate limiting on auth endpoints (magic link, setup, PIN verify). The v0.x implementation has none.
- Session lifetime is hardcoded to 30 days with no refresh token mechanism. Consider a shorter access token with a refresh flow.
- The `PUBLIC_PREFIXES` approach is broad — `/api/auth/` matches everything under auth. Be explicit about which sub-routes are public.

---

## 2. Database Schema Reference

Source file: `apps/api/src/db/schema.ts`

All table definitions using Drizzle ORM over better-sqlite3. Conventions:
- **Timestamps as ISO text** — human-readable in queries and logs
- **JSON columns** for variable-structure data (shopping items, tool calls, generated list refs)
- **Booleans as integers** — `integer('col', { mode: 'boolean' })` (SQLite convention)
- **No explicit foreign keys** — referential integrity enforced in application code
- **`version` column** on mutable entities — enables optimistic concurrency (409 on conflict)

```ts
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const inboxItemsTable = sqliteTable('inbox_items', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  assigneeUserId: text('assignee_user_id'),
  createdByUserId: text('created_by_user_id'),
  status: text('status').notNull(),
  dueAt: text('due_at'),
  dueText: text('due_text'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  version: integer('version').notNull(),
  lastStatusChangedAt: text('last_status_changed_at').notNull(),
  lastNoteAt: text('last_note_at'),
  archivedAt: text('archived_at'),
  freshnessCheckedAt: text('freshness_checked_at')
});

export const inboxItemHistoryTable = sqliteTable('inbox_item_history', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull(),
  userId: text('user_id'),
  eventType: text('event_type').notNull(),
  fromValue: text('from_value'),
  toValue: text('to_value'),
  createdAt: text('created_at').notNull()
});

export const deviceSyncStateTable = sqliteTable('device_sync_state', {
  deviceId: text('device_id').primaryKey(),
  lastCursor: integer('last_cursor').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const notificationSubscriptionsTable = sqliteTable('notification_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  endpoint: text('endpoint').notNull(),
  payload: text('payload').notNull(),
  createdAt: text('created_at').notNull()
});

export const remindersTable = sqliteTable('reminders', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  note: text('note'),
  assigneeUserId: text('assignee_user_id'),
  createdByUserId: text('created_by_user_id'),
  linkedInboxItemId: text('linked_inbox_item_id'),
  recurrenceCadence: text('recurrence_cadence').notNull(),
  scheduledAt: text('scheduled_at').notNull(),
  snoozedUntil: text('snoozed_until'),
  completedAt: text('completed_at'),
  cancelledAt: text('cancelled_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  version: integer('version').notNull(),
  freshnessCheckedAt: text('freshness_checked_at')
});

export const reminderTimelineTable = sqliteTable('reminder_timeline', {
  id: text('id').primaryKey(),
  reminderId: text('reminder_id').notNull(),
  userId: text('user_id'),
  eventType: text('event_type').notNull(),
  fromValue: text('from_value'),
  toValue: text('to_value'),
  metadata: text('metadata'),
  createdAt: text('created_at').notNull()
});

export const reminderNotificationPreferencesTable = sqliteTable('reminder_notification_preferences', {
  userId: text('user_id').primaryKey(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull(),
  dueRemindersEnabled: integer('due_reminders_enabled', { mode: 'boolean' }).notNull(),
  dailySummaryEnabled: integer('daily_summary_enabled', { mode: 'boolean' }).notNull(),
  updatedAt: text('updated_at').notNull()
});

export const notificationDeliveryLogTable = sqliteTable('notification_delivery_log', {
  id: text('id').primaryKey(),
  notificationType: text('notification_type').notNull(),
  userId: text('user_id'),
  reminderId: text('reminder_id'),
  deliveryBucket: text('delivery_bucket').notNull(),
  deliveredAt: text('delivered_at').notNull()
});

export const schemaMigrationsTable = sqliteTable('schema_migrations', {
  filename: text('filename').primaryKey(),
  appliedAt: text('applied_at').notNull()
});

export const sharedListsTable = sqliteTable('shared_lists', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  assigneeUserId: text('assignee_user_id'),
  createdByUserId: text('created_by_user_id'),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  archivedAt: text('archived_at'),
  version: integer('version').notNull(),
  freshnessCheckedAt: text('freshness_checked_at')
});

export const listItemsTable = sqliteTable('list_items', {
  id: text('id').primaryKey(),
  listId: text('list_id').notNull(),
  body: text('body').notNull(),
  checked: integer('checked', { mode: 'boolean' }).notNull(),
  checkedAt: text('checked_at'),
  position: integer('position').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  version: integer('version').notNull()
});

export const listItemHistoryTable = sqliteTable('list_item_history', {
  id: text('id').primaryKey(),
  listId: text('list_id').notNull(),
  itemId: text('item_id'),
  userId: text('user_id'),
  eventType: text('event_type').notNull(),
  fromValue: text('from_value'),
  toValue: text('to_value'),
  createdAt: text('created_at').notNull()
});

export const routinesTable = sqliteTable('routines', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  assigneeUserId: text('assignee_user_id'),
  createdByUserId: text('created_by_user_id'),
  recurrenceRule: text('recurrence_rule').notNull(),
  intervalDays: integer('interval_days'),
  intervalWeeks: integer('interval_weeks'),
  weekdays: text('weekdays'),
  status: text('status').notNull(),
  currentDueDate: text('current_due_date'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  archivedAt: text('archived_at'),
  version: integer('version').notNull(),
  ritualType: text('ritual_type'),
  freshnessCheckedAt: text('freshness_checked_at')
});

export const routineOccurrencesTable = sqliteTable('routine_occurrences', {
  id: text('id').primaryKey(),
  routineId: text('routine_id').notNull(),
  dueDate: text('due_date').notNull(),
  completedAt: text('completed_at'),
  completedByUserId: text('completed_by_user_id'),
  skipped: integer('skipped', { mode: 'boolean' }).notNull(),
  createdAt: text('created_at').notNull()
});

export const mealPlansTable = sqliteTable('meal_plans', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  weekStartDate: text('week_start_date').notNull(),
  status: text('status').notNull(),
  generatedListRefs: text('generated_list_refs').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  archivedAt: text('archived_at'),
  version: integer('version').notNull(),
  freshnessCheckedAt: text('freshness_checked_at')
});

export const mealEntriesTable = sqliteTable('meal_entries', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull(),
  dayOfWeek: integer('day_of_week').notNull(),
  name: text('name').notNull(),
  shoppingItems: text('shopping_items').notNull(),
  position: integer('position').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  version: integer('version').notNull()
});

export const pushNotificationLogTable = sqliteTable('push_notification_log', {
  id: text('id').primaryKey(),
  subscriptionId: text('subscription_id').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  sentAt: text('sent_at').notNull(),
});

export const conversationsTable = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  type: text('type').notNull().default('general'),
  userId: text('user_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const conversationMessagesTable = sqliteTable('conversation_messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  toolCalls: text('tool_calls'),
  createdAt: text('created_at').notNull()
});

export const onboardingSessionsTable = sqliteTable('onboarding_sessions', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull(),
  userId: text('user_id'),
  status: text('status').notNull().default('started'),
  topicsCompleted: text('topics_completed').notNull().default('[]'),
  currentTopic: text('current_topic'),
  entitiesCreated: integer('entities_created').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const householdFreshnessTable = sqliteTable('household_freshness', {
  id: text('id').primaryKey().default('singleton'),
  lastHealthCheckCompletedAt: text('last_health_check_completed_at'),
  lastHealthCheckDismissedAt: text('last_health_check_dismissed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const feedbackTable = sqliteTable('feedback', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull(),
  userId: text('user_id').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  contextJson: text('context_json').notNull(),
  screenshotBase64: text('screenshot_base64'),
  status: text('status').notNull().default('new'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const automationRulesTable = sqliteTable('automation_rules', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull(),
  userId: text('user_id').notNull(),
  triggerType: text('trigger_type').notNull(),
  triggerThreshold: integer('trigger_threshold').notNull().default(3),
  actionType: text('action_type').notNull(),
  scopeType: text('scope_type').notNull().default('all'),
  scopeEntityId: text('scope_entity_id'),
  enabled: integer('enabled').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const automationLogTable = sqliteTable('automation_log', {
  id: text('id').primaryKey(),
  ruleId: text('rule_id').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  actionType: text('action_type').notNull(),
  executedAt: text('executed_at').notNull(),
  userId: text('user_id').notNull()
});
```

**Rebuild considerations:**
- **Text timestamps vs integer:** ISO text is human-readable but slower for range queries. Consider `integer` (Unix epoch ms) for columns used in WHERE/ORDER BY clauses, with a helper to format for display.
- **Hardcoded `householdId: 'household'`** in auth-routes: all accounts map to the same household string. Since no data is being retained, the rebuild should implement a proper household ID scheme (UUID) from day one.
- **No explicit foreign keys:** Referential integrity is enforced in application code. The rebuild could add SQLite foreign key constraints with `PRAGMA foreign_keys = ON` for defense in depth.
- **JSON text columns** (`generatedListRefs`, `shoppingItems`, `topicsCompleted`, `toolCalls`): Consider whether these should be normalized into separate tables for queryability.
- **`schemaMigrationsTable`:** The rebuild should use a proper migration tool rather than hand-rolled tracking.

---

## 3. Offline Sync Engine

Source file: `apps/pwa/src/lib/sync.ts`

The PWA works offline by queuing mutations into an IndexedDB outbox and flushing them when connectivity returns. Each command captures everything needed to replay the mutation server-side. Domain functions run identically on client and server — the outbox just defers the server call.

### Online vs Offline Branching Pattern

Every mutation function follows this pattern: if online, call the server and cache the response; if offline, run domain logic locally, cache optimistically with a `pendingSync` flag, and enqueue for later.

```ts
const isOffline = () => !window.navigator.onLine || !isEffectivelyOnline();

export async function confirmCreateCommand(finalItem: DraftItem, draftId?: string): Promise<InboxItem> {
  if (!isOffline()) {
    // Online: call server directly and cache the result
    const response = await confirmCreate(finalItem, draftId);
    await cacheItem({ ...response.savedItem, pendingSync: false });
    await setMeta('last-sync-at', new Date().toISOString());
    return response.savedItem;
  }
  // Offline: run domain logic locally, cache optimistically, enqueue for later
  const { item } = createInboxItem(finalItem);
  const pendingItem = { ...item, pendingSync: true };
  const command: OutboxCommand = {
    kind: 'create', commandId: crypto.randomUUID(), approved: true, finalItem
  };
  await cacheItem(pendingItem);
  await enqueueCommand(command);
  return pendingItem;
}
```

### Outbox Flush

On reconnect, the flush processes queued commands sequentially. Each command type maps to its corresponding API call. Version conflicts (HTTP 409) are caught per-command so one conflict does not block the entire queue. A deduplication guard prevents concurrent flush attempts from React StrictMode or route reloads.

```ts
async function flushOutboxOnce() {
  const commands = await listOutbox();
  for (const command of commands) {
    try {
      if (command.kind === 'create') {
        const response = await confirmCreate(command.finalItem);
        await cacheItem({ ...response.savedItem, pendingSync: false });
      } else if (command.kind === 'update') {
        const response = await confirmUpdate(command.itemId, command.expectedVersion, command.proposedChange);
        await cacheItem({ ...response.savedItem, pendingSync: false });
      }
      // ... similar branches for all ~25 command kinds (reminder, list, routine, meal plan, ritual)
      await removeOutboxCommand(command.commandId);
      await setMeta('last-sync-at', new Date().toISOString());
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 409) {
        await markOutboxConflict(command.commandId, `Version conflict: refresh and retry.`);
        showErrorToast(`Sync conflict: this item was changed elsewhere. Refresh and retry.`);
      }
      throw error;
    }
  }
}

export async function flushOutbox() {
  if (isOffline()) return;
  if (!inFlightFlush) {
    inFlightFlush = flushOutboxOnce().finally(() => {
      inFlightFlush = null;
    });
  }
  return inFlightFlush;
}
```

**Why it matters:** The `pendingSync` flag lets the UI show sync state. Version conflicts (409) are caught per-command so one conflict does not block the whole queue. The outbox command schema in `packages/contracts` (discriminated union with ~25 variants) is the protocol — both PWA and API must agree on it.

**Rebuild notes:**
- The v0.x flush stops on the first non-409 error (`throw error`), which means a transient network failure blocks all subsequent commands. Consider retry-with-backoff for transient errors.
- The large `if/else` chain in `flushOutboxOnce` should be refactored into a command handler registry.

---

## 4. Connectivity Monitoring

Source file: `apps/pwa/src/lib/connectivity.ts`

### WKWebView `navigator.onLine` Bug Workaround

`navigator.onLine` lies on iOS WKWebView — it always returns `true` even when the device cannot reach the API (e.g., Tailscale tunnel down). This module supplements the browser API with active health-check pinging.

### Active Health-Check Pinging

A periodic GET to `/api/health` determines real reachability. The ping runs every 30 seconds with a 5-second timeout. Browser `online`/`offline` events trigger an immediate re-probe.

```ts
const PING_INTERVAL_MS = 30_000;
const PING_TIMEOUT_MS = 5_000;

type ConnectivityState = {
  browserOnline: boolean;
  apiReachable: boolean;
};

let state: ConnectivityState = {
  browserOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  apiReachable: true, // optimistic until first check
};

const listeners = new Set<() => void>();

function setState(next: Partial<ConnectivityState>) {
  const prev = state;
  state = { ...state, ...next };
  if (prev.browserOnline !== state.browserOnline || prev.apiReachable !== state.apiReachable) {
    for (const cb of listeners) cb();
  }
}

async function ping(): Promise<void> {
  if (!navigator.onLine) {
    setState({ browserOnline: false, apiReachable: false });
    return;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const res = await fetch(resolveApiUrl('/api/health'), {
      method: 'GET', signal: controller.signal, cache: 'no-store',
    });
    clearTimeout(timeout);
    setState({ browserOnline: true, apiReachable: res.ok });
  } catch {
    setState({ browserOnline: navigator.onLine, apiReachable: false });
  }
}
```

### CORS vs Network Failure Diagnostic Probing

A one-shot diagnostic probe tests both normal and `no-cors` fetches to distinguish CORS configuration failures from true network-level failures. If the `no-cors` fetch succeeds (opaque response) but the normal fetch fails, the issue is CORS, not connectivity.

```ts
export async function runDiagnosticProbe(): Promise<ConnectivityDiagnostic> {
  const url = resolveApiUrl('/api/health');
  const result: ConnectivityDiagnostic = {
    healthUrl: url, cors: 'error', corsDetail: 'pending',
    noCors: 'error', noCorsDetail: 'pending', timestamp: new Date().toISOString(),
  };

  // Test 1: normal (cors) fetch
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    result.cors = res.ok ? 'ok' : 'error';
    result.corsDetail = res.ok ? `${res.status} OK` : `HTTP ${res.status}`;
  } catch (err) {
    result.corsDetail = err instanceof Error ? err.message : String(err);
  }

  // Test 2: no-cors fetch (proves network path works even if CORS blocks response)
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store', mode: 'no-cors' });
    result.noCors = (res.type === 'opaque' || res.ok) ? 'ok' : 'error';
    result.noCorsDetail = res.type === 'opaque' ? 'opaque (network reachable)' : `${res.status}`;
  } catch (err) {
    result.noCorsDetail = err instanceof Error ? err.message : String(err);
  }

  return result;
}
```

### `useSyncExternalStore`-Compatible Subscriber Pattern

The connectivity state is exposed via a pub/sub API that plugs directly into React's `useSyncExternalStore` without needing a state management library.

```ts
export function subscribeConnectivity(callback: () => void): () => void {
  listeners.add(callback);
  startConnectivityMonitor(); // auto-start when first subscriber appears
  return () => { listeners.delete(callback); };
}

export function getConnectivitySnapshot(): ConnectivityState {
  return state;
}

export function isEffectivelyOnline(): boolean {
  return state.browserOnline && state.apiReachable;
}
```

**Why it matters:** Every offline-capable operation checks `isEffectivelyOnline()` rather than trusting `navigator.onLine`. The pub/sub pattern integrates cleanly with React without adding a state management dependency.

---

## 5. Push Notification Registration

Source file: `apps/pwa/src/lib/push-opt-in.ts`

### Service Worker Token Storage

The session token is stored in a separate IndexedDB database (`olivia-sw`) accessible to the Service Worker. This allows the SW to authenticate push action button requests without the app being in the foreground.

```ts
const SW_DB_NAME = 'olivia-sw';
const SW_DB_VERSION = 1;
const AUTH_STORE = 'authToken';

async function storeAuthTokenForSW(token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SW_DB_NAME, SW_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUTH_STORE)) {
        db.createObjectStore(AUTH_STORE);
      }
      if (!db.objectStoreNames.contains('actionOutbox')) {
        db.createObjectStore('actionOutbox', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(AUTH_STORE, 'readwrite');
      const store = tx.objectStore(AUTH_STORE);
      store.put(token, 'token');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}
```

### VAPID Key Handling and Web Push Registration

The VAPID public key is fetched from the server at registration time rather than baked into the client build. The subscription is created via the browser Push API and sent to the server.

```ts
export async function registerWebPushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const vapidRes = await fetch(resolveApiUrl('/api/push-subscriptions/vapid-public-key'));
    const { vapidPublicKey } = await vapidRes.json() as { vapidPublicKey: string | null };
    if (!vapidPublicKey) return false;

    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
    });
    const subJson = subscription.toJSON();
    await fetch(resolveApiUrl('/api/push-subscriptions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
    });

    const sessionToken = getStoredSessionToken();
    if (sessionToken) {
      await storeAuthTokenForSW(sessionToken).catch((err) =>
        console.warn('failed to store auth token for SW', err)
      );
    }
    return true;
  } catch (err) {
    console.warn('push subscription failed', err);
    return false;
  }
}
```

### Permission Management State Machine

Push opt-in follows a state machine (`prompt -> granted | denied | dismissed | unsupported`). Separating `dismissed` from `denied` lets the UI show different recovery paths — `denied` is browser-level and permanent, `dismissed` is user-level and recoverable.

```ts
export type PushOptInState = 'prompt' | 'granted' | 'denied' | 'unsupported' | 'dismissed';

export function usePushOptIn() {
  const [state, setState] = useState<PushOptInState>('unsupported');

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setState('unsupported'); return;
    }
    const perm = Notification.permission;
    if (perm === 'granted') { setState('granted'); return; }
    if (perm === 'denied') { setState('denied'); return; }
    if (localStorage.getItem(DISMISSED_KEY)) { setState('dismissed'); return; }
    setState('prompt');
  }, []);

  const requestPermission = useCallback(async (): Promise<void> => {
    if (!('serviceWorker' in navigator)) return;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      setState(perm === 'denied' ? 'denied' : 'dismissed');
      return;
    }
    setState('granted');
    await registerWebPushSubscription();
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setState('dismissed');
  }, []);

  return { state, requestPermission, dismiss };
}
```

---

## 6. API Client URL Resolution

Source file: `apps/pwa/src/lib/api.ts`

A single resolution function used by every API call prevents URL construction bugs across environments (localhost dev, Capacitor on-device, production via Tailscale).

```ts
const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3001';

function normalizeBasePath(basePath: string): string {
  const trimmedBasePath = basePath.trim();
  if (!trimmedBasePath || trimmedBasePath === '/') return '';
  return `/${trimmedBasePath.replace(/^\/+|\/+$/g, '')}`;
}

function stripDuplicatePrefix(pathname: string, basePath: string): string {
  if (!basePath) return pathname;
  if (pathname === basePath) return '';
  if (pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length);
  return pathname;
}

export function resolveApiUrl(
  path: string,
  baseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
): string {
  const requestUrl = new URL(
    path.startsWith('/') ? path : `/${path}`, 'http://olivia.local'
  );

  if (/^https?:\/\//i.test(baseUrl)) {
    const resolvedBaseUrl = new URL(baseUrl);
    const basePath = normalizeBasePath(resolvedBaseUrl.pathname);
    resolvedBaseUrl.pathname =
      `${basePath}${stripDuplicatePrefix(requestUrl.pathname, basePath)}` || '/';
    resolvedBaseUrl.search = requestUrl.search;
    resolvedBaseUrl.hash = requestUrl.hash;
    return resolvedBaseUrl.toString();
  }

  const basePath = normalizeBasePath(baseUrl);
  return `${basePath}${stripDuplicatePrefix(requestUrl.pathname, basePath)}` +
    `${requestUrl.search}${requestUrl.hash}` || '/';
}
```

**Why it matters:** Handles four URL scenarios:
1. **Relative base** (`/api`): dev proxy configuration
2. **Absolute host** (`https://olivia.example.com/api`): production
3. **Tailscale IP** (`http://100.x.y.z:3001`): on-device testing
4. **Duplicate prefix** (`/api` base + `/api/health` path): the `stripDuplicatePrefix` guard prevents `/api/api/health`

---

## 7. Preview-Confirm Mutation Pattern

Every user-facing mutation goes through a two-step flow: the client first requests a **preview** (which shows what will change), then sends a **confirm** (which commits the change). This is a product-level design choice that enforces the advisory-only trust model — nothing is persisted until the user approves.

### Representative Example: Inbox Item Create

```ts
// POST /api/inbox/items/preview-create
app.post('/api/inbox/items/preview-create', async (request, reply) => {
  const body = previewCreateRequestSchema.parse(request.body);

  const parsed = body.inputText
    ? await aiProvider.parseDraft(body.inputText)
    : createDraft({ structuredInput: body.structuredInput });

  const draftId = randomUUID();
  drafts.save(draftId, { kind: 'create', finalItem: parsed.draft });

  const response = previewCreateResponseSchema.parse({
    draftId,
    parsedItem: parsed.draft,
    parseConfidence: parsed.parseConfidence,
    ambiguities: parsed.ambiguities,
    parserSource: parsed.parserSource,
    requiresConfirmation: true
  });

  return reply.send(response);
});

// POST /api/inbox/items/confirm-create
app.post('/api/inbox/items/confirm-create', async (request, reply) => {
  const body = confirmCreateRequestSchema.parse(request.body);
  const userId = resolveUserId(request);

  const finalDraft = resolveCreateDraft(body.finalItem, drafts.take(body.draftId));
  const { item, historyEntry } = createInboxItem(finalDraft);
  const attributedItem = { ...item, createdByUserId: userId };
  const attributedHistory = { ...historyEntry, userId };
  repository.createItem(attributedItem, attributedHistory);

  return reply.send({ savedItem: attributedItem, historyEntry: attributedHistory, newVersion: item.version });
});
```

**How it works:**
1. **Preview:** Client sends natural language or structured input. Server parses it (via AI or local parser), generates a draft, and returns it with confidence scores and ambiguity list. A `draftId` ties preview to confirm.
2. **Confirm:** Client sends back the (possibly user-edited) draft. Server looks up the original draft by `draftId`, merges any edits, runs the domain function, persists, and returns the saved entity.

**Why it matters:** The user always sees and approves the parsed result before persistence. AI confidence scores and ambiguity lists let the UI decide how much friction to show. The `draftId` ties preview to confirm so the server can short-circuit re-parsing. This pattern is applied across all entity types: inbox items, reminders, routines, lists, and meal plans.
