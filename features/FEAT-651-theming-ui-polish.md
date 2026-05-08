# FEAT-651 — Theming-Foundation + UI-Polish

**Status:** planned
**Version:** V6.5
**Created:** 2026-05-08
**Sources:** RPT-338 V6.4 UI-Audit (UA-002, UA-007, UA-009, UA-011, UA-012, UA-013)

## Purpose

V6.4 UI-Audit hat 178 Style-Guide-V2-Drift-Stellen ueber 30 Files identifiziert (73 arbitrary Color-Klassen + 41 arbitrary Spacing-Werte + 64 arbitrary Gradient-Hex-Werte). Brand-Colors `#120774` `#4454b8` `#00a84f` `#4dcb8b` `#f2b705` werden konsistent verwendet, aber als Hex inline ohne zentrale Token-Definition in `tailwind.config.ts`. Plus 3 UI-Refactor-Items, die in V6.4 als V6.5-Defer klassifiziert wurden: Settings-Inline-Sections-Auslagerung, Pipeline ViewToggle generisch, Pipeline-View auf PageHeader.

Ziel: Theming-Foundation als Pre-Req fuer kuenftige UI-Slices (V7-Multi-User-Sidebar baut visuell bestehendes Pattern auf, sollte Tokens nutzen) plus 3 Polish-Items abraeumen, bevor V7 die Pipeline/Sidebar/Settings-Architektur sowieso umbaut.

## Scope

### Teil 1: Theming-Foundation (BL-441)

**Phase A — Tokens-Setup (klein, ~30min):**
- `tailwind.config.ts` erweitern um `colors.primary`/`colors.success`/`colors.warning`/`colors.danger`-Block mit DEFAULT + Varianten basierend auf Brand-Hex-Werten
- Optional: Gradient-Utility-Classes via `@layer components` in `app/globals.css` (z.B. `.bg-gradient-primary { @apply bg-gradient-to-r from-[#120774] to-[#4454b8]; }`)
- Build clean, kein Visual-Regress

**Phase B — Migration (gross, ~3+h):**
- 30 Files migrieren: `text-[#4454b8]` → `text-primary`, `bg-[#4454b8]/10` → `bg-primary/10`, etc.
- Pattern-Group: `bg-[#xxx]` (73 Stellen), `from-[#xxx] to-[#xxx]` (64 Stellen), `p-[Npx]/m-[Npx]/gap-[Npx]` (41 Stellen)
- Visuelle Verifikation pro betroffener Page (Mein Tag, Pipeline, Proposals, Settings, Kontakte, Dashboard u.a.)

### Teil 2: Settings inline-Sections in eigene Pages (BL-436, UA-002)

`cockpit/src/app/(app)/settings/page.tsx` enthaelt 6 Link-Karten + 3 Inline-Sections (ImapStatus, PipelineConfig, TemplatesConfig). Inline-Sections wurden vor den Karten eingefuehrt (V2-Zeit). PipelineConfig hat bereits eigene Page `/settings/products`, ist aber zusaetzlich inline gerendert (Doppel-Anzeige).

**Loesung:**
- PipelineConfig + TemplatesConfig in eigene Pages auslagern (`/settings/pipelines/`, `/settings/templates/`)
- ImapStatus bleibt inline (Status-Banner-Charakter)
- Karten-Eintragspunkt fuer ausgelagerte Inline-Sections auf Settings-Landing
- Role-Card bleibt inline am Anfang

### Teil 3: ViewToggle generisch (BL-438, UA-007)

`pipeline-view.tsx:188-235` hat 4 ViewToggle-Buttons mit individuellem `cn(...)`-Style (Kanban, Liste, Funnel, Win/Loss). ViewToggle-Component existiert bereits (`cockpit/src/components/ui/view-toggle.tsx`) mit 2-Modi-API (Kontakte: Cards/Liste). Pipeline hat eigenes inline-Pattern wegen 4 statt 2 Modi.

**Loesung:**
- ViewToggle erweitern um Multi-Mode-API (Mode-Type generisch via Type-Param)
- Pipeline-View nutzt erweiterte Variante
- Kontakte-View bleibt funktional

