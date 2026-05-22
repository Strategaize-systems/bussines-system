/**
 * Playwright Screencap-Skript fuer Tutorial-Videos.
 *
 * Erzeugt Screenshots + Videos fuer alle 12 Lektionen (User-Guide).
 *
 * Voraussetzungen:
 * - @playwright/test installed (npm install -D @playwright/test)
 * - playwright.config.ts in der Projekt-Root
 * - Test-Credentials gesetzt:
 *     SCREENCAP_BASE_URL (z.B. https://business.strategaizetransition.com)
 *     SCREENCAP_EMAIL (qa-admin@example.com oder echter Test-Account)
 *     SCREENCAP_PASSWORD
 *
 * Ausfuehrung:
 *   npx playwright test deliverables/user-guide/screencaps.spec.ts
 *
 * Output:
 *   - test-results/screencaps/ — Screenshots (PNG) + Videos (webm)
 *   - test-results/traces/ — Playwright-Traces fuer Debugging
 *
 * Hinweis: Dies ist KEIN Pass/Fail-Test, sondern ein Capture-Skript.
 * Failing-Tests dokumentieren Issues, brechen aber den Capture-Lauf nicht ab.
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.SCREENCAP_BASE_URL ?? "https://business.strategaizetransition.com";
const EMAIL = process.env.SCREENCAP_EMAIL ?? "qa-admin@example.com";
const PASSWORD = process.env.SCREENCAP_PASSWORD ?? "";

test.use({
  baseURL: BASE_URL,
  screenshot: "on",
  video: "on",
  trace: "on",
  viewport: { width: 1440, height: 900 },
});

/**
 * Helper: Login mit Test-Credentials.
 */
async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|mein-tag)/);
}

/**
 * Helper: kurze Pause fuer visuelle UI-Settlement.
 */
async function settle(page: Page, ms = 500) {
  await page.waitForTimeout(ms);
}

// ============================================================================
// Lektion 1 — Mein Tag
// ============================================================================
test("Lektion-01-mein-tag", async ({ page }) => {
  await login(page);
  await page.goto("/mein-tag");
  await settle(page);
  await page.screenshot({ path: "test-results/screencaps/01-mein-tag-uebersicht.png", fullPage: true });

  // KI-Tagesanalyse triggern
  const tagesanalyseBtn = page.getByRole("button", { name: /Tagesanalyse/i });
  if (await tagesanalyseBtn.isVisible()) {
    await tagesanalyseBtn.click();
    await settle(page, 1000);
    await page.screenshot({ path: "test-results/screencaps/01-mein-tag-spinner.png" });
    await page.waitForSelector('[data-testid="answer-pane"]', { timeout: 30000 }).catch(() => null);
    await page.screenshot({ path: "test-results/screencaps/01-mein-tag-bericht.png", fullPage: true });
  }

  // Eingabezeile demo
  const input = page.getByPlaceholder(/Frage stellen/i);
  if (await input.isVisible()) {
    await input.fill("Welche Deals stagnieren seit 14 Tagen?");
    await page.screenshot({ path: "test-results/screencaps/01-mein-tag-eingabe.png" });
  }
});

// ============================================================================
// Lektion 2 — Pipeline
// ============================================================================
test("Lektion-02-pipeline", async ({ page }) => {
  await login(page);
  await page.goto("/pipeline");
  await settle(page);
  await page.screenshot({ path: "test-results/screencaps/02-pipeline-uebersicht.png", fullPage: true });

  // Pipeline-Switcher
  const switcher = page.getByRole("tablist").first();
  if (await switcher.isVisible()) {
    await page.screenshot({ path: "test-results/screencaps/02-pipeline-switcher.png" });
  }

  // Filter-Bar
  const filterBar = page.locator('[data-testid="filter-bar"]').first();
  if (await filterBar.isVisible()) {
    await page.screenshot({ path: "test-results/screencaps/02-pipeline-filter.png" });
  }

  // Pflichtfelder-Modal Demo (manuell triggern, siehe README)
});

