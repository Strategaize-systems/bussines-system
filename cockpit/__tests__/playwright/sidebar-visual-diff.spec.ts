/**
 * SLC-702 MT-6 — Sidebar Visual-Diff fuer 3 Rollen.
 *
 * AUSFUEHRUNG: in /qa SLC-702 via Playwright-MCP (siehe Memory
 * `reference_playwright_browser_smoke.md`). Diese Datei ist die formelle
 * Test-Recipe + Vertrag fuer Reference-Screenshots in `__snapshots__/`.
 *
 * Dieses Repo installiert `@playwright/test` NICHT als Dependency, weil:
 *   1) Smoke-Tests laufen seit V6.6 ueber MCP-Playwright (in-Session).
 *   2) Visual-Diff-Vergleiche koennen mit Playwright-MCP `take_screenshot` +
 *      manueller Sichtkontrolle der gepushten Reference-PNGs durchgefuehrt
 *      werden.
 *
 * VERIFIKATIONS-SCHRITTE (manuell in /qa SLC-702):
 *
 *   1. Sicherstellen dass `npm run seed:multi-user` ausgefuehrt wurde gegen
 *      die Coolify-DB. Das erzeugt:
 *        - 1 Test-Team
 *        - 1 Teamlead-Profile (id = 00000000-...-078)
 *        - 5 Member-Profiles (ids = ...081..085)
 *      Hinweis: profiles werden geseedet, aber `auth.users` (mit Passwoertern)
 *      muessen separat existieren (Admin-Invite-Flow in SLC-703 oder
 *      `supabase.auth.admin.createUser` per One-Off-Script). Test-User-
 *      E-Mails empfohlen: `seed-admin@strategaize-test.local`,
 *      `seed-teamlead@strategaize-test.local`, `seed-member1@strategaize-test.local`.
 *
 *   2. Pro Rolle (admin / teamlead / member):
 *        a) Login mit Test-User-Credentials
 *        b) Navigation zu `https://<deploy>/mein-tag`
 *        c) Warten bis `[data-testid="sidebar"]` sichtbar ist
 *        d) Screenshot vom Sidebar-Element (Selector
 *           `nav.sidebar` ODER `[data-testid="sidebar"]`,
 *           Viewport-Breite 1280, Sidebar-Width 256px)
 *        e) Vergleich mit `__snapshots__/sidebar-<role>.png`
 *
 *   3. Erwartete Sichtbarkeit pro Rolle (siehe sidebar-config.ts):
 *
 *      ADMIN sieht:
 *        - ANALYSE: Dashboard
 *        - TEAM:    Team-Cockpit, Team-Verwaltung
 *        - OPERATIV: Mein Tag, Focus, Kalender
 *        - ARBEITSBEREICHE: Deals, Pipeline, Firmen, Kontakte, Multiplikatoren
 *        - VERWALTUNG (collapsed by default):
 *            Aufgaben, Termine-Liste, E-Mails, Proposals, Settings,
 *            Handoffs, Referrals, Ziele, Automatisierung, Produkte, Audit-Log
 *
 *      TEAMLEAD sieht:
 *        - ANALYSE: Dashboard
 *        - TEAM:    Team-Cockpit, Team-Verwaltung
 *        - OPERATIV: Mein Tag, Focus, Kalender
 *        - ARBEITSBEREICHE: Deals, Pipeline, Firmen, Kontakte, Multiplikatoren
 *        - VERWALTUNG (collapsed by default):
 *            Aufgaben, Termine-Liste, E-Mails, Proposals, Settings,
 *            Handoffs, Referrals, Ziele, Automatisierung
 *        - KEIN /settings/products, KEIN /audit-log
 *
 *      MEMBER sieht:
 *        - KEINE ANALYSE-Section
 *        - KEINE TEAM-Section
 *        - OPERATIV: Mein Tag, Focus, Kalender
 *        - ARBEITSBEREICHE: Deals, Pipeline, Firmen, Kontakte, Multiplikatoren
 *        - VERWALTUNG (collapsed by default):
 *            Aufgaben, Termine-Liste, E-Mails, Proposals, Settings
 *        - KEIN Handoffs, KEIN Referrals, KEIN Ziele, KEIN Automatisierung,
 *          KEIN /settings/products, KEIN /audit-log
 *
 *   4. Direkt-URL-Probe (Defense-in-Depth Middleware-Check):
 *        - Als member: GET `/dashboard` → 302/307 zu `/mein-tag`
 *        - Als member: GET `/team` → 302/307 zu `/mein-tag`
 *        - Als member: GET `/audit-log` → 302/307 zu `/mein-tag`
 *        - Als teamlead: GET `/settings/products` → 302/307 zu `/mein-tag`
 *        - Als admin: GET `/team` → 200 (Stub-Route bis SLC-705)
 *
 *   5. Diff-Schwelle: keine Pixel-Aenderungen auf Admin-Layout (das ist die
 *      V6.6-Baseline, R1 Visual-Diff). Teamlead+Member: erwartete Unterschiede
 *      sind das Fehlen der gefilterten Sektionen — visuell muss VERWALTUNG-
 *      Header weiterhin korrekt rendern, OPERATIV/ARBEITSBEREICHE 1:1.
 *
 * SNAPSHOT-DATEIEN (werden in /qa SLC-702 mit MCP-Playwright erzeugt und
 * committed):
 *   - cockpit/__tests__/playwright/__snapshots__/sidebar-admin.png
 *   - cockpit/__tests__/playwright/__snapshots__/sidebar-teamlead.png
 *   - cockpit/__tests__/playwright/__snapshots__/sidebar-member.png
 *
 * STATUS in SLC-702 MT-6: Test-Recipe definiert, Snapshot-Erzeugung +
 * Visual-Diff erfolgt in /qa SLC-702 (siehe Slice-Spec "Recommended Next
 * Step nach SLC-702").
 */

export const SIDEBAR_DIFF_TEST_RECIPE = {
  selectors: {
    sidebar: '[data-testid="sidebar"]',
    activeItem: '[data-testid="sidebar"] a[aria-current="page"]',
  },
  testRoles: ["admin", "teamlead", "member"] as const,
  routesUnderTest: {
    forbidden: {
      member: ["/dashboard", "/team", "/settings/team", "/audit-log", "/cadences", "/handoffs"],
      teamlead: ["/settings/products", "/audit-log"],
      admin: [],
    },
    allowed: {
      member: ["/mein-tag", "/deals", "/companies", "/contacts", "/proposals"],
      teamlead: ["/dashboard", "/team", "/settings/team", "/cadences", "/handoffs"],
      admin: ["/dashboard", "/team", "/audit-log", "/settings/products"],
    },
  },
  expectedRedirectOnBlock: "/mein-tag",
  diffThreshold: 0.001, // 0.1% — Admin-Layout MUSS 1:1 zu V6.6 bleiben.
} as const;
