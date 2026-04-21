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

### MIG-012 — Fix fehlende RLS-Policies auf V2/V3-Tabellen
- Date: 2026-04-16
- Scope: `authenticated_full_access` Policy auf 6 Tabellen (emails, fit_assessments, handoffs, proposals, referrals, signals) nachgezogen. RLS war auf diesen Tabellen aktiviert, aber keine Policy definiert — Postgres-Verhalten war damit "alles verboten" fuer authenticated. Idempotent via DROP POLICY IF EXISTS + CREATE POLICY. Zusaetzlich explizite Grants fuer authenticated + service_role.
- Reason: Historisch fehlerhafte Migration — V2/V3 haben RLS aktiviert, aber die V1-Policy-Struktur aus `02_rls.sql` wurde nicht fuer neue Tabellen wiederholt. Bei SLC-411 Live-Test ("E-Mail versenden" Klick) als 535-nachfolgender RLS-Fehler sichtbar geworden. Siehe ISSUE-034.
- Affected Areas: E-Mail-Versand-Logging, Fit-Assessment, Handoffs, Proposals, Referrals, Signals — alle Cockpit-UI-Pfade, die als authenticated User in diese Tabellen schrieben.
- Risk: Gering — rein additive Aenderung (Policies hinzufuegen, nichts entfernen). `authenticated_full_access` ist das V1-Standard-Muster (USING true WITH CHECK true). service_role/adminClient war nicht betroffen (BYPASSRLS).
- Rollback Notes: Fuer Rollback: `DO $$ DECLARE tbl TEXT; BEGIN FOREACH tbl IN ARRAY ARRAY['emails','fit_assessments','handoffs','proposals','referrals','signals'] LOOP EXECUTE format('DROP POLICY IF EXISTS "authenticated_full_access" ON %I', tbl); END LOOP; END $$;` (stellt den pre-fix State wieder her — NICHT empfohlen, weil der pre-fix State gebrochen war).

### MIG-011 — V4.1 Meeting Intelligence Schema
- Date: 2026-04-16
- Scope: Neue Tabelle `user_settings` (1:1 zu profiles, Reminder- und Agenda-Einstellungen, push_subscription). `contacts` erweitert um 7 Felder (consent_status, consent_date, consent_source, consent_token, consent_token_expires_at, consent_requested_at, opt_out_communication). `meetings` erweitert um 11 Recording-/Transcript-/Summary-/Agenda-Felder (jitsi_room_name, recording_url, recording_status, recording_started_at, recording_duration_seconds, transcript_status, summary_status, ai_summary JSONB, ai_agenda, ai_agenda_generated_at, reminders_sent JSONB). `activities.ai_generated` BOOLEAN DEFAULT false. `audit_log.actor_id` wird NULLABLE (fuer Public-Page-Events). Neue audit_log-Actions fuer Consent- (consent_requested/granted/declined/revoked/communication_opt_out_changed) und Recording-Lifecycle (recording_started/completed/failed, transcript_generated, summary_generated). RLS authenticated_full_access auf user_settings. Indizes: idx_contacts_consent_token (partial), idx_contacts_consent_status, idx_contacts_opt_out (partial), idx_meetings_recording_status (partial).
- Reason: V4.1 Meeting Intelligence Basis — FEAT-404 Call Intelligence (Jitsi+Jibri+Whisper+Bedrock-Summary), FEAT-409 Meeting-Erinnerungen, FEAT-411 DSGVO-Einwilligungsflow inkl. ISSUE-032 (opt_out_communication). Aktiviert das in MIG-005 vorbereitete `meetings.transcript`-Feld.
- Affected Areas: Kontakte (Consent-UI, Public-Page, Opt-out-Toggle), Meetings (Deal-Workspace Recording-Status, Timeline-Summary-Activity), User-Settings (neue Seite in spaeteren Slices), Audit-Log (Consent-Events, Public-Actor=NULL)
- Risk: Mittel — rein additive Aenderungen. Bestand-Kontakte erhalten `consent_status = 'pending'` und `opt_out_communication = false` als Default. Recording-bezogene Meetings-Felder sind alle nullable — keine Auswirkung auf V4-Bestands-Meetings ohne Recording. `user_settings`-Tabelle ist neu ohne Impact auf bestehende Daten. `audit_log.actor_id DROP NOT NULL` ist abwaertskompatibel (vorhandene Rows bleiben gueltig).
- Rollback Notes: DROP TABLE user_settings; ALTER TABLE activities DROP COLUMN ai_generated; ALTER TABLE meetings DROP COLUMN reminders_sent, DROP COLUMN ai_agenda_generated_at, DROP COLUMN ai_agenda, DROP COLUMN ai_summary, DROP COLUMN summary_status, DROP COLUMN transcript_status, DROP COLUMN recording_duration_seconds, DROP COLUMN recording_started_at, DROP COLUMN recording_status, DROP COLUMN recording_url, DROP COLUMN jitsi_room_name; ALTER TABLE contacts DROP COLUMN opt_out_communication, DROP COLUMN consent_requested_at, DROP COLUMN consent_token_expires_at, DROP COLUMN consent_token, DROP COLUMN consent_source, DROP COLUMN consent_date, DROP COLUMN consent_status; ALTER TABLE audit_log ALTER COLUMN actor_id SET NOT NULL (nur wenn alle Rows eine actor_id haben); (audit_log-Rows mit Consent-Actions bleiben als Historie).

