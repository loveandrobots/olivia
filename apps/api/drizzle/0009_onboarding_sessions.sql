-- Add conversation type to existing conversations table
ALTER TABLE conversations ADD COLUMN type TEXT NOT NULL DEFAULT 'general';

-- Onboarding sessions table
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started',
  topics_completed TEXT NOT NULL DEFAULT '[]',
  current_topic TEXT,
  entities_created INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
