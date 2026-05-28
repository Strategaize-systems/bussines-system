# FEAT-881 — Help-System Redesign mit Annotated-Screenshot-Hotspots (V8.8 Foundation)

- **Version:** V8.8
- **Status:** planned
- **Priority:** High (Pre-Customer-Live-Polish, deferred aus V8.5)
- **Created:** 2026-05-28
- **Related Backlog:** BL-489
- **Predecessor:** FEAT-823 V8.3 Hilfe-Section (Plain-Markdown-Foundation)

## Problem Statement

Die heutige Hilfe-Section (V8.3 FEAT-823, live) rendert Plain-Markdown-Text pro Slug. Real-Use-Inspection 2026-05-22 hat ergeben: User finden Markdown-Help-Pages unzureichend, weil:

1. **Visueller Bezug fehlt.** Wer "Mein Tag" liest, sieht keinen Screenshot — er muss zwischen Help-Tab und App-Tab hin- und herwechseln und versuchen, Text und UI zu matchen.
2. **Plain-Markdown-Typography wirkt fremd.** Help-Pages sehen nicht wie Teil der App aus (kein Style-Guide-V2-Look, keine ContentCard-Struktur, kein UI-Atmosphaere).
3. **Granularitaet fehlt.** Markdown beschreibt die Page als Block; einzelne UI-Elemente (Buttons, KPI-Bereiche, KI-Workspace-Trigger) bekommen keine gezielten Erklaerungen.
4. **Videos waeren wertvoll, aber Markdown-Embedding ist klobig.** Walkthrough-Videos pro Aktion brauchen einen sauberen Slot in der Page-Struktur.

## Goal / Intended Outcome

Help-Detail-Page pro Slug zeigt einen **echten Screenshot der App-Seite mit klickbaren Hotspots** an den wichtigen UI-Elementen. Klick auf einen Hotspot oeffnet ein Modal mit Erklaerung des Elements + optional eingebettetes Walkthrough-Video (~30-60 Sek).

Visuell atmen die Help-Pages den App-Look (Style-Guide-V2, ContentCard-Struktur, gleiche Surface/Border/Color-Tokens), nicht Plain-Markdown-Typography. Der bestehende Markdown-Content bleibt als Intro/Kontext am Seitenanfang erhalten, das Hotspot-Bild ist die neue Hauptdarstellung.

## Primary Users

| Rolle | Use-Case |
|---|---|
| **Member (Sales-User)** | Lernt "Mein Tag" kennen, klickt Hotspots auf der KI-Workspace-Card, dem KPI-Bereich, dem Activity-Feed. Versteht in 2-3 Min was wo passiert. |
| **Admin / Teamlead** | Onboardet neue Teammitglieder. Schickt direkten Help-Link, Mitarbeiter sieht denselben Screenshot + Hotspots wie in der App. |
| **Strategaize Dev (Content-Owner)** | Pflegt Hotspot-Definitionen pro Slug in JSON-File. Erstellt optional Walkthrough-Videos und linkt sie in `video_url`-Feld. |

## V1 Scope (Foundation Slice)

### IN V1

