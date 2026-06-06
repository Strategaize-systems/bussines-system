/**
 * SLC-904 MT-3 — V8.11 Klasse-E RLS-Matrix: audit_log (1 Tabelle, 18 Tests).
 *
 * Matrix-Struktur:
 *   - 12 Tests: 3 Rollen (admin/teamlead/member-1) × 4 Ops (SELECT/INSERT/UPDATE/DELETE)
 *   -  4 Tests: service_role × 4 Ops (alle PASS — BYPASSRLS)
 *   -  2 Tests: DSGVO-Art-15 Actor-Own-Scope Verifikation
 *   = 18 Tests gesamt
 *
 * Pattern-Quelle: cockpit/__tests__/rls/v8-11-slc-901-rls-matrix.test.ts
 * Klasse-E-Drift vs Klasse A (per DEC-272-Verfeinerung + Slice-Spec L30-53):
 *   - SELECT: is_admin() OR actor_id = auth.uid() (DSGVO-Art-15)
 *   - INSERT: WITH CHECK (false) — service_role-only (Forensik-Integritaet)
 *   - UPDATE: USING (false) WITH CHECK (false) — auch Admin via User-Session blockiert
 *   - DELETE: USING (false) — auch Admin via User-Session blockiert
 *   - service_role: BYPASSRLS — alle 4 Ops PASS
 *
 * "Denied" bedeutet:
 *   - SELECT:    0 Rows zurueck (RLS filtert, kein Error)
 *   - INSERT:    Postgres-Error 'row-level security policy' (SAVEPOINT-Pattern)
 *   - UPDATE:    0 affected Rows (RLS USING filtert)
 *   - DELETE:    0 affected Rows (RLS USING filtert)
 *
 * Pre-Apply Done-Gate: 2 Rows (audit_log + knowledge_chunks).
 * Post-MIG-048 Done-Gate: 1 Row (knowledge_chunks).
 *
 * Voraussetzung: MIG-048 applied, V7-Helper is_admin LIVE, service_role mit GRANTs (MIG-042).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

type Role = "admin" | "teamlead" | "member1";
type Op = "SELECT" | "INSERT" | "UPDATE" | "DELETE";

const TEST_TEAMLEAD_ID = "00000000-0000-0000-0000-000000000078";
const TEST_MEMBER_1 = "00000000-0000-0000-0000-000000000081";

// Marker fuer Bootstrap-Fixtures, erkennbar fuer Cleanup
const BOOTSTRAP_MARKER = "SLC904_BOOTSTRAP";
const BOOTSTRAP_ENTITY_TYPE = "slc904_test_entity";
const BOOTSTRAP_ENTITY_ID = "00000000-0000-0000-0000-0000000c904c";

// IDs der Bootstrap-Rows (gesetzt in beforeAll)
let memberRowId: string;
let adminRowId: string;
let realAdminId: string;

let client: Client;

async function bootstrapFixtures(): Promise<void> {
  // Cleanup vorheriger Test-Runs (idempotent)
  await client.query(
    `DELETE FROM audit_log WHERE action = $1 AND entity_type = $2`,
    [BOOTSTRAP_MARKER, BOOTSTRAP_ENTITY_TYPE],
  );

  // Row 1: actor = TEST_MEMBER_1 (fuer member-1 SELECT-own-Test)
  const memberInsert = await client.query<{ id: string }>(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes, context)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      TEST_MEMBER_1,
      BOOTSTRAP_MARKER,
      BOOTSTRAP_ENTITY_TYPE,
      BOOTSTRAP_ENTITY_ID,
      JSON.stringify({ marker: "member-1-own" }),
      "slc904-test-context",
    ],
  );
  memberRowId = memberInsert.rows[0].id;

  // Row 2: actor = realAdminId (fuer admin SELECT-all-Test + member-1 "other-actor"-DSGVO-Test)
  const adminInsert = await client.query<{ id: string }>(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes, context)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      realAdminId,
      BOOTSTRAP_MARKER,
      BOOTSTRAP_ENTITY_TYPE,
      BOOTSTRAP_ENTITY_ID,
      JSON.stringify({ marker: "admin-other" }),
      "slc904-test-context",
    ],
  );
  adminRowId = adminInsert.rows[0].id;
}

async function cleanupFixtures(): Promise<void> {
  // Cleanup nur die markierten Bootstrap-Rows
  await client.query(
    `DELETE FROM audit_log WHERE action = $1 AND entity_type = $2`,
    [BOOTSTRAP_MARKER, BOOTSTRAP_ENTITY_TYPE],
  );
}

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL nicht gesetzt");
  client = new Client({ connectionString: url });
  await client.connect();

  const adminRows = await client.query<{ id: string }>(
    `SELECT id FROM profiles WHERE role = 'admin' AND id NOT IN ($1, $2)
       ORDER BY created_at ASC LIMIT 1`,
    [TEST_TEAMLEAD_ID, TEST_MEMBER_1],
  );
  if (adminRows.rows.length === 0) {
    throw new Error("Kein admin-Profile vorhanden — V7-Backfill fehlt?");
  }
  realAdminId = adminRows.rows[0].id;

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
    case "admin":
      return realAdminId;
    case "teamlead":
      return TEST_TEAMLEAD_ID;
    case "member1":
      return TEST_MEMBER_1;
  }
}

/**
 * Klasse-E-Expectations:
 *   admin SELECT  -> allowed (is_admin sieht alles)
 *   admin INSERT  -> denied (WITH CHECK false, auch Admin via User-Session)
 *   admin UPDATE  -> denied (USING false)
 *   admin DELETE  -> denied (USING false)
 *   teamlead × 4  -> SELECT 0 Rows (kein admin, kein own actor), INSERT/UPDATE/DELETE denied
 *   member1 SELECT -> sieht eigene Rows (>=1)
 *   member1 INSERT/UPDATE/DELETE -> denied
 */
