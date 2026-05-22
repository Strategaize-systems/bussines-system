# SLC-826 — Hilfe-Section (Authenticated /help)

- **Feature:** FEAT-823 Hilfe-Section
- **Version:** V8.3
- **Status:** planned
- **Priority:** High
- **Created:** 2026-05-22

## Goal

Authenticated Help-Center fuer alle Rollen: `/help` Tile-Page mit 12 Feature-Guides + `/help/[slug]` Detail-Pages mit Markdown-Rendering. Eigene Top-Section `HILFE` in der Sidebar.

Foundation aus V8.2 wird wiederverwendet (`renderLegalMarkdown` + Markdown-Renderer-Pattern). Keine Schema-Migration, keine neuen DECs.

## Scope

**In scope:**
- 12 Markdown-Content-Files unter `cockpit/src/content/help/` als 1:1-Spiegelung von `/deliverables/user-guide/`
- `/help`-Route mit Tile-Layout (gruppiert nach 4 Sections: Erste Schritte / Verwaltung / KI-Werkzeuge / Spezial-Themen)
- `/help/[slug]`-Route mit Markdown-Rendering und Back-Link
- Eigene `.help-content`-CSS-Schicht analog `.legal-content`
- Eigene Sidebar-Top-Section `HILFE` mit 1 Item, sichtbar fuer alle 3 Rollen
- Pure-Data Catalog (`cockpit/src/lib/help/catalog.ts`) mit Slug/Titel/Section/Dauer/Rollen-Metadaten

**Out of scope (Polish-Pass oder spaeter):**
- Text-Polish der gespiegelten Markdown-Inhalte (User-Direktive `feedback_compliance_gate_later`)
- Adress-/KvK-/BTW-Daten in Guide-Files (User-Action ausstehend)
- Video-Embeds pro Tile (Theme 3 Praesentationsvideo spaeter)
- Tailwind-Typography-Plugin (per User-Direktive: eigene CSS-Schicht statt Plugin)
- Search/Filter auf `/help` (nicht in V8.3-Scope)
- Public-Variante (User-Entscheidung: Authenticated)

## Acceptance Criteria

- **AC1** — `/help` und `/help/[slug]` sind authenticated. Unangemeldete Requests werden vom Middleware auf `/login` umgeleitet (KEINE Erweiterung der `publicPaths`-Whitelist).
- **AC2** — `/help` zeigt 4 Sections gem. `cockpit/src/lib/help/catalog.ts` mit insgesamt 12 Tiles.
- **AC3** — Jede Tile zeigt: Guide-Titel + Dauer-Badge (z.B. "10 Min") + Rollen-Badge ("Alle Rollen" / "Admin" / "Admin, Teamlead").
- **AC4** — Klick auf eine Tile fuehrt zu `/help/<slug>`.
- **AC5** — `/help/<slug>` rendert das zugehoerige `cockpit/src/content/help/<slug>.md` ueber `renderLegalMarkdown` mit `.help-content`-CSS-Wrapper.
- **AC6** — `/help/<unbekannter-slug>` liefert `notFound()` (Next.js 404).
- **AC7** — Auf jeder Detail-Page steht ein "Zurueck zur Uebersicht"-Link zu `/help`.
- **AC8** — Sidebar zeigt eine neue Top-Section `HILFE` mit dem Item "Hilfe & Anleitungen" (Icon `HelpCircle`), sichtbar fuer alle 3 Rollen, Position **zwischen `VERWALTUNG_MEIN` und `WERKZEUGE`**.
- **AC9** — Vitest deckt `sidebar-config.ts` (HILFE-Section + alle 3 Rollen) und `catalog.ts` (alle 12 Slugs aufloesbar, jede Rollen-Zuordnung valide) ab.
- **AC10** — `npm run build` clean (TSC + Lint). `npm run test` mind. so viele Tests wie V8.2-Baseline (1059) plus die neuen Help-Tests.

## Micro-Tasks

### MT-1: Catalog + Content-Files (Spiegelung)
- **Goal:** 12 Guide-Markdown-Files 1:1 von `/deliverables/user-guide/` nach `cockpit/src/content/help/` spiegeln und Catalog mit Metadaten anlegen.
- **Files:**
  - `cockpit/src/content/help/mein-tag.md`
  - `cockpit/src/content/help/pipeline.md`
  - `cockpit/src/content/help/deal-detail.md`
  - `cockpit/src/content/help/compose.md`
  - `cockpit/src/content/help/settings.md`
  - `cockpit/src/content/help/team-verwaltung.md`
  - `cockpit/src/content/help/ki-usage.md`
  - `cockpit/src/content/help/workflow-automation.md`
  - `cockpit/src/content/help/custom-reports.md`
  - `cockpit/src/content/help/kampagnen.md`
  - `cockpit/src/content/help/zahlungsbedingungen.md`
  - `cockpit/src/content/help/vat-reverse-charge.md`
  - `cockpit/src/lib/help/catalog.ts` (Pure-Data: `HelpGuide`-Type + `HELP_CATALOG`-Array + `getHelpGuideBySlug` + `groupBySection`)
  - `cockpit/src/lib/help/__tests__/catalog.test.ts` (Vitest: jeder Slug aufloesbar, alle Rollen-Werte valide, 12 Eintraege gesamt)
