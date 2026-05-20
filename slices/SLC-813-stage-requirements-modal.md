# SLC-813 — Stage-Requirements-Modal + KI-Verlustgrund-Vorschlag (FEAT-804)

## Metadata
- **Slice ID:** SLC-813
- **Version:** V8
- **Feature:** FEAT-804 Pflichtfelder-Modal beim Stage-Move + KI-Verlustgrund-Vorschlag
- **Backlog:** BL-455 (HIGH) + BL-456
- **Status:** planned
- **Priority:** High (BL-455 HIGH-prio, behebt UX-Friction auf haeufigster Stage-Move-Aktion)
- **Created:** 2026-05-20
- **Estimated Effort:** ~3-5h Code + ~45 Min /qa + Live-Smoke = ~4-6h Gesamt-Session
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** **EMPFOHLEN** (groesster V8-Block, neuer Bedrock-Pfad + neue Modal-Component + Pipeline-View-Touch, Rollback-Bedarf realistisch)
- **Pattern-Reuse:**
  - Modal-Component-Pattern aus shadcn/ui Dialog + V7.5 `apply-confirm-modal.tsx`-Struktur (Confirm-Button + Cancel + Inhaltsbereich)
  - Server-Action-Pattern mit `assertNotReadOnlyContext()` als first line aus V7.1 SLC-704/707 (ISSUE-064 Style-Policy)
  - Bedrock-Prompt-Strict-JSON-Pattern aus V7.5 SLC-752 `sculptor-cost.ts` + `nl-sculpt-prompt.ts`
  - Audit-Log-Cost-Tracking aus V7.6 SLC-762 `custom_report.executed`-Pattern (`context.cost_usd` JSON-field)
- **Reihenfolge-Empfehlung:** SLC-813 DRITTER in V8 nach SLC-812 + SLC-811 (DEC-226). Groesster Block, profitiert von schon abgeschlossenem KI-Naming + Settings-Refactor.

## Why

BL-455 (HIGH prio, 2026-05-11): Aktuelles Verhalten beim Stage-Move ist UX-feindlich: bei fehlenden Pflichtfeldern wirft `moveDealToStage` Toast-Error und User muss Edit-Pencil-Umweg gehen (Modal mit Pflichtfeld-Input + Stage-Change ist 1 Schritt, aktuell 3 Schritte). BL-456 (medium prio): Verlustgrund-Eingabe haengt oft, weil Ausloeser in Activity-History liegt — KI kann Modal mit Vorschlag pre-fuellen.

Architektur-Entscheidungen aus V8 /architecture (RPT-478):
- **DEC-220** Bedrock-Prompt-Template strict JSON, deutsch, Activity + E-Mail-Context, 1-3 Vorschlaege, Empty-History-Fallback
- **DEC-222** Modal generisch fuer alle 5 STAGE_REQUIRED_FIELDS-Stages, KI-Suggest nur fuer "Verloren"
- **DEC-225** Keine Schema-Migration, KI-Suggest-Audit via existierende `audit_log.context` (TEXT-JSON)

Code-Inspektion-Befunde:
- STAGE_REQUIRED_FIELDS in `pipeline/actions.ts:330-351` hat 5 Stages: "Angebot vorbereitet" (value), "Angebot offen" (value), "Verhandlung / Einwände" (value + contact_id), "Gewonnen" (value), "Verloren" (won_lost_reason)
- `moveDealToStage` (`actions.ts:400-490`) prueft requirements, wirft `{ error: "Pflichtfelder fuer ..." }` bei missing
- `WON_STAGE_NAMES = ["Gewonnen"]`, `LOST_STAGE_NAMES = ["Verloren", "Inaktiv / disqualifiziert"]`
- Audit-Log-Pattern bereits in `updateDealValue` (Zeile 383-392)

## Scope

**In Scope:**

### StageRequirementsModal-Component (NEU)

