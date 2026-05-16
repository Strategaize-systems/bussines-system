import { AsyncLocalStorage } from "node:async_hooks";
import { headers } from "next/headers";

/**
 * Read-Only-Context fuer Drilldown-Pattern (SLC-706 + SLC-751).
 *
 * In V7 erlaubt `/team/[user_id]/...` einem Teamlead/Admin den Mein-Tag eines
 * Members im Read-Only-Modus zu betrachten. Mutate-Server-Actions im Subtree
 * muessen blockiert werden — sonst koennte ein Teamlead unbeabsichtigt Daten
 * eines Members aendern.
 *
 * ISSUE-066 closed in V7.5 — assertNotReadOnlyContext reads AsyncLocalStorage
 * (Layer 1) + X-Read-Only-Mode request header (Layer 2) parallel.
 *
 * Layer 1 (Node AsyncLocalStorage, SLC-706):
 *   `runWithReadOnlyContext()` wrappt den Drilldown-Page-Render. `getStore()`
 *   propagiert ueber alle await-Boundaries innerhalb desselben Request-
 *   Handlers. Greift bei Server-Action-Calls die direkt aus dem Drilldown-
 *   Subtree gestartet werden.
 *
 * Layer 2 (X-Read-Only-Mode Request-Header, SLC-751):
 *   Middleware (DEC-210) setzt `X-Read-Only-Mode: 1` auf jeden Drilldown-
 *   Request (`/team/[user_id]/...`). Greift fuer Direct-Server-Action-Calls
 *   aus DevTools — AsyncLocalStorage greift hier nicht, weil Server-Actions
 *   als separater Request-Handler laufen.
 *
 * DEC-189: shared `assertNotReadOnlyContext()` Helper.
 * DEC-210: Middleware-Pfad-Regex + Header-Layer (SLC-751 V7.5).
 */

export interface ReadOnlyContextValue {
  viewerUserId: string;
  targetUserId: string;
}

const storage = new AsyncLocalStorage<ReadOnlyContextValue>();

/**
 * Fuehrt `fn` mit aktivem Read-Only-Context aus. Innerhalb `fn` (inkl. aller
 * `await`-Kette) gibt `getReadOnlyContext()` den uebergebenen Wert zurueck.
 */
export function runWithReadOnlyContext<T>(
  value: ReadOnlyContextValue,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return storage.run(value, fn);
}

/**
 * Liest den aktuellen Read-Only-Context oder `null` wenn nicht aktiv.
 */
export function getReadOnlyContext(): ReadOnlyContextValue | null {
  return storage.getStore() ?? null;
}

/**
 * Wirft `Error` wenn ein Read-Only-Context aktiv ist. In Mutate-Server-Actions
 * als erste Zeile zu verwenden (Konsumenten SLC-704 + SLC-751).
 *
 * Async seit SLC-751: liest zusaetzlich `X-Read-Only-Mode`-Request-Header
 * (Layer 2). Bei Header-Block wird ein Best-Effort-Audit-Insert in
 * `audit_log` mit Action `read_only_context_blocked` ausgefuehrt, dann wird
 * geworfen. Bestehende Callsites rufen bereits `await
 * assertNotReadOnlyContext()` — keine Breaking-Change.
 */
export async function assertNotReadOnlyContext(): Promise<void> {
  // Layer 1: AsyncLocalStorage (bestehender SLC-706-Pfad).
  const ctx = storage.getStore();
  if (ctx) {
    throw new Error(
      `Mutation blocked: read-only context active (viewer=${ctx.viewerUserId}, target=${ctx.targetUserId}). ` +
        `Drilldown-View darf keine Server-Action-Mutation ausloesen.`,
    );
  }

  // Layer 2: X-Read-Only-Mode-Header (SLC-751, ISSUE-066). headers() ist
  // async ab Next.js 15. Bei Fehler in headers() (Tests ohne Request-
  // Context) fallen wir auf "kein Header gesetzt" zurueck.
  let readOnlyHeader: string | null = null;
  try {
    const hdrs = await headers();
    readOnlyHeader = hdrs.get("X-Read-Only-Mode");
  } catch {
    return;
  }

  if (readOnlyHeader === "1") {
    // Best-Effort-Audit-Insert. Fehlschlag blockiert den Throw nicht.
    await tryLogReadOnlyContextBlocked();
    throw new Error(
      `Mutation blocked: read-only context active (X-Read-Only-Mode header set by middleware). ` +
        `Drilldown-View darf keine Server-Action-Mutation ausloesen.`,
    );
  }
}

/**
 * Best-Effort-Audit-Insert in `audit_log` mit Action
 * `read_only_context_blocked`. Lazy-Import der Supabase-Clients erlaubt
 * Test-Isolation (vi.mock auf next/headers fuer Layer-2-Branch ohne Supabase-
 * Bootstrap). Fehler landen in console.warn und werden nicht propagiert.
 */
async function tryLogReadOnlyContextBlocked(): Promise<void> {
  try {
    const hdrs = await headers();
    const path =
      hdrs.get("x-pathname") ??
      hdrs.get("x-invoke-path") ??
      hdrs.get("referer") ??
      "unknown";

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { createClient } = await import("@/lib/supabase/server");

    const serverClient = await createClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    if (!user) {
      // Kein authentifizierter User → kein actor_id → kein Audit-Insert
      // (audit_log.actor_id ist NOT NULL).
      return;
    }

    const admin = createAdminClient();
    const { error } = await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "read_only_context_blocked",
      entity_type: "read_only_context",
      entity_id: user.id,
      context: JSON.stringify({
        path,
        blocked_via: "header",
      }),
    });

    if (error) {
      console.warn(
        `read_only_context_blocked audit insert failed (actor=${user.id}, path=${path}): ${error.message}`,
      );
    }
  } catch (e) {
    console.warn(
      `read_only_context_blocked audit insert threw: ${(e as Error).message}`,
    );
  }
}
