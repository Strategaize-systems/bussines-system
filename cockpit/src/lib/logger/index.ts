// BS V8.12 SLC-907 MT-2 — Top-Level Logger-Wrapper `logSafe()` (BL-503, Phase 2.1).
// Export-Pattern per DEC-286: explicit Caller-Site-Aenderung (kein console.* Drop-In).
// grep `logSafe(` zeigt alle migrierten Stellen — Migration ist nachvollziehbar.

import { redactSecrets, type RedactOptions } from "@/lib/logger/redact";

export { redactSecrets, DEFAULT_REDACT_KEYS } from "@/lib/logger/redact";
export type { RedactOptions } from "@/lib/logger/redact";

/** Unterstuetzte Log-Level — 1:1 auf die `console`-Methoden gemappt. */
export type LogLevel = "log" | "info" | "warn" | "error" | "debug";

/**
 * Schreibt nach `console[level]`, wobei jedes Objekt-Argument vorher durch
 * `redactSecrets` laeuft (sensible Keys → `[REDACTED]`). Primitive Argumente
 * (string, number, ...) werden unveraendert weitergereicht.
 *
 * @example
 *   logSafe("info", "user login", { email: "a@b.de", password: "x" });
 *   // -> console.info("user login", { email: "[REDACTED]", password: "[REDACTED]" })
 *
 * @param level   console-Methode (`log`/`info`/`warn`/`error`/`debug`).
 * @param args    beliebige Log-Argumente; Objekte werden redactet.
 */
export function logSafe(level: LogLevel, ...args: unknown[]): void {
  const sink =
    typeof console[level] === "function" ? console[level] : console.log;
  const safeArgs = args.map((arg) =>
    arg !== null && typeof arg === "object" ? redactSecrets(arg) : arg,
  );
  sink(...safeArgs);
}

/**
 * Variante von `logSafe` mit zusaetzlichen Redact-Optionen (extraKeys /
 * replacementValue) — fuer Caller, die domain-spezifische Keys redacten wollen.
 */
export function logSafeWith(
  level: LogLevel,
  opts: RedactOptions,
  ...args: unknown[]
): void {
  const sink =
    typeof console[level] === "function" ? console[level] : console.log;
  const safeArgs = args.map((arg) =>
    arg !== null && typeof arg === "object" ? redactSecrets(arg, opts) : arg,
  );
  sink(...safeArgs);
}
