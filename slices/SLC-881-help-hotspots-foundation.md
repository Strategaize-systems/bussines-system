# SLC-881 — V8.8 Help-Annotated-Screenshots Foundation (Pilot mein-tag)

- **Feature:** FEAT-881 / BL-489
- **Version:** V8.8
- **Status:** planned
- **Priority:** High
- **Created:** 2026-05-28
- **Estimated:** ~8-10h Code-Side + ~30-45 Min /qa (Single-Slice, 7 Micro-Tasks)
- **Depends-On:** V8.6 STABLE (REL-040, Image-Tag `c9a40e7`) — V8.5+V8.6 Production-Code unveraendert
- **Architecture:** ARCHITECTURE.md V8.8-Section + DEC-240..247 (RPT-549)
- **Pattern-Reuse-Status:** **Canonical-First** — Cross-Repo-Check ergab kein bestehendes Hotspot-Pattern in Strategaize-Repos. SLC-881-Output wird nach Release als Memory-File dokumentiert fuer Future-Repos.

## Goal

Help-Detail-Page `/help/mein-tag` zeigt ein echtes Screenshot der App-Seite mit min. 3 klickbaren Hotspots an wichtigen UI-Bereichen (KI-Workspace, Aufgabenliste, Wiedervorlagen). Klick oeffnet Modal mit Title + Markdown-Body + Schema-Slot fuer Walkthrough-Video (V1 ungenutzt). Mobile (<768px) faellt auf eine begleitende `<ol>` Liste mit Title+Body pro Hotspot zurueck. Die 11 nicht-migrierten Slugs (`pipeline`, `compose`, `deal-detail`, `settings`, `team-verwaltung`, `ki-usage`, `workflow-automation`, `custom-reports`, `kampagnen`, `zahlungsbedingungen`, `vat-reverse-charge`) bleiben unveraendert auf V8.3-Plain-Markdown-Rendering.

## Scope

### IN
- `cockpit/src/lib/help/hotspot-schema.ts` — zod-Schema `HotspotSchema` + `HotspotPageSchema` + Bounds-Refine (x+w<=100, y+h<=100) + ID-Uniqueness-Check
- `cockpit/src/lib/help/hotspot-loader.ts` — `loadHotspotPage(slug)` Server-Function: readFile JSON → parse via zod → pre-render `body_md` per Hotspot via `renderLegalMarkdown` → return `HotspotPageData` (oder `null` bei ENOENT)
- `cockpit/src/components/help/hotspot-modal.tsx` — Client-Component, wraps Base UI `Dialog` + `DialogContent` + `DialogHeader` + `DialogTitle` + Body via dangerouslySetInnerHTML (pre-rendered `bodyHtml`) + optional `<video controls>`-Element wenn `videoUrl` gesetzt + `max-h-[80vh] overflow-y-auto` fuer Long-Body
- `cockpit/src/components/help/hotspot-image.tsx` — Client-Component, rendert `<figure>` mit `<img>` + absolute-positionierte `<button>`-Overlays (Desktop, sichtbar via `hidden md:block`) + `<ol>` Liste (Mobile, sichtbar via `md:hidden`). State `openHotspotId: string | null`. Border-Highlight on Hover/Focus, sr-only Number-Prefix per Hotspot fuer Accessibility.
- `cockpit/src/components/help/help-page-shell.tsx` — Modify: optionaler `imageBlock?: ReactNode` Prop, rendert oberhalb des `<article.help-content>` wenn gesetzt
- `cockpit/src/app/(app)/help/[slug]/page.tsx` — Modify: tryReadHotspotPage(slug), bei Hotspot-JSON-Existenz `<HotspotImage>` als imageBlock uebergeben, bei ENOENT V8.3-Fallback (nur Markdown)
- `cockpit/src/content/help/hotspots/mein-tag.json` — Pilot-JSON mit 3-5 Hotspots (KI-Workspace, Aufgaben-heute, Wiedervorlagen + ggf. Termine + Footer-Bereich)
- `cockpit/public/help/screenshots/mein-tag.webp` — Pilot-Asset, capture via Playwright (viewport 1280×900, deviceScaleFactor 2 → 2560×1800), WebP-Konversion Quality 82-85% (~250-400KB)
- `cockpit/src/lib/help/__tests__/hotspot-schema.test.ts` — Vitest: Happy-Path + 6 Refine-Cases (id-not-kebab, x out of range, body too long, x+w>100, y+h>100, duplicate id) + imageUrl-Pattern-Reject
- `cockpit/src/lib/help/__tests__/hotspot-loader.test.ts` — Vitest: ENOENT-Fallback (returns null), Happy-Path (parses + pre-renders + slug-match-check), Schema-Drift (throws), Slug-Mismatch (throws)
- `cockpit/src/app/globals.css` — Falls noetig: `.hotspot-modal-content` als CSS-Schicht analog `.help-content` (siehe MT-3 Decision)
- `slices/INDEX.md` — SLC-881 als V8.8 Section
- `planning/backlog.json` — BL-489 wird zu `done` gesetzt bei /qa PASS
- `docs/STATE.md` — Current-Focus/Phase nach SLC-881 done aktualisiert
- `features/INDEX.md` — FEAT-881 wird `done` bei /qa PASS