1. **1 Pilot-Page: `mein-tag`** — alle anderen 11 Help-Slugs (pipeline, compose, deal-detail, settings, team-verwaltung, ki-usage, workflow-automation, custom-reports, kampagnen, zahlungsbedingungen, vat-reverse-charge) bleiben in V1 auf Plain-Markdown (V8.3-Stand). Hotspot-Pflege fuer die restlichen Slugs ist iterative Folgearbeit (BL-Followup).
2. **JSON-Hotspot-Storage:** `cockpit/src/content/help/hotspots/mein-tag.json` mit zod-validiertem Schema. Felder pro Hotspot: `id`, `x`, `y`, `w`, `h` (alle als Prozent 0-100 relativ zum Image), `title`, `body_md`, optional `video_url`.
3. **`<HotspotImage>`-React-Client-Component:** Rendert `<img src={imageUrl}>` mit absolute-positionierten Hotspot-Overlays. Klick auf Hotspot oeffnet Modal mit `body_md` (gerendert via bestehende `renderLegalMarkdown`-Funktion oder Aequivalent) + optional `<video>`-Tag wenn `video_url` gesetzt.
4. **`<HotspotModal>`-Component:** Reuse von shadcn `Dialog` aus dem App-Style-Guide. Title aus `hotspot.title`, Body aus `body_md`-Render, optional Video-Player. Schliessen via ESC oder Backdrop-Click.
5. **Mobile-Fallback (< 768px):** Statt Hotspot-Overlays wird unter dem Screenshot eine Markdown-Liste "Was Sie auf diesem Screen sehen" gerendert mit denselben Hotspot-Titles + Bodies. Hotspot-Bereiche sind mobile nicht klickbar.
6. **Screenshot-Asset:** Eine Datei `cockpit/public/help/screenshots/mein-tag.webp` (WebP, ~80% Qualitaet) als Pilot-Screenshot. Manuell via bestehende `deliverables/user-guide/screencaps.spec.ts` Playwright-Pipeline produziert.
7. **Page-Layout:** `/help/[slug]` Page wird umgebaut. Reihenfolge: (a) Page-Title + durationMinutes-Badge, (b) Hotspot-Image als Hauptdarstellung (Desktop) / Markdown-Liste (Mobile), (c) bestehender Markdown-Intro-Content als Kontext-Block unter dem Image. Wenn keine Hotspot-JSON existiert (= alle anderen 11 Slugs), faellt die Page auf die alte V8.3-Plain-Markdown-Darstellung zurueck (Backward-Compat).
8. **Style-Guide-V2-Look:** Hotspot-Modal nutzt App-Surface, App-Border, App-Color-Tokens (ContentCard-aequivalent). Help-Page wird in einem ContentCard-Container gerendert, nicht in einer Plain-Prose-Schicht.

### OUT OF V1 (iterative Folgearbeit)

- **Hotspot-Content fuer die anderen 11 Slugs** — iterativ pro Page. Wenn V8.8-Foundation steht, kann jede weitere Page in ~30-60 Min mit Hotspots versehen werden (1× Screenshot capturen, JSON-File schreiben). Separater BL-Item fuer Iter 2.
- **Echte Walkthrough-Videos** — Schema-Slot existiert ab V1, User produziert Videos manuell spaeter. V8.8.1 oder rolling work.
- **Admin-UI fuer Live-Hotspot-Edit** — Hotspots werden via Git-Commit ge-edited in V1. Visual-Hotspot-Editor (z.B. Klick auf Image → Hotspot setzen → Body eingeben) ist V2-Kandidat.
- **DB-basierte Hotspot-Storage** — JSON-File reicht fuer V1. DB-Tabelle nur falls Admin-UI kommt.
- **i18n (DE/EN)** — BS ist DE-only.
- **Hotspot-Anker per URL (`?h=hotspot-id`)** — Direct-Linking auf einzelne Hotspots. Deferred.
- **Numbered-Badges auf Hotspots als visueller Indikator** — V1 nutzt simple Border-Highlight + Hover-Cursor. Numbered-Badges sind V2-Polish.
- **Screenshot-Drift-Detection** — manuell, kein automatischer Vergleich UI-vs-Screenshot.
- **Print-Layout** — Help-Pages sind Screen-only.

## Core Features (V1)

