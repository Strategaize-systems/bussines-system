/**
 * V8.4 SLC-841 MT-3 — legal_documents RLS-Live-DB-Test.
 *
 * Lauf-Pattern: Coolify-Test-Setup via node:20 im Business-Net, raw pg-Client
 * mit TEST_DATABASE_URL, SAVEPOINT fuer expected RLS-Rejections.
 *
 *   docker run --rm \
 *     --network k9f5pn5upfq7etoefb5ukbcg_business-net \
 *     -v /opt/business-system-test/cockpit:/app -w /app \
 *     -e TEST_DATABASE_URL='postgresql://postgres:<urlenc-pw>@supabase-db:5432/postgres' \
 *     node:20 npx vitest run __tests__/rls/legal-documents-rls.test.ts
 *
 * Test-Fixtures (V7 Seed):
 *   Tenant-A = Test-Team-077, Member-A = ...081, Admin-A = ...0ba001
 *   Tenant-B wird in beforeAll als temporaere teams-Row angelegt + nach Tests
 *   geloescht (CASCADE entfernt FK-abhaengige Test-DSE-Rows).
 *
 * Tests (7):
 *   1. Tenant-A-Admin INSERT customer-dse fuer eigenen Tenant -> allowed.
 *   2. Tenant-A-Member INSERT -> blocked (RLS-Policy admin_mutate).
 *   3. Tenant-A-Member SELECT eigenen Tenant -> 1+ Row.
 *   4. Tenant-A-Member SELECT Tenant-B-DSE -> 0 Rows (cross-tenant isolation).
 *   5. Tenant-A-Member UPDATE eigene Row -> 0 affected (admin-only mutate).
 *   6. UNIQUE(tenant_team_id, kind): 2x INSERT customer-dse fuer gleichen
 *      Tenant -> 23505.
 *   7. FK auf teams ist ON DELETE CASCADE (confdeltype='c').
 *
 * Voraussetzung: MIG-038 appliedet, V7 Seed-Profiles + Test-Team-077 da.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Client } from "pg";

const TENANT_A_TEAM_ID = "00000000-0000-0000-0000-000000000077";
const TENANT_A_ADMIN = "00000000-0000-0000-0000-0000000ba001";
const TENANT_A_MEMBER = "00000000-0000-0000-0000-000000000081";

const TENANT_B_TEAM_ID = "00000000-0000-0000-0000-0000000b8841";
const TENANT_B_TEAM_NAME = "[TEST-SLC-841] Tenant-B";

const DSE_TEXT_A = "[TEST-SLC-841] DSE-Markdown von Tenant A";
const DSE_TEXT_B = "[TEST-SLC-841] DSE-Markdown von Tenant B";

let client: Client;

// V8.6 SLC-861 MT-1 (ISSUE-084-Fix): MIG-038 Phase-5 Default-Seed legt fuer
// jedes existierende Team eine `customer-dse`-Row in legal_documents an. Diese
// Default-Seed-Rows kollidieren in den Tests mit `UNIQUE(tenant_team_id, kind)`
// wenn der Test einen weiteren INSERT versucht (4 false-negative-FAILs).
//
// Loesung: Default-Seed-Rows fuer beide Test-Tenants in beforeAll backuppen,
// in beforeEach komplett wegloeschen (Test-Tx sieht leeren State), in afterAll
// die Backup-Rows idempotent re-inserten → Production-Default-Seed restauriert.
type DefaultSeedRow = {
  id: string;
  tenant_team_id: string;
  kind: string;
  content_md: string;
  updated_by: string | null;
  updated_at: Date;
};
let defaultSeedRows: DefaultSeedRow[] = [];

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL nicht gesetzt — Setup laut .claude/rules/coolify-test-setup.md noetig."
    );
  }
  client = new Client({ connectionString: url });
  await client.connect();

  // Tenant-B als temporaere teams-Row anlegen (idempotent).
  await client.query(
    `INSERT INTO teams (id, name, slug)
     VALUES ($1, $2, 'test-slc-841-tenant-b')
     ON CONFLICT (id) DO NOTHING`,
    [TENANT_B_TEAM_ID, TENANT_B_TEAM_NAME]
  );

  // Default-Seed-Rows beider Test-Tenants backuppen (MIG-038 Phase 5).
  const backup = await client.query(
    `SELECT id, tenant_team_id, kind, content_md, updated_by, updated_at
       FROM legal_documents
      WHERE tenant_team_id IN ($1, $2)`,
    [TENANT_A_TEAM_ID, TENANT_B_TEAM_ID]
  );
  defaultSeedRows = backup.rows;
});

afterAll(async () => {
  if (!client) return;
  // Test-Markierte Rows weg (idempotent, falls Tests sie liegen liessen).
  await client.query(
    "DELETE FROM legal_documents WHERE content_md LIKE '[TEST-SLC-841]%'"
  );
  // Default-Seed-Rows restaurieren (idempotent via ON CONFLICT DO NOTHING).
  for (const row of defaultSeedRows) {
    await client.query(
      `INSERT INTO legal_documents
         (id, tenant_team_id, kind, content_md, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [row.id, row.tenant_team_id, row.kind, row.content_md, row.updated_by, row.updated_at]
    );
  }
  // Cleanup Tenant-B (CASCADE entfernt evtl. nicht-restaurierte Test-DSE-Rows).
  await client.query("DELETE FROM teams WHERE id = $1", [TENANT_B_TEAM_ID]);
  await client.end();
});

beforeEach(async () => {
  // V8.6 SLC-861: leeren State herstellen — Default-Seed-Rows + Test-Rows
  // beider Test-Tenants weg. afterAll restauriert die Default-Seeds idempotent.
  await client.query(
    "DELETE FROM legal_documents WHERE tenant_team_id IN ($1, $2)",
    [TENANT_A_TEAM_ID, TENANT_B_TEAM_ID]
  );
});

async function asUser(userId: string): Promise<void> {
  await client.query("SET LOCAL ROLE authenticated");
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${userId}'`);
}

describe("legal_documents RLS — Multi-Tenant DSE Isolation", () => {
  it("Tenant-A-Admin can INSERT customer-dse for own tenant", async () => {
    await client.query("BEGIN");
    try {
      await asUser(TENANT_A_ADMIN);
      const ins = await client.query(
        `INSERT INTO legal_documents (tenant_team_id, kind, content_md, updated_by)
         VALUES ($1, 'customer-dse', $2, $3) RETURNING id`,
        [TENANT_A_TEAM_ID, DSE_TEXT_A, TENANT_A_ADMIN]
      );
      expect(ins.rowCount).toBe(1);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("Tenant-A-Member INSERT is blocked by admin_mutate policy", async () => {
    await client.query("BEGIN");
    try {
      await asUser(TENANT_A_MEMBER);

      let errorMessage: string | null = null;
      await client.query("SAVEPOINT member_insert");
      try {
        await client.query(
          `INSERT INTO legal_documents (tenant_team_id, kind, content_md)
           VALUES ($1, 'customer-dse', $2)`,
          [TENANT_A_TEAM_ID, DSE_TEXT_A]
        );
      } catch (e) {
        errorMessage = (e as Error).message;
      }
      await client.query("ROLLBACK TO SAVEPOINT member_insert");

      expect(errorMessage).toMatch(/row-level security policy/i);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("Tenant-A-Member can SELECT own tenant DSE row", async () => {
    await client.query("BEGIN");
    try {
      // Seed: admin inserts Tenant-A row.
      await asUser(TENANT_A_ADMIN);
      await client.query(
        `INSERT INTO legal_documents (tenant_team_id, kind, content_md)
         VALUES ($1, 'customer-dse', $2)`,
        [TENANT_A_TEAM_ID, DSE_TEXT_A]
      );

      // Switch zu Member.
      await asUser(TENANT_A_MEMBER);
      const sel = await client.query(
        "SELECT id, content_md FROM legal_documents WHERE tenant_team_id = $1",
        [TENANT_A_TEAM_ID]
      );
      expect(sel.rowCount).toBeGreaterThanOrEqual(1);
      expect(sel.rows.some((r) => r.content_md === DSE_TEXT_A)).toBe(true);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("Tenant-A-Member SELECT for Tenant-B-DSE -> 0 rows (cross-tenant isolation)", async () => {
    await client.query("BEGIN");
    try {
      // Seed Tenant-B-Row als postgres (bypass RLS).
      await client.query("RESET ROLE");
      await client.query(
        `INSERT INTO legal_documents (tenant_team_id, kind, content_md)
         VALUES ($1, 'customer-dse', $2)`,
        [TENANT_B_TEAM_ID, DSE_TEXT_B]
      );

      // Tenant-A-Member darf Tenant-B nicht sehen.
      await asUser(TENANT_A_MEMBER);
      const sel = await client.query(
        "SELECT id FROM legal_documents WHERE tenant_team_id = $1",
        [TENANT_B_TEAM_ID]
      );
      expect(sel.rowCount).toBe(0);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("Tenant-A-Member UPDATE on own row -> 0 affected (admin-only mutate)", async () => {
    await client.query("BEGIN");
    try {
      await asUser(TENANT_A_ADMIN);
      const ins = await client.query(
        `INSERT INTO legal_documents (tenant_team_id, kind, content_md)
         VALUES ($1, 'customer-dse', $2) RETURNING id`,
        [TENANT_A_TEAM_ID, DSE_TEXT_A]
      );
      const targetId = ins.rows[0].id;

      await asUser(TENANT_A_MEMBER);
      const upd = await client.query(
        "UPDATE legal_documents SET content_md = '[TEST-SLC-841] hijacked by member' WHERE id = $1",
        [targetId]
      );
      expect(upd.rowCount).toBe(0);

      await client.query("RESET ROLE");
      const after = await client.query(
        "SELECT content_md FROM legal_documents WHERE id = $1",
        [targetId]
      );
      expect(after.rows[0].content_md).toBe(DSE_TEXT_A);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("UNIQUE(tenant_team_id, kind): duplicate INSERT for same tenant -> 23505", async () => {
    await client.query("BEGIN");
    try {
      await asUser(TENANT_A_ADMIN);
      await client.query(
        `INSERT INTO legal_documents (tenant_team_id, kind, content_md)
         VALUES ($1, 'customer-dse', $2)`,
        [TENANT_A_TEAM_ID, DSE_TEXT_A]
      );

      let errorCode: string | null = null;
      let errorMessage: string | null = null;
      await client.query("SAVEPOINT dup_insert");
      try {
        await client.query(
          `INSERT INTO legal_documents (tenant_team_id, kind, content_md)
           VALUES ($1, 'customer-dse', $2)`,
          [TENANT_A_TEAM_ID, DSE_TEXT_A + " (dup)"]
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

  it("FK teams(id) is ON DELETE CASCADE (confdeltype='c')", async () => {
    const r = await client.query(
      `SELECT confdeltype FROM pg_constraint
       WHERE conrelid = 'public.legal_documents'::regclass
         AND contype = 'f'
         AND conname = 'legal_documents_tenant_team_id_fkey'`
    );
    expect(r.rowCount).toBe(1);
    expect(r.rows[0].confdeltype).toBe("c");
  });
});