### Teil 4: Pipeline-View auf PageHeader (BL-440, UA-009)

`pipeline-view.tsx:154-158` hat native `<div>` mit `text-2xl font-bold` (UA-010 in V6.4 schon auf text-3xl gefixt). PageHeader-Component (`page-header.tsx`) wird von 3 anderen Pages genutzt mit sticky+backdrop-blur. Pipeline kann nicht 1:1 umsteigen wegen Tabs+KPIs unter dem Header (zwei Header-Layer).

**Loesung:**
- H1+Subtitle in PageHeader-Slot wandern, Tabs+KPIs darunter
- kanbanRef+sticky-Layer-Management klaeren

## Acceptance Criteria

**AC1:** `tailwind.config.ts` enthaelt Brand-Tokens (`primary`, `success`, `warning`, `danger`) basierend auf den 5 Brand-Hex-Werten.

**AC2:** Mindestens 2 Files migriert von arbitrary-Hex auf Tokens als Beweis das die Tokens funktionieren.

**AC3:** PipelineConfig in `cockpit/src/app/(app)/settings/pipelines/page.tsx` ausgelagert; Inline-Render in settings/page.tsx entfernt.

**AC4:** TemplatesConfig in `cockpit/src/app/(app)/settings/templates/page.tsx` ausgelagert; Inline-Render in settings/page.tsx entfernt.

**AC5:** ViewToggle-Component nimmt Multi-Mode-API entgegen; `pipeline-view.tsx` nutzt sie statt eigenem inline-Pattern.

**AC6:** Pipeline-View nutzt `<PageHeader>` fuer H1+Subtitle, Tabs+KPIs darunter ohne Layer-Konflikt.

**AC7:** Build clean, Vitest 405/405+ PASS, kein neuer Lint-Error.

**AC8:** Browser-Smoke 5 Haupt-Pages (Mein Tag, Pipeline, Proposals, Settings, Kontakte) — alle visuell intakt, kein Style-Regress.

**AC9:** RPT enthaelt Migration-Statistik: wieviele Drift-Stellen migriert vs. verbleibend (Plan fuer Restmigration in spaeteren Slices).

## Out of Scope

- Komplette 178-Stellen-Migration in V6.5 — Phase B kann iterativ ueber mehrere Slices laufen
- Mobile-Optimierung (separates Sprint-Thema)
- Color-Palette-Wechsel (Style Guide V2 ist verbindlich)
- Accessibility-Audit (separater Sprint)
- shadcn/ui-Theme-Override-Pattern (nur wenn Tailwind-Tokens nicht reichen)

## Open Questions for /architecture

- Sollte BL-441 in 2 Slices gesplittet werden (Tokens-Setup als eigener Slice, dann Migration)?
- Migration-Strategie: alle 30 Files in einem Slice oder pro Page-Bereich?
- Visual-Regression: Manuelle Page-Smokes (V6.4-Pattern) oder erste Snapshot-Tests via Playwright?
- ViewToggle Multi-Mode: Generic-Type-Refactor oder neue Variante neben bestehender?
- UA-009 Pipeline-PageHeader: Wie mit dem 2-Layer-Header (PageHeader + Pipeline-Tabs/KPIs) umgehen?

## References

- BL-441 in `/planning/backlog.json` (V6.5 Anker-Item)
- BL-436, BL-438, BL-440 in `/planning/backlog.json` (UI-Refactor-Items)
- RPT-338 V6.4 UI-Audit (UA-002, UA-007, UA-009, UA-011, UA-012, UA-013) fuer Drift-Statistik
- DEC-150 V6.4 UI-Audit-Tiefe (Klein in V6.4, Gross in V6.5)
- `docs/STYLE_GUIDE_REFERENCE.md` Style Guide V2 als Token-Definition-Quelle
- `cockpit/src/components/ui/page-header.tsx` als Referenz-Component
- `cockpit/src/components/ui/view-toggle.tsx` als Erweiterungs-Basis