- **Datei**: [cockpit/src/components/pipeline/stage-requirements-modal.tsx](cockpit/src/components/pipeline/stage-requirements-modal.tsx) NEU
- **Props**:
  ```typescript
  interface StageRequirementsModalProps {
    open: boolean;
    dealId: string;
    dealTitle: string;
    oldStageName: string;
    newStageId: string;
    newStageName: string;
    requirements: { fields: string[]; labels: Record<string, string> };
    currentValues: Record<string, string | number | null>;
    kiSuggest?: { primary: string; alternatives: string[] };
    onConfirm: (values: Record<string, string | number>) => Promise<void>;
    onCancel: () => void;
  }
  ```
- **Rendering**:
  - Modal-Header: `Deal "{dealTitle}" → {newStageName}` (mit Stage-Transition-Pfeil)
  - Section "Pflichtfelder fuer diese Stage": Eingabefelder pro `requirements.fields[i]` mit Label aus `requirements.labels[i]`
  - Feld-Typ-Mapping: `value` → Number-Input EUR-Suffix, `contact_id` → Contact-Selector (Reuse aus Deal-Form), `won_lost_reason` → Textarea (rows=4)
  - Bei `won_lost_reason` + `kiSuggest`: Textarea pre-filt mit `kiSuggest.primary`, Hint "KI-Vorschlag" + Dropdown "Andere Vorschlaege" mit `kiSuggest.alternatives`
  - Bei anderen Pflichtfelder-Stages ohne kiSuggest: Info-Hint "KI-Vorschlag nur fuer Verlustgrund verfuegbar"
  - Buttons: "Verschieben" (Primary, disabled wenn ein Pflichtfeld leer) + "Abbrechen"
- **Tests**: Vitest Component-Tests fuer Render-States (1 Pflichtfeld, 2 Pflichtfelder, mit/ohne kiSuggest, Empty-Suggest)

### suggestLossReason Server-Action (NEU)

- **Datei**: [cockpit/src/app/(app)/pipeline/actions.ts](cockpit/src/app/(app)/pipeline/actions.ts) — neue Server-Action am Ende
- **Signatur**:
  ```typescript
  export async function suggestLossReason(dealId: string): Promise<{
    primary: string;
    alternatives: string[];
    costUsd: number;
  } | null>
  ```
- **Logik**:
  1. `await assertNotReadOnlyContext()` als first line (Pattern aus ISSUE-064/070)
  2. Supabase Query: Deal-Snapshot (title, value, won_lost_reason, pipeline_stages.name)
  3. Letzte 10 Activities (`SELECT type, title, created_at FROM activities WHERE deal_id=$1 ORDER BY created_at DESC LIMIT 10`)
  4. Letzte 3 E-Mail-Threads (`SELECT from_email, subject, snippet, received_at FROM email_messages WHERE deal_id=$1 ORDER BY received_at DESC LIMIT 3`)
  5. Skip-Heuristik: wenn `activities.length === 0 && emails.length === 0` → audit_log status `skipped_empty_context`, return null
  6. `buildLossReasonPrompt(deal, activities, emails)` aus Helper-File
  7. `bedrockClient.invoke(prompt)` mit Model `eu.anthropic.claude-sonnet-4-6` + Cost-Tracking
  8. `parseLossReasonResponse(response)` aus Helper-File (strict JSON parse + suggestions-Array)
  9. INSERT audit_log mit action `ki_loss_reason_suggested`, context JSON: `{ cost_usd, input_tokens, output_tokens, model_id, status: "succeeded" | "parse_error" | "bedrock_error" | "skipped_empty_context", suggestion_count }`
  10. Return `{ primary: suggestions[0].reason + " (Quelle: " + suggestions[0].source + ")", alternatives: suggestions.slice(1).map(s => s.reason + " (Quelle: " + s.source + ")"), costUsd }` oder `null` bei Error

### Bedrock-Prompt-Template + Parser (NEU)

