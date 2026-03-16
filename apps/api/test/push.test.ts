import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../src/app';
import type { AppConfig } from '../src/config';
import { createDatabase } from '../src/db/client';
import { evaluateNudgePushRule } from '../src/jobs';
import type { PushProvider, NotificationPayload, PushSubscriptionPayload } from '../src/push';
import { InboxRepository } from '../src/repository';

const createConfig = (dbPath: string): AppConfig => ({
  port: 0,
  dbPath,
  staleThresholdDays: 14,
  dueSoonDays: 7,
  aiProvider: 'disabled',
  notificationsEnabled: false,
  vapidPublicKey: null,
  vapidPrivateKey: null,
  vapidContact: 'mailto:test@localhost',
  notificationRules: { dueSoonEnabled: false, staleItemEnabled: false, digestEnabled: false },
  notificationIntervalMs: 3_600_000,
  nudgePushIntervalMs: 1_800_000,
  pwaOrigin: 'http://localhost:4173'
});

const makeLogger = () =>
  ({ info: () => {}, warn: () => {}, debug: () => {}, error: () => {} }) as unknown as Parameters<typeof evaluateNudgePushRule>[3];

function createMockPush(configured = true): PushProvider & { sends: Array<{ sub: PushSubscriptionPayload; notification: NotificationPayload }> } {
  const sends: Array<{ sub: PushSubscriptionPayload; notification: NotificationPayload }> = [];
  return {
    sends,
    isConfigured: () => configured,
    send: async (sub, notification) => { sends.push({ sub, notification }); },
  };
}

function create410Push(): PushProvider & { sends: Array<{ sub: PushSubscriptionPayload; notification: NotificationPayload }> } {
  const sends: Array<{ sub: PushSubscriptionPayload; notification: NotificationPayload }> = [];
  return {
    sends,
    isConfigured: () => true,
    send: async () => {
      const err = new Error('Gone') as Error & { statusCode: number };
      err.statusCode = 410;
      throw err;
    },
  };
}

// Helper: insert an overdue routine directly so nudge payloads exist
function insertOverdueRoutine(db: ReturnType<typeof createDatabase>, id: string, title: string, dueDate: string) {
  db.prepare(`
    INSERT INTO routines (id, title, owner, recurrence_rule, interval_days, status, current_due_date, created_at, updated_at, version)
    VALUES (?, ?, 'stakeholder', 'every_n_days', 7, 'active', ?, datetime('now'), datetime('now'), 1)
  `).run(id, title, dueDate);
}

describe('push subscription API endpoints', () => {
  let directory: string;
  let dbPath: string;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'olivia-push-'));
    dbPath = join(directory, 'test.sqlite');
    const config = createConfig(dbPath);
    app = await buildApp({ config });
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('GET /api/push-subscriptions/vapid-public-key returns null when not configured', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/push-subscriptions/vapid-public-key' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ vapidPublicKey: null });
  });

  it('POST /api/push-subscriptions with valid body returns 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/push-subscriptions',
      payload: {
        endpoint: 'https://push.example.com/sub1',
        keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.endpoint).toBe('https://push.example.com/sub1');
  });

  it('POST /api/push-subscriptions with missing keys.p256dh returns 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/push-subscriptions',
      payload: {
        endpoint: 'https://push.example.com/sub1',
        keys: { auth: 'test-auth' },
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('DELETE /api/push-subscriptions removes the subscription', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/push-subscriptions',
      payload: {
        endpoint: 'https://push.example.com/sub-to-delete',
        keys: { p256dh: 'key1', auth: 'auth1' },
      },
    });

    const delRes = await app.inject({
      method: 'DELETE',
      url: '/api/push-subscriptions',
      query: { endpoint: 'https://push.example.com/sub-to-delete' },
    });
    expect(delRes.statusCode).toBe(204);

    // Verify it's gone by trying to subscribe again (should get a new ID)
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/push-subscriptions',
      payload: {
        endpoint: 'https://push.example.com/sub-to-delete',
        keys: { p256dh: 'key2', auth: 'auth2' },
      },
    });
    expect(res2.statusCode).toBe(201);
  });

  it('DELETE /api/push-subscriptions without endpoint query param returns 400', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/push-subscriptions' });
    expect(res.statusCode).toBe(400);
  });
});

