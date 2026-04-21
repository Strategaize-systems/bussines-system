# Releases

### REL-001 — V1 Legacy (Marketing+CRM)
- Date: 2026-03-31
- Scope: CRM-Basis (Kontakte, Firmen, Pipeline), Marketing-Skills. Ersetzt durch V2.
- Summary: Erste Deployment auf Hetzner. Login + Dashboard funktional. Pipeline mit Seed-Daten.
- Risks: Pipeline hatte noch Fehler mit Seed-Daten. Temporäre Signup-Route.
- Rollback Notes: Docker Image Rollback via Coolify.

### REL-002 — V2 Revenue & Relationship System
- Date: 2026-04-03
- Scope: 13 Slices, 15 V2-Features, 11 Module. Komplette Neuausrichtung als Revenue & Relationship System.
- Summary: Vollständiges BD-System mit Kontakten (erw.), Firmen (erw.), Multiplikatoren, 2 Pipelines (Kanban), strukturierte Gespräche, Aufgaben, E-Mail (SMTP), Angebote, Fit-Gates, Signale, Referrals, Handoffs, Dashboard (8 KPIs). UI-Polish nach Blueprint-Standard. Dark Sidebar mit Logo, Premium-Tabellen, Pipedrive-style Kanban.
- Risks: MIG-002 pending (overall_score INT→NUMERIC, kosmetisch). SMTP nicht konfiguriert (Drafts-Fallback). SSH-Zugang zum Server eingeschränkt.
- Rollback Notes: Docker Image Rollback via Coolify. V1 Image als Fallback verfügbar.

### REL-003 — V2.1 Pipeline-Hardening + Daily Ops
- Date: 2026-04-07
- Scope: 8 Slices (SLC-201–208), 14 Backlog-Items. Pipeline-Hardening, "Mein Tag" Tagesplanung, Voice-Input, Insight-Export, Lead-Pipeline.
- Summary: Deal-Status-Workflow mit Auto-Status bei Stage-Drag. Deal-Detail-Popup (4 Tabs). Deal-Rotting (>7d gelb, >14d rot). Required Fields bei Stage-Wechsel. Pipeline-Filter (Status/Typ) + gewichteter Forecast. "Mein Tag" mit Erledigt-Buttons, Deal-Popup, Kalender-Platzhalter. Voice-Input via OpenAI Whisper API. Insight-Export an System 4. Lead-Management-Pipeline (7 Stages) mit Pipeline-Verschiebung. E-Mails in Aktivitäten-Timeline. Referral-Source auf Deals. Dashboard Overdue-Banner + Forecast-KPI.
- Risks: Insight JSON-Export ephemeral (Container-Restart = Datenverlust). UI-Polish noch ausstehend. Keine automatisierten Tests.
- Rollback Notes: Docker Image Rollback via Coolify. DB-Rollback: MIG-003 (DROP closed_at, ADD lost_reason), MIG-004 (DELETE Lead-Pipeline + Stages). V2 Image als Fallback.

### REL-004 — V2.2 UI-Redesign + KI-Cockpit UI-Shells
- Date: 2026-04-09
- Scope: Kompletter UI-Umbau nach Style Guide V2. Dashboard KI-Analyse-Cockpit (UI-Shell). Mein Tag KI-Assistent (UI-Shell). Search-Bar volle Breite. KI/Voice-Placeholder-Buttons.
- Summary: Letztes rein UI-zentriertes Release. Offene Items (BL-212 Pipeline Style Guide, BL-213 Standort-Filter, BL-214 fehlende Seiten, BL-215 Konsolidierung) in V3-Backlog uebernommen — werden durch V3 Workspace-Konzept und Navigation-Umbau abgedeckt. Strategische Neuausrichtung beginnt mit V3.
- Risks: Keine neuen technischen Risiken. KI-Shells sind Platzhalter ohne Backend.
- Rollback Notes: Docker Image Rollback via Coolify. V2.1 Image als Fallback.

### REL-005 — V3 Operative Kontextlogik
- Date: 2026-04-10
- Scope: 10 Slices (SLC-301..310), 9 Features (FEAT-301..309). Deal-Workspace, Mein Tag V2, Firmen-/Kontakt-Workspace, Bedrock LLM-Integration, Navigation-Umbau (5-Schichten), Governance-Basis (Rollen, RLS, Audit), Meeting/Kalender-Management.
- Summary: Strategische Neuausrichtung abgeschlossen. Workspace-zentriertes Arbeiten mit KI-Unterstuetzung (Bedrock Claude Sonnet). MIG-005 Schema-Migration (Meetings, Calendar Events, Audit-Log, Navigation). Gesamt-QA PASS (RPT-046). Mehrere Hotfixes nach Live-Test.
- Risks: Bedrock-Kosten bei Auto-Load (behoben in V3.1 durch on-click Pattern). SMTP nicht konfiguriert. Keine automatisierten Tests.
- Rollback Notes: Docker Image Rollback via Coolify. V2.2 Image als Fallback. MIG-005 Rollback: DROP meetings, calendar_events, audit_log Tabellen.