### OUT
- Hotspot-Content fuer die anderen 11 Slugs (BL-495 Iter-2 pipeline/compose/deal-detail + BL-496 Iter-3 restliche 8)
- Walkthrough-Videos (BL-497 — Schema-Slot existiert ab V1, Implementation produziert User spaeter manuell)
- `useMediaQuery`-Hook (vermieden via CSS-only Tailwind-Responsive: `hidden md:block` + `md:hidden`)
- Admin-UI fuer Live-Hotspot-Edit (V2-Kandidat, JSON-File-Edit via VSCode reicht)
- DB-basierte Hotspot-Storage (JSON-File reicht fuer V1, DB nur wenn Admin-UI kommt)
- i18n (BS ist DE-only, kein next-intl)
- URL-Anker `?h=hotspot-id` fuer Direct-Linking (V2-Polish)
- Numbered-Badges visuell (V1 nur sr-only + Border-Highlight, V2-Polish)
- Dark-Mode-Variant des Screenshots (BS hat keinen Dark-Mode-Toggle Stand V8.7)
- Screenshot-Drift-Detection automatisch (manuelle Sichtpruefung bei jedem Major-Release reicht)
- Print-Layout fuer Help-Pages (Screen-only)
- CI-Pipeline-Integration fuer Hotspot-Schema-Lint (Vitest deckt es ab)
- Bedrock-Touch / KI-Pfade (V8.8 hat 0 KI-Pfade)
- Schema-Migration (V8.8 hat 0 Schema-Migration)
- Compose / Mail / Cron / API-Routes (V8.8 ist Frontend-only)

## Acceptance Criteria

### Funktionale ACs
- **AC1** `/help/mein-tag` (authenticated) HTTP 200 — Desktop-Viewport (>=768px) zeigt Screenshot mit min. 3 sichtbaren Hotspot-Buttons als absolute-positionierte Overlays. Hover/Focus jedes Buttons zeigt Border-Highlight (z.B. `hover:border-amber-500`).
- **AC2** Klick auf einen Hotspot oeffnet Modal mit korrektem `title` und gerendertem Markdown-`body_md`. Klick auf einen anderen Hotspot ersetzt Modal-Content (Single-Instance, kein Stacking).
- **AC3** Modal kann via ESC, Backdrop-Click und Close-Button-Icon geschlossen werden (Base UI native Behavior).
- **AC4** Modal mit langem `body_md` (z.B. 1500 Zeichen) hat `max-h-[80vh] overflow-y-auto` und scrollt innerhalb des Modal-Bodies; Page-Background bleibt fixed.
- **AC5** Modal hat sichtbares Focus-Outline beim Tab-Navigate; Tab-Key wandert zwischen Close-Button + Body-Links + (falls vorhanden) Video-Controls; Shift+Tab wandert rueckwaerts; Focus-Trap aktiv (Tab springt nicht aus Modal heraus).
- **AC6** Mobile-Viewport (<768px, Browser-DevTools "Mobile S 320×568" oder iPhone-SE 375×667) — Hotspot-Buttons sind NICHT sichtbar (`hidden md:block` zieht), stattdessen sichtbar: `<ol>` Liste unter dem Image mit `<li>` pro Hotspot enthaltend `<strong>{title}</strong>` + Markdown-Body. Image bleibt als Kontext sichtbar.
- **AC7** **Backward-Compat:** `/help/pipeline`, `/help/compose`, `/help/deal-detail`, `/help/settings`, `/help/team-verwaltung`, `/help/ki-usage`, `/help/workflow-automation`, `/help/custom-reports`, `/help/kampagnen`, `/help/zahlungsbedingungen`, `/help/vat-reverse-charge` rendern identisch zu V8.3 — nur Plain-Markdown via `HelpPageShell` ohne `imageBlock`. Visuelle Regression: keine.
- **AC8** Page-Load `/help/mein-tag` Server-side liest `mein-tag.json`, parsed via zod, pre-rendert alle Hotspot-Bodies via `renderLegalMarkdown` BEFORE Client-Hydration. Page-Source-HTML enthaelt `bodyHtml` als String pro Hotspot (verifizierbar via `View Source`).
- **AC9** Drift-Resistance: Wenn `mein-tag.json` ein ungueltiges Feld hat (z.B. `x: 150`), wirft die Page einen Server-Error mit zod-Validation-Message (kein Silent-Fail).
- **AC10** Pilot-Screenshot ist WebP-Format, Source-Resolution >= 2560×1800, File-Size <= 500KB, alt-Text-Pflicht im JSON erfuellt.

