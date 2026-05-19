# FEAT-761 — NL-Rule-Builder in KI-Workspace integrieren

**Version:** V7.6
**Sprint:** V7.6 NL-Workspace-Integration + Custom-Reports
**Status:** planned (requirements done 2026-05-19)
**Geschaetzter Aufwand:** ~1-2 Slices, kein Schema-Touch
**Vorgaenger:** REL-032 (V7.5 deployed 2026-05-18)
**Nachfolger:** FEAT-762 Custom-Reports
**Quelle:** BL-479, User-Direktive 2026-05-18 Post-Deploy-UI-Inspektion

## Problem Statement

V7.5 SLC-753 hat den NL-Rule-Builder als **separate Card** unterhalb des KI-Workspace-Hybrid-Blocks auf `/mein-tag` platziert. Das verletzt das V6.6-KI-Workspace-Pattern (Memory `feedback_ki_workspace_pattern` + `feedback_no_extra_cards`): "alles laeuft ueber KI-Workspace, keine festen KPI-Cards / Goals-Widgets / Top-N-Tabellen mehr — alles laeuft ueber Berichts-Buttons im KI-Workspace".

### Konkrete Symptome
1. **UI-Drift:** `/mein-tag` rendert zwei nebeneinanderliegende Karten — den KI-Workspace mit 5 Standard-Buttons (Tagesanalyse / Gestern / Seit Login / Wochen-Performance / Pipeline-Risiko) UND eine separate `NLRuleBuilderCard` darunter mit eigenem NL-Input + Schema-Editor + Trockenlauf + Apply-Modal. Doppelte Workspace-Logik.
2. **Cost-Leak im User-UI:** Die NL-Card zeigt "Bedrock Claude Sonnet · ~$0.003 pro Versuch" + "Bedrock-Kosten: ~$0.009 fuer 1 Versuch" als sichtbares Element. User-Direktive 2026-05-18: "Da haben wir noch was mit Bedrock, Cloud Sonnet und Kostendings. Das muss dann sowieso raus." Cost/Modell-Info ist Audit-Forensik, gehoert nicht ins User-UI.
3. **User-Friction:** User Richard hat V7.5 Post-Deploy einmal evaluiert (RPT-465 audit_log: 1 sculpt_attempt 2026-05-18 17:18:49), aber **keinen Apply** gemacht — wartet bewusst auf die UI-Integration in V7.6.

### Warum jetzt
NL-Rule-Builder ist konzeptionell **identisch** zu den existierenden 5 Berichts-Buttons: ein KI-Aufruf, der Bedrock fuegt. Die separate Karte schafft **doppelte mentale Modelle** (Workspace fuer Berichte, Card fuer Workflow-Bau) und verletzt die V6.6-Discovery-Direktive. Plus: V7.6 BL-442 Custom-Reports nutzt das **gleiche Workspace-Pattern** — wenn NL-Builder vor Custom-Reports nicht integriert ist, wuerden wir doppelt refactorieren.

## Goal / Intended Outcome

Nach FEAT-761:
- **NL-Rule-Builder ist der 6. Button** im `MeinTagKIWorkspace`, rechts neben den 5 Standard-Buttons.
- **Button-Label:** "Workflow per Klartext" (oder kuerzer: "Workflow bauen") — konsistent mit den anderen Berichts-Buttons.
- **Klick triggert** den Sculpt-Workflow im **Antwort-Fenster des Workspace** (nicht in einer Card daneben).
- **Sculpt-Workflow im Antwort-Fenster:** NL-Eingabe → Sculpt → Klarsprache-Echo → editierbares Schema → Trockenlauf → Apply-Confirmation (gleiche 4-Karten-Sequenz wie V7.5, aber inline im Workspace).
- **Cost-Display + Modell-Anzeige aus User-UI entfernt.** Bleibt in `audit_log` + Inspection-Log auf `/settings/workflow-automation/nl-history` (Admin-only) als Forensik.
- **Standalone `NLRuleBuilderCard`-Render** auf `/mein-tag` ist entfernt.
- **FEAT-751-Backend bleibt komplett unangetastet** (sculptNlRule / previewNlRule / applyNlRule Server-Actions, MIG-036, audit_log-Actions).

