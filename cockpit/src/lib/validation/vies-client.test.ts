import { describe, it, expect, vi } from "vitest";
import {
  buildViesUrl,
  computeExpiresAt,
  isViesEnabled,
  parseViesResponse,
  lookupVatId,
} from "./vies-client";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("isViesEnabled", () => {
  it("returns true when VIES_ENABLED is unset", () => {
    expect(isViesEnabled({})).toBe(true);
  });

  it("returns true when VIES_ENABLED=true", () => {
    expect(isViesEnabled({ VIES_ENABLED: "true" })).toBe(true);
  });

  it("returns false when VIES_ENABLED=false", () => {
    expect(isViesEnabled({ VIES_ENABLED: "false" })).toBe(false);
  });
});

describe("buildViesUrl", () => {
  it("builds URL with country + number substitution", () => {
    expect(buildViesUrl("NL", "859123456B01")).toBe(
      "https://ec.europa.eu/taxation_customs/vies/rest-api/ms/NL/vat/859123456B01"
    );
  });
});

describe("computeExpiresAt", () => {
  it("returns timestamp 24h after validated_at", () => {
    const validated = new Date("2026-05-08T10:00:00Z");
    const expires = computeExpiresAt(validated);
    expect(expires.toISOString()).toBe("2026-05-09T10:00:00.000Z");
  });
});

describe("parseViesResponse", () => {
  it("parses a valid VIES JSON response", () => {
    const json = {
      isValid: true,
      requestDate: "2026-05-08T10:00:00.000Z",
      name: "Strategaize Transition GmbH",
      address: "Amsterdam",
    };
    const parsed = parseViesResponse(json, "NL", "859123456B01");
    expect(parsed).not.toBeNull();
    expect(parsed?.valid).toBe(true);
    expect(parsed?.name).toBe("Strategaize Transition GmbH");
  });

  it("returns null when isValid is missing", () => {
    expect(parseViesResponse({}, "NL", "X")).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(parseViesResponse(null, "NL", "X")).toBeNull();
    expect(parseViesResponse("invalid", "NL", "X")).toBeNull();
  });
});

/**
 * Minimal Supabase-Mock for cache-pfad tests. Returns a custom builder
 * so we can simulate different cache states.
 */
function makeMockSupabase(opts: {
  cacheData?: Record<string, unknown> | null;
  cacheError?: Error | null;
  upsertSpy?: () => void;
}): SupabaseClient {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: opts.cacheData ?? null,
      error: opts.cacheError ?? null,
    }),
    upsert: vi.fn().mockImplementation(async () => {
      opts.upsertSpy?.();
      return { data: null, error: null };
    }),
  };
  return {
    from: vi.fn().mockReturnValue(builder),
  } as unknown as SupabaseClient;
}

describe("lookupVatId — Format-Invalid", () => {
  it("returns format_only with is_valid=false; no VIES-Call, no cache-write", async () => {
    const fetchSpy = vi.fn();
    const upsertSpy = vi.fn();
    const supabase = makeMockSupabase({ upsertSpy });

    const result = await lookupVatId({
      country: "XX",
      number: "INVALID",
      is_format_valid: false,
      supabase,
      fetcher: fetchSpy as unknown as typeof fetch,
      env: { VIES_ENABLED: "true" },
    });

    expect(result.source).toBe("format_only");
    expect(result.is_valid).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(upsertSpy).not.toHaveBeenCalled();
  });
});

describe("lookupVatId — Cache-Hit", () => {
  it("returns cached entry without VIES-Call when fresh cache exists", async () => {
    const fetchSpy = vi.fn();
    const upsertSpy = vi.fn();
    const cached = {
      is_valid: true,
      source: "vies",
      validated_at: new Date("2026-05-08T08:00:00Z").toISOString(),
      expires_at: new Date("2026-05-09T08:00:00Z").toISOString(),
      vies_response: { countryCode: "NL", vatNumber: "X", valid: true, requestDate: "" },
    };
    const supabase = makeMockSupabase({ cacheData: cached, upsertSpy });

    const result = await lookupVatId({
      country: "NL",
      number: "859123456B01",
      is_format_valid: true,
      supabase,
      fetcher: fetchSpy as unknown as typeof fetch,
    });

    expect(result.source).toBe("vies");
    expect(result.is_valid).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(upsertSpy).not.toHaveBeenCalled();
  });
});

describe("lookupVatId — Cache-Miss + VIES-Success", () => {
  it("calls VIES, upserts cache, returns vies-source", async () => {
    const upsertSpy = vi.fn();
    const supabase = makeMockSupabase({ cacheData: null, upsertSpy });
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isValid: true,
        requestDate: "2026-05-08T10:00:00.000Z",
        name: "Strategaize Transition GmbH",
      }),
    } as Response);

    const result = await lookupVatId({
      country: "NL",
      number: "859123456B01",
      is_format_valid: true,
      supabase,
      fetcher: fetcher as unknown as typeof fetch,
    });

    expect(result.source).toBe("vies");
    expect(result.is_valid).toBe(true);
    expect(result.vies_response?.name).toBe("Strategaize Transition GmbH");
    expect(fetcher).toHaveBeenCalledOnce();
    expect(upsertSpy).toHaveBeenCalledOnce();
  });
});

describe("lookupVatId — Cache-Miss + VIES-Down", () => {
  it("returns vies_unavailable + is_valid=false on network failure", async () => {
    const upsertSpy = vi.fn();
    const supabase = makeMockSupabase({ cacheData: null, upsertSpy });
    const fetcher = vi.fn().mockRejectedValue(new Error("ETIMEDOUT"));

    const result = await lookupVatId({
      country: "NL",
      number: "859123456B01",
      is_format_valid: true,
      supabase,
      fetcher: fetcher as unknown as typeof fetch,
    });

    expect(result.source).toBe("vies_unavailable");
    expect(result.is_valid).toBe(false);
    expect(upsertSpy).toHaveBeenCalledOnce();
  });

  it("returns vies_unavailable on non-200 HTTP status", async () => {
    const upsertSpy = vi.fn();
    const supabase = makeMockSupabase({ cacheData: null, upsertSpy });
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    const result = await lookupVatId({
      country: "NL",
      number: "859123456B01",
      is_format_valid: true,
      supabase,
      fetcher: fetcher as unknown as typeof fetch,
    });

    expect(result.source).toBe("vies_unavailable");
    expect(upsertSpy).toHaveBeenCalledOnce();
  });
});

describe("lookupVatId — VIES_ENABLED=false", () => {
  it("returns format_only with is_valid=true (skip VIES) when ENV opts out", async () => {
    const fetchSpy = vi.fn();
    const upsertSpy = vi.fn();
    const supabase = makeMockSupabase({ upsertSpy });

    const result = await lookupVatId({
      country: "NL",
      number: "859123456B01",
      is_format_valid: true,
      supabase,
      fetcher: fetchSpy as unknown as typeof fetch,
      env: { VIES_ENABLED: "false" },
    });

    expect(result.source).toBe("format_only");
    expect(result.is_valid).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(upsertSpy).not.toHaveBeenCalled();
  });
});
