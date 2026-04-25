# SLC-522 — Azure-Whisper-Adapter Implementierung (Code-Ready, nicht aktiviert)

## Meta
- Feature: FEAT-522
- Priority: High
- Status: planned
- Created: 2026-04-25

## Goal

`AzureWhisperProvider` voll implementieren auf Basis des `AzureOpenAI`-Clients aus dem bereits vorhandenen `openai`-NPM-SDK (DEC-085). Adapter erfuellt denselben Vertrag wie `OpenAIWhisperProvider`. ENVs sind dokumentiert. `TRANSCRIPTION_PROVIDER` bleibt im Default `openai` — kein Live-Switch in V5.2. Vor Go-Live laesst sich der Provider mit reinem ENV-Wechsel umstellen.

## Scope

- `cockpit/src/lib/ai/transcription/azure.ts` voll implementieren (Stub durch funktionsfaehigen Adapter ersetzen)
- ENV-Konfiguration: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_WHISPER_DEPLOYMENT_ID`, `AZURE_OPENAI_API_VERSION` (Default `2024-06-01`, DEC-086)
- Audit-Log analog OpenAI-Provider (Anbieter, Region, Modell, Request-ID per `data-residency.md`-Regel)
- Konfig-Validierung: bei fehlenden ENVs liefert Adapter strukturierten Fehler (kein Stillschweigen)
- Unit-Tests mit gemocktem AzureOpenAI-Client (Erfolgsfall, Fehlerfall, Timeout, fehlende Konfig)
- `.env.example` und `docker-compose.yml` um die 4 Azure-ENVs als kommentierte Eintraege ergaenzt (mit Hinweis "vor Go-Live setzen")
- Pre-Go-Live-Anleitung in `docs/ARCHITECTURE.md` (3-Schritte-Switch)

## Out of Scope

- Aktivierung von Azure-Whisper in Produktion (separate Pre-Go-Live-Aktion)
- Azure-Account-Beschaffung
- Smoke-Test gegen echte Azure-Endpoint (kein Account in V5.2)
- Aenderung am OpenAI-Provider — bleibt unangetastet
- Anpassung des Whisper-Pipeline-Aufrufs in der Cron-Route oder im Meeting/Call-Pfad — die Factory regelt das

## Acceptance Criteria

- AC1: `AzureWhisperProvider.transcribe(buffer, filename, options)` ruft den AzureOpenAI-Client mit Endpoint, API-Key, Deployment-ID und API-Version korrekt auf
- AC2: Mit `TRANSCRIPTION_PROVIDER=openai` (Default) verhaelt sich das System bit-identisch zu vorher
- AC3: Mit `TRANSCRIPTION_PROVIDER=azure` und allen ENVs gesetzt: Adapter konstruiert Client, Aufruf-Flow ist analog OpenAI
- AC4: Mit `TRANSCRIPTION_PROVIDER=azure` und fehlenden ENVs: Adapter liefert klaren Fehler `"Azure-Konfiguration unvollstaendig: <feldname>"` ohne Stack-Trace
- AC5: Unit-Tests decken ab: Erfolg (Mock liefert Text), Fehler (Mock wirft), Timeout (Mock haengt > 120s), Konfig-Fehler (ENV fehlt)
- AC6: Audit-Log enthaelt einen Eintrag pro Aufruf mit Anbieter `azure`, Modell-ID `whisper`, Region (aus Endpoint extrahiert oder ENV-Hinweis)
- AC7: `.env.example` enthaelt 4 Azure-ENVs mit Kommentar "vor Go-Live setzen"
- AC8: `docker-compose.yml` enthaelt die 4 Azure-ENVs als optionale Eintraege
- AC9: ARCHITECTURE.md V5.2-Section beschreibt den 3-Schritte-Switch (existiert bereits — pruefen + ggf. praezisieren)
- AC10: Kein OpenAI-Code-Pfad ist betroffen — `OpenAIWhisperProvider` ist unveraendert

## Dependencies

- Keine externen Abhaengigkeiten
- Kein anderer V5.2-Slice
- Kann parallel zu SLC-521 starten

## Risks

- **Risk:** AzureOpenAI-Client koennte sich subtil vom OpenAI-Client unterscheiden (z.B. Response-Format, Error-Typen). 
  Mitigation: Tests gegen Microsoft-Doku schreiben, nicht copy-paste vom OpenAI-Pfad. Bei Mismatch: pragmatischer Anpassungs-Layer.
- **Risk:** API-Version `2024-06-01` koennte fuer Whisper-Endpoints einen anderen Sub-Pfad benoetigen als fuer Chat-Endpoints. 
  Mitigation: Microsoft-Doku zur API-Version pruefen; Default ggf. auf eine Whisper-spezifische bekanntermassen funktionierende Version anpassen.
- **Risk:** Ohne echten Azure-Account ist der End-to-End-Pfad in V5.2 nicht verifizierbar. Drift wird erst beim Pre-Go-Live-Switch sichtbar. 
  Mitigation: Tests sind so genau wie moeglich gegen Microsoft-Doku; QA dokumentiert die Limitation.

## Files to Touch

| Pfad | Aenderung |
|------|-----------|
| `cockpit/src/lib/ai/transcription/azure.ts` | Stub durch volle Implementierung ersetzen |
| `cockpit/src/lib/ai/transcription/azure.test.ts` (neu) | Unit-Tests mit Mocks |
| `.env.example` | 4 Azure-ENVs ergaenzen (kommentiert) |
| `docker-compose.yml` | 4 Azure-ENVs ergaenzen (optionale Eintraege) |
| `docs/ARCHITECTURE.md` | Pre-Go-Live-Switch praezisieren (V5.2-Section, falls noetig) |

## QA Focus

- TypeScript-Kompilation gruen
- Unit-Tests laufen gruen (`npm run test` oder `npm run test cockpit/src/lib/ai/transcription/azure.test.ts`)
- Provider-Default verhaelt sich unveraendert (manueller Smoke-Test: Meeting-Transkription oder Call-Transkription bleibt funktional)
- Konfig-Fehlermeldung bei fehlenden ENVs ist verstaendlich
- Audit-Log-Format identisch zu OpenAI-Pfad
- Kein OpenAI-Code-Drift

## Micro-Tasks

### MT-1: AzureWhisperProvider Implementierung
- Goal: Stub durch funktionsfaehigen Adapter ersetzen, AzureOpenAI-Client aus `openai`-NPM-SDK verwenden
- Files: `cockpit/src/lib/ai/transcription/azure.ts`
- Expected behavior: `transcribe(buffer, filename, options)` instanziiert `AzureOpenAI`-Client mit `endpoint`, `apiKey`, `deployment`, `apiVersion` aus ENVs; ruft `client.audio.transcriptions.create(...)`; mappt Result auf `TranscriptionResult`-Type
- Verification: TypeScript kompiliert; manueller Lint
- Dependencies: none

### MT-2: ENV-Validierung + strukturierter Konfig-Fehler
- Goal: Bei fehlenden Azure-ENVs (Endpoint / Key / Deployment-ID) klare Fehlermeldung statt Stack-Trace
- Files: `cockpit/src/lib/ai/transcription/azure.ts` (gleiche Datei wie MT-1, aber separater MT)
- Expected behavior: `AZURE_OPENAI_API_VERSION` hat Default `"2024-06-01"`; alle anderen Pflicht-ENVs werden vor dem Client-Aufruf validiert; Fehler hat `success: false`, `error: "Azure-Konfiguration unvollstaendig: <feldname>"`, kein Stack
- Verification: Manueller Test mit fehlendem `AZURE_OPENAI_ENDPOINT` → strukturierter Fehler im Result
- Dependencies: MT-1

### MT-3: Audit-Log-Eintrag analog OpenAI
- Goal: Audit-Log fuer jeden Azure-Aufruf (Anbieter, Modell, Region, Request-ID, Zeitstempel)
- Files: `cockpit/src/lib/ai/transcription/azure.ts`
- Expected behavior: Audit-Log-Format ist konsistent zu OpenAIWhisperProvider; falls dort keiner existiert, in beiden Adaptern parallel ergaenzen (nur additiv, kein Code-Churn am OpenAI-Adapter)
- Verification: console.info oder bestehender Audit-Pfad zeigt Eintrag bei Test-Aufruf
- Dependencies: MT-1

### MT-4: Unit-Tests mit AzureOpenAI-Mock
- Goal: 4 Test-Szenarien gegen gemockten Client
- Files: `cockpit/src/lib/ai/transcription/azure.test.ts` (neu)
- Expected behavior: Tests fuer (1) Erfolgsfall mit Text-Result, (2) API-Fehler-Fall, (3) Timeout, (4) fehlende ENV-Konfiguration
- Verification: `npm run test` gruen, alle 4 Tests passen
- Dependencies: MT-1, MT-2, MT-3

### MT-5: ENV-Doku in .env.example und docker-compose.yml
- Goal: 4 Azure-ENVs als kommentierte Eintraege fuer schnellen Pre-Go-Live-Switch
- Files: `.env.example`, `docker-compose.yml`
- Expected behavior: Eintraege sind sichtbar dokumentiert mit Hinweis "vor Go-Live setzen, dann `TRANSCRIPTION_PROVIDER=azure`"; haben aber keine Default-Werte ausser `AZURE_OPENAI_API_VERSION=2024-06-01`
- Verification: `grep AZURE_OPENAI .env.example docker-compose.yml` zeigt 4 Eintraege in jeder Datei
- Dependencies: none

### MT-6: Pre-Go-Live-Anleitung in ARCHITECTURE.md praezisieren
- Goal: Existierende V5.2-Section enthaelt 3-Schritte-Switch — pruefen, ggf. praezisieren
- Files: `docs/ARCHITECTURE.md`
- Expected behavior: 3-Schritte-Anleitung ist sichtbar und enthaelt: (1) Azure-Account/Resource/Deployment, (2) Coolify-ENVs setzen, (3) `TRANSCRIPTION_PROVIDER=azure` + Restart
- Verification: Sichtbar in V5.2-Section
- Dependencies: none
