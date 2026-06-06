/**
 * SLC-905 MT-4 — V8.11 Klasse-D RLS-Matrix: knowledge_chunks (1 Tabelle, 21 Tests).
 *
 * Matrix-Struktur:
 *   - 12 Tests: 3 Rollen (admin/teamlead/member-1) × 4 Ops (SELECT/INSERT/UPDATE/DELETE)
 *   -  4 Tests: service_role × 4 Ops (alle PASS — BYPASSRLS)
 *   -  2 Tests: search_knowledge_chunks-RPC (User-Session-Filter + service_role-Bypass)
 *   -  3 Tests: Schema-Audit (Spalten + Indexe + Function-Body-Filter)
 *   = 21 Tests gesamt
 *
 * Pattern-Quelle: cockpit/__tests__/rls/v8-11-slc-904-rls-matrix.test.ts
 * Klasse-D-Drift vs Klasse E (per Slice-Spec L100-124):
 *   - SELECT: can_see_owner(owner_user_id) — admin sieht alle, member sieht own, teamlead sieht team
 *   - INSERT: WITH CHECK (false) — service_role-only (via Indexer)
 *   - UPDATE: USING (false) WITH CHECK (false) — Mutate-Blocking auch fuer Admin via User-Session
 *   - DELETE: USING (false) — Reindex via service_role-Skript
 *   - search_knowledge_chunks-Function: Body-Filter (auth.uid() IS NULL OR can_see_owner(...))
 *                                       → User-Session sieht own/team, service_role-Bypass aktiv
 *
 * "Denied" bedeutet:
 *   - SELECT:    0 Rows zurueck (RLS filtert, kein Error)
 *   - INSERT:    Postgres-Error 'row-level security policy' (SAVEPOINT-Pattern)
 *   - UPDATE:    0 affected Rows (RLS USING filtert)
 *   - DELETE:    0 affected Rows (RLS USING filtert)
 *
 * Pre-Apply Done-Gate: 1 Row (knowledge_chunks).
 * Post-MIG-049 Done-Gate: 0 Rows (Q-V8.11-B 100% Coverage).
 *
 * Voraussetzung: MIG-049 applied, V7-Helper can_see_owner LIVE, service_role mit GRANTs (MIG-042).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

type Role = "admin" | "teamlead" | "member1";
type Op = "SELECT" | "INSERT" | "UPDATE" | "DELETE";

const TEST_TEAMLEAD_ID = "00000000-0000-0000-0000-000000000078";
const TEST_MEMBER_1    = "00000000-0000-0000-0000-000000000081";
const TEST_TEAM_ID     = "00000000-0000-0000-0000-000000000077"; // member-1 + teamlead share

// Marker fuer Bootstrap-Fixtures, erkennbar fuer Cleanup
const BOOTSTRAP_MARKER = "SLC905_BOOTSTRAP";
const SOURCE_TYPE_MEMBER1 = "slc905_test_member1";
const SOURCE_TYPE_ADMIN   = "slc905_test_admin";
const SOURCE_TYPE_NULL    = "slc905_test_null";
const SOURCE_TYPE_INSERT  = "slc905_test_insert";

// Pre-existing 1024-dim NULL-Vector als Test-Embedding (alle 0en).
// Reicht fuer RLS-/Schema-Tests; HNSW-Similarity-Reihenfolge nicht relevant.
const ZERO_VECTOR = `[${Array(1024).fill(0).join(",")}]`;

// IDs der Bootstrap-Rows (gesetzt in beforeAll)
let chunkMemberId: string;
let chunkAdminId: string;
let chunkNullId: string;
let realAdminId: string;
let realAdminTeamId: string;

let client: Client;

async function bootstrapFixtures(): Promise<void> {
  // Cleanup vorheriger Test-Runs (idempotent) - via embedding_model-Marker
  await client.query(`DELETE FROM knowledge_chunks WHERE embedding_model = $1`, [BOOTSTRAP_MARKER]);

  // Row 1: owner=TEST_MEMBER_1, team=TEST_TEAM_ID
  const memberInsert = await client.query<{ id: string }>(
    `INSERT INTO knowledge_chunks
       (source_type, source_id, chunk_index, chunk_text, embedding,
        embedding_model, owner_user_id, team_id, status, metadata)
     VALUES ($1, gen_random_uuid(), 0, 'member-1-chunk-text', $2::vector,
             $3, $4, $5, 'active', $6::jsonb)
     RETURNING id`,
    [SOURCE_TYPE_MEMBER1, ZERO_VECTOR, BOOTSTRAP_MARKER, TEST_MEMBER_1, TEST_TEAM_ID,
     JSON.stringify({ marker: "member-1-own", deal_id: "test-deal-1" })],
  );
  chunkMemberId = memberInsert.rows[0].id;

  // Row 2: owner=realAdmin, team=realAdminTeamId
  const adminInsert = await client.query<{ id: string }>(
    `INSERT INTO knowledge_chunks
       (source_type, source_id, chunk_index, chunk_text, embedding,
        embedding_model, owner_user_id, team_id, status, metadata)
     VALUES ($1, gen_random_uuid(), 0, 'admin-chunk-text', $2::vector,
             $3, $4, $5, 'active', $6::jsonb)
     RETURNING id`,
    [SOURCE_TYPE_ADMIN, ZERO_VECTOR, BOOTSTRAP_MARKER, realAdminId, realAdminTeamId,
     JSON.stringify({ marker: "admin-only" })],
  );
  chunkAdminId = adminInsert.rows[0].id;

  // Row 3: owner=NULL (Edge: admin sees, andere nicht)
  const nullInsert = await client.query<{ id: string }>(
    `INSERT INTO knowledge_chunks
       (source_type, source_id, chunk_index, chunk_text, embedding,
        embedding_model, owner_user_id, team_id, status, metadata)
     VALUES ($1, gen_random_uuid(), 0, 'null-owner-chunk-text', $2::vector,
             $3, NULL, NULL, 'active', $4::jsonb)
     RETURNING id`,
    [SOURCE_TYPE_NULL, ZERO_VECTOR, BOOTSTRAP_MARKER,
     JSON.stringify({ marker: "null-owner-orphan" })],
  );
  chunkNullId = nullInsert.rows[0].id;
}

async function cleanupFixtures(): Promise<void> {
  await client.query(`DELETE FROM knowledge_chunks WHERE embedding_model = $1`, [BOOTSTRAP_MARKER]);
}

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL nicht gesetzt");
  client = new Client({ connectionString: url });
  await client.connect();

  // realAdmin = anderer Admin als die Test-User. Pflicht: NICHT TEST_TEAMLEAD/MEMBER_1.
  const adminRows = await client.query<{ id: string; team_id: string }>(
    `SELECT id, team_id FROM profiles WHERE role = 'admin' AND id NOT IN ($1, $2)
       ORDER BY created_at ASC LIMIT 1`,
    [TEST_TEAMLEAD_ID, TEST_MEMBER_1],
  );
  if (adminRows.rows.length === 0) {
    throw new Error("Kein admin-Profile vorhanden — V7-Backfill fehlt?");
  }
  realAdminId = adminRows.rows[0].id;
  realAdminTeamId = adminRows.rows[0].team_id;

  await bootstrapFixtures();
});

afterAll(async () => {
  try {
    await cleanupFixtures();
  } finally {
    if (client) await client.end();
  }
});

function userIdFor(role: Role): string {
  switch (role) {
    case "admin":    return realAdminId;
    case "teamlead": return TEST_TEAMLEAD_ID;
    case "member1":  return TEST_MEMBER_1;
  }
}

/**
 * Klasse-D-Expectations:
 *   admin SELECT    → 3 Bootstrap-Rows (is_admin via can_see_owner)
 *   admin INSERT    → denied (WITH CHECK false)
 *   admin UPDATE    → denied (USING false, auch Admin via User-Session)
 *   admin DELETE    → denied (USING false)
 *   teamlead SELECT → sieht member-1 chunk (same team via can_see_owner teamlead-branch)
 *                       NICHT admin chunk (other team), NICHT NULL chunk (kein admin)
 *                       → 1 Row
 *   teamlead INSERT/UPDATE/DELETE → denied
 *   member1 SELECT  → sieht own chunk (auth.uid()=member-1 → target_owner=auth.uid())
 *                       → 1 Row
 *   member1 INSERT/UPDATE/DELETE → denied
 */
