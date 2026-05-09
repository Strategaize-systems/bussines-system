# SLC-666 — KI-Analyse-Cockpit (BL-449, FEAT-665)

## Metadata
- **Slice ID:** SLC-666
- **Version:** V6.6
- **Feature:** FEAT-665
- **Status:** planned
- **Priority:** High (dritter Caller)
- **Created:** 2026-05-09
- **Estimated Effort:** ~2h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped
- **Architecture:** DEC-165 (Component-Reuse) + DEC-180 (Anruf-Kontakt-Picker + Top-Chancen-Tab-im-Bericht + Forecast-Quartal-Default)
- **Reihenfolge-Pflicht:** **nach SLC-661** (braucht Component). Parallel zu SLC-664/665 OK.

## Goal

Dashboard-Page (`/dashboard`) wird zu **"KI-Analyse-Cockpit"** mit Mein-Tag-Pattern: Action-Bar oben (kontextlos Task/Mail/Meeting/Anruf/Notiz) + 2/3-1/3-Layout (KI-Workspace links + Kalender rechts). 6 Cockpit-spezifische Berichts-Buttons. KPI-Cards + Top-Chancen-Tabelle + DashboardSearch raus. Anruf-Button oeffnet Kontakt-Picker-Dialog.

## Scope

**In Scope:**
- `cockpit/src/app/(app)/dashboard/page.tsx` MODIFY — Title "KI-Analyse-Cockpit" + Layout-Restruktur
- `cockpit/src/app/(app)/dashboard/dashboard-client.tsx` MODIFY (oder NEU)
- `cockpit/src/components/dashboard/cockpit-action-bar.tsx` (NEU oder Reuse) — kontextlose Action-Bar
- `cockpit/src/components/dashboard/contact-picker-dialog.tsx` (NEU oder Reuse) — fuer Anruf-Button
- `cockpit/src/lib/ki-workspace/reports/pipeline-snapshot.ts` (NEU)
- `cockpit/src/lib/ki-workspace/reports/top-chancen.ts` (NEU)
- `cockpit/src/lib/ki-workspace/reports/conversion-rate.ts` (NEU)
- `cockpit/src/lib/ki-workspace/reports/forecast.ts` (NEU)
- `cockpit/src/lib/ki-workspace/reports/winloss-aggregate.ts` (NEU — Cockpit-Variant von winloss.ts: aggregate ueber alle Won/Lost-Deals des Zeitraums, nicht ein Deal)
- `cockpit/src/lib/ki-workspace/reports/stagnierende-deals.ts` (NEU)
- Reports-Registry MODIFY — `COCKPIT_REPORTS` zeigt auf echte Pfade
- Removal: KPI-Cards-Block, Top-Chancen-Tabelle, DashboardSearch
- Vitest-Tests fuer 6 Server-Actions

**Out of Scope:**
- Custom Berichts-Buttons (V7.6, BL-442)
- KPI-Cards optional einblendbar via Setting (User-Direktive: ersatzlos weg)
- Multi-User-Forecasts / Team-Forecast (V7)
- PDF-Export von Cockpit-Berichten (V7+)
- Drill-Downs aus Berichten heraus (V7)
- Pipeline-Switcher als globaler Filter (Architecture-Decision: Tab-im-Bericht-Pattern reicht)

## Acceptance Criteria

**AC1:** Dashboard-Route bleibt `/dashboard` (kein Redirect, kein Sidebar-Aenderung in dieser Slice — Sidebar-Reorder ist SLC-667). Title rendert "KI-Analyse-Cockpit".

**AC2:** Action-Bar unter Title zeigt 5 sichtbare Buttons (Task / E-Mail / Meeting / Anruf / Notiz) im Mein-Tag-Style (bunt+rund Brand-Tokens). KEIN Angebot-Button (kontextfrei nicht sinnvoll). KEIN Mehr-Menue.

**AC3:** Klick auf Task-Button oeffnet Task-Create-Modal (deal-frei, Owner=aktueller User).

**AC4:** Klick auf E-Mail-Button oeffnet Composing-Studio (V5.3, leerer Empfaenger-Slot).

**AC5:** Klick auf Meeting-Button oeffnet Meeting-Create-Modal.

