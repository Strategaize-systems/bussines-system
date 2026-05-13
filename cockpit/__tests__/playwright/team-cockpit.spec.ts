/**
 * SLC-705 MT-7 — Team-Cockpit Browser-Smoke-Recipe.
 *
 * AUSFUEHRUNG: in /qa SLC-705 via Playwright-MCP (siehe Memory
 * `reference_playwright_browser_smoke.md`). Diese Datei ist die formelle
 * Test-Recipe + Vertrag fuer den Smoke-Check.
 *
 * Dieses Repo installiert `@playwright/test` NICHT als Dependency — Smoke-
 * Tests laufen seit V6.6 ueber MCP-Playwright in-Session. Diese Datei
 * sammelt Selectors, Pfade und erwartete Outcomes fuer den /qa-Run.
 *
 * VERIFIKATIONS-SCHRITTE (manuell in /qa SLC-705):
 *
 *   Pre-Conditions:
 *     - `npm run seed:multi-user` ist gegen die Coolify-DB gelaufen.
 *     - Auth-Users existieren fuer Teamlead + mindestens 1 Member
 *       (per Admin-Invite via SLC-703 ODER One-Off-Script via
 *       `supabase.auth.admin.createUser`).
 *     - Empfohlene E-Mails:
 *         `seed-teamlead@strategaize-test.local` (profile.id = ...078)
 *         `seed-member1@strategaize-test.local`  (profile.id = ...081)
 *
 *   Test-Case 1 — Teamlead sieht /team mit KPIs + Members + KI-Workspace:
 *     a) Login als seed-teamlead
 *     b) Navigation zu `https://<deploy>/team`
 *     c) Warten bis `[data-testid="ki-workspace"]` sichtbar ist (durch SA-3)
 *     d) Assertions:
 *        - URL bleibt `/team` (kein Redirect)
 *        - 4 KPICards rendern (Selector: `div.grid-cols-4 > .bg-white`)
 *          oder textuell: "Pipeline-Sum", "Offene Aktivitaeten",
 *          "Conversion 30T", "Backlog-Mitarbeiter"
 *        - 5 Mitarbeiter-Rows in der Tabelle (Selector
 *          `table tbody tr` count === 5)
 *        - "Cockpit oeffnen"-Link pro Row vorhanden
 *        - KI-Workspace zeigt 3 Berichts-Buttons:
 *          "Wer hat Underperformance?" / "Wer brennt aus?" /
 *          "Wo stocken Deals im Team?"  (siehe TEAM_COCKPIT_REPORTS)
 *
 *   Test-Case 2 — Member wird von /team weg-redirected:
 *     a) Login als seed-member1
 *     b) Navigation zu `https://<deploy>/team`
 *     c) Assertions:
 *        - URL endet auf `/mein-tag` (assertRole redirect)
 *        - KEINE PageHeader mit Titel "Team-Cockpit" rendert
 *
 *   Test-Case 3 (optional, Live-Bedrock-Smoke fuer AC10):
 *     a) Login als seed-teamlead
 *     b) /team -> Klick auf "Wer hat Underperformance?"
 *     c) Assertions:
 *        - Innerhalb 10 Sekunden zeigt `[data-testid="ki-workspace-answer"]`
 *          oder analoger Container nicht-leeren Markdown
 *        - `audit_log`-Eintrag mit `action = 'ki_workspace_report'` und
 *          `context->>reportId = 'team-underperformance'` ist neu
 *          (binnen 15 Sekunden via SQL-Verifikation)
 *
 *   Test-Case 4 (optional, Drilldown-Stub-Verhalten fuer AC7):
 *     a) Login als seed-teamlead
 *     b) /team -> Klick auf "Cockpit oeffnen" eines Members
 *     c) Assertions:
 *        - Browser navigiert zu `/team/<member-uuid>/mein-tag`
 *        - Erwartet: 404 ODER Auto-Redirect (SLC-706 noch nicht ausgeliefert)
 *        - Hinweis: explizit dokumentiert dass 404 hier OK ist bis SLC-706.
 *
 * SELECTOR-MAP:
 */
export const TEAM_COCKPIT_SMOKE_RECIPE = {
  routes: {
    teamCockpit: "/team",
    memberDefault: "/mein-tag",
  },
  testUsers: {
    teamlead: {
      email: "seed-teamlead@strategaize-test.local",
      profileId: "00000000-0000-0000-0000-000000000078",
    },
    member: {
      email: "seed-member1@strategaize-test.local",
      profileId: "00000000-0000-0000-0000-000000000081",
    },
  },
  selectors: {
    pageHeader: 'h1:text("Team-Cockpit")',
    kpiGrid: ".grid-cols-4",
    kpiCards: ".grid-cols-4 > div", // jede Card
    membersTable: "table",
    memberRows: "table tbody tr",
    drilldownLink: 'a[href^="/team/"][href*="/mein-tag"]',
    kiWorkspace: '[data-testid="ki-workspace"]',
    kiWorkspaceReportButton: '[data-testid="ki-workspace-report-buttons"] button',
  },
  expected: {
    teamleadOnTeam: {
      url: "/team",
      kpiCount: 4,
      memberRowCount: 5,
      reportButtonCount: 3,
      expectedReportLabels: [
        "Wer hat Underperformance?",
        "Wer brennt aus?",
        "Wo stocken Deals im Team?",
      ] as const,
    },
    memberOnTeam: {
      urlEndsWith: "/mein-tag",
    },
  },
  bedrockSmoke: {
    timeoutSec: 10,
    auditLogVerify: {
      action: "ki_workspace_report",
      reportIdValues: [
        "team-underperformance",
        "team-burnout",
        "team-stale-deals",
      ] as const,
      sqlSnippet:
        "SELECT COUNT(*) FROM audit_log WHERE action = 'ki_workspace_report' " +
        "AND context::jsonb->>'reportId' = $1 AND created_at >= NOW() - INTERVAL '1 minute'",
    },
  },
  drilldownStub: {
    expectedBehaviorUntilSLC706: "404 or auto-redirect to /mein-tag",
    note: "Drilldown-Routes existieren erst in SLC-706. Stub-404 hier ist AC7-konform.",
  },
} as const;