- **Datei**: [cockpit/src/lib/automation/loss-reason-prompt.ts](cockpit/src/lib/automation/loss-reason-prompt.ts) NEU — Pure-Function `buildLossReasonPrompt(deal, activities, emails)` analog `nl-sculpt-prompt.ts`-Pattern
- **Datei**: [cockpit/src/lib/automation/loss-reason-parser.ts](cockpit/src/lib/automation/loss-reason-parser.ts) NEU — `parseLossReasonResponse(jsonString)` mit Zod-Schema-Validation
- **Prompt-Template** (DEC-220):
  ```
  System: Du bist Vertriebs-Analyst eines B2B-Beratungsunternehmens. Auf Basis der Activity-History eines Deals sollst du den wahrscheinlichsten Verlustgrund vorschlagen. Antworte ausschliesslich auf Deutsch und ausschliesslich als JSON.

  User:
  Deal: "${deal.title}" (Wert: ${deal.value} EUR, aktuelle Stage: ${currentStage})

  Activity-History (letzte 10, neueste zuerst):
  ${activities.map(a => `- ${a.created_at} | ${a.type} | ${a.title}`).join("\n")}

  E-Mail-Threads (letzte 3):
  ${emails.map(e => `- ${e.received_at} | von ${e.from_email} | Betreff: ${e.subject} | Snippet: ${e.snippet.slice(0,200)}`).join("\n")}

  Aufgabe:
  Schlage 1-3 wahrscheinliche Verlustgruende vor. Jeder Vorschlag muss kurz (max 1 Satz) sein und eine Quelle angeben (welche Activity oder welche E-Mail). Wenn die History keine klaren Hinweise enthaelt, gib genau 1 Vorschlag "Kein klarer Verlustgrund in der Activity-History erkennbar" zurueck.

  Antwort-Format (strikt):
  {
    "suggestions": [
      { "reason": "...", "source": "..." }
    ]
  }
  ```
- **Token-Budget**: ~500 Input + ~300 Output, Cost ~$0.005-0.01 pro Call
- **Tests**: Vitest +6 Tests: Prompt-Build-Snapshot (deal + 5 activities + 2 emails), Parser-Happy-Path (1 Suggestion), Parser-3-Suggestions, Parser-Parse-Error (JSON broken), Parser-Schema-Violation (missing source-field), Parser-Empty-Suggestion ("Kein klarer Verlustgrund...")

### moveDealToStage Server-Action erweitern

- **Datei**: [cockpit/src/app/(app)/pipeline/actions.ts](cockpit/src/app/(app)/pipeline/actions.ts) `moveDealToStage`
- **Aenderung**: 4. optionaler Parameter `requirementValues?: Record<string, string | number | null>`
- **Logik-Erweiterung**:
  - Wenn `requirementValues` vorhanden:
    1. Merge `{...currentDeal, ...requirementValues}` fuer Pflichtfeld-Validation (statt nur `currentDeal`)
    2. Falls Validation passt: `UPDATE deals SET <requirementValues> WHERE id=$1` als erster DB-Call
    3. INSERT audit_log `action: "update"` mit `context: "Pflichtfeld-Set bei Stage-Move: " + requirementValues-Keys` (analog updateDealValue-Pattern)
    4. Weiter mit bestehender Stage-Move-Logik
  - Wenn `requirementValues` nicht vorhanden: bestehender Pfad unveraendert (Backward-Compatibility)
- **Tests**: Vitest +4 Tests: moveDealToStage mit requirementValues (Happy Path), mit requirementValues aber unzureichend (Fehler), mit requirementValues + DB-Error in Pflichtfeld-Phase (Stage-Move abgebrochen), ohne requirementValues (Regression).

### Drop-Event-Wiring in pipeline-view

- **Datei**: [cockpit/src/app/(app)/pipeline/pipeline-view.tsx](cockpit/src/app/(app)/pipeline/pipeline-view.tsx) (oder dort wo `onDragEnd` lebt)
- **Aenderung**: `onDragEnd`-Handler bekommt Pre-Move-Check:
  ```typescript
  const requirements = STAGE_REQUIRED_FIELDS[targetStageName];
  if (requirements) {
    const missing = requirements.fields.filter(f => isEmpty(deal[f]));
    if (missing.length > 0) {
      let kiSuggest = undefined;
      if (targetStageName === "Verloren" && missing.includes("won_lost_reason")) {
        kiSuggest = await suggestLossReason(dealId);
      }
      setStageRequirementsModalState({
        open: true,
        dealId, dealTitle: deal.title,
        oldStageName, newStageId, newStageName: targetStageName,
        requirements,
        currentValues: pick(deal, requirements.fields),
        kiSuggest
      });
      return;
    }
  }
  await moveDealToStage(dealId, newStageId, targetStageName);
  ```
