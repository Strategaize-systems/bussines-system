# SLC-871 — V8.7-A KI-Workspace IS-Knowledge-API-RAG-Erweiterung

**Version**: V8.7-A
**Feature**: FEAT-871
**Backlog**: BL-505
**Status**: planned
**Priority**: Medium
**Created**: 2026-06-01

## Purpose

BS-KI-Workspace bekommt **IS-Knowledge-API als zweite, orthogonale RAG-Quelle** (orthogonal zur lokalen BS-Knowledge in `cockpit/src/lib/knowledge/`). V8.7-A ist Read-only Konsument der IS V3.5 Cross-Repo-Bridge (REL-016 + REL-017 2026-06-01). Free-Question-Pfad + 1 Standard-Report (`risiken-einwaende`) im Deal-Detail-Workspace ziehen Strategaize-Foundation-Wissen ein.

Architektur-Entscheidungen verbindlich: DEC-248..258 (Commit `b31ae45`).

## Out-of-Scope

- SLC-355 BS→IS Verdichtungs-Cron — FEAT-872 / V8.7-B, deferred bis nach V8.10 + V8.11 + Anwalt-Sign-off.
- Workspace-Pages ausser Deal-Detail (Mein Tag + KI-Cockpit + Team) — DEC-249, V8.7.1-Polish.
- 4 weitere Standard-Reports (briefing, signale, naechster-schritt, winloss) — DEC-248, V8.7.1-Polish.
- Eigennamen-NER-Redact (komplex) — DEC-250, V8.7.1+.
- Result-Caching der IS-Treffer — DEC-254.
- Health-Endpoint-Nutzung — DEC-251 YAGNI.
- OP V7.6 Workspace-RAG (paralleler Konsument im OP-Repo).
- Neue npm-Packages, Schema-Migration, neue Cron-Jobs.

## Pre-Conditions

- ✅ IS V3.5 live auf `is.strategaizetransition.com` (REL-016 + REL-017 2026-06-01)
- ✅ BS V8.9 STABLE (REL-042, 2026-06-01)
- ⏳ **User-Pflicht beim /deploy**: `STRATEGAIZE_KNOWLEDGE_SERVICE_KEY` in BS-Coolify-ENV setzen (identischer Wert wie IS-Coolify, Quelle `qa/SLC-352-coolify-env-setup.md` im IS-Repo)

## Acceptance Criteria

- **AC-871-1 (DEC-248 Free-Question)**: User stellt freie Frage im Deal-Detail-Workspace → Server-Action ruft IS-Knowledge-Search parallel zu BS-RAG → AnswerPane zeigt Bedrock-Antwort + IS-Treffer-Block mit mindestens 1 Treffer (bei nicht-trivialer Frage gegen 39 Foundation-Items).
- **AC-871-2 (DEC-248 risiken-Report)**: Klick auf "Risiken & Einwaende"-Button im Deal-Detail-Workspace → Report-Runner zieht IS-Knowledge-Hits in den Bedrock-Context.
- **AC-871-3 (DEC-249 Scope)**: Andere Workspaces (Mein Tag, KI-Cockpit, Team-Cockpit) bleiben unveraendert — KEIN IS-Hits-Block, KEIN Footer-Hinweis, KEINE audit_log-Eintraege mit `workspace_page != 'deal-detail'`.
- **AC-871-4 (DEC-250 PII-Redact)**: Frage `"test@example.com Vollmacht-Klausel"` wird VOR IS-Call zu `"[email] Vollmacht-Klausel"` redacted. Frage `"+49 30 12345 Steuerberater"` → `"[phone] Steuerberater"`. Vitest deckt 4-6 Cases ab.
- **AC-871-5 (DEC-252 Soft-Cap)**: Nach 20 erfolgreichen IS-Search-Calls in einer Workspace-Session wird der 21. Call uebersprungen. AnswerPane-Footer zeigt "Strategaize-Wissens-Quote fuer diese Session aufgebraucht (20/20). Frage trotzdem stellen — Antwort basiert nur auf Mandanten-Daten." Free-Question + Reports laufen weiter mit BS-only-Context. Reset bei Tab-Reload.
- **AC-871-6 (DEC-253 Service-Key-Schutz)**: Production-Build hat keinen Service-Key-Leak. `grep "STRATEGAIZE_KNOWLEDGE_SERVICE_KEY" .next/static/` muss 0 Treffer liefern. Optional MT-8 macht das als Vitest-Smoke.
- **AC-871-7 (DEC-256 Graceful-Degradation)**: Drei Fehler-Pfade liefern klare User-Meldung im AnswerPane-Footer und Workspace bleibt funktional:
  - IS 401 → "Strategaize-Wissens-Basis Authentifizierungs-Fehler, bitte System-Admin informieren"
  - IS 429 → "Strategaize-Wissens-Basis kurz ueberlastet, bitte gleich nochmal"
  - IS Timeout/Network/500 → "Strategaize-Wissens-Basis aktuell nicht erreichbar"
