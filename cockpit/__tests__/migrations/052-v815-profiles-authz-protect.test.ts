/**
 * V8.15 SLC-913 MT-1 — MIG-052 DB-Verification (profiles authz-Spalten-Lock,
 * ISSUE-109 team_id + ISSUE-122 INSERT-Coverage).
 *
 * Lauf-Pattern: Coolify-Test-Setup via node:20 im business-net, raw pg-Client mit
 * TEST_DATABASE_URL (siehe .claude/rules/coolify-test-setup.md). Liegt unter
 * cockpit/__tests__/ und ist daher NICHT im default `vitest run` (include: src/**)
 * — wird explizit im /deploy- bzw. /qa-Fenster gegen die Coolify-DB gefahren
 * (AC-913-1), NACHDEM MIG-052 appliziert wurde:
 *
 *   docker run --rm \
 *     --network k9f5pn5upfq7etoefb5ukbcg_business-net \
 *     -v /opt/business-system-test/cockpit:/app -w /app \
 *     -e TEST_DATABASE_URL='postgresql://postgres:<urlenc-pw>@supabase-db:5432/postgres' \
 *     node:20 npx vitest run __tests__/migrations/052-v815-profiles-authz-protect.test.ts
 *
 * Verifiziert (R-913-1 beide Pfade, plus MIG-051-Regression):
 *   1. authenticated (eigene Row) UPDATE team_id  -> Exception (ISSUE-109-Kern).
 *   2. service_role UPDATE team_id               -> success (Team-Zuweisungs-Pfad).
 *   3. authenticated UPDATE role                 -> Exception (MIG-051-Regression).
 *   4. authenticated UPDATE display_name         -> success (kein Kollateral-Block).
 *   5. authenticated INSERT role='admin'         -> Exception (ISSUE-122).
 *   6. authenticated INSERT role='member'/team_id NULL -> Trigger laesst durch
 *      (Admin-Caller, RLS profiles_admin_insert passt via is_admin()).
 *   7. service_role INSERT role/team_id privilegiert -> success (Invite-Pfad).
 *   8. Trigger deckt INSERT UND UPDATE (tgtype-Bits), Function existiert.
 *
 * Voraussetzung: MIG-052 applied auf der TEST_DATABASE_URL-DB. Sample-User muss
 * role='admin' haben, damit RLS profiles_admin_insert/update passieren und der
 * Trigger (nicht die Policy) die Block-Quelle ist.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

let client: Client;
let adminId: string;
let otherTeamId: string | null;

async function asAuthenticated(c: Client, sub: string): Promise<void> {
  await c.query(`SET LOCAL request.jwt.claim.sub = '${sub}'`);
  await c.query(
    `SET LOCAL request.jwt.claims = '{"sub":"${sub}","role":"authenticated"}'`
  );
  await c.query("SET LOCAL ROLE authenticated");
}

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL nicht gesetzt — Setup laut .claude/rules/coolify-test-setup.md noetig."
    );
  }
  client = new Client({ connectionString: url });
  await client.connect();

  const res = await client.query<{ id: string; team_id: string | null }>(
    `SELECT id, team_id FROM profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1`
  );
  if (!res.rows[0]) {
    throw new Error("Kein admin-Profil vorhanden — Test-DB ohne Founder-Profil?");
  }
  adminId = res.rows[0].id;

  // Anderes (oder irgendein) Team als Ziel fuer den team_id-Wechsel-Versuch.
  const teams = await client.query<{ id: string }>(
    `SELECT id FROM teams WHERE id IS DISTINCT FROM $1 LIMIT 1`,
    [res.rows[0].team_id]
  );
  otherTeamId = teams.rows[0]?.id ?? null;
});

afterAll(async () => {
  if (client) await client.end();
});

describe("MIG-052 — profiles authz-Spalten-Lock (ISSUE-109 + ISSUE-122)", () => {
  it("authenticated (eigene Row) UPDATE team_id -> Exception (insufficient_privilege)", async () => {
    await client.query("BEGIN");
    await client.query("SAVEPOINT attack");
    await asAuthenticated(client, adminId);

    let err: { message: string; code?: string } | null = null;
    try {
      // gen_random_uuid: BEFORE-Trigger feuert vor FK-Check -> Guard ist die
      // Block-Quelle, nicht profiles_team_id_fkey.
      await client.query(
        `UPDATE profiles SET team_id = COALESCE($1::uuid, gen_random_uuid()) WHERE id = $2`,
        [otherTeamId, adminId]
      );
    } catch (e) {
      err = e as { message: string; code?: string };
    }
    await client.query("ROLLBACK TO SAVEPOINT attack");
    await client.query("ROLLBACK");

    expect(err).not.toBeNull();
    expect(err?.message).toMatch(/team_id change denied/i);
    expect(err?.code).toBe("42501"); // insufficient_privilege
  });

  it("service_role UPDATE team_id -> success (Team-Zuweisungs-Pfad unangetastet)", async () => {
    await client.query("BEGIN");
    await client.query("SAVEPOINT svc");
    await client.query("SET LOCAL ROLE service_role");
    // NULL ist FK-sicher und IS DISTINCT FROM einem gesetzten team_id.
    const res = await client.query(
      `UPDATE profiles SET team_id = NULL WHERE id = $1 RETURNING id`,
      [adminId]
    );
    expect(res.rowCount).toBe(1);
    await client.query("ROLLBACK TO SAVEPOINT svc");
    await client.query("ROLLBACK");
  });

  it("authenticated UPDATE role -> Exception (MIG-051-Regression intakt)", async () => {
    await client.query("BEGIN");
    await client.query("SAVEPOINT roleattack");
    await asAuthenticated(client, adminId);

    let err: { message: string; code?: string } | null = null;
    try {
      await client.query(`UPDATE profiles SET role = 'member' WHERE id = $1`, [
        adminId,
      ]);
    } catch (e) {
      err = e as { message: string; code?: string };
    }
    await client.query("ROLLBACK TO SAVEPOINT roleattack");
    await client.query("ROLLBACK");

    expect(err).not.toBeNull();
    expect(err?.message).toMatch(/role change denied/i);
    expect(err?.code).toBe("42501");
  });

  it("authenticated UPDATE display_name -> success (kein Kollateral-Block)", async () => {
    await client.query("BEGIN");
    await client.query("SAVEPOINT collateral");
    await asAuthenticated(client, adminId);
    const res = await client.query(
      `UPDATE profiles SET display_name = display_name WHERE id = $1 RETURNING id`,
      [adminId]
    );
    expect(res.rowCount).toBe(1);
    await client.query("ROLLBACK TO SAVEPOINT collateral");
    await client.query("ROLLBACK");
  });

  it("authenticated INSERT mit role='admin' -> Exception (ISSUE-122)", async () => {
    await client.query("BEGIN");
    await client.query("SAVEPOINT insattack");
    await asAuthenticated(client, adminId);

    let err: { message: string; code?: string } | null = null;
    try {
      await client.query(
        `INSERT INTO profiles (id, role) VALUES (gen_random_uuid(), 'admin')`
      );
    } catch (e) {
      err = e as { message: string; code?: string };
    }
    await client.query("ROLLBACK TO SAVEPOINT insattack");
    await client.query("ROLLBACK");

    expect(err).not.toBeNull();
    expect(err?.message).toMatch(/insert with privileged role\/team_id denied/i);
    expect(err?.code).toBe("42501");
  });

  it("authenticated INSERT role='member' + team_id NULL -> Trigger laesst durch", async () => {
    await client.query("BEGIN");
    await client.query("SAVEPOINT insok");
    await asAuthenticated(client, adminId);
    const res = await client.query(
      `INSERT INTO profiles (id, role, team_id) VALUES (gen_random_uuid(), 'member', NULL) RETURNING id`
    );
    expect(res.rowCount).toBe(1);
    await client.query("ROLLBACK TO SAVEPOINT insok");
    await client.query("ROLLBACK");
  });

  it("service_role INSERT mit privilegiertem role/team_id -> success (Invite-Pfad)", async () => {
    await client.query("BEGIN");
    await client.query("SAVEPOINT svcins");
    await client.query("SET LOCAL ROLE service_role");
    const res = await client.query(
      `INSERT INTO profiles (id, role, team_id) VALUES (gen_random_uuid(), 'teamlead', $1) RETURNING id`,
      [otherTeamId]
    );
    expect(res.rowCount).toBe(1);
    await client.query("ROLLBACK TO SAVEPOINT svcins");
    await client.query("ROLLBACK");
  });

  it("Trigger deckt INSERT + UPDATE, Function existiert", async () => {
    // tgtype-Bits: 4 = INSERT, 16 = UPDATE.
    const trg = await client.query<{ tgtype: number }>(
      `SELECT tgtype FROM pg_trigger
        WHERE tgname = 'profiles_role_change_guard' AND NOT tgisinternal`
    );
    expect(trg.rows).toHaveLength(1);
    expect(trg.rows[0].tgtype & 4).toBeTruthy(); // INSERT
    expect(trg.rows[0].tgtype & 16).toBeTruthy(); // UPDATE

    const fn = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pg_proc
        WHERE proname = 'profiles_role_change_guard'`
    );
    expect(Number(fn.rows[0].count)).toBeGreaterThanOrEqual(1);
  });
});
