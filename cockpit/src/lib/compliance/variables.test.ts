// =============================================================
// applyTemplateVariables — Unit Tests
// SLC-523 / FEAT-523 — V5.2 Compliance-Sprint, DEC-084
// =============================================================

import { describe, expect, it } from "vitest";
import { applyTemplateVariables } from "./variables";

describe("applyTemplateVariables", () => {
  it("ersetzt bekannten Token mit Wert", () => {
    const result = applyTemplateVariables("Hi {user_name}", {
      user_name: "Immo",
    });
    expect(result).toBe("Hi Immo");
  });

  it("ersetzt mehrere Tokens in einem Template", () => {
    const result = applyTemplateVariables(
      "{user_name} ({user_email}) von {firma}",
      {
        user_name: "Immo Bellaerts",
        user_email: "immo@bellaerts.de",
        firma: "Strategaize",
      },
    );
    expect(result).toBe("Immo Bellaerts (immo@bellaerts.de) von Strategaize");
  });

  it("laesst unbekannten Token sichtbar", () => {
    const result = applyTemplateVariables("Hi {kontakt_name}", {
      user_name: "Immo",
    });
    expect(result).toBe("Hi {kontakt_name}");
  });

  it("laesst leeren String-Wert als unbekannt durchgehen (Token bleibt sichtbar)", () => {
    const result = applyTemplateVariables("Hi {firma}", { firma: "" });
    expect(result).toBe("Hi {firma}");
  });

  it("liefert leeren String fuer leeres Template", () => {
    expect(applyTemplateVariables("", { user_name: "Immo" })).toBe("");
  });

  it("liefert leeren String fuer leeres Template auch ohne Vars", () => {
    expect(applyTemplateVariables("", {})).toBe("");
  });

  it("matcht keine Tokens mit Sonderzeichen oder Whitespace", () => {
    const result = applyTemplateVariables("Hallo { user_name } und {-name}", {
      user_name: "Immo",
    });
    // Nur ASCII \w-Identifier matchen — {-name} und { user_name } bleiben unangetastet
    expect(result).toBe("Hallo { user_name } und {-name}");
  });

  it("mischt bekannte und unbekannte Tokens korrekt", () => {
    const result = applyTemplateVariables(
      "{user_name} <-> {kontakt_name} (von {firma})",
      {
        user_name: "Immo",
        firma: "Strategaize",
      },
    );
    expect(result).toBe("Immo <-> {kontakt_name} (von Strategaize)");
  });
});
