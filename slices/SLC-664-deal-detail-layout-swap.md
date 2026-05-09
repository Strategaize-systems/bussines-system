# SLC-664 — Deal-Detail Layout-Swap (BL-448, FEAT-664)

## Metadata
- **Slice ID:** SLC-664
- **Version:** V6.6
- **Feature:** FEAT-664 (Layout-Swap; Activity-Sheet + Auto-Trigger sind in SLC-665)
- **Status:** planned
- **Priority:** Blocker (zweiter Caller — verifiziert KI-Workspace im Deal-Detail)
- **Created:** 2026-05-09
- **Estimated Effort:** ~3-4h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped
- **Architecture:** DEC-165 (Component-Reuse) + DEC-179 (Pencil-Drawer + Stage-direkt-Wechsel + Mobile-Action-Bar 5+2) + R3-Mitigation (4 Sub-Bloecke mit Live-Smoke pro Sub-Block)
- **Reihenfolge-Pflicht:** **nach SLC-661** (braucht Component). SLC-665 (Activity-Sheet + Auto-Trigger) kommt direkt nach SLC-664.

## Goal

Deal-Detail-Page (`/deals/[id]`) konsolidiert von 3 KI-Modulen (Briefing-Sidebar, Wissen-Tab, Signale-Action) + Edit-Tab zu **1 KI-Workspace + Pencil-Drawer**. Header neu strukturiert (Title + Stage-Dropdown + Wert + Prozess-Check-Pill + Edit-Pencil + Mein-Tag-Quick-Switch). Action-Bar oben (Mein-Tag-Style bunt+rund) mit 7 Buttons Desktop / 5+2-Mobile-Pattern. Hauptbereich 2/3 + 1/3: links KI-Workspace, rechts Tabs (Timeline / Tasks / Proposals / Documents). Activity-Sheet + Win/Loss-Auto-Trigger sind in SLC-665.

## Scope

**In Scope:**
- `cockpit/src/app/(app)/deals/[id]/page.tsx` MODIFY — Header-Restruktur + Layout-Swap
- `cockpit/src/app/(app)/deals/[id]/deal-detail-client.tsx` MODIFY — Action-Bar + 2/3-1/3-Layout + Tabs-Restruktur
- `cockpit/src/components/deals/deal-header.tsx` (NEU oder MODIFY) — Title + Stage-Dropdown + Wert + Prozess-Check-Pill + Pencil-Icon + Mein-Tag-Quick-Switch
- `cockpit/src/components/deals/deal-action-bar.tsx` (NEU) — Action-Bar mit 7 Buttons (5+2-Mobile-Pattern)
- `cockpit/src/components/deals/deal-edit-drawer.tsx` (NEU) — Pencil-Drawer (rechts ausfahrend, gleiche Sheet-Library wie ItemSheet)
- `cockpit/src/lib/ki-workspace/reports/briefing.ts` (NEU, Server-Action — Reuse FEAT-301 + V5.6-Briefing)
- `cockpit/src/lib/ki-workspace/reports/signale.ts` (NEU, Server-Action — Reuse FEAT-412 Signal-Extract)
- `cockpit/src/lib/ki-workspace/reports/risiken.ts` (NEU, Server-Action)
- `cockpit/src/lib/ki-workspace/reports/naechster-schritt.ts` (NEU, Server-Action)
- `cockpit/src/lib/ki-workspace/reports/winloss.ts` (NEU, Server-Action — Reuse FEAT-114 Loss-Analysis-Logic, gleicher Prompt fuer won/lost/aktiv)
- Reports-Registry MODIFY — `DEAL_DETAIL_REPORTS` zeigt auf echte Pfade
- Removal: alte Briefing-Sidebar-Component, alter Wissen-Tab, alte Signale-Action-Toolbar-Button, alter Edit-Tab
- Vitest-Tests fuer 5 Server-Actions

**Out of Scope:**
- Activity-Sheet beim Klick auf Timeline-Item → SLC-665
- Win/Loss-Auto-Trigger bei Stage-Wechsel → SLC-665
- ItemSheet-Refactor (Task-Sheet zu generisch) → SLC-665
- Activity-Sheet-Type-Discriminator → SLC-665
- Drag-und-Drop zwischen Timeline und Tasks → kein V6.6
- Inline-Edit auf Timeline-Items → kein V6.6
- Streaming-Tokens-UI (BL-451)

## Acceptance Criteria

**AC1:** Deal-Detail-Header zeigt: Title + Stage-Dropdown + Wert (inline editable) + Prozess-Check-Pill (Click → Popover mit 8 Kriterien) + Edit-Pencil-Icon + Mein-Tag-Quick-Switch-Button. Alle 6 Elemente in einer Zeile auf Desktop ≥1024px.