| F | Feature | User-Story | Acceptance |
|---|---|---|---|
| F1 | Hotspot-JSON-Schema + Validation | Als Dev brauche ich ein typisiertes Hotspot-Format | `cockpit/src/lib/help/hotspot-schema.ts` mit zod-Schema, Parse-Function liest JSON + validiert, wirft bei Drift |
| F2 | `<HotspotImage>`-Component | Als User sehe ich Screenshot mit klickbaren Bereichen | Component rendert `<img>` + absolute-positionierte `<button>`-Overlays mit Border-Highlight on Hover/Focus. Keyboard-Accessible (Tab/Enter). |
| F3 | `<HotspotModal>`-Component | Als User klicke einen Hotspot und sehe Erklaerung | shadcn Dialog mit Title + Markdown-Body + optional Video. ESC + Backdrop-Click schliessen. Focus-Trap. |
| F4 | Mobile-Fallback | Als Mobile-User sehe ich die Hotspot-Inhalte als Liste | Viewport < 768px: Hotspots sind nicht klickbar, stattdessen `<ol>` mit Hotspot-Titles + Bodies unter dem Image gerendert. Image bleibt als Kontext sichtbar. |
| F5 | `/help/[slug]`-Page-Umbau | Als User sehe ich Page im App-Look mit Hotspots | Page lest `hotspots/[slug].json` (optional), rendert HotspotImage wenn vorhanden, sonst Plain-Markdown (V8.3-Fallback). Markdown-Intro bleibt als Kontext. |
| F6 | Pilot-Screenshot `mein-tag.webp` | Als Plattform habe ich min. 1 echtes Hotspot-Beispiel | `cockpit/public/help/screenshots/mein-tag.webp` produziert via Playwright-Pipeline, min. 3 Hotspots in `mein-tag.json` definiert |
| F7 | Style-Guide-V2-Look | Als User fuehle ich Help wie Teil der App | Help-Page in ContentCard-Container, Modal nutzt App-Surface + App-Tokens, keine Plain-Prose-Typography |
| F8 | Video-Slot ohne Implementation-Pflicht | Als Plattform kann ich spaeter Videos einhaengen | `video_url` als optionales Feld im Schema. Modal rendert `<video>` mit Controls wenn URL gesetzt, sonst kein Player. V1-Pilot enthaelt KEIN Video. |

## Constraints

- **Stack:** Next.js 16 + React 19 + Strategaize Style-Guide-V2. Pattern-Reuse aus FEAT-823 (`HelpPageShell`, `renderLegalMarkdown`).
- **Pattern-Reuse (BLOCKING):** `deliverables/user-guide/screencaps.spec.ts` Playwright-Pipeline existiert bereits — Screenshots werden damit produziert, nicht von Hand. shadcn `Dialog` aus dem App-Style-Guide wird fuer Modal genutzt, nicht neu gebaut.
- **Hotspot-Koordinaten relativ (Prozent 0-100):** Robuster bei Image-Resize (Retina, Mobile-Skalierung) als absolute Pixel-Werte.
- **Image-Format WebP:** Kleiner als PNG bei vergleichbarer Qualitaet. Fallback auf PNG nur falls Browser-Compat-Issues auftauchen (Next/Image-Component handhabt das automatisch).
- **Backward-Compatibility:** Bestehende `/help/[slug]`-URLs muessen weiterhin funktionieren. Fuer Slugs ohne Hotspot-JSON wird die V8.3-Plain-Markdown-Darstellung weiter gerendert (Fallback-Branch in der Page-Component).
- **BS hat keine i18n:** Help-Content ist DE-only. Hotspot-`body_md` ist DE.
- **`feedback_v2_sidebar_pflicht`:** Style-Guide-V2 Pflicht — keine eigenen Help-Components ohne Guide-Tokens.
- **`feedback_strategaize_pattern_reuse`:** Bestehende Markdown-Renderer + Modal-Pattern wiederverwenden, nicht neu schreiben.

## Risks / Assumptions

| ID | Risk / Assumption | Impact | Mitigation |
|---|---|---|---|
| R1 | Screenshot-Drift: UI aendert sich, Hotspot-Koordinaten werden stale | Medium | Re-Capture-Workflow per Playwright-Pipeline ist <30 Min. Sichtpruefung bei jedem Major-Release der Pilot-Page. |
| R2 | Image-File-Size summiert sich (12 Pages × ~300KB = 3.6MB) | Low | WebP + Lazy-Loading via `<img loading="lazy">`. V1 hat nur 1 Image, also nicht akut. |
| R3 | Hotspot-Hit-Areas zu klein auf Touchscreens | Low | Mobile-Fallback (F4) umgeht das Problem komplett (Liste statt Hotspots). Touchscreen-Desktop (Hybrid) untersucht in /qa. |
| R4 | Modal-Stacking bei Schnellklick | Low | Modal-State ist Single-Instance — neue Hotspot-Click schliesst alten Modal automatisch. shadcn Dialog handelt das nativ. |
| R5 | JSON-File-Editing ohne Visual-Editor ist DX-unfreundlich | Medium-Low | V1 Akzeptanz: Dev-Workflow per VSCode-JSON-Edit + Visual-Check im Browser. Visual-Editor ist V2-Kandidat. |
| R6 | User-Direktive 2026-05-22 wird falsch interpretiert: "permanente Help-Icons in der App = nein" | High wenn missverstanden | Architecture explizit dokumentieren: Hotspots leben NUR in `/help/[slug]`, NICHT als Overlays auf den echten App-Pages. Kein Tooltip-System in der App. |
| A1 | User produziert Walkthrough-Videos in V8.8.1+, nicht V1 | n/a | Schema-Slot existiert, Implementation rendert nur wenn vorhanden — kein Push-Pressure. |

