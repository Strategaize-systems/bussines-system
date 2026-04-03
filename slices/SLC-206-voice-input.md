# SLC-206 — Voice-Input für Gesprächsnotizen

## Meta
- Feature: BL-141
- Priority: High
- Status: planned
- Dependencies: none

## Goal
Mikrofon-Button im Activity-Form bei Anruf/Meeting. Whisper-Transkription → Text ins Summary-Feld.

## Scope
- Mikrofon-Button im Activity-Form (neben Summary-Textarea)
- Audio-Aufnahme im Browser (MediaRecorder API)
- Server Action: transcribeAudio() via Whisper
- Transkribierter Text wird in Summary-Feld eingefügt
- Recording-Status-Anzeige (rot pulsierend)

## Out of Scope
- Voller Notetaker mit Meeting-Aufnahme (V3 BL-201)
- Automatische Action-Extraktion

### Micro-Tasks

#### MT-1: Whisper API Route
- Goal: Server-Endpoint der Audio-Datei annimmt und transkribiert
- Files: `cockpit/src/app/api/transcribe/route.ts`
- Expected behavior: POST mit Audio → Returns transkribierter Text
- Verification: Build OK
- Dependencies: none

#### MT-2: Mikrofon-Button + Recording UI
- Goal: Button im Activity-Form der Audio aufnimmt und an API sendet
- Files: `cockpit/src/components/activities/activity-form.tsx`
- Expected behavior: Klick → Recording (rot pulsierend) → Stop → Transkription → Text in Summary
- Verification: Build OK
- Dependencies: MT-1
