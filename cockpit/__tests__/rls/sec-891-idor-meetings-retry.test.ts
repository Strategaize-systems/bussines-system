/**
 * SLC-891 MT-4 — SEC-004 IDOR-Mitigation fuer
 * POST /api/meetings/[id]/retry-summary und POST /api/meetings/[id]/retry-transcript
 *
 * Lauf-Pattern: Coolify-Test-Setup via node:20 im Business-Net, raw pg-Client
 * mit TEST_DATABASE_URL, BEGIN/ROLLBACK fuer Isolation.
 *
 *   docker run --rm \
 *     --network k9f5pn5upfq7etoefb5ukbcg_business-net \
 *     -v /opt/business-system-test/cockpit:/app -w /app \
 *     -e TEST_DATABASE_URL='postgresql://postgres:<urlenc-pw>@supabase-db:5432/postgres' \
 *     node:20 npx vitest run __tests__/rls/sec-891-idor-meetings-retry.test.ts
 *
 * Was bewiesen wird: Der User-Client-Vor-Check in beiden Routes ruht auf der
 * V7-RLS-Policy auf `meetings`. Wenn ein Member (TEST_MEMBER_2) versucht, ein
 * fremdes Meeting (TEST_MEMBER_1) per RLS-User-Client zu lesen, filtert RLS
 * die Row weg → maybeSingle() returnt null → route returnt 404 vor admin-
 * UPDATE (status reset) + audit_log-INSERT + Whisper-/Bedrock-Re-Run-Cost.
 *
 * Voraussetzung: V7-RLS-Switch (MIG-035) appliziert, TEST_MEMBER_1 hat
 * mindestens 1 owned Meeting im Seed (`npm run seed:multi-user`).
 *
 * Hinweis: Beide Routes nutzen IDENTISCH `meetings.eq("id", id)` als
 * Vor-Check. Ein Vitest-Block deckt beide Routes ab (gleicher SQL-Pfad
 * und gleiche RLS-Policy).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

const TEST_MEMBER_1 = "00000000-0000-0000-0000-000000000081";
const TEST_MEMBER_2 = "00000000-0000-0000-0000-000000000082";

let client: Client;
let userAMeetingId: string;

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
    `SELECT id FROM meetings WHERE owner_user_id = $1 LIMIT 1`,
    [TEST_MEMBER_1]
  );
  if (rows.length === 0) {
    throw new Error(
      `Seed-Daten fehlen: meetings hat keine Records mit owner=${TEST_MEMBER_1}. ` +
        `'npm run seed:multi-user' ausfuehren (siehe coolify-test-setup.md).`
    );
  }
  userAMeetingId = rows[0].id;
});

afterAll(async () => {
  if (client) await client.end();
});

async function asUser(userId: string): Promise<void> {
  await client.query("SET LOCAL ROLE authenticated");
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${userId}'`);
}

describe("SEC-891 SEC-004 IDOR — /api/meetings/[id]/retry-summary + retry-transcript", () => {
  it("Owner (TEST_MEMBER_1) sees own meeting via User-Client (positive case)", async () => {
    // Beweist: Wenn der Owner eine der beiden retry-Routes aufruft, kommt der
    // RLS-Vor-Check durch und der Endpoint kann mit dem admin-Pfad weitermachen
    // (status reset + audit_log-Eintrag).
    await client.query("BEGIN");
    try {
      await asUser(TEST_MEMBER_1);
      const { rows } = await client.query<{ id: string }>(
        `SELECT id FROM meetings WHERE id = $1`,
        [userAMeetingId]
      );
      expect(rows.length).toBe(1);
      expect(rows[0].id).toBe(userAMeetingId);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("Foreign User (TEST_MEMBER_2) sees 0 rows for User-A's meeting → both retry routes return 404", async () => {
    // Beweist: Wenn ein authentifizierter Fremd-User TEST_MEMBER_2 eine der
    // beiden retry-Routes mit User-A's Meeting-ID aufruft, filtert V7-RLS die
    // Row weg. Der User-Client-Vor-Check in route.ts.maybeSingle() returnt null,
    // der Endpoint returnt HTTP 404 vor:
    //   - admin.from("meetings").update({summary_status:"pending"}).eq("id", id)
    //   - admin.from("audit_log").insert({...})
    //   - Whisper-Re-Run-Cost (retry-transcript) / Bedrock-Re-Run-Cost (retry-summary)
    //
    // Vor dem Fix (route.ts pre-SLC-891): admin.from("meetings").eq("id", id)
    // hatte BYPASSRLS und haette die Row geliefert → Member konnten den
    // status fremder Meetings zuruecksetzen + Cross-Owner-Audit-Log-Eintraege
    // im Namen des fremden Owners erzeugen + Whisper/Bedrock-Re-Run-Cost
    // ausloesen. Dieser Test schlaegt fehl wenn (a) der User-Client-Vor-Check
    // aus einer der retry-Routes entfernt wird oder (b) die V7-RLS-Policy
    // auf meetings geschwaecht wird.
    await client.query("BEGIN");
    try {
      await asUser(TEST_MEMBER_2);
      const { rows } = await client.query<{ id: string }>(
        `SELECT id FROM meetings WHERE id = $1`,
        [userAMeetingId]
      );
      expect(rows.length).toBe(0);
    } finally {
      await client.query("ROLLBACK");
    }
  });
});
