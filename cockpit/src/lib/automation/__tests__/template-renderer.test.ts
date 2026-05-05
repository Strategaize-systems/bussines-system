import { describe, it, expect } from "vitest";
import { renderTemplate } from "../template-renderer";

describe("template-renderer", () => {
  it("ersetzt einfache Variablen", () => {
    expect(renderTemplate("Hallo {{name}}", { name: "Welt" })).toBe("Hallo Welt");
  });

  it("unterstuetzt Dot-Notation", () => {
    expect(
      renderTemplate("Deal: {{deal.title}}", { deal: { title: "Acme" } })
    ).toBe("Deal: Acme");
  });

  it("ersetzt unbekannte Keys mit leerem String (kein Throw)", () => {
    expect(renderTemplate("Hi {{nope}}!", {})).toBe("Hi !");
    expect(renderTemplate("Hi {{a.b.c}}!", { a: { b: {} } })).toBe("Hi !");
  });

  it("haelt mehrere Variablen", () => {
    const out = renderTemplate("{{a}} und {{b}}", { a: "Foo", b: "Bar" });
    expect(out).toBe("Foo und Bar");
  });

  it("akzeptiert Whitespace innerhalb der Mustache-Klammern", () => {
    expect(renderTemplate("{{ name }}", { name: "X" })).toBe("X");
  });

  it("stringifiziert numbers, booleans, dates", () => {
    expect(renderTemplate("{{n}}", { n: 42 })).toBe("42");
    expect(renderTemplate("{{b}}", { b: true })).toBe("true");
    const d = new Date("2026-05-05T12:00:00.000Z");
    expect(renderTemplate("{{d}}", { d })).toBe("2026-05-05T12:00:00.000Z");
  });

  it("liefert leeren String fuer Object/Array-Werte ohne Date", () => {
    expect(renderTemplate("{{x}}", { x: { foo: 1 } })).toBe("");
    expect(renderTemplate("{{x}}", { x: [1, 2] })).toBe("");
  });

  it("kuerzt Output auf 1000 Zeichen", () => {
    const big = "x".repeat(2000);
    const out = renderTemplate("{{big}}", { big });
    expect(out.length).toBe(1000);
  });

  it("liefert leeren String bei leerem Template", () => {
    expect(renderTemplate("", {})).toBe("");
  });

  it("akzeptiert Templates ohne Variablen unveraendert", () => {
    expect(renderTemplate("Plain text.", { foo: "bar" })).toBe("Plain text.");
  });
});