- **AC-871-8 (DEC-258 audit_log)**: Bei jedem erfolgreichen IS-Search wird ein audit_log-Eintrag erzeugt: `event_type='is_knowledge_queried'`, `entity_type='is_knowledge_api'`, `entity_id=<workspace-session-uuid>`, `changes_after={workspace_page, consumer:'business-system', query_excerpt (PII-redacted, max 200 chars), cost_usd, item_count, similarity_top, is_response_ms}`. Failure-Pfade erzeugen KEIN audit_log.
- **AC-871-9 (DEC-255 AnswerPane)**: AnswerPane rendert "Aus Strategaize-Wissens-Basis"-Block mit Item-Titel + Similarity-Score als Prozent (z.B. "Pattern X (95%)") sortiert nach Score absteigend. Footer-Hinweis "Diese Antwort nutzt Strategaize-Wissen + Mandanten-Daten" wenn Workspace-Page = Deal-Detail. Wenn Hits leer + kein Error: nur Footer-Hinweis, kein leerer Block.
- **AC-871-10 (Live-Smoke)**: 5/5 Live-Smoke-Pfade gegen `is.strategaizetransition.com` mit echtem Service-Key PASS — Doku in `qa/SLC-871-live-smoke.md`:
  1. Frage mit Vollmacht-Klausel → mind. 1 Hit + audit_log-Eintrag
  2. risiken-einwaende-Report → IS-Context im Bedrock-Aufruf erkennbar (Block sichtbar)
  3. Soft-Cap-Trigger: 21x Frage → 20 Hits + 1 Skip mit Footer-Meldung
  4. PII-Frage `"test@example.com Vollmacht"` → IS audit_log.query_excerpt enthaelt `[email]`, nicht die echte Mail
  5. Service-Key falsch (in BS-ENV testweise korrumpieren) → 401-Pfad gracefully degraded, Workspace funktional
- **AC-871-11 (Vitest)**: Vitest-Suite >= aktuelle Baseline (1152) + min. 12 neue Tests verteilt: Adapter (8) + PII-Redact (4) + audit-Helper (2) + Server-Action-Integration (3) + AnswerPane (2) + Soft-Cap (1). Coolify-DB-Vitest unveraendert (kein RLS-Touch).
- **AC-871-12 (Quality-Gates)**: TSC EXIT=0, ESLint EXACT V8.9-Baseline 142e/57w (oder bessere), `npm run build` clean (80+ static pages + 3 neue API-Routes wenn welche dazu kommen, sonst 80+).

## Pattern Reuse (Pflicht)

Per `feedback_strategaize_pattern_reuse_required` MUSS vor MT-1 die Pattern-Vorlage konsultiert werden:

