# SLC-643 — Code-Cleanup Implementation

## Metadata
- **Slice ID:** SLC-643
- **Version:** V6.4
- **Feature:** FEAT-642
- **Status:** planned
- **Priority:** Medium
- **Created:** 2026-05-07
- **Estimated Effort:** ~2-4h (skaliert mit Anzahl signed-off Items)
- **Delivery Mode:** internal-tool
- **Worktree-Isolation:** **mandatory** (Begruendung: mehrere unabhaengige Cleanup-Aenderungen quer durch Code-Base, isolierte Branch erlaubt sauberes Pro-Item-Rollback)

## Goal

Umsetzung der vom User signed-off Cleanup-Items aus dem SLC-642 Audit-Report (RPT-XXX). Pro Item: ein atomarer Commit, Vitest-Erweiterung wo sinnvoll, Live-Smoke nach jedem Cleanup.

## Pre-Condition

- SLC-642 Audit-Report existiert
- User hat pro Item entschieden: loeschen / umsetzen / spaeter / nicht
- Mindestens 3 Items mit Decision "loeschen" oder "umsetzen" (DEC-151 Mindest-Quote)

## Scope

**In Scope:**
- Implementation jedes signed-off Cleanup-Items als atomarer Commit
- Soft-Disable-Pattern fuer Cron-Loeschungs-Items (DEC-146): Coolify-Cron deaktivieren, Code bleibt
- Hart-Loeschung fuer Server-Actions / API-Routes / AI-Methoden mit Decision "loeschen"
- Vitest-Erweiterung wo der Cleanup ein Verhalten aendert
- Live-Smoke nach jedem Cleanup-Commit
- Nicht-umgesetzte Items als BL fuer V6.5 oder spaeter dokumentieren

**Out of Scope:**
- AI-Engine-Konsolidierungs-Refactor (DEC-149, defer V6.5)
- DB-Schema-Aenderungen (DEC-148, defer V6.5)
- Items mit Decision "spaeter" oder "nicht"
- Neue Features

## Acceptance

- AC-1: Mindestens 3 Code-Cleanup-Items aus SLC-642 sind umgesetzt (DEC-151 Mindest-Quote).
- AC-2: Pro umgesetztem Item: ein eigener Commit mit Format `chore(SLC-643/CA-NNN): [Titel]` oder `refactor(SLC-643/CA-NNN): [Titel]` oder `fix(SLC-643/CA-NNN): [Titel]` je nach Type.
- AC-3: Cron-Loeschungs-Items: Coolify-Cron deaktiviert (User-Aktion ueber Coolify-UI), Code unberuehrt, BL fuer V6.5+ angelegt mit Datum "Soft-Disable seit YYYY-MM-DD".
- AC-4: Server-Action-/API-Route-/AI-Methoden-Loeschungen: Code geloescht inkl. zugehoeriger Test-Files. grep nach geloeschten Symbol-Namen liefert 0 Treffer.
- AC-5: Audit-Log-Pfade unangetastet (Compliance-Schutz, DEC-145).
- AC-6: Vitest 393/393 (oder mehr) PASS nach allen Cleanup-Aenderungen.
- AC-7: Build clean, kein neuer Lint-Error.
- AC-8: Live-Smoke nach Coolify-Redeploy: 5 Haupt-Pages laden (Mein Tag, Pipeline, Kontakte, Settings-Landing, Proposals), keine 5xx in Container-Log fuer 10 Min nach Deploy.
- AC-9: Audit-Report (RPT-XXX aus SLC-642) auf `status: cleanup-done` gesetzt mit Liste umgesetzter Items.
- AC-10: Nicht-umgesetzte Items mit Decision "spaeter" als BL-XXX angelegt mit Versions-Marker (V6.5).

## Reuse

- **Atomic-Commit-Pattern** (`.claude/rules/git-release.md`)
- **Coolify-Cron-Deaktivierung-Pattern** — bekannt aus V5.4 SLC-541 npm-cron-Cleanup
- **Vitest-node-Env** fuer Server-Logik-Tests

## Risks

