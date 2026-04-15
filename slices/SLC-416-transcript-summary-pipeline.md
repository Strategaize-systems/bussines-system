# SLC-416 — Transkript + Summary-Pipeline

## Slice Info
- Feature: FEAT-404 (Endgame)
- Priority: High
- Delivery Mode: internal-tool
- Backlog-Mapping: BL-345, BL-201 (Teil)

## Goal
Nach erfolgreichem Recording-Upload (SLC-415) automatisch Transkript via Whisper-Adapter (SLC-413) und strukturierten Summary via Bedrock Claude Sonnet 4 erzeugen. Summary landet als Meeting-Activity in der Deal-Timeline (`ai_generated=true`). Editierbarkeit + Retry-Button fuer Fehler. AC-Zeitfenster: Transkript + Summary innerhalb <10 Min nach Meeting-Ende (FEAT-404 AC-7).

## Scope
- Transkript-Trigger: Nach `recording_status='completed'` wird Transkription gestartet (in demselben Cron-Call oder via Follow-up-Endpoint)
- `POST /api/meetings/[id]/retry-transcript` fuer manuellen Retry
- `POST /api/meetings/[id]/retry-summary` fuer manuellen Summary-Retry
- Bedrock-Prompt-Builder: `/lib/ai/bedrock/meeting-summary.ts` mit System-Prompt + JSON-Schema-Anforderung
- Strukturierter Output: `{outcome, decisions[], action_items[], next_step}`
- Activity-Insert: `source_type='meeting'`, `source_id=meetingId`, `ai_generated=true`, `body=ai_summary.outcome`
- Exponential-Backoff: 3 Versuche (10s, 30s, 90s) bei 429/5xx
- Idempotenz: Wiederholter Summary-Call erzeugt keinen Duplicate-Activity-Eintrag (Check `source_id + ai_generated=true`)
- Deal-Workspace UI: Meeting-Detail zeigt Recording-Status, Transkript (editierbar), Summary (Cards fuer Outcome/Decisions/Actions/Next-Step), Retry-Button bei Failed
- Edit-Flag: `activities.user_edited=true` bei manueller Aenderung (oder als `edited_at` Timestamp — tbd in MT-6)

## Out of Scope
- Diarization / Sprecher-Erkennung
- Echtzeit-Transkription
- Cross-Source-Suche im Transkript (FEAT-401, V4.2)
- Action-Item-zu-Task-Konvertierung (V4.3 Queue)

## Micro-Tasks

### MT-1: Bedrock-Prompt-Builder + JSON-Schema
- Goal: Prompt-Template + Zod-Schema fuer `{outcome, decisions[], action_items[], next_step}`
- Files: `cockpit/src/lib/ai/bedrock/meeting-summary.ts`
- Expected behavior: Call liefert validiertes JSON, `outcome` <500 Zeichen, `decisions` als Array, `action_items` als `[{owner?, task}]`
- Verification: Unit-Test mit Sample-Transkript (fester Input), Schema-Validation
- Dependencies: none

### MT-2: Transkript-Trigger-Logik
- Goal: Nach `recording_status='completed'` wird Transkription in separatem Call/Endpoint ausgeloest
- Files: `cockpit/src/app/api/cron/meeting-transcript/route.ts` (oder in recording-poll integriert)
- Expected behavior: Sucht Meetings mit `recording_status='completed' AND transcript_status='pending'`, setzt auf `processing`, ruft Whisper-Adapter, speichert, setzt `completed`/`failed`
- Verification: Manueller Test: Upload-Cron läuft → kurze Zeit später liegt `transcript` in DB
- Dependencies: MT-1 nicht noetig, aber SLC-413 + SLC-415

### MT-3: Summary-Trigger-Logik
- Goal: Nach `transcript_status='completed'` wird Summary erzeugt
- Files: Gleiche Route wie MT-2 oder `cockpit/src/app/api/cron/meeting-summary/route.ts`
- Expected behavior: Liest `transcript` + Deal-Kontext (letzte 14d Activities + Kontakte + Tasks), baut Prompt, ruft Bedrock, parst Output, schreibt `ai_summary`, setzt Status, inserted Activity
- Verification: Manueller Test nach MT-2: Meeting-Activity erscheint in Deal-Timeline mit KI-Badge
- Dependencies: MT-1, MT-2

