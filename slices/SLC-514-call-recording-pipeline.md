# SLC-514 — Call-Recording-Pipeline

## Meta
- Feature: FEAT-513
- Priority: High
- Status: planned
- Created: 2026-04-22

## Goal

Nach Gespraechsende: WAV-Datei automatisch erkennen, in Supabase Storage hochladen, durch Whisper transkribieren, durch Bedrock zusammenfassen, als Call-Activity in Deal-Timeline anzeigen. Retention-Cron fuer automatische Loeschung.

## Scope

- /api/cron/call-processing Endpoint (alle 2 Min)
- WAV-Datei-Erkennung im /recordings-calls/ Volume
- Upload nach Supabase Storage (Bucket: call-recordings)
- Whisper-Transkription ueber bestehenden Adapter
- Bedrock-Summary mit Call-spezifischem Prompt
- Activity-Insert (type='call', source_type='call')
- Retention-Erweiterung: bestehender recording-retention Cron loescht auch Calls
- Call-Detail im Deal-Workspace: Transkript + Summary anzeigbar
- Coolify Cron-Job Setup

## Out of Scope

- Click-to-Call UI (SLC-513)
- SMAO-Adapter (SLC-515)
- Audio-Format-Konvertierung (WAV direkt an Whisper)
- Opus-Encoding (spaetere Optimierung)

## Acceptance Criteria

- AC1: Nach Gespraechsende wird WAV automatisch erkannt (Cron alle 2 Min)
- AC2: WAV wird in Supabase Storage hochgeladen (Bucket: call-recordings)
- AC3: calls.recording_url zeigt auf Storage-Pfad
- AC4: Whisper transkribiert WAV → calls.transcript gesetzt
- AC5: Bedrock generiert strukturierten Summary → calls.ai_summary gesetzt
- AC6: Activity (type='call') erscheint in Deal-Timeline mit Summary-Text
- AC7: Call-Detail zeigt Transkript + Summary (aufklappbar oder eigene Ansicht)
- AC8: calls.duration_seconds wird korrekt aus WAV-Header/ffprobe berechnet
- AC9: Retention-Cron loescht Call-Recordings nach RECORDING_RETENTION_DAYS
- AC10: Coolify Cron-Job fuer call-processing ist eingerichtet (*/2 * * * *)

## Dependencies

- SLC-511 (calls-Tabelle + Storage Bucket)
- SLC-512 (Asterisk mit MixMonitor-Aufnahmen)
- SLC-513 (Calls mit recording_status='pending' in DB)

## Risks

- WAV-Dateigroesse: ~10 MB/Min. 30-Min-Call = 300 MB Upload. Supabase Storage limit pruefen.
- Whisper-Latenz: 5-10 Min Call ≈ 30-60s Transkription. Akzeptabel.
- Bedrock-Prompt fuer Calls vs. Meetings: Call-Summaries sind kuerzer und fokussierter. Eigener Prompt noetig.

## Micro-Tasks

### MT-1: Call-Processing Cron-Endpoint
- Goal: /api/cron/call-processing Route die pending Calls verarbeitet
- Files: `cockpit/src/app/api/cron/call-processing/route.ts`
- Expected behavior: Findet WAV-Dateien im Volume, matched zu calls-Tabelle, Upload → Storage
- Verification: Test-WAV-Datei wird korrekt hochgeladen, calls.recording_url gesetzt
- Dependencies: none (SLC-511 fuer Tabelle)

### MT-2: Whisper-Integration fuer Calls
- Goal: Bestehenden Whisper-Adapter fuer Call-WAVs nutzen, transcript in calls-Tabelle speichern
- Files: `cockpit/src/app/api/cron/call-processing/route.ts` (erweitern)
- Expected behavior: Nach Upload wird Whisper aufgerufen, calls.transcript + transcript_status gesetzt
- Verification: calls.transcript enthaelt Text nach Verarbeitung
- Dependencies: MT-1

### MT-3: Bedrock Call-Summary
- Goal: Eigener Summary-Prompt fuer Telefonate, strukturierter Output in calls.ai_summary
- Files: `cockpit/src/lib/ai/bedrock/call-summary.ts`, `cockpit/src/app/api/cron/call-processing/route.ts` (erweitern)
- Expected behavior: Summary mit {outcome, action_items[], next_step, key_topics[]} generiert
- Verification: calls.ai_summary enthaelt strukturierten JSON-Output
- Dependencies: MT-2

### MT-4: Activity-Insert + Timeline-Rendering
- Goal: Activity (type='call') bei Summary-Completion, Timeline zeigt Call-Summary
- Files: `cockpit/src/app/api/cron/call-processing/route.ts` (erweitern), Deal-Workspace Timeline-Komponente
- Expected behavior: Activity-Eintrag mit source_type='call', Timeline zeigt Dauer + Summary-Preview
- Verification: Activity existiert in DB, Timeline rendert Call-Eintraege
- Dependencies: MT-3

### MT-5: Retention-Erweiterung + Coolify-Cron
- Goal: Bestehender recording-retention Cron loescht auch Call-Recordings. Neuer Coolify-Cron fuer call-processing.
- Files: `cockpit/src/app/api/cron/recording-retention/route.ts` (erweitern)
- Expected behavior: Calls aelter als RECORDING_RETENTION_DAYS werden geloescht (Storage + Status)
- Verification: Test mit altem Call: recording_status='deleted', Storage-Objekt weg. Coolify-Cron laueft.
- Dependencies: MT-1
