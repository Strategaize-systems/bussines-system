/**
 * SLC-891 MT-2 — SEC-002 IDOR-Mitigation fuer
 * POST /api/signals/extract
 *
 * Lauf-Pattern: Coolify-Test-Setup via node:20 im Business-Net, raw pg-Client
 * mit TEST_DATABASE_URL, BEGIN/ROLLBACK fuer Isolation.
 *
 *   docker run --rm \
 *     --network k9f5pn5upfq7etoefb5ukbcg_business-net \
 *     -v /opt/business-system-test/cockpit:/app -w /app \
 *     -e TEST_DATABASE_URL='postgresql://postgres:<urlenc-pw>@supabase-db:5432/postgres' \
 *     node:20 npx vitest run __tests__/rls/sec-891-idor-signals-extract.test.ts
 *
 * Was bewiesen wird: Der User-Client-Vor-Check in route.ts ruht auf der
 * V7-RLS-Policy auf `deals`. Wenn ein Member (TEST_MEMBER_2) versucht,
 * einen fremden Deal (TEST_MEMBER_1) per RLS-User-Client zu lesen,
 * filtert RLS die Row weg → maybeSingle() returnt null → route returnt 404
 * vor jeder Bedrock-Cost (extractSignals laeuft N-mal pro Meeting+Email).
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

  // Bootstrap: ein bestehendes TEST_MEMBER_1-owned Deal aus Seed holen.
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

describe("SEC-891 SEC-002 IDOR — /api/signals/extract", () => {
  it("Owner (TEST_MEMBER_1) sees own deal via User-Client (positive case)", async () => {
    // Beweist: Wenn der Owner die Route aufruft, kommt der RLS-Vor-Check
    // durch und der Endpoint kann mit dem admin-Pfad (extractSignals) weitermachen.
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
    // mit User-A's deal_id aufruft, filtert V7-RLS die Row weg. Der User-Client-
    // Vor-Check in route.ts.maybeSingle() returnt null, der Endpoint returnt
    // HTTP 404 vor dem ersten Bedrock-Call.
    //
    // Vor dem Fix (route.ts pre-SLC-891): admin.from("deals").eq("id", body.deal_id)
    // hat BYPASSRLS und haette die Row geliefert → extractSignals haette N-mal
    // Bedrock-Cost auf fremden Meetings + Emails verursacht + Cross-Owner-
    // Signal-Persistenz. Dieser Test schlaegt fehl wenn (a) der User-Client-
    // Vor-Check aus route.ts entfernt wird oder (b) die V7-RLS-Policy auf
    // deals geschwaecht wird.
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
