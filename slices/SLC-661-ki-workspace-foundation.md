# SLC-661 — KI-Workspace Foundation Component (BL-445, FEAT-661)

## Metadata
- **Slice ID:** SLC-661
- **Version:** V6.6
- **Feature:** FEAT-661 (auch Foundation fuer FEAT-664 + FEAT-665)
- **Status:** planned
- **Priority:** Blocker (Foundation, MUSS zuerst — alle anderen V6.6-Slices bauen drauf auf)
- **Created:** 2026-05-09
- **Estimated Effort:** ~3-4h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped (User-Direktive: Worktree-Push reicht NIE; direkt auf main + Coolify-Redeploy via memory `feedback_slice_deploy_procedure`)
- **Architecture:** DEC-165..168 + DEC-174 + DEC-177
- **Reihenfolge-Pflicht:** **MUSS zuerst** — SLC-662/664/666 verdrahten die Component, ohne SLC-661 sind sie nicht implementierbar

## Goal

Eine reusable `<KIWorkspace>`-Component bauen, die in V6.6 in 3 Caller (Mein Tag, Deal-Detail, Cockpit) wiederverwendet wird. Foundation isoliert ohne Caller getestet — Mock-Reports + Mock-Bedrock-Antwort, keine Live-Bedrock-Calls in dieser Slice. Gleichzeitig die Reports-Registry-Stubs fuer alle 3 Workspace-Typen anlegen, damit SLC-662/664/666 die Server-Actions verdrahten koennen.

## Scope

**In Scope:**
- `cockpit/src/components/ki-workspace/KIWorkspace.tsx` (NEU, generische Component)
- `cockpit/src/components/ki-workspace/types.ts` (Reports-Type, Scope-Type, Context-Discriminator)
- `cockpit/src/components/ki-workspace/AnswerPane.tsx` (Markdown-Renderer + Spinner + "Aktualisieren"-Button)
- `cockpit/src/components/ki-workspace/hooks/useReportRun.ts` (Cache-Wrapper + Server-Action-Aufruf)
- `cockpit/src/components/ki-workspace/hooks/useVoiceCapture.ts` (extrahiert aus pipeline-suche, Whisper-Adapter-Wrapper)
- `cockpit/src/components/ki-workspace/reports/registry.ts` (NEU — `MEIN_TAG_REPORTS`, `DEAL_DETAIL_REPORTS`, `COCKPIT_REPORTS` als Konstanten)
- `cockpit/src/lib/ki-workspace/cache.ts` (NEU — In-Memory-Map, 5-Min-TTL, key=hash(reportId+scope+userId))
- `cockpit/src/lib/ki-workspace/reports/_mock.ts` (NEU — Mock-Server-Action fuer Vitest, returnt deterministischen Markdown nach 200ms)
- Vitest-Suite fuer KIWorkspace + useReportRun + cache (Hook-Logic isolated, kein Bedrock-Live-Call)

**Out of Scope:**
- Echte Server-Actions pro Berichts-Button (kommen in SLC-662/664/666)
- Live-Bedrock-Calls (kein Live-Smoke in dieser Slice — Component allein ist nicht in einer Page eingebaut)
- pipeline-suche-Component-Removal (kommt in SLC-667, der Hook bleibt aber Voice-Foundation)
- SSE-Streaming-UI (BL-451, Backlog)
- V7-role_filter-Property in Reports (DEC-174 — V7-Erweiterung)

## Acceptance Criteria

**AC1:** `<KIWorkspace>` rendert mit Mock-Props (`context="mein-tag"`, `reports=[...]`, `scope={userId:"test"}`, `voiceEnabled=true`): Berichts-Buttons-Reihe oben, Frage-Eingabe-Block in der Mitte (Text-Input + Mikrofon-Button), Antwort-Fenster unten.

**AC2:** Component-Surface entspricht `KIWorkspaceProps` aus DEC-165: `{ context, reports, scope, voiceEnabled }`. Keine zusaetzlichen Konfig-Props.

**AC3:** Klick auf einen Berichts-Button triggert `useReportRun(reportId, scope)` → ruft Server-Action via `serverActionPath` aus dem Report-Konfig auf → AnswerPane rendert Markdown.

