/**
 * V7.5 SLC-752 MT-8 — Live-DB-Test fuer nl-history gegen Coolify-DB.
 *
 * Vorlauf: MIG-036 applied (created_via). Setup-Strategy: pg.Client direkt,
 * INSERT-DELETE pro Test, Schema-Parity-Probe ueber audit_log.
 *
 * Statt einen vollen SupabaseClient zu konstruieren, replizieren wir die
 * listNlSculptHistory-Query als raw-SQL via pg und feeden parseHistoryRow.
 * Das bewahrt Pure-Function-Test-Discipline und vermeidet supabase-js-Init
 * im RLS-Test-Profil (Node-Environment, kein Next.js-Context).
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Client } from "pg";

import { parseHistoryRow } from "@/lib/automation/nl-history";

const TEST_USER_A = "00000000-0000-0000-0000-00000000a001";
const TEST_USER_B = "00000000-0000-0000-0000-00000000b002";
const SESSION_AAA = "11111111-1111-4111-9111-111111111aaa";
const SESSION_BBB = "22222222-2222-4222-9222-222222222bbb";
const SESSION_CCC = "33333333-3333-4333-9333-333333333ccc";

let client: Client;

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL nicht gesetzt — npm run test:rls braucht die ENV.");
  client = new Client({ connectionString: url });
  await client.connect();
});

afterAll(async () => {
  if (client) await client.end();
});

afterEach(async () => {
  await client.query(
    `DELETE FROM audit_log
     WHERE action = 'automation_rule.sculpt_attempt'
       AND actor_id IN ($1::uuid, $2::uuid)`,
    [TEST_USER_A, TEST_USER_B]
  );
});

async function insertSculptAttempt(args: {
  actor: string;
  session: string;
  attempt: number;
  resultStatus: "success" | "reject" | "validation_fail" | "infra_fail";
  nlInput: string;
  modelId?: string | null;
  cost?: number;
  transcriptSource?: "text" | "voice";
}): Promise<string> {
  const metadata = {
    nl_input: args.nlInput,
    transcript_source: args.transcriptSource ?? "text",
    sculptor_model_id: args.modelId ?? "eu.anthropic.claude-sonnet-4-6-20250514-v1:0",
    sculptor_cost_usd: args.cost ?? 0.0105,
    attempt_count: args.attempt,
    result_status: args.resultStatus,
    result_payload: { name: "Live-Test Rule" },
    sculpt_session_id: args.session,
  };
  const res = await client.query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes, context)
     VALUES ($1, 'automation_rule.sculpt_attempt', 'automation_rule', $2, NULL, $3)
     RETURNING id`,
    [args.actor, args.session, JSON.stringify(metadata)]
  );
  return res.rows[0].id as string;
}

interface RawSculptRow {
  id: string;
  actor_id: string;
  created_at: string;
  entity_id: string;
  context: string | null;
}

async function fetchHistoryViaPg(
  limit: number,
  ownerScope?: string | null
): Promise<RawSculptRow[]> {
  const params: unknown[] = [limit];
  let scopeClause = "";
  if (ownerScope) {
    params.push(ownerScope);
    scopeClause = "AND actor_id = $2";
  }
  const res = await client.query(
    `SELECT id, actor_id, created_at::text AS created_at, entity_id, context
     FROM audit_log
     WHERE action = 'automation_rule.sculpt_attempt' ${scopeClause}
     ORDER BY created_at DESC
     LIMIT $1`,
    params
  );
  return res.rows as RawSculptRow[];
}

describe("nl-history Live-DB (V7.5 SLC-752 MT-8)", () => {
  it("3 INSERTs -> 3 Rows DESC, parseHistoryRow liefert alle Felder", async () => {
    await insertSculptAttempt({
      actor: TEST_USER_A,
      session: SESSION_AAA,
      attempt: 1,
      resultStatus: "success",
      nlInput: "Rule A1",
    });
    // kleine Verzoegerung um created_at-Ordering zu garantieren
    await new Promise((r) => setTimeout(r, 5));
    await insertSculptAttempt({
      actor: TEST_USER_A,
      session: SESSION_BBB,
      attempt: 1,
      resultStatus: "reject",
      nlInput: "Rule A2",
    });
    await new Promise((r) => setTimeout(r, 5));
    await insertSculptAttempt({
      actor: TEST_USER_B,
      session: SESSION_CCC,
      attempt: 2,
      resultStatus: "validation_fail",
      nlInput: "Rule B1",
    });

    const rows = await fetchHistoryViaPg(10);
    const parsed = rows.map(parseHistoryRow);
    expect(parsed.length).toBe(3);
    // DESC by created_at -> juengster zuerst
    expect(parsed[0].nl_input).toBe("Rule B1");
    expect(parsed[0].result_status).toBe("validation_fail");
    expect(parsed[0].attempt_count).toBe(2);
    expect(parsed[1].result_status).toBe("reject");
    expect(parsed[2].result_status).toBe("success");
  });

  it("ownerScope filtert auf einen actor_id", async () => {
    await insertSculptAttempt({
      actor: TEST_USER_A,
      session: SESSION_AAA,
      attempt: 1,
      resultStatus: "success",
      nlInput: "Rule A",
    });
    await insertSculptAttempt({
      actor: TEST_USER_B,
      session: SESSION_BBB,
      attempt: 1,
      resultStatus: "success",
      nlInput: "Rule B",
    });

    const rowsA = await fetchHistoryViaPg(10, TEST_USER_A);
    const parsedA = rowsA.map(parseHistoryRow);
    expect(parsedA.length).toBe(1);
    expect(parsedA[0].nl_input).toBe("Rule A");
    expect(parsedA[0].actor_id).toBe(TEST_USER_A);
  });

  it("limit beschraenkt Anzahl", async () => {
    for (let i = 0; i < 5; i++) {
      await insertSculptAttempt({
        actor: TEST_USER_A,
        session: `4${i}444444-4444-4444-9444-444444444444`,
        attempt: 1,
        resultStatus: "success",
        nlInput: `Rule ${i}`,
      });
      await new Promise((r) => setTimeout(r, 2));
    }

    const rows = await fetchHistoryViaPg(2, TEST_USER_A);
    expect(rows.length).toBe(2);
  });

  it("voice transcript_source bleibt erhalten in context-JSON", async () => {
    await insertSculptAttempt({
      actor: TEST_USER_A,
      session: SESSION_AAA,
      attempt: 1,
      resultStatus: "success",
      nlInput: "Voice-Rule",
      transcriptSource: "voice",
    });
    const rows = await fetchHistoryViaPg(10, TEST_USER_A);
    const parsed = rows.map(parseHistoryRow);
    expect(parsed[0].transcript_source).toBe("voice");
  });
});