## Primary User

- **Admin** + **Teamlead** auf `/mein-tag`. (Member sieht weder den 6. Button noch den Bedrock-Pfad — Server-Side-Guard analog V7.5.)
- Sekundaer: Admin-Forensik im Inspection-Log auf `/settings/workflow-automation/nl-history` (V7.5 SLC-756 bleibt unangetastet).

## V1 Scope (V7.6-FEAT-761)

### In-Scope

**MT-1 — Erweitere KIWorkspace Report-Discriminator-Pattern**

Heute existiert bereits ein Precedent in `cockpit/src/components/ki-workspace/AnswerPane.tsx`: bei `reportId === "top-chancen"` rendert AnswerPane einen `PipelineTabsRenderer` statt einer flachen Markdown-View. Das ist das Anker-Pattern fuer FEAT-761.

- `KIWorkspaceReport.id = "nl-builder"` wird zu `MEIN_TAG_REPORTS` hinzugefuegt.
- Label: "Workflow per Klartext" (oder einfacher: "Workflow bauen").
- Beim Klick auf den Button: **nicht** der Standard-`reportRun`-Pfad, sondern Wechsel in einen Sculpt-Mode innerhalb des AnswerPane.
- `AnswerPane` erhaelt zusaetzlichen Discriminator: bei `reportId === "nl-builder"` rendert es eine neue `NLBuilderInline`-Komponente (eingebettet, nicht modal/page-level).
- `NLBuilderInline` enthaelt die 4-Karten-Sequenz aus V7.5 (NL-Eingabe → Klarsprache → Schema-Editor → Trockenlauf+Apply), aber ohne die "wrapper"-Card-Optik des V7.5-`NLRuleBuilderCard`-Boxes.

**MT-2 — Entferne Cost-Display + Modell-Hint aus User-UI**

- Inline-Text "Bedrock Claude Sonnet · ~$0.003 pro Versuch" + Cost-Display "Bedrock-Kosten: ~$0.009 fuer 1 Versuch" werden aus dem NL-Builder-UI entfernt.
- `formatBedrockCost`-Helper bleibt erhalten (wird im Inspection-Log noch genutzt — SLC-756 bleibt unangetastet).
- `audit_log` Persistenz von `sculptor_cost_usd`/`attemptCount`/`model_id` bleibt unveraendert (Compliance-Pflicht).
- Inspection-Log auf `/settings/workflow-automation/nl-history` zeigt weiterhin alle Sculpt-Costs (V7.5 SLC-756).

**MT-3 — Entferne Standalone-NLRuleBuilderCard-Render auf /mein-tag**

- `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx` rendert die `<NLRuleBuilderCard />` heute als Sibling unter `<MeinTagKIWorkspace />`. Dieser Render-Block wird entfernt.
- Wenn der NL-Builder-Code (`nl-rule-builder-card.tsx`) als Komponente vollstaendig zu `ki-workspace/nl-builder-inline.tsx` umzieht, wird die alte Datei geloescht (per CLAUDE.md "Surgical changes"-Rule: tote Datei entfernen, nicht stale lassen). Wenn Teile als Sub-Komponenten weiter wiederverwendbar bleiben (z.B. `ApplyConfirmModal`, `PreviewResultCard`), bleiben sie unter `cockpit/src/components/mein-tag/`.
- `mein-tag-client.test.tsx` wird angepasst (Card-Sibling-Assertion entfaellt, Workspace-6-Button-Assertion ergaenzt).

**MT-4 — Doc-Hygiene F-2 als Setup-MT**

