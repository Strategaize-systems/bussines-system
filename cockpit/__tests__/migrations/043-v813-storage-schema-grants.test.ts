/**
 * V8.13 SLC-894 MT-2 — MIG-043 Schema-Verification-Test (Storage-GRANTs).
 *
 * Lauf-Pattern: Coolify-Test-Setup via node:20 im business-net, raw pg-Client
 * mit TEST_DATABASE_URL.
 *
 *   docker run --rm \
 *     --network k9f5pn5upfq7etoefb5ukbcg_business-net \
 *     -v /opt/business-system-test/cockpit:/app -w /app \
 *     -e TEST_DATABASE_URL='postgresql://postgres:<urlenc-pw>@supabase-db:5432/postgres' \
 *     node:20 npx vitest run __tests__/migrations/043-v813-storage-schema-grants.test.ts
 *
 * Tests (5):
 *   1. authenticated hat SELECT+INSERT+UPDATE+DELETE auf alle 5 storage-Tables (20 Rows).
 *   2. anon hat SELECT+INSERT+UPDATE+DELETE auf alle 5 storage-Tables (20 Rows).
 *   3. MIG-041 RLS-Defense bleibt aktiv: 4 documents_user_* Policies sind weiterhin vorhanden (AC-894-4).
 *   4. ALTER DEFAULT PRIVILEGES gesetzt: pg_default_acl hat Eintraege fuer postgres + supabase_storage_admin im storage-Schema.
 *   5. service_role ist NICHT degradiert: hat weiterhin volle CRUD auf alle 5 storage-Tables.
 *
 * Voraussetzung: MIG-043 applied auf der TEST_DATABASE_URL-DB (MT-3).
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

const STORAGE_TABLES = [
  "buckets",
  "migrations",
  "objects",
  "s3_multipart_uploads",
  "s3_multipart_uploads_parts",
] as const;

const CRUD_PRIVILEGES = ["SELECT", "INSERT", "UPDATE", "DELETE"] as const;

describe("MIG-043 — Storage-Schema GRANTs (ISSUE-088 Root-Fix)", () => {
  it("authenticated hat SELECT+INSERT+UPDATE+DELETE auf alle 5 storage-Tables", async () => {
    const res = await client.query<{ table_name: string; privilege_type: string }>(
      `SELECT table_name, privilege_type
         FROM information_schema.role_table_grants
        WHERE table_schema = 'storage'
          AND grantee = 'authenticated'
          AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
        ORDER BY table_name, privilege_type`
    );

    expect(res.rowCount).toBe(20);

    for (const table of STORAGE_TABLES) {
      const privs = res.rows
        .filter((r) => r.table_name === table)
        .map((r) => r.privilege_type)
        .sort();
      expect(privs).toEqual([...CRUD_PRIVILEGES].sort());
    }
  });

  it("anon hat SELECT+INSERT+UPDATE+DELETE auf alle 5 storage-Tables", async () => {
    const res = await client.query<{ table_name: string; privilege_type: string }>(
      `SELECT table_name, privilege_type
         FROM information_schema.role_table_grants
        WHERE table_schema = 'storage'
          AND grantee = 'anon'
          AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
        ORDER BY table_name, privilege_type`
    );

    expect(res.rowCount).toBe(20);

    for (const table of STORAGE_TABLES) {
      const privs = res.rows
        .filter((r) => r.table_name === table)
        .map((r) => r.privilege_type)
        .sort();
      expect(privs).toEqual([...CRUD_PRIVILEGES].sort());
    }
  });

  it("MIG-041 RLS-Defense bleibt aktiv: 4 documents_user_* Policies vorhanden (AC-894-4)", async () => {
    const res = await client.query<{ policyname: string }>(
      `SELECT policyname
         FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname LIKE 'documents_user_%'
        ORDER BY policyname`
    );

    expect(res.rowCount).toBe(4);
    expect(res.rows.map((r) => r.policyname)).toEqual([
      "documents_user_delete",
      "documents_user_insert",
      "documents_user_select",
      "documents_user_update",
    ]);
  });

  it("ALTER DEFAULT PRIVILEGES gesetzt fuer authenticated + anon im storage-Schema", async () => {
    // pg_default_acl hat einen Eintrag pro (defaclrole, defaclnamespace, defaclobjtype).
    // MIG-043 setzt 4 Eintraege: postgres-TABLES, postgres-SEQUENCES,
    // supabase_storage_admin-TABLES, supabase_storage_admin-SEQUENCES.
    const res = await client.query<{
      role_for: string;
      obj_type: string;
      acl_text: string;
    }>(
      `SELECT defaclrole::regrole::text AS role_for,
              defaclobjtype AS obj_type,
              array_to_string(defaclacl, ',') AS acl_text
         FROM pg_default_acl
        WHERE defaclnamespace = 'storage'::regnamespace
        ORDER BY role_for, obj_type`
    );

    expect(res.rowCount).toBe(4);

    const rolesWithType = new Set(
      res.rows.map((r) => `${r.role_for}|${r.obj_type}`)
    );
    expect(rolesWithType.has("postgres|r")).toBe(true);
    expect(rolesWithType.has("postgres|S")).toBe(true);
    expect(rolesWithType.has("supabase_storage_admin|r")).toBe(true);
    expect(rolesWithType.has("supabase_storage_admin|S")).toBe(true);

    // Jeder ACL-String muss authenticated + anon enthalten.
    for (const row of res.rows) {
      expect(row.acl_text).toMatch(/authenticated/);
      expect(row.acl_text).toMatch(/anon/);
    }
  });

  it("service_role ist NICHT degradiert: weiterhin volle CRUD auf alle 5 storage-Tables", async () => {
    const res = await client.query<{ table_name: string; privilege_type: string }>(
      `SELECT table_name, privilege_type
         FROM information_schema.role_table_grants
        WHERE table_schema = 'storage'
          AND grantee = 'service_role'
          AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
        ORDER BY table_name, privilege_type`
    );

    expect(res.rowCount).toBe(20);

    for (const table of STORAGE_TABLES) {
      const privs = res.rows
        .filter((r) => r.table_name === table)
        .map((r) => r.privilege_type)
        .sort();
      expect(privs).toEqual([...CRUD_PRIVILEGES].sort());
    }
  });
});