- **IS `validateServiceKey`-Header-Mechanik** (`strategaize-intelligence-studio/src/lib/api/serviceKeyAuth.ts:81-120`) — Mirror der Auth-Header-Reads (`x-strategaize-service-key` + `x-strategaize-consumer`) plus `timingSafeEqual`-Vergleich auf Provider-Seite. Konsument muss diese 2 Header in jedem Request setzen.
- **IS Rate-Limit-Lib** (`strategaize-intelligence-studio/src/lib/rate-limit.ts`) — als Provider-seitige Grenze. Konsumenten-Side V8.7-A nutzt KEINEN eigenen Rate-Limiter, nur Soft-Cap via sessionStorage (DEC-252).
- **IS ENV-Setup-Doku** (`strategaize-intelligence-studio/qa/SLC-352-coolify-env-setup.md`) — Vorlage fuer `qa/SLC-871-coolify-env-setup.md`. Schritt 2 fuer BS-Coolify analog Schritt 3 fuer OP.
- **BS audit.ts** (`cockpit/src/lib/audit.ts`) — bestehende AuditAction + AuditEntityType erweitern (V5.7 reverse_charge_toggled + V6.2 automation_rule/campaign sind Vorbild fuer additive Erweiterung).
- **BS KIWorkspace.tsx + AnswerPane.tsx** (V6.6 SLC-661..666) — Wrapper-Pattern fuer Server-Action-Wrapping nicht reinventen. Pro-Page-Wrappers in `cockpit/src/components/deals/deal-ki-workspace-wrapper.tsx` sind die Integration-Punkte.
- **BS Existing fetch-Pattern** (`cockpit/src/components/ki-workspace/hooks/useVoiceCapture.ts:fetch('/api/transcribe')` + `cockpit/src/components/knowledge/useKnowledgeQuery.ts`) — Server-Action-Pattern fuer den IS-Call wenn moeglich (statt fetch im Browser). MT-1-Adapter ist Server-Side-only per DEC-253.

## Branch Strategy

**Single-Branch ohne Worktree-Isolation** per `feedback_branch_strategy_section_first_slice` — V8.7-A ist Single-Slice-Version (kein Cumulative-Multi-Slice). Internal-Tool-Mode, kein Conflict-Risk mit parallelen Slices. Branch-Name: `main` direkt (keine Feature-Branch noetig fuer Single-Slice-Internal-Tool). Quality-Gates pre-Commit als Schutz.

Optionaler Worktree (~3 Min Setup) falls dem Developer Sicherheit wichtig ist:
```bash
git worktree add c:/strategaize/strategaize-business-system-slc871 -b slc-871
```
Dann am Ende ff-merge nach `main`. Aber default = direkt auf main.

## Micro-Tasks

### MT-1: IS-Knowledge-API-Konsumenten-Adapter

- **Goal**: Server-Side-only Adapter `cockpit/src/lib/is-knowledge/client.ts` mit zwei Public-Functions `searchKnowledge()` + `getKnowledgeItem()` und `IsKnowledgeError`-Klasse fuer typed Failure-Pfade.
- **Files**:
  - `cockpit/src/lib/is-knowledge/client.ts` (new)
  - `cockpit/src/lib/is-knowledge/types.ts` (new, zod-Schemas + TypeScript-Interfaces fuer Response-Shape inkl. `KnowledgeSearchHit`)
  - `cockpit/src/lib/is-knowledge/__tests__/client.test.ts` (new, 8 Vitest-Cases: happy-path, 401, 429 mit retryAfter, 500, Timeout, Network-Error, Empty-Result, Domain-Filter-Param)
- **Expected behavior**:
  - Header `x-strategaize-service-key: ${process.env.STRATEGAIZE_KNOWLEDGE_SERVICE_KEY}`, `x-strategaize-consumer: business-system`
  - Base-URL aus `STRATEGAIZE_KNOWLEDGE_API_BASE_URL` (default `https://is.strategaizetransition.com`)
  - Timeout 4s via `AbortController` (signal-Param erlaubt Caller-Override)
  - Response zod-validiert gegen `IsKnowledgeSearchResponseSchema`
  - Wirft `IsKnowledgeError` mit `kind` aus `"auth"|"rate_limit"|"timeout"|"server"|"network"` plus optional `retryAfterSeconds` + `status`
  - Bei Erfolg gibt `{ items, query_embedding_cost_usd, total_ms }` zurueck
  - Aufruf `redactPiiFromQ(q)` als ERSTER Schritt (Adapter-intern, DEC-250) — Test verifiziert dass das original-q NIE im fetch-Body landet
