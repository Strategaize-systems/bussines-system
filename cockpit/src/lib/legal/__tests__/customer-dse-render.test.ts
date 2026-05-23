import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderLegalMarkdown } from "../markdown";

describe("renderLegalMarkdown — customer-dse-default.md sanity", () => {
  let html: string;
  let markdown: string;

  beforeAll(async () => {
    const filePath = path.join(
      process.cwd(),
      "src",
      "content",
      "legal",
      "customer-dse-default.md",
    );
    markdown = await readFile(filePath, "utf-8");
    html = await renderLegalMarkdown(markdown);
  });

  it("renders without throwing", () => {
    expect(html.length).toBeGreaterThan(1000);
  });

  it("renders h1/h2/h3 hierarchy", () => {
    expect(html).toMatch(/<h1>/);
    expect(html).toMatch(/<h2>/);
    expect(html).toMatch(/<h3>/);
  });

  it("renders Auftragsverarbeiter-table via remark-gfm", () => {
    expect(html).toMatch(/<table>/);
    expect(html).toMatch(/<th>Anbieter<\/th>/);
    expect(html).toMatch(/Hetzner Online GmbH/);
    expect(html).toMatch(/AWS Bedrock/);
  });

  it("preserves placeholder syntax for tenant-admin to replace", () => {
    expect(html).toContain("{{tenant_name}}");
    expect(html).toContain("{{contact_email}}");
  });

  it("renders ENTWURF blockquote at the top", () => {
    expect(html).toMatch(/<blockquote>/);
    expect(html).toMatch(/Default-Seed-Entwurf/);
  });
});