**AC4:** Cache-Hit (selber `reportId` + `scope` innerhalb 5 Minuten) rendert direkt ohne Server-Action-Aufruf. Vitest verifiziert Cache-Hit.

**AC5:** "Aktualisieren"-Button im AnswerPane setzt `bypassCache=true` → Re-Bedrock-Call + Cache-Overwrite.

**AC6:** `useVoiceCapture`-Hook ist als reusable Modul implementiert mit Surface `{ isRecording, start, stop, error }`. `stop()` returnt transkribierten Text via Whisper-Adapter.

**AC7:** Reports-Registry exportiert `MEIN_TAG_REPORTS` (5 Items), `DEAL_DETAIL_REPORTS` (5 Items), `COCKPIT_REPORTS` (6 Items) wie in DEC-168 spezifiziert. Jedes Report-Item hat `id`, `label`, `serverActionPath`, `cacheable`.

**AC8:** Cache-Modul `cockpit/src/lib/ki-workspace/cache.ts` exportiert `getCached(key)`, `setCached(key, value)`, `invalidate(key)`. Internal Map mit `Date.now()`-basierter 5-Min-TTL. Vitest verifiziert TTL-Ablauf.

**AC9:** Mock-Server-Action `_mock.ts` returnt deterministischen Markdown-Output nach 200ms (Vitest-fast). Nur fuer Tests genutzt, nicht in Production-Bundle.

**AC10:** TSC + Vitest gruen (Vitest +N Tests fuer Component + Cache + Hook). Build clean. Lint keine neuen Errors.

**AC11:** Mobile-Verhalten ≤768px im Storybook-aequivalent (oder ad-hoc-Test): Berichts-Buttons-Reihe horizontal scrollbar, Frage-Eingabe + Antwort-Fenster nehmen volle Breite.

**AC12:** Style Guide V2 Brand-Tokens genutzt (`bg-brand-primary`, `text-brand-foreground`, etc. — kein Hardcoded-Hex).

## Reuse

- Style Guide V2 Brand-Tokens (V6.5, BL-441)
- Whisper-Adapter aus V5.2 (`cockpit/src/lib/whisper/`)
- Bestehende Markdown-Renderer-Library (vermutlich `react-markdown` oder Custom — pruefen waehrend Implementation)
- shadcn-Sheet/Dialog fuer Loading-States (falls vorhanden)
- `cockpit/src/components/pipeline-suche/*` Voice-Capture-Logik als Vorlage fuer `useVoiceCapture` (extrahieren, NICHT importieren)

## Risks

- **R1.1 Voice-Capture-Extraktion:** WebRTC-Audio-Code in pipeline-suche kann eng mit Pipeline-Suche-State gekoppelt sein. **Mitigation:** Hook-Extraktion mit klarem Surface (start/stop/isRecording/error), Pipeline-Suche bleibt in Slice intakt (Removal erst SLC-667).
- **R1.2 Markdown-Renderer-Wahl:** wenn keiner existiert, neuer Dep noetig. **Mitigation:** Pruefen via `grep "react-markdown\|markdown-to-jsx"` BEFORE neue Lib einfuehren. Fallback: dangerouslySetInnerHTML mit DOMPurify (vorhanden im V5.5 PDF-Renderer).
- **R1.3 Cache-Module-Level-Map:** Container-Restart leert Cache. **Mitigation:** akzeptiert (DEC-177), Cache-TTL ist 5min, kein Multi-Container-Setup in V6.6.
- **R1.4 Component-Surface-Drift:** Wenn SLC-662 Mein-Tag-Caller Drift bemerkt, muss Component nachgebessert werden. **Mitigation:** Surface aus DEC-165 ist final, Drift-Risiko durch isolierte SLC-661-Tests minimiert.

## Verification Strategy

