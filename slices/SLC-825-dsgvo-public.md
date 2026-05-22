# SLC-825 — DSGVO-Public Routen (Datenschutz + Impressum)

- Version: V8.2
- Feature: FEAT-821 DSGVO-Public-Foundation
- Backlog: BL-486 DSGVO-Public Routen
- Status: planned
- Priority: High
- Created: 2026-05-22

## Goal

Zwei Public-Routes `/datenschutz` und `/impressum` live-stellen plus Footer-Component mit Links zu beiden, damit das System eine **DSGVO-konforme Aussen-Sichtbarkeit** hat — Voraussetzung dafuer, dass es Personen jenseits des Eigentuemers benutzen koennen (User-Direktive 2026-05-21 Theme 1).

Die Markdown-Quellen liegen schon als Entwurf in `/deliverables/DATENSCHUTZ_DRAFT.md` + `/deliverables/IMPRESSUM_DRAFT.md` (RPT-505 /compliance Theme 1a 2026-05-22). Konkrete Adress-/KvK-/BTW-Daten sind aktuell **Platzhalter** — der Slice deployt das Markdown so, User reicht die Daten spaeter nach.

## Scope

### In Scope
- Public-Route `/datenschutz` (kein Auth-Gate, Pattern wie `cockpit/src/app/consent/[token]/page.tsx`)
- Public-Route `/impressum` (analog)
- Markdown-Quellen unter `cockpit/src/content/legal/datenschutz.md` + `impressum.md` (im Repo, Git-traceable, Pre-Build kompiliert)
- Markdown-Renderer-Helper `cockpit/src/lib/legal/markdown.ts` mit Strategaize-Standard `remark@15 + remark-html@16` (per Memory `feedback_email_render_remark_pattern` — kanonisches Pattern aus IS SLC-201 MT-7)
- Footer-Component `cockpit/src/components/layout/legal-footer.tsx` mit Links zu beiden Routes
- Footer-Integration in `cockpit/src/app/(app)/layout.tsx` (logged-in App)
- Footer-Integration in `cockpit/src/app/(auth)/layout.tsx` (Login-Page) — falls Layout existiert
- Footer-Integration in den 2 Public-Pages selbst (Konsistenz)
- Style-Guide-V2-konformer Layout-Container (max-width, Spacing, Typography per `feedback_style_guide_v2_mandatory`)

### Out of Scope
- **Konkrete Adress-/KvK-/BTW-Daten** — Markdown-Platzhalter bleiben, User reicht User-Action ein
- **Anwalts-Pruefung** — kommt im Pre-Customer-Live-Compliance-Gate (per `feedback_compliance_gate_later`)
- **Cookie-Banner** — aktuell nur technisch notwendige Cookies (Supabase-Session), kein Banner-Pflicht (siehe COMPLIANCE.md Section 5)
- **i18n** — BS hat keine next-intl-Integration, deutsche Sprache reicht
- **OG-Image / SEO** — nicht relevant fuer Internal-Test-Mode
- **Sitemap.xml** — nicht V8.2-Scope
- **Print-Stylesheet** — nicht V8.2-Scope

## Stack-Entscheidungen

**Markdown-Renderer:** `remark@15 + remark-html@16` per Strategaize-Standard (Memory `feedback_email_render_remark_pattern`). Kanonisch fuer alle MD→HTML-Server-Konversionen in Strategaize-Repos.

**Markdown-Source-Lage:** Markdown-Files unter `cockpit/src/content/legal/` (statt in `/deliverables/` import). Begruendung:
- `/deliverables/` ist Output-Verzeichnis fuer Drafts und Berichte — produktive Content-Files gehoeren in `src/content/`
- Vite/Next 16 kann `import.meta.glob`-style nicht direkt aus `/deliverables/` lesen (out-of-src)
- Trennung Source-of-Truth: `/deliverables/*_DRAFT.md` ist Pre-Production-Workspace, `cockpit/src/content/legal/*.md` ist deployed Content