- **Verification**:
  - `npm run test -- src/lib/is-knowledge` (8/8 GREEN)
  - `npm run test:tsc` EXIT=0
  - Manual import check: Adapter darf in keinem `"use client"`-File importiert sein
- **Dependencies**: MT-2 (redactPiiFromQ) muss vorher oder parallel laufen — Adapter ruft die Function auf

### MT-2: PII-Redact Pure-Function

- **Goal**: Pure-Function `redactPiiFromQ(q: string): string` die Email + Phone-Pattern transparent ersetzt. Testbar in Isolation.
- **Files**:
  - `cockpit/src/lib/is-knowledge/redact-pii.ts` (new)
  - `cockpit/src/lib/is-knowledge/__tests__/redact-pii.test.ts` (new, 4-6 Vitest-Cases: email-replacement, multiple-emails, phone-replacement, mixed-email-phone, no-pii-unchanged, edge case empty-string)
- **Expected behavior**:
  - Pattern Email: `/\S+@\S+\.\S+/g` → `[email]`
  - Pattern Phone: `/\+?\d{6,}/g` → `[phone]`
  - Operation in dieser Reihenfolge (Email zuerst, damit Phone-Match nicht versehentlich Domain-Numerals trifft)
  - Liefert max. 1000 Chars zurueck (IS akzeptiert max. 1000) — falls Input laenger, truncate nach Redact
  - Eingabe-Whitespace bleibt erhalten
- **Verification**:
  - `npm run test -- src/lib/is-knowledge/__tests__/redact-pii.test.ts` (4-6/4-6 GREEN)
  - Edge-Case in /qa: "wie behandeln wir den Mandanten test@example.com bei +49 30 12345?" → "wie behandeln wir den Mandanten [email] bei [phone]?"
- **Dependencies**: keine

### MT-3: audit.ts Erweiterung + logIsKnowledgeQuery Helper

- **Goal**: `cockpit/src/lib/audit.ts` um `AuditAction = "knowledge_queried"` und `AuditEntityType = "is_knowledge_api"` erweitern. Neuen Helper `logIsKnowledgeQuery()` als Pure-Wrapper-Function.
- **Files**:
  - `cockpit/src/lib/audit.ts` (modify: Type-Union erweitern, Helper-Function appenden)
  - `cockpit/src/lib/__tests__/audit-is-knowledge.test.ts` (new, 2-3 Vitest-Cases)
- **Expected behavior**:
  - `AuditAction` erweitert um literal `"knowledge_queried"`
  - `AuditEntityType` erweitert um literal `"is_knowledge_api"`
  - Helper-Signatur:
    ```typescript
    export async function logIsKnowledgeQuery(params: {
      workspaceSessionId: string;
      workspacePage: 'deal-detail';  // V8.7-A nur Deal-Detail per DEC-249
      queryExcerpt: string;  // PII-redacted, max 200 chars
      costUsd: number;
      itemCount: number;
      similarityTop: number | null;  // null falls 0 Hits
      isResponseMs: number;
    }): Promise<void>;
    ```
  - Schreibt Insert via existierender `audit()`-Hauptfunktion (oder direkt Supabase-Insert wenn `audit()` nicht passt) mit Schema aus DEC-258
- **Verification**:
  - `npm run test -- audit-is-knowledge` (2-3/2-3 GREEN)
  - `npm run test:tsc` EXIT=0
- **Dependencies**: keine (audit.ts existiert)

### MT-4: Server-Action-Wrapping fuer Free-Question + risiken-Report

