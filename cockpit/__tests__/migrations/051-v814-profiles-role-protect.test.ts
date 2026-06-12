/**
 * V8.14 SLC-912 MT-1 — MIG-051 DB-Verification (profiles.role Column-Level-Lock, ISSUE-098).
 *
 * Lauf-Pattern: Coolify-Test-Setup via node:20 im business-net, raw pg-Client mit
 * TEST_DATABASE_URL (siehe .claude/rules/coolify-test-setup.md). Liegt unter
 * cockpit/__tests__/ und ist daher NICHT im default `vitest run` (include: src/**)
 * — wird explizit im /deploy- bzw. /qa-Fenster gegen die Coolify-DB gefahren
 * (AC-912-10), NACHDEM MIG-051 appliziert wurde:
 *
 *   docker run --rm \
 *     --network k9f5pn5upfq7etoefb5ukbcg_business-net \
 *     -v /opt/business-system-test/cockpit:/app -w /app \
 *     -e TEST_DATABASE_URL='postgresql://postgres:<urlenc-pw>@supabase-db:5432/postgres' \
 *     node:20 npx vitest run __tests__/migrations/051-v814-profiles-role-protect.test.ts
 *
 * Verifiziert (R-912-1 beide Pfade):
 *   1. authenticated (eigene Row, RLS passt via id=auth.uid()) UPDATE role -> Exception.
 *   2. postgres-Superuser-direkt UPDATE role -> Exception (Guard ist service_role-spezifisch).
 *   3. service_role UPDATE role -> success (changeRole-Pfad unangetastet).
 *   4. authenticated (eigene Row) UPDATE last_login_at -> success (kein Kollateral-Block).
 *   5. Trigger + Function existieren (Schema-Anwesenheit).
 *
 * Voraussetzung: MIG-051 applied auf der TEST_DATABASE_URL-DB.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

let client: Client;
let sampleId: string;
let sampleRole: string;
let altRole: string;

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL nicht gesetzt — Setup laut .claude/rules/coolify-test-setup.md noetig."
    );
  }
  client = new Client({ connectionString: url });
  await client.connect();

  const res = await client.query<{ id: string; role: string }>(
    `SELECT id, role FROM profiles WHERE role IS NOT NULL ORDER BY created_at LIMIT 1`
  );
  if (!res.rows[0]) {
    throw new Error("Keine profiles-Row vorhanden — Test-DB ohne Founder-Profil?");
  }
  sampleId = res.rows[0].id;
  sampleRole = res.rows[0].role;
  // Garantiert anderer Role-Wert, damit NEW.role IS DISTINCT FROM OLD.role greift.
  altRole = sampleRole === "admin" ? "member" : "admin";
});

afterAll(async () => {
  if (client) await client.end();
});

describe("MIG-051 — profiles.role Column-Level-Lock (ISSUE-098)", () => {
  it("authenticated (eigene Row) UPDATE role -> Exception (insufficient_privilege)", async () => {
    await client.query("BEGIN");
    await client.query("SAVEPOINT attack");
    // auth.uid() == sampleId -> RLS `id = auth.uid()` passt -> Trigger feuert.
    await client.query(`SET LOCAL request.jwt.claim.sub = '${sampleId}'`);
    await client.query(
      `SET LOCAL request.jwt.claims = '{"sub":"${sampleId}","role":"authenticated"}'`
    );
    await client.query("SET LOCAL ROLE authenticated");

    let err: { message: string; code?: string } | null = null;
    try {
      await client.query(
        `UPDATE profiles SET role = $1 WHERE id = $2`,
        [altRole, sampleId]
      );
    } catch (e) {
      err = e as { message: string; code?: string };
    }
    await client.query("ROLLBACK TO SAVEPOINT attack");
    await client.query("ROLLBACK");

    expect(err).not.toBeNull();
    expect(err?.message).toMatch(/role change denied/i);
    expect(err?.code).toBe("42501"); // insufficient_privilege
  });

  it("postgres-Superuser-direkt UPDATE role -> Exception (Guard service_role-spezifisch)", async () => {
    await client.query("BEGIN");
    await client.query("SAVEPOINT super");
    let err: { message: string } | null = null;
    try {
      await client.query(`UPDATE profiles SET role = $1 WHERE id = $2`, [
        altRole,
        sampleId,
      ]);
    } catch (e) {
      err = e as { message: string };
    }
    await client.query("ROLLBACK TO SAVEPOINT super");
    await client.query("ROLLBACK");

    expect(err).not.toBeNull();
    expect(err?.message).toMatch(/role change denied/i);
  });

  it("service_role UPDATE role -> success (changeRole-Pfad unangetastet)", async () => {
    await client.query("BEGIN");
    await client.query("SAVEPOINT svc");
    await client.query("SET LOCAL ROLE service_role");
    const res = await client.query(
      `UPDATE profiles SET role = $1 WHERE id = $2 RETURNING id`,
      [altRole, sampleId]
    );
    expect(res.rowCount).toBe(1);
    await client.query("ROLLBACK TO SAVEPOINT svc");
    await client.query("ROLLBACK");
  });

  it("authenticated (eigene Row) UPDATE last_login_at -> success (kein Kollateral-Block)", async () => {
    await client.query("BEGIN");
    await client.query("SAVEPOINT collateral");
    await client.query(`SET LOCAL request.jwt.claim.sub = '${sampleId}'`);
    await client.query(
      `SET LOCAL request.jwt.claims = '{"sub":"${sampleId}","role":"authenticated"}'`
    );
    await client.query("SET LOCAL ROLE authenticated");
    const res = await client.query(
      `UPDATE profiles SET last_login_at = now() WHERE id = $1 RETURNING id`,
      [sampleId]
    );
    expect(res.rowCount).toBe(1);
    await client.query("ROLLBACK TO SAVEPOINT collateral");
    await client.query("ROLLBACK");
  });

  it("Trigger + Function existieren", async () => {
    const trg = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pg_trigger
        WHERE tgname = 'profiles_role_change_guard' AND NOT tgisinternal`
    );
    expect(trg.rows[0].count).toBe("1");

    const fn = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pg_proc
        WHERE proname = 'profiles_role_change_guard'`
    );
    expect(Number(fn.rows[0].count)).toBeGreaterThanOrEqual(1);
  });
});
