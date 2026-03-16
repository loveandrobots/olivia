-- push_subscriptions: device push subscriptions scoped to the household.
-- userId is nullable — populated in Phase 3 for per-member targeting.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  household_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_id TEXT DEFAULT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_household
  ON push_subscriptions(household_id);

-- push_notification_log: dedup log for nudge push delivery.
-- Purge rows older than 48h on each scheduler run.
CREATE TABLE IF NOT EXISTS push_notification_log (
  id TEXT PRIMARY KEY NOT NULL,
  subscription_id TEXT NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  sent_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_notification_log_dedup
  ON push_notification_log(subscription_id, entity_type, entity_id, sent_at);
