# SLC-712a — Pipeline-Drilldown Vollausbau via PipelineView-Reuse

## Metadata
- **Slice ID:** SLC-712a
- **Version:** V7.1
- **Feature:** FEAT-712
- **Status:** planned
- **Priority:** Medium (User-Wunsch aus V7-Walkthrough, Teamlead-Coaching-Bedarf)
- **Created:** 2026-05-15
- **Estimated Effort:** ~3-4h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** empfohlen (PipelineView ist Hot-Path-Component, Refactor-Fehler wuerden Self-Pipeline kaputt machen)
- **Architecture:** DEC-199, DEC-200
- **Reihenfolge-Pflicht:** **nach SLC-711** (Settings-Permissions zuerst). **vor SLC-712b** (etabliert das Reuse-Pattern fuer Aufgaben + Mein-Tag).

## Goal

Heutiger `/team/[user_id]/pipeline/page.tsx` ist eine separate reduzierte Tabelle (Code-Comment: "Volle Pipeline-Sicht kommt in V7.5+"). V7.1 zieht das vor: Drilldown-Page wird zur Read-Only-Variante der echten `<PipelineView>` mit allen Toggle-Optionen (Kanban/Funnel/List, Stage-Filter, Forecast).

Etabliert das **`readOnly` + `viewAsUserId`-Pattern (DEC-199)** als Blueprint, den SLC-712b auf Aufgaben + Mein-Tag wiederverwendet.

## Scope

**In Scope:**

PipelineView-Component-Erweiterung:
- `cockpit/src/app/(app)/pipeline/pipeline-view.tsx` (MOD) — 2 neue optionale Props `readOnly?: boolean` + `viewAsUserId?: string`. Mutate-UI gegated (Drag-Drop, Edit-Buttons, "New Deal"-Button, Stage-Change-Confirm-Dialogs). Filter-State-Storage-Key mit viewAsUserId-Postfix (DEC-200).

Drilldown-Pipeline-Page umschreiben:
- `cockpit/src/app/(app)/team/[user_id]/pipeline/page.tsx` (REWRITE) — lädt gleiche Daten wie `/pipeline/[slug]` (`getPipelines`, `getPipelineStages`, `getDealsForPipeline` mit `ownerUserId`-Scope), uebergibt sie an `<PipelineView readOnly viewAsUserId={user_id} />`.

Daten-Loading mit Owner-Scope:
- `cockpit/src/app/(app)/pipeline/actions.ts` (MOD wenn noetig) — `getDealsForPipeline` braucht optionalen `ownerUserId`-Filter. Falls heute nicht vorhanden: additiv hinzufuegen. RLS erlaubt Teamlead ohnehin Read auf Team-Member-Daten (V7-MIG-033/034), Filter ist nur fuer expliziten Owner-Scope.

Tests:
- `cockpit/src/app/(app)/pipeline/pipeline-view.test.tsx` (NEU oder MOD, falls existiert) — RTL-Tests fuer `readOnly` + `viewAsUserId`-Verhalten

**Out of Scope (SLC-712b):**
- Aufgaben-Drilldown
- Mein-Tag-Drilldown
- KI-Workspace-scope auf target_user_id

**Out of Scope (V7.2+):**
- Deal-Detail-Sheet-Reuse im Drilldown (heute kein Sheet auf /team/[user]/pipeline, V7.1 macht es nicht klickbar auf Deal-Detail)
- Performance-Optimierung der Drilldown-Queries (heutige Queries reichen)

## Acceptance Criteria

- **AC1** PipelineView ohne readOnly-Prop verhaelt sich identisch zu V7-Stand (Regression-frei): Self-Pipeline-User sieht alle Mutate-Buttons wie heute.
- **AC2** PipelineView mit `readOnly={true}`: Stage-Change-Dropdown verschwindet, "New Deal"-Button verschwindet, Drag-Drop deaktiviert (CSS pointer-events:none + dnd-handlers no-op), Edit-Buttons verschwinden. Funnel/Kanban/List-Toggle bleibt aktiv. Stage-Filter bleibt aktiv. Campaign-Filter bleibt aktiv. Pipeline-Switcher bleibt aktiv.
- **AC3** PipelineView mit `viewAsUserId="abc"`: localStorage-Key fuer Filter-State wird `pipeline-filter-state-viewAs-abc` (Pattern aus DEC-200). Wechsel zwischen viewAs-A und viewAs-B haelt zwei separate Filter-States.
- **AC4** `/team/[user_id]/pipeline` zeigt fuer Teamlead alle Pipelines des Target-Members mit voller Toggle-Funktionalitaet read-only. Heutige reduzierte Tabelle ist ersetzt.
- **AC5** Vitest fuer PipelineView-readOnly-Behavior gruen (mindestens 2 Tests: readOnly=true hidet Mutate-Buttons + viewAsUserId postfixt Filter-State-Key).
- **AC6** `npm run test:all` clean (Regression-frei).
- **AC7** Live-Smoke (Teamlead-Sicht): Klick auf Team-Member → /team/[user]/pipeline zeigt PipelineView, Stage-Filter funktioniert, Funnel-Toggle funktioniert, Forecast wird berechnet. Drag-Drop versuch hat keinen Effekt. Stage-Change-Button nicht sichtbar.

