-- Phase 7: PWA Enhancement & Production Polish
-- Migration for push subscriptions, analytics, and offline queue

-- Push Subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_last_used ON push_subscriptions(last_used);

-- Analytics Events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  event_name TEXT NOT NULL,
  event_category TEXT,
  event_data TEXT,
  session_id TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_events ON analytics_events(event_name, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id);

-- Offline Queue table
CREATE TABLE IF NOT EXISTS offline_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  request_type TEXT NOT NULL,
  request_url TEXT NOT NULL,
  request_method TEXT NOT NULL,
  request_body TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'synced', 'failed')),
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_offline_queue_user ON offline_queue(user_id);

-- App Installations table (track PWA installs)
CREATE TABLE IF NOT EXISTS app_installations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  platform TEXT,
  user_agent TEXT,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_installations_user ON app_installations(user_id);
CREATE INDEX IF NOT EXISTS idx_installations_platform ON app_installations(platform);
