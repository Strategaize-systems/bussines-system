-- ============================================================
-- V3 Schema-Migration (MIG-005): Neue Tabellen + Erweiterungen
-- ============================================================
-- 3 neue Tabellen: meetings, calendar_events, audit_log
-- 2 Tabellen-Erweiterungen: activities (+source), profiles (+team)
-- RLS: authenticated_full_access auf neuen Tabellen (V1-Muster)
-- RLS-Redesign (operator_own_data) ist MIG-006 (separater Slice)
-- Idempotent: kann mehrfach laufen (IF NOT EXISTS / IF EXISTS)
-- KEINE auth.users Referenzen (Playbook Problem 9)
-- ============================================================

-- ============================================================
-- 1. TABELLEN-ERWEITERUNGEN
-- ============================================================

-- activities: +2 Rueckverlinkungsfelder (DEC-021)
-- source_type: meeting, call, email, audit
-- source_id: UUID des verknuepften Objekts
ALTER TABLE activities ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS source_id UUID;

-- profiles: role-Default von 'owner' auf 'admin' aendern (FEAT-307)
-- Bestehender Single-User bleibt Admin
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'admin';
UPDATE profiles SET role = 'admin' WHERE role = 'owner' OR role IS NULL;

-- profiles: +team (nullable, fuer spaetere Team-Zuordnung V5)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team TEXT;

-- ============================================================
-- 2. NEUE TABELLE: meetings (FEAT-308, DEC-021)
-- ============================================================
-- Status-Werte: planned, completed, cancelled
-- participants: Freitext in V3, spaeter ggf. JSON-Array
-- transcript: Leer in V3, vorbereitet fuer V4 (Call Intelligence)

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 60,
  location TEXT,
  participants TEXT,
  agenda TEXT,
  outcome TEXT,
  notes TEXT,
  transcript TEXT,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'planned',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. NEUE TABELLE: calendar_events (FEAT-309, DEC-026)
-- ============================================================
-- type-Werte: meeting, call, block, personal, other
-- meeting_id: Automatische Verknuepfung wenn Event aus Meeting erzeugt wird

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  type TEXT DEFAULT 'other',
  description TEXT,
  location TEXT,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. NEUE TABELLE: audit_log (FEAT-307, DEC-024)
-- ============================================================
-- action-Werte: stage_change, status_change, create, update, delete, approval, rejection
-- changes: JSONB mit { before: {...}, after: {...} } fuer diff-faehiges Audit
-- context: Optionaler Freitext (z.B. "Moved from Angebot to Verhandlung")

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. INDEXES
-- ============================================================

-- activities: Partielle Index auf source-Felder (nur wenn gesetzt)
CREATE INDEX IF NOT EXISTS idx_activities_source ON activities(source_type, source_id)
  WHERE source_type IS NOT NULL;

-- meetings
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_meetings_deal ON meetings(deal_id);
CREATE INDEX IF NOT EXISTS idx_meetings_contact ON meetings(contact_id);

-- calendar_events
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);

-- audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================================
-- 6. RLS — V1-Muster (authenticated_full_access)
-- ============================================================
-- Neue Tabellen bekommen erstmal das V1-Muster.
-- MIG-006 (SLC-302) baut dann operator_own_data Policies auf.

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON meetings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON calendar_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON audit_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 7. GRANTS
-- ============================================================
-- Neue Tabellen brauchen explizite Grants (BYPASSRLS ≠ table permissions)

GRANT ALL ON meetings TO authenticated;
GRANT ALL ON meetings TO service_role;
GRANT ALL ON calendar_events TO authenticated;
GRANT ALL ON calendar_events TO service_role;
GRANT ALL ON audit_log TO authenticated;
GRANT ALL ON audit_log TO service_role;
