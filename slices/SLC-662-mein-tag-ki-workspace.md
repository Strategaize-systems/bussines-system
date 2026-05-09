# SLC-662 — Mein Tag KI-Workspace + Performance-Migration (BL-445, FEAT-661)

## Metadata
- **Slice ID:** SLC-662
- **Version:** V6.6
- **Feature:** FEAT-661
- **Status:** planned
- **Priority:** Blocker (erster Caller — verifiziert KI-Workspace im Live-Einsatz)
- **Created:** 2026-05-09
- **Estimated Effort:** ~3-4h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped
- **Architecture:** DEC-165 (Component-Reuse) + DEC-168 (Server-Action-Pfad) + DEC-169 (/performance-Migration als 1-Sprint-Redirect)
- **Reihenfolge-Pflicht:** **nach SLC-661**

## Goal

Mein-Tag-Page nutzt die `<KIWorkspace>`-Component (SLC-661) als ersten Caller. 5 Berichts-Buttons (Tagesanalyse / Gestern / Seit Login / Wochen-Performance / Pipeline-Risiko) verdrahtet mit echten Server-Actions. /performance-Page wird zur Redirect-Page mit Toast (1 Sprint Bruecke). Sidebar-Eintrag "Meine Performance" entfernt. 4-Hinweise-Pill / 4-offene-Punkte-Zeile / Tagesanalyse-starten-Button raus aus DOM. Mapping-Tabelle als Pflicht-Output (R2-Mitigation).

## Scope

**In Scope:**
- `cockpit/src/app/(app)/mein-tag/page.tsx` MODIFY: `<KIWorkspace context="mein-tag" reports={MEIN_TAG_REPORTS} scope={{userId}} voiceEnabled={true} />` einbauen
- `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx` MODIFY: alte Tagesanalyse-Logic entfernen, 4-Hinweise-Pill entfernen, 4-offene-Punkte-Zeile entfernen
- `cockpit/src/lib/ki-workspace/reports/tagesanalyse.ts` (NEU, Server-Action)
- `cockpit/src/lib/ki-workspace/reports/gestern.ts` (NEU, Server-Action — Variant von Tagesanalyse mit yesterday-Filter)
- `cockpit/src/lib/ki-workspace/reports/seit-login.ts` (NEU, Server-Action — Last-Login-Window)
- `cockpit/src/lib/ki-workspace/reports/wochen-performance.ts` (NEU, Server-Action — uebernimmt /performance-Goal-Cards + Wochen-Check-Logik)
- `cockpit/src/lib/ki-workspace/reports/pipeline-risiko.ts` (NEU, Server-Action — Bedrock-Analyse stagnierende+at-risk Deals heute)
- `cockpit/src/app/(app)/performance/page.tsx` MODIFY: zu Redirect-Page mit Toast + redirect zu /mein-tag
- `cockpit/src/components/sidebar.tsx` MODIFY: Eintrag "Meine Performance" entfernen
- `cockpit/src/components/ki-workspace/reports/registry.ts` MODIFY: `serverActionPath` von `_mock.ts` auf echte Pfade umbiegen
- `docs/V6.6-PERFORMANCE-MAPPING.md` (NEU, Pflicht-Output) — Mapping-Tabelle /performance-Funktion → V6.6-Bericht-Pfad
- Vitest-Tests fuer 5 Server-Actions (Mock-Bedrock + DB-Setup mit Test-Daten)

**Out of Scope:**
- Custom-Reports / "Meine Berichte"-Auswahlfeld (V7.6, BL-442)
- Streaming-Tokens-UI (BL-451)
- Mitarbeiter-Sicht-Berichts-Listen (V7)
- Drill-Downs in Tagesanalyse (NICHT bauen, User-Direktive)
- /performance-Page komplette Loeschung (V6.7+, BL-453)

## Acceptance Criteria

**AC1:** Mein-Tag-Page rendert 4-Block-Layout (Aufgaben + Top-Deals + Kalender + KI-Workspace) auf Desktop ≥1280px ohne Scroll-Zwang im Above-the-Fold.

**AC2:** KI-Workspace-Block enthaelt 5 sichtbare Berichts-Buttons in horizontaler Reihe: Tagesanalyse, Gestern, Seit Login, Wochen-Performance, Pipeline-Risiko.