### Verification-Aggregat ACs
- **AC11** `npm run test` (Vitest) >= V8.6-Baseline **1135 PASS** + neue Tests (hotspot-schema + hotspot-loader) **>= 1145 PASS** (kein Regression)
- **AC12** `npm run test:tsc` exit 0 (kein neuer TSC-Error vs V8.6-Baseline 0)
- **AC13** `npm run build` exit 0 (kein neuer Build-Error)
- **AC14** `npm run lint` clean — **EXACT V8.6-Baseline 142e/57w** (kein neuer Error oder Warning; gleicher Pre-existing Pool)
- **AC15** zod-Schema-Vitest 7+ Cases gruen: Happy + ID-Format-Reject + Percent-Out-of-Range + Body-Too-Long + Clip-Horizontal + Clip-Vertical + Duplicate-ID + ImageUrl-Pattern-Reject
- **AC16** Hotspot-Loader-Vitest 4+ Cases gruen: ENOENT-returns-null + Happy-Path-pre-render + Schema-Drift-throws + Slug-Mismatch-throws

## Micro-Tasks

### MT-1: zod-Schema `hotspot-schema.ts` + Vitest

- **Goal:** Typsichere Validierung fuer Hotspot-JSON-Files, Drift-Detection at Build/Request-Time.
- **Files:**
  - `cockpit/src/lib/help/hotspot-schema.ts` (NEU, ~80 Zeilen)
  - `cockpit/src/lib/help/__tests__/hotspot-schema.test.ts` (NEU, ~120 Zeilen)
- **Expected behavior:**
  - Export `HotspotSchema` (zod): `id` (kebab-case-regex), `x`, `y`, `w`, `h` (number 0-100), `title` (1-80 chars), `body_md` (1-2000 chars), `video_url` (z.string().url().optional())
  - Bounds-Refine: `x+w <= 100` + `y+h <= 100`
  - Export `HotspotPageSchema` (zod): `slug`, `imageUrl` (regex `/^\/help\/screenshots\/[a-z0-9-]+\.webp$/`), `imageWidth` (int positive), `imageHeight` (int positive), `imageAlt` (1-160 chars), `hotspots` (array min 1, max 20)
  - Export `parseHotspotPageJson(raw: unknown, expectedSlug: string)`: ruft `HotspotPageSchema.parse(raw)`, prueft `parsed.slug === expectedSlug`, prueft Hotspot-ID-Uniqueness, returnt typisiertes Result
  - Export Typen `Hotspot` und `HotspotPage` via `z.infer`
  - File-Header-Comment dokumentiert Author-Guideline: "Empfohlene body_md-Laenge 400-800 Zeichen; Limit 2000 ist Safety-Net".
- **Verification:**
  - `npx tsc --noEmit cockpit/src/lib/help/hotspot-schema.ts` exit 0
  - `npx vitest run cockpit/src/lib/help/__tests__/hotspot-schema.test.ts` 8+ Cases PASS
  - Cases mindestens: Happy-Path, ID-not-kebab-rejects, percent-out-of-range-rejects, body-too-long-rejects, clip-horizontal-x+w>100-rejects, clip-vertical-y+h>100-rejects, duplicate-id-rejects, slug-mismatch-rejects, imageUrl-pattern-rejects (8-9 Cases)
- **Dependencies:** keine

### MT-2: Hotspot-Loader `hotspot-loader.ts` + Vitest

