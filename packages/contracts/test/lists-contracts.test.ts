import {
  activeListIndexResponseSchema,
  addListItemRequestSchema,
  archiveListRequestSchema,
  archivedListIndexResponseSchema,
  checkListItemRequestSchema,
  createListRequestSchema,
  deleteListRequestSchema,
  listDetailResponseSchema,
  outboxCommandSchema,
  removeListItemRequestSchema,
  restoreListRequestSchema,
  uncheckListItemRequestSchema,
  updateListItemBodyRequestSchema,
  updateListTitleRequestSchema
} from '../src/index';

const listId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const itemId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

function buildList(overrides: Record<string, unknown> = {}) {
  return {
    id: listId,
    title: 'Grocery Run',
    owner: 'stakeholder',
    status: 'active',
    activeItemCount: 3,
    checkedItemCount: 1,
    allChecked: false,
    createdAt: '2026-03-15T10:00:00.000Z',
    updatedAt: '2026-03-15T10:00:00.000Z',
    archivedAt: null,
    version: 1,
    ...overrides
  };
}

function buildItem(overrides: Record<string, unknown> = {}) {
  return {
    id: itemId,
    listId,
    body: 'Oat milk',
    checked: false,
    checkedAt: null,
    position: 0,
    createdAt: '2026-03-15T10:00:00.000Z',
    updatedAt: '2026-03-15T10:00:00.000Z',
    version: 1,
    ...overrides
  };
}

describe('list contracts', () => {
  describe('query response schemas', () => {
    it('parses active list index response', () => {
      const result = activeListIndexResponseSchema.parse({
        lists: [buildList()],
        source: 'server'
      });
      expect(result.lists).toHaveLength(1);
      expect(result.lists[0].title).toBe('Grocery Run');
      expect(result.source).toBe('server');
    });

    it('parses archived list index response', () => {
      const result = archivedListIndexResponseSchema.parse({
        lists: [buildList({ status: 'archived', archivedAt: '2026-03-15T12:00:00.000Z' })],
        source: 'cache'
      });
      expect(result.lists[0].status).toBe('archived');
    });

    it('parses list detail response with items', () => {
      const result = listDetailResponseSchema.parse({
        list: buildList(),
        items: [buildItem(), buildItem({ id: '550e8400-e29b-41d4-a716-446655440002', body: 'Eggs', position: 1 })],
        source: 'server'
      });
      expect(result.list.id).toBe(listId);
      expect(result.items).toHaveLength(2);
    });
  });

  describe('command schemas', () => {
    it('parses create list request', () => {
      const result = createListRequestSchema.parse({
        actorRole: 'stakeholder',
        title: 'Grocery Run'
      });
      expect(result.title).toBe('Grocery Run');
    });

    it('parses update list title request', () => {
      const result = updateListTitleRequestSchema.parse({
        actorRole: 'stakeholder',
        listId,
        expectedVersion: 1,
        title: 'Weekly Groceries'
      });
      expect(result.title).toBe('Weekly Groceries');
    });

    it('parses archive list request — requires confirmed: true', () => {
      const result = archiveListRequestSchema.parse({
        actorRole: 'stakeholder',
        listId,
        expectedVersion: 1,
        confirmed: true
      });
      expect(result.confirmed).toBe(true);
    });

    it('rejects archive list request without confirmed field', () => {
      expect(() =>
        archiveListRequestSchema.parse({
          actorRole: 'stakeholder',
          listId,
          expectedVersion: 1
        })
      ).toThrow();
    });

    it('parses restore list request', () => {
      const result = restoreListRequestSchema.parse({
        actorRole: 'stakeholder',
        listId,
        expectedVersion: 2
      });
      expect(result.listId).toBe(listId);
    });

    it('parses delete list request — requires confirmed: true', () => {
      const result = deleteListRequestSchema.parse({
        actorRole: 'stakeholder',
        listId,
        confirmed: true
      });
      expect(result.confirmed).toBe(true);
    });

    it('rejects delete list request without confirmed field', () => {
      expect(() =>
        deleteListRequestSchema.parse({
          actorRole: 'stakeholder',
          listId
        })
      ).toThrow();
    });

    it('parses add item request', () => {
      const result = addListItemRequestSchema.parse({
        actorRole: 'stakeholder',
        listId,
        body: 'Bread'
      });
      expect(result.body).toBe('Bread');
    });

    it('parses update item body request', () => {
      const result = updateListItemBodyRequestSchema.parse({
        actorRole: 'stakeholder',
        listId,
        itemId,
        expectedVersion: 1,
        body: 'Sourdough bread'
      });
      expect(result.body).toBe('Sourdough bread');
    });

    it('parses check item request as a direct-action command (no confirmed field)', () => {
      const result = checkListItemRequestSchema.parse({
        actorRole: 'stakeholder',
        listId,
        itemId,
        expectedVersion: 1
      });
      expect(result.itemId).toBe(itemId);
      expect('confirmed' in result).toBe(false);
    });

    it('parses uncheck item request as a direct-action command (no confirmed field)', () => {
      const result = uncheckListItemRequestSchema.parse({
        actorRole: 'stakeholder',
        listId,
        itemId,
        expectedVersion: 1
      });
      expect(result.itemId).toBe(itemId);
      expect('confirmed' in result).toBe(false);
    });

    it('parses remove item request — requires confirmed: true', () => {
      const result = removeListItemRequestSchema.parse({
        actorRole: 'stakeholder',
        listId,
        itemId,
        confirmed: true
      });
      expect(result.confirmed).toBe(true);
    });
  });

  describe('outbox command variants', () => {
    it('parses list_create outbox command', () => {
      const result = outboxCommandSchema.parse({
        kind: 'list_create',
        commandId: '550e8400-e29b-41d4-a716-446655440001',
        actorRole: 'stakeholder',
        title: 'Grocery Run'
      });
      expect(result.kind).toBe('list_create');
    });

    it('parses item_check outbox command', () => {
      const result = outboxCommandSchema.parse({
        kind: 'item_check',
        commandId: '550e8400-e29b-41d4-a716-446655440001',
        actorRole: 'stakeholder',
        listId,
        itemId,
        expectedVersion: 1
      });
      expect(result.kind).toBe('item_check');
    });

    it('parses item_uncheck outbox command', () => {
      const result = outboxCommandSchema.parse({
        kind: 'item_uncheck',
        commandId: '550e8400-e29b-41d4-a716-446655440001',
        actorRole: 'stakeholder',
        listId,
        itemId,
        expectedVersion: 1
      });
      expect(result.kind).toBe('item_uncheck');
    });

    it('parses list_archive outbox command with confirmed', () => {
      const result = outboxCommandSchema.parse({
        kind: 'list_archive',
        commandId: '550e8400-e29b-41d4-a716-446655440001',
        actorRole: 'stakeholder',
        listId,
        expectedVersion: 1,
        confirmed: true
      });
      expect(result.kind).toBe('list_archive');
    });

    it('parses list_delete outbox command with confirmed', () => {
      const result = outboxCommandSchema.parse({
        kind: 'list_delete',
        commandId: '550e8400-e29b-41d4-a716-446655440001',
        actorRole: 'stakeholder',
        listId,
        confirmed: true
      });
      expect(result.kind).toBe('list_delete');
    });

    it('parses item_remove outbox command with confirmed', () => {
      const result = outboxCommandSchema.parse({
        kind: 'item_remove',
        commandId: '550e8400-e29b-41d4-a716-446655440001',
        actorRole: 'stakeholder',
        listId,
        itemId,
        confirmed: true
      });
      expect(result.kind).toBe('item_remove');
    });
  });
});