- **Modal-State** als lokaler `useState` im pipeline-view.tsx
- **onConfirm-Callback**: ruft `moveDealToStage(dealId, newStageId, newStageName, values)` (mit requirementValues-Parameter)
- **STAGE_REQUIRED_FIELDS-Konstante**: client-side Spiegel-Konstante notwendig (oder exportieren aus actions.ts wenn moeglich). **Decision in Implementation**: Export aus actions.ts (kein client-server-Drift)

**Out of Scope:**

- KI-Vorschlag fuer **andere** Pflichtfelder (Deal-Wert, Skonto) — V8 nur Verlustgrund (DEC-222)
- Re-Train / Provider-Wechsel fuer Suggest-Modell — Bedrock Claude Sonnet eu-central-1 bleibt (DEC-211)
- Bulk-Stage-Move (mehrere Deals auf einmal) — Modal-Pattern ist Single-Deal
- Pflichtfelder dynamisch konfigurierbar pro User — STAGE_REQUIRED_FIELDS bleibt hardcoded
- Multiplikatoren-Pipeline-Won/Lost-Trigger — siehe BL-454, eigenes V
- Accepted/Edited/Rejected-Tracking fuer KI-Suggest (zweiter Audit-Eintrag nach Modal-Confirm) — defer V9 (DEC-225)
- Won-Stage Pre-Fill aus letztem Angebot (proposals.total_gross) — V8.x-Kandidat

## Acceptance Criteria

- **AC1**: Drag-Drop von Deal mit fehlendem `won_lost_reason` auf "Verloren" oeffnet Modal vor Server-Call (kein Toast-Error)
- **AC2**: Modal zeigt KI-Vorschlag im Verlustgrund-Feld wenn Activity-History min. 1 Item enthaelt
- **AC3**: Bei leerer Activity-History UND leerer E-Mail-History oeffnet Modal mit leerem Feld + Info-Hint "KI-Vorschlag mangels Activity-History nicht verfuegbar". audit_log persistiert `status: "skipped_empty_context"`.
- **AC4**: Bei Bedrock-Error/Parse-Error oeffnet Modal mit leerem Feld + Info-Hint, kein Crash. audit_log persistiert `status: "bedrock_error"` oder `"parse_error"`.
- **AC5**: User kann Vorschlag akzeptieren, editieren oder verwerfen — alle drei Pfade fuehren zu erfolgreichem Stage-Move via `moveDealToStage(..., { won_lost_reason: ... })`
- **AC6**: Drag-Drop von Deal mit fehlendem `value` auf "Gewonnen" / "Angebot offen" / "Angebot vorbereitet" oeffnet Modal mit Deal-Wert-Input (Number-EUR), KEIN KI-Suggest, kein Info-Hint "KI nur fuer Verloren"
- **AC7**: Drag-Drop von Deal mit fehlendem `value` UND `contact_id` auf "Verhandlung / Einwände" oeffnet Modal mit 2 Eingabefeldern (Deal-Wert + Kontakt-Selector). Confirm setzt beide atomar.
- **AC8**: Modal-Cancel: Deal bleibt in Source-Stage. Kein DB-Touch, kein audit_log-Eintrag (ausser ggf. KI-Suggest-Insert wenn der bereits gelaufen ist).
- **AC9**: audit_log enthaelt nach Confirm: 1x `ki_loss_reason_suggested` (nur Verloren-Path), 1x `update` (Pflichtfeld-Set), 1x `stage_change`, plus die bestehenden Audit-Side-Effects in `moveDealToStage`.
- **AC10**: `npm run build` clean, `npm run lint` keine neuen Findings, `npm run test` PASS mit mind. +10 neuen Tests (Component-State + Server-Action + Prompt-Parser)
- **AC11**: Live-Smoke: 5 Deals (1 pro Stage mit Pflichtfeld) auf Target-Stage gedraggt, alle Modal-Pfade durchlaufen (1x akzeptiert KI-Vorschlag Verloren, 1x editiert Vorschlag, 1x verworfen Vorschlag, 1x ohne KI bei Gewonnen, 1x mit Contact-Selector bei Verhandlung)

