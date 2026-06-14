/**
 * V8.15 SLC-913 MT-7 — MIG-053 DB-Verification (export_api_keys, ISSUE-116).
 *
 * Lauf-Pattern: Coolify-Test-Setup via node:20 im business-net, raw pg-Client mit
 * TEST_DATABASE_URL (siehe .claude/rules/coolify-test-setup.md). Liegt unter
 * cockpit/__tests__/ und ist daher NICHT im default `vitest run` (include: src/**)
 * — wird explizit im /deploy-Fenster gegen die Coolify-DB gefahren, NACHDEM
 * MIG-053 appliziert wurde:
 *
 *   docker run --rm \
 *     --network k9f5pn5upfq7etoefb5ukbcg_business-net \
 *     -v /opt/business-system-test/cockpit:/app -w /app \
 *     -e TEST_DATABASE_URL='postgresql://postgres:<urlenc-pw>@supabase-db:5432/postgres' \
 *     node:20 npx vitest run __tests__/migrations/053-v815-export-api-keys.test.ts
 *
 * Verifiziert:
 *   1. Tabelle existiert mit erwarteten Spalten + RLS FORCE aktiv.
 *   2. anon SELECT          -> permission denied (REVOKE-Hygiene neue public-Tabelle).
 *   3. authenticated SELECT -> permission denied.
 *   4. service_role SELECT  -> erlaubt (Admin-verwaltet).
 *   5. key_hash UNIQUE: zweiter Insert mit gleichem Hash -> Violation.
 *   6. scope-CHECK: scope='write' -> Violation (nur 'read' erlaubt).
 *
 * SAVEPOINT um erwartete Permission-/Constraint-Fehler (Tx bleibt nutzbar).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

let client: Client;

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL nicht gesetzt — Setup laut .claude/rules/coolify-test-setup.md noetig.",
    );
  }
  client = new Client({ connectionString: url });
  await client.connect();
});

afterAll(async () => {
  await client.end();
});

async function expectError(fn: () => Promise<unknown>, re: RegExp): Promise<void> {
  await client.query("SAVEPOINT sp");
  let msg: string | null = null;
  try {
    await fn();
  } catch (e) {
    msg = (e as Error).message;
  }
  await client.query("ROLLBACK TO SAVEPOINT sp");
  expect(msg).toMatch(re);
}

describe("MIG-053 export_api_keys", () => {
  it("Tabelle existiert mit RLS FORCE", async () => {
    const reg = await client.query(
      "SELECT to_regclass('public.export_api_keys') AS t",
    );
    expect(reg.rows[0].t).toBe("export_api_keys");
    const rls = await client.query(
      "SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname='export_api_keys'",
    );
    expect(rls.rows[0].relrowsecurity).toBe(true);
    expect(rls.rows[0].relforcerowsecurity).toBe(true);
  });

  it("anon SELECT -> permission denied", async () => {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE anon");
    await expectError(
      () => client.query("SELECT * FROM export_api_keys"),
      /permission denied/i,
    );
    await client.query("ROLLBACK");
  });

  it("authenticated SELECT -> permission denied", async () => {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE authenticated");
    await expectError(
      () => client.query("SELECT * FROM export_api_keys"),
      /permission denied/i,
    );
    await client.query("ROLLBACK");
  });

  it("service_role SELECT -> erlaubt", async () => {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE service_role");
    const r = await client.query("SELECT count(*) FROM export_api_keys");
    expect(r.rows[0].count).toBeDefined();
    await client.query("ROLLBACK");
  });

  it("key_hash UNIQUE + scope-CHECK", async () => {
    await client.query("BEGIN");
    // Owner aus auth.users ziehen (FK).
    const u = await client.query("SELECT id FROM auth.users LIMIT 1");
    const owner = u.rows[0]?.id;
    expect(owner).toBeTruthy();

    await client.query(
      "INSERT INTO export_api_keys(key_hash, owner_user_id, label) VALUES ('dbverify-hash-1', $1, 'dbverify')",
      [owner],
    );
    await expectError(
      () =>
        client.query(
          "INSERT INTO export_api_keys(key_hash, owner_user_id) VALUES ('dbverify-hash-1', $1)",
          [owner],
        ),
      /duplicate key|unique/i,
    );
    await expectError(
      () =>
        client.query(
          "INSERT INTO export_api_keys(key_hash, owner_user_id, scope) VALUES ('dbverify-hash-2', $1, 'write')",
          [owner],
        ),
      /check constraint|violates/i,
    );
    await client.query("ROLLBACK");
  });
});
