// =============================================================
// validateEmailTemplateGenerateResult — Unit Tests
// SLC-532 / FEAT-533 — V5.3 Composing-Studio
// =============================================================

import { describe, expect, it } from "vitest";
import {
  EMAIL_TEMPLATE_CATEGORIES,
  buildEmailTemplateGeneratePrompt,
  validateEmailTemplateGenerateResult,
} from "./email-template-generate";

describe("validateEmailTemplateGenerateResult", () => {
  it("akzeptiert gueltiges JSON mit allen vier Feldern", () => {
    const result = validateEmailTemplateGenerateResult({
      title: "Erstansprache Multiplikator",
      subject: "Kurze Frage zu {{firma}}",
      body: "Hallo {{vorname}}, ...",
      suggestedCategory: "erstansprache",
    });

    expect(result).not.toBeNull();
    expect(result?.title).toBe("Erstansprache Multiplikator");
    expect(result?.subject).toBe("Kurze Frage zu {{firma}}");
    expect(result?.body).toBe("Hallo {{vorname}}, ...");
    expect(result?.suggestedCategory).toBe("erstansprache");
  });

  it("trimmt title/subject/body und kuerzt den Title auf 120 Zeichen", () => {
    const result = validateEmailTemplateGenerateResult({
      title: "  " + "x".repeat(200) + "  ",
      subject: "  Kurzer Betreff  ",
      body: "  Body  ",
      suggestedCategory: "follow-up",
    });

    expect(result?.title.length).toBe(120);
    expect(result?.subject).toBe("Kurzer Betreff");
    expect(result?.body).toBe("Body");
  });

  it("faellt auf 'sonstige' zurueck bei unbekannter Kategorie", () => {
    const result = validateEmailTemplateGenerateResult({
      title: "x",
      subject: "x",
      body: "x",
      suggestedCategory: "voellig-unbekannt",
    });

    expect(result?.suggestedCategory).toBe("sonstige");
  });

  it("gibt null zurueck bei fehlendem Feld", () => {
    expect(
      validateEmailTemplateGenerateResult({
        title: "x",
        subject: "x",
        body: "x",
      })
    ).toBeNull();

    expect(
      validateEmailTemplateGenerateResult({
        subject: "x",
        body: "x",
        suggestedCategory: "danke",
      })
    ).toBeNull();
  });

  it("gibt null zurueck bei leeren Strings (Quality-Guard)", () => {
    expect(
      validateEmailTemplateGenerateResult({
        title: "",
        subject: "x",
        body: "x",
        suggestedCategory: "danke",
      })
    ).toBeNull();

    expect(
      validateEmailTemplateGenerateResult({
        title: "x",
        subject: "   ",
        body: "x",
        suggestedCategory: "danke",
      })
    ).toBeNull();
  });

  it("gibt null zurueck bei null/undefined/array/string", () => {
    expect(validateEmailTemplateGenerateResult(null)).toBeNull();
    expect(validateEmailTemplateGenerateResult(undefined)).toBeNull();
    expect(validateEmailTemplateGenerateResult([])).toBeNull();
    expect(validateEmailTemplateGenerateResult("not an object")).toBeNull();
  });

  it("akzeptiert alle erlaubten Kategorien", () => {
    for (const category of EMAIL_TEMPLATE_CATEGORIES) {
      const result = validateEmailTemplateGenerateResult({
        title: "x",
        subject: "x",
        body: "x",
        suggestedCategory: category,
      });
      expect(result?.suggestedCategory).toBe(category);
    }
  });
});

describe("buildEmailTemplateGeneratePrompt", () => {
  it("enthaelt die gewaehlte Sprache als Label und Code", () => {
    expect(
      buildEmailTemplateGeneratePrompt({
        userPrompt: "Erstansprache fuer Steuerberater",
        language: "de",
      })
    ).toMatch(/Sprach-Code: de/);

    expect(
      buildEmailTemplateGeneratePrompt({
        userPrompt: "Cold outreach",
        language: "en",
      })
    ).toMatch(/Sprach-Code: en/);

    expect(
      buildEmailTemplateGeneratePrompt({
        userPrompt: "Eerste contact",
        language: "nl",
      })
    ).toMatch(/Sprach-Code: nl/);
  });

  it("uebergibt den User-Prompt unveraendert", () => {
    const prompt = buildEmailTemplateGeneratePrompt({
      userPrompt: "Follow-up nach 3 Wochen ohne Antwort",
      language: "de",
    });
    expect(prompt).toContain("Follow-up nach 3 Wochen ohne Antwort");
  });
});