### MT-4: Retry-Endpoints
- Goal: `POST /api/meetings/[id]/retry-transcript` + `/retry-summary`
- Files: `cockpit/src/app/api/meetings/[id]/retry-transcript/route.ts`, `cockpit/src/app/api/meetings/[id]/retry-summary/route.ts`
- Expected behavior: Auth-check, Status-Reset, erneuter Trigger; Exponential-Backoff wird durch 3 Retries hard-coded im Adapter
- Verification: Failed-Meeting → Retry-Call → Erfolg
- Dependencies: MT-2, MT-3

### MT-5: Idempotenz + Exponential Backoff
- Goal: Summary-Insert prueft existierenden Activity-Eintrag; Adapter-Call hat Retry-Logic
- Files: `cockpit/src/lib/ai/bedrock/meeting-summary.ts`, `cockpit/src/lib/ai/transcription/openai.ts`
- Expected behavior: Retry bei 429/5xx mit 10s/30s/90s; nach 3 Versuchen `failed`; Activity-Insert mit `ON CONFLICT DO NOTHING` oder expliziter Existence-Check
- Verification: Mocked Error-Injection-Test
- Dependencies: MT-2, MT-3

### MT-6: Meeting-Detail UI
- Goal: Transcript + Summary im Deal-Workspace sichtbar + editierbar
- Files: `cockpit/src/components/meetings/TranscriptPanel.tsx`, `cockpit/src/components/meetings/SummaryPanel.tsx`, `cockpit/src/components/meetings/MeetingStatusBadge.tsx`, Integration in `cockpit/src/app/deals/[id]/page.tsx` + `cockpit/src/app/meetings/[id]/page.tsx`
- Expected behavior: Cards fuer Status + Retry-Button bei Failed, Textarea fuer Transcript-Edit, inline-Edit fuer Summary-Felder
- Verification: Klick-Test durch alle Status-Uebergaenge
- Dependencies: MT-4

### MT-7: Activity-Timeline-KI-Badge
- Goal: Timeline zeigt `ai_generated=true` Activities mit klarem Badge
- Files: `cockpit/src/components/activities/ActivityItem.tsx` (existierend, anpassen), evtl. `AIGeneratedBadge.tsx`
- Expected behavior: KI-Badge sichtbar, Tooltip "KI-generierte Meeting-Zusammenfassung"
- Verification: Visueller Check im Deal-Workspace
- Dependencies: MT-3

## Acceptance Criteria
1. Meeting mit `recording_status='completed'` erhaelt automatisch `transcript_status='completed'` und `summary_status='completed'` innerhalb <10 Min
2. `ai_summary` JSON-Struktur enthaelt `outcome, decisions, action_items, next_step`
3. Activity-Eintrag entsteht in Deal-Timeline mit `ai_generated=true`, Body = `outcome`
4. Retry-Button bei `transcript_status='failed'` oder `summary_status='failed'` funktioniert
5. Transkript + Summary manuell editierbar, Edit-Flag sichtbar
6. Exponential Backoff wirkt (Tests oder Log-Check)
7. Idempotenz: Doppelter Summary-Call erzeugt nicht doppelte Activity
8. `npm run build` gruen

## Dependencies
- SLC-413 (Whisper-Adapter)
- SLC-415 (Recording-Upload setzt `recording_status='completed'`)
- MIG-011 aus SLC-411 (`ai_summary`, `transcript_status`, `summary_status`, `activities.ai_generated`)

## QA Focus
- **Zeitfenster-Check:** Meeting mit ~2min Recording → Transkript + Summary <10min
- **Strukturvalidierung:** Bedrock-Output wird mit Zod validiert, invalid → `summary_status='failed'`
- **Idempotenz:** Manueller Retry nach teilweisem Fail erzeugt keinen Duplicate-Activity
- **Edit-Flag:** `user_edited` setzt nur bei echter Aenderung, nicht bei Save-Ohne-Aenderung
- **Kosten:** Summary-Call ist single-call, Prompt-Token-Count geloggt
- **UI:** Failed-State bietet klaren Retry-Weg

## Geschaetzter Aufwand
2-2.5 Tage (Pipeline + UI + Edge-Cases)
