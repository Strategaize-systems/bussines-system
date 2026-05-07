# SLC-644 — UI-Audit Inventur

## Metadata
- **Slice ID:** SLC-644
- **Version:** V6.4
- **Feature:** FEAT-643
- **Status:** planned
- **Priority:** Medium
- **Created:** 2026-05-07
- **Estimated Effort:** ~2h Inventur (PLUS User-Sign-Off-Pause)
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** skipped (Begruendung: keine UI-Aenderung in diesem Slice — nur Audit-Report-Erstellung mit Screenshots)

## Goal

Strukturierte Inventur ueber 5 UI-Bereiche (Settings-Landing, Sidebar, Button-Konsistenz, Pipeline-Stages, Page-Header). Output: 1 RPT-XXX-UI-Audit mit Per-Item-Liste + Vorher/Nachher-Beschreibung + Aufwand-Schaetzung. **KEIN UI-Cleanup in diesem Slice** — Cleanup-Implementation ist SLC-645. Zwischen SLC-644 und SLC-645 ist eine zwingende User-Sign-Off-Pause (Item-by-Item: umsetzen/spaeter/nicht).

## Scope

**In Scope (6 MTs Inventur):**
- MT-1: Settings-Landing-Page Inspection mit Screenshots
- MT-2: Sidebar-Eintraege-Inventur + Pipeline-Stage-Daten-Pull (SQL)
- MT-3: Button-Konsistenz-Audit cross-page
- MT-4: Page-Header-Pattern-Audit cross-page
- MT-5: Style-Guide-V2-Verifikation (gibt es Color/Token-Drift?)
- MT-6: Audit-Report-Erstellung mit Vorher/Nachher pro Item

**Out of Scope:**
- UI-Cleanup-Implementation (SLC-645)
- Komplette Page-Redesigns (DEC-150, defer V6.5+ falls relevant)
- Mobile-Audit
- Accessibility-Audit
- Color-Palette-Wechsel (Style Guide V2 ist verbindlich)

## Acceptance

- AC-1: Settings-Landing-Page Inspection enthaelt: Screenshots aktueller Zustand (Desktop + ggf. Mobile), Liste der 5 Link-Karten + Inline-Sections, Hierarchie-Bewertung (sinnvoll/redundant/unklar).
- AC-2: Sidebar-Inventur enthaelt: Liste aller Eintraege, Gruppierung, Pipeline-Stages (SQL gegen `deals.stage_id GROUP BY` zeigt Deal-Count pro Stage).
- AC-3: Button-Konsistenz-Audit enthaelt mindestens 5 Page-Stichproben (Mein Tag, Pipeline, Kontakte, Settings-Landing, Proposals) mit Tabelle: Page | Primary-Position | Primary-Label-Stil | Destructive-Verteilung.
- AC-4: Page-Header-Pattern-Audit enthaelt mindestens 5 Page-Stichproben mit Tabelle: Page | Header-Hoehe | Title+Subtitle-Vorhanden | Action-Position | Breadcrumbs.
- AC-5: Style-Guide-V2-Drift-Liste: Stellen wo Color-Klassen abweichen vom Token-Set (z.B. eigene `bg-[#xxx]` statt `bg-primary`).
- AC-6: Audit-Report (RPT-XXX) ist erstellt mit:
  - mindestens 1 Item pro Bereich (= mindestens 5 Items total)
  - Pro Item: Bereich, Aktuell-Beschreibung, Beobachtung, Vorher/Nachher-Vorschlag, Aufwand (klein <1h | mittel 1-3h | gross 3+h), Risiko, User-Entscheidung-Checkbox
- AC-7: Gross-Items (>3h) sind explizit als "spaeter (V6.5)"-Vorschlag markiert (DEC-150).
- AC-8: Audit-Report ist committed + gepusht. User-Sign-Off-Pause beginnt.

## Reuse

- **Browser-Smoke-Pattern** mit chrome-devtools-MCP (etabliert seit 2026-04-29) fuer Screenshots.
- **Style Guide V2** als Referenz-Dokumentation (`feedback_style_guide_v2_mandatory.md`).
- **V6.2-Hotfix ISSUE-056** (Settings-Landing-Karten-Inkonsistenz) als historisches Beispiel.
- **V6.3 BL-426** (Workflow-Polish) als historisches Beispiel.
- **Audit-Per-Item-Format** — DEC-145 (gleiche Methodik wie SLC-642).