### REL-006 — V3.1 UX-Schliff + KI-Kontext
- Date: 2026-04-11
- Scope: 9 Slices (SLC-311..319). Meeting/Kalender UX, Schnellaktionen-Rebuild, KI on-click Pattern, Pipeline KI-Suche + Voice, KI-E-Mail-Composing, Kontext-Intelligenz, Auto-Wiedervorlagen, Tageseinschaetzung erweitert, Templates + Duplikate + Attribution, Activity-Queue.
- Summary: UX-Schliff und KI-Kontext-Integration. Alle Formulare KI-vorbefuellt aus Kontext. Voice-Input in allen Textfeldern. KI-Kostenkontrolle durch on-click statt auto-load. Automatische Wiedervorlagen nach Aktionen.
- Risks: Keine neuen Schema-Migrationen. Bedrock-Kosten kontrolliert durch on-click Pattern.
- Rollback Notes: Docker Image Rollback via Coolify. V3 Image als Fallback.

### REL-007 — V3.2 UI-Polish + Pipeline-Management + PLZ-Karte
- Date: 2026-04-11
- Scope: 6 von 6 Slices (SLC-321..326). Quick Actions Modal-Umbau, Pipeline UI-Overhaul + Selector, Logout-Button, Pipeline-Verwaltung in Settings, Autocomplete/Typeahead Suche, PLZ-Kartensuche mit Heatmap (DE+NL).
- Summary: UI-Quality-Release + Geo-Feature. Pipeline komplett ueberarbeitet. Settings erweitert um Pipeline-CRUD. Wiederverwendbare SearchAutocomplete. Interaktive Leaflet-Karte auf Firmen/Kontakte/Multiplikatoren mit PLZ+Stadtsuche, Umkreis-Filter, Heatmap. 12.384 PLZ (8.298 DE + 4.086 NL). Next.js 16.2.3 Security Patch. Gesamt-QA PASS, Final-Check PASS.
- Risks: Keine Schema-Migrationen. Neue Dependencies: leaflet, react-leaflet, leaflet.heat.
- Rollback Notes: Docker Image Rollback via Coolify. V3.1 Image als Fallback.

### REL-008 — V3.3 UI-Abrundung + Visualisierung
- Date: 2026-04-11
- Scope: 6 von 6 Slices (SLC-331..336). KI-Suchfeld + Voice im KI-Workspace, PLZ/Stadt-Autocomplete, Pipeline Liste-Ansicht Toggle, Unified Timeline, Funnel-Report, Win/Loss-Analyse Dashboard.
- Summary: Reine Frontend-Erweiterungen ohne Schema-Aenderungen. KI-Suchfeld mit Voice-Input direkt im KI-Workspace Header (Bedrock mein-tag-query). PLZ-Autocomplete bei Firma anlegen/bearbeiten. Pipeline hat jetzt 4 View-Modes (Kanban, Liste, Funnel, Win/Loss). Unified Timeline ersetzt Activity-Timeline auf Kontakt- und Firmen-Workspace (5 Datenquellen). Funnel-Report zeigt Conversion-Rates pro Stage. Win/Loss-Analyse mit Verlustgruende-Ranking und 6-Monats-Trend. Gesamt-QA PASS (RPT-071), Final-Check PASS (RPT-072). User Live-Test bestanden.
- Risks: Keine Schema-Migrationen. Keine neuen Dependencies. Responsive nicht explizit getestet (Desktop-only internal-tool).
- Rollback Notes: Docker Image Rollback via Coolify. V3.2 Image als Fallback.

