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

### MIG-020 — V5.1 Asterisk Telefonie Schema
- Date: 2026-04-22
- Scope: 1 neue Tabelle (calls) mit 22 Spalten: direction, status, phone_number, caller_id, started_at, connected_at, ended_at, duration_seconds, recording_url, recording_status, transcript, transcript_status, ai_summary (JSONB), summary_status, voice_agent_handled, voice_agent_classification, voice_agent_transcript, asterisk_channel_id, sip_call_id, created_by. 6 Indexes (deal, contact, status, recording, direction). RLS + Grants fuer authenticated + service_role. Supabase Storage Bucket "call-recordings".
- Reason: Datenbasis fuer V5.1 Click-to-Call (FEAT-512), Anruf-Aufnahme-Pipeline (FEAT-513) und SMAO-Voice-Agent-Adapter (FEAT-514). Folgt DEC-021 Pattern (eigene Tabelle fuer reichere Daten, Activity fuer Timeline).
- Affected Areas: Deal-Workspace (Anrufen-Button + Call-Timeline), Cron-Pipeline (call-processing), Webhook (voice-agent), Supabase Storage (neuer Bucket).
- Risk: Gering — rein additiv. Eine neue Tabelle, kein Schema-Change an bestehenden Tabellen.
- Rollback Notes: DROP TABLE calls CASCADE; Supabase Storage Bucket "call-recordings" loeschen.

### MIG-021 — V5.1 Storage Grants + Role Delegation Fix
- Date: 2026-04-24
- Scope: Role membership (GRANT anon/authenticated/service_role TO supabase_storage_admin), USAGE on storage schema fuer service_role/anon/authenticated, CRUD-Grants auf storage-Tabellen, search_path=storage,public fuer alle drei Supabase-Rollen. Entfernt die in MIG-020 angelegten call_recordings_* Policies (waren fehlerhaft und unnoetig, da BYPASSRLS auf service_role greift).
- Reason: Storage-Uploads waren an allen Buckets gebrochen (Meeting + Call). storage-api nutzt set_config('role','service_role',...), was ohne Role-Membership von supabase_storage_admin mit PostgreSQL-Error 42501 fehlschlug — gemeldet als "new row violates row-level security policy". Beim SLC-514 E2E-Test entdeckt (ISSUE-040).
- Affected Areas: Alle Supabase Storage Buckets (meeting-recordings, call-recordings). Call-Recording-Pipeline, Meeting-Recording-Poll, Retention-Cron. Keine Data-Migration, nur Permissions.
- Risk: Gering — idempotent, rein additiv auf Permission-Ebene. DROP POLICY nur auf den fehlerhaften MIG-020-Policies.
- Rollback Notes: Theoretisch REVOKE der Grants + Restore Policies aus MIG-020 — nicht empfohlen, da Pre-Fix-Zustand non-funktional war.

### MIG-022 — V5.2 Compliance-Templates Schema
- Date: 2026-04-25 (applied — SLC-523)
- Scope: 1 neue Tabelle `compliance_templates` mit Spalten: `template_key TEXT PRIMARY KEY` (CHECK in (`'meeting_invitation'`, `'email_footer'`, `'calcom_booking'`)), `body_markdown TEXT NOT NULL` (User-editierter Wert), `default_body_markdown TEXT NOT NULL` (Skill-mitgelieferter Default fuer Reset-Button), `updated_by UUID NULL REFERENCES profiles(id)`, `updated_at TIMESTAMPTZ DEFAULT now()`. RLS-Policy `authenticated_full_access` analog `user_settings`. 3 Default-Rows als INSERT mit ON CONFLICT DO NOTHING (idempotent).
- Reason: V5.2 FEAT-523 (Einwilligungstexte als Templates) braucht persistenten Speicher fuer 3 Template-Bloecke. DEC-083 hat eigene Tabelle (statt user_settings-Erweiterung) festgelegt — saubere Trennung, einfacher Reset-auf-Default, klare Schema-Validierung pro Spalte.
- Affected Areas: Settings-Page `/settings/compliance` (neu), Server Actions `getComplianceTemplate` / `updateComplianceTemplate` (neu in `cockpit/src/app/(app)/settings/compliance/actions.ts`). Keine Aenderung an bestehenden Tabellen.
- Risk: Gering — rein additiv, eine neue Tabelle ohne FK-Beziehungen ausser nullable `updated_by`. Idempotent (IF NOT EXISTS, ON CONFLICT DO NOTHING).
- Rollback Notes: `DROP TABLE compliance_templates CASCADE;`

