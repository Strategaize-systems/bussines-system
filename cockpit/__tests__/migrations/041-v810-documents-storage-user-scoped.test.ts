/**
 * V8.10 SLC-893 MT-2 — MIG-041 Schema-Verification-Test.
 *
 * Lauf-Pattern: Coolify-Test-Setup via node:20 im Business-Net, raw pg-Client
 * mit TEST_DATABASE_URL.
 *
 *   docker run --rm \
 *     --network k9f5pn5upfq7etoefb5ukbcg_business-net \
 *     -v /opt/business-system-test/cockpit:/app -w /app \
 *     -e TEST_DATABASE_URL='postgresql://postgres:<urlenc-pw>@supabase-db:5432/postgres' \
 *     node:20 npx vitest run __tests__/migrations/041-v810-documents-storage-user-scoped.test.ts
 *
 * Tests (5):
 *   1. documents-Bucket existiert in storage.buckets (MT-6 Pre-Apply-Discovery).
 *   2. Alle 4 user-scoped Policies existieren (SELECT/INSERT/UPDATE/DELETE).
 *   3. Alte authenticated_*_documents Policies sind komplett geloescht.
 *   4. USING-Clause enthaelt first-path-segment-Filter (storage.foldername).
 *   5. WITH-CHECK-Clause auf INSERT + UPDATE enthaelt first-path-segment-Filter.
 *
 * Voraussetzung: MIG-041 applied auf der TEST_DATABASE_URL-DB.
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

describe("MIG-041 — documents-Bucket user-scoped Storage-Policies", () => {
  it("documents-Bucket existiert in storage.buckets", async () => {
    const res = await client.query<{ id: string; public: boolean }>(
      `SELECT id, public FROM storage.buckets WHERE id = 'documents'`
    );
    expect(res.rowCount).toBe(1);
    expect(res.rows[0].id).toBe("documents");
    expect(res.rows[0].public).toBe(false);
  });

  it("4 user-scoped Policies existieren (SELECT/INSERT/UPDATE/DELETE)", async () => {
    const res = await client.query<{ polname: string; cmd: string }>(
      `SELECT polname, polcmd AS cmd
         FROM pg_policy
        WHERE polrelid = 'storage.objects'::regclass
          AND polname LIKE 'documents_user_%'
        ORDER BY polname`
    );

    const names = res.rows.map((r) => r.polname);
    expect(names).toEqual([
      "documents_user_delete",
      "documents_user_insert",
      "documents_user_select",
      "documents_user_update",
    ]);

    // polcmd codes: r=SELECT, a=INSERT, w=UPDATE, d=DELETE
    const cmdMap = new Map(res.rows.map((r) => [r.polname, r.cmd]));
    expect(cmdMap.get("documents_user_select")).toBe("r");
    expect(cmdMap.get("documents_user_insert")).toBe("a");
    expect(cmdMap.get("documents_user_update")).toBe("w");
    expect(cmdMap.get("documents_user_delete")).toBe("d");
  });

  it("alte authenticated_*_documents Policies sind geloescht", async () => {
    // pg_policies (View) Spalte heisst `policyname`, NICHT `polname`.
    // `polname` existiert nur in der unterliegenden pg_policy-Tabelle.
    const res = await client.query<{ policyname: string }>(
      `SELECT policyname
         FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname IN (
            'authenticated_upload_documents',
            'authenticated_read_documents',
            'authenticated_delete_documents'
          )`
    );
    expect(res.rowCount).toBe(0);
  });

  it("USING-Clause enthaelt first-path-segment-Filter auf SELECT/UPDATE/DELETE", async () => {
    const res = await client.query<{ polname: string; using_clause: string }>(
      `SELECT polname,
              pg_get_expr(polqual, polrelid) AS using_clause
         FROM pg_policy
        WHERE polrelid = 'storage.objects'::regclass
          AND polname IN (
            'documents_user_select',
            'documents_user_update',
            'documents_user_delete'
          )
        ORDER BY polname`
    );
    expect(res.rowCount).toBe(3);

    for (const row of res.rows) {
      expect(row.using_clause).toContain("bucket_id");
      expect(row.using_clause).toContain("documents");
      expect(row.using_clause).toContain("storage.foldername");
      expect(row.using_clause).toContain("auth.uid()");
    }
  });

  it("WITH-CHECK-Clause auf INSERT + UPDATE enthaelt first-path-segment-Filter", async () => {
    const res = await client.query<{ polname: string; with_check_clause: string }>(
      `SELECT polname,
              pg_get_expr(polwithcheck, polrelid) AS with_check_clause
         FROM pg_policy
        WHERE polrelid = 'storage.objects'::regclass
          AND polname IN (
            'documents_user_insert',
            'documents_user_update'
          )
        ORDER BY polname`
    );
    expect(res.rowCount).toBe(2);

    for (const row of res.rows) {
      expect(row.with_check_clause).toContain("bucket_id");
      expect(row.with_check_clause).toContain("documents");
      expect(row.with_check_clause).toContain("storage.foldername");
      expect(row.with_check_clause).toContain("auth.uid()");
    }
  });
});
