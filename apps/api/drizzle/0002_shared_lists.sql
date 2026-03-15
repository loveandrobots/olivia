CREATE TABLE IF NOT EXISTS shared_lists (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  version INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS shared_lists_status_idx ON shared_lists(status);
CREATE INDEX IF NOT EXISTS shared_lists_updated_at_idx ON shared_lists(updated_at DESC);

CREATE TABLE IF NOT EXISTS list_items (
  id TEXT PRIMARY KEY NOT NULL,
  list_id TEXT NOT NULL,
  body TEXT NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  checked_at TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL,
  FOREIGN KEY(list_id) REFERENCES shared_lists(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS list_items_list_id_position_idx ON list_items(list_id, position ASC);

CREATE TABLE IF NOT EXISTS list_item_history (
  id TEXT PRIMARY KEY NOT NULL,
  list_id TEXT NOT NULL,
  item_id TEXT,
  actor_role TEXT NOT NULL,
  event_type TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(list_id) REFERENCES shared_lists(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS list_item_history_list_id_created_at_idx ON list_item_history(list_id, created_at DESC);
