import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Read-Only-Context fuer Drilldown-Pattern (SLC-706).
 *
 * In V7 erlaubt `/team/[user_id]/...` einem Teamlead/Admin den Mein-Tag eines
 * Members im Read-Only-Modus zu betrachten. Mutate-Server-Actions im Subtree
 * muessen blockiert werden — sonst koennte ein Teamlead unbeabsichtigt Daten
 * eines Members aendern.
 *
 * SLC-702 stellt nur die API-Surface bereit. Konsumenten kommen in SLC-704
 * (Mutate-Action-Guards) und SLC-706 (Drilldown-Page wrapping).
 *
 * Implementation: Node.js AsyncLocalStorage propagiert den Wert ueber alle
 * `await`-Boundaries innerhalb desselben Request-Handlers. Server Actions
 * werden als separater Request-Handler ausgefuehrt — fuer den Block-Pfad
 * dort muss SLC-704 zusaetzlich auf Pfad-/Header-Hinweise zurueckgreifen
 * (z.B. Referer oder Server-Action-Wrapper). Das wird in SLC-704 entschieden.
 *
 * DEC-189: shared `assertNotReadOnlyContext()` Helper.
 */

export interface ReadOnlyContextValue {
  viewerUserId: string;
  targetUserId: string;
}

const storage = new AsyncLocalStorage<ReadOnlyContextValue>();

/**
 * Fuehrt `fn` mit aktivem Read-Only-Context aus. Innerhalb `fn` (inkl. aller
 * `await`-Kette) gibt `getReadOnlyContext()` den uebergebenen Wert zurueck.
 *
 * Vorgesehene Verwendung in SLC-706:
 *   await runWithReadOnlyContext({ viewerUserId, targetUserId }, async () => {
 *     // Server-Component-Render des Drilldown-Subtrees
 *   });
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
 * als erste Zeile zu verwenden (Konsument SLC-704).
 */
export function assertNotReadOnlyContext(): void {
  const ctx = storage.getStore();
  if (ctx) {
    throw new Error(
      `Mutation blocked: read-only context active (viewer=${ctx.viewerUserId}, target=${ctx.targetUserId}). ` +
        `Drilldown-View darf keine Server-Action-Mutation ausloesen.`,
    );
  }
}
