import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase } from '../src/db/client';
import { InboxRepository } from '../src/repository';

describe('clearConversation', () => {
  let tmpDir: string;
  let repo: InboxRepository;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'olivia-test-'));
    const db = createDatabase(join(tmpDir, 'test.db'));
    repo = new InboxRepository(db);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('clears a conversation with messages', () => {
    const now = new Date('2026-03-17T12:00:00.000Z');
    const conv = repo.getOrCreateConversation(now);
    repo.addChatMessage({
      id: randomUUID(),
      conversationId: conv.id,
      role: 'user',
      content: 'Hello',
      toolCalls: null,
      createdAt: now.toISOString()
    });

    repo.clearConversation(conv.id);

    // After clearing, getOrCreateConversation should create a new one
    const next = repo.getOrCreateConversation(now);
    expect(next.id).not.toBe(conv.id);
  });

  it('clears a conversation that has an onboarding session (OLI-135 regression)', () => {
    const now = new Date('2026-03-17T12:00:00.000Z');
    const conv = repo.getOrCreateConversation(now);
    repo.addChatMessage({
      id: randomUUID(),
      conversationId: conv.id,
      role: 'user',
      content: 'Hello',
      toolCalls: null,
      createdAt: now.toISOString()
    });
    repo.createOnboardingSession({
      id: randomUUID(),
      conversationId: conv.id,
      status: 'started',
      topicsCompleted: [],
      currentTopic: 'reminders',
      entitiesCreated: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });

    // This should not throw a FOREIGN KEY constraint error
    expect(() => repo.clearConversation(conv.id)).not.toThrow();

    const next = repo.getOrCreateConversation(now);
    expect(next.id).not.toBe(conv.id);
    expect(repo.getOnboardingSession()).toBeNull();
  });
});
