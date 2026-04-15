# FEAT-409 — Meeting-Erinnerungen (extern + intern + KI-Agenda)

## Summary

Drei Komponenten: externe Meeting-Erinnerungen an Teilnehmer (E-Mail + .ics), interne Erinnerungen an User vor Meeting-Start, KI-gestuetzte Agenda-Vorbereitung aus Deal-Kontext. Alle drei sind per User-Setting individuell konfigurierbar.

## Version

V4.1

## Related Decisions

- DEC-017: Cal.com fuer Meeting-Buchung
- DEC-018: Bedrock LLM via Frankfurt
- DEC-023: Zentraler LLM-Service-Layer
- DEC-026: Eigene calendar_events-Tabelle

## Dependencies

- FEAT-308 (Meeting-Management) — `meetings` Tabelle
- FEAT-309 (Kalender-Events)
- FEAT-406 (Cal.com-Sync + Gesamtkalender) — fuer Buchungen die durch Cal.com entstehen
- DEC-023 Bedrock LLM-Layer — fuer KI-Agenda

## User Stories

**Extern:** Als Eigentuemer will ich, dass externe Teilnehmer automatisch eine Einladung mit Kalendereintrag bekommen und X Stunden vor dem Meeting eine Erinnerung mit Link — damit sie puenktlich erscheinen und ich keine manuellen Erinnerungen schicken muss.

**Intern:** Als Eigentuemer will ich selbst entscheiden koennen, ob und wie ich vor einem Meeting erinnert werde — damit ich nicht durch Push-Meldungen aus konzentrierten Arbeitsphasen gerissen werde.

**KI-Agenda:** Als Eigentuemer will ich vor einem Meeting optional eine KI-generierte Vorbereitung aus Deal-Historie bekommen — damit ich schnell den Kontext habe ohne manuelle Recherche.

## Acceptance Criteria

### A — Externe Erinnerung an Teilnehmer

1. **Initiale Einladung:** Bei Meeting-Erstellung wird automatisch eine E-Mail an alle externen Teilnehmer geschickt: Datum, Uhrzeit, Meeting-Link (Jitsi aus FEAT-404 oder Cal.com-Link), .ics-Attachment.
2. **.ics-Kompatibilitaet:** .ics-File laedt korrekt in Google Calendar, Outlook, Apple Calendar.
3. **Erinnerungs-Mail:** X Stunden vor Meeting (konfigurierbar pro Meeting, System-Default 24h und 2h) geht Erinnerungs-Mail raus mit Meeting-Link und Kurzinfo.
4. **Automatisch:** Kein Freigabe-Schritt noetig — das sind eigene Termine, kein Kunden-Nachfass.
5. **Opt-out:** Wenn Kontakt explizit Kommunikations-Opt-out hat, geht keine Erinnerung raus (Respect-Flag am Kontakt).

### B — Interne Erinnerung an User

6. **Per-User-Setting:** In User-Settings kann eingestellt werden: "Interne Push-Erinnerung aktiv: ja/nein" + "Zeitpunkt vor Meeting: 30/15/10/5 Min" (Default: aus — nicht nerven als Default).
7. **Inhalt:** Bei aktiviertem Setting erscheint X Min vor Meeting eine Notification mit: Meeting-Titel, Teilnehmer, Deal-Link, letzter Kontakt-Datum, offene Action-Items aus Deal.
8. **Kanal:** Browser-Push wenn moeglich, sonst E-Mail als Fallback.

### C — KI-Agenda-Vorbereitung

