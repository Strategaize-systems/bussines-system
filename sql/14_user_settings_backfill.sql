-- ============================================================
-- V4.1 Backfill: user_settings Default-Rows (SLC-417 / MT-1)
-- ============================================================
-- Stellt sicher, dass jede profiles-Row genau eine user_settings-Row hat.
-- 1. Backfill fuer bestehende Profile ohne user_settings
-- 2. Trigger-Funktion fuer kuenftige Profile
-- Idempotent: ON CONFLICT DO NOTHING, CREATE OR REPLACE, IF NOT EXISTS
-- ============================================================

-- 1. Backfill: Insert Defaults fuer alle Profile ohne user_settings-Row
INSERT INTO user_settings (user_id)
SELECT p.id
FROM profiles p
LEFT JOIN user_settings us ON us.user_id = p.id
WHERE us.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 2. Trigger-Funktion: Auto-Insert bei neuem Profile
CREATE OR REPLACE FUNCTION fn_create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger auf profiles (idempotent via DROP IF EXISTS)
DROP TRIGGER IF EXISTS trg_create_user_settings ON profiles;
CREATE TRIGGER trg_create_user_settings
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION fn_create_user_settings();
