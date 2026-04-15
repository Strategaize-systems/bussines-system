# SLC-417 — user_settings + Reminder-Cron + .ics

## Slice Info
- Feature: FEAT-409 A/B (Externe Reminder + interne Settings-Infrastruktur)
- Priority: High
- Delivery Mode: internal-tool
- Backlog-Mapping: BL-346, BL-348

## Goal
User-Settings-UI + Backend fuer Meeting-Erinnerungen bauen. Externe Reminder (E-Mail + .ics) an Teilnehmer zu konfigurierten Vorlaufzeiten (Default [24, 2] Stunden). Interner Reminder-Teil hier nur als SMTP-Fallback — Browser-Push kommt in SLC-418. Idempotenz via `meetings.reminders_sent` JSONB. `ical-generator` fuer RFC-5545-konforme .ics.

## Scope
- `user_settings` Tabelle aus MIG-011 (schon in SLC-411 erstellt) — hier wird sie NUTZBAR gemacht (Default-Row-Insert bei neuem User)
- Settings-UI `/settings/meetings` mit 4 Feldern: `meeting_reminder_external_hours` (Multi-Int-Input), `meeting_reminder_internal_enabled` (Toggle), `meeting_reminder_internal_minutes` (Select), `meeting_agenda_mode` (Radio: auto/on_click/off, Default `on_click`)
- Server Action `saveUserSettings(settings)` + `getUserSettings()`
- `POST /api/cron/meeting-reminders` (alle 5 Min, CRON_SECRET)
- Reminder-Logik mit Idempotenz via `reminders_sent` JSONB
- `/lib/meetings/ics-builder.ts` via `ical-generator` (MIT, ~50KB)
- Mail-Templates: `meeting-reminder-de.ts` + `meeting-invite-full-de.ts` (ersetzt basic-Template aus SLC-414 mit .ics-Attachment-Variante)
- Upgrade des Invite-Flows aus SLC-414: Initial-Invite bekommt jetzt auch .ics
- Kommunikations-Opt-out-Flag beachten (Respect-Flag am Kontakt, falls bereits vorhanden, sonst explizit als Scope-Notiz vermerken)
- Auto-Insert in `user_settings` fuer existierenden Gruender-User + neue Profiles (DB-Trigger ODER onboarding-Flow)

## Out of Scope
- Browser-Push (SLC-418)
- KI-Agenda (SLC-419)
- SMS-Reminder
- Mehrsprachige Mails
- Template-Editor

## Micro-Tasks

### MT-1: Default-Row fuer user_settings
- Goal: Fuer bestehende Profile-Zeilen wird `user_settings`-Row mit Defaults angelegt, kuenftig Trigger/Onboarding
- Files: `cockpit/sql/11c_user_settings_backfill.sql` (Insert fuer bestehende Profile), optional Trigger
- Expected behavior: Jeder Profile hat genau eine user_settings-Row
- Verification: `SELECT count(*) FROM profiles p LEFT JOIN user_settings us ON us.user_id=p.id WHERE us.user_id IS NULL` = 0
- Dependencies: SLC-411 (MIG-011)

### MT-2: Server Actions Settings
- Goal: `getUserSettings` + `saveUserSettings` mit RLS
- Files: `cockpit/src/app/actions/user-settings.ts`
- Expected behavior: Liest/schreibt nur eigene Row (RLS wirkt), Validation (hours 0-168, minutes positiv, mode Enum)
- Verification: Unit-Test mit Mock-Supabase, invalid-input rejected
- Dependencies: MT-1

### MT-3: Settings-UI
- Goal: `/settings/meetings` Page
- Files: `cockpit/src/app/settings/meetings/page.tsx`, `cockpit/src/components/settings/MeetingSettingsForm.tsx`
- Expected behavior: Formular mit 4 Feldern, Save-Button, Toast-Feedback, Defaults sichtbar
- Verification: Klick-Test, Page-Reload zeigt gespeicherte Werte
- Dependencies: MT-2