### PRE-V4.1-INFRA — V4.1 Pre-Flight Infrastruktur (Jitsi-Vorbereitung)
- Date: 2026-04-16
- Scope: Infrastruktur-Vorarbeit fuer SLC-412 Jitsi+Jibri Deployment. Hetzner-Cloud-Firewall-Regel fuer Port 10000/udp eingehend geoeffnet (via Hetzner Cloud Console). Coolify-Subdomain `meet.strategaizetransition.com` provisioniert (DNS-A-Record auf 91.98.20.191, Traefik-Ready). VAPID-Keys fuer Browser-Push erzeugt (SLC-418-Vorbereitung). Supabase-Storage-Bucket `meeting-recordings` angelegt (SLC-415-Vorbereitung). Kein Code-Deploy, keine Schema-Migration — reine Preparation.
- Summary: Pre-Flight-Gate fuer V4.1 Meeting-Slices. Server-RAM idle 4.4 GB frei (Zielarchitektur: 1 paralleles Meeting+Recording ~6.5 GB, passt in 8 GB CPX32 mit Upgrade-Pfad CPX42 dokumentiert DEC-040). Alle Infrastruktur-Blocker fuer SLC-412 beseitigt.
- Risks: Hetzner-Cloud-Firewall-UI-Regel erfordert manuelle Re-Verifizierung vor SLC-412-Smoke-Test (nicht via SSH pruefbar, nur Hetzner Cloud Console). Bei NAT-strikten Kunden-Netzwerken kann UDP/10000 blockiert sein — dokumentiert als Risk in ARCHITECTURE V4.1 (TURN-Server deferred auf BL-206-Nachbar).
- Rollback Notes: Keine Artefakte produziert. Rollback = Firewall-Regel entfernen, Coolify-Subdomain abkoppeln, Supabase-Bucket loeschen. Kein Effekt auf V4 Produktion.

### REL-014 — V6.1 Performance Premium UI
- Date: 2026-04-21
- Scope: 3 Slices (SLC-611..613), 1 Feature (FEAT-611), 3 DECs (DEC-061..063). Premium-Styling auf allen Performance-Karten (Gradient-Akzentlinien, Brand-Icons, Shadow-Upgrade), ForecastCard als 4. Kachel im Grid, Label-Korrektur "Abschlussquote" statt "Win-Rate", Wochen-Check mit Mo-Fr Tagesaufloesung und Heute/Woche Toggle.
- Summary: Reine Frontend-UI-Erweiterung. Gesamt-QA PASS (RPT-176, 3/3 Slices, 1/1 Feature). Final-Check READY (RPT-177, 0 Blocker, 0 High, 7/7 Dimensionen). User-Browser-Smoke-Test PASS (4 Kacheln, Gradient-Linien, Toggle, Wochen-Raster). Keine Schema-Migrationen, keine neuen APIs, keine neuen Dependencies, keine neuen Cron-Jobs.
- Risks: Keine V6.1-spezifischen Risiken. Responsive nicht explizit getestet (Desktop-only internal-tool).
- Rollback Notes: Rein additiv. Docker Image Rollback via Coolify auf V6 Image. Keine Schema-Aenderungen.

### REL-013 — V6 Zielsetzung + Performance-Tracking
- Date: 2026-04-20
- Scope: 10 Slices (SLC-601..610), 4 Features (FEAT-601..604), 2 DECs (DEC-055..056), MIG-017 + MIG-018. Produkt-Stammdaten (CRUD + Deal-Zuordnung), Ziel-Objekt-Modell (Umsatz/Deal-Count/Abschlussquote, Jahres-→Monats-/Quartals-Ableitung, CSV-Import), Performance-Cockpit (/performance mit Goal-Cards, Prognose-Engine, KI-Empfehlung via Bedrock, Tages-Check mit Activity-KPIs, Wochen-Vergleich, Trend-Vergleich, Produkt-Breakdown), KPI-Snapshots (taeglicher Cron, 8+ KPI-Typen, Trend-Engine).
- Summary: Deployment als Coolify Redeploy. Gesamt-QA PASS (RPT-171, 10/10 Slices, 4/4 Features, 11 Backlog-Items). Final-Check READY (RPT-172, 0 Blocker, 0 High). User-Browser-Smoke-Test PASS. 2 neue DB-Tabellen-Gruppen (MIG-017: products, deal_products, goals, kpi_snapshots; MIG-018: activity_kpi_targets). 1 neuer Cron-Job (kpi-snapshot, taeglich 02:00). Rein additiv, kein Einfluss auf bestehende Features. todayRange()-Bug in QA gefunden und gefixt (IMP-096).
- Risks: KPI-Snapshot-Cron muss in Coolify konfiguriert werden. userId nicht in KPI-Queries (Single-User OK). Win-Rate-Ableitung semantisch vereinfacht (V1-akzeptabel). Keine automatisierten Tests.
- Rollback Notes: Rein additiv. Docker Image Rollback via Coolify auf V4.3 Image. Schema-Rollback: DROP TABLE activity_kpi_targets, kpi_snapshots, goals, deal_products, products CASCADE; Cron kpi-snapshot in Coolify deaktivieren.

