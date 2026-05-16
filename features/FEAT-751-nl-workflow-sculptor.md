# FEAT-751 — Natural-Language Workflow-Sculptor

## Purpose

Klarsprache-Eingabe-Layer auf Mein Tag, der per Bedrock Claude Sonnet eine strikt V6.2-schema-konforme Automation-Regel erzeugt. Reuse von V6.2 `automation_rules`-Tabelle + Dispatcher + Executor + Trockenlauf-Modul. Voice-Input via Whisper-Adapter aus V4.1.

## Why

V6.2 FEAT-621 hat Trigger + Actions + Anti-Loop + Audit komplett funktional, aber der einzige Eingabe-Pfad ist heute ein 4-Step-Click-Wizard auf `/settings/workflow-automation`. Mein-Tag-Workflows wie "Wenn ein Deal in Phase Angebot mehr als 5 Tage unbeantwortet ist, schreib mir das morgens in Mein Tag und schlag eine Follow-up-Mail vor" landen als Gedanken im KI-Workspace, nicht als Regel. NL-Layer ist die fehlende Bruecke. Wettbewerbs-Hebel zusaetzlich (NL-Workflow-UI-Welle Mai 2026: Clay Sculptor, Microsoft Copilot, AI-FIRST.ai). Differenzierung: gemeinsames Programmieren von Regeln zwischen Berater und Klient, nicht autonomes Handeln.

## Scope

### In Scope

- **NL-Eingabe-Karte auf Mein Tag** im KI-Workspace-Bereich (V6.6-Hybrid-Pattern konsistent)
- **Bedrock Sculptor-Adapter** (`cockpit/src/lib/automation/sculptor.ts` — neu) mit strict 1:1 V6.2-Schema-Mapping
- **zod-Schema-Validation** + Reject-Loop max. 2x + `healJsonEscapes`-Reuse aus IS SLC-109
- **Out-of-Domain-Reject** mit strukturiertem Hinweis + Vorschlag eines naechsten V6.2-konformen Trigger-Typs
- **Klarsprache-Karte** (Original-Text + Bedrock-Intent-Echo)
- **Schema-Karte** (editierbar, Form-Felder wie V6.2-Wizard-Step-4)
- **Trockenlauf-Karte** (V6.2 DEC-132-Reuse, "Was waere mit den letzten 7 Tagen passiert?")
- **Pflicht-Klick-Sequenz** "Trockenlauf anzeigen" → "Regel aktivieren" — kein Skip-Modus
- **Apply-Server-Action** `applyNlRule()` persistiert in `automation_rules` mit `status='active'`, `created_by=auth.uid()`
- **Audit-Log-Eintrag** `automation_rule.create_via_nl` mit `nl_input` + `sculptor_model_id` + `sculptor_cost_usd`
- **Voice-Input** Mikro-Button (Whisper-Adapter-Reuse aus V4.1) — Transkript editierbar vor Sculpt-Klick
- **Inspection-Log** auf `/settings/workflow-automation/nl-history` (Admin-only) — letzte 50 Sculpt-Aufrufe mit Cost + Outcome
- **Soft-Dedup im Apply-Pfad** (`assertNotDuplicateRule()`) gegen identische Regel-Doubletten desselben Owners
- **Bedrock-Cost-Display** pro Sculpt-Versuch (on-click, kein Auto-Load)

### Out of Scope

- Neue Trigger-Events ueber V6.2-Whitelist hinaus (`deal.stage_changed`, `deal.created`, `activity.created`)
- Neue Action-Types ueber V6.2-Whitelist hinaus (`create_task`, `send_email_template`, `create_activity`, `update_field`)
- Settings-Workflow-Automation-Page-NL-Integration (Mein-Tag-only)
- Edit-Existing-Rule-via-NL (V7.5 ist NL→neue-Regel)
- Bulk-NL-Input (1-Prompt-=-1-Rule)
- Autonomes Apply ohne Trockenlauf-Bestaetigung
- Free-Form-Schema mit LLM-vorgeschlagenen neuen Typen
- Voice-Output / TTS
- Custom-Sculptor-System-Prompts (User-konfigurierbar)
- Mehrere Sprachen ueber DE-primary + EN-fallback hinaus

## Acceptance Criteria

- **AC-1:** Auf `/mein-tag` ist im KI-Workspace-Bereich (rechts oder unten — `/architecture` bestimmt Position) eine NL-Eingabe-Box sichtbar, fuer Admin + Teamlead, **NICHT fuer Member** (V7.1-Permission-Matrix Workflow-Automation = `(nicht sichtbar)` fuer Member).
- **AC-2:** Text-Input "Wenn ein Deal in Phase Angebot bewegt wird, leg mir eine Follow-up-Task in 2 Tagen an." → Klick "Regel bauen" → Bedrock-Sculpt → Schema-Karte zeigt korrekt:
  - `trigger_event = "deal.stage_changed"`
  - `trigger_config = {stage_id: "<angebot-stage-uuid>"}`
  - `conditions = []` (oder leeres Array)
  - `actions = [{type:"create_task", params:{due_in_days:2, title:"Follow-up zu {{deal.name}}"}}]`