## Micro-Tasks

### MT-1: Bedrock-Prompt + Parser Pure-Functions
- **Goal**: Pure-Function-Helpers fuer Prompt-Build + Response-Parse mit Tests
- **Files**:
  - `cockpit/src/lib/automation/loss-reason-prompt.ts` NEU
  - `cockpit/src/lib/automation/loss-reason-parser.ts` NEU
  - `cockpit/src/lib/automation/__tests__/loss-reason-prompt.test.ts` NEU
  - `cockpit/src/lib/automation/__tests__/loss-reason-parser.test.ts` NEU
- **Expected behavior**: `buildLossReasonPrompt(deal, activities, emails)` returnt komplettes Prompt-String. `parseLossReasonResponse(json)` returnt typed `{ suggestions: [{ reason, source }, ...] }` oder wirft typed Error.
- **Verification**: Vitest 6+ Tests gruen (Snapshot Prompt, Parse-Happy, Parse-3-Sug, Parse-Error, Schema-Violation, Empty-Suggestion-Fallback)
- **Dependencies**: keine

### MT-2: suggestLossReason Server-Action
- **Goal**: Server-Action mit Supabase-Queries + Bedrock-Invoke + Audit-Log
- **Files**:
  - `cockpit/src/app/(app)/pipeline/actions.ts` (Append `suggestLossReason`-Funktion)
  - `cockpit/src/app/(app)/pipeline/__tests__/suggest-loss-reason.test.ts` NEU
- **Expected behavior**: Suggest-Call mit Mock-Bedrock-Response liefert `{ primary, alternatives, costUsd }`. Empty-History returnt `null` + audit_log `skipped_empty_context`. Bedrock-Error returnt `null` + audit_log `bedrock_error`. `assertNotReadOnlyContext` als first line.
- **Verification**: Vitest 5+ Tests gruen (Happy, Empty-Context, Bedrock-Error, Parse-Error, Read-Only-Context-Reject)
- **Dependencies**: MT-1

### MT-3: moveDealToStage requirementValues-Parameter
- **Goal**: 4. optionaler Parameter mit atomarer Pflichtfeld-Set-Phase vor Stage-Move
- **Files**:
  - `cockpit/src/app/(app)/pipeline/actions.ts` `moveDealToStage`
  - `cockpit/src/app/(app)/pipeline/__tests__/move-deal-to-stage.test.ts` NEU oder erweitert
- **Expected behavior**: Mit `requirementValues` setzt erst Pflichtfelder, dann Stage-Move. Audit-Log enthaelt zusaetzlich `update`-Eintrag fuer Pflichtfeld-Set. Backward-compatible: ohne requirementValues-Parameter geht bestehender Pfad.
- **Verification**: Vitest +4 Tests gruen + Live-DB-Test gegen Coolify-Schema mit `won_lost_reason`-NULL-Deal
- **Dependencies**: keine

### MT-4: StageRequirementsModal-Component + Tests
- **Goal**: Modal-Component mit props-driven Rendering, KI-Suggest-Pre-Fill, Alternatives-Dropdown, Cancel/Confirm
- **Files**:
  - `cockpit/src/components/pipeline/stage-requirements-modal.tsx` NEU
  - `cockpit/src/components/pipeline/__tests__/stage-requirements-modal.test.tsx` NEU
- **Expected behavior**: Component rendert basierend auf `requirements`-Prop dynamisch 1-N Eingabefelder. Bei `won_lost_reason` + `kiSuggest`: Pre-Fill + Hint + Dropdown. Bei anderen Stages: Info-Hint "KI nur fuer Verlustgrund". Disabled-State Confirm-Button wenn ein Pflichtfeld leer.
- **Verification**: Vitest +6 Tests gruen (Render 1-Feld, 2-Felder, KI-Suggest pre-filt, ohne KI-Suggest, Confirm-Button-Disabled, Cancel-Pfad)
- **Dependencies**: keine

