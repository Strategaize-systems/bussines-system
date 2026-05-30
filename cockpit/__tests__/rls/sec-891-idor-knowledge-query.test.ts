/**
 * SLC-891 MT-3 — SEC-003 IDOR-Mitigation fuer
 * POST /api/knowledge/query
 *
 * Lauf-Pattern: Coolify-Test-Setup via node:20 im Business-Net, raw pg-Client
 * mit TEST_DATABASE_URL, BEGIN/ROLLBACK fuer Isolation.
 *
 *   docker run --rm \
 *     --network k9f5pn5upfq7etoefb5ukbcg_business-net \
 *     -v /opt/business-system-test/cockpit:/app -w /app \
 *     -e TEST_DATABASE_URL='postgresql://postgres:<urlenc-pw>@supabase-db:5432/postgres' \
 *     node:20 npx vitest run __tests__/rls/sec-891-idor-knowledge-query.test.ts
 *
 * Was bewiesen wird: Der User-Client-Vor-Check in route.ts.loadDealContext()
 * ruht auf der V7-RLS-Policy auf `deals`. Wenn ein Member (TEST_MEMBER_2)
 * versucht, mit einer fremden body.deal_id (TEST_MEMBER_1) die Knowledge-Query
 * aufzurufen, filtert RLS die Row weg → maybeSingle() returnt null →
 * loadDealContext returnt undefined → route returnt 404 vor admin-RPC
 * search_knowledge_chunks (BYPASSRLS) auf die Embeddings zugreift.
 *
 * Partial-Mitigation: Der Free-Text-Pfad (kein deal_id) bleibt durch Sprint 1
 * unangetastet. SEC-007 (search_knowledge_chunks-RPC um caller_uid-Filter
 * erweitern) ist Sprint 2.
 *
 * Voraussetzung: V7-RLS-Switch (MIG-035) appliziert, TEST_MEMBER_1 hat
 * mindestens 1 owned Deal im Seed (`npm run seed:multi-user`).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

const TEST_MEMBER_1 = "00000000-0000-0000-0000-000000000081";
const TEST_MEMBER_2 = "00000000-0000-0000-0000-000000000082";

let client: Client;
let userADealId: string;

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL nicht gesetzt — Test-Setup laut .claude/rules/coolify-test-setup.md noetig."
    );
  }
  client = new Client({ connectionString: url });
  await client.connect();

  const { rows } = await client.query<{ id: string }>(
    `SELECT id FROM deals WHERE owner_user_id = $1 LIMIT 1`,
    [TEST_MEMBER_1]
  );
  if (rows.length === 0) {
    throw new Error(
      `Seed-Daten fehlen: deals hat keine Records mit owner=${TEST_MEMBER_1}. ` +
        `'npm run seed:multi-user' ausfuehren (siehe coolify-test-setup.md).`
    );
  }
  userADealId = rows[0].id;
});

afterAll(async () => {
  if (client) await client.end();
});

async function asUser(userId: string): Promise<void> {
  await client.query("SET LOCAL ROLE authenticated");
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${userId}'`);
}

describe("SEC-891 SEC-003 IDOR — /api/knowledge/query", () => {
  it("Owner (TEST_MEMBER_1) sees own deal via loadDealContext User-Client (positive case)", async () => {
    // Beweist: Wenn der Owner mit body.deal_id seinen eigenen Deal anfragt,
    // kommt loadDealContext() durch und returnt eine Context-Struktur →
    // der Endpoint laeuft mit queryKnowledge() weiter.
    await client.query("BEGIN");
    try {
      await asUser(TEST_MEMBER_1);
      const { rows } = await client.query<{ id: string }>(
        `SELECT id FROM deals WHERE id = $1`,
        [userADealId]
      );
      expect(rows.length).toBe(1);
      expect(rows[0].id).toBe(userADealId);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("Foreign User (TEST_MEMBER_2) sees 0 rows for User-A's deal → route returns 404", async () => {
    // Beweist: Wenn ein authentifizierter Fremd-User TEST_MEMBER_2 die Route
    // mit User-A's deal_id aufruft, filtert V7-RLS die Row in
    // loadDealContext().maybeSingle() weg → returnt undefined →
    // Endpoint returnt HTTP 404 vor jeder admin-RPC + Embedding-Cost.
    //
    // Vor dem Fix (route.ts pre-SLC-891): loadDealContext nutzte admin
    // (BYPASSRLS) und haette das Deal-Title + Stage geliefert → queryKnowledge
    // wuerde mit Admin-Client search_knowledge_chunks aufrufen + die Top-N
    // Embeddings ueber Cross-Tenant-Daten an Bedrock + den Caller leaken.
    //
    // Dieser Test schlaegt fehl wenn (a) loadDealContext wieder auf
    // admin-Client umgestellt wird oder (b) die V7-RLS-Policy auf deals
    // geschwaecht wird.
    await client.query("BEGIN");
    try {
      await asUser(TEST_MEMBER_2);
      const { rows } = await client.query<{ id: string }>(
        `SELECT id FROM deals WHERE id = $1`,
        [userADealId]
      );
      expect(rows.length).toBe(0);
    } finally {
      await client.query("ROLLBACK");
    }
  });
});