### REL-012 — V4.3 Insight Governance
- Date: 2026-04-19
- Scope: 6 Slices (SLC-431..436), 2 Features (FEAT-402, FEAT-412), 6 DECs (DEC-049..054), MIG-016. Insight-Review-Queue fuer schreibende KI-Aenderungen (Queue-Erweiterung, Signal-Extraktion-Modul, Cron-Hooks, Applier + Approve-Flow, Unified Queue UI, KI-Badge + Manual Trigger). Automatische Signal-Extraktion aus Meeting-Summaries und E-Mails. Manueller Trigger im Deal-Workspace. PropertyChangeCards mit Confidence-Badge, Batch-Approve. KI-Badge auf geaenderten Deal-Properties (30-Tage-Fenster).
- Summary: Deployment als Coolify Redeploy. Gesamt-QA PASS (RPT-154, 41/42 ACs, 5 Medium, 0 Blocker). Final-Check READY (RPT-155, 7/7 Dimensionen PASS). Browser-Smoke-Test bestanden (Mein Tag, Deal-Workspace, Signale-Button). 1 neuer Cron-Job (signal-extract */5). Schema rein additiv (nullable Spalten).
- Risks: Tag/Priority-Apply nicht moeglich (Spalten fehlen, V5). Activity-Limit 20 fuer Badge (1-User-Nutzung unrealistisch). Pipeline-Stages nicht im LLM-Prompt (Human-Review). Bedrock-Kosten: max 6 Calls/5min (weit unter Limits).
- Rollback Notes: Rein additiv. Docker Image Rollback via Coolify auf V4.2 Image. Schema-Rollback: ALTER ai_action_queue DROP COLUMN target_entity_type, target_entity_id, proposed_changes, confidence; ALTER meetings DROP COLUMN signal_status; ALTER email_messages DROP COLUMN signal_status; Cron signal-extract in Coolify deaktivieren.

### REL-011 — V4.2 Wissensbasis Cross-Source
- Date: 2026-04-18
- Scope: 6 Slices (SLC-421..426), 1 Feature (FEAT-401), 8 V4.2-Backlog-Items (BL-350..357). MIG-014 pgvector Extension + knowledge_chunks Tabelle (vector(1024), HNSW-Index). MIG-015 search_knowledge_chunks RPC-Funktion. RAG-Pipeline (pgvector + Bedrock Titan Embeddings V2 eu-central-1). 4 Datenquellen: Meeting-Transkripte, E-Mails, Deal-Activities, Dokumente. Chunking-Service (quelltypspezifisch, Sentence-Boundary), Embedding-Adapter-Pattern (DEC-047), Backfill + Embedding-Sync-Cron, RAG Query API mit Scope-Filter + Confidence-Level, Deal Knowledge Query UI (Wissen-Tab mit Text + Voice), Auto-Embedding Trigger (fire-and-forget bei neuen Daten).
- Summary: Deployment als Coolify Redeploy. Gesamt-QA PASS (RPT-141, 0 Blocker, 0 High). Final-Check PASS (RPT-142, 1 Fix applied: serverExternalPackages fuer pdf-parse). Go-Live GO (RPT-143). 1 neuer Cron-Job (embedding-sync */5). Backfill: 7 Chunks (5 Activities + 2 Emails) aus Bestandsdaten. Browser-Smoke-Test PASS inkl. Voice-Input (Whisper Transkription → RAG Query → Antwort mit Quellen).
- Risks: Deutsche Embedding-Qualitaet Titan V2 erst mit mehr Live-Daten validierbar (Fallback: Cohere per DEC-048). Single-Tenant RLS Pattern (USING true). In-Memory Rate Limiter. Kernel-Upgrade snd-aloop (ISSUE-037, nicht V4.2-spezifisch).
- Rollback Notes: Rein additiv. Docker Image Rollback via Coolify auf V4.1 Image (Wissen-Tab verschwindet, alle anderen Features bleiben). Schema-Rollback: DROP FUNCTION search_knowledge_chunks; DROP TABLE knowledge_chunks; DROP EXTENSION vector;

