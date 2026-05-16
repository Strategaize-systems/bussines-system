/**
 * SLC-751 DEC-210 — Pure-Function fuer Read-Only-Drilldown-Pfad-Matching.
 *
 * Matched alle `/team/[user_id]/...`-Subroutes (mit nicht-leerem Subpfad).
 * Wird in der Middleware-Pipeline benutzt um `X-Read-Only-Mode: 1`-Request-
 * Header zu setzen, sodass `assertNotReadOnlyContext()` (Layer 2) direct-
 * Server-Action-Calls aus DevTools blockieren kann.
 *
 * Match-Tabelle (DEC-210):
 *   /team/abc/pipeline          → true
 *   /team/abc/aufgaben/new      → true
 *   /team/abc/mein-tag          → true
 *   /team/                      → false (kein Sub-Pfad)
 *   /team                       → false
 *   /api/cron/automation-runner → false
 *   /api/health                 → false
 *   /settings/team              → false
 *   /login                      → false
 *
 * Separate Datei (statt im middleware.ts-Root), um Circular-Import zwischen
 * `src/middleware.ts` und `src/lib/supabase/middleware.ts` zu vermeiden.
 */
export function pathMatchesReadOnlyDrilldown(pathname: string): boolean {
  return /^\/team\/[^/]+\//.test(pathname);
}