interface MatrixCase {
  role: Role;
  op: Op;
  expectedAllowed: boolean;
  minRowsIfAllowed?: number;
  desc: string;
}

const MATRIX: MatrixCase[] = [
  // ---- admin (sieht alle 3, mutiert nichts via User-Session) ----
  { role: "admin",    op: "SELECT", expectedAllowed: true,  minRowsIfAllowed: 3, desc: "admin sieht alle 3 Bootstrap-Rows (is_admin via can_see_owner)" },
  { role: "admin",    op: "INSERT", expectedAllowed: false, desc: "admin INSERT denied (WITH CHECK false, auch fuer Admin)" },
  { role: "admin",    op: "UPDATE", expectedAllowed: false, desc: "admin UPDATE denied (Mutate-Blocking via USING false)" },
  { role: "admin",    op: "DELETE", expectedAllowed: false, desc: "admin DELETE denied (Reindex via service_role-Skript)" },

  // ---- teamlead (sieht nur same-team-chunks via can_see_owner.teamlead-branch) ----
  { role: "teamlead", op: "SELECT", expectedAllowed: true,  minRowsIfAllowed: 1, desc: "teamlead sieht 1 Row (member-1 chunk in same team)" },
  { role: "teamlead", op: "INSERT", expectedAllowed: false, desc: "teamlead INSERT denied (WITH CHECK false)" },
  { role: "teamlead", op: "UPDATE", expectedAllowed: false, desc: "teamlead UPDATE denied" },
  { role: "teamlead", op: "DELETE", expectedAllowed: false, desc: "teamlead DELETE denied" },

  // ---- member-1 (sieht own chunk) ----
  { role: "member1",  op: "SELECT", expectedAllowed: true,  minRowsIfAllowed: 1, desc: "member-1 sieht own chunk (owner_user_id=auth.uid())" },
  { role: "member1",  op: "INSERT", expectedAllowed: false, desc: "member-1 INSERT denied (WITH CHECK false)" },
  { role: "member1",  op: "UPDATE", expectedAllowed: false, desc: "member-1 UPDATE denied" },
  { role: "member1",  op: "DELETE", expectedAllowed: false, desc: "member-1 DELETE denied" },
];