- **Goal**: Free-Question-Pfad im Deal-Detail-Workspace + `risiken-einwaende`-Report-Runner rufen IS-Search parallel zu BS-RAG auf. Promise.allSettled-Pattern, Graceful-Degradation.
- **Files**:
  - `cockpit/src/lib/ki-workspace/reports/risiken.ts` (modify: optional IS-Knowledge-Hits in Context)
  - `cockpit/src/lib/ki-workspace/free-question.ts` (new oder modify, je nach existierender Architektur — pruefen in /backend ob Free-Question schon einen dedizierten Runner hat oder im KIWorkspace.tsx inline ist)
  - `cockpit/src/lib/ki-workspace/__tests__/risiken-is-integration.test.ts` (new, 2-3 Vitest-Cases: parallel-fetch happy, IS-failure-bs-only-fallback, soft-cap-exceeded)
- **Expected behavior**:
  - `Promise.allSettled([bsRagPromise, isSearchPromise])` — beide laufen parallel
  - IS-Hits werden in den Bedrock-Context als zweiter Block eingebettet (max 5 Hits)
  - Bei IS-Failure: `isKnowledgeError = error.message`, Bedrock-Call mit BS-only-Context
  - Return-Shape `{ answer: string, isKnowledgeHits: IsKnowledgeHit[], isKnowledgeError: string | null }`
  - audit_log-Eintrag via MT-3 Helper bei erfolgreichem IS-Call
  - Soft-Cap-Counter (MT-6) wird VOR dem Call gecheckt — wenn ueber 20, IS-Call uebersprungen, kein audit_log, `isKnowledgeError = "soft_cap_reached"`
- **Verification**:
  - Vitest: parallel-fetch happy, IS-failure-bs-only, soft-cap-exceeded
  - Manual /backend Smoke: Free-Question im Deal-Detail-Workspace → Network-Tab zeigt parallelen Call zu IS + BS
- **Dependencies**: MT-1 (Adapter), MT-3 (audit-Helper), MT-6 (Soft-Cap-Counter)

### MT-5: AnswerPane Hits-Block + Footer-Hinweis

- **Goal**: `AnswerPane.tsx` rendert neuen Hits-Block + Footer-Hinweis fuer V8.7-A.
- **Files**:
  - `cockpit/src/components/ki-workspace/AnswerPane.tsx` (modify)
  - `cockpit/src/components/ki-workspace/__tests__/AnswerPane-is-knowledge.test.tsx` (new oder existing erweitern, 2 Vitest-Cases — wenn jsdom existing fehlt, dann Pure-Render-Helper extrahieren per `feedback_pure_helper_extraction_for_jsdom_free_tests`)
- **Expected behavior**:
  - Props-Erweiterung: `{ isKnowledgeHits?: IsKnowledgeHit[]; isKnowledgeError?: string | null; showIsFooter?: boolean }`
  - Rendert Hits-Block "Aus Strategaize-Wissens-Basis" UNTER der Haupt-Antwort wenn `isKnowledgeHits.length > 0`
  - Items als Liste: `<title> (<similarity in %>)` sortiert by similarity desc
  - Bei `isKnowledgeError !== null`: rendert error-Meldung statt Hits-Liste (verschiedene Texte pro `kind` aus DEC-256)
  - Footer-Hinweis "Diese Antwort nutzt Strategaize-Wissen + Mandanten-Daten" wenn `showIsFooter === true` (= Workspace-Page in DEC-249 Scope = Deal-Detail)
  - Leere Hits + kein Error: nur Footer-Hinweis, kein leerer Block
- **Verification**:
  - Vitest: Hits-Block-Render, Error-Render
  - Manual /backend Smoke im Browser: Frage im Deal-Detail → Block sichtbar mit echten IS-Treffern
- **Dependencies**: MT-4 (liefert die Props)

### MT-6: Soft-Cap-Counter via sessionStorage

