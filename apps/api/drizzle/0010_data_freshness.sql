-- Add freshnessCheckedAt column to all five entity tables
ALTER TABLE inbox_items ADD COLUMN freshness_checked_at TEXT;
ALTER TABLE routines ADD COLUMN freshness_checked_at TEXT;
ALTER TABLE reminders ADD COLUMN freshness_checked_at TEXT;
ALTER TABLE shared_lists ADD COLUMN freshness_checked_at TEXT;
ALTER TABLE meal_plans ADD COLUMN freshness_checked_at TEXT;

-- Household freshness state (singleton row for health check timing)
CREATE TABLE IF NOT EXISTS household_freshness (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'singleton',
  last_health_check_completed_at TEXT,
  last_health_check_dismissed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
