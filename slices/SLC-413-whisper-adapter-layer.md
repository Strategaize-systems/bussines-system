# SLC-413 — Whisper-Adapter-Layer + OpenAI-Provider

## Slice Info
- Feature: FEAT-404
- Priority: High
- Delivery Mode: internal-tool
- Backlog-Mapping: BL-342

## Goal
Adapter-Pattern fuer Speech-to-Text umsetzen (DEC-035, DEC-041): Interface-Abstraktion, OpenAI-Whisper-Implementation als V4.1-Standard, Factory mit ENV-Switch (`TRANSCRIPTION_PROVIDER`), Azure- und Self-hosted-Stubs. Business-Code kennt ausschliesslich das Interface.

## Scope
- `/lib/ai/transcription/provider.ts` — Interface `TranscriptionProvider` + `TranscriptionResult`
- `/lib/ai/transcription/openai.ts` — OpenAI-Whisper-Implementation via `openai` npm
- `/lib/ai/transcription/azure.ts` — Stub-Klasse, wirft `NotImplementedError`
- `/lib/ai/transcription/selfhosted.ts` — Stub-Klasse, wirft `NotImplementedError`
- `/lib/ai/transcription/factory.ts` — ENV-basierte Factory
- Neue Dependencies: `openai` ^4 (falls nicht schon da), ggf. `fluent-ffmpeg` ^2.1 (ffprobe fuer Duration, dient auch SLC-415)
- Unit-Tests fuer Factory (ENV-Mocks, Provider-Auswahl)
- Integration-Test-Script `scripts/test-transcribe.ts` (nimmt lokale MP4, ruft Adapter, zeigt Transkript)
- ENV-Dokumentation aktualisieren (`env vars_business.txt` + `docs/ARCHITECTURE.md`)

## Out of Scope
- Aufruf aus Recording-Pipeline (SLC-416)
- Azure- oder Self-hosted-Implementationen (Stubs reichen)
- Language-Auto-Detect (default `de` in V4.1)
- Streaming-Transcription (Whisper-API ist batch)

## Micro-Tasks

### MT-1: Dependencies
- Goal: `openai` ^4 + `fluent-ffmpeg` ^2.1 installieren, Types aktualisieren
- Files: `cockpit/package.json`, `cockpit/package-lock.json`
- Expected behavior: `npm install` ohne Fehler, `openai` kein Duplikat
- Verification: `npm ls openai` zeigt eine Version
- Dependencies: none

### MT-2: Interface + TranscriptionResult
- Goal: Typ-Safe Interface-Definition
- Files: `cockpit/src/lib/ai/transcription/provider.ts`
- Expected behavior: `transcribe(audio, options)` → `Promise<TranscriptionResult>`, sauber dokumentiert
- Verification: Type-Import in Test-File klappt
- Dependencies: none

### MT-3: OpenAIWhisperProvider
- Goal: Reale OpenAI-Implementation (multipart-upload, language-Default `de`)
- Files: `cockpit/src/lib/ai/transcription/openai.ts`
- Expected behavior: Nimmt Buffer oder URL (dann lesen), schickt an Whisper-API, liefert `TranscriptionResult` inkl. Duration (via ffprobe bei URL-Eingabe)
- Verification: Test-Script mit kurzer MP3 liefert Transkript-Text
- Dependencies: MT-1, MT-2

### MT-4: Azure + Self-hosted Stubs
- Goal: Platzhalter-Klassen, die klare Fehlermeldung werfen
- Files: `cockpit/src/lib/ai/transcription/azure.ts`, `cockpit/src/lib/ai/transcription/selfhosted.ts`
- Expected behavior: Beide werfen `new Error('Provider not implemented in V4.1, see DEC-035')` in `transcribe`
- Verification: Unit-Test prueft Error-Message
- Dependencies: MT-2

### MT-5: Factory
- Goal: ENV-gesteuerte Provider-Auswahl
- Files: `cockpit/src/lib/ai/transcription/factory.ts`
- Expected behavior: `TRANSCRIPTION_PROVIDER=openai|azure|selfhosted`, Default `openai`; Singleton-Pattern (ein Provider-Instance pro Prozess)
- Verification: Unit-Test mit vitest (ENV-Mocks fuer alle 4 Werte inkl. undefined)
- Dependencies: MT-3, MT-4

### MT-6: Integration-Test-Script + ENV-Doku
- Goal: Manuell ausfuehrbares Script `scripts/test-transcribe.ts` + ENV-Dokumentation
- Files: `scripts/test-transcribe.ts`, `env vars_business.txt`
- Expected behavior: `npx tsx scripts/test-transcribe.ts path/to.mp3` gibt Transkript aus
- Verification: Lokale Ausfuehrung mit Sample-MP3 liefert plausibles Deutsch-Transkript
- Dependencies: MT-5

## Acceptance Criteria
1. Interface + `TranscriptionResult` sauber typisiert, keine `any`
2. `getTranscriptionProvider()` liefert OpenAI-Instanz bei Default-ENV
3. `OpenAIWhisperProvider.transcribe(buffer)` liefert Transkript + Duration bei Test-MP3
4. Azure + Self-hosted werfen klare `NotImplementedError`
5. Kein direkter `openai`-Import ausserhalb `/lib/ai/transcription/openai.ts` (grep-Check)
6. `TRANSCRIPTION_PROVIDER` in Coolify-Env dokumentiert mit Default `openai`
7. `npm run build` + Factory-Unit-Tests gruen

## Dependencies
Keine. Reine Library-Arbeit. Aber bevor SLC-416 dran ist, muss dieser Slice fertig sein.

## QA Focus
- **Adapter-Entkopplung:** grep auf `from "openai"` oder `require("openai")` darf nur in `/lib/ai/transcription/openai.ts` auftauchen
- **ENV-Schalter:** Alle 4 ENV-Werte (openai, azure, selfhosted, undefined) getestet
- **Error-Handling:** Whisper 429 → Retry-Signal im Result-Metadata; 5xx → Error propagiert
- **Type-Safety:** kein `any`, kein `unknown` ohne Narrowing
- **Build:** `npm run build` gruen

## Geschaetzter Aufwand
0.75 Tag (reines TypeScript, begrenzter Scope)