- **Risiko Falsch-Positiv aus Audit:** Item als "Klar-obsolet" markiert, aber doch genutzt. Mitigation: Atomare Commits, jedes Item einzeln testen, Rollback per `git revert` trivial. Bei `404 NotFound` oder Funktions-Fehler nach Deploy: Commit revertieren, Item auf "behalten" reklassifizieren.
- **Risiko Cleanup-Cascade:** Loeschen einer Server-Action zieht Imports/Re-Exports an unerwarteten Stellen hinter sich her. Mitigation: TypeScript-Compiler ist primaerer Schutz (`npm run build` zeigt unaufgeloeste Imports). Bei Compile-Failure: Cascade-Cleanup im selben Commit.
- **Risiko Test-Drift:** Geloeschte Symbol-Namen sind in alten Test-Files referenziert. Mitigation: Test-Suite muss nach jedem Cleanup-Commit gruen sein, sonst rollt der Commit zurueck.
- **Risiko Mindest-Quote nicht erreicht:** User signed-off weniger als 3 Items. Mitigation: User wird informiert, V6.4-Release-Gate wird mit User-Direktive "Audit-Output reicht" gelockert (DEC-151).

## Verification Strategy

### Pre-Implementation
- SLC-642 Audit-Report (RPT-XXX) lesen, signed-off Items extrahieren
- Pro Item: Pfad + Cleanup-Vorschlag verifizieren

### Per-Item Verification
- Cleanup-Aenderung machen
- `npm run lint` clean
- `npm run build` success
- `npm run test` gruen
- Atomic Commit
- Wenn Cleanup ein Verhalten aendert: Live-Smoke gegen den betroffenen Pfad

### Slice-Level Verification
- Vitest 393/393 (oder mehr) PASS gesamthaft
- Build clean
- Live-Smoke ueber 5 Haupt-Pages nach Coolify-Redeploy
- Audit-Report-Status auf `cleanup-done` updated

---

## Micro-Tasks

**Micro-Task-Liste haengt vom Audit-Output ab.** Generisches Pro-Item-Pattern:

### MT-N: Cleanup CA-XXX — [Titel]
- **Goal:** [Cleanup-Vorschlag aus Audit umsetzen, z.B. "soft-disable Cron 'classify' weil picked=0 ueber 7 Tage"]
- **Files:** [betroffene Files]
- **Expected behavior:** [konkrete Aenderung]
- **Verification:**
  1. `npm run build` success
  2. `npm run lint` clean
  3. `npm run test` gruen
  4. Falls Cron-Soft-Disable: Coolify-Cron-Eintrag deaktiviert (User-Aktion), Container-Log zeigt nach 24h keinen Trigger mehr
  5. Falls Code-Hart-Loeschung: grep auf geloeschten Symbol-Namen = 0 Treffer
- **Dependencies:** SLC-642 done + User-Sign-Off

### Special MT: Audit-Report-Status-Update
- **Goal:** RPT-XXX aus SLC-642 auf `status: cleanup-done` setzen + umgesetzte Items markieren.
- **Files:** `reports/RPT-XXX.md` (MODIFY)
- **Expected behavior:** Frontmatter `status: cleanup-done`. Im Body pro umgesetztem Item Marker `[done in commit hash]`. Pro nicht-umgesetztem Item `[deferred to V6.5 als BL-XXX]`.
- **Verification:** RPT zeigt klar an welche Items in V6.4 umgesetzt sind, welche auf V6.5 verschoben.
- **Dependencies:** Alle Cleanup-MTs

### Special MT: BL-Anlage fuer "spaeter"-Items
- **Goal:** Pro Item mit User-Decision "spaeter" einen BL-Eintrag in `planning/backlog.json` mit Versions-Marker V6.5.
- **Files:** `planning/backlog.json` (MODIFY)
- **Expected behavior:** Pro deferred Item: BL-XXX mit Version "V6.5", description verlinkt zur Audit-Item-Nummer (CA-NNN).
- **Verification:** backlog.json valid JSON, neue BL-Eintraege sichtbar im Cockpit.
- **Dependencies:** Alle Cleanup-MTs

---

## Definition of Done

- Mindestens 3 Cleanup-Items umgesetzt (oder weniger mit User-OK pro DEC-151)
- Atomare Commits pro Item, jeder mit /qa-Pass-Quality (Build + Lint + Vitest gruen)
- Audit-Report-Status auf `cleanup-done`
- "spaeter"-Items als BL fuer V6.5 dokumentiert
- Live-Smoke nach Coolify-Redeploy ueber 5 Haupt-Pages
- Slice-Status `done` in slices/INDEX.md
- /qa als naechster Schritt
- Naechster Slice: SLC-644 UI-Audit Inventur
