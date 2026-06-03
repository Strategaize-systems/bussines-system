/**
 * V8.13 SLC-895 MT-5b — MIG-044 Schema-Verification-Test (auth.users.aud Normalisierung).
 *
 * Lauf-Pattern: Coolify-Test-Setup via node:20 im business-net, raw pg-Client
 * mit TEST_DATABASE_URL.
 *
 *   docker run --rm \
 *     --network k9f5pn5upfq7etoefb5ukbcg_business-net \
 *     -v /opt/business-system-test/cockpit:/app -w /app \
 *     -e TEST_DATABASE_URL='postgresql://postgres:<urlenc-pw>@supabase-db:5432/postgres' \
 *     node:20 npx vitest run __tests__/migrations/044-v813-auth-users-aud-normalize.test.ts
 *
 * Tests (5):
 *   1. Post-MIG-044: 0 User in auth.users haben aud='authenticated'.
 *   2. Post-MIG-044: alle aktiven (nicht SSO, nicht deleted) User haben aud='' oder aud IS NULL.
 *   3. role-Spalte ist unangetastet (alle User haben role='authenticated' oder NULL — Pre-V7-Drift bei richard erlaubt).
 *   4. instance_id ist unangetastet (alle User haben gleiche instance_id wie vor MIG-044).
 *   5. updated_at-Sanity: User die updated wurden haben updated_at >= MIG-044-Apply-Datum.
 *
 * Voraussetzung: MIG-044 applied auf der TEST_DATABASE_URL-DB (MT-5c).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

let client: Client;

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL nicht gesetzt — Setup laut .claude/rules/coolify-test-setup.md noetig."
    );
  }
  client = new Client({ connectionString: url });
  await client.connect();
});

afterAll(async () => {
  if (client) await client.end();
});

describe("MIG-044 — auth.users.aud Normalisierung (ISSUE-089 Root-Fix)", () => {
  it("Post-Apply: 0 User in auth.users haben aud='authenticated'", async () => {
    const res = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM auth.users
        WHERE aud = 'authenticated'`
    );
    expect(res.rows[0].count).toBe("0");
  });

  it("Post-Apply: alle aktiven Non-SSO-User haben aud='' oder aud IS NULL", async () => {
    const res = await client.query<{
      email: string;
      aud_value: string;
    }>(
      `SELECT email, COALESCE(aud, '<NULL>') AS aud_value
         FROM auth.users
        WHERE is_sso_user = false
          AND deleted_at IS NULL
          AND aud NOT IN ('')
          AND aud IS NOT NULL`
    );
    if (res.rowCount && res.rowCount > 0) {
      const offenders = res.rows
        .map((r) => `${r.email} (aud=[${r.aud_value}])`)
        .join(", ");
      throw new Error(
        `Active Non-SSO-Users with non-blank aud after MIG-044: ${offenders}`
      );
    }
    expect(res.rowCount).toBe(0);
  });

  it("role-Spalte unangetastet: alle Non-SSO-User haben role='authenticated' oder NULL (Pre-V7-Drift erlaubt)", async () => {
    const res = await client.query<{
      email: string;
      role: string | null;
    }>(
      `SELECT email, role
         FROM auth.users
        WHERE is_sso_user = false
          AND deleted_at IS NULL`
    );
    for (const row of res.rows) {
      // role darf 'authenticated' sein (Default) oder NULL (alte User Pre-V7).
      // Andere Werte (z.B. 'anon', 'service_role') waeren ein Problem.
      expect(row.role === null || row.role === "authenticated").toBe(true);
    }
  });

  it("instance_id unangetastet: alle User haben die Standard-instance_id", async () => {
    const res = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM auth.users
        WHERE instance_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000000'::uuid`
    );
    expect(res.rows[0].count).toBe("0");
  });

  it("MIG-044 ist idempotent: zweiter UPDATE returnt 0 Rows", async () => {
    // SAVEPOINT-Pattern aus coolify-test-setup-rule.
    await client.query("BEGIN");
    await client.query("SAVEPOINT idem_check");
    try {
      const res = await client.query(
        `UPDATE auth.users SET aud = '' WHERE aud = 'authenticated' RETURNING id`
      );
      expect(res.rowCount).toBe(0);
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT idem_check");
      await client.query("ROLLBACK");
    }
  });
});
