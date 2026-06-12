import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// V8.15 SLC-913 MT-5 (ISSUE-110): test-sentry ist in Production nicht
// erreichbar (404) und leaked kein Sentry-Konfigurations-State mehr.

vi.mock("@/lib/monitoring/sentry", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  isSentryEnabled: vi.fn().mockReturnValue(false),
}));

const { GET } = await import("./route");
const { captureException, captureMessage } = await import(
  "@/lib/monitoring/sentry"
);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/test-sentry (ISSUE-110: Prod-Gate)", () => {
  it("liefert in Production 404 ohne Sentry-Call (Hilfe-Pfad)", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const res = await GET(new Request("http://localhost/api/test-sentry"));
    expect(res.status).toBe(404);
    expect(vi.mocked(captureException)).not.toHaveBeenCalled();
    expect(vi.mocked(captureMessage)).not.toHaveBeenCalled();
  });

  it("liefert in Production 404 auch fuer ?type=error (kein Error-Trigger)", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const res = await GET(
      new Request("http://localhost/api/test-sentry?type=error"),
    );
    expect(res.status).toBe(404);
    expect(vi.mocked(captureException)).not.toHaveBeenCalled();
  });

  it("triggert ausserhalb Production weiterhin captureException (500)", async () => {
    vi.stubEnv("NODE_ENV", "test");

    const res = await GET(
      new Request("http://localhost/api/test-sentry?type=error"),
    );
    expect(res.status).toBe(500);
    expect(vi.mocked(captureException)).toHaveBeenCalledTimes(1);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty("sentry");
  });

  it("Hilfe-Response ausserhalb Production enthaelt kein sentry-State-Feld", async () => {
    vi.stubEnv("NODE_ENV", "test");

    const res = await GET(new Request("http://localhost/api/test-sentry"));
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty("sentry");
  });
});