## Micro-Tasks

### MT-1: PipelineView Props-API erweitern + Mutate-Button-Hiding
- **Goal:** `<PipelineView>` bekommt 2 neue optionale Props. Alle Mutate-Elements bekommen `readOnly &&`-Gate. Default-Verhalten (readOnly undefined → false) ist identisch zur V7-Self-Pipeline.
- **Files:**
  - `cockpit/src/app/(app)/pipeline/pipeline-view.tsx` (MOD)
- **Expected behavior:**
  - Interface `PipelineViewProps` ergaenzt: `readOnly?: boolean`, `viewAsUserId?: string`.
  - `setShowNewDeal`-Trigger nur sichtbar wenn `!readOnly`.
  - Drag-Drop-Handler im Kanban-Mode (vermutlich `@dnd-kit/sortable` oder `react-dnd`) deaktiviert wenn `readOnly` (entweder Sortable disabled-Prop oder Event-Handler-Early-Return).
  - Stage-Change-Dropdown auf Deal-Card: hidden wenn readOnly.
  - Deal-Edit-Button: hidden wenn readOnly.
  - "Neuer Deal"-Top-Right-Button: hidden wenn readOnly.
  - PageHeader-Title wird `${pipeline.name} (Read-Only)` wenn readOnly, sonst unveraendert.
- **Verification:**
  - TSC: `cd cockpit && npx tsc --noEmit` clean
  - Build: `npm run build` clean
  - Lokal: Self-Pipeline rendert identisch zu vorher (visuelle Regression-Pruefung)
- **Dependencies:** none

### MT-2: Filter-State-Storage-Key-Schema umbauen
- **Goal:** Filter-State-Persistierung (localStorage) bekommt `viewAsUserId`-Postfix nach DEC-200. Self-Pipeline-Key bleibt unveraendert (Backward-Compatibility).
- **Files:**
  - `cockpit/src/app/(app)/pipeline/pipeline-view.tsx` (MOD) — vermutlich existiert eine Konstante `STORAGE_KEY` oder useLocalStorage-Hook
- **Expected behavior:**
  - Pure function `getStorageKey(viewAsUserId?: string): string` returnt `pipeline-filter-state-viewAs-${viewAsUserId}` wenn Prop, sonst `pipeline-filter-state`.
  - Falls heute kein Persistence-Pattern existiert: dann ist diese MT no-op und wird im Slice-Report dokumentiert.
- **Verification:**
  - Browser-DevTools: localStorage-Keys nach Self-Pipeline-Visit + Drilldown-Visit zeigen 2 separate Keys
- **Dependencies:** MT-1

### MT-3: Drilldown-Pipeline-Page auf PipelineView-Reuse umschreiben
- **Goal:** `team/[user_id]/pipeline/page.tsx` wird umgeschrieben: lädt gleiche Daten wie `/pipeline/[slug]` (mit ownerUserId-Scope), uebergibt sie an `<PipelineView readOnly viewAsUserId={user_id} ...>`. Heutige reduzierte Tabelle entfernt.
- **Files:**
  - `cockpit/src/app/(app)/team/[user_id]/pipeline/page.tsx` (REWRITE)
  - `cockpit/src/app/(app)/pipeline/actions.ts` (MOD, additiv) — `getDealsForPipeline` bekommt optionalen `{ ownerUserId }`-Filter (RLS erlaubt das ohnehin, Filter ist semantisch).
- **Expected behavior:**
  - Page lädt: pipelines, stages, deals (gefiltert auf owner_user_id=user_id), contacts, companies, referrals, campaigns
  - Page rendert: `<PipelineView pipeline={defaultPipeline} pipelines={pipelines} stages={stages} deals={deals} contacts={contacts} companies={companies} referrals={referrals} currentSlug={defaultPipeline.slug} campaigns={campaigns} readOnly viewAsUserId={user_id} />`
  - Default-Pipeline-Auswahl: erste Pipeline aus sortierter Liste (analog zu `/pipeline/multiplikatoren` Default-Verhalten).
  - PageHeader bleibt mit Drilldown-Context ("Pipeline (Drilldown) — {Member-Name}").
