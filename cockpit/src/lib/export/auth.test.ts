// SLC-665 MT-7 — Auth-Helper-Tests (Bearer-Token-Pattern, FEAT-622-Reuse).
// Validiert die geteilte verifyExportApiKey-Funktion fuer den neuen
// /api/winloss/[deal_id]-Endpoint.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { verifyExportApiKey } from "./auth";

describe("verifyExportApiKey", () => {
  const ORIG_KEY = process.env.EXPORT_API_KEY;

  beforeEach(() => {
    process.env.EXPORT_API_KEY = "test-secret-1234";
  });
  afterEach(() => {
    if (ORIG_KEY === undefined) delete process.env.EXPORT_API_KEY;
    else process.env.EXPORT_API_KEY = ORIG_KEY;
  });

  function reqWith(headers: Record<string, string>): Request {
    return new Request("https://example.test/", { headers });
  }

  it("returns null on valid Bearer token", () => {
    const r = verifyExportApiKey(
      reqWith({ authorization: "Bearer test-secret-1234" })
    );
    expect(r).toBeNull();
  });

  it("returns null on plain token without Bearer prefix", () => {
    const r = verifyExportApiKey(
      reqWith({ authorization: "test-secret-1234" })
    );
    expect(r).toBeNull();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const r = verifyExportApiKey(reqWith({}));
    expect(r).not.toBeNull();
    expect(r!.status).toBe(401);
  });

  it("returns 401 when token does not match", async () => {
    const r = verifyExportApiKey(
      reqWith({ authorization: "Bearer wrong-key" })
    );
    expect(r).not.toBeNull();
    expect(r!.status).toBe(401);
  });

  it("returns 500 when EXPORT_API_KEY is not configured", async () => {
    delete process.env.EXPORT_API_KEY;
    const r = verifyExportApiKey(
      reqWith({ authorization: "Bearer any" })
    );
    expect(r).not.toBeNull();
    expect(r!.status).toBe(500);
  });
});