### MIG-025 — V5.4 SLC-542 Email-Attachments Schema
- Date: 2026-04-28 (applied auf Hetzner via SSH/base64-Pattern, SLC-542 MT-1)
- Scope: 4 Aenderungen in einer Migration `025_v54_email_attachments.sql`:
  1. Storage Bucket `email-attachments` (privat, `public=false`) via `INSERT INTO storage.buckets (id, name, public) VALUES ('email-attachments', 'email-attachments', false) ON CONFLICT DO NOTHING;`
  2. Neue Tabelle `email_attachments` als Junction zwischen `emails` und Storage:
     - `id UUID PK DEFAULT gen_random_uuid()`
     - `email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE`
     - `storage_path TEXT NOT NULL`
     - `filename TEXT NOT NULL`
     - `mime_type TEXT NOT NULL`
     - `size_bytes BIGINT NOT NULL`
     - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  3. Index `idx_email_attachments_email_id` auf `email_attachments(email_id)`.
  4. RLS auf `email_attachments` enable + Policy `authenticated_full_access` (FOR ALL TO authenticated USING (true) WITH CHECK (true)). Service-Role hat BYPASSRLS.
- Reason: V5.4 FEAT-542 (E-Mail-Anhaenge-Upload PC-Direkt) braucht Persistenz fuer hochgeladene Anhaenge und Verknuepfung zur `emails`-Tabelle. DEC-097 (Junction-Table statt JSON-Spalte), DEC-098 (compose_session_id-Path, kein Post-Send-Move) haben die Strategie festgelegt.
- Affected Areas:
  - Neuer Storage-Bucket `email-attachments` auf Self-Hosted Supabase
  - Neue Tabelle `email_attachments` mit Index + RLS
  - Server Actions `uploadEmailAttachment`, `deleteEmailAttachment` (neu in `cockpit/src/app/(app)/emails/compose/attachment-actions.ts`)
  - `cockpit/src/lib/email/send.ts` Erweiterung um optionalen `attachments`-Parameter (additiv, Default leer)
  - `cockpit/src/lib/email/attachments-whitelist.ts` (neu, MIME-Whitelist + Size-Limits)
  - KEINE Aenderung an `emails`, `branding_settings`, `email_templates`.
- Risk: Niedrig — rein additive Aenderungen. FK auf `emails(id)` mit `ON DELETE CASCADE` wirkt erst, wenn Mail-Loeschung implementiert wird (heute nicht der Fall). Storage-Bucket-Anlage ist idempotent. Backwards Compatibility: `sendEmailWithTracking` ohne `attachments`-Parameter (Default leer) ist bit-identisch zu V5.3 (Cadences, Auto-Reply unbeeintraechtigt).
- Rollback Notes:
  - `DROP TABLE email_attachments CASCADE;`
  - `DELETE FROM storage.objects WHERE bucket_id='email-attachments'; DELETE FROM storage.buckets WHERE id='email-attachments';`
  - `send.ts`-Aenderung ist rein additiv (Default `attachments=[]`) — kein Code-Rollback noetig wenn Tabelle weg ist.

### MIG-024 — V5.3 SLC-531 Branding Storage Public-Read + Logo-URL-Reset (Hotfix)
- Date: 2026-04-27 (applied auf Hetzner)
- Scope: 1. SELECT-Policy `branding_public_read` auf `storage.objects` fuer anon+authenticated mit `bucket_id='branding'`. 2. UPDATE `branding_settings.logo_url=NULL WHERE logo_url LIKE 'http://supabase-kong:%'` — alte interne Docker-URLs unbrauchbar.
- Reason: ISSUE-044 — Logo-Anzeige im Browser broken nach SLC-531 Upload. Hosting-Setup proxied `/supabase/...` nicht zu Kong; Strategie-Switch auf Next.js-API-Route `/api/branding/logo`. Storage-Policy bleibt drin als Defense-in-Depth fuer kuenftige Public-Buckets.
- Affected Areas: storage.objects-Policies, branding_settings.logo_url-Werte
- Risk: Niedrig — DROP POLICY IF EXISTS + CREATE POLICY ist idempotent; UPDATE betrifft nur defekte URLs.
- Rollback Notes: `DROP POLICY IF EXISTS "branding_public_read" ON storage.objects;` (UPDATE ist nicht reversibel — User laedt Logo neu hoch)