**AC2:** Action-Bar unter Header zeigt 7 Buttons Desktop (Task / E-Mail / Meeting-Dropdown / Anruf / Notiz / Angebot / Mehr-Menue) im Mein-Tag-Style (bunt+rund mit Brand-Tokens). Mobile (≤768px): 5 sichtbare Buttons (Task/Mail/Meeting/Anruf/Notiz), Angebot+Mehr ins Three-Dots-Dropdown.

**AC3:** Meeting-Button ist Dropdown mit zwei Optionen: "Termin planen" (oeffnet Termin-Modal) + "Sofort starten" (Jitsi-Instant-Meeting-Pfad).

**AC4:** Mehr-Menue (Three-Dots) Dropdown enthaelt mind. Cadence-Aktionen (V5 Sequences) + Workflow-Trigger (V6.2) + Activity-Manuell-Eintraege.

**AC5:** Stage-Dropdown im Header wechselt Stage **direkt** ohne Confirm-Dialog (DEC-179). Auto-Trigger laeuft im Hintergrund (V6.2-Workflow-Engine, in SLC-665 verdrahtet).

**AC6:** Klick auf Edit-Pencil-Icon im Header oeffnet Drawer rechts ausfahrend (gleiche Sheet-Library wie Activity-Sheet/ItemSheet) mit Edit-Form fuer alle Stammdaten. Schliessen via X / Klick-ausserhalb / ESC.

**AC7:** Mein-Tag-Quick-Switch-Button rechts im Header navigiert zu `/mein-tag`.

**AC8:** Hauptbereich rendert 2/3 + 1/3 Layout: KI-Workspace links 2/3, Tabs (Timeline / Tasks / Proposals / Documents) rechts 1/3. Auf Mobile (≤768px) staffelt vertikal (KI-Workspace voll oben, Tabs darunter).

**AC9:** KI-Workspace nutzt FEAT-661-Component: `<KIWorkspace context="deal-detail" reports={DEAL_DETAIL_REPORTS} scope={{userId, dealId}} voiceEnabled={true} />`. Keine duplizierte Implementierung.

**AC10:** KI-Workspace zeigt 5 Berichts-Buttons: Briefing / Signale extrahieren / Risiken & Einwaende / Naechster sinnvoller Schritt / Win/Loss-Analyse.

**AC11:** Klick auf `[Briefing]` triggert Bedrock-Call mit Deal-Kontext (alle Activities + Tasks + Proposals + Companies + Contacts via FK), rendert Briefing-Inhalt aus FEAT-301 + V5.6-Pattern.

**AC12:** Klick auf `[Signale extrahieren]` triggert FEAT-412-Signal-Extract-Logik im KI-Workspace-Wrapper. Rendert in AnswerPane.

**AC13:** Klick auf `[Win/Loss-Analyse]` triggert FEAT-114-Loss-Analysis-Logik (gleicher Prompt fuer aktive/won/lost Deals). Rendert in AnswerPane. (Auto-Trigger-Pfad ist SLC-665.)

**AC14:** Briefing-Sidebar (alte Component) ist nicht mehr im DOM auf Deal-Detail.

**AC15:** Wissen-Tab ist nicht mehr im DOM auf Deal-Detail (ggf. inkl. zugehoerigem Tab-Trigger entfernt).

**AC16:** Signale-Action-Button (alte Toolbar) ist nicht mehr im DOM auf Deal-Detail.

**AC17:** Edit-Tab ist nicht mehr im DOM auf Deal-Detail.

**AC18:** Mobile (≤768px): 2/3+1/3-Layout staffelt vertikal; Activity-Sheet wird zu Full-Screen-Sheet (das ist SLC-665, hier nur Layout-Aspekt).

**AC19:** TSC + `npm run test` + `npm run build` + `npm run lint` alle clean. Bestehende Briefing-/Signal-Tests koennen entfernt oder umgebogen werden (Logik wandert in Server-Actions, neue Tests dort).

**AC20:** Live-Smoke (1 Deal-Detail mit echten Daten): User klickt alle 5 Berichts-Buttons (alle rendern Bedrock-Antwort innerhalb 10s), klickt auf Pencil-Icon (Drawer oeffnet), klickt auf Mein-Tag-Quick-Switch (navigiert), Stage-Dropdown wechselt direkt, Mobile-Smoke 5+2-Action-Bar funktioniert.

## Reuse

