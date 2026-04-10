-- V3.1 Migration: Support for yesterday review + unseen events
-- SLC-317: Tageseinschaetzung erweitert

-- Track last login for "unseen events" feature
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Index for yesterday completed tasks queries
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);