### MIG-023 — V5.3 Branding + Email-Templates Schema + Systemvorlagen-Seed
- Date: 2026-04-27 (Teil 1 SLC-531 + Teil 2 SLC-532 beide applied auf Hetzner)
- Scope: 3 Aenderungen in einer Migration `023_v53_branding_email_templates.sql`:
  1. Neue Tabelle `branding_settings` (single-row): `id UUID PK`, `logo_url TEXT NULL`, `primary_color TEXT NULL`, `secondary_color TEXT NULL`, `font_family TEXT NULL DEFAULT 'system'`, `footer_markdown TEXT NULL`, `contact_block JSONB NULL`, `updated_by UUID NULL REFERENCES profiles(id)`, `updated_at TIMESTAMPTZ DEFAULT now()`. RLS `authenticated_full_access`. Initiale Empty-Row via INSERT ON CONFLICT DO NOTHING (single-row enforcement an App-Level).
  2. Erweiterung `email_templates` um 4 nullable Spalten: `is_system BOOLEAN DEFAULT false`, `category TEXT NULL`, `language TEXT NULL DEFAULT 'de'`, `layout JSONB NULL`. 2 Indizes: `idx_email_templates_is_system`, `idx_email_templates_category`.
  3. Storage Bucket `branding` (Public-Read, Authenticated-Write) via `INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true) ON CONFLICT DO NOTHING;` plus passende `storage.objects`-RLS-Policies.
  4. Seed-INSERT fuer 6 DE-Systemvorlagen + 1-2 EN/NL via INSERT ON CONFLICT DO NOTHING (`is_system=true`, `category` gesetzt, `language` gesetzt). Konkrete Body-Texte werden in der Migration ausformuliert.
- Reason: V5.3 FEAT-531 (Branding-Settings + zentrale Mail-Layout-Engine) braucht typisierte Branding-Spalten und Storage fuer Logo. FEAT-533 (Systemvorlagen + KI-Vorlagen-Generator) braucht Schema-Erweiterung auf `email_templates` fuer Filter `is_system`/`category` und Sprache. DEC-088 (eigene Tabelle), DEC-089 (Storage Bucket), DEC-090 (`layout` als nullable JSONB), DEC-091 (SQL-Seed) haben die Strategie festgelegt.
- Affected Areas:
  - Settings-Page `/settings/branding` (neu), Server Actions `getBranding`/`updateBranding`/`uploadLogo` (neu in `cockpit/src/app/(app)/settings/branding/actions.ts`).
  - `cockpit/src/lib/email/render.ts` (neu, pure Function `renderBrandedHtml`).
  - `cockpit/src/lib/email/send.ts` Renderer-Hook (additiv: Branding-Pfad neben `textToHtml`-Fallback).
  - `cockpit/src/app/(app)/settings/template-actions.ts` Erweiterung (Filter `is_system`/`category`, neue Action `duplicateSystemTemplate`).
  - Composing-Studio Route `/emails/compose` (neu, FEAT-532).
  - KEINE Aenderung an `emails`, `contacts`, `deals`, `companies`, `cadences`, `compliance_templates`.
- Risk: Niedrig — rein additive Aenderungen. `branding_settings` ist neue Tabelle ohne FK-Constraints (ausser nullable `updated_by`). `email_templates`-Erweiterung ist nullable mit Defaults — Backwards Compatibility fuer alle bestehenden Rows. Storage Bucket ist additiv. Seed-INSERTs sind idempotent (ON CONFLICT DO NOTHING). Backwards Compatibility-Test: bestehende Mails ohne Branding gehen weiterhin via `textToHtml`-Fallback raus (Bit-fuer-Bit identisch zum heutigen Output).
- Rollback Notes:
  - `DROP TABLE branding_settings CASCADE;`
  - `ALTER TABLE email_templates DROP COLUMN IF EXISTS is_system, DROP COLUMN IF EXISTS category, DROP COLUMN IF EXISTS language, DROP COLUMN IF EXISTS layout;`
  - `DELETE FROM storage.objects WHERE bucket_id='branding'; DELETE FROM storage.buckets WHERE id='branding';`
  - `DELETE FROM email_templates WHERE is_system=true;` (nur falls Spalte noch existiert)
  - Seed-INSERTs sind via Title-Prefix `System: ...` identifizierbar — falls Spalte `is_system` schon dropped, alternativ via Title-Filter.