### MT-4: .ics-Builder
- Goal: Funktion `buildMeetingIcs(meeting, contacts, jitsiUrl)` liefert `.ics`-Content
- Files: `cockpit/src/lib/meetings/ics-builder.ts`, `cockpit/package.json` (`ical-generator` ^7)
- Expected behavior: RFC-5545-konform, VEVENT mit UID/DTSTART/DTEND/SUMMARY/DESCRIPTION/LOCATION/ATTENDEE/TZID=Europe/Berlin
- Verification: Generierte .ics in Google Calendar + Outlook + Apple Calendar importieren (manueller Test)
- Dependencies: none

### MT-5: Mail-Templates mit .ics-Attachment
- Goal: Invite- und Reminder-Templates mit .ics-Attachment
- Files: `cockpit/src/lib/email/templates/meeting-invite-full-de.ts`, `cockpit/src/lib/email/templates/meeting-reminder-de.ts`
- Expected behavior: HTML + Plain + Attachment; SLC-414 Basic-Template wird ersetzt
- Verification: Test-Versand, .ics-File im Anhang, Klick → Kalender-Eintrag
- Dependencies: MT-4

### MT-6: Reminder-Cron
- Goal: `POST /api/cron/meeting-reminders` (5min)
- Files: `cockpit/src/app/api/cron/meeting-reminders/route.ts`
- Expected behavior: Liest user_settings, scannt Meetings in 25h-Window, sendet passende Reminder (extern nach `meeting_reminder_external_hours`, intern via SMTP wenn `meeting_reminder_internal_enabled`), updated `reminders_sent` JSONB fuer Idempotenz
- Verification: Manuelles Test-Meeting in 2h → Cron-Call → Mail landet in Postfach
- Dependencies: MT-3, MT-5

### MT-7: Invite-Flow-Upgrade in SLC-414
- Goal: SLC-414-Basic-Template ersetzt durch Full-Template mit .ics
- Files: `cockpit/src/lib/meetings/send-invite.ts` (bestehend aendern)
- Expected behavior: Initial-Invite beim Meeting-Start hat .ics-Attachment
- Verification: Test-Meeting starten, Empfaenger-Postfach pruefen
- Dependencies: MT-5

### MT-8: Coolify Cron-Job
- Goal: 5-Min-Cron anlegen (siehe feedback_coolify_cron_node)
- Files: `docs/ARCHITECTURE.md` (Cron-Tabelle)
- Expected behavior: Laeuft zuverlaessig, Log sauber
- Verification: Coolify-Log nach 1h zeigt 12 Laeufe ohne Error
- Dependencies: MT-6

## Acceptance Criteria
1. `/settings/meetings` zeigt 4 konfigurierbare Felder mit Defaults, Save wirkt
2. Jeder Profile hat genau eine user_settings-Row (Backfill + kuenftige Anlage)
3. Meeting-Einladung (SLC-414 Initial-Invite) hat jetzt .ics-Attachment, laedt korrekt in Google/Outlook/Apple
4. Externe Reminder werden X Stunden vor Meeting versendet (Default [24, 2])
5. Interner Reminder (in diesem Slice via SMTP-Fallback) kommt an wenn `meeting_reminder_internal_enabled=true`
6. `reminders_sent` JSONB verhindert Doppel-Versand bei Cron-Doppellauf
7. Opt-out-Flag am Kontakt wird respektiert (keine Reminder an Opt-out-Kontakte)
8. Cron-Log sauber, keine 500er

## Dependencies
- SLC-411 (MIG-011 fuer `user_settings`, `reminders_sent`)
- SLC-414 (Meeting-Start-Flow wird erweitert)

## QA Focus
- **.ics-Kompat:** In Google + Outlook + Apple importiert, Zeitzone korrekt (Europe/Berlin)
- **Idempotenz:** Cron laeuft zweimal → keine doppelten Reminder
- **Timing:** ±5-min-Fenster-Logik wirkt (Meeting in 24h10min → 24h-Reminder; in 1h55min → 2h-Reminder)
- **DSGVO:** ATTENDEE-Liste enthaelt nur akzeptable Felder (Name + Mail)
- **Opt-out:** Respect-Flag wirkt
- **Edge:** Meeting in Vergangenheit bekommt keinen Reminder

## Geschaetzter Aufwand
2 Tage (UI + Cron + Templates + .ics-Kompat-Tests)
