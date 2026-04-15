# SLC-419 — KI-Agenda (on-click + auto)

## Slice Info
- Feature: FEAT-409 C
- Priority: Medium
- Delivery Mode: internal-tool
- Backlog-Mapping: BL-347

## Goal
KI-gestuetzte Meeting-Vorbereitung via Bedrock Claude Sonnet 4: User bekommt vor dem Meeting eine strukturierte Agenda aus Deal-Kontext (letzte Kommunikation, offene Punkte, Entscheider, Meeting-Ziel-Vorschlag). Default-Mode `on_click` (Kostenschutz — feedback_bedrock_cost_control), optional `auto` (Cron-generiert vor Meeting) oder `off`. Single-Call, keine Agent-Loops (<0.10 EUR pro Agenda).

## Scope
- Bedrock-Prompt-Builder `/lib/ai/bedrock/meeting-agenda.ts`
- Zod-Schema fuer JSON-Output: `{last_communication, open_points[], decision_makers[], suggested_goal}`
- `POST /api/meetings/[id]/generate-agenda` (auth, respektiert `meeting_agenda_mode`)
- Auto-Generation-Integration in Reminder-Cron (SLC-417): wenn `meeting_agenda_mode='auto'` und Meeting in <25h und `ai_agenda IS NULL` → Bedrock-Call + Persist
- Meeting-Detail-UI: Button "KI-Agenda generieren" (on_click), inline-Display der Agenda, Re-Generate-Button
- Deal-Kontext-Collector: letzte 14d Activities + offene Tasks + Kontakte mit Rollen
- Kosten-Guard: 1 Call pro Agenda, Retry nur 1x bei 5xx
- KI-Agenda ist intern sichtbar, wird NIE an externe Teilnehmer versendet (FEAT-409 AC-14)
- Audit-Log-Eintrag `ai_agenda_generated`

## Out of Scope
- Action-Item-Extraktion aus Agenda (das ist Summary in SLC-416)
- Agent-Loops / Multi-Step-Reasoning
- Cross-Meeting-Kontext (V4.2 Wissensbasis)

## Micro-Tasks

### MT-1: Prompt-Builder + Zod-Schema
- Goal: Template + JSON-Schema + Context-Collector
- Files: `cockpit/src/lib/ai/bedrock/meeting-agenda.ts`, `cockpit/src/lib/meetings/deal-context.ts`
- Expected behavior: Sammelt Deal-Kontext, baut System-Prompt, parst + validiert JSON-Output
- Verification: Unit-Test mit Mock-Deal-Daten, Output-Validation durchlaufen
- Dependencies: none

### MT-2: Generate-Agenda API
- Goal: `POST /api/meetings/[id]/generate-agenda`
- Files: `cockpit/src/app/api/meetings/[id]/generate-agenda/route.ts`
- Expected behavior: Auth-Check, Mode-Check (`off` → 400), Bedrock-Call via bestehendem LLM-Service, `ai_agenda` + `ai_agenda_generated_at` persistieren
- Verification: curl-Test mit Test-Meeting, Response enthaelt Agenda-JSON
- Dependencies: MT-1

### MT-3: Meeting-Detail-UI
- Goal: Button "KI-Agenda generieren" + inline-Display + Re-Generate
- Files: `cockpit/src/components/meetings/AgendaPanel.tsx`, Integration in `cockpit/src/app/meetings/[id]/page.tsx` + Deal-Workspace
- Expected behavior: Button zeigt Loading-State, Agenda-Cards fuer 4 Felder, Re-Generate-Button fuer neue Daten, KI-Badge
- Verification: Klick-Test; 2. Klick lädt vorhandene Agenda (nicht neu generiert) ausser Re-Generate
- Dependencies: MT-2

### MT-4: Auto-Generation im Reminder-Cron
- Goal: SLC-417 Reminder-Cron erweitert um Agenda-Logik
- Files: `cockpit/src/app/api/cron/meeting-reminders/route.ts` (aendern)
- Expected behavior: Wenn `meeting_agenda_mode='auto'` und Meeting <25h und `ai_agenda IS NULL` → Bedrock-Call, Persist
- Verification: Test-User mit `mode='auto'`, Test-Meeting in 20h, Cron-Call → `ai_agenda` gefuellt
- Dependencies: MT-2

### MT-5: Kosten-Log + Guard
- Goal: Token-Count geloggt, harte Begrenzung 1 Call + 1 Retry
- Files: Inline in MT-2
- Expected behavior: Log-Eintrag `meeting_agenda_generated` mit Token-Count + geschaetzten Kosten
- Verification: Log-Check nach Test-Call
- Dependencies: MT-2

### MT-6: Settings-Integration
- Goal: `meeting_agenda_mode` in Settings-UI erweitern (bereits in SLC-417 MT-3 angelegt — hier nur verifizieren + dokumentieren)
- Files: evtl. leichte UI-Anpassung `cockpit/src/components/settings/MeetingSettingsForm.tsx`
- Expected behavior: 3 Radio-Buttons, Hilfetext "on_click empfohlen fuer Kostenschutz"
- Verification: Klick-Test
- Dependencies: SLC-417

## Acceptance Criteria
1. Button "KI-Agenda generieren" erzeugt Agenda bei erstem Klick, zeigt vorhandene Agenda bei weiteren Oeffnungen
2. Agenda-JSON enthaelt alle 4 Felder: `last_communication, open_points, decision_makers, suggested_goal`
3. `meeting_agenda_mode='auto'` erzeugt Agenda X Stunden vor Meeting automatisch (im Reminder-Cron)
4. `meeting_agenda_mode='off'` → API-Call gibt 400 zurueck, Button disabled in UI
5. Typische Agenda-Kosten <0.10 EUR (Token-Log zeigt plausible Werte)
6. Agenda wird nie an externe Teilnehmer versendet (nur intern sichtbar)
7. Re-Generate-Button erzeugt frische Agenda (neuer Bedrock-Call)
8. Audit-Log `ai_agenda_generated` geschrieben

## Dependencies
- SLC-411 (MIG-011 fuer `meetings.ai_agenda`, `ai_agenda_generated_at`, `user_settings.meeting_agenda_mode`)
- SLC-417 (Settings-UI + Reminder-Cron fuer auto-Mode)
- Bestehender Bedrock-LLM-Service (SLC-304)

## QA Focus
- **Kosten:** Token-Count geloggt, Retry-Limit 1x bei 5xx
- **Mode-Logik:** `off` → 400, `on_click` → nur bei Klick, `auto` → Cron-generiert
- **Privacy:** Agenda taucht NICHT in externen Reminder-Mails auf (Grep + Test)
- **Idempotenz:** Auto-Mode erzeugt bei existierender Agenda keinen neuen Call
- **JSON-Validation:** Invalid Bedrock-Output → Failed-Status, klare Fehler-UX

## Geschaetzter Aufwand
1-1.5 Tage (UI + API + Cron-Extension)