### MIG-013 — user_settings Backfill + Auto-Insert Trigger
- Date: 2026-04-17
- Scope: Backfill-INSERT fuer bestehende Profile ohne user_settings-Row (ON CONFLICT DO NOTHING). Neue Trigger-Funktion fn_create_user_settings() + Trigger trg_create_user_settings auf profiles (AFTER INSERT). Idempotent.
- Reason: SLC-417 — user_settings-Tabelle wurde in MIG-011 erstellt, aber ohne Daten. Backfill stellt sicher, dass bestehende User sofort Defaults haben. Trigger stellt sicher, dass kuenftige Profile automatisch eine user_settings-Row erhalten.
- Affected Areas: user_settings (neue Rows), profiles (neuer Trigger)
- Risk: Gering — rein additiver INSERT mit ON CONFLICT DO NOTHING. Trigger ist idempotent (DROP IF EXISTS vor CREATE).
- Rollback Notes: DROP TRIGGER IF EXISTS trg_create_user_settings ON profiles; DROP FUNCTION IF EXISTS fn_create_user_settings(); DELETE FROM user_settings WHERE user_id NOT IN (SELECT user_id FROM user_settings WHERE updated_at != created_at);

### MIG-014 — V4.2 pgvector + knowledge_chunks Schema
- Date: 2026-04-18
- Scope: pgvector Extension aktivieren. Neue Tabelle `knowledge_chunks` mit vector(1024) Spalte, HNSW-Index (m=16, ef_construction=64), Lookup-Indizes (source, status, deal_id aus JSONB), Unique Constraint (source_type, source_id, chunk_index). RLS authenticated_full_access + Grants.
- Reason: V4.2 Wissensbasis Cross-Source (FEAT-401, DEC-046). RAG-Pipeline benoetigt Vektor-Speicher fuer semantische Suche ueber Meeting-Transkripte, E-Mails, Deal-Activities und Dokumente.
- Affected Areas: PostgreSQL (neue Extension + Tabelle). Kein Impact auf bestehende Tabellen.
- Risk: Gering — rein additive Aenderung. pgvector ist in supabase/postgres:15.6.1.145 enthalten. HNSW-Index-Build ist bei leerer Tabelle instantan. Erst bei Backfill (~3.000 Chunks) wird der Index relevant.
- Rollback Notes: DROP TABLE knowledge_chunks; DROP EXTENSION vector;

### MIG-015 — V4.2 Knowledge Search RPC Function
- Date: 2026-04-18
- Scope: PostgreSQL-Funktion `search_knowledge_chunks` fuer pgvector Similarity Search via Supabase RPC. Parameter: query_embedding (TEXT → vector cast), match_count, filter_scope (deal/contact/company/null), filter_id. Returns: id, source_type, source_id, chunk_index, chunk_text, metadata, similarity (cosine). SECURITY DEFINER. GRANT EXECUTE fuer authenticated + service_role.
- Reason: Supabase PostgREST kann pgvector `<=>` Operator nicht direkt. RPC-Funktion kapselt die Similarity Search als aufrufbare API. SLC-424 RAG Query API.
- Affected Areas: Keine bestehenden Tabellen betroffen. Neue Funktion im public Schema.
- Risk: Gering — rein additiv, nutzt bestehende knowledge_chunks Tabelle und HNSW-Index.
- Rollback Notes: DROP FUNCTION search_knowledge_chunks;

