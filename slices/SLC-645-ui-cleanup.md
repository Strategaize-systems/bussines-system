# SLC-645 — UI-Cleanup Implementation

## Metadata
- **Slice ID:** SLC-645
- **Version:** V6.4
- **Feature:** FEAT-643
- **Status:** planned
- **Priority:** Medium
- **Created:** 2026-05-07
- **Estimated Effort:** ~2-4h (skaliert mit Anzahl signed-off Items)
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** **mandatory** (Begruendung: UI-Aenderungen quer durch mehrere Pages, isolierte Branch erlaubt visuelle Verifikation pro Item bevor Master-Merge)

## Goal

Umsetzung der vom User signed-off UI-Cleanup-Items aus dem SLC-644 Audit-Report. Pro Item: ein atomarer Commit, Browser-Smoke nach jedem Cleanup, Style Guide V2 verbindlich.

## Pre-Condition

- SLC-644 Audit-Report existiert
- User hat pro Item entschieden: umsetzen / spaeter / nicht
- Mindestens 2 Items mit Decision "umsetzen" und Aufwand `klein` oder `mittel` (DEC-151 Mindest-Quote)

## Scope

**In Scope:**
- Implementation jedes signed-off klein/mittel-Cleanup-Items als atomarer Commit
- Style Guide V2 verbindlich fuer alle Aenderungen — keine custom Color-Klassen, keine custom Spacing-Werte
- Browser-Smoke pro Item nach Coolify-Redeploy
- Nicht-umgesetzte Items + Gross-Items als BL fuer V6.5 dokumentieren

**Out of Scope:**
- Gross-Items (>3h Aufwand) — sind per DEC-150 deferred
- Komplette Page-Redesigns
- Mobile-Optimierung
- Color-Palette-Wechsel
- Items mit Decision "spaeter" oder "nicht"

## Acceptance

- AC-1: Mindestens 2 UI-Cleanup-Items aus SLC-644 sind umgesetzt (DEC-151 Mindest-Quote).
- AC-2: Pro umgesetztem Item: ein eigener Commit mit Format `style(SLC-645/UA-NNN): [Titel]` oder `refactor(SLC-645/UA-NNN): [Titel]` je nach Type.
- AC-3: Style Guide V2 verbindlich befolgt:
  - Keine neuen `bg-[#xxx]` / `text-[#xxx]` / `border-[#xxx]` Klassen
  - Spacing nutzt Tailwind-Token-Skala (`p-2`, `gap-4`, etc.)
  - Typography folgt etablierten Klassen (`text-sm`, `font-medium`, etc.)
- AC-4: Pro Item: Vorher-Screenshot + Nachher-Screenshot in `.qa-artifacts/`.
- AC-5: Build clean, Vitest 393/393 (oder mehr) PASS, kein neuer Lint-Error.
- AC-6: Browser-Smoke nach Coolify-Redeploy: alle 5 Haupt-Pages laden, betroffene Pages zeigen Cleanup wie geplant, keine 5xx in Container-Log fuer 10 Min.
- AC-7: Audit-Report (RPT-XXX aus SLC-644) auf `status: cleanup-done` gesetzt mit Liste umgesetzter Items + Vorher/Nachher-Screenshot-Refs.
- AC-8: Nicht-umgesetzte Items mit Decision "spaeter" und Gross-Items als BL-XXX angelegt mit Versions-Marker (V6.5).

## Reuse

- **Atomic-Commit-Pattern** (`.claude/rules/git-release.md`)
- **Browser-Smoke-Pattern** mit chrome-devtools-MCP fuer Vorher/Nachher-Screenshots
- **Style Guide V2** (`feedback_style_guide_v2_mandatory.md`)
- **V6.3 BL-426** (Workflow-Polish) als historisches Beispiel fuer UI-Cleanup-Slice-Pattern

## Risks

- **Risiko Stilbruch gegen V5.3-V6.3-Pattern:** Ein UI-Cleanup koennte visuell von der etablierten Sprache abweichen. Mitigation: Style Guide V2 als Token-Quelle, Vorher/Nachher-Screenshots im Audit-Report dokumentiert (User hat schon signed-off).
- **Risiko Cascade-Drift:** Ein UI-Element-Cleanup zieht andere Pages mit, die das gleiche Element nutzen. Mitigation: Pre-Implementation grep auf Component-Wiederverwendung, betroffene Pages alle in einem Commit aenderbar oder atomic split.
- **Risiko Browser-Smoke-Limitierung:** Visual Regression nicht automatisch detektierbar. Mitigation: Live-User-Tester (= du) inspiziert nach Redeploy 5 Haupt-Pages.
- **Risiko Style-Guide-Token nicht ausreichend:** Ein noetiges Pattern fehlt im Token-Set. Mitigation: vor V6.4-Cleanup als Audit-Item dokumentieren, NICHT in V6.4 das Token-Set erweitern (Style Guide V2 stabil halten, Erweiterungen sind eigener Slice).