// ============================================================================
// Lektion 3 — Deal-Detail
// ============================================================================
test("Lektion-03-deal-detail", async ({ page }) => {
  await login(page);
  await page.goto("/deals");
  await settle(page);
  // Klick auf ersten Deal in der Liste
  const firstDeal = page.locator('a[href^="/deals/"]').first();
  if (await firstDeal.isVisible()) {
    await firstDeal.click();
    await page.waitForURL(/\/deals\/[\w-]+/);
    await settle(page);
    await page.screenshot({ path: "test-results/screencaps/03-deal-detail-uebersicht.png", fullPage: true });

    // KI-Workspace
    const kiSection = page.locator('[data-testid="ki-workspace"]').first();
    if (await kiSection.isVisible()) {
      await page.screenshot({ path: "test-results/screencaps/03-deal-ki-workspace.png" });
    }

    // Activities-Timeline
    const timeline = page.locator('[data-testid="activities-timeline"]').first();
    if (await timeline.isVisible()) {
      await page.screenshot({ path: "test-results/screencaps/03-deal-activities.png" });
    }
  }
});

// ============================================================================
// Lektion 4 — Compose-Studio
// ============================================================================
test("Lektion-04-compose", async ({ page }) => {
  await login(page);
  await page.goto("/emails/compose");
  await settle(page);
  await page.screenshot({ path: "test-results/screencaps/04-compose-uebersicht.png", fullPage: true });

  // Live-Vorschau-Bereich
  const preview = page.locator('iframe[title*="Vorschau"]').first();
  if (await preview.isVisible()) {
    await page.screenshot({ path: "test-results/screencaps/04-compose-vorschau.png" });
  }

  // KI-Vorlagen-Buttons
  const vorlagen = page.getByRole("button", { name: /Vorlage/i });
  if ((await vorlagen.count()) > 0) {
    await page.screenshot({ path: "test-results/screencaps/04-compose-vorlagen.png" });
  }
});

// ============================================================================
// Lektion 5 — Settings
// ============================================================================
test("Lektion-05-settings", async ({ page }) => {
  await login(page);
  await page.goto("/settings");
  await settle(page);
  await page.screenshot({ path: "test-results/screencaps/05-settings-3sections.png", fullPage: true });

  // Branding
  await page.goto("/settings/branding");
  await settle(page);
  await page.screenshot({ path: "test-results/screencaps/05-settings-branding.png", fullPage: true });
});

// ============================================================================
// Lektion 6 — Team-Verwaltung
// ============================================================================
test("Lektion-06-team-verwaltung", async ({ page }) => {
  await login(page);
  await page.goto("/settings/team");
  await settle(page);
  await page.screenshot({ path: "test-results/screencaps/06-team-uebersicht.png", fullPage: true });

  // Invite-Dialog
  const inviteBtn = page.getByRole("button", { name: /Mitglied einladen/i });
  if (await inviteBtn.isVisible()) {
    await inviteBtn.click();
    await settle(page);
    await page.screenshot({ path: "test-results/screencaps/06-team-invite-modal.png" });
    await page.keyboard.press("Escape");
  }
});

// ============================================================================
// Lektion 7 — KI-Workspace (Master)
// ============================================================================
test("Lektion-07-ki-workspace", async ({ page }) => {
  await login(page);
  await page.goto("/mein-tag");
  await settle(page);

  // KI-Workspace im Mein-Tag
  await page.screenshot({ path: "test-results/screencaps/07-ki-workspace-buttons.png" });

  // Free-Form-Eingabe demo
  const input = page.getByPlaceholder(/Frage stellen/i);
  if (await input.isVisible()) {
    await input.fill("Was sind meine Top-3 Pipeline-Risiken?");
    await page.screenshot({ path: "test-results/screencaps/07-ki-workspace-eingabe.png" });
  }
});

