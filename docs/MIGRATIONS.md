# Migrations

### MIG-001 — Initial Schema V1
- Date: 2026-03-27
- Scope: 9 Tabellen (profiles, companies, contacts, pipelines, pipeline_stages, deals, activities, documents, content_calendar) + RLS Policies + Seed-Daten (2 Pipelines mit Default-Stages)
- Reason: Initiales Schema für V1 CRM-Kern, Pipeline-Management, Aktivitäten-Log, Dokumente und Redaktionskalender.
- Affected Areas: Gesamte Datenbasis. Alle CRUD-Operationen im Cockpit.
- Risk: Erste Migration, kein bestehendes Schema. Risiko gering.
- Rollback Notes: DROP TABLE in umgekehrter Reihenfolge (content_calendar, documents, activities, deals, pipeline_stages, pipelines, contacts, companies, profiles).
