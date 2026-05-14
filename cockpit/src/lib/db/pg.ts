/**
 * Raw Postgres-Connection-Helper fuer Server Actions, die RLS umgehen muessen
 * (z.B. Bulk-Reassign mit SET LOCAL ROLE postgres). Fuer normale RLS-konforme
 * Queries weiter `createClient()` aus `lib/supabase/server.ts` nutzen.
 *
 * Konfiguration via ENV:
 *   POSTGRES_URL   — bevorzugt (Coolify-Standard)
 *   DATABASE_URL   — Fallback
 *
 * Pool-Lifecycle: Single Singleton, ueberlebt Lambda-/Container-Warm-Starts.
 */

import { Pool, type PoolClient } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;

  const connectionString =
    process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? null;

  if (!connectionString) {
    throw new Error(
      "Kein Postgres-Connection-String in POSTGRES_URL oder DATABASE_URL gefunden — bulk-reassign benoetigt direkten DB-Zugriff",
    );
  }

  pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  return pool;
}

/**
 * Holt einen Client aus dem Pool. Caller MUSS `client.release()` rufen
 * (idealerweise im `finally`-Block).
 */
export async function getPgClient(): Promise<PoolClient> {
  return getPool().connect();
}