- **AC-3:** Klarsprache-Karte zeigt Echo "Du moechtest folgende Regel: Bei Stage-Wechsel auf 'Angebot' wird eine Follow-up-Task in 2 Tagen erzeugt."
- **AC-4:** Out-of-Domain-Input "Wenn der Kunde mir eine Sprachnachricht schickt..." → strukturierter Reject mit Hinweis "Trigger-Typ 'Sprachnachricht' wird heute nicht unterstuetzt. Vorschlag: stattdessen `activity.created` Type=Anruf nutzen — oder als Backlog-Wunsch fuer V8+ vermerken." Schema-Karte erscheint nicht.
- **AC-5:** Trockenlauf-Klick "Trockenlauf anzeigen" laeuft V6.2-DEC-132-Reuse: read-only Query, listet typisch 3-8 historische Stage-Wechsel der letzten 7 Tage mit "Diese Regel haette folgende Tasks erzeugt: ..."
- **AC-6:** "Regel aktivieren"-Button ist disabled bis Trockenlauf gelaufen ist. Klick → `applyNlRule()` → `automation_rules`-INSERT mit `status='active'`, `created_by=auth.uid()`, `audit_log`-Eintrag `automation_rule.create_via_nl` mit `metadata={nl_input, sculptor_model_id, sculptor_cost_usd}`.
- **AC-7:** Soft-Dedup-Check: zweite NL-Eingabe mit identischem Sculpt-Ergebnis (`name + trigger_event + JSON.stringify(conditions+actions)` matched existierender active Rule des Owners) returnt 409-Conflict mit Hinweis "Es gibt bereits eine identische Regel. Diese aktivieren?" + Link zur bestehenden Regel.
- **AC-8:** Voice-Input: Klick auf Mikro-Button startet Whisper-Transkription. Transkript erscheint im Text-Feld, ist editierbar bevor Sculpt-Klick. Whisper-Adapter-Reuse `cockpit/src/lib/speech/whisper-adapter.ts`, kein neuer Provider.
- **AC-9:** Cost-Display nach Sculpt-Aufruf: "Diese Regel hat ~$0.003 Bedrock-Kosten verursacht." Wenn Reject-Loop 2x feuert, kumulativer Cost wird angezeigt.
- **AC-10:** Inspection-Log auf `/settings/workflow-automation/nl-history` zeigt letzte 50 Sculpt-Aufrufe mit Original-Text, Resultat-Schema (oder Reject-Reason), Cost-USD, Created-At, Created-By. Admin-only (FEAT-711-Permission-Matrix). Listing-Query reuse `audit_log` (kein neues Schema).
- **AC-11:** Editierbare Schema-Karte: User kann nach Sculpt die Form-Felder (Trigger-Dropdown, Condition-Builder, Action-Builder) noch anpassen, bevor Trockenlauf. Apply-Pfad re-validatiert via zod, falls User unsaubere Werte eingegeben hat.
- **AC-12:** Erstellte Regel funktioniert in V6.2-Dispatcher 1:1 — bei naechstem `deal.stage_changed` auf Angebot-Stage feuert sie wie eine Click-Wizard-Regel. Live-Smoke verifiziert.

## Dependencies

- **V6.2 FEAT-621** (Workflow-Automation Rule Builder): `automation_rules`, `automation_runs`, Dispatcher, Executor, Cron-Fallback, Trockenlauf-Modul DEC-132
- **V4.1 FEAT-404** (Whisper-Adapter): `cockpit/src/lib/speech/whisper-adapter.ts`
- **V3 FEAT-305** (Bedrock LLM-Layer): `cockpit/src/lib/llm/bedrock-client.ts`
- **V6.6 FEAT-661** (Mein-Tag-KI-Workspace-Hybrid): Layout-Pattern Mein-Tag rechts/unten
- **V7.1 FEAT-711** (Settings-Permission-Layer): NL-Box fuer Member ausblenden, Inspection-Log nur Admin
- **IS SLC-109** (Bedrock-JSON-Drift-Pattern): `healJsonEscapes`-Helper Reuse

## Risks

- LLM-Hallucination (Mitigation: zod + Reject-Loop + healJsonEscapes)
- Voice-Accuracy fuer Geschaeftsbegriffe (Mitigation: editierbares Transkript)
- Trockenlauf-Cost bei grossem Backlog (Mitigation: 7-Tage-Window aus V6.2 DEC-132)
- Multi-User-Duplikat-Regeln (Mitigation: Soft-Dedup)

## Success Metric

Nach 1 Woche Live-Use:
- ≥1 erfolgreicher Mein-Tag-NL-Workflow-Apply mit live-getriggerter Regel
- Edit-Rate (User editiert Schema-Karte nach Sculpt) <30%
- Out-of-Domain-Reject-Rate <20% (sonst V8+-Trigger-Erweiterung-Trigger)
- 0 Bedrock-Cost-Eskalationen (typisch ~$0.003 pro Sculpt, <$1/Monat fuer realistische Use-Cases)

## References

- Backlog: BL-435 (high-prio, V7.5)
- Discovery: V6.6 Discovery 2026-05-09 (project_business_system_v66_discovery_2026_05_09 Memory)
- Strategaize-Pattern-Reuse: V6.2-Click-Wizard, V4.1-Whisper-Adapter, V3-Bedrock-Client, V6.6-KI-Workspace-Hybrid, IS-SLC-109 healJsonEscapes
- Wettbewerbs-Hinweis: Clay 'Sculptor' (Mai 2026), Microsoft Copilot Workflow-Builder, AI-FIRST.ai (Felix, fast identisches Bausteine-Modell)
- V6.6 ISSUE-066 (V7.5-Mitigation via FEAT-752)
- COMPLIANCE.md (Internal-Test-Mode bleibt aktiv, kein Drittnutzer-Live-Call vor Anwaltspruefung)
