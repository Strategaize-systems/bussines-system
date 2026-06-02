/**
 * V8.10 SLC-893 MT-5 — documents-Bucket RLS Cross-Tenant Defense.
 *
 * Verifiziert die 4 user-scoped Storage-Policies aus MIG-041:
 *   documents_user_select / _insert / _update / _delete
 *
 * Lauf-Pattern: Coolify-Test-Setup via node:20 im Business-Net.
 *
 *   docker run --rm \
 *     --network k9f5pn5upfq7etoefb5ukbcg_business-net \
 *     -v /opt/business-system-test/cockpit:/app -w /app \
 *     -e TEST_DATABASE_URL='postgresql://postgres:<urlenc-pw>@supabase-db:5432/postgres' \
 *     node:20 npx vitest run __tests__/rls/documents-storage-rls.test.ts
 *
 * Tests (8):
 *   1. User-A SELECT own object  -> 1 row
 *   2. User-A SELECT User-B's    -> 0 rows (cross-tenant denied)
 *   3. User-A INSERT own path    -> allowed
 *   4. User-A INSERT User-B path -> RLS denial
 *   5. User-A UPDATE own object  -> 1 affected
 *   6. User-A UPDATE User-B obj  -> 0 affected (USING-clause filter)
 *   7. User-A DELETE own object  -> 1 affected
 *   8. User-A DELETE User-B obj  -> 0 affected (USING-clause filter)
 *
 * NB: Storage-Policy verlaesst sich auf RLS-USING-Filter, was bei
 *     UPDATE/DELETE auf nicht-eigene Rows nicht zur Permission-Denial
 *     fuehrt sondern zu "0 rows affected" (Standard PostgreSQL-RLS-
 *     Verhalten). Bei INSERT mit WITH-CHECK feuert die Policy explizit.
 *
 * Voraussetzung: MIG-041 applied auf TEST_DATABASE_URL-DB.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Client } from "pg";

// Test-User-UUIDs (V7 Seed-Pattern, identisch zu legal-documents-rls.test.ts).
const USER_A = "00000000-0000-0000-0000-0000000ba001"; // qa-admin
const USER_B = "00000000-0000-0000-0000-000000000081"; // qa-member

const BUCKET = "documents";
const TEST_MARKER = "test-slc-893";

const objectNameA = (suffix = "doc-a.pdf") =>
  `${USER_A}/${TEST_MARKER}/${suffix}`;
const objectNameB = (suffix = "doc-b.pdf") =>
  `${USER_B}/${TEST_MARKER}/${suffix}`;

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
  if (!client) return;
  // Test-Markierte Objects aufraeumen (idempotent als postgres).
  await client.query(
    `DELETE FROM storage.objects WHERE bucket_id = $1 AND name LIKE $2`,
    [BUCKET, `%/${TEST_MARKER}/%`]
  );
  await client.end();
});

beforeEach(async () => {
  // Leeren State herstellen.
  await client.query(
    `DELETE FROM storage.objects WHERE bucket_id = $1 AND name LIKE $2`,
    [BUCKET, `%/${TEST_MARKER}/%`]
  );
});

async function asUser(userId: string): Promise<void> {
  await client.query("SET LOCAL ROLE authenticated");
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${userId}'`);
}

/**
 * Seed: Insert storage.objects-Row als postgres (bypass RLS).
 * owner_id mapped auf User-UUID damit Trigger-Lookups etc. valide sind.
 */
async function seedObject(name: string, ownerId: string): Promise<void> {
  await client.query("RESET ROLE");
  await client.query(
    `INSERT INTO storage.objects (bucket_id, name, owner, owner_id, metadata)
     VALUES ($1, $2, NULL, $3, '{}'::jsonb)
     ON CONFLICT (bucket_id, name) DO NOTHING`,
    [BUCKET, name, ownerId]
  );
}

