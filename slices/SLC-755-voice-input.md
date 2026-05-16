# SLC-755 — Voice-Input-Integration (FEAT-751)

## Metadata
- **Slice ID:** SLC-755
- **Version:** V7.5
- **Feature:** FEAT-751 Natural-Language Workflow-Sculptor
- **Status:** planned
- **Priority:** Medium (Convenience-Layer auf Sculpt; Text-Pfad funktioniert ohne diesen Slice)
- **Created:** 2026-05-16
- **Estimated Effort:** ~1-2h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** optional (kleiner Patch, Whisper-Adapter bereits etabliert)
- **Architecture:** Whisper-Adapter aus V4.1 Reuse, openai-Default heute, Azure-EU Code-Ready
- **Reihenfolge-Pflicht:** **nach SLC-753**. Parallel zu SLC-754 + SLC-756 moeglich.

## Goal

Mikro-Button in der NL-Eingabe-Karte aktiv schalten. Audio-Aufnahme via MediaRecorder → POST `/api/whisper-transcribe` → Whisper-Adapter (V4.1 Reuse) → Transkript landet im Text-Feld, ist editierbar vor Sculpt-Klick.

## Scope

**In Scope:**

- **`cockpit/src/app/api/whisper-transcribe/route.ts` (REUSE oder MOD)** — API-Route fuer Audio-Upload + Whisper-Call. Falls bereits in V4.1 oder V6.6 fuer KI-Workspace-Voice-Input existent: 1:1-Reuse. Falls nicht: NEU mit `transcribe(audioBlob)`-Adapter-Call.
- **`cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` (MOD)** — Mikro-Button aktivieren:
  - State: `recording: boolean`, `transcribing: boolean`, `mediaRecorder: MediaRecorder | null`
  - Klick → `navigator.mediaDevices.getUserMedia({audio:true})` → MediaRecorder → audio/webm
  - Stop-Klick → POST audio-Blob an `/api/whisper-transcribe` → Response.text → setze in Textarea-State (editierbar)
- **Vitest:** RTL-Test fuer Mikro-Button-States (idle / recording / transcribing). Whisper-API-Mock.

**Out of Scope:**

- Voice-Output / TTS — V8+
- Multi-Language ueber DE-primary + EN-fallback hinaus — V8+
- Azure-EU-Switch (Pre-Production-Compliance-Gate, ISSUE-042) — bleibt openai-Default in V7.5
- Audio-Persistierung in Storage — nur transient transcribe, kein Save

## Acceptance Criteria

- **AC1** Mikro-Button (in SLC-753 als disabled-Placeholder) ist jetzt aktiv. Click → Browser-Permission-Prompt → Aufnahme startet.
- **AC2** Audio-Aufnahme via MediaRecorder mit `audio/webm` MIME. Stop-Button erscheint waehrend Aufnahme.
- **AC3** Stop-Klick → POST audio-Blob an `/api/whisper-transcribe` → JSON-Response `{text: string}` → setText in Textarea.
- **AC4** Transkript ist **editierbar** vor Sculpt-Klick (Textarea bleibt offen, kein Auto-Submit).
- **AC5** Whisper-Adapter-Reuse: `cockpit/src/lib/speech/whisper-adapter.ts` wird aufgerufen. Provider openai-Default (V4.1-Standard).
- **AC6** Error-Handling: Permission-Denied → User-friendly Error-Message "Mikrofon-Zugriff verweigert. Bitte in den Browser-Einstellungen erlauben." Recording-Error → "Audio-Aufnahme nicht moeglich. Bitte Text-Eingabe nutzen."
- **AC7** Vitest `npm run test:all` ~975 → ~975+2 PASS (2 = Mikro-Button-State + Whisper-API-Mock).
- **AC8** Playwright-MCP-Live-Smoke (im /qa-Step):
  - Login als Admin → /mein-tag
  - Mikro-Klick → Browser-Permission via Playwright `--use-fake-device-for-media-stream` Flag + Fake-Audio-File
  - Stop → Transkript erscheint
  - Sculpt-Klick mit transkribiertem Text → Schema-Karte rendert wie Text-Pfad
  - **Hinweis:** Playwright-MCP-Voice-Smoke ist anspruchsvoll (Browser-Permissions). Falls technisch nicht moeglich: Manual-User-Smoke + Screenshot.

## Micro-Tasks

### MT-0: Whisper-API-Route-Lookup
- **Goal:** Pruefen ob `/api/whisper-transcribe` bereits in V4.1 oder spaeter angelegt wurde (KI-Workspace-Voice-Input, Pipeline-Voice-Search).
- **Files (Review-only):**
  - `cockpit/src/app/api/` (Glob nach `whisper`)
  - `cockpit/src/lib/speech/whisper-adapter.ts` (Reuse-Quelle)