### MIG-016 — V4.3 ai_action_queue Erweiterung + Signal-Status
- Date: 2026-04-19
- Scope: ALTER ai_action_queue ADD COLUMN target_entity_type TEXT, target_entity_id UUID, proposed_changes JSONB, confidence FLOAT. ALTER meetings ADD COLUMN signal_status TEXT. ALTER email_messages ADD COLUMN signal_status TEXT. Index auf ai_action_queue(target_entity_type, target_entity_id). Alle Spalten nullable — kein Impact auf bestehende Daten.
- Reason: V4.3 Insight Governance braucht strukturierte Property-Vorschlaege in der Queue (DEC-049) und Signal-Status-Tracking auf Meetings/E-Mails (DEC-050).
- Affected Areas: ai_action_queue (erweitert), meetings (erweitert), email_messages (erweitert). TypeScript-Types in ai-queue.ts.
- Risk: Gering — rein additive ALTERs, nullable Spalten, keine bestehenden Daten betroffen.
- Rollback Notes: ALTER TABLE ai_action_queue DROP COLUMN target_entity_type, DROP COLUMN target_entity_id, DROP COLUMN proposed_changes, DROP COLUMN confidence; ALTER TABLE meetings DROP COLUMN signal_status; ALTER TABLE email_messages DROP COLUMN signal_status;

### MIG-017 — V6 Schema (Produkte, Ziele, KPI-Snapshots)
- Date: 2026-04-20
- Scope: 4 neue Tabellen (products, deal_products, goals, kpi_snapshots) mit Indexes, Unique Constraints (COALESCE-Pattern fuer nullable product_id), RLS-Policies (authenticated_full_access), Grants. Rein additiv — keine bestehenden Tabellen werden geaendert.
- Reason: Datenbasis fuer V6 Produkt-Stammdaten (FEAT-601), Ziel-Tracking (FEAT-602), Performance-Cockpit (FEAT-603) und KPI-History (FEAT-604).
- Affected Areas: Deal-Workspace (Produkt-Zuordnung), neue Performance-Seite, neuer Settings-Bereich, neuer Cron-Job.
- Risk: Gering — rein additiv, keine ALTERs auf bestehende Tabellen.
- Rollback Notes: DROP TABLE kpi_snapshots, goals, deal_products, products CASCADE;

### MIG-018 — V6 Activity KPI Targets
- Date: 2026-04-20
- Scope: 1 neue Tabelle (activity_kpi_targets) mit Unique Index (user_id, kpi_key), RLS, Grants. Speichert definierbare Tages-Sollwerte fuer Aktivitaets-KPIs (Telefonate, Meetings, Deal-Bewegungen, etc.).
- Reason: Basis fuer Activity-based KPI-Tracking — taegliche Disziplin-Messung als Hebel fuer Umsatzziele.
- Affected Areas: Performance-Cockpit (/performance), Ziel-Verwaltung (/performance/goals).
- Risk: Gering — rein additiv, 1 neue Tabelle.
- Rollback Notes: DROP TABLE activity_kpi_targets CASCADE;

### MIG-019 — V5 Automatisierung + Vertriebsintelligenz Schema
- Date: 2026-04-21
- Scope: 5 neue Tabellen (cadences, cadence_steps, cadence_enrollments, cadence_executions, email_tracking_events) mit Indexes, Unique Constraints (COALESCE-Pattern fuer nullable deal_id/contact_id), CHECK Constraint (enrollment_target), RLS-Policies, Grants. 2 Tabellen-Erweiterungen: emails (+tracking_id UUID, +tracking_enabled BOOLEAN), email_messages (+assignment_source TEXT, +ai_match_confidence NUMERIC).
- Reason: Datenbasis fuer V5 Cadences (FEAT-501), E-Mail-Auto-Zuordnung (FEAT-505) und E-Mail-Tracking (FEAT-506).
- Affected Areas: E-Mail-Versand (Tracking), IMAP-Sync (Auto-Zuordnung), neue Cadences-Seite, Export-API.
- Risk: Gering — rein additiv. Neue Tabellen + 4 neue Spalten auf bestehende Tabellen (nullable, kein Breaking Change).
- Rollback Notes: DROP TABLE email_tracking_events, cadence_executions, cadence_enrollments, cadence_steps, cadences CASCADE; ALTER TABLE emails DROP COLUMN tracking_id, DROP COLUMN tracking_enabled; ALTER TABLE email_messages DROP COLUMN assignment_source, DROP COLUMN ai_match_confidence;