- **Goal**: KIWorkspace.tsx-Erweiterung: tracked IS-Call-Count via `sessionStorage["isKnowledgeCallCount"]`, gibt Counter an Server-Action mit, zeigt UI-Hinweis bei Ueberschreiten.
- **Files**:
  - `cockpit/src/components/ki-workspace/KIWorkspace.tsx` (modify, lean — nur Counter + Conditional-UI)
  - `cockpit/src/components/ki-workspace/__tests__/soft-cap.test.ts` (new, 1 Vitest-Case fuer Counter-Pure-Function falls extrahiert)
- **Expected behavior**:
  - Client-Side `useEffect` liest `sessionStorage.getItem("isKnowledgeCallCount") ?? "0"` beim Mount
  - Bei jedem erfolgreichen Server-Action-Response mit nicht-leeren `isKnowledgeHits`: increment Counter via `sessionStorage.setItem(...)`
  - Bei Counter >= 20 vor naechstem Server-Call: setze Flag `isSoftCapReached=true`, Server-Action-Aufruf laeuft trotzdem aber MIT `softCapReached=true` Hint, IS-Call wird in MT-4 uebersprungen
  - AnswerPane-Footer zeigt "Strategaize-Wissens-Quote fuer diese Session aufgebraucht (20/20). Frage trotzdem stellen — Antwort basiert nur auf Mandanten-Daten."
  - Reset bei Tab-Reload (sessionStorage clear bei Tab-Close)
  - Pure-Function `shouldSkipIsCall(count: number, cap: number): boolean` extrahieren in `cockpit/src/lib/is-knowledge/soft-cap.ts` fuer Vitest-Testbarkeit ohne jsdom (per `feedback_pure_helper_extraction_for_jsdom_free_tests`)
- **Verification**:
  - Vitest: shouldSkipIsCall-Helper (1-2 Cases)
  - Manual: 21x Frage stellen → 21. zeigt Footer-Meldung
- **Dependencies**: MT-4 (uebergibt softCapReached an Server-Action)

### MT-7: ENV-Setup-Doku + Live-Smoke-Spec

- **Goal**: 2 Docs schreiben fuer User-Pflicht beim /deploy + Live-Smoke-Pfaden fuer /qa.
- **Files**:
  - `qa/SLC-871-coolify-env-setup.md` (new) — Schritt-fuer-Schritt: Service-Key generieren (oder aus IS-Coolify kopieren), in BS-Coolify-ENV setzen, Redeploy, Verify per SSH
  - `qa/SLC-871-live-smoke.md` (new) — 5 Pflicht-Pfade aus AC-871-10
- **Expected behavior**:
  - ENV-Setup analog `strategaize-intelligence-studio/qa/SLC-352-coolify-env-setup.md` Schritt 3 (OP) — nur mit BS-Container-Namen + Image-Tag-Verifikation
  - Live-Smoke 5 Pfade mit konkreten curl-Beispielen oder Browser-Smoke-Schritten
- **Verification**:
  - User liest beide Files vor /deploy + /qa
- **Dependencies**: keine (Doku unabhaengig vom Code)

### MT-8 (OPTIONAL): Build-Time Service-Key-Leak-Check

- **Goal**: Vitest-Smoke-Test der nach `npm run build` greppt ob `STRATEGAIZE_KNOWLEDGE_SERVICE_KEY` in `.next/static/` enthalten ist.
- **Files**:
  - `cockpit/__tests__/build/service-key-leak-check.test.ts` (new, 1 Vitest-Case)
- **Expected behavior**:
  - Test liest alle Files in `.next/static/` rekursiv
  - `expect(content).not.toMatch(/STRATEGAIZE_KNOWLEDGE_SERVICE_KEY/)` — auch nicht als String-Literal
  - Test ist OPT-IN — nur ausgefuehrt wenn `.next/static/` existiert (skipped lokal wenn nie gebaut)
- **Verification**:
  - `npm run build && npm run test -- service-key-leak-check` (1/1 GREEN nach Build)
- **Dependencies**: MT-1 (Adapter existiert) + Build muss vorher gelaufen sein

