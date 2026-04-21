# SLC-506 — Export-API

## Slice Info
- Feature: FEAT-504
- Priority: Medium
- Status: planned

## Goal
5 read-only JSON-Endpoints fuer System 4 (Intelligence Studio) mit API-Key-Authentifizierung, Pagination und Zeitraum-Filtern.

## Scope
- API-Key-Middleware (`/lib/export/auth.ts`)
- 5 Export-Endpoints: deals, contacts, activities, signals, insights
- Pagination (page, limit, max 100)
- Zeitraum-Filter (since, until)
- Rate-Limiting (einfacher In-Memory-Counter)
- ENV-Variable EXPORT_API_KEY

## Out of Scope
- OAuth2 (spaeter nachruestbar)
- Schreibender Zugriff
- Echtzeit-Sync / Push
- UI fuer API-Key-Verwaltung

## Acceptance Criteria
- AC1: GET /api/export/deals liefert valides JSON mit Deals + Metadaten
- AC2: GET /api/export/contacts liefert Kontakte mit Firma, Qualitaetsfeldern
- AC3: GET /api/export/activities liefert Activities mit Typ und Entity-Referenz
- AC4: GET /api/export/signals liefert extrahierte Signale (V4.3)
- AC5: GET /api/export/insights liefert genehmigte KI-Insights
- AC6: Ohne API-Key → 401 Unauthorized
- AC7: Pagination funktioniert (page, limit, total, hasMore)
- AC8: Zeitraum-Filter (since, until) funktioniert
- AC9: Rate-Limiting: >100 Requests/Minute → 429

## Dependencies
- SLC-501 (Schema, aber nur fuer Types — Export nutzt bestehende Tabellen)

## QA Focus
- Alle 5 Endpoints mit curl testen (mit und ohne API-Key)
- Pagination pruefen (page=1&limit=10 vs page=2)
- Zeitraum-Filter pruefen (since=2026-04-01)
- Rate-Limiting pruefen (>100 Requests)

### Micro-Tasks

#### MT-1: API-Key-Middleware
- Goal: Wiederverwendbare Middleware fuer API-Key-Pruefung
- Files: `cockpit/src/lib/export/auth.ts`
- Expected behavior: verifyExportApiKey(request) prueft Bearer Token gegen EXPORT_API_KEY ENV. Gibt true/false zurueck.
- Verification: Test mit und ohne korrektem Key
- Dependencies: none

#### MT-2: Rate-Limiter
- Goal: Einfacher In-Memory Rate-Limiter
- Files: `cockpit/src/lib/export/rate-limit.ts`
- Expected behavior: checkRateLimit(ip) zaehlt Requests pro IP. >100/Minute → false.
- Verification: Mehrfach aufrufen, Limit pruefen
- Dependencies: none

#### MT-3: Export-Endpoints (5 Routes)
- Goal: 5 GET-Endpoints mit Pagination + Zeitraum-Filter
- Files: `cockpit/src/app/api/export/deals/route.ts`, `cockpit/src/app/api/export/contacts/route.ts`, `cockpit/src/app/api/export/activities/route.ts`, `cockpit/src/app/api/export/signals/route.ts`, `cockpit/src/app/api/export/insights/route.ts`
- Expected behavior: Jeder Endpoint: API-Key pruefen → Rate-Limit pruefen → Supabase-Query (service_role) → JSON mit {data, pagination}
- Verification: curl-Tests gegen alle 5 Endpoints
- Dependencies: MT-1, MT-2

#### MT-4: Middleware-Whitelist
- Goal: /api/export/* in Auth-Middleware erlauben (eigene Auth via API-Key, nicht Session)
- Files: `cockpit/src/middleware.ts`
- Expected behavior: /api/export/* wird von Supabase-Session-Check ausgenommen
- Verification: curl ohne Session-Cookie, nur mit API-Key → funktioniert
- Dependencies: MT-3