### MIG-026 — V5.5 Angebot-Erstellung Schema
- Date: 2026-04-29 — applied auf Hetzner Business-System (Container `supabase-db-k9f5pn5upfq7etoefb5ukbcg-075438771312`) als Teil von SLC-551 (`/backend`). Erstapply + Idempotenz-Smoke (zweiter Run) sauber durchgelaufen.
- Scope: 4 Aenderungen in einer Migration `026_v55_proposal_creation.sql`:
  1. Erweiterung `proposals` um 11 nullable Spalten:
     - `subtotal_net NUMERIC(12,2)` — berechnete Netto-Summe
     - `tax_rate NUMERIC(5,2) NOT NULL DEFAULT 19.00` — Steuersatz Snapshot
     - `tax_amount NUMERIC(12,2)` — berechnete Steuersumme
     - `total_gross NUMERIC(12,2)` — berechnete Brutto-Summe
     - `valid_until DATE` — Gueltigkeitszeitraum
     - `payment_terms TEXT` — Zahlungsfrist (Free-Text)
     - `parent_proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL` — Versionierung (DEC-109)
     - `accepted_at TIMESTAMPTZ`
     - `rejected_at TIMESTAMPTZ`
     - `expired_at TIMESTAMPTZ`
     - `pdf_storage_path TEXT` — Pfad in `proposal-pdfs`-Bucket (DEC-111)
     - 3 Indizes: `idx_proposals_parent`, `idx_proposals_valid_until`, `idx_proposals_status_active` (partial: WHERE status IN ('draft','sent'))
  2. Neue Tabelle `proposal_items` (DEC-107):
     - `id UUID PK DEFAULT gen_random_uuid()`
     - `proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE`
     - `product_id UUID REFERENCES products(id) ON DELETE SET NULL` — Snapshot bleibt auch wenn Produkt geloescht
     - `position_order INT NOT NULL` — fuer Drag-and-Drop-Sortierung
     - `quantity NUMERIC(10,2) NOT NULL DEFAULT 1`
     - `unit_price_net NUMERIC(12,2) NOT NULL` — effektiver Angebotspreis
     - `discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0`
     - `snapshot_name TEXT NOT NULL` — Produkt-Name beim Angebot
     - `snapshot_description TEXT`
     - `snapshot_unit_price_at_creation NUMERIC(12,2)` — Audit-Snapshot Listenpreis (DEC-107)
     - `created_at TIMESTAMPTZ DEFAULT now()`
     - 2 Indizes: `idx_proposal_items_proposal`, `idx_proposal_items_product` (partial: WHERE product_id IS NOT NULL)
     - RLS `authenticated_full_access` analog `deal_products`
  3. Erweiterung `email_attachments` um 2 Spalten (FEAT-555 / DEC-108):
     - `source_type TEXT NOT NULL DEFAULT 'upload'` — Werte: `upload`, `proposal`
     - `proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL`
     - 1 Partial-Index: `idx_email_attachments_proposal` WHERE `proposal_id IS NOT NULL`
     - CHECK-Constraint: `(source_type='upload' AND proposal_id IS NULL) OR (source_type='proposal' AND proposal_id IS NOT NULL)` — Daten-Konsistenz
  4. Storage-Bucket `proposal-pdfs` (DEC-111):
     - `INSERT INTO storage.buckets (id, name, public) VALUES ('proposal-pdfs', 'proposal-pdfs', false) ON CONFLICT DO NOTHING;`
     - RLS-Policies auf `storage.objects`:
       - SELECT/INSERT/UPDATE/DELETE fuer authenticated mit Pfad-Scope `(auth.uid())::text = (storage.foldername(name))[1]`
- Reason: V5.5 FEAT-551 (Schema-Erweiterung), FEAT-554 (Versionierung), FEAT-555 (Composing-Studio-Hookup) brauchen alle in einer Migration definiertes Schema. DEC-105..114 haben die Strategie festgelegt. Bestehende V2-Stub-Daten bleiben unveraendert lesbar (alle neuen Spalten nullable mit Defaults). FK auf `products` mit `ON DELETE SET NULL` schuetzt Snapshot-Wahrheit (DEC-107). FK auf `parent_proposal_id` mit `ON DELETE SET NULL` schuetzt Versions-Audit (DEC-109).
- Affected Areas:
  - `cockpit/src/app/(app)/proposals/actions.ts` (massive Erweiterung — neue Server Actions: `addProposalItem`, `updateProposalItem`, `removeProposalItem`, `reorderProposalItems`, `transitionProposalStatus`, `createProposalVersion`, `generateProposalPdf`, `getProposalsForDeal` etc.)
  - Neue Komponenten unter `cockpit/src/app/(app)/proposals/[id]/edit/*` (FEAT-552 Workspace)
  - Neuer Adapter `cockpit/src/lib/pdf/proposal-renderer.ts` (FEAT-553)
  - Neuer Cron-Endpoint `cockpit/src/app/api/cron/expire-proposals/route.ts` (FEAT-554, DEC-110)
  - `cockpit/src/lib/email/send.ts` Erweiterung um Source-Type=Proposal-Pfad (FEAT-555)
  - `cockpit/src/components/email/attachments-section.tsx` Erweiterung um Proposal-Picker (FEAT-555)
  - KEINE Aenderung an `products`, `deal_products`, `companies`, `contacts`, `deals`, `audit_log` (existing Schema reicht), `branding_settings` (existing Renderer reicht)
