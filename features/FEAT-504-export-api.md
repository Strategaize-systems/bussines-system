# FEAT-504 — Intelligence-Platform-Export-API

## Summary
Strukturierte JSON-Endpoints fuer System 4 (Intelligence Studio) zum Abruf von Vertriebsdaten.

## Problem
Erkenntnisse aus dem BD-Prozess bleiben im Business System gefangen. System 4 hat keinen strukturierten Zugang zu Deal-, Kontakt-, Signal- und Insight-Daten.

## Solution
5 read-only JSON-Endpoints mit API-Key-Authentifizierung, Pagination und Zeitraum-Filtern.

## Endpoints
- `GET /api/export/deals` — Deals mit Metadaten
- `GET /api/export/contacts` — Kontakte mit Qualitaetsfeldern
- `GET /api/export/activities` — Aktivitaeten
- `GET /api/export/signals` — Extrahierte Signale
- `GET /api/export/insights` — Genehmigte KI-Insights

## Acceptance Criteria
- AC1: 5 Export-Endpoints liefern valides JSON
- AC2: API-Key-Authentifizierung funktioniert
- AC3: Ohne API-Key → 401
- AC4: Pagination fuer grosse Datenmengen
- AC5: Filter nach Zeitraum (since/until)

## Out of Scope
- Echtzeit-Sync / Push-Notifications
- Schreibender Zugriff
- OAuth2 (spaeter nachruestbar)