- **Pre:** `cockpit/package.json` lesen — pruefen ob Markdown-Renderer existiert. Pipeline-Suche-Component lesen — Voice-Capture-Logik identifizieren.
- **Per-MT:** siehe Micro-Tasks
- **Slice-Level:** TSC + `npm run test` (Vitest +N Tests) + `npm run build` + `npm run lint` (keine neuen Errors). KEIN Live-Smoke noetig in SLC-661 (Component nicht in Page eingebaut).
- **Bedrock-Pfad-Verifikation pro Berichts-Button** (Architecture Open-Question 1): Mock-Server-Action-Stubs fuer alle 16 Berichte (5 Mein-Tag + 5 Deal-Detail + 6 Cockpit) — `serverActionPath` zeigt auf `_mock.ts` bis SLC-662/664/666 die echten Pfade verdrahten.

---

## Micro-Tasks

### MT-1: Types + Reports-Registry
- Goal: `KIWorkspaceContext`, `KIWorkspaceReport`, `KIWorkspaceScope`, `KIWorkspaceProps`-Types + Reports-Registry mit allen 16 Berichts-Konstanten anlegen.
- Files: `cockpit/src/components/ki-workspace/types.ts` (NEU), `cockpit/src/components/ki-workspace/reports/registry.ts` (NEU)
- Expected behavior: TypeScript-Types entsprechen DEC-165 + DEC-168. Registry exportiert 3 Konstanten-Arrays mit korrekten ids/labels/serverActionPaths (Stubs auf `_mock.ts` zeigen).
- Verification: `npx tsc --noEmit` clean. Manuelle Sichtkontrolle der Konstanten gegen DEC-168-Tabelle.
- Dependencies: none

### MT-2: Cache-Modul
- Goal: In-Memory-Cache pro Server-Process, 5-Min-TTL, key-by-hash(reportId+scope+userId).
- Files: `cockpit/src/lib/ki-workspace/cache.ts` (NEU), `cockpit/src/lib/ki-workspace/__tests__/cache.test.ts` (NEU)
- Expected behavior: `getCached(key)` returnt `null` bei Miss/Expired, sonst gespeicherter Value. `setCached(key, value)` schreibt mit `expiresAt = Date.now() + 5*60*1000`. `invalidate(key)` loescht. Vitest-Tests: 1 Cache-Hit, 1 Cache-Miss-After-TTL (vi.useFakeTimers + vi.advanceTimersByTime), 1 Invalidate-Test.
- Verification: `npm run test cache.test.ts` 3/3 PASS.
- Dependencies: MT-1

### MT-3: Mock-Server-Action
- Goal: Test-Mock-Server-Action, die deterministischen Markdown-Output liefert.
- Files: `cockpit/src/lib/ki-workspace/reports/_mock.ts` (NEU)
- Expected behavior: Exportiert `runMockReport({reportId, scope})` returnt `Promise<{markdown, completedAt, model, refreshable: true}>` mit Markdown wie `"# Mock-Report ${reportId}\n\nKontext: ${userId}..."` nach 200ms-Delay (setTimeout). Module nur via Vitest-Imports referenziert, nicht von Production-Pages.
- Verification: Vitest in MT-5/6 nutzt erfolgreich.
- Dependencies: MT-1

### MT-4: useVoiceCapture-Hook (extrahiert aus pipeline-suche)
- Goal: WebRTC-Audio-Capture-Logik aus pipeline-suche-Component als reusable Hook extrahieren.
- Files: `cockpit/src/components/ki-workspace/hooks/useVoiceCapture.ts` (NEU), `cockpit/src/components/ki-workspace/hooks/__tests__/useVoiceCapture.test.ts` (NEU)
- Expected behavior: Hook-Surface `{ isRecording: boolean, start: () => Promise<void>, stop: () => Promise<string>, error: string | null }`. `start()` initialisiert MediaRecorder. `stop()` returnt transkribierten Text via bestehenden Whisper-Adapter (fetch zu `/api/whisper/transcribe` oder Server-Action). Error-Handling fuer denied-Permission. Pipeline-Suche-Component bleibt unangetastet (parallel-existent bis SLC-667).
- Verification: Vitest mit MediaRecorder-Mock (vi.stubGlobal("MediaRecorder", MockClass)). 3 Tests: happy path, denied-permission, network-error. Lint clean.
- Dependencies: MT-1