**AC3:** Klick auf `[Tagesanalyse]` triggert Bedrock-Call mit Tages-Kontext (eigene Deals + heutige Activities/Tasks/Meetings des Users). Antwort rendert mit 3 Sektionen in Reihenfolge: 1. Pipeline-Bewegung heute (Haupt), 2. Aktivitaeten-Soll-Ist, 3. KI-Kommentar.

**AC4:** Klick auf `[Wochen-Performance]` rendert Goal-Progress + Forecast + KI-Empfehlung (uebernimmt /performance-Goal-Cards-Logik) — kein Wechsel auf separate Seite.

**AC5:** Klick auf Mikrofon-Button startet Voice-Stream via `useVoiceCapture`, transkribierter Text erscheint im Eingabefeld, User-OK triggert Bedrock-Call.

**AC6:** /performance-Route ist Redirect-Page: Toast `"Performance ist jetzt im Mein-Tag-KI-Workspace verfuegbar — Wochen-Performance-Berichts-Button"` + `router.replace('/mein-tag')` nach 1.5s.

**AC7:** Sidebar enthaelt KEINEN "Meine Performance"-Eintrag mehr (weder OPERATIV/ANALYSE/ARBEITSBEREICHE).

**AC8:** "4 Hinweise"-Pill oben rechts ist nicht mehr im DOM (Wiedervorlagen sind in Tagesanalyse-Bericht-Pipeline-Risiko-Sektion).

**AC9:** "4 offene Punkte"-Zeile unter Kalender ist nicht mehr im DOM.

**AC10:** "Tagesanalyse starten"-Button (alter Trigger-Knopf in Mitte des Workspaces) ist nicht mehr im DOM.

**AC11:** Mobile (≤768px): 4-Block-Layout staffelt vertikal (Aufgaben → KI-Workspace → Top-Deals → Kalender), KI-Workspace voll funktional.

**AC12:** `docs/V6.6-PERFORMANCE-MAPPING.md` existiert und enthaelt Mapping-Tabelle mit allen /performance-Funktionen → V6.6-Bericht-Pfad. KEINE Funktion fehlt (manuelle Inventur durch SLC-662 Pre-Step).

**AC13:** Reports-Registry `MEIN_TAG_REPORTS` zeigt auf echte Server-Action-Pfade (kein `_mock.ts` mehr).

**AC14:** TSC + `npm run test` (Vitest +N Tests fuer 5 Server-Actions) + `npm run build` + `npm run lint` alle clean.

**AC15:** Live-Smoke nach Coolify-Redeploy: User klickt alle 5 Berichts-Buttons, jeder rendert eine Bedrock-Antwort innerhalb 10s, kein 5xx. /performance-URL → Toast + Redirect verifiziert. Sidebar-Smoke: "Meine Performance" weg.

## Reuse

- `<KIWorkspace>` aus SLC-661
- `MEIN_TAG_REPORTS` aus SLC-661 Registry
- `useReportRun` + `cache` aus SLC-661
- Bestehende /performance-Logik (Goal-Cards + Wochen-Check + Tagesaufloesung) fuer `wochen-performance.ts` (Logik-Reuse, UI-Drop)
- Bestehender Bedrock-Adapter aus FEAT-305 (eu-central-1)
- Bestehender FEAT-301-Briefing-Pfad als Referenz fuer Tagesanalyse-Prompt
- Style Guide V2 Brand-Tokens (BL-441)

## Risks

- **R2.1 /performance-Funktions-Verlust:** ohne Mapping-Doc droht stille Loeschung. **Mitigation:** Pre-Step (vor Code-Aenderung) Mapping-Tabelle erstellen + User-Sichtkontrolle. AC12 ist Pflicht-Output.
- **R2.2 Bedrock-Call-Latenz:** 5 Berichte mit 2-8s Latenz koennen User-Frustration erzeugen. **Mitigation:** Spinner mit Progress-Hint, Cache reduziert Repeat-Latenz. SSE-Streaming als BL-451 dokumentiert.
- **R2.3 Tagesanalyse-Reihenfolge:** Bedrock-Output muss Pipeline-Bewegung-Haupt-KPI-First produzieren. **Mitigation:** System-Prompt explizit strukturiert mit Reihenfolge-Vorgabe + 3 Markdown-Sektion-Headers vorgegeben.
- **R2.4 Voice-Eingabe-Stress:** mehrere schnelle Voice-Eingaben koennten Whisper-Adapter rate-limiten. **Mitigation:** 3-fach Smoke-Test (R6 aus Architecture).