## TDD-Policy

Per `tdd.md` Rule + Internal-Tool-Mode = "Recommended, not Mandatory":

- **TDD MANDATORY** fuer:
  - MT-1 Adapter (8 Vitest-Cases erst, dann Code)
  - MT-2 redactPiiFromQ (4-6 Cases erst, dann Code)
  - MT-3 audit-Helper (2-3 Cases erst, dann Code)
  - MT-6 Soft-Cap Pure-Function (1-2 Cases erst, dann Code)
- **TDD RECOMMENDED** fuer:
  - MT-4 Server-Action (Integration-Tests mit Mocks)
  - MT-5 AnswerPane (Pure-Render-Helper testbar; voll-jsdom-Tests skipped per `feedback_pure_helper_extraction_for_jsdom_free_tests`)
- **TDD NOT APPLICABLE** fuer:
  - MT-7 Docs (Markdown-Only)
  - MT-8 wenn ausgefuehrt: Vitest IS der Test

RED → GREEN → REFACTOR-Zyklus per MT erwartet.

## Notable Risks

- **R-1 (Medium)**: Server-Key-Leak bei versehentlicher Client-Component-Importation des Adapters. **Mitigation**: DEC-253 Server-Side-only Pflicht + Optional MT-8 Build-Time-Grep-Test.
- **R-2 (Low)**: IS-API-Latenz erhoeht Workspace-Antwort-Zeit (worst-case 4s Timeout). **Mitigation**: `Promise.allSettled` parallel zu BS-RAG, Workspace bleibt responsive. Bei Sub-Second-Latenz-Bedarf: V8.7.1-Polish kann Result-Cache einfuehren.
- **R-3 (Low)**: PII-Regex erzeugt False-Positives (z.B. Domain-Namen mit `.` als Email matched). **Mitigation**: Pattern bewusst breit gewaehlt — False-Positives sind ungefaehrlich (verlieren etwas Search-Quality), False-Negatives waeren DSGVO-Risiko. V8.x kann verfeinern.
- **R-4 (Low)**: Service-Key-Sync-Drift zwischen IS-Coolify und BS-Coolify (Rotation falsch durchgefuehrt). **Mitigation**: ENV-Setup-Doku MT-7 mit explizitem Rotation-Procedure analog IS qa/SLC-352-coolify-env-setup.md.
- **R-5 (Low)**: IS Rate-Limit 100/min Consumer-wide. Bei 5+ parallelen Workspace-Sessions koennte das erreicht werden. **Mitigation**: Soft-Cap 20/Session limitiert pro User. Production-Risk minimal in Single-User-Founder-Phase.

## Verification Plan

Quality-Gates pre-Commit pro MT (oder Bundle wenn dependent):

1. `npm run test:tsc` EXIT=0
2. `npm run lint` keine neuen Errors gegen V8.9-Baseline 142e/57w
3. `npm run test` Suite >= 1152 + min. 12 neue Tests (AC-871-11)
4. `npm run build` clean
5. Manual-Code-Audit: kein `"use client"`-File importiert Adapter

Nach allen MTs:

6. `/qa SLC-871` Code-Side Review (Cross-File-Konsistenz + Stub-Scan + Pattern-Reuse-Audit + Wiring-Sanity-Chain)
7. User-Pflicht-Step: `STRATEGAIZE_KNOWLEDGE_SERVICE_KEY` in BS-Coolify setzen
8. Coolify-Redeploy
9. Live-Smoke 5/5 Pfade per `qa/SLC-871-live-smoke.md`
10. `/post-launch V8.7-A` nach Burn-In

## Next Step

**HANDOFF** per User-Direktive 2026-06-01 (Context-Druck elevated nach langer Session). `/backend SLC-871` startet in frischer Session.

Resume-Pointer fuer naechste Session: dieser File + Commit-Hash `<wird beim Commit gesetzt>` + Architektur-Commit `b31ae45` (DEC-248..258).
