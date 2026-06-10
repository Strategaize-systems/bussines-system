// SLC-910 (V8.12, BL-501) — funktionaler CSP-Browser-Smoke.
//
// Pattern aus .claude/rules/security-headers-live-smoke.md (100% Tool-Reuse,
// Origin immoscheckheft V3.3 SLC-331). Pflicht-Verifikation VOR jeder
// PASS-LIVE-strict-Markierung: curl -I allein ist NICHT ausreichend.
//
// Done-Gate (exit 0): 0 Console-CSP-Errors + hasReactProps + hasReactFiber + onSubmitAttached.
//
// @playwright/test muss installiert sein (BS: devDep ergaenzen vor Phase-B-Switch /
// Live-Smoke). Lauf z.B.:
//   cd cockpit && node ../tests/_probe/csp-check.mjs https://<bs-domain>/login

import { chromium } from "@playwright/test";

const URL = process.argv[2];
if (!URL) {
  console.error("Usage: node tests/_probe/csp-check.mjs <URL>");
  process.exit(1);
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const cspErrors = [];
page.on("console", (msg) => {
  if (
    msg.type() === "error" &&
    (msg.text().includes("CSP") ||
      msg.text().includes("Content Security Policy") ||
      msg.text().includes("Permissions-Policy"))
  ) {
    cspErrors.push(msg.text());
  }
});

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });

const result = await page.evaluate(() => {
  const body = document.body;
  const propsKey = Object.keys(body).find((k) => k.startsWith("__reactProps"));
  const fiberKey = Object.keys(body).find((k) => k.startsWith("__reactFiber"));
  const forms = Array.from(document.querySelectorAll("form"));
  const onSubmitAttached =
    forms.length === 0 ||
    forms.some((f) => {
      const propKey = Object.keys(f).find((k) => k.startsWith("__reactProps"));
      return propKey && f[propKey].onSubmit;
    });
  return {
    hasReactProps: !!propsKey,
    hasReactFiber: !!fiberKey,
    onSubmitAttached,
  };
});

await browser.close();

console.log(JSON.stringify({ ...result, cspErrors }, null, 2));
process.exit(
  cspErrors.length === 0 &&
    result.hasReactProps &&
    result.hasReactFiber &&
    result.onSubmitAttached
    ? 0
    : 1,
);