- Risk: Niedrig — rein additive Aenderungen. `proposals`-Erweiterung: alle Spalten nullable mit Defaults, bestehende Stub-Rows haben `subtotal_net=NULL`, `total_gross=NULL` (legitim, V2-Stubs hatten nie Berechnung). `proposal_items` ist neue Tabelle ohne Konflikte. `email_attachments`-Erweiterung: `source_type DEFAULT 'upload'` fuer alle existing V5.4-Rows — automatisch konsistent, CHECK-Constraint passt da `proposal_id` per Default NULL ist. Storage-Bucket ist additiv. Tax-Rate Default 19% (DE-Standard) ist Geschaeftsregel — bei Internationalisierung in V6+ pro-Tenant-Default.
- Rollback Notes:
  - `DROP TABLE proposal_items CASCADE;`
  - `ALTER TABLE proposals DROP COLUMN IF EXISTS subtotal_net, DROP COLUMN IF EXISTS tax_rate, DROP COLUMN IF EXISTS tax_amount, DROP COLUMN IF EXISTS total_gross, DROP COLUMN IF EXISTS valid_until, DROP COLUMN IF EXISTS payment_terms, DROP COLUMN IF EXISTS parent_proposal_id, DROP COLUMN IF EXISTS accepted_at, DROP COLUMN IF EXISTS rejected_at, DROP COLUMN IF EXISTS expired_at, DROP COLUMN IF EXISTS pdf_storage_path;`
  - `ALTER TABLE email_attachments DROP CONSTRAINT IF EXISTS email_attachments_source_type_check, DROP COLUMN IF EXISTS source_type, DROP COLUMN IF EXISTS proposal_id;`
  - `DELETE FROM storage.objects WHERE bucket_id='proposal-pdfs'; DELETE FROM storage.buckets WHERE id='proposal-pdfs';`
  - V2-Stub-Proposals bleiben nach Rollback unveraendert lesbar — bestehende `/proposals`-Tabelle funktioniert wieder im V5.4-Zustand.

### MIG-028 — V5.7 NL-VAT + Reverse-Charge Schema
- Date: 2026-05-04 (planned, Apply im Rahmen SLC-571 `/backend` auf Hetzner)
- Scope: 4 Aenderungen in einer Migration `028_v57_nl_vat_reverse_charge.sql`:
  1. `proposals.tax_rate` Default 19.00 → 21.00 (DEC-122):
     - `ALTER TABLE proposals ALTER COLUMN tax_rate SET DEFAULT 21.00;`
     - Bestehende Rows bleiben unangetastet (Snapshot-Prinzip DEC-107).
  2. `proposals.tax_rate` CHECK-Whitelist (DEC-122):
     - `ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_tax_rate_whitelist;`
     - `ALTER TABLE proposals ADD CONSTRAINT proposals_tax_rate_whitelist CHECK (tax_rate IN (0.00, 9.00, 19.00, 21.00));`
     - Akzeptiert 19% als Legacy fuer alte V5.5/V5.6-Rows. Editor-UI bietet nur 21/9/0 fuer neue Angebote.
  3. `proposals.reverse_charge` BOOLEAN-Flag (DEC-123):
     - `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS reverse_charge BOOLEAN NOT NULL DEFAULT false;`
     - `ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_reverse_charge_implies_zero_tax;`
     - `ALTER TABLE proposals ADD CONSTRAINT proposals_reverse_charge_implies_zero_tax CHECK (reverse_charge = false OR tax_rate = 0.00);`
     - Konsistenzschutz: wenn Flag gesetzt, MUSS tax_rate=0.00 sein. Bei Flag=false ist tax_rate frei (innerhalb der Whitelist).
  4. `branding_settings.vat_id` Strategaize-VAT (DEC-124):
     - `ALTER TABLE branding_settings ADD COLUMN IF NOT EXISTS vat_id TEXT NULL;`
     - Format-Validation app-side (NL-Format `^NL\d{9}B\d{2}$`).
  5. `companies.vat_id` Empfaenger-VAT (DEC-124):
     - `ALTER TABLE companies ADD COLUMN IF NOT EXISTS vat_id TEXT NULL;`
     - Format-Validation app-side (EU-Format mit Country-Code-Whitelist 27 Mitgliedstaaten).
