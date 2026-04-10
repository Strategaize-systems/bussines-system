-- V3.1 Migration: Add type column to tasks table
-- SLC-316: Auto-Wiedervorlagen — tasks need a type to distinguish manual vs follow_up

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'manual';

-- Index for filtering by type (used in Aufgaben list + Mein Tag)
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);

COMMENT ON COLUMN tasks.type IS 'Task type: manual (user-created), follow_up (auto-created after meeting/email), proposal (send proposal)';
