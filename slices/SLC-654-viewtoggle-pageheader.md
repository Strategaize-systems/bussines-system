# SLC-654 — ViewToggle Generic + Pipeline-PageHeader-Slot (BL-438 + BL-440)

## Metadata
- **Slice ID:** SLC-654
- **Version:** V6.5
- **Feature:** FEAT-651
- **Status:** planned
- **Priority:** Medium
- **Created:** 2026-05-08
- **Estimated Effort:** ~2-3h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped (Component-Refactor mit klarem Test-Coverage)
- **Architecture:** DEC-155 (ViewToggle Generic-Type) + DEC-156 (PageHeader Slot-Pattern)

## Goal

Zwei zusammen-gebuendelte Pipeline-Touch-Items: ViewToggle-Component generisch refactorn (UA-007) + Pipeline-View auf PageHeader-Slot-Pattern migrieren (UA-009).

## Scope

**In Scope:**
- `cockpit/src/components/ui/view-toggle.tsx` Refactor zu Multi-Mode-API mit Generic-Type-Param
- Existing Caller `contacts-client.tsx` auf neue API migrieren (Backward-Compat-Test)
- `pipeline-view.tsx` ViewToggle-Inline-Pattern (4 Modi) durch Component ersetzen
- `cockpit/src/components/ui/page-header.tsx` Erweiterung um optionalen `belowHeader?: ReactNode`-Prop
- `pipeline-view.tsx` von custom-h1+div auf `<PageHeader title subtitle belowHeader />` migrieren
- Tabs+KPIs als belowHeader-Slot-Inhalt

**Out of Scope:**
- Andere PageHeader-Caller (Mein Tag, Kontakte, Proposals) anfassen — bleiben unveraendert
- Pipeline-Tabs/KPIs Logik aendern
- Style-Guide-V2-Migration in pipeline-view.tsx (kommt in SLC-652)

## Acceptance Criteria

- AC-1: `view-toggle.tsx` hat Generic-Type-Param `<TMode extends string>` mit Props `modes: { value: TMode, icon, label }[]`, `active: TMode`, `onSelect: (mode: TMode) => void`
- AC-2: `contacts-client.tsx` migriert auf neue API mit 2-Modi-Tupel (`['cards', 'list']`); funktional unveraendert
- AC-3: `pipeline-view.tsx` ViewToggle-Inline (4 Modi: kanban/liste/funnel/winloss) durch Component ersetzt; identische visuelle Ausgabe
- AC-4: `page-header.tsx` hat neuen optionalen Prop `belowHeader?: React.ReactNode`; backward-kompatibel (existing Caller ohne Prop weiterhin korrekt)
- AC-5: `pipeline-view.tsx` h1-Block durch `<PageHeader title="Pipeline" subtitle="..." belowHeader={<PipelineTabsAndKPIs />} />` ersetzt; sticky-Verhalten bleibt erhalten
- AC-6: Vitest fuer ViewToggle-Component mit 2-Modi und 4-Modi-Test-Cases
- AC-7: `npm run build` clean, Vitest 405/405+ PASS, kein neuer Lint-Error
- AC-8: Browser-Smoke: `/pipeline/multiplikatoren` (4 Modi-Switching) + `/contacts` (2 Modi-Switching) — beide funktional

## Reuse

- Bestehende ViewToggle-API (2-Modi) als Spec-Vorlage fuer Generic-API
- PageHeader-Component bestehende sticky+backdrop-Logik
- Pipeline `kanbanRef` + `viewMode`-State unangetastet — nur Render-Pfad geaendert

## Risks

- **Generic-Type-Verlust:** TypeScript-Inferenz koennte bei Generic-Param verlieren. Mitigation: explizite Type-Args bei Caller (`<ViewToggle<'kanban'|'liste'|'funnel'|'winloss'> ... />`).
- **Sticky-Header-Layer-Konflikt:** PageHeader sticky + Pipeline-eigenes sticky-Pattern koennten z-index-fighten. Mitigation: pipeline-view.tsx eigene sticky-Layer entfernen, nur PageHeader-Sticky behalten.
- **Tabs+KPIs in belowHeader:** kann visuell dichter wirken. Mitigation: Padding/Spacing in belowHeader-Slot konsistent zu PageHeader-children.

## Verification Strategy

- Pre: ViewToggle + PageHeader Source lesen, Pipeline-View Header-Section identifizieren
- Per-MT: Build + Visual-Dev-Inspection
- Slice-Level: Build + Vitest (mit Mode-Tests) + Lint + Browser-Smoke beide Pages