### REL-010 — V4.1 Meeting Intelligence Basis
- Date: 2026-04-18
- Scope: 9 Slices (SLC-411..419), 3 Features (FEAT-404/409/411), 10 V4.1-Backlog-Items. MIG-011 Schema-Migration (contacts +7 Felder Consent/Opt-out, meetings +11 Felder Recording/Transcript/Summary/Agenda, activities +1 ai_generated, user_settings Tabelle neu, audit_log.actor_id nullable). Jitsi + Jibri Self-Hosted auf CPX32 (shared Infrastruktur), Whisper-Adapter-Pattern (OpenAI mit Azure/Self-hosted tauschbar), Call Intelligence Pipeline (Recording-Upload → Transkription → Summary), DSGVO-Einwilligungsflow (Public-Consent-Pages, IP-Hash, Audit), Meeting-Erinnerungen (extern .ics + intern SMTP/Push), Browser-Push + Service Worker, KI-Agenda (on-click + auto via Bedrock).
- Summary: Deployment als einzelner Coolify Redeploy. Gesamt-QA PASS (RPT-128, 5 Medium, 0 Blocker). Final-Check READY (RPT-129, 0 High). npm audit fix inline (0 vulnerabilities). 4 neue Cron-Jobs (meeting-recording-poll, meeting-transcript, meeting-summary, meeting-reminders) + 2 bestehende erweitert (pending-consent-renewal, recording-retention). 7 Blocker waehrend SLC-412 Jitsi-Deployment geloest (dokumentiert in jitsi-jibri-deployment Rule). Live-Tests: Jitsi Meeting, Jibri Recording, Whisper Transkription, Bedrock Summary + Agenda — alle PASS.
- Risks: OpenAI Whisper geht ueber US-API (akzeptiert fuer Internal-Tool, Azure-Migration in V4.2 geplant, DEC-035). Transcript/Summary permanent gespeichert (DEC-043, V4.2 Retention-Policy bei Kundendaten). VAPID_SUBJECT zeigt auf falsches Mailto (ISSUE-038, Coolify-ENV-Fix). Kernel-Upgrade-Risiko fuer snd-aloop (ISSUE-037). Public-Revoke-Link nach Grant funktionslos (ISSUE-033, V4.2).
- Rollback Notes: Forward-only empfohlen. Jitsi-Stack kann unabhaengig deaktiviert werden (Services in docker-compose auskommentieren). Schema-Rollback: ALTER audit_log ALTER actor_id SET NOT NULL; DROP TABLE user_settings; ALTER contacts/meetings/activities DROP V4.1-Spalten. V4 Image als Fallback via Coolify.

### REL-009 — V4 KI-Gatekeeper + Externe Integrationen
- Date: 2026-04-14
- Scope: 9 Slices (SLC-401..409), 6 Features (FEAT-403/405/406/407/408/410), 7 V4-Backlog-Items. MIG-010 Schema-Migration (5 neue Tabellen: email_messages, email_threads, email_sync_state, ai_action_queue, ai_feedback; calendar_events erweitert um source/external_id/sync_status/booking_link). IMAP-Sync (IONOS direkt), E-Mail-Inbox UI, Gatekeeper-Klassifikation (Bedrock), KI-Wiedervorlagen mit Freigabe, Auto-Reply-Detection, Cal.com Self-Hosted + Webhook-Sync, Gesamtkalender UI, Management-Cockpit LLM-Ausbau (5 Preset-Analysen + Freitext). Zusaetzlich: Mein Tag/Focus UI-Reorganisation (KI-Wiedervorlagen als Tab, Action-Karten unter Focus), KI-Analyse Branding entfernt, 3 Revalidation-Fixes in Cron/Webhook-Routen.
- Summary: Deployment in zwei Phasen. Phase 1 (2026-04-12): SLC-401..403 live mit IMAP + Inbox + Cron-Jobs (classify, followups, imap-sync, retention). Phase 2 (2026-04-14 abends): SLC-404..409 via Coolify Redeploy. Gesamt-QA PASS (52/53 AC, RPT-108). Final-Check Conditionally ready (RPT-109). Go-Live GO mit Smoke-Tests PASS (Login, IMAP-Inbox, Mein Tag, Kalender, KI-Analyse, Focus). MEETING-WORKFLOW.md als Praxis-Anleitung erstellt.
- Risks: CALCOM_API_KEY bewusst leer (Cal.com AGPLv3 bietet keine API-Keys). calcom-sync Cron ist deshalb No-Op (501). Webhook-Signatur-Header bei erster realer Buchung noch zu verifizieren. In-Memory LLM-Cache (1h TTL) verliert bei Container-Restart. 179 Lint-Findings (any/unused) als Tech-Debt fuer V5. Next.js 16 Middleware-Deprecation (funktional OK).
- Rollback Notes: Docker Image Rollback via Coolify. V3.3 Image als Fallback. MIG-010 Rollback: DROP ai_feedback, ai_action_queue, email_sync_state, email_messages, email_threads; ALTER calendar_events DROP source, external_id, sync_status, booking_link.