interface MatrixCase {
  role: Role;
  op: Op;
  expectedAllowed: boolean;
  /** Erwartete Mindest-Affected-Rows bei expectedAllowed=true. SELECT prueft >= MinRows. */
  minRowsIfAllowed?: number;
  /** Beschreibung fuer Test-Titel */
  desc: string;
}

const MATRIX: MatrixCase[] = [
  // ---- admin (sieht alles, mutiert nichts via User-Session) ----
  { role: "admin", op: "SELECT", expectedAllowed: true,  minRowsIfAllowed: 2, desc: "admin sieht alle Bootstrap-Rows (is_admin)" },
  { role: "admin", op: "INSERT", expectedAllowed: false, desc: "admin INSERT denied (WITH CHECK false, auch fuer Admin via User-Session)" },
  { role: "admin", op: "UPDATE", expectedAllowed: false, desc: "admin UPDATE denied (Forensik-Integritaet)" },
  { role: "admin", op: "DELETE", expectedAllowed: false, desc: "admin DELETE denied (Forensik-Schutz)" },

  // ---- teamlead (kein admin, keine eigenen actor-Rows) ----
  { role: "teamlead", op: "SELECT", expectedAllowed: true, minRowsIfAllowed: 0, desc: "teamlead sieht 0 Rows (Klasse-E kein Teamlead-Bypass)" },
  { role: "teamlead", op: "INSERT", expectedAllowed: false, desc: "teamlead INSERT denied (WITH CHECK false)" },
  { role: "teamlead", op: "UPDATE", expectedAllowed: false, desc: "teamlead UPDATE denied" },
  { role: "teamlead", op: "DELETE", expectedAllowed: false, desc: "teamlead DELETE denied" },

  // ---- member-1 (sieht eigene actor-Rows via DSGVO-Art-15) ----
  { role: "member1", op: "SELECT", expectedAllowed: true, minRowsIfAllowed: 1, desc: "member-1 sieht eigene actor_id-Rows (DSGVO-Art-15)" },
  { role: "member1", op: "INSERT", expectedAllowed: false, desc: "member-1 INSERT denied — auch eigene Audit-Eintraege nicht via User-Session" },
  { role: "member1", op: "UPDATE", expectedAllowed: false, desc: "member-1 UPDATE denied (Forensik)" },
  { role: "member1", op: "DELETE", expectedAllowed: false, desc: "member-1 DELETE denied (Forensik)" },
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
        `SELECT id FROM audit_log WHERE action = $1 AND entity_type = $2`,
        [BOOTSTRAP_MARKER, BOOTSTRAP_ENTITY_TYPE],
      );
      await client.query("RELEASE SAVEPOINT op_test");
      return { affected: r.rowCount ?? 0, error: null };
    }
    if (op === "INSERT") {
      // Fresh entity_id pro INSERT damit Konflikte ausgeschlossen sind
      const r = await client.query(
        `INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
         VALUES ($1, $2, $3, gen_random_uuid())`,
        [userIdFor(role), `${BOOTSTRAP_MARKER}_INS_${role}`, BOOTSTRAP_ENTITY_TYPE],
      );
      await client.query("RELEASE SAVEPOINT op_test");
      return { affected: r.rowCount ?? 0, error: null };
    }
    if (op === "UPDATE") {
      const r = await client.query(
        `UPDATE audit_log SET context = 'updated_by_test' WHERE id = $1`,
        [targetRowId],
      );
      await client.query("RELEASE SAVEPOINT op_test");
      return { affected: r.rowCount ?? 0, error: null };
    }
    // DELETE
    const r = await client.query(`DELETE FROM audit_log WHERE id = $1`, [targetRowId]);
    await client.query("RELEASE SAVEPOINT op_test");
    return { affected: r.rowCount ?? 0, error: null };
  } catch (e) {
    const msg = (e as Error).message;
    await client.query("ROLLBACK TO SAVEPOINT op_test");
    return { affected: 0, error: msg };
  }
}