**Renderer-Mode:** Server-Side-Render in der Page-Function (kein Client-Side `react-markdown`). Output ist Static-by-Default in Next 16 (Markdown-File ist build-time-readable).

**Public-Route-Lage:** `cockpit/src/app/datenschutz/page.tsx` + `impressum/page.tsx` (Root-Level, KEIN `(app)/`-Group). Pattern wie existierender `consent/[token]/page.tsx`. Middleware `updateSession` laeuft, blockiert aber Public-Routes nicht.

## Acceptance Criteria

| ID | Kriterium |
|---|---|
| AC1 | `GET /datenschutz` rendert HTTP 200 ohne Auth (verifiziert via `curl` ohne Cookie) |
| AC2 | `GET /impressum` rendert HTTP 200 ohne Auth |
| AC3 | Markdown wird zu semantisch korrektem HTML (h1, h2, h3, p, ul, table, a) |
| AC4 | Both Pages haben Style-Guide-V2-konformes Layout: max-width `max-w-3xl mx-auto`, `prose`-Klassen oder aequivalente Typography-Defaults, ausreichend Padding, Lesbarkeit auf Mobile + Desktop |
| AC5 | Footer-Component zeigt beide Links (Datenschutz + Impressum) auf der `/login`-Page (oder `(auth)`-Layout) |
| AC6 | Footer-Component zeigt beide Links im logged-in App-Layout `(app)/layout.tsx` — typischerweise am unteren Rand der Page (sticky oder am Ende des Content-Areas) |
| AC7 | Klick auf einen Footer-Link von einer logged-in Page → Public-Page laedt → Browser-Back-Button bringt zurueck zur logged-in App ohne Re-Login |
| AC8 | Links sind als deutsche Strings: "Datenschutz" + "Impressum" (kein "Privacy Policy" / "Imprint") |
| AC9 | Beide Markdown-Files in `src/content/legal/*.md` sind 1:1-Spiegel der `/deliverables/*_DRAFT.md` Drafts inkl. Platzhalter |
| AC10 | Vitest Pure-Function-Test fuer `renderLegalMarkdown` (Input: Markdown-String, Output: HTML-String mit korrekten Tags) |
| AC11 | Build clean (`npm run build`, kein neuer Lint-Error in den geaenderten Files, V8.1-Baseline 142e/57w unveraendert) |

## Micro-Tasks

### MT-1: Markdown-Renderer-Helper + Dependencies

- Goal: `remark@15 + remark-html@16` als Production-Dep installieren und einen kapseln Helper `renderLegalMarkdown(md: string) → string` mit serverseitiger Konversion bereitstellen.
- Files:
  - `cockpit/package.json` (Deps `remark@15` + `remark-html@16` hinzufuegen)
  - `cockpit/src/lib/legal/markdown.ts` (NEU, Helper-Funktion)
  - `cockpit/src/lib/legal/__tests__/markdown.test.ts` (NEU, 4-5 Vitest-Cases)
- Expected behavior: `renderLegalMarkdown("# Test\n\nParagraph")` returnt `"<h1>Test</h1>\n<p>Paragraph</p>\n"` o.ae. (genaue HTML-Form ist Renderer-spezifisch, aber semantische Tags sind erkennbar). Lists, Tables, Links werden korrekt zu HTML.
- Verification:
  - `npm install` succeeds, package-lock.json updated
  - Vitest Cases: h1-Render + Paragraph-Render + ul-Render + Table-Render + a-Render alle gruen
  - `npm run build` clean
- Dependencies: keine

### MT-2: Markdown-Content-Files anlegen

- Goal: Drafts aus `/deliverables/` als deployed Content-Files in `cockpit/src/content/legal/` spiegeln.
- Files:
  - `cockpit/src/content/legal/datenschutz.md` (NEU, Kopie von `/deliverables/DATENSCHUTZ_DRAFT.md` ohne den TODO-Block am Ende)
  - `cockpit/src/content/legal/impressum.md` (NEU, analog ohne TODO-Block)
  - **Hinweis:** Header-Status-Bloecke ("ENTWURF — Pre-Customer-Live-Anwaltspruefung ausstehend") bleiben im deployed Markdown. Sie sind ehrlicher Status fuer den Internal-Test-Mode und nicht peinlich — Platzhalter-Adressen sind eh sichtbar.
