// BS V8.12 SLC-911 MT-2 — Tests fuer Sentry-Capture-Wrapper (AC-911-7).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import {
  captureException,
  captureMessage,
  isSentryEnabled,
} from "@/lib/monitoring/sentry";

describe("monitoring wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("captureException mappt Context auf tags/user/extra", () => {
    captureException(new Error("boom"), {
      source: "global-error-boundary",
      userId: "u1",
      metadata: { digest: "abc" },
    });
    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { source: "global-error-boundary" },
      user: { id: "u1" },
      extra: { digest: "abc" },
    });
  });

  it("captureException wrappt Nicht-Error-Werte in ein Error-Objekt", () => {
    captureException("string failure");
    const firstArg = vi.mocked(Sentry.captureException).mock.calls[0][0];
    expect(firstArg).toBeInstanceOf(Error);
    expect((firstArg as Error).message).toBe("string failure");
  });

  it("captureMessage nutzt Default-Level 'info' ohne Context", () => {
    captureMessage("hallo");
    expect(Sentry.captureMessage).toHaveBeenCalledWith("hallo", {
      level: "info",
    });
  });

  it("captureMessage uebergibt explizites Level + Context-Mapping", () => {
    captureMessage("warnung", { level: "warning", source: "test-endpoint" });
    expect(Sentry.captureMessage).toHaveBeenCalledWith("warnung", {
      tags: { source: "test-endpoint" },
      level: "warning",
    });
  });

  it("isSentryEnabled spiegelt SENTRY_DSN-Praesenz", () => {
    vi.stubEnv("SENTRY_DSN", "");
    expect(isSentryEnabled()).toBe(false);
    vi.stubEnv("SENTRY_DSN", "https://x@o1.ingest.de.sentry.io/2");
    expect(isSentryEnabled()).toBe(true);
  });
});