async function runOperationAsUser(
  role: Role,
  op: Op,
  targetRowId: string,
): Promise<{ affected: number; error: string | null }> {
  await client.query("SAVEPOINT op_test");
  try {
    if (op === "SELECT") {
      const r = await client.query(
        `SELECT id FROM knowledge_chunks WHERE embedding_model = $1`,
        [BOOTSTRAP_MARKER],
      );
      await client.query("RELEASE SAVEPOINT op_test");
      return { affected: r.rowCount ?? 0, error: null };
    }
    if (op === "INSERT") {
      const r = await client.query(
        `INSERT INTO knowledge_chunks
           (source_type, source_id, chunk_index, chunk_text, embedding,
            embedding_model, owner_user_id, status)
         VALUES ($1, gen_random_uuid(), 0, 'test-insert', $2::vector,
                 $3, $4, 'active')`,
        [SOURCE_TYPE_INSERT, ZERO_VECTOR, BOOTSTRAP_MARKER, userIdFor(role)],
      );
      await client.query("RELEASE SAVEPOINT op_test");
      return { affected: r.rowCount ?? 0, error: null };
    }
    if (op === "UPDATE") {
      const r = await client.query(
        `UPDATE knowledge_chunks SET chunk_text = 'updated_by_test' WHERE id = $1`,
        [targetRowId],
      );
      await client.query("RELEASE SAVEPOINT op_test");
      return { affected: r.rowCount ?? 0, error: null };
    }
    // DELETE
    const r = await client.query(`DELETE FROM knowledge_chunks WHERE id = $1`, [targetRowId]);
    await client.query("RELEASE SAVEPOINT op_test");
    return { affected: r.rowCount ?? 0, error: null };
  } catch (e) {
    const msg = (e as Error).message;
    await client.query("ROLLBACK TO SAVEPOINT op_test");
    return { affected: 0, error: msg };
  }
}