---

## Micro-Tasks

### MT-1: ViewToggle Generic-Refactor
- Goal: ViewToggle-Component auf Generic-Type-Param umstellen.
- Files: `cockpit/src/components/ui/view-toggle.tsx`
- Expected behavior: Generic-Function-Component mit `<TMode extends string>`. Props: `modes: ReadonlyArray<{ value: TMode, icon: ReactNode, label: string }>`, `active: TMode`, `onSelect: (mode: TMode) => void`. Render: Map ueber `modes`, Active-Highlighting via `active === value`.
- Verification: TS-Compile clean; existing 2-Modi-Caller-Pattern bleibt funktional.
- Dependencies: none

### MT-2: Contacts-Client Migration auf neue API
- Goal: contacts-client.tsx auf neue ViewToggle-API umstellen.
- Files: `cockpit/src/app/(app)/contacts/contacts-client.tsx`
- Expected behavior: ViewToggle-Aufruf mit `modes={[{value:'cards', ...}, {value:'list', ...}]}`. Funktional unveraendert.
- Verification: `/contacts` Browser-Smoke: View-Switch funktional.
- Dependencies: MT-1

### MT-3: Pipeline-View ViewToggle-Migration
- Goal: pipeline-view.tsx 4-Modi-Inline durch Component ersetzen.
- Files: `cockpit/src/app/(app)/pipeline/pipeline-view.tsx`
- Expected behavior: 4-Mode-Tupel `['kanban','liste','funnel','winloss']` mit Icons. Inline-Pattern entfernt. Active-State via `viewMode`-Prop unveraendert.
- Verification: `/pipeline/multiplikatoren` Browser-Smoke: alle 4 Modi switchbar.
- Dependencies: MT-1

### MT-4: Vitest fuer ViewToggle Generic
- Goal: Pure-Function-Test fuer ViewToggle Multi-Mode.
- Files: `cockpit/src/components/ui/view-toggle.test.tsx` (NEU oder EXTEND)
- Expected behavior: 2 Test-Cases: 2-Modi (Kontakte-Pattern), 4-Modi (Pipeline-Pattern); jeder testet onSelect-Callback wird mit korrektem Mode-Value aufgerufen.
- Verification: `npm run test -- view-toggle` 2 neue Tests gruen.
- Dependencies: MT-1

### MT-5: PageHeader belowHeader-Prop ergaenzen
- Goal: PageHeader-Component erweitern.
- Files: `cockpit/src/components/ui/page-header.tsx`
- Expected behavior: Neuer optionaler Prop `belowHeader?: React.ReactNode`. Render: nach Title+Subtitle innerhalb sticky-Container (vor `</PageHeader>`-Close). Falls `undefined`, kein zusaetzliches Markup.
- Verification: TS-Compile clean; existing PageHeader-Caller (Mein Tag, Kontakte, Proposals) unveraendert funktional.
- Dependencies: none

### MT-6: Pipeline-View PageHeader-Migration
- Goal: pipeline-view.tsx von custom-h1 auf PageHeader-Slot.
- Files: `cockpit/src/app/(app)/pipeline/pipeline-view.tsx`
- Expected behavior: Native h1+div-Block ersetzt durch `<PageHeader title="Pipeline" subtitle={pipelineSubtitle} belowHeader={<PipelineTabsAndKPIs />} />`. PipelineTabsAndKPIs als ggf. neue innere Komponente oder inline-jsx.
- Verification: `/pipeline/multiplikatoren` Browser-Smoke: Header sticky, Tabs+KPIs scrollen mit, sticky+backdrop funktioniert.
- Dependencies: MT-5

### MT-7: Slice-Closing Build + Test + Lint + Live-Smoke
- Goal: Quality-Gate + Production-Verifikation.
- Files: keine Code; Atomic Commit `refactor(SLC-654): viewtoggle-generic + pipeline-pageheader-slot`
- Expected behavior: Build + Vitest + Lint clean. Coolify-Redeploy. Browser-Smoke beide Pages funktional.
- Verification: Container healthy; ViewToggle + PageHeader-Slot beide funktional in Production.
- Dependencies: MT-1..MT-6

---

## Definition of Done

- 7 MTs verifiziert (AC-1..AC-8 erfuellt)
- Build + Lint + Vitest clean (mit 2 neuen ViewToggle-Tests)
- Browser-Smoke 2 Pages gruen
- Atomic Commit gepusht
- /qa als naechster Schritt