## Verification Strategy

- **Pre:** /performance-Page-Inventur durchfuehren (alle Funktionen identifizieren) → Mapping-Tabelle erstellen → User-Sichtkontrolle → DANN Code-Aenderung. Reihenfolge-Pflicht.
- **Per-MT:** siehe Micro-Tasks
- **Slice-Level:** Build + Test + Lint + Live-Smoke nach User-Coolify-Redeploy. 5 Berichts-Buttons-Smoke + /performance-Redirect + Sidebar-Smoke + Mobile-Verhalten.

---

## Micro-Tasks

### MT-1: /performance-Inventur + Mapping-Tabelle (PFLICHT-PRE-STEP)
- Goal: Alle Funktionen der bestehenden /performance-Page identifizieren und in Mapping-Tabelle ueberfuehren.
- Files: `docs/V6.6-PERFORMANCE-MAPPING.md` (NEU)
- Expected behavior: Tabelle mit Spalten "/performance-Funktion | V6.6-Bericht-Pfad | Notizen". Mind. 5 Eintraege (Goal-Cards, Wochen-Check, Tagesaufloesung, Forecast-Chart, KI-Empfehlungen). User-Sichtkontrolle vor MT-2.
- Verification: User bestaetigt Mapping-Tabelle bevor MT-2 startet. Markdown-Lint clean.
- Dependencies: none (PFLICHT-PRE-STEP)

### MT-2: Server-Action `tagesanalyse.ts`
- Goal: Bedrock-Server-Action fuer Tagesanalyse mit 3-Sektionen-Reihenfolge.
- Files: `cockpit/src/lib/ki-workspace/reports/tagesanalyse.ts` (NEU), `__tests__/tagesanalyse.test.ts` (NEU)
- Expected behavior: `runReport({userId, dateRange?})` laedt: deals (eigene) + activities (heute) + tasks (heute offen) + meetings (heute). System-Prompt strukturiert Output mit 3 Markdown-Sektionen: `## Pipeline-Bewegung heute`, `## Aktivitaeten-Soll-Ist`, `## KI-Kommentar`. Bedrock-Call (FEAT-305-Adapter) + audit_log-Insert. Returnt `{markdown, completedAt, model, refreshable: true}`.
- Verification: Vitest mit Mock-Bedrock + Mock-DB-Daten — assert 3 Sektion-Headers in Output. 1 PASS.
- Dependencies: MT-1

### MT-3: Server-Actions `gestern.ts` + `seit-login.ts`
- Goal: Variant-Server-Actions mit anderen Zeit-Filtern.
- Files: `cockpit/src/lib/ki-workspace/reports/gestern.ts`, `seit-login.ts` (NEU), Tests im selben `__tests__`-Folder
- Expected behavior: `gestern.ts` filtert auf `yesterday` Datums-Range. `seit-login.ts` filtert auf User-Last-Login-Timestamp (aus session oder user_settings). Beide nutzen gleichen 3-Sektionen-Prompt-Pattern wie Tagesanalyse.
- Verification: 2 Vitest-Tests PASS.
- Dependencies: MT-2

### MT-4: Server-Action `wochen-performance.ts`
- Goal: Wochen-Performance-Bericht uebernimmt /performance-Goal-Cards-Logik in KI-Workspace-Pattern.
- Files: `cockpit/src/lib/ki-workspace/reports/wochen-performance.ts` (NEU), Test
- Expected behavior: Liest Goal-Werte aus `goals`-Tabelle (oder bestehenden Performance-Tracking-Tables, MT-1 Mapping). Bedrock-Prompt: "Erstelle Wochen-Performance-Report mit Sektion 1 Goal-Progress (Wochenziel + Forecast vs Soll), Sektion 2 Aktivitaeten-Soll-Ist pro Tag, Sektion 3 KI-Empfehlung". Returnt Markdown.
- Verification: 1 Vitest PASS. Mapping-Doc-Eintraege als reference.
- Dependencies: MT-1, MT-2