describe("V8.11 SLC-905 Klasse-D RLS Matrix — knowledge_chunks User-Roles (12 Tests)", () => {
  it.each(MATRIX)(
    "role=$role op=$op allowed=$expectedAllowed — $desc",
    async ({ role, op, expectedAllowed, minRowsIfAllowed }) => {
      // Target-Row: eigener chunk fuer member1, sonst admin-chunk
      const targetRowId = role === "member1" ? chunkMemberId : chunkAdminId;

      await client.query("BEGIN");
      try {
        await client.query("SET LOCAL ROLE authenticated");
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${userIdFor(role)}'`);

        const { affected, error } = await runOperationAsUser(role, op, targetRowId);

        if (expectedAllowed) {
          expect(error, `unerwarteter Error: ${error}`).toBeNull();
          if (op === "SELECT") {
            expect(affected).toBeGreaterThanOrEqual(minRowsIfAllowed ?? 0);
          } else if (op === "INSERT") {
            expect(affected).toBe(1);
          } else {
            expect(affected).toBeGreaterThanOrEqual(1);
          }
        } else {
          if (op === "INSERT") {
            expect(error).toMatch(/row-level security/i);
          } else {
            expect(error, `unerwarteter Error: ${error}`).toBeNull();
            expect(affected).toBe(0);
          }
        }
      } finally {
        await client.query("ROLLBACK");
      }
    },
  );
});

/**
 * service_role-Block (4 Tests) — verifiziert BYPASSRLS-Pfad fuer Cron/Indexer.
 *
 * Schreibt via SET LOCAL ROLE service_role und prueft dass alle 4 Ops PASS sind.
 * Setup: service_role-GRANTs bereits via MIG-042 (V8.10) gesetzt.
 *
 * Pro Op separate Transaction + ROLLBACK damit Test-Daten nicht persistieren.
 */
describe("V8.11 SLC-905 service_role-Bypass — knowledge_chunks (4 Tests)", () => {
  const SERVICE_OPS: Op[] = ["SELECT", "INSERT", "UPDATE", "DELETE"];

  it.each(SERVICE_OPS)(
    "service_role %s — PASS (BYPASSRLS)",
    async (op) => {
      await client.query("BEGIN");
      try {
        await client.query("SET LOCAL ROLE service_role");

        if (op === "SELECT") {
          const r = await client.query(
            `SELECT id FROM knowledge_chunks WHERE embedding_model = $1`,
            [BOOTSTRAP_MARKER],
          );
          expect(r.rowCount ?? 0).toBeGreaterThanOrEqual(3);
        } else if (op === "INSERT") {
          const r = await client.query(
            `INSERT INTO knowledge_chunks
               (source_type, source_id, chunk_index, chunk_text, embedding,
                embedding_model, owner_user_id, status)
             VALUES ($1, gen_random_uuid(), 0, 'sr-insert', $2::vector, $3, $4, 'active')`,
            [SOURCE_TYPE_INSERT, ZERO_VECTOR, BOOTSTRAP_MARKER, TEST_MEMBER_1],
          );
          expect(r.rowCount).toBe(1);
        } else if (op === "UPDATE") {
          const r = await client.query(
            `UPDATE knowledge_chunks SET chunk_text = 'service_role_update' WHERE id = $1`,
            [chunkMemberId],
          );
          expect(r.rowCount).toBe(1);
        } else {
          // DELETE — fresh row, damit Bootstrap-Rows intakt bleiben
          const inserted = await client.query<{ id: string }>(
            `INSERT INTO knowledge_chunks
               (source_type, source_id, chunk_index, chunk_text, embedding,
                embedding_model, owner_user_id, status)
             VALUES ($1, gen_random_uuid(), 0, 'sr-del', $2::vector, $3, $4, 'active')
             RETURNING id`,
            [SOURCE_TYPE_INSERT, ZERO_VECTOR, BOOTSTRAP_MARKER, TEST_MEMBER_1],
          );
          const delResult = await client.query(
            `DELETE FROM knowledge_chunks WHERE id = $1`,
            [inserted.rows[0].id],
          );
          expect(delResult.rowCount).toBe(1);
        }
      } finally {
        await client.query("ROLLBACK");
      }
    },
  );
});

