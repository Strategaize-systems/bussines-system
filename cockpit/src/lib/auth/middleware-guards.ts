import type { Role } from "./types";

/**
 * V7 Middleware-Route-Guards (DEC-191).
 *
 * Pure-Function-Layer: nimmt Pathname + Rolle, returnt entweder `null`
 * (Pass) oder einen Redirect-Pfad (Block). Wird im supabase-middleware.ts
 * direkt nach dem Auth-Check ausgewertet.
 *
 * Defense-in-Depth Strategy:
 * 1. middleware blockt vor Server-Component-Render via Pattern-Match
 * 2. Server-Component-Layouts pruefen zusaetzlich via `assertRole()` (kommt
 *    in SLC-703/705 per Page)
 * 3. Server Actions pruefen via `assertRole()` als erste Zeile (SLC-704)
 *
 * Pattern-Liste muss SECTION-Werten in sidebar-config korrespondieren.
 */

export interface RouteGuard {
  pattern: RegExp;
  allowed: readonly Role[];
}

export const ROUTE_GUARDS: readonly RouteGuard[] = [
  // ANALYSE — admin + teamlead
  { pattern: /^\/dashboard(\/.*)?$/, allowed: ["admin", "teamlead"] },
  { pattern: /^\/cockpit(\/.*)?$/, allowed: ["admin", "teamlead"] },

  // TEAM — admin + teamlead (V7-NEU, Stub-Routes in SLC-702)
  { pattern: /^\/team(\/.*)?$/, allowed: ["admin", "teamlead"] },
  { pattern: /^\/settings\/team(\/.*)?$/, allowed: ["admin", "teamlead"] },

  // Workflow / Automation — admin only (Workflow-Editor)
  { pattern: /^\/settings\/automation(\/.*)?$/, allowed: ["admin", "teamlead"] },
  { pattern: /^\/settings\/workflow(\/.*)?$/, allowed: ["admin"] },
  { pattern: /^\/workflow(\/.*)?$/, allowed: ["admin", "teamlead"] },

  // Campaigns — admin + teamlead
  { pattern: /^\/campaigns(\/.*)?$/, allowed: ["admin", "teamlead"] },

  // Managerial-Listen — admin + teamlead
  { pattern: /^\/handoffs(\/.*)?$/, allowed: ["admin", "teamlead"] },
  { pattern: /^\/referrals(\/.*)?$/, allowed: ["admin", "teamlead"] },
  { pattern: /^\/cadences(\/.*)?$/, allowed: ["admin", "teamlead"] },
  { pattern: /^\/settings\/goals(\/.*)?$/, allowed: ["admin", "teamlead"] },

  // Admin-only Tools
  { pattern: /^\/settings\/products(\/.*)?$/, allowed: ["admin"] },
  { pattern: /^\/audit-log(\/.*)?$/, allowed: ["admin"] },
];

export const ROLE_REDIRECT_TARGET = "/mein-tag";

/**
 * Pure: returnt einen Redirect-Pfad wenn die Rolle die Route nicht sehen
 * darf, sonst `null`.
 */
export function evaluateRouteGuard(
  pathname: string,
  role: Role,
): string | null {
  for (const guard of ROUTE_GUARDS) {
    if (guard.pattern.test(pathname)) {
      if (!guard.allowed.includes(role)) {
        return ROLE_REDIRECT_TARGET;
      }
      return null;
    }
  }
  return null;
}