- `<KIWorkspace>` aus SLC-661
- `useReportRun` + Cache aus SLC-661
- FEAT-301 Briefing-Logik fuer `briefing.ts`
- FEAT-412 Signal-Extract-Logik fuer `signale.ts`
- FEAT-114 Loss-Analysis-Logik fuer `winloss.ts`
- V5.6 Pre-Call Briefing-Logik fuer `briefing.ts`
- V5.5 Angebot-Workspace fuer Angebot-Action-Button-Pfad
- V5.1 Click-to-Call fuer Anruf-Action
- V6.2 Workflow-Trigger fuer Mehr-Menue
- V5 Cadences/Sequences fuer Mehr-Menue
- shadcn-Sheet/Vaul fuer Pencil-Drawer (gleiche Library wie ItemSheet in SLC-665)
- Style Guide V2 Brand-Tokens (BL-441) fuer Action-Bar bunt+rund

## Risks

- **R3.1 Layout-Swap-Regression (R3 Architecture):** Entfernen von 3 KI-Modulen + Edit-Tab + Layout-Aenderung in einem Commit ist hoch. **Mitigation:** 4 Sub-Block-Commits mit Live-Smoke pro Sub-Block:
  - Sub-Block 1: Header-Restruktur (Title+Stage+Wert+Prozess-Check+Pencil+Mein-Tag-Switch)
  - Sub-Block 2: Action-Bar (7 Buttons + Mobile-5+2-Pattern)
  - Sub-Block 3: KI-Workspace einbauen + 5 Server-Actions verdrahten
  - Sub-Block 4: 3 KI-Module + Edit-Tab entfernen
- **R3.2 Briefing-Sidebar-State-Drift:** Briefing-Sidebar koennte State an Parent-Component leaken. **Mitigation:** Vor Removal: Sichtkontrolle wo Briefing-State referenziert wird. Bei Konflikt: zuerst State extrahieren in `briefing.ts` Server-Action, dann Sidebar entfernen.
- **R3.3 Action-Bar-Buttons-Logik:** 7 Buttons mit unterschiedlichen Modal/Page-Triggern. **Mitigation:** Jeder Button hat eigenen Action-Handler. Pattern aus FEAT-302 Mein-Tag-Action-Bar reusable.
- **R3.4 Pencil-Drawer-Library-Wahl:** muss konsistent mit Activity-Sheet (SLC-665 ItemSheet). **Mitigation:** SLC-664 entscheidet fuer `<Sheet>` aus shadcn (oder Vaul, je nach Stack-Audit). SLC-665 nutzt dieselbe Library.

## Verification Strategy

- **Pre:** `cockpit/src/app/(app)/deals/[id]/*` lesen — bestehende Page-Struktur + Briefing-Sidebar + Wissen-Tab + Signale-Action + Edit-Tab identifizieren. Action-Bar-Pattern aus Mein Tag (`mein-tag-client.tsx`) lesen. Sheet-Library im Stack pruefen (`grep "@radix-ui/react-dialog\|vaul"`).
- **Per-MT:** siehe Micro-Tasks
- **Slice-Level:** 4 Sub-Block-Commits mit Live-Smoke pro Sub-Block (R3.1). Build + Test + Lint + Live-Smoke 5-Berichts-Buttons + Pencil-Drawer + Stage-Wechsel + Mein-Tag-Quick-Switch + Mobile-Smoke.

---

## Micro-Tasks

### MT-1: Stack-Audit + Sub-Block-Plan
- Goal: Audit existing Sheet-Library + Briefing/Signale/Edit-Tab-Locations.
- Files: keine Code — interne Dokumentation in MT-Note
- Expected behavior: Identify Sheet-Library (shadcn-Sheet vs Vaul). Briefing-Sidebar-Pfad. Signale-Toolbar-Button-Pfad. Edit-Tab-Component-Pfad. Output als Pre-Step-Note in MT-Notiz.
- Verification: User-Sichtkontrolle der Pfade.
- Dependencies: none

### MT-2: Server-Actions briefing/signale/risiken/naechster-schritt/winloss
- Goal: 5 Bedrock-Server-Actions im KI-Workspace-Pattern.
- Files: `cockpit/src/lib/ki-workspace/reports/briefing.ts`, `signale.ts`, `risiken.ts`, `naechster-schritt.ts`, `winloss.ts` (alle NEU), `__tests__/*.test.ts`
- Expected behavior: Jede Server-Action `runReport({userId, dealId})` laedt Deal-Kontext (Activities + Tasks + Proposals + Companies + Contacts via FK). Bedrock-Prompt pro Bericht-Typ. `briefing.ts` reused FEAT-301+V5.6-Logik. `signale.ts` reused FEAT-412. `winloss.ts` reused FEAT-114 (gleicher Prompt fuer won/lost/aktiv). Audit-Log + Cache-Save. Returnt `{markdown, completedAt, model, refreshable: true}`.
- Verification: 5 Vitest-Tests mit Mock-Bedrock + Mock-DB. Alle PASS.
- Dependencies: MT-1

