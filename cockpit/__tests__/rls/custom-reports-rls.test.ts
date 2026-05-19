/**
 * V7.6 SLC-762 MT-5 — custom_reports RLS-Live-DB-Test.
 *
 * Lauf-Pattern: Coolify-Test-Setup via node:20 im Business-Net, raw pg-Client
 * mit TEST_DATABASE_URL, SAVEPOINT fuer expected RLS-Rejections.
 *
 *   docker run --rm \
 *     --network k9f5pn5upfq7etoefb5ukbcg_business-net \
 *     -v /opt/business-system-test/cockpit:/app -w /app \
 *     -e TEST_DATABASE_URL='postgresql://postgres:<urlenc-pw>@supabase-db:5432/postgres' \
 *     node:20 npx vitest run __tests__/rls/custom-reports-rls.test.ts
 *
 * Tests (6):
 *   1. User A INSERT + SELECT (allowed).
 *   2. User B SELECT User A's row -> 0 rows (RLS filtert).
 *   3. User B UPDATE User A's row -> 0 affected (RLS WHERE filtert).
 *   4. User B DELETE User A's row -> 0 affected.
 *   5. UNIQUE-Constraint (gleicher Owner + Name twice) -> 23505.
 *   6. Cascade-Schema-Check: FK custom_reports.owner_user_id auf auth.users(id)
 *      hat ON DELETE CASCADE (confdeltype='a' = NO ACTION, 'c' = CASCADE).
 *
 * Voraussetzung: MIG-037 appliedet, TEST_MEMBER_1 + TEST_MEMBER_2 existieren
 * in auth.users (aus MIG-033/034 / Seed).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Client } from "pg";

const TEST_MEMBER_1 = "00000000-0000-0000-0000-000000000081";
const TEST_MEMBER_2 = "00000000-0000-0000-0000-000000000082";

const NAME_A = "[TEST-SLC-762] Report von User A";
const NAME_DUP = "[TEST-SLC-762] Duplicate Name";

let client: Client;

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL nicht gesetzt — Test-Setup laut .claude/rules/coolify-test-setup.md noetig."
    );
  }
  client = new Client({ connectionString: url });
  await client.connect();
});

afterAll(async () => {
  if (client) {
    await client.end();
  }
});

beforeEach(async () => {
  // Defensive Cleanup zwischen Tests — kein Test-Pollution.
  await client.query(
    "DELETE FROM custom_reports WHERE name LIKE '[TEST-SLC-762]%'"
  );
});

async function asUser(userId: string): Promise<void> {
  await client.query("SET LOCAL ROLE authenticated");
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${userId}'`);
}

describe("custom_reports RLS — Owner-Isolation", () => {
  it("Owner A can INSERT and SELECT his own row", async () => {
    await client.query("BEGIN");
    try {
      await asUser(TEST_MEMBER_1);
      const ins = await client.query(
        `INSERT INTO custom_reports (owner_user_id, context_type, name, prompt_template)
         VALUES ($1, 'mein-tag', $2, 'Wie laeufts heute?') RETURNING id`,
        [TEST_MEMBER_1, NAME_A]
      );
      expect(ins.rowCount).toBe(1);

      const sel = await client.query(
        "SELECT id, name FROM custom_reports WHERE owner_user_id = $1",
        [TEST_MEMBER_1]
      );
      expect(sel.rowCount).toBeGreaterThanOrEqual(1);
      expect(sel.rows.some((r) => r.name === NAME_A)).toBe(true);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("User B SELECT for User A's row -> 0 rows (RLS filters)", async () => {
    await client.query("BEGIN");
    try {
      // Setup: User A inserts a row (SET LOCAL bleibt aktiv waehrend BEGIN).
      await asUser(TEST_MEMBER_1);
      await client.query(
        `INSERT INTO custom_reports (owner_user_id, context_type, name, prompt_template)
         VALUES ($1, 'mein-tag', $2, 'Wie laeufts heute?')`,
        [TEST_MEMBER_1, NAME_A]
      );

      // Switch to User B.
      await asUser(TEST_MEMBER_2);
      const sel = await client.query(
        "SELECT id FROM custom_reports WHERE name = $1",
        [NAME_A]
      );
      expect(sel.rowCount).toBe(0);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("User B UPDATE on User A's row -> 0 affected (RLS WHERE filters)", async () => {
    await client.query("BEGIN");
    try {
      await asUser(TEST_MEMBER_1);
      const ins = await client.query(
        `INSERT INTO custom_reports (owner_user_id, context_type, name, prompt_template)
         VALUES ($1, 'mein-tag', $2, 'orig prompt template here') RETURNING id`,
        [TEST_MEMBER_1, NAME_A]
      );
      const targetId = ins.rows[0].id;

      await asUser(TEST_MEMBER_2);
      const upd = await client.query(
        "UPDATE custom_reports SET prompt_template = 'hijacked attempt by user B' WHERE id = $1",
        [targetId]
      );
      expect(upd.rowCount).toBe(0);

      // Verify the row is unchanged via direct postgres view.
      await client.query("RESET ROLE");
      const after = await client.query(
        "SELECT prompt_template FROM custom_reports WHERE id = $1",
        [targetId]
      );
      expect(after.rows[0].prompt_template).toBe("orig prompt template here");
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("User B DELETE on User A's row -> 0 affected (RLS WHERE filters)", async () => {
    await client.query("BEGIN");
    try {
      await asUser(TEST_MEMBER_1);
      const ins = await client.query(
        `INSERT INTO custom_reports (owner_user_id, context_type, name, prompt_template)
         VALUES ($1, 'mein-tag', $2, 'orig prompt template here') RETURNING id`,
        [TEST_MEMBER_1, NAME_A]
      );
      const targetId = ins.rows[0].id;

      await asUser(TEST_MEMBER_2);
      const del = await client.query(
        "DELETE FROM custom_reports WHERE id = $1",
        [targetId]
      );
      expect(del.rowCount).toBe(0);

      await client.query("RESET ROLE");
      const after = await client.query(
        "SELECT id FROM custom_reports WHERE id = $1",
        [targetId]
      );
      expect(after.rowCount).toBe(1);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("UNIQUE(owner_user_id, name): duplicate insert raises 23505", async () => {
    await client.query("BEGIN");
    try {
      await asUser(TEST_MEMBER_1);
      await client.query(
        `INSERT INTO custom_reports (owner_user_id, context_type, name, prompt_template)
         VALUES ($1, 'mein-tag', $2, 'prompt one for dup test')`,
        [TEST_MEMBER_1, NAME_DUP]
      );

      let errorCode: string | null = null;
      let errorMessage: string | null = null;
      await client.query("SAVEPOINT dup_insert");
      try {
        await client.query(
          `INSERT INTO custom_reports (owner_user_id, context_type, name, prompt_template)
           VALUES ($1, 'mein-tag', $2, 'prompt two for dup test')`,
          [TEST_MEMBER_1, NAME_DUP]
        );
      } catch (e) {
        const err = e as { code?: string; message: string };
        errorCode = err.code ?? null;
        errorMessage = err.message;
      }
      await client.query("ROLLBACK TO SAVEPOINT dup_insert");

      expect(errorCode).toBe("23505");
      expect(errorMessage).toMatch(
        /duplicate key value violates unique constraint/i
      );
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("FK auth.users(id) is ON DELETE CASCADE (confdeltype='c')", async () => {
    // confdeltype: 'a'=NO ACTION, 'r'=RESTRICT, 'c'=CASCADE, 'n'=SET NULL, 'd'=SET DEFAULT.
    const r = await client.query(
      `SELECT confdeltype FROM pg_constraint
       WHERE conrelid = 'public.custom_reports'::regclass
         AND contype = 'f'
         AND conname = 'custom_reports_owner_user_id_fkey'`
    );
    expect(r.rowCount).toBe(1);
    expect(r.rows[0].confdeltype).toBe("c");
  });
});
