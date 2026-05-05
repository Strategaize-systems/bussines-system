// V6.2 SLC-621 MT-5 — Field-Whitelist Vitest
import { describe, it, expect } from "vitest";
import {
  isFieldWhitelisted,
  validateFieldValue,
  UPDATE_FIELD_WHITELIST,
} from "../field-whitelist";

describe("isFieldWhitelisted — PII-Schutz (DEC-130)", () => {
  // Diese PII-Felder duerfen NIE als update_field-Target erlaubt sein.
  const PII_FIELDS_PER_ENTITY: Record<string, string[]> = {
    contact: ["email", "phone", "first_name", "last_name", "name"],
    company: ["name", "email", "phone"],
    deal: ["title", "description", "next_action"],
  };

  it.each(Object.entries(PII_FIELDS_PER_ENTITY).flatMap(([entity, fields]) =>
    fields.map((f) => [entity, f] as const)
  ))(
    "%s.%s is REJECTED (PII or business-critical)",
    (entity, field) => {
      expect(
        isFieldWhitelisted(entity as "deal" | "contact" | "company", field)
      ).toBe(false);
    }
  );

  it("rejects unknown entity types", () => {
    expect(isFieldWhitelisted("user" as never, "tags")).toBe(false);
  });
});

describe("isFieldWhitelisted — Whitelist accepts only documented fields", () => {
  it("deal.stage_id, deal.value, deal.expected_close_date are allowed", () => {
    expect(isFieldWhitelisted("deal", "stage_id")).toBe(true);
    expect(isFieldWhitelisted("deal", "value")).toBe(true);
    expect(isFieldWhitelisted("deal", "expected_close_date")).toBe(true);
  });

  it("contact.tags is allowed", () => {
    expect(isFieldWhitelisted("contact", "tags")).toBe(true);
  });

  it("company.tags is allowed", () => {
    expect(isFieldWhitelisted("company", "tags")).toBe(true);
  });

  it("Whitelist hat exakt 5 Felder ueber 3 Entities (V1-Baseline)", () => {
    const total =
      UPDATE_FIELD_WHITELIST.deal.length +
      UPDATE_FIELD_WHITELIST.contact.length +
      UPDATE_FIELD_WHITELIST.company.length;
    expect(total).toBe(5);
  });
});

describe("validateFieldValue — Validators", () => {
  it("deal.stage_id requires UUID", () => {
    expect(
      validateFieldValue("deal", "stage_id", "550e8400-e29b-41d4-a716-446655440000")
        .ok
    ).toBe(true);
    expect(validateFieldValue("deal", "stage_id", "not-a-uuid").ok).toBe(false);
    expect(validateFieldValue("deal", "stage_id", 123).ok).toBe(false);
  });

  it("deal.value requires positive finite number", () => {
    expect(validateFieldValue("deal", "value", 0).ok).toBe(true);
    expect(validateFieldValue("deal", "value", 1000).ok).toBe(true);
    expect(validateFieldValue("deal", "value", 1e9).ok).toBe(true);
    expect(validateFieldValue("deal", "value", -100).ok).toBe(false);
    expect(validateFieldValue("deal", "value", 1e10).ok).toBe(false);
    expect(validateFieldValue("deal", "value", Number.NaN).ok).toBe(false);
    expect(validateFieldValue("deal", "value", "100").ok).toBe(false);
  });

  it("deal.expected_close_date requires ISO 8601", () => {
    expect(
      validateFieldValue("deal", "expected_close_date", "2026-12-31").ok
    ).toBe(true);
    expect(
      validateFieldValue(
        "deal",
        "expected_close_date",
        "2026-12-31T10:00:00Z"
      ).ok
    ).toBe(true);
    expect(validateFieldValue("deal", "expected_close_date", "31.12.2026").ok).toBe(
      false
    );
    expect(
      validateFieldValue("deal", "expected_close_date", "2026-99-99").ok
    ).toBe(false);
  });

  it("contact.tags requires Array<string> max 50, max 100 chars", () => {
    expect(validateFieldValue("contact", "tags", ["vip"]).ok).toBe(true);
    expect(validateFieldValue("contact", "tags", []).ok).toBe(true);
    expect(validateFieldValue("contact", "tags", ["vip", "premium"]).ok).toBe(true);
    expect(validateFieldValue("contact", "tags", "vip").ok).toBe(false);
    expect(
      validateFieldValue("contact", "tags", new Array(51).fill("x")).ok
    ).toBe(false);
    expect(validateFieldValue("contact", "tags", [""]).ok).toBe(false);
    expect(validateFieldValue("contact", "tags", ["a".repeat(101)]).ok).toBe(false);
  });

  it("non-whitelisted field returns error", () => {
    const result = validateFieldValue("contact", "email", "x@y.z");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("nicht in der update_field-Whitelist");
    }
  });
});
