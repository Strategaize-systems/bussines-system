# FEAT-804 — Pflichtfelder-Modal beim Stage-Move + KI-Verlustgrund-Vorschlag

## Status

planned (V8)

## Created

2026-05-19

## Why

**BL-455 (HIGH prio, 2026-05-11):** Aktuelles Verhalten beim Stage-Move ist UX-feindlich:

1. User dragged Deal von z.B. "Verhandlung" auf "Verloren"
2. `moveDealToStage` (`cockpit/src/app/(app)/pipeline/actions.ts:381-490`) prueft `STAGE_REQUIRED_FIELDS`
3. Bei fehlenden Pflichtfeldern (z.B. Verlustgrund) wirft die Server-Action `error: 'Pflichtfelder fuer Verloren: Verlustgrund'`
4. Frontend zeigt Toast-Error, der Deal bleibt in der Source-Stage stehen
5. User muss **Edit-Pencil** am Deal oeffnen, Verlustgrund eintragen, dann nochmal draggen

Das ist 2 zusaetzliche Schritte fuer eine sehr haeufige Aktion (jeder verlorene Deal). UX-Empfehlung: Modal direkt im Drop-Event oeffnen, Pflichtfelder ausfuellen lassen, dann Stage-Move durchfuehren.

**BL-456 (medium prio, 2026-05-11):** Komplementaer dazu: Verlustgrund-Eingabe haengt oft an, weil der eigentliche Ausloeser in der Activity-History liegt (E-Mail mit Absage, Meeting-Notiz "Budget verschoben"). KI kann das Modal mit einem Vorschlag pre-fuellen, den der User editiert oder bestaetigt.

User-Entscheidung im `/requirements`-Vorlauf 2026-05-19: **BL-455 + BL-456 zusammen** als ein Feature umsetzen (Modal mit KI-Pre-Fill).

## Scope

### In Scope

- **Modal-Komponente** `StageMovePflichtfelderModal`:
  - Oeffnet, wenn `moveDealToStage` Pflichtfelder erkennt UND vor dem Server-Call
  - Zeigt: Deal-Name, Source-Stage → Target-Stage, Pflichtfeld-Eingabe(n), Bestaetigen-Button
  - Bei Bestaetigung: zweiter Server-Action-Call der atomar (a) Pflichtfelder setzt und (b) Stage-Move durchfuehrt
  - Bei Abbruch: Deal bleibt in Source-Stage, kein Toast-Error
- **STAGE_REQUIRED_FIELDS-Pflicht-Set festigen**:
  - Aktuell: "Verloren" verlangt `loss_reason`. Sonstige Stages: weitere Pflichtfelder pruefen in Slice-Planning (z.B. Deal-Wert bei "Won", Skonto bei "Sent")
- **KI-Verlustgrund-Vorschlag** (BL-456):
  - Server-Action `suggestLossReason(deal_id)`: Bedrock-Call mit Activity-History-Snapshot (letzte 10 Activities + letzte 3 E-Mail-Threads) als Prompt-Context
  - Antwort: 1-3 Vorschlaege als kurze Saetze (z.B. "Budget wurde verschoben — Quelle: E-Mail von 2026-05-15")
  - Modal pre-fuellt das Verlustgrund-Textfeld mit dem hoechstgewichteten Vorschlag
  - "Mehrere Vorschlaege"-Dropdown zeigt Alternativen
  - User kann editieren oder uebernehmen
  - Audit-Log: `ki_loss_reason_suggested` mit Deal-ID + akzeptiert/editiert/verworfen
- **Cost-Tracking**: Bedrock-Token-Cost pro Suggestion in `audit_log.metadata.cost_usd` (wie bei anderen KI-Actions)
- **Tests**: Unit-Tests fuer Pflichtfeld-Validation + Modal-State + KI-Suggest-Mock + Audit-Log-Insert

### Out of Scope

- KI-Vorschlag fuer **andere** Pflichtfelder (Deal-Wert, Skonto, etc.) — V8 nur Verlustgrund, weil Activity-History dort die Quelle ist. Andere Felder bleiben User-Eingabe-only
- Re-Train / Provider-Wechsel fuer Suggestion-Modell — Bedrock Claude Sonnet eu-central-1 bleibt wie aktueller Stand
- Bulk-Stage-Move (mehrere Deals auf einmal) — Modal-Pattern ist Single-Deal
- Pflichtfelder dynamisch konfigurierbar pro User — STAGE_REQUIRED_FIELDS bleibt im Code
- Multiplikatoren-Pipeline-Won/Lost-Trigger — siehe BL-454, eigenes V

## Acceptance Criteria

- Drag-Drop von Deal auf "Verloren"-Stage oeffnet Modal vor Server-Call
- Modal zeigt KI-Vorschlag im Verlustgrund-Feld, sofern Activity-History min. 1 Item enthaelt
- User kann Vorschlag akzeptieren, editieren oder verwerfen — alle drei Pfade fuehren zu erfolgreichem Stage-Move
- Bei leerer Activity-History oder Bedrock-Error: Modal oeffnet trotzdem mit leerem Pflichtfeld (kein Crash, keine Blockade)
- Audit-Log enthaelt `ki_loss_reason_suggested`-Eintrag pro Suggestion-Call mit Cost-Tracking
- `npm run build` + `npm run lint` + `npm run test` clean (inkl. neuer Tests)
- Live-Smoke: 3 verschiedene Deals auf "Verloren" gedragged, alle 3 Pfade (akzeptiert/editiert/verworfen) durchlaufen

## Open Points

- Anzahl Vorschlaege (1 vs 3) — UI-Entscheidung in Slice-Planning
- Bedrock-Prompt-Template fuer Suggest-Loss-Reason — Architektur-Item (`/architecture`)
- Andere Stage-Pflichtfelder ausser `loss_reason` — Inventur in Slice-Planning gegen `STAGE_REQUIRED_FIELDS`
- Soll Modal-Pattern auch fuer "Won"-Stage funktionieren (z.B. Deal-Wert-Pflicht)? — Design-Frage Slice-Planning

## Related

- BL-455 (Backlog-Item, HIGH prio, 2026-05-11)
- BL-456 (Backlog-Item, medium prio, 2026-05-11)
- `cockpit/src/app/(app)/pipeline/actions.ts:381-490` (`moveDealToStage`)
- `cockpit/src/app/(app)/pipeline/actions.ts:49-50` (WON_STAGE_NAMES / LOST_STAGE_NAMES)
- DEC-211 (Bedrock-Region-Pin eu-central-1)