describe("documents-Bucket RLS — Cross-Tenant Defense (MIG-041)", () => {
  it("Test-1: User-A SELECT own object -> 1 row", async () => {
    await seedObject(objectNameA("own-1.pdf"), USER_A);
    await client.query("BEGIN");
    try {
      await asUser(USER_A);
      const res = await client.query(
        `SELECT name FROM storage.objects WHERE bucket_id = $1 AND name = $2`,
        [BUCKET, objectNameA("own-1.pdf")]
      );
      expect(res.rowCount).toBe(1);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("Test-2: User-A SELECT User-B's object -> 0 rows (cross-tenant denied)", async () => {
    await seedObject(objectNameB("foreign-1.pdf"), USER_B);
    await client.query("BEGIN");
    try {
      await asUser(USER_A);
      const res = await client.query(
        `SELECT name FROM storage.objects WHERE bucket_id = $1 AND name = $2`,
        [BUCKET, objectNameB("foreign-1.pdf")]
      );
      expect(res.rowCount).toBe(0);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("Test-3: User-A INSERT own path -> allowed", async () => {
    await client.query("BEGIN");
    try {
      await asUser(USER_A);
      const res = await client.query(
        `INSERT INTO storage.objects (bucket_id, name, owner, owner_id, metadata)
         VALUES ($1, $2, NULL, $3, '{}'::jsonb)
         RETURNING name`,
        [BUCKET, objectNameA("own-ins.pdf"), USER_A]
      );
      expect(res.rowCount).toBe(1);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("Test-4: User-A INSERT User-B path -> RLS denial", async () => {
    await client.query("BEGIN");
    try {
      await asUser(USER_A);

      let errorMessage: string | null = null;
      await client.query("SAVEPOINT cross_insert");
      try {
        await client.query(
          `INSERT INTO storage.objects (bucket_id, name, owner, owner_id, metadata)
           VALUES ($1, $2, NULL, $3, '{}'::jsonb)`,
          [BUCKET, objectNameB("ins-from-a.pdf"), USER_A]
        );
      } catch (e) {
        errorMessage = (e as Error).message;
      }
      await client.query("ROLLBACK TO SAVEPOINT cross_insert");

      expect(errorMessage).toMatch(/row-level security/i);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("Test-5: User-A UPDATE own object -> 1 affected", async () => {
    await seedObject(objectNameA("own-upd.pdf"), USER_A);
    await client.query("BEGIN");
    try {
      await asUser(USER_A);
      const res = await client.query(
        `UPDATE storage.objects
            SET metadata = '{"updated":"yes"}'::jsonb
          WHERE bucket_id = $1 AND name = $2`,
        [BUCKET, objectNameA("own-upd.pdf")]
      );
      expect(res.rowCount).toBe(1);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("Test-6: User-A UPDATE User-B object -> 0 affected (USING-clause filter)", async () => {
    await seedObject(objectNameB("foreign-upd.pdf"), USER_B);
    await client.query("BEGIN");
    try {
      await asUser(USER_A);
      const res = await client.query(
        `UPDATE storage.objects
            SET metadata = '{"hijack":"attempt"}'::jsonb
          WHERE bucket_id = $1 AND name = $2`,
        [BUCKET, objectNameB("foreign-upd.pdf")]
      );
      expect(res.rowCount).toBe(0);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("Test-7: User-A DELETE own object -> 1 affected", async () => {
    await seedObject(objectNameA("own-del.pdf"), USER_A);
    await client.query("BEGIN");
    try {
      await asUser(USER_A);
      const res = await client.query(
        `DELETE FROM storage.objects WHERE bucket_id = $1 AND name = $2`,
        [BUCKET, objectNameA("own-del.pdf")]
      );
      expect(res.rowCount).toBe(1);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("Test-8: User-A DELETE User-B object -> 0 affected (USING-clause filter)", async () => {
    await seedObject(objectNameB("foreign-del.pdf"), USER_B);
    await client.query("BEGIN");
    try {
      await asUser(USER_A);
      const res = await client.query(
        `DELETE FROM storage.objects WHERE bucket_id = $1 AND name = $2`,
        [BUCKET, objectNameB("foreign-del.pdf")]
      );
      expect(res.rowCount).toBe(0);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  // Bonus: List-Filter (Slice-Spec AC-893-6 Test-7+8 als List-Cases).
  it("Bonus: User-A List own folder -> sieht eigene objects", async () => {
    await seedObject(objectNameA("list-1.pdf"), USER_A);
    await seedObject(objectNameA("list-2.pdf"), USER_A);
    await client.query("BEGIN");
    try {
      await asUser(USER_A);
      const res = await client.query(
        `SELECT name FROM storage.objects
          WHERE bucket_id = $1 AND name LIKE $2
          ORDER BY name`,
        [BUCKET, `${USER_A}/${TEST_MARKER}/%`]
      );
      expect(res.rowCount).toBe(2);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("Bonus: User-A List User-B folder -> leer (0 rows)", async () => {
    await seedObject(objectNameB("foreign-list-1.pdf"), USER_B);
    await seedObject(objectNameB("foreign-list-2.pdf"), USER_B);
    await client.query("BEGIN");
    try {
      await asUser(USER_A);
      const res = await client.query(
        `SELECT name FROM storage.objects
          WHERE bucket_id = $1 AND name LIKE $2`,
        [BUCKET, `${USER_B}/${TEST_MARKER}/%`]
      );
      expect(res.rowCount).toBe(0);
    } finally {
      await client.query("ROLLBACK");
    }
  });
});
