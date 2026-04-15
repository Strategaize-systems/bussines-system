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

### MIG-009 — V3.1 Templates + Attribution + Duplikat-Indizes
- Date: 2026-04-10
- Scope: Neue Tabelle email_templates (CRUD + RLS). companies: source_type + source_detail Spalten. contacts: source_detail Spalte. Indizes fuer Duplikat-Erkennung (contacts.email, companies.name).
- Reason: SLC-318 Templates, Duplikate, Attribution. E-Mail-Templates in 3 Sprachen, strukturierte Quell-Zuordnung, Duplikat-Warnung.
- Affected Areas: Settings (Template-CRUD), E-Mail-Compose (Template-Auswahl), Kontakte + Firmen (Source-Felder, Duplikat-Check)
- Risk: Gering — rein additive Aenderungen.
- Rollback Notes: DROP TABLE email_templates; ALTER TABLE companies DROP COLUMN source_type; ALTER TABLE companies DROP COLUMN source_detail; ALTER TABLE contacts DROP COLUMN source_detail;

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

### MIG-010 — V4 IMAP + KI-Gatekeeper Schema
- Date: 2026-04-12
- Scope: 5 neue Tabellen (email_messages, email_threads, email_sync_state, ai_action_queue, ai_feedback). calendar_events erweitert um source, external_id, sync_status, booking_link. RLS + Grants + Indizes.
- Reason: V4 KI-Gatekeeper + Externe Integrationen. IMAP E-Mail-Sync (FEAT-405), KI-Klassifikation (FEAT-408), KI-Wiedervorlagen (FEAT-407), Auto-Reply-Erkennung (FEAT-410), Cal.com-Sync (FEAT-406).
- Affected Areas: E-Mail-System (IMAP inbound neben SMTP outbound), Mein Tag (Gatekeeper, Wiedervorlagen), Kalender (Cal.com Sync), KI-Layer (Klassifikation, Action-Queue)
- Risk: Mittel — Rein additive Aenderungen (neue Tabellen, neue Spalten). Bestehende emails-Tabelle bleibt unveraendert. Kein Impact auf bestehende Daten. IMAP-Credentials muessen vorher in Coolify Env Vars stehen.
- Rollback Notes: DROP TABLE ai_feedback; DROP TABLE ai_action_queue; DROP TABLE email_sync_state; DROP TABLE email_messages; DROP TABLE email_threads; ALTER TABLE calendar_events DROP COLUMN source; ALTER TABLE calendar_events DROP COLUMN external_id; ALTER TABLE calendar_events DROP COLUMN sync_status; ALTER TABLE calendar_events DROP COLUMN booking_link;

### MIG-011 — V4.1 Meeting Intelligence Schema (planned)
- Date: TBD (V4.1 Slice-Planning)
- Scope: Neue Tabelle `user_settings` (1:1 zu profiles, Reminder- und Agenda-Einstellungen, push_subscription). `contacts` erweitert um 6 Consent-Felder (consent_status, consent_date, consent_source, consent_token, consent_token_expires_at, consent_requested_at). `meetings` erweitert um 11 Recording-/Transcript-/Summary-/Agenda-Felder (jitsi_room_name, recording_url, recording_status, recording_started_at, recording_duration_seconds, transcript_status, summary_status, ai_summary JSONB, ai_agenda, ai_agenda_generated_at, reminders_sent JSONB). `activities.ai_generated` BOOLEAN DEFAULT false. Neue audit_log-Actions fuer Consent- und Recording-Lifecycle. RLS auf user_settings (user sieht nur eigene). Indizes auf contacts.consent_token, meetings.recording_status, meetings.scheduled_at.
- Reason: V4.1 Meeting Intelligence Basis — FEAT-404 Call Intelligence (Jitsi+Jibri+Whisper+Bedrock-Summary), FEAT-409 Meeting-Erinnerungen, FEAT-411 DSGVO-Einwilligungsflow. Aktiviert das in MIG-005 vorbereitete `meetings.transcript`-Feld.
- Affected Areas: Kontakte (Consent-UI, Public-Page), Meetings (Deal-Workspace Recording-Status, Timeline-Summary-Activity), User-Settings (neue Seite), Audit-Log (Consent-Events)
- Risk: Mittel — rein additive Aenderungen. Bestand-Kontakte erhalten `consent_status = 'pending'` als Default. Recording-bezogene Meetings-Felder sind alle nullable — keine Auswirkung auf V4-Bestands-Meetings ohne Recording. `user_settings`-Tabelle ist neu ohne Impact auf bestehende Daten.
- Rollback Notes: DROP TABLE user_settings; ALTER TABLE activities DROP COLUMN ai_generated; ALTER TABLE meetings DROP COLUMN reminders_sent, DROP COLUMN ai_agenda_generated_at, DROP COLUMN ai_agenda, DROP COLUMN ai_summary, DROP COLUMN summary_status, DROP COLUMN transcript_status, DROP COLUMN recording_duration_seconds, DROP COLUMN recording_started_at, DROP COLUMN recording_status, DROP COLUMN recording_url, DROP COLUMN jitsi_room_name; ALTER TABLE contacts DROP COLUMN consent_requested_at, DROP COLUMN consent_token_expires_at, DROP COLUMN consent_token, DROP COLUMN consent_source, DROP COLUMN consent_date, DROP COLUMN consent_status; (audit_log-Rows mit Consent-Actions bleiben als Historie).