### MT-5: useReportRun-Hook
- Goal: React-Hook fuer Berichts-Button-Click — Cache-Check + Server-Action-Aufruf via `serverActionPath`.
- Files: `cockpit/src/components/ki-workspace/hooks/useReportRun.ts` (NEU), `cockpit/src/components/ki-workspace/hooks/__tests__/useReportRun.test.ts` (NEU)
- Expected behavior: Hook-Surface `{ run: (report, scope, opts?: {bypassCache?:boolean}) => Promise<ReportResult>, isLoading, error, result }`. `run()` ohne `bypassCache`: Cache-Check via `getCached`. Bei Miss: dynamic import von `report.serverActionPath`, call `runReport(scope)`, `setCached`. Bei Hit: render direkt. `bypassCache=true`: skip Cache-Check, immer Server-Action. Vitest mit Mock-Server-Action.
- Verification: 4 Vitest-Tests: cache-hit, cache-miss, bypass-cache, error-state. Alle PASS.
- Dependencies: MT-1, MT-2, MT-3

### MT-6: AnswerPane-Component
- Goal: Markdown-Renderer + Spinner + "Aktualisieren"-Button.
- Files: `cockpit/src/components/ki-workspace/AnswerPane.tsx` (NEU)
- Expected behavior: Props `{ result?: ReportResult, isLoading: boolean, error?: string, onRefresh?: () => void }`. Im Loading-State: Skeleton/Spinner mit Brand-Token-Color. Bei `error`: rote Alert-Box (Style Guide V2). Bei `result`: Markdown-Output (via vorhandener Renderer-Library oder DOMPurify+dangerouslySetInnerHTML). "Aktualisieren"-Button rechts oben (font-medium text-muted-foreground). Mobile responsive (volle Breite, Scroll auf Overflow).
- Verification: Vitest mit RTL render: assert Spinner bei isLoading, assert Markdown bei result, assert Button-Click triggert onRefresh. Build clean.
- Dependencies: MT-1, MT-5

### MT-7: KIWorkspace-Component (Top-Level)
- Goal: Generische `<KIWorkspace>` Component mit Berichts-Buttons-Reihe + Frage-Eingabe + AnswerPane.
- Files: `cockpit/src/components/ki-workspace/KIWorkspace.tsx` (NEU), `cockpit/src/components/ki-workspace/__tests__/KIWorkspace.test.tsx` (NEU)
- Expected behavior: Props `KIWorkspaceProps`. Layout:
  - Berichts-Buttons-Reihe (mapped aus `props.reports`, `bunt+rund` per Style Guide V2 Brand-Tokens, gleicher Style fuer alle 3 Caller)
  - Frage-Eingabe-Block: Text-Input + Mikrofon-Button (wenn `voiceEnabled`). Mikrofon nutzt `useVoiceCapture`.
  - AnswerPane (Result + Spinner + Refresh)
  - State-Mgmt: `selectedReport`, `inputText`, `isVoiceCapture`. `useReportRun`-Hook fuer Bedrock-Call.
- Verification: 5 Vitest-Tests: render-with-mock-reports, click-button-triggers-run, voice-button-toggles-recording, refresh-button-bypasses-cache, mobile-layout. Lint clean.
- Dependencies: MT-1, MT-4, MT-5, MT-6

### MT-8: Slice-Closing
- Goal: Build/Test/Lint-Gate + Records-Sync.
- Files: `slices/INDEX.md` (V6.6-Section, SLC-661 done), `planning/backlog.json` (BL-445 in_progress), `docs/STATE.md` (Current Focus updaten)
- Expected behavior: SLC-661 Status auf done. BL-445 bleibt in_progress (FEAT-661 ist erst nach SLC-662 done). Atomic Commit `feat(SLC-661/MT-N)`.
- Verification: `npm run build` + `npm run test` + `npm run lint` alle clean. Commit + Push auf main.
- Dependencies: MT-1..MT-7

---

## Definition of Done

- 8 MTs verifiziert (AC-1..AC-12 erfuellt)
- Vitest +14 Tests gruen, Bestehende Suite ohne Regression
- Build + Lint clean
- KEINE Live-Smoke noetig (Component noch nicht in Page eingebaut — verifiziert wird in SLC-662)
- Code committed + gepusht auf main (atomic-commits pro MT)
- /qa als naechster Schritt — fokussiert auf Component-Tests + Reports-Registry-Korrektheit
