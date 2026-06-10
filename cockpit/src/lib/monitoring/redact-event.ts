// BS V8.12 SLC-911 MT-3 — Sentry beforeSend-Redact-Helper (BL-514, FEAT-923).
//
// Laeuft als beforeSend-Hook in allen 3 Sentry-Configs (server/client/edge) und
// redactet sensible Felder eines Sentry-Events, bevor es Frankfurt verlaesst:
//   event.extra     — frei-form Diagnose-Daten (kann Secret/PII enthalten)
//   event.contexts  — strukturierte Kontext-Blocks
//   event.tags      — kategorische Tags
//   event.user      — User-Context (email/phone via redactSecrets-Default-Keys)
//
// Nutzt `redactSecrets()` aus SLC-907 (DEC-280 12 Default-Keys). Damit ist die
// Redaction-Logik EINE zentrale Quelle (Logger + Sentry teilen sie) — kein
// zweites Key-Set, das auseinanderdriftet.
//
// AC-911-3 (event.extra/contexts/tags/user redacted) + R-911-2 (DSGVO).

import type { ErrorEvent } from "@sentry/nextjs";
import { redactSecrets } from "@/lib/logger";

/**
 * beforeSend-Hook: gibt eine redactete Kopie der sensiblen Event-Felder zurueck.
 * Nicht-destruktiv pro Feld (redactSecrets liefert Deep-Copies). Felder, die der
 * Event nicht hat, werden uebersprungen (no-op bei leerem Event). Der optionale
 * `hint`-Parameter von beforeSend wird nicht benoetigt und daher weggelassen.
 */
export function redactSentryEvent(event: ErrorEvent): ErrorEvent {
  if (event.extra) {
    event.extra = redactSecrets(event.extra);
  }
  if (event.contexts) {
    event.contexts = redactSecrets(event.contexts);
  }
  if (event.tags) {
    event.tags = redactSecrets(event.tags);
  }
  if (event.user) {
    // redactSecrets ersetzt email/phone (PII-Minimal-Keys) durch [REDACTED].
    event.user = redactSecrets(event.user);
  }
  return event;
}