**AC6:** Klick auf Anruf-Button oeffnet Kontakt-Picker-Dialog. User waehlt Kontakt aus Suche/Liste, Auswahl triggert Click-to-Call (V5.1-Asterisk-Pfad).

**AC7:** Klick auf Notiz-Button oeffnet Notiz-Create-Modal (deal-frei).

**AC8:** Hauptbereich rendert 2/3 + 1/3 Layout: KI-Workspace links 2/3, Kalender rechts 1/3. Auf Mobile (≤768px) staffelt vertikal.

**AC9:** KI-Workspace nutzt FEAT-661-Component: `<KIWorkspace context="cockpit" reports={COCKPIT_REPORTS} scope={{userId}} voiceEnabled={true} />`. Keine duplizierte Implementierung.

**AC10:** KI-Workspace zeigt 6 Berichts-Buttons: Pipeline-Snapshot / Top-Chancen / Conversion-Rate / Forecast / Win/Loss-Analyse / Stagnierende Deals.

**AC11:** Klick auf `[Pipeline-Snapshot]` triggert Bedrock-Call mit Account-weitem Pipeline-Kontext (alle Deals + Stages-Aggregation), rendert Snapshot pro Stage mit Wert-Summe + Anzahl Deals.

**AC12:** Klick auf `[Top-Chancen]` rendert Top-Chancen-Liste mit **Pipeline-Switcher als Tab im Antwort-Fenster** (in-place clientseitig, kein Re-Bedrock-Call beim Tab-Wechsel — DEC-180). Bedrock-Antwort enthaelt Daten fuer alle Pipelines, Tabs zeigen pro Pipeline.

**AC13:** Klick auf `[Forecast]` Default-Zeitraum aktuelles Quartal. Custom-Zeitraum via Frage-Eingabe ("Forecast Q3 2026") nutzt Cockpit-Frage-Eingabe-Pfad.

**AC14:** Klick auf `[Win/Loss-Analyse]` triggert Aggregate-Bedrock ueber alle Won/Lost-Deals des Zeitraums (NICHT ein Deal — Cockpit-Variant von SLC-665 winloss).

**AC15:** Klick auf `[Stagnierende Deals]` triggert Bedrock-Analyse: Deals ohne Activity in N Tagen (Default 14d). Stage-Idle-Liste mit KI-Empfehlung pro Deal.

**AC16:** Kalender rechts zeigt heutige Termine. "Termin planen"-Button funktioniert (oeffnet Meeting-Create-Modal). Default-Range 06:00-21:00 (FEAT-662 ist erst SLC-667 — bis dahin nutzt Kalender bestehende Range, Live-Smoke verifiziert nach SLC-667).

**AC17:** KPI-Cards (Pipeline-Wert / Conversion / Forecast etc.) sind nicht mehr im DOM auf /dashboard.

**AC18:** Top-Chancen-Tabelle (server-side gerendert, alte Logic) ist nicht mehr im DOM auf /dashboard.

**AC19:** DashboardSearch-Component ist nicht mehr im DOM auf /dashboard. Alte URL-Parameter `?q=...` werden silent-discarded (kein Hard-Error).

**AC20:** Mobile (≤768px): Action-Bar funktional (5 Buttons sichtbar, kein Mehr-Menue noetig). 2/3+1/3-Layout staffelt vertikal.

**AC21:** TSC + `npm run test` (Vitest +N Tests fuer 6 Server-Actions) + `npm run build` + `npm run lint` alle clean.

**AC22:** Live-Smoke nach Coolify-Redeploy: User oeffnet /dashboard, sieht "KI-Analyse-Cockpit"-Title, klickt 3 Berichts-Buttons (Pipeline-Snapshot, Top-Chancen, Forecast) — alle rendern Bedrock-Antwort innerhalb 10s, kein 5xx. Top-Chancen-Tab-Wechsel funktional ohne Re-Bedrock-Call. Anruf-Picker-Dialog oeffnet auf Klick.

## Reuse

