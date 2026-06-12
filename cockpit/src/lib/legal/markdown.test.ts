import { describe, it, expect } from "vitest";
import { renderLegalMarkdown } from "./markdown";
import { findUnsafeMarkup } from "./validate-markdown";

// V8.14 SLC-912 MT-3 (ISSUE-100) — OWASP-XSS-Adversarial-Suite fuer Legal-Markdown.
// Port der Test-Philosophie aus lib/email/sanitize-email-html.test.ts (V8.10 SLC-892).

describe("renderLegalMarkdown — XSS-Sanitize (render path)", () => {
  it("strips raw <script> tags", async () => {
    const html = await renderLegalMarkdown(
      "Hallo\n\n<script>alert('xss')</script>\n\nWelt",
    );
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/alert\(/);
  });

  it("strips <img onerror=...> event handlers", async () => {
    const html = await renderLegalMarkdown(
      'Text\n\n<img src="x" onerror="alert(1)">\n',
    );
    expect(html).not.toMatch(/onerror/i);
  });

  it("strips <svg onload=...> (svg is not allowed at all)", async () => {
    const html = await renderLegalMarkdown('<svg onload="alert(1)"></svg>');
    expect(html).not.toMatch(/<svg/i);
    expect(html).not.toMatch(/onload/i);
  });

  it("neutralizes javascript: links", async () => {
    const html = await renderLegalMarkdown("[klick](javascript:alert(1))");
    expect(html).not.toMatch(/javascript:/i);
  });

  it("strips <iframe> embeds", async () => {
    const html = await renderLegalMarkdown(
      '<iframe src="https://evil.example.com"></iframe>',
    );
    expect(html).not.toMatch(/<iframe/i);
  });

  it("preserves legitimate markdown (headings, lists, tables, links)", async () => {
    const md = [
      "# Datenschutz",
      "",
      "Wir verarbeiten Daten gemäß **DSGVO**.",
      "",
      "- Punkt eins",
      "- Punkt zwei",
      "",
      "| Anbieter | Zweck |",
      "| --- | --- |",
      "| AWS | Hosting |",
      "",
      "[Mehr Infos](https://example.com)",
    ].join("\n");
    const html = await renderLegalMarkdown(md);

    expect(html).toMatch(/<h1>Datenschutz<\/h1>/);
    expect(html).toMatch(/<strong>DSGVO<\/strong>/);
    expect(html).toMatch(/<li>Punkt eins<\/li>/);
    expect(html).toMatch(/<table>/);
    expect(html).toMatch(/<td>AWS<\/td>/);
    expect(html).toMatch(/href="https:\/\/example\.com"/);
  });
});

describe("findUnsafeMarkup — write-path validator", () => {
  it.each([
    ["<script>alert(1)</script>", "<script>"],
    ['<img src=x onerror="alert(1)">', "onerror handler"],
    ['<svg onload="alert(1)">', "svg"],
    ["[x](javascript:alert(1))", "javascript: url"],
    ['<iframe src="evil"></iframe>', "iframe"],
    ['<a href="data:text/html,<script>">x</a>', "data:text/html"],
  ])("rejects %s", (payload) => {
    expect(findUnsafeMarkup(payload)).not.toBeNull();
  });

  it.each([
    "# Heading\n\nNormaler Text mit **fett** und [Link](https://x.de).",
    "- Liste\n- mit Punkten\n\n| A | B |\n| - | - |\n| 1 | 2 |",
    "Information on the topic of comparison= and similar prose is fine.",
  ])("allows clean markdown: %s", (clean) => {
    expect(findUnsafeMarkup(clean)).toBeNull();
  });
});
