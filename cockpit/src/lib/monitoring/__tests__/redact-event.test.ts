// BS V8.12 SLC-911 MT-3 — Tests fuer beforeSend-Redact-Helper (AC-911-3, AC-911-7).

import { describe, it, expect } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { redactSentryEvent } from "@/lib/monitoring/redact-event";

describe("redactSentryEvent", () => {
  it("AC-911-3: redactet Secret-Keys in event.extra", () => {
    const event = {
      extra: { password: "geheim", note: "ok", token: "t" },
    } as unknown as ErrorEvent;
    const out = redactSentryEvent(event);
    expect(out.extra).toEqual({
      password: "[REDACTED]",
      note: "ok",
      token: "[REDACTED]",
    });
  });

  it("AC-911-3: redactet event.user.email (PII)", () => {
    const event = {
      user: { id: "u1", email: "kunde@example.de", username: "kunde" },
    } as unknown as ErrorEvent;
    const out = redactSentryEvent(event);
    expect(out.user).toEqual({
      id: "u1",
      email: "[REDACTED]",
      username: "kunde",
    });
  });

  it("AC-911-3: redactet event.tags und event.contexts deep", () => {
    const event = {
      tags: { source: "test-endpoint", secret: "s" },
      contexts: { custom: { jwt: "j", build: "v8.12" } },
    } as unknown as ErrorEvent;
    const out = redactSentryEvent(event);
    expect(out.tags).toEqual({ source: "test-endpoint", secret: "[REDACTED]" });
    expect(out.contexts).toEqual({ custom: { jwt: "[REDACTED]", build: "v8.12" } });
  });

  it("ist no-op bei leerem Event (keine Felder gesetzt)", () => {
    const event = {} as unknown as ErrorEvent;
    const out = redactSentryEvent(event);
    expect(out).toEqual({});
  });
});