- `<KIWorkspace>` aus SLC-661
- `useReportRun` + Cache aus SLC-661
- `<KalenderClient>` aus FEAT-309 + V6.1
- FEAT-403 Management-Cockpit-LLM (Reuse fuer Pipeline-Snapshot/Forecast-Bedrock-Logik)
- FEAT-114 Loss-Analysis als Aggregate-Variant
- V5.1 Click-to-Call fuer Anruf-Button
- V5.3 Composing-Studio fuer E-Mail-Button
- Bestehende Task/Notiz-Create-Modals
- Style Guide V2 Brand-Tokens (BL-441)
- Ggf. bestehender Kontakt-Picker (`/contacts` Search-Filter)

## Risks

- **R5.1 Top-Chancen-Tab-Pattern:** Bedrock muss Daten fuer alle Pipelines liefern. **Mitigation:** Server-Action laedt Pipelines-Liste, ruft Bedrock einmal mit kompletter Liste, Output enthaelt Sektionen pro Pipeline. Tabs filtern clientseitig.
- **R5.2 Aggregate-Win/Loss-Logic:** unterscheidet sich von Per-Deal-Logic in SLC-665. **Mitigation:** Eigene Server-Action `winloss-aggregate.ts` (nicht Reuse von Per-Deal-`winloss.ts`).
- **R5.3 KPI-Cards-Removal-Daten-Verlust:** User koennte Werte vermissen. **Mitigation:** alle KPI-Daten erreichbar via Berichts-Buttons (Pipeline-Snapshot, Conversion-Rate, Forecast). User-Direktive ist klar (ersatzlos weg).
- **R5.4 Forecast-Quartal-Default:** Quartal-Berechnung muss auf account-weite Deals + Probability laufen. **Mitigation:** Reuse FEAT-403 Forecast-Logik wenn vorhanden, sonst neue Bedrock-Prompt mit Quartals-Range-Input.

## Verification Strategy

- **Pre:** `cockpit/src/app/(app)/dashboard/*` lesen — KPI-Cards, Top-Chancen-Tabelle, DashboardSearch identifizieren. Bestehender Kontakt-Picker pruefen (oder neu).
- **Per-MT:** siehe Micro-Tasks
- **Slice-Level:** Build + Test + Lint + Live-Smoke (3 Berichts-Buttons + Anruf-Picker + Tab-Wechsel im Top-Chancen + DOM-Removal-Asserts).

---

## Micro-Tasks

### MT-1: Server-Actions pipeline-snapshot/conversion-rate/forecast/stagnierende-deals
- Goal: 4 Bedrock-Server-Actions im KI-Workspace-Pattern (Account-weiter Kontext).
- Files: `cockpit/src/lib/ki-workspace/reports/pipeline-snapshot.ts`, `conversion-rate.ts`, `forecast.ts`, `stagnierende-deals.ts` (alle NEU), `__tests__/*.test.ts`
- Expected behavior: Jede Server-Action `runReport({userId, dateRange?})` laedt Account-Kontext (alle Deals + pipeline_snapshots + automation_runs der letzten 30d). Bedrock-Prompt pro Bericht-Typ. Audit-Log + Cache-Save.
- Verification: 4 Vitest-Tests mit Mock-Bedrock + Mock-DB.
- Dependencies: none

### MT-2: Server-Action top-chancen.ts (mit Pipeline-Switcher-Daten)
- Goal: Bedrock-Antwort enthaelt Daten fuer alle Pipelines (clientseitiger Tab-Wechsel).
- Files: `cockpit/src/lib/ki-workspace/reports/top-chancen.ts` (NEU), Test
- Expected behavior: Server-Action laedt Pipelines-Liste, fuer jede Pipeline `value × probability DESC LIMIT 10`. Bedrock-Prompt strukturiert Output mit Markdown-Sektion-Header pro Pipeline (`## Pipeline: Multiplikatoren`, `## Pipeline: Kunden`). AnswerPane parst Sektionen und zeigt Tabs (oder ItemGroup-Renderer).
- Verification: 2 Vitest-Tests: 2-Pipeline-Aggregat, 1-Pipeline-Edge-Case.
- Dependencies: none

