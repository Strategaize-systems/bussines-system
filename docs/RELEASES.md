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
