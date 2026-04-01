# SLC-101 — Schema-Migration + Cleanup

## Meta
- Feature: Alle
- Priority: Blocker
- Status: done
- Dependencies: keine (muss zuerst laufen)

## Goal
DB-Schema für V2 vorbereiten: bestehende Tabellen erweitern, neue Tabellen anlegen, content_calendar entfernen, neue Pipeline-Seeds, RLS + Grants für neue Tabellen. Content-Kalender aus Code + Navigation entfernen.

## Scope
- ALTER TABLE für contacts (+15), companies (+12), deals (+4), activities (+8)
- CREATE TABLE für emails, proposals, fit_assessments, tasks, handoffs, referrals, signals
- DROP content_calendar
- DELETE alte Pipeline-Seeds, INSERT neue (Multiplikatoren 10, Unternehmer 12)
- GRANT + RLS für alle neuen Tabellen
- Content-Kalender Route + Navigation entfernen
- nodemailer als Dependency installieren

## Out of Scope
- UI-Änderungen an bestehenden Formularen (SLC-102)
- Neue Seiten/Komponenten (SLC-103+)

### Micro-Tasks

#### MT-1: SQL Migration Script
- Goal: Migration-Script das auf der bestehenden DB läuft (ALTER + CREATE + DROP + SEED)
- Files: `sql/04_v2_migration.sql`
- Expected behavior: Alle Schema-Änderungen in einem Script, idempotent (IF NOT EXISTS)
- Verification: Script lokal gegen leere DB testen (kein Fehler)
- Dependencies: keine

#### MT-2: RLS + Grants für neue Tabellen
- Goal: RLS aktivieren + authenticated full access für alle neuen Tabellen
- Files: `sql/04_v2_migration.sql` (Anhang)
- Expected behavior: Alle 7 neuen Tabellen haben RLS + GRANT
- Verification: Kein "permission denied" bei Zugriff
- Dependencies: MT-1

#### MT-3: Content-Kalender aus Code entfernen
- Goal: Calendar-Route, Calendar-Components, Calendar-Actions, Navigation-Eintrag entfernen
- Files: `cockpit/src/app/(app)/calendar/` (DELETE), `cockpit/src/components/layout/sidebar.tsx` (EDIT)
- Expected behavior: /calendar Route gibt 404, Sidebar zeigt keinen Kalender-Link
- Verification: Build erfolgreich, kein Kalender in Navigation
- Dependencies: keine

#### MT-4: nodemailer installieren
- Goal: nodemailer als npm Dependency hinzufügen
- Files: `cockpit/package.json`
- Expected behavior: nodemailer ist verfügbar für E-Mail-Versand
- Verification: `npm ls nodemailer` zeigt installierte Version
- Dependencies: keine

#### MT-5: SMTP Env Vars in docker-compose
- Goal: SMTP-Konfiguration als Env Vars für app-Service
- Files: `docker-compose.yml`
- Expected behavior: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM als Env Vars
- Verification: docker-compose.yml hat SMTP-Vars
- Dependencies: keine