- `docs/AUDIT_SERVER_ACTIONS_V7.md` V7.5-Section nachtragen mit 4 V7.5-Server-Actions (`sculptNlRule`, `previewNlRule`, `applyNlRule`, `listNlSculptHistory`) analog ISSUE-069-Pattern aus V7.1. ~15 Min Doc-Edit.
- Kann als erster MT (Setup) oder letzter MT (Closing) eingeplant werden — Empfehlung: Setup-MT, weil die Refactor-Diskussion in MT-1..3 dann sofort gegen die aktuellen Audit-Action-Pfade arbeiten kann.

### Acceptance Criteria

**AC-1** Auf `/mein-tag` rendert der MeinTagKIWorkspace **6 Button** statt 5 (5 Standard + 1 NL-Builder).
**AC-2** Klick auf "Workflow per Klartext"-Button wechselt den AnswerPane in den NL-Builder-Mode (KI-Aufruf-Pfad nicht getriggert — kein direkter Bedrock-Call).
**AC-3** Im NL-Builder-Mode rendert AnswerPane die 4-Karten-Sequenz aus V7.5 (NL-Eingabe + Klarsprache + Schema-Editor + Trockenlauf/Apply) inline ohne weiteres Card-Wrapping.
**AC-4** Cost-Display + Modell-Anzeige sind im NL-Builder-UI **nicht sichtbar** (`data-testid="nl-rule-builder-cost"` darf nicht im DOM rendern).
**AC-5** Apply-Workflow (NL → Sculpt → Preview → Apply-Confirm) funktioniert end-to-end identisch zu V7.5 — gleiche Server-Actions, gleiche `audit_log`-Eintraege (`sculpt_attempt`, `create_via_nl`).
**AC-6** `/mein-tag` rendert **keine** Standalone-`NLRuleBuilderCard` mehr als Sibling unter dem Workspace.
**AC-7** Inspection-Log auf `/settings/workflow-automation/nl-history` (V7.5 SLC-756) bleibt funktional unveraendert — alle 4 V7.5-Audit-Actions weiterhin sichtbar.
**AC-8** Vitest-Suite bleibt gruen (`npm run test:all` 1078/1078 PASS oder besser — V7.6 fuegt eher hinzu als entfernt).
**AC-9** `docs/AUDIT_SERVER_ACTIONS_V7.md` enthaelt V7.5-Section mit den 4 Server-Actions (F-2 closed).

### Out-of-Scope V7.6 (Defer)

- NL-Builder auf `/deal/[id]` oder `/dashboard`. Per V7.5-Architektur ist NL-Builder ein **system-weites** Workflow-Setup-Tool — es macht semantisch nicht Sinn auf einer Deal-Detail-Page, weil Workflow-Rules nicht deal-scoped sind. Defer V7.7+ wenn ueberhaupt.
- Voice-Input fuer NL-Builder im Workspace. V7.5 hat Voice via `useVoiceCapture` (SLC-755). Im Workspace existiert bereits ein Workspace-weiter Mic-Button (`ki-workspace-voice-button`) der die freie Frage in den Input-Feld diktiert. Frage offen: Sollen die zwei Voice-Pfade zusammengelegt werden? — Defer V7.7+, V7.6 kann mit getrennten Voice-Buttons leben.
- Sonner-Toast-Hydration (ISSUE-078, BL-478). V7.6.1+.
- F-3 COMPLIANCE.md V7.5-Section. Pre-Production-Compliance-Gate-Item, per User-Direktive 2026-05-01 "kommt viel spaeter".

## Constraints

- **Keine Schema-Migration.** FEAT-751-Backend bleibt komplett. Reines Frontend-Refactor.
- **Keine neuen Server-Actions.** sculptNlRule + previewNlRule + applyNlRule bleiben unveraendert.
- **Keine Aenderung am Inspection-Log** (SLC-756). Forensik bleibt.
- **Native HTML Form-Pattern** weiterhin pflicht (Memory `feedback_native_html_form_pattern`).
- **V2-Sidebar-Layout** bleibt (Memory `feedback_v2_sidebar_pflicht`).
- **Brand-Tokens** aus V6.5 Theming-Sprint (kein neuer Custom-Hex-Wert).

## Risks / Assumptions