- **Expected behavior:** Catalog ist Single-Source-of-Truth fuer Titel/Dauer/Rollen/Section pro Slug. Markdown-Files sind 1:1-Spiegel ohne inhaltliche Aenderung (keine Re-Linking-Anpassung in MT-1).
- **Verification:**
  - `npm run test -- src/lib/help/` → alle Tests gruen
  - `ls cockpit/src/content/help/ | wc -l` → 12 Files
  - No-Orphan-Check (Test): fuer jeden `HELP_CATALOG`-Slug existiert ein `.md`-File (Vitest pruefbar via `fs.existsSync`)
- **Dependencies:** keine

### MT-2: `/help`-Route Tile-Page
- **Goal:** Authenticated Index-Page mit Tile-Layout, gruppiert nach 4 Catalog-Sections.
- **Files:**
  - `cockpit/src/app/(app)/help/page.tsx` (Server Component, liest Catalog, rendert 4 Sections mit Tiles)
- **Expected behavior:**
  - Layout: PageHeader mit Titel "Hilfe & Anleitungen" + Section-Header pro Catalog-Section + Grid mit Tiles
  - Tile zeigt Titel + Dauer-Badge + Rollen-Badge, ist als `<Link href="/help/${slug}">`
  - Style-Guide-V2-konform: Card-Component (ggf. existierende `Card` aus shadcn/ui)
  - Eingebettet ins `(app)`-Layout → Sidebar bleibt sichtbar
- **Verification:**
  - `npm run build` clean
  - Live-Smoke in `/qa`: Page rendert 12 Tiles, jede klickbar
- **Dependencies:** MT-1

### MT-3: `/help/[slug]`-Route Detail-Page + CSS-Schicht
- **Goal:** Detail-Page rendert Markdown-Content mit `.help-content`-CSS und Back-Link.
- **Files:**
  - `cockpit/src/app/(app)/help/[slug]/page.tsx` (Server Component, liest File, `renderLegalMarkdown`, `notFound()` bei unbekanntem Slug)
  - `cockpit/src/components/help/help-page-shell.tsx` (analog `legal-page-shell.tsx`, aber ohne LegalFooter, mit Back-Link "Zurueck zur Uebersicht" zu `/help`)
  - `cockpit/src/app/globals.css` (PATCH: `.help-content`-Selector-Schicht analog `.legal-content`, eigene Schicht statt Reuse)
- **Expected behavior:**
  - Slug aus Catalog aufloesen, File aus `cockpit/src/content/help/<slug>.md` laden
  - `renderLegalMarkdown` aus `@/lib/legal/markdown` reusen
  - `HelpPageShell` rendert HTML in `<article class="help-content">`-Wrapper
  - Bei unbekanntem Slug → Next.js `notFound()` → 404
  - Page-Titel (`generateMetadata`) aus Catalog-Eintrag
- **Verification:**
  - `npm run build` clean
  - Live-Smoke in `/qa`: `/help/mein-tag` rendert H1+H2+Listen mit `.help-content`-Style, `/help/unknown` liefert 404
- **Dependencies:** MT-1

### MT-4: Sidebar HILFE-Section
- **Goal:** Eigene Top-Section `HILFE` in `sidebar-config.ts`, Position zwischen `VERWALTUNG_MEIN` und `WERKZEUGE`.
- **Files:**
  - `cockpit/src/lib/navigation/sidebar-config.ts` (PATCH: `SidebarSection`-Type um `"HILFE"` erweitern, `SECTION_LABEL.HILFE = "HILFE"`, `SECTION_ORDER` an Position 5 einfuegen, 1 neuer `SidebarItem` mit `href="/help"`, `label="Hilfe & Anleitungen"`, `icon=HelpCircle`, `visibleFor=ALL_ROLES`)
  - `cockpit/src/lib/navigation/sidebar-config.test.ts` (PATCH: 2 neue Test-Cases — "HILFE section is visible for all 3 roles" + "HILFE section appears after VERWALTUNG_MEIN and before WERKZEUGE")