- **Verification:** Route gefunden oder Bedarf fuer NEU klar.
- **Dependencies:** none

### MT-1: API-Route /api/whisper-transcribe (NEU oder Reuse)
- **Goal:** POST `multipart/form-data` mit `audio`-File → Whisper-Call → JSON `{text: string}`.
- **Files:**
  - `cockpit/src/app/api/whisper-transcribe/route.ts` (NEU oder MOD)
- **Expected behavior:**
  ```typescript
  export async function POST(req: Request) {
    const formData = await req.formData();
    const audio = formData.get("audio") as Blob;
    if (!audio) return Response.json({error:"no audio"}, {status: 400});
    const text = await transcribe(audio);
    return Response.json({text});
  }
  ```
  Wenn Route existiert: kein Edit, nur dokumentieren.
- **Verification:** TSC clean. POST mit small-audio-file zurueck-Response `{text}`.
- **Dependencies:** MT-0

### MT-2: Mikro-Button-Component-State
- **Goal:** MediaRecorder-Lifecycle in der NLRuleBuilderCard.
- **Files:**
  - `cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` (MOD)
- **Expected behavior:**
  - State erweitert: `recording`, `transcribing`, `mediaRecorder`, `audioChunks`
  - Mikro-Klick (idle): `getUserMedia` → `new MediaRecorder` → start → setRecording(true)
  - Stop-Klick (recording): mediaRecorder.stop, onstop → POST → setText(response.text) → setRecording(false), setTranscribing(false)
  - Cleanup: useEffect-return revoke streams
- **Verification:** RTL-Test mit `vi.spyOn(navigator.mediaDevices, 'getUserMedia')` + Mock-MediaRecorder. 2 State-Cases.
- **Dependencies:** MT-1

### MT-3: Error-Handling fuer Permission-Denied + Recording-Errors
- **Goal:** User-friendly Toast oder Inline-Error bei Permission-Denied + Browser-MediaRecorder-Failures.
- **Files:**
  - `cockpit/src/components/mein-tag/nl-rule-builder-card.tsx` (MOD von MT-2)
- **Verification:** RTL-Test: getUserMedia rejects → Error-Message visible.
- **Dependencies:** MT-2

### MT-4: /qa Playwright-MCP-Live-Smoke (oder Manual-Smoke)
- **Goal:** End-to-End Voice → Sculpt funktional.
- **Verification:** Screenshot + Transkript-Output dokumentiert.
- **Dependencies:** MT-1..MT-3 done + User-Coolify-Deploy

### MT-5: Cockpit-Records-Sync
- **Goal:** SLC-755 done. FEAT-751 bleibt in_progress (SLC-756 noch offen).
- **Files:**
  - `slices/INDEX.md` (MOD)
- **Dependencies:** MT-4 PASS

## Risks & Mitigations

- **R1** Whisper-Route existiert nicht — **Mitigation:** MT-0 prueft, MT-1 NEU wenn noetig.
- **R2** Playwright-MCP-Browser-Permission-Handling ist tricky (getUserMedia mit Fake-Device-Flag). **Mitigation:** Falls Playwright-Smoke nicht greift, Manual-User-Smoke mit Screenshot reicht als AC8. Browser-API ist out-of-cockpit-Test-Scope; Whisper-Adapter ist gemockt in Unit-Tests.
- **R3** openai-Default-Whisper hat dokumentiertes Compliance-Gate (ISSUE-042). V7.5 macht **keine Customer-Releases** — Internal-Test-Mode-Pattern. Vor Drittnutzer-Customer-Ship: Azure-EU-Switch (out-of-scope V7.5).
- **R4** Audio-Blob-Size: lange Aufnahmen (>30s) → grosse Upload-Payload. **Mitigation:** Architecture-Erwartung "1 Prompt = 1 Sentence", typisch <10s = <500KB. Falls Live-Smoke groesser zeigt: V8+-Optimierung (Chunk-Upload).

## Dependencies

- **V4.1 FEAT-404** Whisper-Adapter
- **SLC-753** NL-Surface (Mikro-Button-Placeholder existiert)

## Verification & Tests

- TSC clean
- Vitest 2 neue Tests gruen
- Live-Smoke MT-4 PASS oder Manual-Smoke + Screenshot

## Open Points

- Playwright-MCP-Voice-Smoke-Machbarkeit — MT-4 zeigt es.

## Files Reviewed (Slice-Planning)

- `cockpit/src/lib/speech/whisper-adapter.ts` (Reuse-Quelle)
- Memory `feedback_voice_input_no_compromise.md` (Voice-Input-Standard)

## Recommended Implementation Skill

`/frontend` fuer MT-0..MT-3 (Component + API-Route).
`/qa` fuer MT-4 Live-Smoke.