- **Goal:** Server-Function liefert pre-rendered HotspotPageData (oder null fuer Slugs ohne JSON).
- **Files:**
  - `cockpit/src/lib/help/hotspot-loader.ts` (NEU, ~50 Zeilen)
  - `cockpit/src/lib/help/__tests__/hotspot-loader.test.ts` (NEU, ~100 Zeilen)
- **Expected behavior:**
  - Export `HotspotPageData` Typ — gleiche Struktur wie `HotspotPage`, aber `hotspots[].body_md` ersetzt durch `bodyHtml: string` (Server-pre-rendered)
  - Export `async function loadHotspotPage(slug: string): Promise<HotspotPageData | null>`:
    - Path: `path.join(process.cwd(), "src", "content", "help", "hotspots", `${slug}.json`)`
    - `try { raw = JSON.parse(await readFile(path, "utf-8")) } catch (e) { if (e.code === "ENOENT") return null; throw e; }`
    - `const page = parseHotspotPageJson(raw, slug)` — wirft bei Drift
    - For each hotspot in page.hotspots: `bodyHtml = await renderLegalMarkdown(hotspot.body_md)`
    - Return `{ ...page, hotspots: page.hotspots.map(h => ({ ...h, bodyHtml: ..., body_md: undefined })) }` (oder direkt neue Struktur ohne body_md)
- **Verification:**
  - `npx vitest run cockpit/src/lib/help/__tests__/hotspot-loader.test.ts` 4+ Cases PASS
  - Test-Setup: vi.mock `node:fs/promises` mit readFile-Mock fuer ENOENT-Case + Happy-Case
  - Pattern-Reuse: `feedback_vitest_node_modules_must_be_real` + `feedback_nextjs_server_action_test_mocks` (next/cache nicht relevant hier, aber Mock-Hoisted-Pattern via vi.hoisted())
  - Cases: ENOENT-returns-null, Happy-Path-mit-3-Hotspots-pre-rendered, Slug-Mismatch-throws, ID-Duplicate-throws (oder Schema-Drift-throws)
- **Dependencies:** MT-1 (importiert `parseHotspotPageJson` aus hotspot-schema.ts)

### MT-3: HotspotModal-Component

- **Goal:** Modal mit Title + pre-rendered HTML-Body + optional Video, basierend auf bestehender Base UI Dialog-Komponente.
- **Files:**
  - `cockpit/src/components/help/hotspot-modal.tsx` (NEU, ~70 Zeilen)
- **Expected behavior:**
  - `"use client";` Direktive
  - Props: `{ hotspot: { title: string; bodyHtml: string; videoUrl?: string } | null; open: boolean; onOpenChange: (open: boolean) => void }`
  - Renders `<Dialog open={open} onOpenChange={onOpenChange}>` + `<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto sm:max-w-2xl">`:
    - `<DialogHeader>` mit `<DialogTitle>{hotspot.title}</DialogTitle>`
    - `<div className="hotspot-modal-content" dangerouslySetInnerHTML={{ __html: hotspot.bodyHtml }} />`
    - If `hotspot.videoUrl`: `<video controls className="w-full mt-4 rounded" src={hotspot.videoUrl} />`
  - Pre-condition: `hotspot` darf null sein wenn `open === false` (Type-safety: render nothing wenn null)
  - **CSS-Schicht-Entscheidung:** `.hotspot-modal-content` als eigene Klasse, aber Style-Reuse via Tailwind + `@apply` aus `.help-content` (in globals.css) ODER direkte Tailwind-Klassen am Wrapper. Wenn die Modal-CSS einfach genug ist (paragraph, ul, ol, strong, code, a, table), reicht ein `prose prose-sm max-w-none`-Wrapper (Tailwind Typography). Wenn das in BS nicht installiert ist: einfach `.help-content` CSS wiederverwenden (ist global, wird nicht zweimal definiert). **Entscheidung:** Reuse `.help-content` Class, **kein** neues CSS noetig fuer V1. CSS-Layer-Test in MT-7.
- **Verification:**
  - `npx tsc --noEmit cockpit/src/components/help/hotspot-modal.tsx` exit 0
  - Visual: Live-Smoke in MT-7 zeigt Title + Markdown-Render im Modal
- **Dependencies:** keine (importiert bestehendes Dialog aus `@/components/ui/dialog`)

### MT-4: HotspotImage-Component (Desktop overlays + Mobile-Liste via Tailwind Responsive)

