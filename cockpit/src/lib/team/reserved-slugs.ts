/**
 * Reserve-Slugs fuer V8.4 Tenant-Customer-Public-URLs `/p/[slug]/...`.
 *
 * Pattern aus strategaize-onboarding-plattform/src/lib/partner/reserved-slugs.ts.
 * (Memory: reference_partner_slug_pattern.md / Rule: strategaize-pattern-reuse.md.)
 *
 * Diese System-Slugs duerfen nie als Team-Slug verwendet werden. Sie werden vom
 * Slug-Generator (`generateUniqueSlug`) wie eine Kollision behandelt (→ Suffix
 * `-2`) und vom Public-Resolve-Endpoint (`GET /api/public/tenant/[slug]`, SLC-843)
 * als 404 returniert, ohne dass eine DB-Query erfolgt.
 *
 * Defense-in-Depth-Plan:
 * - V8.4: Application-Layer-Check (hier) + DB-CHECK-Constraint aus MIG-038
 *   `teams_slug_format_check`.
 * - V8.5+: bei `RESERVED_SLUGS`-Erweiterung muss MIG-038-Phase-1-Constraint
 *   per Folge-Migration ergaenzt werden (sonst kann SQL-INSERT einen neuen
 *   Reserve-Slug umgehen).
 *
 * Liste enthaelt: Strategaize-Common-Reserved + BS-App-Top-Level-Pfade aus
 * `cockpit/src/app/`. Bei neuen Top-Level-Pfaden hier ergaenzen.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // Strategaize-Common (cross-Repo)
  "admin",
  "api",
  "public",
  "p",
  "partner",
  "strategaize",
  "auth",
  "assets",
  "_next",
  "favicon.ico",

  // BS-App-Top-Level — cockpit/src/app root
  "actions",
  "consent",
  "datenschutz",
  "impressum",
  "r",
  "login",

  // BS-App-Top-Level — cockpit/src/app/(app)
  "audit-log",
  "aufgaben",
  "cadences",
  "calls",
  "campaigns",
  "companies",
  "contacts",
  "dashboard",
  "deals",
  "emails",
  "fit-assessment",
  "focus",
  "handoffs",
  "help",
  "kalender",
  "calendar",
  "meetings",
  "mein-tag",
  "multiplikatoren",
  "pipeline",
  "proposals",
  "referrals",
  "settings",
  "team",
  "termine",
]);

/**
 * Liefert `true`, wenn `slug` (case-insensitive) auf der Reserve-Liste steht.
 *
 * Reuse-Hinweis: `RESERVED_SLUGS` ist case-sensitive im Set, daher `lower()`
 * vor dem Lookup. Caller muessen nicht selbst lowercasen.
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
