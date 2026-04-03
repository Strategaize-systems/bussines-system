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