- Expected behavior: Pre-Build kann die Files via `fs.readFile` aus `src/content/legal/*.md` lesen.
- Verification:
  - `ls cockpit/src/content/legal/` zeigt beide Files
  - `wc -l` beider Files passt grob zu den Drafts (minus TODO-Block am Ende: -10..-20 Zeilen)
- Dependencies: keine

### MT-3: Public-Routes /datenschutz + /impressum

- Goal: 2 Server-Component-Pages, die das Markdown laden + per `renderLegalMarkdown` zu HTML rendern + Style-Guide-V2-konform anzeigen.
- Files:
  - `cockpit/src/app/datenschutz/page.tsx` (NEU)
  - `cockpit/src/app/impressum/page.tsx` (NEU)
  - **Optional:** `cockpit/src/components/layout/legal-page-shell.tsx` (NEU, Shared-Shell mit Title + Container + Footer falls beide Pages identische Strukturen brauchen)
- Expected behavior:
  - Page laedt zur Build/Request-Zeit via `await import("fs/promises").readFile(...)` oder `dynamic-import`-Pattern
  - Render: `<main class="max-w-3xl mx-auto px-4 py-8 prose prose-slate">...</main>` o.ae. (Style-Guide-V2-Konform)
  - Metadata: `export const metadata = { title: "Datenschutz" }` und `{ title: "Impressum" }`
  - Beide Pages enthalten LegalFooter am Ende (Konsistenz)
- Verification:
  - `npm run build` clean — keine Type-Errors, Pages werden als Static gebuildet
  - `curl -I http://localhost:3000/datenschutz` (in /qa) → HTTP 200, content-type `text/html`
  - `curl -I http://localhost:3000/impressum` → HTTP 200
  - DOM-Check: Datenschutz hat 10 Section-Headings (1.-10.), Impressum hat Anbieter+Kontakt+Handelsregister+...
- Dependencies: MT-1, MT-2

### MT-4: Footer-Component + Layout-Integration

- Goal: Wiederverwendbare Footer-Component mit "Datenschutz" + "Impressum" Links, integriert in 3 Layouts.
- Files:
  - `cockpit/src/components/layout/legal-footer.tsx` (NEU, Server-Component)
  - `cockpit/src/app/(app)/layout.tsx` (MODIFY, Footer am Ende)
  - `cockpit/src/app/(auth)/layout.tsx` (MODIFY falls existiert; sonst nur in `/login/page.tsx` integrieren)
  - `cockpit/src/app/datenschutz/page.tsx` + `impressum/page.tsx` (MODIFY: Footer auch hier rendern fuer Konsistenz)
- Expected behavior:
  - Footer-Component: simple `<footer class="border-t mt-12 py-6 text-sm text-muted-foreground"><nav class="flex gap-6 max-w-3xl mx-auto px-4"><Link href="/datenschutz">Datenschutz</Link><Link href="/impressum">Impressum</Link></nav></footer>` o.ae. (Style-Guide-V2-Konform)
  - In logged-in App: Footer ist am unteren Rand der Page sichtbar, kein Layout-Shift bei bestehenden Pages (Mein-Tag, Deal-Detail, Pipeline, ...)
  - Footer rendert KEINE Adresse / Copyright-Zeile / Sonstiges in V8.2 — nur die 2 Pflicht-Links. Erweiterung in spaeterem Slice falls noetig.
- Verification:
  - Live-Smoke logged-in: Footer sichtbar auf `/`, `/mein-tag`, `/pipeline`, `/proposals` — beide Links klickbar, navigieren zu Public-Routes
  - Live-Smoke Public: Footer sichtbar auf `/datenschutz` und `/impressum`
  - Live-Smoke Auth: Footer sichtbar auf `/login`
  - Browser-Back-Button funktioniert wie erwartet (kein Login-Loop)
  - Mobile-Viewport (DevTools 375px): Footer-Links lesbar, kein Overflow