### MT-3 (Sub-Block 1): Header-Restruktur
- Goal: Neuer Header mit Title + Stage + Wert + Prozess-Check-Pill + Pencil + Mein-Tag-Switch.
- Files: `cockpit/src/components/deals/deal-header.tsx` (NEU oder MODIFY), `cockpit/src/components/deals/deal-edit-drawer.tsx` (NEU)
- Expected behavior: Header rendert in einer Zeile alle 6 Elemente. Stage-Dropdown wechselt direkt. Pencil-Click oeffnet Drawer rechts. Mein-Tag-Switch rechts. Prozess-Check-Pill zeigt Fit-Gate-Status (Reuse bestehender Logik).
- Verification: Build clean. Live-Smoke nach Sub-Block-1-Deploy: Header zeigt alle Elemente, Pencil oeffnet Drawer, Stage wechselt, Mein-Tag-Switch navigiert.
- Dependencies: MT-2 nicht noetig hier — Sub-Block 1 ist isoliert

### MT-4 (Sub-Block 2): Action-Bar (7 Buttons + Mobile-Pattern)
- Goal: Neue Action-Bar mit 7 Buttons Desktop + 5+2-Mobile-Pattern.
- Files: `cockpit/src/components/deals/deal-action-bar.tsx` (NEU)
- Expected behavior: 7 Buttons in einer Zeile (bunt+rund Brand-Tokens). Meeting-Button als Dropdown (Plan + Sofort-Starten). Mehr-Menue als Three-Dots-Dropdown. Mobile (≤768px): 5 sichtbar, 2 ins Mehr-Menue. Click-Handler zu bestehenden Pages/Modals.
- Verification: Vitest RTL — Desktop+Mobile-Render, Dropdown-Click. Live-Smoke nach Sub-Block-2-Deploy.
- Dependencies: MT-3

### MT-5 (Sub-Block 3): KI-Workspace einbauen + Server-Actions verdrahten
- Goal: KI-Workspace-Component im 2/3-Bereich, Reports-Registry auf echte Pfade biegen.
- Files: `cockpit/src/app/(app)/deals/[id]/deal-detail-client.tsx` MODIFY, `cockpit/src/components/ki-workspace/reports/registry.ts` MODIFY (DEAL_DETAIL_REPORTS auf echte Pfade)
- Expected behavior: Layout 2/3+1/3. Links KI-Workspace mit `context="deal-detail"`, scope mit `{userId, dealId}`. Rechts Tabs (Timeline/Tasks/Proposals/Documents). Mobile-Stack vertikal.
- Verification: Build clean. Live-Smoke nach Sub-Block-3-Deploy: 5 Berichts-Buttons rendern Bedrock-Antwort. Tabs funktional.
- Dependencies: MT-2, MT-3

### MT-6 (Sub-Block 4): 3 KI-Module + Edit-Tab entfernen
- Goal: Alte Briefing-Sidebar + Wissen-Tab + Signale-Action + Edit-Tab raus aus DOM.
- Files: `cockpit/src/app/(app)/deals/[id]/deal-detail-client.tsx` MODIFY (oder Sub-Components), Removal alter Component-Files (wenn zwingend, sonst kommentar-frei deaktiviert)
- Expected behavior: 4 Removal-Aktionen. Alle alten Imports entfernen (kein dead code). Bestehende Tests fuer Briefing-Sidebar/Wissen-Tab koennen entfernt werden (Logik wandert in `briefing.ts`-Tests).
- Verification: Build clean. Live-Smoke nach Sub-Block-4-Deploy: DOM-Asserts (Browser DevTools) bestaetigen 4 Removals.
- Dependencies: MT-5

### MT-7: Slice-Closing + Live-Smoke
- Goal: Build/Test/Lint-Gate + Live-Smoke + Records-Sync.
- Files: `slices/INDEX.md` (SLC-664 done), `planning/backlog.json` (BL-448 in_progress — FEAT-664 erst nach SLC-665 done), `docs/STATE.md`
- Expected behavior: User deployt 4 Sub-Block-Commits (jeweils mit Live-Smoke) ueber Coolify. Final-Smoke gegen Live-Container. RPT-XXX Completion-Report.
- Verification: alle ACs PASS in Live-Browser.
- Dependencies: MT-1..MT-6

---

## Definition of Done

- 7 MTs verifiziert (AC-1..AC-20 erfuellt)
- 4 Sub-Block-Commits mit Live-Smoke pro Sub-Block (R3.1-Mitigation)
- Vitest +5 Tests gruen, Bestehende Suite ohne Regression
- Build + Lint clean
- Live-Smoke 5 Berichts-Buttons + Pencil-Drawer + Stage-Wechsel + Mein-Tag-Switch + Mobile-Action-Bar PASS
- Code committed + gepusht auf main + Coolify-Redeploy pro Sub-Block
- /qa als naechster Schritt
