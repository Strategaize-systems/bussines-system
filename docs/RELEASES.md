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

### REL-009 — V4 KI-Gatekeeper + Externe Integrationen
- Date: 2026-04-14
- Scope: 9 Slices (SLC-401..409), 6 Features (FEAT-403/405/406/407/408/410), 7 V4-Backlog-Items. MIG-010 Schema-Migration (5 neue Tabellen: email_messages, email_threads, email_sync_state, ai_action_queue, ai_feedback; calendar_events erweitert um source/external_id/sync_status/booking_link). IMAP-Sync (IONOS direkt), E-Mail-Inbox UI, Gatekeeper-Klassifikation (Bedrock), KI-Wiedervorlagen mit Freigabe, Auto-Reply-Detection, Cal.com Self-Hosted + Webhook-Sync, Gesamtkalender UI, Management-Cockpit LLM-Ausbau (5 Preset-Analysen + Freitext). Zusaetzlich: Mein Tag/Focus UI-Reorganisation (KI-Wiedervorlagen als Tab, Action-Karten unter Focus), KI-Analyse Branding entfernt, 3 Revalidation-Fixes in Cron/Webhook-Routen.
- Summary: Deployment in zwei Phasen. Phase 1 (2026-04-12): SLC-401..403 live mit IMAP + Inbox + Cron-Jobs (classify, followups, imap-sync, retention). Phase 2 (2026-04-14 abends): SLC-404..409 via Coolify Redeploy. Gesamt-QA PASS (52/53 AC, RPT-108). Final-Check Conditionally ready (RPT-109). Go-Live GO mit Smoke-Tests PASS (Login, IMAP-Inbox, Mein Tag, Kalender, KI-Analyse, Focus). MEETING-WORKFLOW.md als Praxis-Anleitung erstellt.
- Risks: CALCOM_API_KEY bewusst leer (Cal.com AGPLv3 bietet keine API-Keys). calcom-sync Cron ist deshalb No-Op (501). Webhook-Signatur-Header bei erster realer Buchung noch zu verifizieren. In-Memory LLM-Cache (1h TTL) verliert bei Container-Restart. 179 Lint-Findings (any/unused) als Tech-Debt fuer V5. Next.js 16 Middleware-Deprecation (funktional OK).
- Rollback Notes: Docker Image Rollback via Coolify. V3.3 Image als Fallback. MIG-010 Rollback: DROP ai_feedback, ai_action_queue, email_sync_state, email_messages, email_threads; ALTER calendar_events DROP source, external_id, sync_status, booking_link.