describe('evaluateNudgePushRule', () => {
  let directory: string;
  let db: ReturnType<typeof createDatabase>;
  let repository: InboxRepository;
  let config: AppConfig;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'olivia-nudge-push-'));
    const dbPath = join(directory, 'test.sqlite');
    db = createDatabase(dbPath);
    repository = new InboxRepository(db);
    config = createConfig(dbPath);
  });

  afterEach(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('returns early when push is not configured', async () => {
    const push = createMockPush(false);
    await evaluateNudgePushRule(repository, push, config, makeLogger());
    expect(push.sends).toHaveLength(0);
  });

  it('returns early when no push subscriptions exist', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T10:00:00Z');
    insertOverdueRoutine(db, 'r1', 'Take out trash', '2026-03-14T08:00:00Z');
    await evaluateNudgePushRule(repository, push, config, makeLogger(), now);
    expect(push.sends).toHaveLength(0);
  });

  it('returns early when no active nudges exist', async () => {
    const push = createMockPush();
    repository.savePushSubscription('https://push.example.com/sub', 'key', 'auth');
    await evaluateNudgePushRule(repository, push, config, makeLogger());
    expect(push.sends).toHaveLength(0);
  });

  it('sends push for an active nudge', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T10:00:00Z');
    insertOverdueRoutine(db, 'r1', 'Take out trash', '2026-03-14T08:00:00Z');
    repository.savePushSubscription('https://push.example.com/sub', 'p256dh-val', 'auth-val');

    await evaluateNudgePushRule(repository, push, config, makeLogger(), now);
    expect(push.sends).toHaveLength(1);
    expect(push.sends[0].notification.title).toBe('Olivia household nudge');
    expect(push.sends[0].notification.body).toContain('Take out trash');
  });

  it('dedup: item within 2h window is not re-pushed', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T10:00:00Z');
    insertOverdueRoutine(db, 'r1', 'Take out trash', '2026-03-14T08:00:00Z');
    repository.savePushSubscription('https://push.example.com/sub', 'p256dh-val', 'auth-val');

    await evaluateNudgePushRule(repository, push, config, makeLogger(), now);
    expect(push.sends).toHaveLength(1);

    // Second run within the 2h window
    const nowPlus1h = new Date(now.getTime() + 60 * 60 * 1000);
    await evaluateNudgePushRule(repository, push, config, makeLogger(), nowPlus1h);
    expect(push.sends).toHaveLength(1); // still 1, not 2
  });

  it('dedup: item outside 2h window is re-pushed', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T10:00:00Z');
    insertOverdueRoutine(db, 'r1', 'Take out trash', '2026-03-14T08:00:00Z');
    repository.savePushSubscription('https://push.example.com/sub', 'p256dh-val', 'auth-val');

    await evaluateNudgePushRule(repository, push, config, makeLogger(), now);
    expect(push.sends).toHaveLength(1);

    // Run again 3 hours later (outside 2h window)
    const nowPlus3h = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    await evaluateNudgePushRule(repository, push, config, makeLogger(), nowPlus3h);
    expect(push.sends).toHaveLength(2);
  });

  it('410 cleanup: subscription removed on 410 response', async () => {
    const push = create410Push();
    const now = new Date('2026-03-15T10:00:00Z');
    insertOverdueRoutine(db, 'r1', 'Take out trash', '2026-03-14T08:00:00Z');
    repository.savePushSubscription('https://push.example.com/sub', 'p256dh-val', 'auth-val');

    expect(repository.listPushSubscriptions()).toHaveLength(1);
    await evaluateNudgePushRule(repository, push, config, makeLogger(), now);
    expect(repository.listPushSubscriptions()).toHaveLength(0);
  });

  it('purges stale log entries older than 48h', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T10:00:00Z');
    insertOverdueRoutine(db, 'r1', 'Take out trash', '2026-03-14T08:00:00Z');
    const sub = repository.savePushSubscription('https://push.example.com/sub', 'p256dh-val', 'auth-val');

    // Record a log entry 72 hours ago
    const oldTime = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    repository.recordPushNotificationLog(sub.id, 'routine', 'r-old', oldTime);

    // Verify it exists
    const countBefore = (db.prepare('SELECT COUNT(*) as cnt FROM push_notification_log').get() as { cnt: number }).cnt;
    expect(countBefore).toBe(1);

    // Run the rule which purges stale entries
    await evaluateNudgePushRule(repository, push, config, makeLogger(), now);

    // Old entry should be purged
    const countAfter = (db.prepare("SELECT COUNT(*) as cnt FROM push_notification_log WHERE entity_id = 'r-old'").get() as { cnt: number }).cnt;
    expect(countAfter).toBe(0);
  });
});