- Reason: V5.7 FEAT-571 braucht NL-konforme Steuerlogik fuer den Angebot-Pfad. DEC-122..125 haben die Strategie festgelegt. Bestehende V5.5/V5.6-Test-Angebote bleiben unveraendert lesbar (Whitelist akzeptiert 19% als Legacy-Wert). Neue Angebote bekommen 21% NL-Standard als Default. Reverse-Charge-Pfad fuer EU-B2B-Cross-Border via BOOLEAN-Flag + DB-CHECK-Konsistenz tax_rate=0 wenn Flag gesetzt. KEIN VIES-Lookup, KEINE Daten-Migration der 19%-Rows.
- Affected Areas:
  - `cockpit/src/lib/pdf/proposal-renderer.ts` Adapter-Erweiterung um Reverse-Charge-Block (DEC-125)
  - `cockpit/src/app/(app)/proposals/[id]/edit/proposal-editor.tsx` Editor-Erweiterung um Steuersatz-Dropdown + Reverse-Charge-Toggle (DEC-122/123)
  - `cockpit/src/app/(app)/settings/branding/branding-form.tsx` BTW-Eingabefeld (DEC-124)
  - `cockpit/src/app/(app)/companies/[id]/...` Stammdaten-Edit-Form ergaenzt vat_id-Feld nach `address_country`
  - Neue Datei `cockpit/src/lib/validation/vat-id.ts` mit `validateNlVatId(input)` und `validateEuVatId(input)` + EU-Country-Code-Whitelist
  - Neue Datei `cockpit/src/lib/pdf/reverse-charge-block.ts` mit Phrase-Constant + pdfmake-Block-Builder (alternativ inline in `proposal-renderer.ts`)
  - KEINE Aenderung an `proposal_items`, `proposal_payment_milestones`, `payment_terms_templates`, `email_attachments`, `audit_log`, `proposal-pdfs`-Bucket
- Risk: Niedrig — rein additive Aenderungen. Default-Wechsel `tax_rate 19→21` betrifft nur neue INSERTs ohne explizite tax_rate-Angabe (Server-Action setzt aber explizit; Daten-Default-Wechsel ist Defense-in-Depth). CHECK-Whitelist akzeptiert den Legacy-19%-Wert — keine Daten-Migration. CHECK-Konsistenz `reverse_charge implies tax_rate=0` schuetzt vor App-Bug. branding_settings ist Single-Row (DEC-088), neue Spalte vat_id nullable. companies.vat_id nullable, Backfill nicht noetig (User pflegt selbst pro Empfaenger). KEIN Lock-Wait erwartet (alle ALTER-Statements sind kleine Metadata-Changes ohne Daten-Touch).
- Rollback Notes:
  - `ALTER TABLE companies DROP COLUMN IF EXISTS vat_id;`
  - `ALTER TABLE branding_settings DROP COLUMN IF EXISTS vat_id;`
  - `ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_reverse_charge_implies_zero_tax, DROP CONSTRAINT IF EXISTS proposals_tax_rate_whitelist;`
  - `ALTER TABLE proposals DROP COLUMN IF EXISTS reverse_charge;`
  - `ALTER TABLE proposals ALTER COLUMN tax_rate SET DEFAULT 19.00;`
  - V5.6-Code funktioniert nach Rollback unveraendert weiter — bestehende Angebote sind regression-frei (PDF-Render ohne Reverse-Charge-Block, Editor ohne Steuersatz-Dropdown, branding_settings + companies ohne vat_id-Feld). Bestehende V5.7-Angebote mit `reverse_charge=true` koennen nach Rollback nicht mehr korrekt gerendert werden — manueller Fix oder Re-Migration noetig.