## Verification Strategy

### Pre-Implementation
- SLC-644 Audit-Report (RPT-XXX) lesen, signed-off klein/mittel-Items extrahieren
- Pro Item: Vorher/Nachher-Vorschlag + Vorher-Screenshot pruefen
- Style Guide V2 Token-Liste verfuegbar

### Per-Item Verification
- UI-Aenderung machen
- `npm run lint` clean
- `npm run build` success
- `npm run test` gruen
- Atomic Commit
- Nach Coolify-Redeploy: Browser-Smoke der betroffenen Page + Nachher-Screenshot

### Slice-Level Verification
- Vitest 393/393 (oder mehr) PASS gesamthaft
- Build clean
- Browser-Smoke ueber 5 Haupt-Pages nach Coolify-Redeploy
- Audit-Report-Status auf `cleanup-done` updated mit Vorher/Nachher-Screenshot-Refs

---

## Micro-Tasks

**Micro-Task-Liste haengt vom Audit-Output ab.** Generisches Pro-Item-Pattern:

### MT-N: Cleanup UA-XXX — [Titel]
- **Goal:** [konkreter Vorher/Nachher-Vorschlag aus Audit umsetzen]
- **Files:** [betroffene Files, in der Regel 1-3 .tsx-Dateien]
- **Expected behavior:** [konkrete UI-Aenderung, z.B. "Settings-Sub-Nav zeigt Workflow + Kampagnen als Sub-Items unter Workflow-Automation Karte"]
- **Verification:**
  1. `npm run build` success
  2. `npm run lint` clean
  3. `npm run test` gruen
  4. Browser-Smoke nach Redeploy: Vorher-Screenshot vs. Nachher-Screenshot in `.qa-artifacts/`
  5. Style Guide V2 verbindlich: grep nach custom Color-/Spacing-Klassen in geaendertem File = 0 Treffer
- **Dependencies:** SLC-644 done + User-Sign-Off

### Special MT: Audit-Report-Status-Update
- **Goal:** RPT-XXX aus SLC-644 auf `status: cleanup-done` setzen + umgesetzte Items markieren mit Screenshot-Refs.
- **Files:** `reports/RPT-XXX.md` (MODIFY)
- **Expected behavior:** Frontmatter `status: cleanup-done`. Im Body pro umgesetztem Item: `[done in commit hash]` + Vorher/Nachher-Screenshot-Pfade. Pro nicht-umgesetztem Item: `[deferred to V6.5 als BL-XXX]`.
- **Verification:** RPT zeigt klar an welche Items umgesetzt sind, welche auf V6.5 verschoben.
- **Dependencies:** Alle Cleanup-MTs

### Special MT: BL-Anlage fuer "spaeter"-Items + Gross-Items
- **Goal:** Pro Item mit Decision "spaeter" oder Aufwand "gross" einen BL-Eintrag in `planning/backlog.json` mit V6.5-Marker.
- **Files:** `planning/backlog.json` (MODIFY)
- **Expected behavior:** Pro deferred Item: BL-XXX mit Version "V6.5" oder unassigned, description verlinkt zur Audit-Item-Nummer (UA-NNN) + ggf. Gross-Item-Begruendung.
- **Verification:** backlog.json valid JSON, neue BL-Eintraege sichtbar im Cockpit.
- **Dependencies:** Alle Cleanup-MTs

---

## Definition of Done

- Mindestens 2 Cleanup-Items umgesetzt (oder weniger mit User-OK pro DEC-151)
- Atomare Commits pro Item, jeder mit /qa-Pass-Quality (Build + Lint + Vitest gruen)
- Style Guide V2 verbindlich befolgt (keine custom Color-/Spacing-Klassen)
- Vorher/Nachher-Screenshots in `.qa-artifacts/`
- Audit-Report-Status auf `cleanup-done`
- "spaeter"-Items + Gross-Items als BL fuer V6.5 dokumentiert
- Browser-Smoke nach Coolify-Redeploy ueber 5 Haupt-Pages
- Slice-Status `done` in slices/INDEX.md
- /qa als naechster Schritt
- Naechste Schritte: Gesamt-/qa V6.4 -> /final-check -> /go-live -> /deploy als REL-026
