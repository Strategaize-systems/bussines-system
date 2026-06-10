// BS V8.12 SLC-907 MT-1 — Logger-Redaction Pure-Function (BL-503, Phase 2.1).
// Strategaize Cross-Repo-Origin-Pattern (per RPT-608 Pattern-Reuse-Audit, 0% reuse).
// Wird Reuse-Quelle fuer OP V9.x+ / IS V4.x+ / immoscheckheft V3.x+ und
// fuer den SLC-911 Sentry-beforeSend-Hook (Event-Payload-Redact).
//
// Default-Keys-Liste per DEC-280: Security-Core (10) + PII-Minimal (2) = 12 Keys.
// Export-Pattern per DEC-286: pure `redactSecrets(obj, opts?)` als Named Export.

/**
 * Default-Keys, deren Werte in geloggten Objekten durch `[REDACTED]` ersetzt
 * werden. Security-Core (10) deckt die gefaehrlichsten Log-Leaks, PII-Minimal (2)
 * deckt DSGVO-Risk in Coolify-Container-Logs. Erweiterbar via `opts.extraKeys`.
 */
export const DEFAULT_REDACT_KEYS = [
  // Security-Core (10)
  "password",
  "token",
  "secret",
  "api_key",
  "authorization",
  "cookie",
  "session",
  "jwt",
  "refresh_token",
  "access_token",
  // PII-Minimal (2)
  "email",
  "phone",
] as const;

export interface RedactOptions {
  /** Zusaetzliche Keys, die ueber DEFAULT_REDACT_KEYS hinaus redactet werden. */
  extraKeys?: string[];
  /** Ersatzwert fuer redactete Felder. Default `[REDACTED]`. */
  replacementValue?: string;
}

/** Schutz gegen unbegrenzte Rekursion (z.B. tiefe Next.js-Request-Objekte). */
const MAX_DEPTH = 10;

/**
 * Erzeugt eine redactete TIEFE KOPIE von `obj`. Mutiert das Original nicht.
 *
 * - Key-basiert: Werte, deren Key (case-insensitive) in der Redact-Liste steht,
 *   werden durch `replacementValue` ersetzt — unabhaengig vom Wert-Typ.
 * - Deep-recursive ueber Objekte und Arrays.
 * - Zirkulaere Referenzen werden via WeakSet erkannt und durch `[Circular]`
 *   ersetzt (kein Infinite-Loop, Ergebnis ist azyklisch und JSON-serialisierbar).
 * - Ab `MAX_DEPTH` wird der Wert unveraendert zurueckgegeben (Tiefen-Guard).
 *
 * Primitive (string, number, boolean, null, undefined, bigint, symbol) werden
 * unveraendert durchgereicht — die Redaction ist key-basiert, nicht wert-basiert.
 */
export function redactSecrets<T>(obj: T, opts?: RedactOptions): T {
  const redactKeys = new Set(
    [...DEFAULT_REDACT_KEYS, ...(opts?.extraKeys ?? [])].map((k) =>
      k.toLowerCase(),
    ),
  );
  const replacement = opts?.replacementValue ?? "[REDACTED]";
  const seen = new WeakSet<object>();

  function walk(value: unknown, depth: number): unknown {
    if (value === null || typeof value !== "object") {
      return value;
    }
    if (depth >= MAX_DEPTH) {
      return value;
    }
    if (seen.has(value as object)) {
      return "[Circular]";
    }
    seen.add(value as object);

    if (Array.isArray(value)) {
      return value.map((item) => walk(item, depth + 1));
    }

    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (redactKeys.has(key.toLowerCase())) {
        out[key] = replacement;
      } else {
        out[key] = walk(val, depth + 1);
      }
    }
    return out;
  }

  return walk(obj, 0) as T;
}