9. **Per-User-Setting:** "KI-Agenda-Vorbereitung: Automatisch vor jedem Meeting / Nur on-click / Aus" (Default: Nur on-click — Kosten-bewusst).
10. **Auf Meeting-Detail-Seite:** Button "KI-Agenda generieren" ruft Bedrock-Summary mit Deal-Kontext auf und zeigt Output inline.
11. **Struktur der KI-Agenda:** Letzte Kommunikation (kurz), offene Punkte aus Deal-Historie, Entscheider am Tisch (Kontakte mit Rolle), Vorschlag Meeting-Ziel.
12. **Bei "Automatisch":** Agenda wird X Stunden vor Meeting generiert und als interne Notiz gespeichert, kein erneuter Bedrock-Call bei Oeffnen.
13. **Kostenschutz:** Agenda-Generierung ist ein einzelner LLM-Call (keine Agent-Loops). Typische Kosten: <0.10 EUR pro Agenda.
14. **Sichtbarkeit:** KI-Agenda ist User-intern, wird NICHT an externe Teilnehmer versendet.

### Global

15. **Settings-UI:** Alle drei Settings (A Default-Zeiten, B Push-Erinnerung, C KI-Agenda-Modus) sind in User-Settings-Seite vorhanden und sofort wirksam.
16. **Kein Meeting-Reminder ohne Pflicht-Inhalt:** Jede Erinnerung enthaelt mindestens: Zeit, Meeting-Link oder Ort, Titel.

## Schema-Erweiterungen

### user_settings (erweitert oder neu)

| Feld | Typ | Beschreibung |
|---|---|---|
| meeting_reminder_external_hours | INT[] | Liste von Vorlauf-Stunden fuer externe Mails (Default [24, 2]) |
| meeting_reminder_internal_enabled | BOOLEAN | Push-Erinnerung an User an/aus (Default false) |
| meeting_reminder_internal_minutes | INT | Minuten vor Meeting fuer interne Notification (Default 30) |
| meeting_agenda_mode | TEXT | 'auto' / 'on_click' / 'off' (Default 'on_click') |

### meetings (erweitert)

| Feld | Typ | Beschreibung |
|---|---|---|
| ai_agenda | TEXT | Vorgenerierte KI-Agenda (wenn mode='auto') |
| ai_agenda_generated_at | TIMESTAMPTZ | Zeitpunkt Generierung |
| reminders_sent | JSONB | Log der versendeten Erinnerungen: [{type, recipient, sent_at}] |

## Technical Notes

- **Cron-Job fuer Erinnerungen:** `/api/cron/meeting-reminders` laeuft alle 5 Minuten. Prueft Meetings mit scheduled_at in naher Zukunft, sendet passende Erinnerungen, markiert in `reminders_sent`.
- **Idempotenz:** Cron kann mehrfach laufen — Erinnerung nur senden wenn noch nicht in `reminders_sent` eingetragen.
- **.ics-Library:** `ical-generator` npm package (MIT, ausreichend fuer VEVENT-Generierung).
- **SMTP:** Nutzt bestehende Mail-Infrastruktur aus V2 FEAT-106.
- **Browser-Push:** Web Push API, erfordert Service Worker. Fallback auf E-Mail wenn nicht supported/zugestimmt.
- **Bedrock-Call fuer Agenda:** System-Prompt mit Deal-Historie, Kontakten, offenen Tasks. JSON-strukturierter Output.

## Out of Scope (V4.2+)

- SMS-Erinnerungen
- Vorlagen-Editor fuer Erinnerungs-E-Mails (fester Template-Satz)
- Mehrsprachige Erinnerungen (Default Deutsch, Template-Hook vorbereiten)
- Auto-Reschedule wenn Teilnehmer absagt
- Anti-Spam-Throttling (unrealistisch bei <20 Meetings/Tag)

## Open Questions (fuer /architecture)

- Browser-Push: Welche Bibliothek (web-push npm, VAPID-Keys-Management)?
- .ics mit Attendee-Liste: DSGVO-Check — darf Teilnehmer-Liste vollstaendig in .ics stehen (macht MS Outlook standardmaessig)?
- KI-Agenda Caching: Einmal generiert, bei erneutem Oeffnen gleicher Agenda oder neuer Bedrock-Call (fuer aktuellere Deal-Daten)?
- Timezone-Handling: Wenn externer Teilnehmer in anderer Zeitzone: .ics mit TZID oder fester UTC-Stempel?