- Dependencies: MT-3

## Risks

| ID | Risiko | Wahrscheinlichkeit | Mitigation |
|---|---|---|---|
| R1 | Markdown-Render-Output unterschiedet sich von Strategaize-Standard (z.B. fehlende `<a target="_blank">` fuer externe Links) | mittel | Vitest MT-1 inkl. a-Tag-Check; falls externe Links Target brauchen, rehype-raw-Plugin nachziehen |
| R2 | Style-Guide-V2 `prose`-Klassen nicht vorhanden im Tailwind-Config | niedrig | Pruefen ob `@tailwindcss/typography` im Projekt; falls nicht, Custom-CSS-Selector in MT-3 |
| R3 | Footer in `(app)/layout.tsx` veraendert bestehendes Page-Layout (z.B. push-down Pipeline-Board so dass DnD broken) | mittel | Live-Smoke aller wichtigen App-Pages in /qa (Mein-Tag + Pipeline + Deal-Detail + Compose + Settings) |
| R4 | Middleware blockiert Public-Routes versehentlich | niedrig | Middleware-Code unveraendert, `updateSession` ist Auth-Refresh-only, hat schon `consent/`-Route in der Vergangenheit funktioniert |
| R5 | Markdown-Tables in den Drafts werden nicht korrekt gerendert (remark-html unterstuetzt GFM-Tables nur mit remark-gfm-Plugin) | hoch | MT-1 ergaenzt `remark-gfm@4` als zusaetzliche Dep, MT-1 Vitest inkludiert Table-Case |
| R6 | Wiederverwendung des Footers in `(auth)/layout.tsx` scheitert weil Layout-File nicht existiert | niedrig | MT-4 prueft Existenz; falls nicht, Footer direkt in `(auth)/login/page.tsx` einbauen |

## Worktree-Strategie

Per User-Direktive `feedback_no_coolify_branch_switch_ever`: kein Coolify-Branch-Switch, alle Arbeiten auf einem dedicated Branch `slc-825-dsgvo-public`, Master-Merge erst am Slice-Ende nach Gesamt-/qa (per `feedback_slice_merge_at_end`).

Da BS Delivery-Mode `internal-tool` ist, ist Worktree-Isolation optional (per slice-planning-Skill). Aber gegeben dass diese Slice das `(app)/layout.tsx` aendert (Footer-Integration touches shared Layout-File), ist Worktree empfohlen — bei Layout-Bug bleibt main intakt.

## Estimated Effort

- MT-1: ~30 Min (Deps + Helper + 4-5 Tests)
- MT-2: ~10 Min (Markdown-Files copy + TODO-Block-Trimm)
- MT-3: ~45 Min (2 Pages + Style-Guide-V2-Layout + Build-Check)
- MT-4: ~45 Min (Footer-Component + 3 Layout-Integrationen + Mobile-Check)
- **Gesamt:** ~2-2.5h Implementation + ~30 Min /qa + ~15 Min /deploy ≈ **3h Slice-Gesamt**

## Definition of Done

- [ ] Alle 4 MTs implementiert mit Verification PASS
- [ ] AC1-AC11 alle PASS
- [ ] `/qa` als Skill ausgefuehrt, RPT-XXX erstellt
- [ ] Master-Merge nach /qa PASS
- [ ] Coolify-Auto-Deploy laeuft durch (oder manuelles Redeploy per `feedback_manual_deploy`)
- [ ] Live-Smoke auf Production: beide Routes erreichbar, Footer sichtbar
- [ ] Records aktualisiert: `slices/INDEX.md` SLC-825 `done`, `features/INDEX.md` FEAT-821 `done`, `planning/backlog.json` BL-486 `done`, `STATE.md` Current Focus auf naechstes Thema (Theme 2 Hilfe)
- [ ] User reicht Adress-/KvK-/BTW-Daten nach (User-Action, niedrig-Prio, asynchron)
