# SLC-502 — Shared Email-Send-Layer + Tracking-API

## Slice Info
- Feature: FEAT-506
- Priority: High
- Status: planned

## Goal
Zentraler E-Mail-Versand-Layer mit Tracking-Injection (Pixel + Link-Wrapping) und oeffentlicher Tracking-API-Route. Refactoring des bestehenden sendEmail.

## Scope
- `/lib/email/send.ts` — Shared Email-Send-Layer (DEC-069)
- `/lib/email/tracking.ts` — Tracking-Pixel-Injection + Link-Wrapping
- `/api/track/[id]/route.ts` — Oeffentlicher Tracking-Endpoint (Open + Click)
- Refactoring von `emails/actions.ts` auf den neuen Shared Layer
- Middleware-Whitelist-Erweiterung fuer `/api/track/*`

## Out of Scope
- Tracking-UI (SLC-507)
- Cadence-E-Mail-Versand (SLC-504, nutzt aber diesen Layer)
- E-Mail-Zuordnung (SLC-503)

## Acceptance Criteria
- AC1: Manuell gesendete E-Mails enthalten Tracking-Pixel (1x1 GIF) im HTML
- AC2: Links in E-Mails werden durch Redirect-URLs gewrappt
- AC3: GET /api/track/{id}?t=open liefert 1x1 transparent GIF + loggt Event
- AC4: GET /api/track/{id}?t=click&url={url} loggt Event + 302 Redirect
- AC5: tracking_id wird in emails-Tabelle gespeichert
- AC6: Bestehender E-Mail-Versand funktioniert weiterhin (kein Regression)
- AC7: /api/track/* ist ohne Auth erreichbar (Middleware-Whitelist)

## Dependencies
- SLC-501 (Schema: emails.tracking_id, email_tracking_events Tabelle)

## QA Focus
- E-Mail senden → HTML pruefen ob Pixel und gewrappte Links vorhanden
- Tracking-URL manuell aufrufen → Event in DB pruefen
- Click-Redirect → Original-URL wird korrekt geoeffnet
- Bestehender sendEmail-Flow darf nicht brechen

### Micro-Tasks

#### MT-1: Shared Email-Send-Layer
- Goal: `/lib/email/send.ts` mit SMTP-Versand, DB-Logging, tracking_id-Generierung
- Files: `cockpit/src/lib/email/send.ts`
- Expected behavior: Funktion sendEmail(params) sendet via nodemailer, schreibt in emails-Tabelle, gibt emailId + trackingId zurueck
- Verification: Build kompiliert
- Dependencies: none

#### MT-2: Tracking-Injection
- Goal: Pixel-Injection und Link-Wrapping in ausgehende E-Mails
- Files: `cockpit/src/lib/email/tracking.ts`
- Expected behavior: injectTracking(html, trackingId, baseUrl) gibt HTML mit Pixel + gewrappten Links zurueck
- Verification: Unit-Test oder manueller HTML-Check
- Dependencies: none

#### MT-3: Tracking-API-Route
- Goal: Oeffentlicher Endpoint fuer Open- und Click-Events
- Files: `cockpit/src/app/api/track/[id]/route.ts`
- Expected behavior: GET ?t=open → 1x1 GIF + DB-INSERT. GET ?t=click&url=X → DB-INSERT + 302 Redirect.
- Verification: curl-Test gegen laufenden Dev-Server
- Dependencies: MT-1 (tracking_id in DB)

#### MT-4: Middleware-Whitelist + Refactoring
- Goal: /api/track/* als oeffentliche Route. emails/actions.ts auf Shared Layer umstellen.
- Files: `cockpit/src/middleware.ts`, `cockpit/src/app/(app)/emails/actions.ts`
- Expected behavior: /api/track/* ohne Auth erreichbar. sendEmail nutzt internen Shared Layer. Bestehende Funktionalitaet unveraendert.
- Verification: E-Mail senden → funktioniert wie bisher + Tracking-Events in DB
- Dependencies: MT-1, MT-2, MT-3