- **Verification:**
  - TSC clean
  - Browser-Smoke: `/team/[real-user-id]/pipeline` rendert volle PipelineView mit allen Toggles
- **Dependencies:** MT-1 + MT-2

### MT-4: Vitest fuer PipelineView readOnly + viewAsUserId
- **Goal:** Mindestens 2 RTL-Tests die das neue Verhalten verifizieren. Pattern aus existierenden pipeline-view-Tests (falls vorhanden) wiederverwenden.
- **Files:**
  - `cockpit/src/app/(app)/pipeline/pipeline-view.test.tsx` (NEU oder MOD)
- **Expected behavior:**
  - Test 1: `render(<PipelineView readOnly={true} ...mockProps />)` → kein "Neuer Deal"-Button findbar, kein Stage-Change-Trigger
  - Test 2: `render(<PipelineView readOnly={false} ...mockProps />)` (Default) → "Neuer Deal"-Button findbar (Regression-Check)
  - Test 3 (optional): viewAsUserId-Prop postfixt Filter-State-Key — mock-localStorage-Pattern, oder Pure-Function-Test von `getStorageKey`
- **Verification:**
  - `cd cockpit && npm run test -- pipeline-view` gruen
  - `npm run test:all` 760+/760+ gruen
- **Dependencies:** MT-1 (Component-Aenderung muss existieren)

## Risks & Mitigations

- **Risk R1:** PipelineView ist Hot-Path und Self-Pipeline-Regression-Risiko ist hoch. **Mitigation:** Default `readOnly = false` muss in MT-1 garantieren, dass keine Verhalten-Aenderung bei Aufruf ohne neue Props. Worktree-Isolation empfohlen.
- **Risk R2:** Drag-Drop-Deaktivierung kann subtil sein (Sortable-Library-API abhaengig). **Mitigation:** Wenn Sortable-disabled-Prop nicht greift, Event-Handler-Early-Return als Plan B. Live-Smoke pruefen ob Drag-Drop wirklich no-op ist.
- **Risk R3:** `getDealsForPipeline` hat heute moeglicherweise schon einen Owner-Filter (z.B. via auth.uid()-Default). **Mitigation:** /backend prueft Funktions-Signature, ggf. ist MT-3-Action-MOD no-op.
- **Risk R4:** Drilldown-Layout aus SLC-706 nutzt `runWithReadOnlyContext` — Server-Action-Calls von PipelineView werden in V7.1 noch nicht via Header gechecked (ISSUE-066 V7.5-Mitigation). **Mitigation:** UX-Layer (Buttons hidden) ist primary Verteidigung; Defense-in-Depth kommt mit SLC-713.

## Dependencies

- **SLC-711** muss done sein (Sprint-Reihenfolge sichtbar zuerst). Nicht technisch, aber per User-Entscheidung 2026-05-15.
- **None technisch** — SLC-712a ist eigenstaendig.

## Verification & Tests

- TSC clean
- `npm run test -- pipeline-view` gruen (MT-4)
- `npm run test:all` clean
- Live-Smoke Teamlead-Sicht (AC4+AC7): /team/[real-user]/pipeline zeigt PipelineView mit allen Toggles, Mutate-Buttons unsichtbar

## Open Points

- MT-3 ownerUserId-Filter-Pattern: pruefen ob `getDealsForPipeline` heute schon optionalen Owner-Filter hat (Implementation-Detail in /backend)
- MT-2 Storage-Key-Existenz: pruefen ob PipelineView heute Filter-State persistiert (Implementation-Detail in /backend)

## Files Reviewed (Slice-Planning)

- `cockpit/src/app/(app)/pipeline/pipeline-view.tsx` (Props-Interface + Component-Body Z.34-100)
- `cockpit/src/app/(app)/team/[user_id]/pipeline/page.tsx` (heutige reduzierte Variante)
- `cockpit/src/app/(app)/pipeline/[slug]/page.tsx` (Self-Reference)
- `cockpit/src/lib/auth/read-only-context.ts` (Layout-Wrap-Context)

## Recommended Implementation Skill

`/backend` fuer MT-1 + MT-2 + MT-3 (Component-Refactor + Page-Rewrite + Action-MOD).
`/qa` fuer MT-4 Vitest + Live-Smoke. Nach SLC-712a PASS: SLC-712b starten.
