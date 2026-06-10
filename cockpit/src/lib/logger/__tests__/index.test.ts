// BS V8.12 SLC-907 MT-2 — Tests fuer logSafe (AC-907-4).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logSafe, logSafeWith } from "@/lib/logger";

describe("logSafe", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AC-907-4: ruft console.info mit redactetem Objekt-Argument", () => {
    logSafe("info", "msg", { password: "x" });
    expect(console.info).toHaveBeenCalledWith("msg", { password: "[REDACTED]" });
  });

  it("mappt level 'warn' auf console.warn", () => {
    logSafe("warn", "careful", { token: "t" });
    expect(console.warn).toHaveBeenCalledWith("careful", { token: "[REDACTED]" });
  });

  it("mappt level 'error' auf console.error", () => {
    logSafe("error", "boom", { secret: "s" });
    expect(console.error).toHaveBeenCalledWith("boom", { secret: "[REDACTED]" });
  });

  it("mappt level 'debug' auf console.debug", () => {
    logSafe("debug", "trace");
    expect(console.debug).toHaveBeenCalledWith("trace");
  });

  it("reicht primitive Argumente unveraendert durch", () => {
    logSafe("info", "count", 42, true);
    expect(console.info).toHaveBeenCalledWith("count", 42, true);
  });

  it("ist sicher bei leerem args[]", () => {
    expect(() => logSafe("info")).not.toThrow();
    expect(console.info).toHaveBeenCalledWith();
  });

  it("redactet nested Objekte in den Argumenten", () => {
    logSafe("info", { user: { name: "Max", jwt: "j" } });
    expect(console.info).toHaveBeenCalledWith({
      user: { name: "Max", jwt: "[REDACTED]" },
    });
  });

  it("logSafeWith redactet zusaetzliche Keys via extraKeys", () => {
    logSafeWith("info", { extraKeys: ["customerName"] }, "ctx", {
      customerName: "Acme",
      keep: "v",
    });
    expect(console.info).toHaveBeenCalledWith("ctx", {
      customerName: "[REDACTED]",
      keep: "v",
    });
  });
});