## Risks

- **Risiko Subjektivitaet:** UI-Klassifikation "redundant/inkonsistent" ist nicht so eindeutig wie Code-Klassifikation "0 Caller". Mitigation: Screenshots als Beweis pro Item, Vorher/Nachher konkret formuliert (kein "soll besser werden").
- **Risiko Audit-Scope-Explosion:** Settings + Sidebar + Buttons + Stages + Headers koennen schnell 20+ Items werden. Mitigation: Mindest-Quote 1 pro Bereich (=5 total) als Floor, bei mehr als 15 Items fokussierte Top-15-Liste mit "spaeter"-Bucket fuer Rest.
- **Risiko User-Erwartungs-Drift:** User hat sich an aktuelles Layout gewoehnt, "Verbesserungs"-Vorschlag wirkt als Verschlechterung. Mitigation: Vorher/Nachher konkret + Aufwand-Schaetzung + User-Entscheidung pro Item.
- **Risiko V7-Touch-Conflict:** UI-Items die in V7-Multi-User-Sprint ohnehin neu gemacht werden muessen (Sidebar mit Team-Switching, Pipeline mit Owner-Filter). Mitigation: Items mit V7-Bezug als "spaeter (nach V7)" markieren.

## Verification Strategy

### Pre-Implementation
- Browser-MCP-Verbindung zu Live-System (https://business.strategaizetransition.com) verifiziert
- Style Guide V2 Token-Liste verfuegbar

### Per-MT Verification
Siehe Micro-Tasks unten.

### Slice-Level Verification
- Audit-Report enthaelt mindestens 5 klassifizierte Items (1 pro Bereich)
- Pro Item: alle Felder ausgefuellt + Screenshot-Reference
- Gross-Items als "spaeter (V6.5)" markiert
- Report committed, User-Sign-Off-Pause aktiv

---

## Micro-Tasks

### MT-1: Settings-Landing-Page Inspection
- **Goal:** Aktueller Zustand der Settings-Landing-Page dokumentieren.
- **Files:**
  - Audit-Report-Section "1. Settings-Landing-Page" (NEU)
  - `.qa-artifacts/SLC-644-settings-landing-desktop.png` (NEU, Screenshot)
- **Expected behavior:**
  - Browser-Smoke `https://business.strategaizetransition.com/settings/`
  - Screenshot Desktop-Viewport
  - Liste der Link-Karten + Inline-Sections (ImapStatus, PipelineConfig, TemplatesConfig)
  - Hierarchie-Bewertung: welche Karten gehoeren visuell zusammen, wo ist der Bruch?
- **Verification:**
  - Screenshot existiert
  - Audit-Report-Section enthaelt vollstaendige Karten-/Section-Liste mit Bewertung
- **Dependencies:** none

### MT-2: Sidebar-Inventur + Pipeline-Stage-Daten
- **Goal:** Sidebar-Eintraege gegen tatsaechliche Page-Existenz und Pipeline-Stage-Anzahl gegen Deal-Count.
- **Files:**
  - Audit-Report-Section "2. Sidebar-Navigation" (NEU)
  - Audit-Report-Section "4. Pipeline-Stages" (NEU)
- **Expected behavior:**
  - Sidebar-Source-File finden (`cockpit/src/app/(app)/layout.tsx` oder `_components/sidebar.tsx`), Eintraege auflisten
  - Pro Eintrag pruefen: Page-Datei existiert? Letzte Mod-Time? Doppel-Pfade?
  - SQL gegen Hetzner-DB: `SELECT pipeline_id, stage_id, COUNT(*) FROM deals GROUP BY pipeline_id, stage_id ORDER BY pipeline_id, stage_position`
  - Pipeline-Stages-Tabelle: Pipeline | Stage-Name | Stage-Position | Deal-Count
  - Stages mit 0 Deals seit ueber 30 Tagen -> Cleanup-Kandidat
- **Verification:**
  - Sidebar-Liste komplett mit Bewertung
  - Pipeline-Stage-Daten aus Live-DB
- **Dependencies:** none

### MT-3: Button-Konsistenz-Audit
- **Goal:** Cross-page Inventur der Button-Pattern.
- **Files:**
  - Audit-Report-Section "3. Button-Konsistenz" (NEU)
- **Expected behavior:**
  - 5 Page-Stichproben: Mein Tag, Pipeline, Kontakte, Settings-Landing, Proposals
  - Pro Page: Screenshot + Tabelle
    - Page | Primary-Button | Position | Label-Stil | Destructive | Secondary
  - Inkonsistenzen identifizieren (z.B. "Primary auf Mein Tag rechts oben, auf Settings unten zentriert")
- **Verification:**
  - 5 Page-Screenshots
  - Audit-Tabelle mit mindestens 5 Zeilen
- **Dependencies:** none

### MT-4: Page-Header-Pattern-Audit
- **Goal:** Cross-page Inventur der Page-Header.
- **Files:**
  - Audit-Report-Section "5. Page-Header-Pattern" (NEU)
- **Expected behavior:**
  - Gleiche 5 Page-Stichproben wie MT-3
  - Pro Page: Tabelle
    - Page | Header-Hoehe | Title-Vorhanden | Subtitle-Vorhanden | Action-Position | Breadcrumbs
  - Inkonsistenzen identifizieren
- **Verification:**
  - Audit-Tabelle mit mindestens 5 Zeilen
- **Dependencies:** MT-3 (Reuse Screenshots)

### MT-5: Style-Guide-V2-Drift-Liste
- **Goal:** Stellen identifizieren wo Color-Token oder Spacing-Token abweichen.
- **Files:**
  - Audit-Report-Section "6. Style-Guide-V2-Drift" (NEU)
- **Expected behavior:**
  - grep auf custom Color-Klassen (`bg-[#`, `text-[#`, `border-[#`)
  - grep auf nicht-token Spacing (`p-[`, `m-[`, `gap-[`)
  - Liste mit Pfad + Stelle + Token-Empfehlung
- **Verification:**
  - Audit-Section enthaelt grep-basierte Drift-Liste
- **Dependencies:** none

### MT-6: Audit-Report mit Vorher/Nachher + Sign-Off-Pause
- **Goal:** Konsolidierter UI-Audit-Report mit Per-Item-Format.
- **Files:**
  - `reports/RPT-XXX.md` (NEU, type: audit)
- **Expected behavior:**
  - Frontmatter: `type: audit`, `status: pending-signoff`, `slice: SLC-644`, `feature: FEAT-643`, `title: "V6.4 UI-Audit Inventur"`
  - Body: 6 Sections aus MT-1..MT-5 + konsolidierte Per-Item-Liste:
    ```
    ## UA-NNN — [Titel]
    - Bereich: settings-landing | sidebar | button-konsistenz | pipeline-stages | page-header | style-guide-drift
    - Aktuell: [Status quo, Screenshot-Reference]
    - Beobachtung: [warum Cleanup-Kandidat]
    - Vorschlag: [konkreter Vorher/Nachher]
    - Aufwand: klein <1h | mittel 1-3h | gross 3+h
    - Risiko: ...
    - User-Entscheidung: [ ] umsetzen [ ] spaeter [ ] nicht
    ```
  - Gross-Items (>3h) explizit als "spaeter (V6.5)"-Vorschlag markiert (DEC-150)
  - Mindestens 5 Items total (1 pro Bereich)
- **Verification:**
  - Report committed mit Screenshots als Anhaenge
  - Slice-Status `pending-signoff` in slices/INDEX.md
  - User-Pause-Phase: User klassifiziert pro Item, schliesst danach SLC-644 als done
- **Dependencies:** MT-1, MT-2, MT-3, MT-4, MT-5

---

## Definition of Done

- 6 MTs durchgefuehrt
- Audit-Report (RPT-XXX) committed mit mindestens 5 klassifizierten Items + Screenshots
- Gross-Items als "spaeter (V6.5)" markiert
- User-Sign-Off-Pause aktiv (Slice-Status `pending-signoff` oder `done` nach Sign-Off)
- /qa-Skip akzeptiert (kein Code-Aenderung in diesem Slice)
- Naechster Schritt nach User-Sign-Off: SLC-645 UI-Cleanup-Implementation