- **Expected behavior:**
  - Alle 3 Rollen sehen den HILFE-Eintrag
  - Section-Position visuell zwischen Mein-Profil-Block und WERKZEUGE
  - Kein Parent-Section (HILFE ist Top-Level wie ANALYSE/WERKZEUGE)
- **Verification:**
  - `npm run test -- src/lib/navigation/sidebar-config.test.ts` → alle Tests gruen
  - Live-Smoke in `/qa`: Sidebar zeigt neue Section
- **Dependencies:** keine (kann parallel zu MT-3 laufen; sinnvoll als letztes, damit der Link nicht ins Leere klickt, wenn `/help` noch nicht da ist)

## Files-Plan Zusammenfassung

| Operation | Anzahl | Pfade (gruppiert) |
|---|---|---|
| Created (Content) | 12 | `cockpit/src/content/help/*.md` |
| Created (Lib + Tests) | 2 | `cockpit/src/lib/help/catalog.ts`, `cockpit/src/lib/help/__tests__/catalog.test.ts` |
| Created (Routes) | 2 | `cockpit/src/app/(app)/help/page.tsx`, `cockpit/src/app/(app)/help/[slug]/page.tsx` |
| Created (Components) | 1 | `cockpit/src/components/help/help-page-shell.tsx` |
| Modified | 3 | `cockpit/src/app/globals.css` (.help-content), `cockpit/src/lib/navigation/sidebar-config.ts` (HILFE), `cockpit/src/lib/navigation/sidebar-config.test.ts` (Tests) |

Total: 17 neue Files + 3 modifizierte Files.

## Risks & Notes

- **R1 — Section-Position in `SECTION_ORDER`:** Falscher Index aendert Sidebar-Reihenfolge ueberall. Tests in `sidebar-config.test.ts` muessen explizite Index-Position asserten.
- **R2 — CSS-Drift:** `.help-content` ist eigene Schicht, kein Reuse von `.legal-content`. Bei kuenftigem Polish muss klar bleiben, dass beide unabhaengig zu pflegen sind. Begruendung: Help-Pages haben mehr interaktive Inhalte (Listen, Tabellen), koennen sich kuenftig anders entwickeln als Legal-Pages.
- **R3 — `(app)`-Route-Group:** `/help` muss innerhalb `(app)` liegen, damit Auth-Guard + Sidebar-Layout greifen. Direkt unter `app/help/` waere Public.
- **R4 — Pflicht-Reuse-Check (`strategaize-pattern-reuse.md`):** Markdown-Renderer ist bereits Strategaize-Standard (`remark@15 + remark-html@16 + remark-gfm@4`), Reuse via `renderLegalMarkdown` ist vorgesehen. Keine Pattern-Suche in anderen Repos noetig.
- **R5 — Worktree:** Internal-Tool, Worktree empfohlen aber optional. Per `feedback_slice_merge_at_end` Master-Merge erst nach Gesamt-/qa. **Empfehlung: Worktree-Branch `slc-826-help-section`.**

## Verify Steps (Slice-Level)

1. `npm run lint` clean (oder Baseline-aequivalent)
2. `npm run test` → Vitest mind. 1059 + neue Help-Tests gruen
3. `npm run build` → Type-Check + Production-Build clean
4. `/qa`-Skill nach `/frontend`:
   - Browser-Smoke `/help` mit 3 Rollen (admin/teamlead/member): alle sehen Tile-Page mit 12 Tiles
   - Browser-Smoke `/help/mein-tag`: Markdown rendert mit `.help-content`-Style
   - Browser-Smoke `/help/unknown`: 404
   - Sidebar-Smoke: HILFE-Section sichtbar, korrekte Position
5. Live-Smoke nach `/deploy`: gleiche Smokes auf `business.strategaizetransition.com/help`

## Project Records Updates

- `/slices/INDEX.md` — V8.3-Section + SLC-826 Eintrag (Status `planned`)
- `/features/INDEX.md` — V8.3-Section + FEAT-823 Eintrag (Status `planned`)
- `/planning/roadmap.json` — V8.3 NEU mit Status `active`, Order 35; V9 und V10 Order +1 verschoben
- `/planning/backlog.json` — BL-487 NEU fuer V8.3 (Status `in_progress`)
- `/docs/STATE.md` — Current Focus + Current Phase auf V8.3 SLC-826 Slice-Planning DONE, Naechster Schritt `/frontend`
- `/reports/RPT-511.md` — Slice-Planning-Completion-Report

## Recommended Next Step

`/frontend SLC-826` mit `isolation: "worktree"` (Branch `slc-826-help-section`), MTs sequenziell MT-1 → MT-2 → MT-3 → MT-4. Nach Gesamt-MT-Implementation: `/qa` als Gesamt-Slice-QA, dann Master-Merge.
