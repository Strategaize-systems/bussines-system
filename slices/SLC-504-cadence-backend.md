# SLC-504 — Cadence-Backend

## Slice Info
- Feature: FEAT-501
- Priority: High
- Status: planned

## Goal
Komplette Backend-Logik fuer Cadences: CRUD Server Actions, Template-Rendering mit Variablen, Cadence-Execute-Cron, Abort-Check-Logik (DEC-068).

## Scope
- Server Actions: Cadence CRUD, Step CRUD, Enrollment erstellen/pausieren/stoppen
- `/lib/cadence/engine.ts` — Step-Execution (E-Mail/Task/Wait)
- `/lib/cadence/render.ts` — Template-Rendering mit Kontakt-/Deal-Variablen
- `/lib/cadence/abort.ts` — Abort-Check (Thread-ID + From-Address Fallback)
- `/api/cron/cadence-execute/route.ts` — Cron-Endpoint
- Cadence-Executions Logging

## Out of Scope
- Cadence-Builder UI (SLC-505)
- Enrollment-Status auf Workspaces (SLC-507)

## Acceptance Criteria
- AC1: Cadence mit Schritten erstellen/bearbeiten/loeschen per Server Action
- AC2: Deal/Kontakt in Cadence einbuchen per Server Action
- AC3: Cadence-Execute-Cron fuehrt faellige E-Mail-Schritte aus (sendet via Shared Layer)
- AC4: Cadence-Execute-Cron fuehrt faellige Task-Schritte aus (erstellt Task)
- AC5: Wait-Schritte setzen next_execute_at korrekt
- AC6: Antwort-E-Mail stoppt Cadence (Thread-ID Match oder From-Address Fallback)
- AC7: Deal won/lost stoppt Cadence
- AC8: Template-Variablen ({{kontakt.vorname}}, {{deal.name}}) werden korrekt ersetzt
- AC9: Enrollment-Status-Transitions funktionieren (active → completed/stopped)

## Dependencies
- SLC-501 (Schema)
- SLC-502 (Shared Email-Send-Layer fuer E-Mail-Schritte)

## QA Focus
- Cadence erstellen → Schritte in korrekter Reihenfolge?
- Enrollment → erster Schritt ausgefuehrt?
- Wait → naechster Schritt nach delay_days?
- Antwort-E-Mail → Cadence gestoppt?
- Deal won → Cadence gestoppt?
- Template-Variablen korrekt ersetzt?

### Micro-Tasks

#### MT-1: Cadence + Step CRUD Server Actions
- Goal: Erstellen/Bearbeiten/Loeschen von Cadences und Steps
- Files: `cockpit/src/app/(app)/cadences/actions.ts`
- Expected behavior: createCadence, updateCadence, deleteCadence, addStep, updateStep, removeStep, reorderSteps
- Verification: Server Actions aufrufen, DB pruefen
- Dependencies: none

#### MT-2: Enrollment Server Actions
- Goal: Deal/Kontakt in Cadence einbuchen, pausieren, stoppen
- Files: `cockpit/src/app/(app)/cadences/enrollment-actions.ts`
- Expected behavior: enrollInCadence(cadenceId, dealId?, contactId?) → Enrollment erstellt mit next_execute_at, pauseEnrollment, stopEnrollment
- Verification: Enrollment erstellen, DB pruefen (status, next_execute_at)
- Dependencies: MT-1

#### MT-3: Template-Rendering
- Goal: Variablen-Ersetzung fuer Cadence-E-Mail-Schritte
- Files: `cockpit/src/lib/cadence/render.ts`
- Expected behavior: renderTemplate(template, context) ersetzt {{kontakt.vorname}} etc. mit realen Werten
- Verification: Test mit Beispiel-Template + Kontakt-Daten
- Dependencies: none

#### MT-4: Abort-Check-Logik
- Goal: Pruefen ob Cadence abgebrochen werden soll
- Files: `cockpit/src/lib/cadence/abort.ts`
- Expected behavior: checkAbort(enrollment) prueft: Antwort empfangen (Thread-ID + From-Address), Deal won/lost. Gibt { shouldAbort, reason } zurueck.
- Verification: Test mit Szenarien (Antwort vorhanden, Deal gewonnen, kein Abort)
- Dependencies: none

#### MT-5: Cadence-Execute-Cron
- Goal: Cron-Route die faellige Enrollments verarbeitet
- Files: `cockpit/src/app/api/cron/cadence-execute/route.ts`, `cockpit/src/lib/cadence/engine.ts`
- Expected behavior: Laedt aktive Enrollments WHERE next_execute_at <= now(). Pro Enrollment: Abort-Check → Step ausfuehren → naechsten Step vorbereiten oder abschliessen.
- Verification: Cron manuell aufrufen, Executions in DB pruefen, gesendete E-Mails pruefen
- Dependencies: MT-1, MT-2, MT-3, MT-4