### MIG-027 — V5.6 Zahlungsbedingungen + Pre-Call Briefing Schema
- Date: 2026-05-01 (applied auf Hetzner Business System DB im Rahmen SLC-561 `/backend`. Hinweis: Spec hatte `meetings.start_time` referenziert — echte Spalte ist `scheduled_at`, im Migration-File korrigiert.)
- Scope: 5 Aenderungen in einer Migration `027_v56_payment_terms_and_briefing.sql`:
  1. Neue Tabelle `payment_terms_templates` (DEC-115/DEC-121, Sub-Theme A):
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `label TEXT NOT NULL` — z.B. "30 Tage netto", "Vorkasse"
     - `body TEXT NOT NULL` — der vorgefuellte Freitext fuer `proposals.payment_terms`
     - `is_default BOOLEAN NOT NULL DEFAULT false` — UNIQUE partial index sichert max 1 Default
     - `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()`
     - 1 Index: `CREATE UNIQUE INDEX idx_payment_terms_templates_default ON payment_terms_templates(is_default) WHERE is_default = true;`
     - RLS `authenticated_full_access` (Single-User-Modus, V7-Multi-User-Erweiterung folgt)
     - Seed: `INSERT INTO payment_terms_templates (label, body, is_default) VALUES ('30 Tage netto', 'Zahlbar innerhalb von 30 Tagen netto.', true) ON CONFLICT DO NOTHING;` — Branding-Default-Migration
  2. Neue Tabelle `proposal_payment_milestones` (DEC-115, Sub-Theme B):
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE`
     - `sequence INT NOT NULL` — fuer Reihenfolge-Sortierung im PDF
     - `percent NUMERIC(5,2) NOT NULL CHECK (percent > 0 AND percent <= 100)` — einzelner Milestone-Anteil
     - `amount NUMERIC(12,2)` — berechneter Betrag (= proposals.total_gross * percent/100), Snapshot beim Save
     - `due_trigger TEXT NOT NULL CHECK (due_trigger IN ('on_signature', 'on_completion', 'days_after_signature', 'on_milestone'))`
     - `due_offset_days INT` — nur fuer `due_trigger='days_after_signature'`, sonst NULL
     - `label TEXT` — User-Freitext fuer Milestone-Beschreibung (z.B. "Anzahlung", "Nach Kickoff")
     - `created_at TIMESTAMPTZ DEFAULT now()`
     - 1 Index: `idx_proposal_payment_milestones_proposal` auf `proposal_id`
     - 1 UNIQUE: `(proposal_id, sequence)` — verhindert Sequence-Duplikate
     - RLS `authenticated_full_access` analog `proposal_items`
     - **Sum-Validation strict 100%**: NICHT als DB-CHECK-Constraint (kann nicht ueber Aggregat definiert werden ohne Trigger), sondern App-Level in `saveProposalPaymentMilestones` Server Action (DEC-115)
  3. Erweiterung `proposals` um 2 nullable Spalten (DEC-116, Sub-Theme C):
     - `skonto_percent NUMERIC(4,2) NULL CHECK (skonto_percent IS NULL OR (skonto_percent > 0 AND skonto_percent < 10))` — typisch 1-3%
     - `skonto_days INTEGER NULL CHECK (skonto_days IS NULL OR (skonto_days > 0 AND skonto_days <= 90))`
     - 1 zusaetzlicher CHECK auf Beide-oder-keiner: `(skonto_percent IS NULL AND skonto_days IS NULL) OR (skonto_percent IS NOT NULL AND skonto_days IS NOT NULL)` — verhindert halben State
  4. Erweiterung `meetings` um 1 nullable Spalte (DEC-118):
     - `briefing_generated_at TIMESTAMPTZ NULL` — Idempotenz-Marker fuer Briefing-Cron
     - 1 Partial-Index: `CREATE INDEX idx_meetings_briefing_pending ON meetings(start_time) WHERE briefing_generated_at IS NULL AND deal_id IS NOT NULL;` — Cron-Query-Performance
  5. Erweiterung `user_settings` um 3 Spalten (DEC-117):
     - `briefing_trigger_minutes INT NOT NULL DEFAULT 30 CHECK (briefing_trigger_minutes IN (15, 30, 45, 60))`
     - `briefing_push_enabled BOOLEAN NOT NULL DEFAULT true`
     - `briefing_email_enabled BOOLEAN NOT NULL DEFAULT true`
     - Backfill fuer existierende Rows: `UPDATE user_settings SET briefing_trigger_minutes=30, briefing_push_enabled=true, briefing_email_enabled=true WHERE briefing_trigger_minutes IS NULL;` (idempotent dank DEFAULT — bestehende Rows haben bereits Default-Werte nach Schema-Apply, das Backfill ist Defense-in-Depth)
- Reason: V5.6 FEAT-561 (Vorauswahl + Split-Plan + Skonto) und FEAT-562 (Pre-Call Briefing Cron) brauchen das gemeinsame Schema in einer Migration. DEC-115..121 haben die Strategie festgelegt. Bestehende V5.5-Proposal-Daten bleiben unveraendert lesbar (alle neuen Spalten nullable). Bestehende `meetings`-Rows bekommen `briefing_generated_at=NULL` als Default — Cron-Query findet sie nicht (Partial-Index filtert NULL). Bestehende `user_settings`-Rows bekommen Default-Werte fuer Briefing-Felder. KEIN Auto-Migration von V5.5-`proposals.payment_terms` Freitext-Werten in das neue Template-System (Constraint laut PRD V5.6 Constraints).
- Affected Areas:
  - Neue Settings-Page `/settings/payment-terms` (SLC-561) mit Server Actions `listPaymentTermsTemplates`, `createPaymentTermsTemplate`, `updatePaymentTermsTemplate`, `deletePaymentTermsTemplate`, `setDefaultPaymentTermsTemplate`
  - Neue Settings-Page `/settings/briefing` (SLC-564) mit Server Actions `getBriefingSettings`, `updateBriefingSettings`
  - `cockpit/src/app/(app)/proposals/[id]/edit/*` — Editor-Erweiterung um Bedingungs-Dropdown + Skonto-Toggle (SLC-562) und Split-Plan-Section (SLC-563)
  - `cockpit/src/lib/pdf/proposal-renderer.ts` Adapter-Erweiterung (DEC-120, SLC-563)
  - Neuer Cron-Endpoint `cockpit/src/app/api/cron/meeting-briefing/route.ts` (SLC-564, DEC-118 Pattern aus `expire-proposals/route.ts`)
  - Neue Server Action `saveProposalPaymentMilestones(proposalId, milestones[])` mit Sum-Validation strict 100% (DEC-115, SLC-563)
  - Wiederverwendung `cockpit/src/lib/ai/prompts/deal-briefing.ts` (existierende `buildDealBriefingPrompt` + `validateDealBriefing` aus FEAT-301) — keine LLM-Adapter-Aenderung
  - KEINE Aenderung an `activities` (V3 `source_type`/`source_id`-Pattern reicht), `proposals.payment_terms` (Freitext bleibt), `email_attachments`, `proposal_items`, `audit_log`, `proposal-pdfs`-Bucket, `branding_settings`
- Risk: Niedrig — rein additive Aenderungen. Alle neuen Spalten auf bestehenden Tabellen sind nullable mit Defaults oder NOT NULL DEFAULT (DB-Apply ohne Lock-Wait, Postgres-Standard fuer simple DEFAULT-Werte). `payment_terms_templates`-Seed ist idempotent (`ON CONFLICT DO NOTHING`). UNIQUE-Index auf `is_default` true sichert Daten-Integritaet (max 1 Default-Template). CHECK-Constraints auf `skonto_percent`/`skonto_days` sind konservativ und blockieren ungueltige Inputs am DB-Level. Cron-Partial-Index `idx_meetings_briefing_pending` filtert auf `deal_id IS NOT NULL` — Meetings ohne Deal werden ignoriert (PRD-Constraint). Backwards-Compatibility: bestehende `proposals` ohne Skonto/Milestones rendern bit-identisch zu V5.5-PDF-Output (DEC-120). bestehende `meetings` ohne `briefing_generated_at` werden vom Cron NICHT retroaktiv verarbeitet (Partial-Index + Time-Window-Filter beruecksichtigen nur Meetings im naechsten Trigger-Fenster).
- Rollback Notes:
  - `DROP TABLE proposal_payment_milestones CASCADE;`
  - `DROP TABLE payment_terms_templates CASCADE;`
  - `ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_skonto_check, DROP COLUMN IF EXISTS skonto_percent, DROP COLUMN IF EXISTS skonto_days;`
  - `ALTER TABLE meetings DROP COLUMN IF EXISTS briefing_generated_at;` (Partial-Index droppt automatisch)
  - `ALTER TABLE user_settings DROP COLUMN IF EXISTS briefing_trigger_minutes, DROP COLUMN IF EXISTS briefing_push_enabled, DROP COLUMN IF EXISTS briefing_email_enabled;`
  - V5.5-Proposals bleiben nach Rollback unveraendert nutzbar — bestehende `/proposals`-Pipeline + PDF-Render funktioniert wieder im V5.5-Zustand. Briefing-Activities (Type `briefing`) bleiben in `activities`-Tabelle bestehen — User kann diese behalten oder mit `DELETE FROM activities WHERE type='briefing'` manuell entfernen (nicht zwingend, da Type-String unbeachtet von alten UIs).
