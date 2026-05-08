# SLC-653 — Settings inline-Sections in eigene Pages auslagern (BL-436 UA-002)

## Metadata
- **Slice ID:** SLC-653
- **Version:** V6.5
- **Feature:** FEAT-651
- **Status:** planned
- **Priority:** Medium
- **Created:** 2026-05-08
- **Estimated Effort:** ~1.5-3h
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped (Refactor mit klarer File-Boundary, atomic-revertable)

## Goal

Settings-Landing-Page von 9 Bloecken auf konsistentere Hierarchie reduzieren: PipelineConfig + TemplatesConfig in eigene Pages auslagern. ImapStatus + Role-Card bleiben inline.

## Scope

**In Scope:**
- Neue Page `cockpit/src/app/(app)/settings/pipelines/page.tsx` mit PipelineConfig
- Neue Page `cockpit/src/app/(app)/settings/templates/page.tsx` mit TemplatesConfig
- `cockpit/src/app/(app)/settings/page.tsx` aktualisieren: Inline-Render entfernen + 2 neue Karten als Eintragspunkte
- Sidebar-Eintraege pruefen (`Produkte` zeigt schon auf `/settings/products`, das war historisch)

**Out of Scope:**
- ImapStatus auslagern (bleibt inline, Status-Banner-Charakter)
- Role-Card auslagern (bleibt inline am Anfang)
- PipelineConfig-Logik aendern — nur Component-Verschiebung
- TemplatesConfig-Logik aendern

## Acceptance Criteria

- AC-1: `/settings/pipelines` Page existiert + zeigt PipelineConfig identisch zur frueheren inline-Variante
- AC-2: `/settings/templates` Page existiert + zeigt TemplatesConfig identisch zur frueheren inline-Variante
- AC-3: Settings-Landing zeigt 2 neue Link-Karten (Pipelines & Stages, Templates) zwischen bestehenden Karten — Style konsistent
- AC-4: Inline-Sections PipelineConfig + TemplatesConfig aus `settings/page.tsx` entfernt
- AC-5: ImapStatus + Role-Card bleiben inline auf Settings-Landing
- AC-6: Beide neue Pages haben Login-Required-Middleware (Auth-Posture wie andere Settings-Pages)
- AC-7: `npm run build` clean, Vitest 405/405+ PASS, kein neuer Lint-Error
- AC-8: Browser-Smoke: `/settings`, `/settings/pipelines`, `/settings/templates` alle laden korrekt; CRUD auf beiden funktional

## Reuse

- Bestehende Components `PipelineConfig` + `TemplatesConfig` werden 1:1 auf neue Pages gemoved (Component bleibt, Wrapper-Page neu)
- `cockpit/src/app/(app)/settings/products/page.tsx` als Pattern-Template fuer neue Pages
- PageHeader-Component fuer neue Pages

## Risks

- **Routing-Konflikt:** wenn `/settings/products` schon existiert und PipelineConfig-Logik enthaelt, dann ggf. Doppel-Auslagerung. Mitigation: vorher pruefen welche Page welche Logik enthaelt.
- **Layout-Regression:** Wrapper-Page koennte Padding/Spacing anders haben. Mitigation: Pattern-Template aus `/settings/products` strikt befolgen.
- **Sidebar-Drift:** wenn UA-005 in V6.4 "Termine"→"Termine-Liste" Pattern auch auf neue Eintraege angewandt werden muss. Mitigation: nur konsistente Sidebar-Anpassung wenn schon Eintrag existiert.

## Verification Strategy

- Pre: `cockpit/src/app/(app)/settings/page.tsx` lesen + `/settings/products/page.tsx` als Template
- Per-MT: Build + Visual-Inspection
- Slice-Level: Build + Vitest + Lint + Browser-Smoke 3 Pages + CRUD-Smoke

---

## Micro-Tasks

### MT-1: PipelineConfig-Page neu erstellen
- Goal: `/settings/pipelines/page.tsx` mit PipelineConfig.
- Files: `cockpit/src/app/(app)/settings/pipelines/page.tsx` (NEU)
- Expected behavior: Server-Component Wrapper mit PageHeader "Pipelines & Stages" + PipelineConfig-Component.
- Verification: `/settings/pipelines` laedt im Dev-Server, zeigt bestehende Pipelines.
- Dependencies: none

### MT-2: TemplatesConfig-Page neu erstellen
- Goal: `/settings/templates/page.tsx` mit TemplatesConfig.
- Files: `cockpit/src/app/(app)/settings/templates/page.tsx` (NEU)
- Expected behavior: Server-Component Wrapper mit PageHeader "Templates" + TemplatesConfig-Component.
- Verification: `/settings/templates` laedt im Dev-Server.
- Dependencies: none

### MT-3: Settings-Landing-Refactor
- Goal: Inline-Sections aus settings/page.tsx entfernen + 2 neue Karten.
- Files: `cockpit/src/app/(app)/settings/page.tsx`
- Expected behavior: PipelineConfig + TemplatesConfig Inline-Render entfernen (importieren auch entfernen wenn unused). 2 neue Link-Karten "Pipelines & Stages" → `/settings/pipelines`, "Templates" → `/settings/templates`.
- Verification: settings/page.tsx zeigt nur noch 8 Karten + ImapStatus + Role-Card inline; PipelineConfig + TemplatesConfig nicht mehr sichtbar.
- Dependencies: MT-1, MT-2

### MT-4: Sidebar-Pruefung
- Goal: Sicherstellen dass Sidebar-Eintraege konsistent sind.
- Files: `cockpit/src/components/layout/sidebar.tsx` (CHECK, keine Aenderung erwartet)
- Expected behavior: Pruefen ob bestehende `Produkte`/`Pipelines`-Eintraege jetzt auf neue Pages zeigen oder noch auf alte. Falls noetig: Pfad-Update.
- Verification: Sidebar zeigt korrekte Pfade ohne 404-Risk.
- Dependencies: MT-1, MT-2

### MT-5: Slice-Closing Build + Test + Lint
- Goal: Quality-Gate.
- Files: keine
- Expected behavior: `npm run build` + `npm run test` + `npm run lint` alle clean.
- Dependencies: MT-1..MT-4

### MT-6: Live-Smoke + Browser-CRUD
- Goal: Verifikation Pages + CRUD funktional.
- Files: keine
- Expected behavior: Coolify-Redeploy. Browser: `/settings`, `/settings/pipelines` (1 Stage hinzufuegen + entfernen), `/settings/templates` (1 Template anzeigen).
- Verification: Container healthy; CRUD-Aktionen funktional.
- Dependencies: MT-5

---

## Definition of Done

- 6 MTs verifiziert (AC-1..AC-8 erfuellt)
- Build + Lint + Vitest clean
- 3 Pages laden + CRUD funktional
- Atomic Commit `refactor(SLC-653/UA-002): split inline-sections to dedicated pages`
- /qa als naechster Schritt