## Success Criteria

V8.8 Foundation ist erfolgreich, wenn:

1. **Pilot-Page lebt:** `/help/mein-tag` zeigt im Desktop-Browser einen Screenshot mit min. 3 klickbaren Hotspots. Klick auf jeden Hotspot oeffnet das Modal mit Title + Markdown-Body.
2. **Mobile-Fallback funktioniert:** Viewport < 768px zeigt das Image als nicht-interaktive Anzeige + darunter eine Markdown-Liste mit denselben Hotspot-Inhalten.
3. **Style-Guide-V2 erkennbar:** Modal und Page sehen wie Teil der App aus (gleiche Borders, Surfaces, Typography wie ContentCard-basierte Pages).
4. **Backward-Compat:** Die anderen 11 Help-Slugs (`/help/pipeline`, etc.) zeigen weiterhin ihre Plain-Markdown-Darstellung — keine Regression.
5. **Schema validiert:** zod-Schema-Validation erkennt fehlende oder ungueltige Felder (z.B. `x > 100`) und wirft im Dev-Mode.
6. **Pattern-Reuse:** keine Neu-Implementation von Modal/Markdown-Renderer, nur shadcn Dialog + bestehender Markdown-Render.
7. **Verification-Aggregat:** Vitest >= V8.6-Baseline 1135, build clean, lint EXACT V8.6-Baseline 142e/57w, TSC 0 errors.

## Open Questions (fuer /architecture)

1. **Hotspot-Asset-Pfad:** `cockpit/public/help/screenshots/<slug>.webp` oder `cockpit/public/help/<slug>/screenshot.webp` (Folder pro Slug, wenn spaeter mehrere Assets dazukommen — z.B. dark-mode-Variante)? Empfehlung: Folder-pro-Slug fuer Skalierbarkeit, aber V1 reicht Single-File.
2. **Modal-Library:** shadcn `Dialog` (App-Standard) bestaetigen — gibt es Edge-Cases mit Scroll-Lock + Long-Bodies?
3. **Hotspot-Numbering im UI:** Border-Highlight on Hover reicht, oder brauchen wir Number-Badges (1, 2, 3...) fuer bessere Erkennbarkeit? Polish-Frage fuer /qa.
4. **Markdown-Renderer im Modal:** Bestehende `renderLegalMarkdown` (V8.2 + V8.4 Reuse) ist Server-Side. Modal ist Client-Component. Entweder pre-rendern beim Page-Load und als HTML-String in JSON cachen, oder Client-Side `react-markdown` einsetzen. Architecture-Entscheidung.
5. **Hotspot-Body-Laenge:** Empfehlung max. 800 Zeichen pro Hotspot. Lint-Rule via zod `max(800)`? Oder weich als Doku?
6. **Dark-Mode-Screenshots:** Falls App Dark-Mode hat (Status pruefen) — separate Image-Variante oder reicht 1×?
7. **Image-Resolution:** Empfehlung 2× Retina (1920×1080 oder hoeher). Wie wird im DOM auf 1× heruntergerendert?

## Delivery Mode

**internal-tool** — bestaetigt im STATE.md fuer Strategaize Business Development System. Keine externen Kunden, Help-Section wird von Strategaize-internen Sales-Usern + Admin/Teamlead-Onboarding genutzt.

## Recommended Next Step

`/architecture` — Hotspot-Datenmodell konkret (zod-Schema), Component-Tree (HotspotImage + HotspotModal + Mobile-Fallback), Folder-Struktur fuer Assets, Markdown-Render-Strategie (Server-pre-render vs Client-react-markdown) festlegen. Anschliessend `/slice-planning` — Foundation als 1 Slice oder Phase A (Schema + Component) / Phase B (Pilot-Page + Screenshot)?