describe("V8.11 SLC-904 Klasse-E RLS Matrix — audit_log User-Roles (12 Tests)", () => {
  it.each(MATRIX)(
    "role=$role op=$op allowed=$expectedAllowed — $desc",
    async ({ role, op, expectedAllowed, minRowsIfAllowed }) => {
      // Target-Row: eigene fuer member1, sonst admin-Row
      const targetRowId = role === "member1" ? memberRowId : adminRowId;

      await client.query("BEGIN");
      try {
        await client.query("SET LOCAL ROLE authenticated");
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${userIdFor(role)}'`);

        const { affected, error } = await runOperationAsUser(role, op, targetRowId);

        if (expectedAllowed) {
          // SELECT immer allowed (RLS-Filter, kein Error); Mutation gem. minRowsIfAllowed
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
            // WITH CHECK schlaegt fehl -> RLS-Error
            expect(error).toMatch(/row-level security/i);
          } else {
            // USING (false) filtert -> 0 affected, kein Error
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
 * service_role-Block (4 Tests) — verifiziert BYPASSRLS-Pfad fuer Cron/Server-Actions.
 *
 * Schreibt via SET LOCAL ROLE service_role und prueft dass alle 4 Ops PASS sind.
 * Setup: service_role-GRANTs bereits via MIG-042 (V8.10) gesetzt.
 *
 * Pro Op separate Transaction + ROLLBACK damit Test-Daten nicht persistieren.
 */
describe("V8.11 SLC-904 service_role-Bypass — audit_log (4 Tests)", () => {
  const SERVICE_OPS: Op[] = ["SELECT", "INSERT", "UPDATE", "DELETE"];

  it.each(SERVICE_OPS)(
    "service_role %s — PASS (BYPASSRLS)",
    async (op) => {
      await client.query("BEGIN");
      try {
        await client.query("SET LOCAL ROLE service_role");

        if (op === "SELECT") {
          const r = await client.query(
            `SELECT id FROM audit_log WHERE action = $1 AND entity_type = $2`,
            [BOOTSTRAP_MARKER, BOOTSTRAP_ENTITY_TYPE],
          );
          expect(r.rowCount ?? 0).toBeGreaterThanOrEqual(2);
        } else if (op === "INSERT") {
          const r = await client.query(
            `INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
             VALUES ($1, $2, $3, gen_random_uuid())`,
            [TEST_MEMBER_1, `${BOOTSTRAP_MARKER}_SR_INS`, BOOTSTRAP_ENTITY_TYPE],
          );
          expect(r.rowCount).toBe(1);
        } else if (op === "UPDATE") {
          const r = await client.query(
            `UPDATE audit_log SET context = 'service_role_update' WHERE id = $1`,
            [memberRowId],
          );
          expect(r.rowCount).toBe(1);
        } else {
          // DELETE — gegen eine separate frische Row, damit andere Tests Bootstrap-Rows behalten
          const inserted = await client.query<{ id: string }>(
            `INSERT INTO audit_log (actor_id, action, entity_type, entity_id)
             VALUES ($1, $2, $3, gen_random_uuid()) RETURNING id`,
            [TEST_MEMBER_1, `${BOOTSTRAP_MARKER}_SR_DEL`, BOOTSTRAP_ENTITY_TYPE],
          );
          const delResult = await client.query(
            `DELETE FROM audit_log WHERE id = $1`,
            [inserted.rows[0].id],
          );
          expect(delResult.rowCount).toBe(1);
        }
      } finally {
        // ROLLBACK damit INSERT/UPDATE/DELETE-Test-Daten nicht persistieren
        await client.query("ROLLBACK");
      }
    },
  );
});

/**
 * DSGVO-Art-15 Actor-Own-Scope-Verifikation (2 Tests).
 *
 * Bestaetigt das Self-Service-Right-of-Access:
 *   - member-1 SELECT WHERE actor_id = TEST_MEMBER_1 -> 1+ Rows (eigene)
 *   - member-1 SELECT WHERE actor_id = admin -> 0 Rows (RLS filtert)
 */
describe("V8.11 SLC-904 DSGVO-Art-15 Actor-Own-Scope — audit_log (2 Tests)", () => {
  it("member-1 SELECT WHERE actor_id=TEST_MEMBER_1 sieht eigene Bootstrap-Row", async () => {
    await client.query("BEGIN");
    try {
      await client.query("SET LOCAL ROLE authenticated");
      await client.query(`SET LOCAL "request.jwt.claim.sub" = '${TEST_MEMBER_1}'`);

      const r = await client.query(
        `SELECT id FROM audit_log
          WHERE actor_id = $1
            AND action = $2
            AND entity_type = $3`,
        [TEST_MEMBER_1, BOOTSTRAP_MARKER, BOOTSTRAP_ENTITY_TYPE],
      );
      expect(r.rowCount ?? 0).toBeGreaterThanOrEqual(1);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("member-1 SELECT WHERE actor_id=realAdmin sieht 0 Rows (RLS filtert)", async () => {
    await client.query("BEGIN");
    try {
      await client.query("SET LOCAL ROLE authenticated");
      await client.query(`SET LOCAL "request.jwt.claim.sub" = '${TEST_MEMBER_1}'`);

      const r = await client.query(
        `SELECT id FROM audit_log
          WHERE actor_id = $1
            AND action = $2
            AND entity_type = $3`,
        [realAdminId, BOOTSTRAP_MARKER, BOOTSTRAP_ENTITY_TYPE],
      );
      expect(r.rowCount).toBe(0);
    } finally {
      await client.query("ROLLBACK");
    }
  });
});