/**
 * search_knowledge_chunks-RPC (2 Tests) — verifiziert SECURITY DEFINER Function-Body-Filter.
 *
 * - Test 1 (User-Session-Mode): authenticated mit member-1 ruft RPC → sieht NUR own chunks
 * - Test 2 (service_role-Bypass-Mode): service_role ruft RPC → sieht alle chunks (auth.uid()=NULL → Bypass)
 *
 * Hinweis: SECURITY DEFINER laeuft als postgres-Superuser (BYPASSRLS),
 * Tabellen-RLS greift NICHT innerhalb der Function. Body-Filter ist die einzige Defense.
 */
describe("V8.11 SLC-905 search_knowledge_chunks RPC-Filter (2 Tests)", () => {
  it("member-1 ruft RPC → sieht nur own Bootstrap-Chunks (Defense-in-Depth via auth.uid())", async () => {
    await client.query("BEGIN");
    try {
      await client.query("SET LOCAL ROLE authenticated");
      await client.query(`SET LOCAL "request.jwt.claim.sub" = '${TEST_MEMBER_1}'`);

      const r = await client.query<{ id: string; source_type: string; owner_marker: string | null }>(
        `SELECT s.id, s.source_type, s.metadata->>'marker' AS owner_marker
           FROM search_knowledge_chunks($1, 20) s
          WHERE s.id IN ($2, $3, $4)`,
        [ZERO_VECTOR, chunkMemberId, chunkAdminId, chunkNullId],
      );

      // member-1 sieht NUR own chunk (chunkMember). admin-chunk + NULL-chunk sind gefiltert.
      const visibleIds = r.rows.map((row) => row.id);
      expect(visibleIds).toContain(chunkMemberId);
      expect(visibleIds).not.toContain(chunkAdminId);
      expect(visibleIds).not.toContain(chunkNullId);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("service_role ruft RPC → sieht alle Bootstrap-Chunks (Bypass via auth.uid() IS NULL)", async () => {
    await client.query("BEGIN");
    try {
      await client.query("SET LOCAL ROLE service_role");

      const r = await client.query<{ id: string }>(
        `SELECT s.id
           FROM search_knowledge_chunks($1, 20) s
          WHERE s.id IN ($2, $3, $4)`,
        [ZERO_VECTOR, chunkMemberId, chunkAdminId, chunkNullId],
      );

      const visibleIds = r.rows.map((row) => row.id);
      expect(visibleIds).toContain(chunkMemberId);
      expect(visibleIds).toContain(chunkAdminId);
      expect(visibleIds).toContain(chunkNullId);
    } finally {
      await client.query("ROLLBACK");
    }
  });
});

/**
 * Schema-Audit (3 Tests) — verifiziert MIG-049 Schema-Aenderungen persistent.
 */
describe("V8.11 SLC-905 Schema-Audit — knowledge_chunks Post-MIG-049 (3 Tests)", () => {
  it("Spalten owner_user_id + team_id vorhanden", async () => {
    const r = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'knowledge_chunks'
          AND column_name IN ('owner_user_id', 'team_id')
        ORDER BY column_name`,
    );
    expect(r.rows.map((row) => row.column_name)).toEqual(["owner_user_id", "team_id"]);
  });

  it("Indexe idx_knowledge_chunks_owner + idx_knowledge_chunks_team vorhanden", async () => {
    const r = await client.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'knowledge_chunks'
          AND indexname IN ('idx_knowledge_chunks_owner', 'idx_knowledge_chunks_team')
        ORDER BY indexname`,
    );
    expect(r.rows.map((row) => row.indexname)).toEqual([
      "idx_knowledge_chunks_owner",
      "idx_knowledge_chunks_team",
    ]);
  });

  it("search_knowledge_chunks Function-Body enthaelt Bypass-Pattern can_see_owner", async () => {
    const r = await client.query<{ pg_get_functiondef: string }>(
      `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'search_knowledge_chunks'`,
    );
    expect(r.rows.length).toBe(1);
    const body = r.rows[0].pg_get_functiondef;
    expect(body).toContain("auth.uid() IS NULL");
    expect(body).toContain("can_see_owner(kc.owner_user_id)");
  });
});