### MT-5: Drop-Event-Wiring in pipeline-view
- **Goal**: onDragEnd-Handler ruft suggestLossReason + oeffnet Modal mit pre-filled State
- **Files**:
  - `cockpit/src/app/(app)/pipeline/pipeline-view.tsx` (oder dort wo `onDragEnd` lebt)
  - Eventuell STAGE_REQUIRED_FIELDS-Export aus actions.ts pruefen ob client-importierbar (sonst Spiegel-Konstante)
- **Expected behavior**: Drag-Drop auf Stage mit Pflichtfeld-Luecke triggert Pre-Move-Check → bei "Verloren" KI-Suggest → Modal-Open. Modal-Confirm ruft `moveDealToStage(..., requirementValues)`. Modal-Cancel: kein Server-Call.
- **Verification**: Live-Smoke /pipeline mit 5 Test-Deals (siehe AC11)
- **Dependencies**: MT-2, MT-3, MT-4

### MT-6: Build + Lint + Test + Records-Sync
- **Goal**: Vollstaendige Validation
- **Files**:
  - keine Code-Aenderungen
  - `slices/INDEX.md` (SLC-813 status `done`)
  - `features/INDEX.md` (FEAT-804 status `done`)
  - `planning/backlog.json` (BL-455 + BL-456 status `done`)
- **Expected behavior**: `npm run build` clean, `npm run lint` keine neuen Findings, `npm run test` mind. +10 neue Tests gruen
- **Verification**: Lokaler Lauf gruen
- **Dependencies**: MT-1, MT-2, MT-3, MT-4, MT-5

### MT-7: /qa Live-Smoke gegen Worktree-Build + Bedrock-Live-Call
- **Goal**: Live-Smoke der 11 Acceptance Criteria gegen echte Bedrock-Region + Coolify-DB
- **Files**: `reports/RPT-XXX.md`
- **Expected behavior**: /qa-Skill verifiziert AC1-AC11 (5 Drag-Drop-Pfade, audit_log-Trail-Check, Bedrock-Cost-Trail). Real Bedrock-Call mit erwartetem Cost ~$0.005-0.01.
- **Verification**: /qa liefert PASS, RPT angelegt. audit_log enthaelt mind. 1x `ki_loss_reason_suggested`-Eintrag mit cost_usd > 0.
- **Dependencies**: MT-6

## Open Points

- **STAGE_REQUIRED_FIELDS Client-Export-Strategy**: Konstante steht in `actions.ts` (server-only weil "use server"). Optionen: (A) Konstante in `lib/pipeline/stage-required-fields.ts` extrahieren + von beiden Seiten importieren — sauber. (B) Spiegel-Konstante in pipeline-view.tsx — Drift-Risiko. **Empfehlung Implementation: (A)**.
- **Anzahl Vorschlaege im Prompt**: Standard 1-3, Modal rendert primary + Dropdown mit max 2 alternatives. Konkrete Max-Zahl in Implementation festlegen, default 3.
- **kiSuggest-Loading-State** im pipeline-view: KI-Call kann 2-3s dauern. Wahrend dieser Zeit muss UI Feedback geben (Spinner im Source-Drop-Target oder Mini-Toast "KI sucht Verlustgrund-Hinweis ..."). Implementation entscheidet.
- **Contact-Selector-Component fuer `contact_id`-Pflichtfeld**: Reuse aus Deal-Form (`@/components/deals/contact-select.tsx` o.ae.) — Implementation pruefen ob vorhanden.

## Related

- BL-455 (Backlog-Item, HIGH prio, 2026-05-11)
- BL-456 (Backlog-Item, medium prio, 2026-05-11)
- DEC-211 (Bedrock-Region-Pin eu-central-1)
- DEC-220 (V8 Bedrock-Prompt-Template fuer suggestLossReason)
- DEC-222 (V8 Modal-Scope alle 5 Stages, KI-Suggest nur Verloren)
- DEC-225 (V8 keine Schema-Migration)
- FEAT-804 ([features/FEAT-804-pflichtfelder-modal-stage-move.md](features/FEAT-804-pflichtfelder-modal-stage-move.md))
- `cockpit/src/app/(app)/pipeline/actions.ts:330-490` (STAGE_REQUIRED_FIELDS + moveDealToStage)