// ============================================================================
// Lektion 8 — Workflow-Automation
// ============================================================================
test("Lektion-08-workflow-automation", async ({ page }) => {
  await login(page);
  await page.goto("/settings/automation");
  await settle(page);
  await page.screenshot({ path: "test-results/screencaps/08-workflow-listing.png", fullPage: true });

  // Neue Regel Wizard
  const newRuleBtn = page.getByRole("button", { name: /Neue Regel/i });
  if (await newRuleBtn.isVisible()) {
    await newRuleBtn.click();
    await settle(page);
    await page.screenshot({ path: "test-results/screencaps/08-workflow-wizard.png" });
  }

  // NL-History
  await page.goto("/settings/workflow-automation/nl-history");
  await settle(page);
  await page.screenshot({ path: "test-results/screencaps/08-workflow-nl-history.png", fullPage: true });
});

// ============================================================================
// Lektion 9 — Custom-Reports
// ============================================================================
test("Lektion-09-custom-reports", async ({ page }) => {
  await login(page);
  await page.goto("/mein-tag");
  await settle(page);

  // Meine-Berichte-Dropdown
  const meineBerichte = page.getByRole("button", { name: /Meine Berichte/i });
  if (await meineBerichte.isVisible()) {
    await meineBerichte.click();
    await settle(page);
    await page.screenshot({ path: "test-results/screencaps/09-custom-reports-dropdown.png" });
  }
});

// ============================================================================
// Lektion 10 — Kampagnen
// ============================================================================
test("Lektion-10-kampagnen", async ({ page }) => {
  await login(page);
  await page.goto("/settings/campaigns");
  await settle(page);
  await page.screenshot({ path: "test-results/screencaps/10-kampagnen-listing.png", fullPage: true });

  // Erste Kampagne aufmachen
  const firstCampaign = page.locator('a[href*="/settings/campaigns/"][href*="/edit"]').first();
  if (await firstCampaign.isVisible()) {
    await firstCampaign.click();
    await settle(page);
    await page.screenshot({ path: "test-results/screencaps/10-kampagnen-performance.png", fullPage: true });
  }
});

// ============================================================================
// Lektion 11 — Zahlungsbedingungen
// ============================================================================
test("Lektion-11-zahlungsbedingungen", async ({ page }) => {
  await login(page);
  await page.goto("/settings/payment-terms");
  await settle(page);
  await page.screenshot({ path: "test-results/screencaps/11-payment-terms.png", fullPage: true });

  // Briefing-Settings
  await page.goto("/settings/briefing");
  await settle(page);
  await page.screenshot({ path: "test-results/screencaps/11-briefing-settings.png", fullPage: true });
});

// ============================================================================
// Lektion 12 — VAT + Reverse-Charge
// ============================================================================
test("Lektion-12-vat-reverse-charge", async ({ page }) => {
  await login(page);
  await page.goto("/settings/branding");
  await settle(page);
  await page.screenshot({ path: "test-results/screencaps/12-branding-vat-id.png", fullPage: true });

  // Beispiel-Proposal mit Reverse-Charge-Toggle
  // Hinweis: braucht ein existierendes Test-Proposal mit EU-B2B-Empfaenger
  await page.goto("/proposals");
  await settle(page);
  const firstProposal = page.locator('a[href*="/proposals/"][href*="/edit"]').first();
  if (await firstProposal.isVisible()) {
    await firstProposal.click();
    await settle(page);
    await page.screenshot({ path: "test-results/screencaps/12-proposal-editor.png", fullPage: true });
  }
});

// ============================================================================
// Bonus: Public-Pages (Lektion uebergreifend)
// ============================================================================
test("Bonus-public-pages", async ({ page }) => {
  // /datenschutz ohne Login
  await page.goto("/datenschutz");
  await settle(page);
  await page.screenshot({ path: "test-results/screencaps/bonus-datenschutz.png", fullPage: true });

  // /impressum ohne Login
  await page.goto("/impressum");
  await settle(page);
  await page.screenshot({ path: "test-results/screencaps/bonus-impressum.png", fullPage: true });

  // /login mit Footer
  await page.goto("/login");
  await settle(page);
  await page.screenshot({ path: "test-results/screencaps/bonus-login-with-footer.png", fullPage: true });
});
