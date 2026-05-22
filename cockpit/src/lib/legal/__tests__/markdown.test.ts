import { describe, expect, it } from "vitest";
import { renderLegalMarkdown } from "../markdown";

describe("renderLegalMarkdown", () => {
  it("renders h1 heading to <h1>", async () => {
    const html = await renderLegalMarkdown("# Datenschutz");
    expect(html).toContain("<h1>");
    expect(html).toContain("Datenschutz");
    expect(html).toContain("</h1>");
  });

  it("renders paragraphs to <p>", async () => {
    const html = await renderLegalMarkdown(
      "Erste Zeile.\n\nZweite Zeile."
    );
    expect(html).toMatch(/<p>Erste Zeile\.<\/p>/);
    expect(html).toMatch(/<p>Zweite Zeile\.<\/p>/);
  });

  it("renders unordered lists to <ul><li>", async () => {
    const html = await renderLegalMarkdown(
      "- Punkt eins\n- Punkt zwei"
    );
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>Punkt eins</li>");
    expect(html).toContain("<li>Punkt zwei</li>");
  });

  it("renders GFM tables (remark-gfm activated)", async () => {
    const md = [
      "| Spalte 1 | Spalte 2 |",
      "|---|---|",
      "| A | B |",
    ].join("\n");
    const html = await renderLegalMarkdown(md);
    expect(html).toContain("<table>");
    expect(html).toContain("<th>Spalte 1</th>");
    expect(html).toContain("<td>A</td>");
  });

  it("renders inline links to <a>", async () => {
    const html = await renderLegalMarkdown(
      "Siehe [Datenschutz](/datenschutz)."
    );
    expect(html).toMatch(/<a href="\/datenschutz">Datenschutz<\/a>/);
  });
});
