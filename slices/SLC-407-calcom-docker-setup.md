# SLC-407 — Cal.com Docker-Setup + API

## Slice Info
- Feature: FEAT-406
- Priority: High
- Delivery Mode: internal-tool

## Goal
Cal.com Self-Hosted auf Hetzner deployen (Docker), API-Integration fuer Termin-Sync, Webhook-Receiver, Booking-Links pro Kontakt.

## Scope
- Docker Compose Erweiterung (calcom + calcom-db Container)
- Cal.com Konfiguration (Verfuegbarkeit, Booking Pages)
- /lib/calcom/ Service Layer (api-client.ts, webhook-handler.ts, sync.ts)
- /api/webhooks/calcom Route
- Bidirektionaler Sync: Cal.com → calendar_events
- Caddy/Coolify Reverse Proxy fuer cal.strategaizetransition.com
- Booking-Link-Anzeige pro Kontakt

## Out of Scope
- Gesamtkalender-UI (SLC-408)
- Mein Tag Kalender-Erweiterung (SLC-408)

### Micro-Tasks

#### MT-1: Docker Compose erweitern
- Goal: calcom + calcom-db Container in docker-compose.yml
- Files: `docker-compose.yml`
- Expected behavior: docker compose up startet Cal.com auf Port 3100
- Verification: Cal.com Web-UI erreichbar auf Hetzner
- Dependencies: none

#### MT-2: Cal.com API-Client
- Goal: REST API Client fuer Cal.com (Bookings, Availability, Event Types)
- Files: `cockpit/src/lib/calcom/api-client.ts`
- Expected behavior: getBookings, createBooking, getEventTypes, getAvailability
- Verification: TypeScript Compilation, API-Calls gegen Cal.com
- Dependencies: MT-1

#### MT-3: Webhook-Receiver
- Goal: /api/webhooks/calcom Endpoint der Cal.com Events verarbeitet
- Files: `cockpit/src/app/api/webhooks/calcom/route.ts`, `cockpit/src/lib/calcom/webhook-handler.ts`
- Expected behavior: BOOKING_CREATED → calendar_events INSERT, BOOKING_CANCELLED → DELETE, RESCHEDULED → UPDATE
- Verification: Cal.com Webhook testen, calendar_events pruefen
- Dependencies: MT-2

#### MT-4: Sync-Service
- Goal: Bidirektionaler Sync zwischen Cal.com und calendar_events
- Files: `cockpit/src/lib/calcom/sync.ts`
- Expected behavior: Cal.com Bookings werden in calendar_events gespiegelt (source='calcom', external_id=booking_id)
- Verification: Booking in Cal.com erstellen → Event in Business System pruefen
- Dependencies: MT-2, MT-3

#### MT-5: Booking-Link pro Kontakt
- Goal: "Meeting buchen" Button auf Kontakt-Detail mit Cal.com Booking-Link
- Files: `cockpit/src/app/(app)/contacts/[id]/page.tsx` (erweitert)
- Expected behavior: Button oeffnet Cal.com Booking-Page mit Kontakt-E-Mail vorausgefuellt
- Verification: Browser-Check auf Kontakt-Detail
- Dependencies: MT-2

## Acceptance Criteria
1. Cal.com laeuft Self-Hosted auf Hetzner als Docker-Container
2. Cal.com ist ueber cal.strategaizetransition.com erreichbar
3. Webhook-basierter Sync funktioniert (Booking → calendar_events)
4. Booking-Link pro Kontakt verfuegbar
5. Cal.com hat eigene PostgreSQL (nicht shared mit Supabase)