- **Goal:** Visuelle Repraesentation des Screenshots mit klickbaren Overlays auf Desktop + Liste auf Mobile.
- **Files:**
  - `cockpit/src/components/help/hotspot-image.tsx` (NEU, ~120 Zeilen)
- **Expected behavior:**
  - `"use client";` Direktive
  - Props: `{ data: HotspotPageData }`
  - State: `const [openHotspotId, setOpenHotspotId] = useState<string | null>(null)`
  - Render:
    ```tsx
    <>
      {/* Image + Desktop overlays */}
      <figure className="relative">
        <img
          src={data.imageUrl}
          alt={data.imageAlt}
          width={data.imageWidth}
          height={data.imageHeight}
          loading="lazy"
          className="w-full h-auto rounded-lg ring-1 ring-slate-200"
        />
        {/* Overlays only visible on desktop */}
        <div className="absolute inset-0 hidden md:block pointer-events-none" aria-hidden="false">
          {data.hotspots.map((h, i) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setOpenHotspotId(h.id)}
              className="absolute pointer-events-auto border-2 border-transparent hover:border-amber-500 focus-visible:border-amber-500 focus-visible:outline-2 focus-visible:outline-amber-500 rounded cursor-help transition-colors"
              style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%` }}
            >
              <span className="sr-only">{i + 1}. {h.title}</span>
            </button>
          ))}
        </div>
      </figure>

      {/* Mobile list — visible only on mobile */}
      <ol className="md:hidden mt-6 space-y-4 list-decimal list-inside" aria-label="Hotspot-Erklaerungen fuer Mobile">
        {data.hotspots.map((h) => (
          <li key={h.id}>
            <strong className="font-medium">{h.title}</strong>
            <div className="hotspot-modal-content mt-1" dangerouslySetInnerHTML={{ __html: h.bodyHtml }} />
          </li>
        ))}
      </ol>

      {/* Modal */}
      <HotspotModal
        hotspot={openHotspot ? { title: openHotspot.title, bodyHtml: openHotspot.bodyHtml, videoUrl: openHotspot.videoUrl } : null}
        open={openHotspotId !== null}
        onOpenChange={(open) => { if (!open) setOpenHotspotId(null); }}
      />
    </>
    ```
  - `openHotspot = data.hotspots.find(h => h.id === openHotspotId) ?? null`
  - sr-only Number-Prefix (1., 2., 3., ...) macht Hotspots fuer Screen-Reader-User identifizierbar (DEC-243)
- **Verification:**
  - `npx tsc --noEmit cockpit/src/components/help/hotspot-image.tsx` exit 0
  - Visual: Live-Smoke in MT-7 Desktop + Mobile-Viewport
- **Dependencies:** MT-3 (importiert `HotspotModal`)

### MT-5: Page-Modify `/help/[slug]/page.tsx` + HelpPageShell-Erweiterung

- **Goal:** Server-Component wires alles zusammen — lese Hotspot-JSON (falls vorhanden), pre-rendere, uebergebe an Client-Component. Fallback auf V8.3-Markdown bei ENOENT.
- **Files:**
  - `cockpit/src/components/help/help-page-shell.tsx` (MODIFY, ~+10 Zeilen)
  - `cockpit/src/app/(app)/help/[slug]/page.tsx` (MODIFY, ~+20 Zeilen)
- **Expected behavior:**
  - **HelpPageShell:** Signature-Extension `{ html: string; imageBlock?: React.ReactNode }`. Render: Back-Link → optional `<div className="mb-8">{imageBlock}</div>` → `<article className="help-content" dangerouslySetInnerHTML={{ __html: html }} />`. Bei `imageBlock === undefined`: kein Wrapper-Div (V8.3-Backward-Compat).
  - **page.tsx:** Nach `renderLegalMarkdown(markdown)`, neuer Call `const hotspotData = await loadHotspotPage(slug);`. Wenn `hotspotData !== null`: render `<HelpPageShell html={html} imageBlock={<HotspotImage data={hotspotData} />} />`. Sonst V8.3-Fallback: `<HelpPageShell html={html} />`.
- **Verification:**
  - `npx tsc --noEmit cockpit/src/app/(app)/help/[slug]/page.tsx` exit 0
  - `npx tsc --noEmit cockpit/src/components/help/help-page-shell.tsx` exit 0
  - Build clean: `npm run build` exit 0 (testet auch generateStaticParams + Page-Component-Type-Sicherheit)
  - **Per `feedback_rsc_no_function_props`:** Server→Client-Props sind nur primitive (string, number, undefined) + Plain-Object-Array. HotspotPageData enthaelt keine Functions/Components → OK.
- **Dependencies:** MT-2 (loadHotspotPage), MT-4 (HotspotImage)

### MT-6: Pilot-Screenshot Capture + JSON-Authoring fuer `mein-tag`

- **Goal:** Echtes Screenshot der `/mein-tag`-Seite produzieren + JSON mit min. 3 plausiblen Hotspots schreiben.
- **Files:**
  - `cockpit/public/help/screenshots/mein-tag.webp` (NEU asset, ~250-400KB)
  - `cockpit/src/content/help/hotspots/mein-tag.json` (NEU, ~80 Zeilen)
- **Expected behavior:**
  - **Capture-Strategie:** Bestehende `deliverables/user-guide/screencaps.spec.ts` Playwright-Pipeline nutzen ODER ad-hoc Playwright-Script in `scripts/capture-help-screenshot.mjs`.
    - Login mit `qa-admin@strategaize.test` (oder dem fuer User-Guide-Capture etablierten Account)
    - Navigate `/mein-tag`
    - Warten auf Network-Idle + KI-Workspace-Card sichtbar
    - Viewport: `{ width: 1280, height: 900 }`, `deviceScaleFactor: 2`
    - Vollbild-Screenshot (oder Crop falls die Page Scroll-Content hat — Empfehlung: ganze Page in 1280×900 sichtbar gestalten via Test-Daten-Cleanup vorher)
    - PNG-Output → konvertieren zu WebP via Sharp oder cwebp Quality 82-85%
  - **JSON-Authoring:**
    - `slug: "mein-tag"`
    - `imageUrl: "/help/screenshots/mein-tag.webp"`
    - `imageWidth: 2560`, `imageHeight: 1800` (oder reale Werte nach Capture)
    - `imageAlt: "Screenshot der Seite Mein Tag mit annotierten Hotspots an KI-Workspace, heutige Aufgaben und Wiedervorlagen-Bereich."`
    - `hotspots`: min. 3 Eintraege:
      - `id: "ki-workspace"`, Region oben (KI-Workspace-Card), title "KI-Workspace", body_md ~400-600 Zeichen mit Verweis auf Berichts-Buttons + ggf. Compose-Link
      - `id: "aufgaben-heute"`, Region Mitte (Aufgabenliste), title "Offene Aufgaben heute", body_md ~400 Zeichen
      - `id: "wiedervorlagen"`, Region unten (Wiedervorlagen-Section), title "Wiedervorlagen", body_md ~400-500 Zeichen
    - Bounds-Sanity-Check: keine Coordinates ueber 100; x+w<=100, y+h<=100
- **Verification:**
  - Visual-Check: WebP-File existiert, oeffnet in Image-Viewer scharf
  - `node -e "const z = require('zod'); const data = require('./cockpit/src/content/help/hotspots/mein-tag.json'); ..."` — JSON parsed via `parseHotspotPageJson` ohne Fehler
  - Hotspot-Coords decken nicht-trivial-grosse Regionen ab (mind. 5%×5% Hit-Area)
  - File-Size: `ls -lh cockpit/public/help/screenshots/mein-tag.webp` < 500KB
- **Dependencies:** MT-1 (zod-Schema), MT-2 (Loader fuer Live-Test)
- **Hinweis Capture-Konkretisierung:** User-Action wenn Playwright-Pipeline lokal nicht laeuft (z.B. via `npm run capture:help` oder Browser-DevTools-Screenshot manuell + Sharp-Konversion). User-Pflicht bei manueller Capture: Coordinates im JSON visuell vermessen.

### MT-7: Verification-Aggregat + Live-Smoke + Cockpit-Records

- **Goal:** Build/Lint/Test gesamt clean, Live-Smoke Desktop + Mobile-Viewport, Tab-Keyboard-Nav, Backward-Compat, Cockpit-Records aktualisiert.
- **Files:**
  - `cockpit/src/app/globals.css` (POSSIBLE-MODIFY, je nach MT-3-CSS-Schicht-Entscheidung)
  - `slices/INDEX.md` (MODIFY — SLC-881 Section + Entry)
  - `planning/backlog.json` (MODIFY — BL-489 done bei AC-PASS)
  - `features/INDEX.md` (MODIFY — FEAT-881 done bei AC-PASS)
  - `docs/STATE.md` (MODIFY — Current-Focus + Phase)
- **Expected behavior:**
  - `npm run test` Vitest gesamt >= 1145 PASS (V8.6-Baseline 1135 + neue 8-10 Tests)
  - `npm run test:tsc` exit 0
  - `npm run build` exit 0
  - `npm run lint` clean — EXACT V8.6-Baseline 142e/57w (kein neuer Error oder Warning vs Baseline; pre-existing Pool unveraendert)
  - Live-Smoke gegen Hetzner-Production-Build (entweder per Worktree-Deploy oder per `npm run build && npm run start` lokal mit ENV-Cocktail):
    - `GET /help/mein-tag` (authenticated): HTTP 200, Screenshot rendert, min. 3 Hotspots sichtbar, Click → Modal mit Title + Body
    - Desktop-Smoke (Browser >=768px): Hover-Border, Click oeffnet Modal, ESC schliesst, Backdrop schliesst, Tab-Nav respektiert, Long-Body scrollt innerhalb Modal
    - Mobile-Smoke (Chrome DevTools "iPhone SE 375×667"): Overlays NICHT sichtbar, `<ol>` Liste sichtbar, Image bleibt als Kontext
    - Backward-Compat: `GET /help/pipeline`, `GET /help/compose`, `GET /help/settings` (3 Spot-Checks der 11) zeigen V8.3-Plain-Markdown-Look unveraendert
- **Verification:**
  - **MUST PASS** alle AC1-AC16
  - Live-Smoke-Output (Screenshot oder Console-Log) in RPT-XXX dokumentieren
- **Dependencies:** MT-1 bis MT-6

## Risks & Mitigations

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R-SLC881-1 | `useMediaQuery`-loose CSS-Approach: Hotspots werden auf Tablet (768-1024px) angezeigt, aber Touch-Targets ohne sichtbares Tap-Feedback | Low | V1 akzeptierbar (FEAT-881 Mobile-Schwelle ist 768px hart, Tablet faellt aus Definition raus). Falls Real-Use Problem zeigt: V2-Polish mit Tap-Highlight-CSS |
| R-SLC881-2 | Playwright-Pipeline lokal nicht ready, MT-6 blockt | Medium | Alternativ: Manueller Browser-Screenshot via Chrome-DevTools (DPR 2x via `window.devicePixelRatio` Setting + Capture Node), dann `cwebp` lokal. Konfiguration via Screencap-Pipeline oder ad-hoc-Script — beide akzeptierbar. |
| R-SLC881-3 | Tailwind `hidden md:block`-Render-Mismatch zwischen SSR und Client | Low | Tailwind CSS ist statisch — Server rendert beide Variants (Overlays + Liste), Browser zeigt eine je Viewport. Kein useState-basiertes Branching, kein Hydration-Mismatch. |
| R-SLC881-4 | `.help-content` CSS-Schicht im Modal-Body greift nicht (Layer-Spec/Specificity-Issue) | Medium | MT-3 verwendet Class `.hotspot-modal-content`. Falls Style-Test in MT-7 zeigt das CSS greift nicht: a) gleiche `.help-content` Class direkt reusen, b) `@apply`-basierte neue Klasse, c) inline-Tailwind. Akzeptierbarer Fallback-Pfad existiert. |
| R-SLC881-5 | Hotspot-Coordinates visuell daneben (Image rendert anders als Capture-Viewport) | Medium | Visual-Sichtpruefung in MT-7 als blocking. Falls daneben: JSON-Coords nachjustieren (kein Code-Change, nur Content-Edit). |
| R-SLC881-6 | Base UI Dialog Focus-Trap bricht bei DOM-Manipulation (Hotspot-Toggle) | Low | Single-Instance-State; nur ein Modal sichtbar. Base UI handelt Focus-Trap als Standard. /qa AC5 verifiziert. |
| R-SLC881-7 | TSC error in test:tsc durch neue Files | Low | MT-1, MT-2, MT-7 includieren TSC-Check pro File. Pattern-Reuse via `feedback_vitest_mock_calls_typescript_cast` falls Mock-Casts noetig. |
| R-SLC881-8 | Page-Source-HTML Page-Weight steigt mit Hotspots × bodyHtml | Low | V1 Pilot 3-5 Hotspots × ~500-1000 Bytes = ~3-5KB Extra. Akzeptabel. CDN-Lazy-Loading via `<img loading="lazy">` deckt das Image ab. |

## Worktree-Strategie

**Single-Branch ohne Worktree-Isolation** (Internal-Tool + 0 Production-Risk + 0 Schema-Migration). Begruendung:
- Per Slice-Planning-Rule: "Internal Tool: Optional, recommended for risky slices". V8.8 ist Frontend-only, kein DB-Touch, additive Files (kaum Konflikte mit anderen In-Flight-Slices).
- User-Pattern: `feedback_no_coolify_branch_switch_ever` — Master-Merge-after-Slice ist Standard. Single-Branch-Approach erlaubt nahtloses Master-Merge ohne Worktree-Junctions-Cleanup-Risk (`feedback_worktree_cleanup_sequence_pflicht`).
- Aufwand 8-10h durch 7 MTs verteilt, Atomic-Commits pro MT moeglich.

Falls User explicit Worktree wuenscht: Branch-Name `slc-881-help-hotspots-foundation`, Worktree unter `c:\strategaize\strategaize-business-system-worktrees\slc-881`.

## Commit-Strategie

Atomic-Commits per MT (Strategaize-Standard, `feedback_auto_commit_push`):

```
feat(SLC-881/MT-1): hotspot zod-schema + 8 vitest cases
feat(SLC-881/MT-2): hotspot loader with pre-render + ENOENT fallback
feat(SLC-881/MT-3): hotspot modal (base-ui dialog wrapper)
feat(SLC-881/MT-4): hotspot image client component + mobile fallback list
feat(SLC-881/MT-5): /help/[slug]/page.tsx wires hotspot data + helppageshell extension
feat(SLC-881/MT-6): mein-tag pilot screenshot + json with 3-5 hotspots
chore(SLC-881/MT-7): verification + cockpit records + slc/feat/bl status done
```

Master-Merge **am Slice-Ende nach /qa PASS** — kein iterativer Master-Merge (`feedback_slice_merge_at_end`).

## /qa Plan

Nach MT-7 done: `/qa SLC-881` als naechster Pflicht-Schritt (CLAUDE.md Mandatory).

**QA-Scope:**
- Vitest-Aggregate (>= 1145 PASS)
- TSC + Build + Lint clean (EXACT Baseline)
- Live-Smoke Desktop /help/mein-tag (Hover + Click + Modal-Open + ESC + Backdrop + Long-Body-Scroll + Tab-Nav + Focus-Trap)
- Live-Smoke Mobile-Viewport (iPhone SE 375×667) — Liste statt Overlays
- Backward-Compat: Spot-Check 3 von 11 nicht-migrierten Slugs (pipeline, settings, kampagnen) zeigen V8.3-Stand
- Accessibility: Screen-Reader-Spot-Check (NVDA oder VoiceOver) — sr-only Number-Prefix wird gelesen
- Visual-Sichtpruefung: Hotspot-Coords sitzen auf den korrekten UI-Bereichen im Screenshot (kein 10%-Drift)

**QA-Output:** RPT-XXX mit AC1-AC16-Status (PASS/FAIL pro AC), Live-Smoke-Screenshots, Vitest-Output-Summary, etwaige Findings als KNOWN_ISSUES oder SKILL_IMPROVEMENTS.

## Deploy-Trigger

Nach /qa PASS: User-Coolify-Redeploy auf `main` Branch (`feedback_manual_deploy`). Image-Tag-Bump automatisch. Live-Smoke gegen Production (HTTP 200 + Image rendert).

**Kein Schema-Migration (V8.8 = 0 DB-Touch).** Kein `sql-migration-hetzner.md`-Procedure noetig.

## Post-Deploy

- ARCHITECTURE.md V8.8-Section bleibt unveraendert (Implementation matched Architecture-Spec)
- DECISIONS.md DEC-240..247 bleibt unveraendert
- Backlog: BL-495 (Iter-2 pipeline/compose/deal-detail) + BL-496 (Iter-3 restliche 8) + BL-497 (Walkthrough-Videos) bleiben offen — Followup-Iterations nach V8.8 STABLE
- Optional Skill-Improvement-Memo: Memory-File `feedback_help_annotated_hotspots_pattern.md` schreiben fuer Cross-Repo-Reuse (Pattern jetzt Canonical-First in BS)
- Optional Post-Launch /post-launch Light-Touch ~10 Min nach 12-24h Stable-Time
