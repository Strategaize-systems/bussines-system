# Migrations

### MIG-001 — Initial Schema V1
- Date: 2026-03-27
- Scope: 9 Tabellen (profiles, companies, contacts, pipelines, pipeline_stages, deals, activities, documents, content_calendar) + RLS Policies + Seed-Daten (2 Pipelines mit Default-Stages)
- Reason: Initiales Schema für V1 CRM-Kern, Pipeline-Management, Aktivitäten-Log, Dokumente und Redaktionskalender.
- Affected Areas: Gesamte Datenbasis. Alle CRUD-Operationen im Cockpit.
- Risk: Erste Migration, kein bestehendes Schema. Risiko gering.
- Rollback Notes: DROP TABLE in umgekehrter Reihenfolge (content_calendar, documents, activities, deals, pipeline_stages, pipelines, contacts, companies, profiles).

### MIG-002 — Fix overall_score type in fit_assessments
- Date: 2026-04-02
- Scope: fit_assessments.overall_score von INT auf NUMERIC(3,1) geändert
- Reason: Score-Berechnung erzeugt Dezimalwerte (z.B. 3.4), die bei INT verloren gehen. QA-Finding aus SLC-109.
- Affected Areas: fit_assessments Tabelle, Fit-Assessment Anzeige
- Risk: Gering — ALTER COLUMN TYPE ist verlustfrei für bestehende INT-Werte
- Rollback Notes: ALTER TABLE fit_assessments ALTER COLUMN overall_score TYPE INT;

### MIG-003 — Deal-Status-Workflow (V2.1)
- Date: 2026-04-04
- Scope: deals Tabelle — closed_at Timestamp hinzugefügt, lost_reason entfernt, Indexes auf status und closed_at
- Reason: Deal-Status-Lifecycle (active → won/lost) mit Auto-Status bei Stage-Wechsel. DB-Cleanup orphaned Fields.
- Affected Areas: Pipeline, Deal-CRUD, Dashboard
- Risk: Gering — lost_reason war nie in Benutzung (orphaned Field)
- Rollback Notes: ALTER TABLE deals DROP COLUMN closed_at; ALTER TABLE deals ADD COLUMN lost_reason TEXT;

### MIG-004 — Lead-Management-Pipeline (V2.1)
- Date: 2026-04-06
- Scope: Neue Pipeline "Lead-Management" mit 7 Stages (Identifiziert → Qualifiziert)
- Reason: Dritte Pipeline für Marketing-Outreach und Lead-Qualifizierung (SLC-208)
- Affected Areas: Pipelines, Pipeline-Stages, Sidebar, /pipeline/leads Route
- Risk: Gering — additive Änderung, kein Impact auf bestehende Pipelines
- Rollback Notes: DELETE FROM pipeline_stages WHERE pipeline_id = 'b0000000-0000-0000-0000-000000000003'; DELETE FROM pipelines WHERE id = 'b0000000-0000-0000-0000-000000000003';

### MIG-005 — V3 Schema-Erweiterungen
- Date: 2026-04-09
- Scope: 3 neue Tabellen (meetings, calendar_events, audit_log). Activities erweitert um source_type + source_id. Profiles role-Default von 'owner' auf 'admin' geaendert, team-Spalte hinzugefuegt. RLS (authenticated_full_access) + Grants auf neuen Tabellen. 9 Indexes.
- Reason: V3 Operative Kontextlogik — Meeting-Management (FEAT-308), Kalender-Events (FEAT-309), Governance-Basis (FEAT-307), Timeline-Rueckverlinkung (DEC-021).
- Affected Areas: Gesamte Datenbasis, Mein Tag, Deal-Workspace, Audit-Log-Viewer
- Risk: Gering — rein additive Aenderungen (neue Tabellen, neue Spalten, Default-Aenderung). Kein Impact auf bestehende Daten. Verifiziert auf Hetzner.
- Rollback Notes: DROP TABLE audit_log; DROP TABLE calendar_events; DROP TABLE meetings; ALTER TABLE activities DROP COLUMN source_type; ALTER TABLE activities DROP COLUMN source_id; ALTER TABLE profiles DROP COLUMN team; ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'owner';

### MIG-007 — V3.1 Task-Typ-Feld (Auto-Wiedervorlagen)
- Date: 2026-04-10
- Scope: tasks Tabelle — type-Spalte hinzugefuegt (TEXT DEFAULT 'manual'), Index auf type
- Reason: SLC-316 Auto-Wiedervorlagen — Tasks muessen zwischen manuell erstellten und automatischen Follow-up-Tasks unterscheidbar sein. Ermoeglicht Filterung in Aufgabenliste und differenzierte Anzeige in Mein Tag.
- Affected Areas: Tasks, Aufgaben-Seite, Mein Tag, E-Mail-Versand, Meeting-Completion
- Risk: Gering — rein additive Aenderung. Bestehende Tasks erhalten automatisch type='manual' als Default.
- Rollback Notes: ALTER TABLE tasks DROP COLUMN type; DROP INDEX idx_tasks_type;

### MIG-008 — V3.1 Yesterday Review + Unseen Events
- Date: 2026-04-10
- Scope: profiles Tabelle — last_login_at Spalte hinzugefuegt. Index auf tasks.completed_at.
- Reason: SLC-317 Tageseinschaetzung erweitert — "Seit letztem Login" Feature braucht Zeitstempel, Vortags-Queries brauchen Index auf completed_at.
- Affected Areas: Profiles, Mein Tag, Tasks
- Risk: Gering — rein additive Aenderung.
- Rollback Notes: ALTER TABLE profiles DROP COLUMN last_login_at; DROP INDEX idx_tasks_completed_at;

### MIG-006 — V3 RLS-Umbau (geplant)
- Date: TBD
- Scope: created_by-Backfill auf bestehende Rows. RLS-Policies von full_access auf operator_own_data umstellen (deals, tasks, emails, activities, documents, meetings, calendar_events). audit_log: admin-only.
- Reason: FEAT-307 Governance-Basis — Rollenbasierte Sichtbarkeit (Operator sieht eigene Daten, Admin sieht alles).
- Affected Areas: Alle geschaeftsrelevanten Tabellen, Auth-Flow, Server Actions
- Risk: Mittel — created_by-Backfill muss vor RLS-Umbau laufen. Single-User-Szenario reduziert Risiko.
- Rollback Notes: Pro Tabelle: DROP POLICY operator_own_data, DROP POLICY admin_full_access, CREATE POLICY authenticated_full_access FOR ALL TO authenticated USING (true).
