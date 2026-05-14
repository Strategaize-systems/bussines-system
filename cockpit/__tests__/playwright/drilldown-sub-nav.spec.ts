/**
 * SLC-707 MT-7 — Drilldown Sub-Nav-Strip E2E Smoke-Recipe.
 *
 * AUSFUEHRUNG: in /qa SLC-707 via Playwright-MCP. Recipe-Datei, kein Auto-Run.
 *
 * Verifiziert MT-6.5 — Tab-Strip mit 3 Sub-Routes (Mein Tag / Pipeline /
 * Aufgaben) im Drilldown-Layout zwischen Banner und Children.
 *
 * PRE-CHECKS:
 *   - Coolify-Redeploy mit aktuellem Commit-Hash erfolgreich.
 *   - Admin/Teamlead-User eingeloggt.
 *   - Mindestens 1 Test-Member als Drilldown-Target vorhanden.
 *
 * VERIFIKATIONS-SCHRITTE:
 *
 *   1. Drilldown-Target oeffnen:
 *      a) Login als Admin oder Teamlead.
 *      b) `/team` → Member-Tabelle → Click auf einen Member-Row -> redirect
 *         zu `/team/<user_id>/mein-tag`.
 *      c) Erwartung: Drilldown-Banner sichtbar (oben), DrilldownSubNav
 *         direkt darunter mit 3 Tabs.
 *
 *   2. Tab-Default-Aktiv:
 *      a) Bei initialer Landung auf `/team/<id>/mein-tag` ist Tab
 *         "Mein Tag" als aktiv markiert (Bottom-Border `border-foreground`,
 *         Text `text-foreground`).
 *      b) Tabs "Pipeline" und "Aufgaben" sind inactive (Bottom-Border
 *         transparent, Text `text-muted-foreground`).
 *      c) DevTools-Inspektion: aktiver Tab hat `aria-current="page"`.
 *
 *   3. Tab-Switch:
 *      a) Click Tab "Pipeline" → Browser navigiert zu
 *         `/team/<id>/pipeline`. Tab-Highlight wandert auf "Pipeline".
 *      b) Click Tab "Aufgaben" → Browser navigiert zu
 *         `/team/<id>/aufgaben`. Tab-Highlight wandert auf "Aufgaben".
 *      c) Click Tab "Mein Tag" → Browser navigiert zurueck zu
 *         `/team/<id>/mein-tag`. Tab-Highlight wandert auf "Mein Tag".
 *
 *   4. Direkt-URL-Eingabe:
 *      a) URL `/team/<id>/aufgaben` direkt im Browser. Erwartung: Page laedt
 *         mit Tab "Aufgaben" aktiv markiert (usePathname()-Detection greift).
 *
 *   5. Mobile-Sicht (Viewport 375 × 667):
 *      a) Drilldown oeffnen. Sub-Nav ist sichtbar.
 *      b) Bei 3 Tabs in einem schmalen Viewport: horizontal-overflow-scroll
 *         (CSS `overflow-x-auto`) erlaubt seitliches Scrollen falls Text
 *         laenger ist. Erwartung: alle Tabs erreichbar, kein Wrap.
 *
 *   6. A11y:
 *      a) Tab-Strip hat `<nav aria-label="Drilldown-Bereiche">`.
 *      b) Aktiver Tab hat `aria-current="page"`.
 *      c) Tab-Navigation via Tab-Taste funktioniert (Focus-Ring auf Brand-
 *         Token `focus-visible:ring-ring/50`).
 *
 * SUCCESS-CRITERIA:
 *   - 3 Tabs sichtbar, alle clickbar.
 *   - Aktiv-Highlight folgt Route korrekt.
 *   - aria-current="page" wird per Tab gesetzt.
 *   - Mobile: horizontal scroll, kein Layout-Bruch.
 *
 * AUDIT-VERIFIKATION:
 *   - Keine DB-Side-Effekte.
 *
 * KNOWN ISSUES:
 *   - keine.
 */

export {};