### MT-5: Server-Action `pipeline-risiko.ts`
- Goal: Bedrock-Analyse stagnierende + at-risk Deals heute.
- Files: `cockpit/src/lib/ki-workspace/reports/pipeline-risiko.ts` (NEU), Test
- Expected behavior: Filtert Deals mit `idle_days > X` ODER `next_action_overdue=true` ODER `gatekeeper-flagged`. Bedrock-Prompt erstellt Risiko-Bewertung + Wiedervorlagen-Liste. Wiedervorlagen sind Teil der Antwort (R2.3, FEAT-661 Sektion 4-Hinweise-Pill-Removal).
- Verification: 1 Vitest PASS.
- Dependencies: MT-2

### MT-6: Mein-Tag-Page einbauen
- Goal: `<KIWorkspace>` in Mein-Tag-Page einbauen, alte UI-Elemente entfernen.
- Files: `cockpit/src/app/(app)/mein-tag/page.tsx` MODIFY, `cockpit/src/app/(app)/mein-tag/mein-tag-client.tsx` MODIFY, Reports-Registry MODIFY (echte Pfade)
- Expected behavior: KI-Workspace-Block ersetzt alte Tagesanalyse-Logic. 4-Hinweise-Pill / 4-offene-Punkte-Zeile / Tagesanalyse-starten-Button entfernt. Layout 4-Block bleibt. Mobile-Stack stimmt.
- Verification: TSC + Build clean. Manuelle Sichtkontrolle DOM (Browser DevTools nach User-Deploy).
- Dependencies: MT-2..MT-5

### MT-7: /performance-Redirect-Page
- Goal: /performance wird zu Redirect-Page mit Toast.
- Files: `cockpit/src/app/(app)/performance/page.tsx` MODIFY
- Expected behavior: Komponente mit `useEffect`: Toast "Performance ist jetzt im Mein-Tag-KI-Workspace verfuegbar — Wochen-Performance-Berichts-Button" + `setTimeout(() => router.replace('/mein-tag'), 1500)`. Sehr leichte Page (kein Datenladen).
- Verification: TSC clean. Live-Smoke verifiziert Toast + Redirect.
- Dependencies: MT-6

### MT-8: Sidebar-Eintrag entfernen
- Goal: "Meine Performance"-Eintrag aus Sidebar.
- Files: `cockpit/src/components/sidebar.tsx` MODIFY
- Expected behavior: Sidebar-Item-Liste hat keinen "Meine Performance"-Eintrag mehr. Nur EIN Eintrag-Removal — KEIN Reorder + KEINE Sektion-Header-Aenderung in dieser Slice (das ist SLC-667).
- Verification: TSC + Build clean. Live-Smoke: User-Sidebar zeigt 9 Eintraege (vorher 10).
- Dependencies: MT-6

### MT-9: Slice-Closing + Live-Smoke
- Goal: Build/Test/Lint-Gate + Live-Smoke + Records-Sync.
- Files: `slices/INDEX.md` (SLC-662 done), `planning/backlog.json` (BL-445 status update wenn FEAT-661 erst nach SLC-662 fertig — bleibt in_progress wenn noch andere Slices offen, in unserem Fall bleibt FEAT-661 in_progress da KI-Workspace auch in SLC-664/666 verdrahtet wird), `docs/STATE.md`
- Expected behavior: User deployt via Coolify-Redeploy (per memory `feedback_manual_deploy`). Live-Smoke: 5 Berichts-Buttons-Klick + /performance-Redirect + Sidebar-Eintrag-Pruefung + Mobile-Smoke. RPT-XXX Completion-Report.
- Verification: alle ACs PASS in Live-Browser.
- Dependencies: MT-1..MT-8

---

## Definition of Done

- 9 MTs verifiziert (AC-1..AC-15 erfuellt)
- Vitest +5 Tests gruen, Bestehende Suite ohne Regression
- Build + Lint clean
- Live-Smoke 5 Berichts-Buttons + /performance-Redirect PASS
- Mapping-Doc `/docs/V6.6-PERFORMANCE-MAPPING.md` existiert
- Code committed + gepusht auf main + Coolify-Redeploy + Live-Image-Tag dokumentiert
- /qa als naechster Schritt