- **Risk:** AnswerPane wird zur "Wundertuete" mit drei Render-Modi (Markdown / Pipeline-Tabs / NL-Builder). Bei mehr Discriminator-Cases skaliert das Pattern nicht. **Mitigation:** Wenn nach FEAT-762 ein weiterer Discriminator-Case auftaucht, sollte AnswerPane in eine `RenderRegistry` umgebaut werden (V7.7+).
- **Risk:** Klick auf "Workflow per Klartext"-Button triggert keinen Bedrock-Call, aber `useReportRun` ist auf "Click → run Report"-Annahme aufgebaut. Wir muessen den NL-Builder-Click-Pfad **vor** `reportRun.run()` short-circuiten. **Mitigation:** `KIWorkspace.handleReportClick` checkt `report.id === "nl-builder"` und ruft stattdessen `setSelectedReport(report)` ohne `await reportRun.run(...)`.
- **Assumption:** Der User akzeptiert, dass Voice fuer NL-Builder zunaechst nur ueber den existierenden `nl-rule-builder-mic`-Button funktioniert (V7.5 SLC-755). Der workspace-weite `ki-workspace-voice-button` bleibt fuer die "Freie Frage"-Eingabe.

## Success Criteria

FEAT-761 ist erfolgreich wenn:
- alle 9 AC erfuellt sind
- Live-Smoke auf Production: Admin Richard kann via 6. Button NL-Sculpt durchfuehren, sieht keinen Cost-Hint mehr, kann Workflow apply-en
- audit_log zeigt korrekte `sculpt_attempt` + `create_via_nl` Eintraege fuer den neuen UI-Pfad
- /mein-tag-Page-Layout fuehlt sich **konsistent** an (1 Workspace-Block, kein separater Card-Sibling)

## Open Questions

**OQ-761-1: Button-Label**
Optionen: "Workflow per Klartext" (V7.5-Naming) / "Workflow bauen" / "Neue Regel" / "Automatisierung". Empfehlung: kurz + verbnah = "Workflow bauen". Final-Entscheidung im /architecture.

**OQ-761-2: Wo lebt der Sculpt-Workflow-Code nach dem Refactor?**
Option A: `cockpit/src/components/ki-workspace/nl-builder-inline.tsx` (semantisch korrekt — gehoert zum Workspace).
Option B: `cockpit/src/components/mein-tag/nl-rule-builder-inline.tsx` (mein-tag-scoped, weil heute noch nur dort gezeigt).
Empfehlung: Option A — zukunftsfaehiger fuer ggf. Re-Use auf anderen Pages.

**OQ-761-3: Cleanup der bestehenden `NLRuleBuilderCard`-Datei**
Option A: Komplett loeschen (`nl-rule-builder-card.tsx` + `nl-rule-builder-card.test.tsx`).
Option B: Inline-Komponente importiert weiter aus alter Card-Datei (nur die `<NLRuleBuilderCard>`-Wrapper-Box wird in Inline umgebaut).
Empfehlung: Option A. Klar Cut, CLAUDE.md "Surgical changes"-Rule erfuellt.

**OQ-761-4: Free-Form-Frage-Eingabe im Workspace**
Heute hat der Workspace eine "Frage stellen ..."-Inputzeile mit Send-Button. Bleibt das so im NL-Builder-Mode? Oder wird die Workspace-Inputzeile im NL-Builder-Mode hidden? Empfehlung: bleibt sichtbar, aber **disabled mit Hint** "Workflow-Modus aktiv — verwende die NL-Eingabe unten" — analog zum "Aktualisieren"-Button-Pattern, das nur bei Markdown-Result sichtbar ist.

## Delivery Mode

**internal-tool** (Business-System, Internal-Test-Mode bleibt aktiv bis Pre-Production-Compliance-Gate).

## Recommended Next Step

`/architecture` — entscheidet finale OQs (Button-Label, File-Location, Free-Form-Eingabe-Verhalten) und schreibt DEC-214..217. Dann `/slice-planning` mit 1-2 Slices fuer FEAT-761 + 1-2 fuer FEAT-762.
