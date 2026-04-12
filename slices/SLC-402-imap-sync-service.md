# SLC-402 — IMAP-Sync Service

## Slice Info
- Feature: FEAT-405
- Priority: Blocker
- Delivery Mode: internal-tool

## Goal
Background IMAP-Sync-Service: Verbindung zu IONOS, E-Mails holen, parsen, in email_messages speichern, Threads erkennen, Kontakte matchen. Cron-API-Route + Sync-Status in Settings.

## Scope
- /lib/imap/ Service Layer (sync-service.ts, parser.ts, contact-matcher.ts, retention.ts)
- /api/cron/imap-sync API-Route
- /api/cron/retention API-Route
- Cron-Secret Middleware
- Sync-Status Anzeige in Settings
- Initial-Sync Logik (letzte 90 Tage, max 500)
- Env Vars: IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASSWORD, CRON_SECRET

## Out of Scope
- E-Mail-Klassifikation (SLC-404)
- E-Mail-Inbox UI (SLC-403)
- Cal.com Integration

### Micro-Tasks

#### MT-1: Cron-Secret Middleware
- Goal: Wiederverwendbare Middleware fuer /api/cron/* Endpoints
- Files: `cockpit/src/app/api/cron/middleware.ts`
- Expected behavior: Requests ohne korrektes x-cron-secret Header werden mit 401 abgewiesen
- Verification: Manual test mit curl
- Dependencies: none

#### MT-2: IMAP Sync-Service Core
- Goal: imapflow Verbindung zu IONOS, UIDs fetchen, E-Mails parsen, in DB speichern
- Files: `cockpit/src/lib/imap/sync-service.ts`, `cockpit/src/lib/imap/parser.ts`
- Expected behavior: Verbindet sich zu imap.ionos.de, laedt neue E-Mails seit last_uid, parsed Header+Body, INSERT email_messages
- Verification: Manueller Test via API-Route, Sync-State wird aktualisiert
- Dependencies: MT-1

#### MT-3: Thread-Erkennung
- Goal: E-Mails zu Threads gruppieren via In-Reply-To / References Header
- Files: `cockpit/src/lib/imap/parser.ts` (erweitert)
- Expected behavior: Thread wird erstellt/aktualisiert wenn In-Reply-To/References Header vorhanden, Fallback auf normalisiertem Subject
- Verification: Test mit E-Mail-Thread (Reply-Kette)
- Dependencies: MT-2

#### MT-4: Kontakt-Matching
- Goal: from_address automatisch gegen contacts.email matchen, company_id + deal_id uebernehmen
- Files: `cockpit/src/lib/imap/contact-matcher.ts`
- Expected behavior: Bekannte Kontakt-E-Mails werden automatisch zugeordnet, unbekannte bleiben NULL
- Verification: Test mit bekanntem und unbekanntem Absender
- Dependencies: MT-2

#### MT-5: Cron-API-Route + Retention
- Goal: /api/cron/imap-sync und /api/cron/retention Endpoints
- Files: `cockpit/src/app/api/cron/imap-sync/route.ts`, `cockpit/src/app/api/cron/retention/route.ts`, `cockpit/src/lib/imap/retention.ts`
- Expected behavior: Endpoints fuehren Sync bzw. Cleanup aus, antworten mit JSON-Status
- Verification: curl POST mit CRON_SECRET, DB-Eintraege pruefen
- Dependencies: MT-2, MT-3, MT-4

#### MT-6: Sync-Status in Settings
- Goal: Settings-Seite zeigt IMAP-Sync-Status (letzte Sync, Anzahl, Fehler)
- Files: `cockpit/src/app/(app)/settings/imap-status.tsx`, `cockpit/src/app/(app)/settings/page.tsx`
- Expected behavior: Card in Settings zeigt Sync-Zustand, letzten Sync-Zeitpunkt, Fehler wenn vorhanden
- Verification: Browser-Check in Settings
- Dependencies: MT-5

## Acceptance Criteria
1. IMAP-Sync verbindet sich zu IONOS (imap.ionos.de:993)
2. Neue E-Mails werden inkrementell synchronisiert (last_uid Tracking)
3. Thread-Erkennung gruppiert zusammengehoerige E-Mails
4. Kontakt-Matching ordnet bekannte Absender automatisch zu
5. Cron-Endpoint ist via CRON_SECRET geschuetzt
6. Sync-Status in Settings sichtbar
7. Retention Cleanup loescht E-Mails aelter als 90 Tage
