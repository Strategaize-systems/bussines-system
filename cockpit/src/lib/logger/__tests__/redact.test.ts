// BS V8.12 SLC-907 MT-1 — Tests fuer redactSecrets (AC-907-1..3).

import { describe, it, expect } from "vitest";
import { redactSecrets, DEFAULT_REDACT_KEYS } from "@/lib/logger/redact";

describe("redactSecrets", () => {
  it("AC-907-1: redactet flache Default-Keys (password + email)", () => {
    expect(redactSecrets({ password: "x", email: "y" })).toEqual({
      password: "[REDACTED]",
      email: "[REDACTED]",
    });
  });

  it("laesst Nicht-Sensible-Keys unveraendert", () => {
    expect(
      redactSecrets({ name: "Max", token: "abc", count: 3 }),
    ).toEqual({ name: "Max", token: "[REDACTED]", count: 3 });
  });

  it("ist case-insensitive fuer Keys (Authorization, API_KEY)", () => {
    expect(
      redactSecrets({ Authorization: "Bearer z", API_KEY: "k" }),
    ).toEqual({ Authorization: "[REDACTED]", API_KEY: "[REDACTED]" });
  });

  it("AC-907-2: ist deep-recursive ueber nested Objects", () => {
    expect(
      redactSecrets({ user: { name: "Max", secret: "s" }, ok: true }),
    ).toEqual({ user: { name: "Max", secret: "[REDACTED]" }, ok: true });
  });

  it("AC-907-2: redactet Keys innerhalb von Arrays", () => {
    expect(
      redactSecrets({ items: [{ jwt: "t1" }, { jwt: "t2", id: 5 }] }),
    ).toEqual({ items: [{ jwt: "[REDACTED]" }, { jwt: "[REDACTED]", id: 5 }] });
  });

  // V8.14 SLC-912 MT-5 (ISSUE-103): neue BS-Domain-PII-Default-Keys.
  it("redactet BS-Domain-PII-Keys (from_address, recipient, body_text, transcript, x-cron-secret)", () => {
    expect(
      redactSecrets({
        from_address: "a@b.de",
        recipient: "c@d.de",
        body_text: "geheimer Inhalt",
        transcript: "Meeting-Mitschrift",
        "x-cron-secret": "s3cr3t",
        keep: "ok",
      }),
    ).toEqual({
      from_address: "[REDACTED]",
      recipient: "[REDACTED]",
      body_text: "[REDACTED]",
      transcript: "[REDACTED]",
      "x-cron-secret": "[REDACTED]",
      keep: "ok",
    });
  });

  it("AC-907-3: redactet zusaetzliche Keys via opts.extraKeys", () => {
    expect(
      redactSecrets({ custom_key: "v", keep: "k" }, { extraKeys: ["custom_key"] }),
    ).toEqual({ custom_key: "[REDACTED]", keep: "k" });
  });

  it("verwendet opts.replacementValue wenn gesetzt", () => {
    expect(
      redactSecrets({ password: "x" }, { replacementValue: "***" }),
    ).toEqual({ password: "***" });
  });

  it("bricht bei zirkulaeren Referenzen nicht ab (WeakSet-Guard)", () => {
    const circular: Record<string, unknown> = { name: "node", token: "t" };
    circular.self = circular;
    const result = redactSecrets(circular) as Record<string, unknown>;
    expect(result.name).toBe("node");
    expect(result.token).toBe("[REDACTED]");
    expect(result.self).toBe("[Circular]");
  });

  it("reicht Primitive und null unveraendert durch", () => {
    expect(redactSecrets("plain string")).toBe("plain string");
    expect(redactSecrets(42)).toBe(42);
    expect(redactSecrets(null)).toBe(null);
    expect(redactSecrets(undefined)).toBe(undefined);
  });

  it("mutiert das Eingabe-Objekt nicht (non-destructive Copy)", () => {
    const input = { password: "secret123", keep: "v" };
    redactSecrets(input);
    expect(input.password).toBe("secret123");
  });

  it("stoppt ab MAX_DEPTH (Tiefen-Guard, kein Stack-Overflow)", () => {
    // 12 Ebenen tief — ab Depth 10 wird der Wert unveraendert durchgereicht.
    let deep: Record<string, unknown> = { password: "leaf" };
    for (let i = 0; i < 12; i++) deep = { nested: deep };
    // Darf nicht werfen und liefert ein Objekt zurueck.
    expect(() => redactSecrets(deep)).not.toThrow();
  });

  it("DEFAULT_REDACT_KEYS enthaelt 17 Keys (DEC-280 12 + V8.14 SLC-912 MT-5 5)", () => {
    expect(DEFAULT_REDACT_KEYS).toHaveLength(17);
    expect(DEFAULT_REDACT_KEYS).toContain("password");
    expect(DEFAULT_REDACT_KEYS).toContain("email");
    expect(DEFAULT_REDACT_KEYS).toContain("phone");
    expect(DEFAULT_REDACT_KEYS).toContain("from_address");
  });
});