### MT-3: Server-Action winloss-aggregate.ts
- Goal: Cockpit-Variant von winloss — Aggregate ueber alle Won/Lost-Deals des Zeitraums.
- Files: `cockpit/src/lib/ki-workspace/reports/winloss-aggregate.ts` (NEU), Test
- Expected behavior: Laedt Won-Deals + Lost-Deals der letzten 90 Tage. Bedrock-Prompt: "Was hat in dieser Zeitraum gewonnen/verloren? Muster und Empfehlung." Output als Markdown.
- Verification: 1 Vitest PASS.
- Dependencies: none

### MT-4: Cockpit-Action-Bar (kontextlos)
- Goal: Action-Bar mit 5 Buttons (Task/Mail/Meeting/Anruf/Notiz) ohne Deal-Kontext.
- Files: `cockpit/src/components/dashboard/cockpit-action-bar.tsx` (NEU)
- Expected behavior: 5 Buttons mit Mein-Tag-Style. Click-Handler oeffnen Modals/Pages ohne dealId. Anruf-Button oeffnet Kontakt-Picker-Dialog.
- Verification: Vitest RTL — 5 Buttons, alle Click-Handler triggern korrekt. Live-Smoke verifiziert Modale-Inhalte.
- Dependencies: none

### MT-5: Kontakt-Picker-Dialog
- Goal: Dialog mit Kontakt-Search + Auswahl-Action.
- Files: `cockpit/src/components/dashboard/contact-picker-dialog.tsx` (NEU oder Reuse bestehender)
- Expected behavior: Modal mit Search-Input (ILIKE auf contacts.full_name + companies.name), Top-N Results, Click-to-Call-Action via V5.1-Pfad.
- Verification: Vitest RTL — Search-Filter, Click triggert Call-Pfad (Mock).
- Dependencies: none

### MT-6: Cockpit-Page-Restruktur
- Goal: Layout-Swap auf 2/3+1/3 mit KI-Workspace + Kalender, Removal alter Bloecke.
- Files: `cockpit/src/app/(app)/dashboard/page.tsx` MODIFY, `dashboard-client.tsx` MODIFY, Reports-Registry MODIFY (COCKPIT_REPORTS auf echte Pfade)
- Expected behavior: Title rendert "KI-Analyse-Cockpit". Action-Bar oben. 2/3-1/3 Layout. KPI-Cards + Top-Chancen-Tabelle + DashboardSearch entfernt. Mobile-Stack vertikal.
- Verification: Build clean. Live-Smoke nach Deploy: DOM-Asserts.
- Dependencies: MT-1..MT-5

### MT-7: Top-Chancen-Tab-Renderer im AnswerPane
- Goal: AnswerPane parst Markdown-Sektionen (Pipeline-Header) und rendert Tabs clientseitig.
- Files: `cockpit/src/components/ki-workspace/AnswerPane.tsx` MODIFY (oder spezialisierter Sub-Renderer)
- Expected behavior: Wenn Markdown-Output Sektionen wie `## Pipeline: X` enthaelt UND `report.id === "top-chancen"`: AnswerPane rendert Tabs. Tab-Click switched Sektion ohne Re-Bedrock-Call.
- Verification: Vitest RTL — assert Tabs erscheinen bei mock-Markdown mit 2 Pipeline-Sektionen, Tab-Click switched View.
- Dependencies: MT-2, MT-6

### MT-8: Slice-Closing + Live-Smoke
- Goal: Build/Test/Lint-Gate + Live-Smoke + Records-Sync.
- Files: `slices/INDEX.md` (SLC-666 done), `planning/backlog.json` (BL-449 → done, FEAT-665 done), `features/INDEX.md` (FEAT-665 done), `docs/STATE.md`
- Expected behavior: User deployt via Coolify. Live-Smoke: 3 Berichts-Buttons + Top-Chancen-Tab + Anruf-Picker + DOM-Removal-Asserts. RPT-XXX.
- Verification: alle ACs PASS in Live-Browser.
- Dependencies: MT-1..MT-7

---

## Definition of Done

- 8 MTs verifiziert (AC-1..AC-22 erfuellt)
- Vitest +N Tests gruen
- Build + Lint clean
- Live-Smoke 3 Berichts-Buttons + Top-Chancen-Tab + Anruf-Picker + KPI-Cards-Removal PASS
- Code committed + gepusht auf main + Coolify-Redeploy
- /qa als naechster Schritt
