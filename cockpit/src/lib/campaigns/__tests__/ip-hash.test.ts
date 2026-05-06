// V6.2 SLC-625 — IP-Hashing Tests

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { hashIp, extractClientIp } from "../ip-hash";

const ENV_KEY = "IP_HASH_SALT";
let originalSalt: string | undefined;

describe("hashIp", () => {
  beforeEach(() => {
    originalSalt = process.env[ENV_KEY];
    process.env[ENV_KEY] = "test-salt-fixed";
  });

  afterEach(() => {
    if (originalSalt === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = originalSalt;
  });

  it("returns null for empty / null input", () => {
    expect(hashIp(null)).toBeNull();
    expect(hashIp(undefined)).toBeNull();
    expect(hashIp("")).toBeNull();
  });

  it("returns a 64-char hex SHA-256", () => {
    const h = hashIp("203.0.113.42");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic with the same salt", () => {
    expect(hashIp("203.0.113.42")).toBe(hashIp("203.0.113.42"));
  });

  it("changes when salt rotates", () => {
    const h1 = hashIp("203.0.113.42");
    process.env[ENV_KEY] = "different-salt";
    const h2 = hashIp("203.0.113.42");
    expect(h1).not.toBe(h2);
  });

  it("never echoes the cleartext IP", () => {
    const h = hashIp("203.0.113.42");
    expect(h).not.toContain("203.0.113.42");
  });
});

describe("extractClientIp", () => {
  it("returns x-forwarded-for first IP if present", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.42, 10.0.0.1" });
    expect(extractClientIp(h)).toBe("203.0.113.42");
  });

  it("falls back to x-real-ip", () => {
    const h = new Headers({ "x-real-ip": "203.0.113.42" });
    expect(extractClientIp(h)).toBe("203.0.113.42");
  });

  it("trims whitespace", () => {
    const h = new Headers({ "x-forwarded-for": "  203.0.113.42  ,  10.0.0.1  " });
    expect(extractClientIp(h)).toBe("203.0.113.42");
  });

  it("returns null when both headers absent", () => {
    expect(extractClientIp(new Headers())).toBeNull();
  });
});
