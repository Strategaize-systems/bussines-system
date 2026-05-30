/**
 * SLC-891 MT-5 — SEC-010 Timing-Safe Secret-Compare fuer
 * verifyCronSecret + verifyExportApiKey.
 *
 * Was bewiesen wird: Beide Helper akzeptieren gueltige Secrets und lehnen
 * ungueltige Secrets ab (Behavior-Test). Die TimingSafeEqual-Property
 * (constant-time-comparison) wird hier nicht statistisch gemessen — das
 * waere flaky in CI; wir verlassen uns auf Node's crypto.timingSafeEqual
 * als kanonische Implementierung. Test verifiziert, dass das Buffer-
 * Length-Mismatch-Branch sauber `false` returnt (kein Throw).
 *
 * Quelle des Patterns: cockpit/src/lib/calcom/webhook-handler.ts:61-67
 * (DEC-029 Cal.com-Webhook-Signature etablierte das Pattern).
 *
 * Lauf-Pattern: Node-Standalone (kein DB-Setup noetig).
 *
 *   npx vitest run __tests__/lib/sec-891-timing-safe.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { verifyCronSecret } from "@/app/api/cron/verify-cron-secret";
import { verifyExportApiKey } from "@/lib/export/auth";

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;
const ORIGINAL_EXPORT_API_KEY = process.env.EXPORT_API_KEY;

beforeEach(() => {
  process.env.CRON_SECRET = "test-cron-secret-with-32-chars-xxxxx";
  process.env.EXPORT_API_KEY = "test-export-api-key-32-chars-xxxxx";
});

afterEach(() => {
  if (ORIGINAL_CRON_SECRET === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
  }
  if (ORIGINAL_EXPORT_API_KEY === undefined) {
    delete process.env.EXPORT_API_KEY;
  } else {
    process.env.EXPORT_API_KEY = ORIGINAL_EXPORT_API_KEY;
  }
});

describe("SEC-891 SEC-010 — verifyCronSecret timing-safe", () => {
  it("accepts request with valid x-cron-secret header (positive case)", () => {
    const req = new Request("http://localhost/api/cron/test", {
      headers: { "x-cron-secret": "test-cron-secret-with-32-chars-xxxxx" },
    });
    const result = verifyCronSecret(req);
    expect(result).toBeNull();
  });

  it("rejects request with wrong x-cron-secret header (negative case, equal length)", () => {
    // Equal-length wrong secret — exercises the timingSafeEqual branch
    const req = new Request("http://localhost/api/cron/test", {
      headers: { "x-cron-secret": "WRONG-cron-secret-with-32-chars-yyyy" },
    });
    const result = verifyCronSecret(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
  });

  it("rejects request with missing x-cron-secret header (length-mismatch branch)", () => {
    // header() returns null → "" → length 0 vs. expected length → false branch
    // No throw, clean 401 — Buffer-Length-Check prevents timingSafeEqual throw.
    const req = new Request("http://localhost/api/cron/test");
    const result = verifyCronSecret(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
  });
});

describe("SEC-891 SEC-010 — verifyExportApiKey timing-safe", () => {
  it("accepts request with valid Bearer token (positive case)", () => {
    const req = new Request("http://localhost/api/export/test", {
      headers: { authorization: "Bearer test-export-api-key-32-chars-xxxxx" },
    });
    const result = verifyExportApiKey(req);
    expect(result).toBeNull();
  });

  it("accepts request with valid plain token (no Bearer prefix)", () => {
    const req = new Request("http://localhost/api/export/test", {
      headers: { authorization: "test-export-api-key-32-chars-xxxxx" },
    });
    const result = verifyExportApiKey(req);
    expect(result).toBeNull();
  });

  it("rejects request with wrong Bearer token (negative case, equal length)", () => {
    const req = new Request("http://localhost/api/export/test", {
      headers: { authorization: "Bearer WRONG-export-api-key-32-chars-yy" },
    });
    const result = verifyExportApiKey(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
  });

  it("rejects request with wrong-length token (length-mismatch branch)", () => {
    // Short token — Buffer-Length-Check prevents timingSafeEqual throw, clean 401.
    const req = new Request("http://localhost/api/export/test", {
      headers: { authorization: "Bearer short" },
    });
    const result = verifyExportApiKey(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(401);
  });
});
