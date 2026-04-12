# FEAT-406 — Cal.com-Sync + Gesamtkalender

## Purpose
Professionelle Kalender-Infrastruktur: Cal.com Self-Hosted als Buchungs- und Sync-Engine, Gesamtkalender-Ansicht im Business System als zentrales Planungsinstrument.

## Feature Type
Backend + Frontend + Infrastructure

## Version
V4

## Dependencies
- DEC-029 (Gesamtkalender + Cal.com als ein Block)
- DEC-031 (Self-Hosted Everything)
- Bestehende `calendar_events` Tabelle (V3, FEAT-309)

## Infrastructure
- Cal.com Self-Hosted auf Hetzner (Docker Container) — DEC-031
- Cal.com Community Edition (Open Source, kostenlos)
- Cal.com API fuer bidirektionalen Sync
- PostgreSQL-Instanz fuer Cal.com (eigene DB oder shared mit Supabase)

## Database Changes
- Erweiterung `calendar_events`: source (enum: manual/calcom/google/outlook), external_id, sync_status, booking_link
- Keine neue Tabelle noetig — bestehende calendar_events wird erweitert

## Funktionen

### Cal.com Setup
- Cal.com Docker-Container auf Hetzner deployen
- Booking Pages konfigurieren (Verfuegbarkeit, Meeting-Dauer, Puffer)
- API-Keys fuer Sync generieren

### Bidirektionaler Sync
- Cal.com → Business System: Gebuchte Termine automatisch als calendar_events
- Business System → Cal.com: Manuell erstellte Events als Blocker in Cal.com
- Externe Kalender via Cal.com: Google Calendar, Outlook als Connected Calendars
- Sync-Intervall: Webhook-basiert (Cal.com Webhooks) + Polling-Fallback

### Gesamtkalender-Ansicht
- Tages-/Wochen-/Monatsansicht (Google-Calendar-aehnlich)
- Farbcodierung nach Typ (Meeting, Blocker, Extern, Intern)
- Drag-and-Drop fuer Terminverschiebung (nur manuelle Events)
- Klick auf Event zeigt Detail (mit Deal-/Kontakt-Verknuepfung)
- Navigation: Direkter Zugang ueber Sidebar (unter Operativ)

### Meeting-Buchung
- Booking-Link pro Kontakt ("Meeting buchen" Button)
- Booking-Link in E-Mail-Templates einfuegbar
- Gebuchte Meetings automatisch mit Kontakt/Firma verknuepft

### Mein Tag Integration
- Mein Tag Kalender-Panel nutzt gleiche Datenquelle
- Verfuegbare-Zeit-Berechnung basiert auf allen Calendar-Quellen

## Nicht V4
- Eigene Buchungslogik (Cal.com uebernimmt)
- Multi-Kalender-Management (ein Hauptkalender + Sync)
- Recurring Events Management (Cal.com handled das)
- Team-Kalender

## Akzeptanzkriterien
1. Cal.com laeuft Self-Hosted auf Hetzner als Docker-Container
2. Termine aus Cal.com erscheinen automatisch im Business System
3. Gesamtkalender-Ansicht zeigt alle Termine (Tages-/Wochen-/Monatsansicht)
4. Meeting-Buchungs-Link ist pro Kontakt verfuegbar
5. Bestehende calendar_events werden in Gesamtkalender integriert
6. Mein Tag Kalender-Panel nutzt die gleiche Datenquelle
7. Verfuegbare-Zeit-Berechnung basiert auf Cal.com-Daten
8. Externe Kalender (Google/Outlook) sind via Cal.com einbindbar

## Risiken
- Cal.com Self-Hosted Komplexitaet → Docker-Setup gut dokumentiert, Community aktiv
- Cal.com braucht eigene PostgreSQL → entweder shared oder eigene Instanz (Architecture Decision)
- Webhook-Zuverlaessigkeit → Polling-Fallback alle 5 Minuten
- Server-Last durch Cal.com → Monitoring, Upgrade bei Bedarf
