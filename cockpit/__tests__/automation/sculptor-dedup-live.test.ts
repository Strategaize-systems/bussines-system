/**
 * V7.5 SLC-752 MT-7 — Live-DB-Test fuer sculptor-dedup gegen Coolify-DB.
 *
 * Pattern uebernommen aus __tests__/team/aggregate-queries.test.ts:
 *   - pg.Client direkt (NICHT supabase-js)
 *   - Test-User-UUID fest, INSERT-DELETE als Setup/Teardown
 *
 * Run-Profil: `npm run test:rls` ODER via node:20 Docker im Coolify-Netzwerk
 * (siehe Dev-System rule `coolify-test-setup.md`).
 *
 * Vorlauf: MIG-036 muss auf der Test-DB applied sein (created_via-Spalte
 * existiert).
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Client } from "pg";

import {
  DuplicateRuleError,
  assertNotDuplicateRule,
  type DedupCandidate,
} from "@/lib/automation/sculptor-dedup";
import type { Action, Condition, TriggerEvent } from "@/types/automation";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000ded"; // sentinel — kein realer User
const TEST_RULE_NAME = "SLC-752-MT7-Live-Test-Rule";

let client: Client;

const SAMPLE_CONDITIONS: Condition[] = [
  { field: "value", op: "gt", value: 1000 },
];
const SAMPLE_ACTIONS: Action[] = [
  {
    type: "create_task",
    params: { title: "Live-Test Follow-up", due_in_days: 2, assignee: "deal_owner" },
  },
];
const SAMPLE_TRIGGER: TriggerEvent = "deal.stage_changed";

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
  // Cleanup: alle Test-Rules fuer diesen Test-User entfernen.
  await client.query("DELETE FROM automation_rules WHERE created_by = $1 AND name = $2", [
    TEST_USER_ID,
    TEST_RULE_NAME,
  ]);
});

async function insertTestRule(): Promise<string> {
  const res = await client.query(
    `INSERT INTO automation_rules
       (name, status, trigger_event, trigger_config, conditions, actions, created_by, created_via)
     VALUES ($1, 'paused', $2, '{}'::jsonb, $3::jsonb, $4::jsonb, $5, 'nl_sculptor')
     RETURNING id`,
    [
      TEST_RULE_NAME,
      SAMPLE_TRIGGER,
      JSON.stringify(SAMPLE_CONDITIONS),
      JSON.stringify(SAMPLE_ACTIONS),
      TEST_USER_ID,
    ]
  );
  return res.rows[0].id as string;
}

async function fetchCandidatesViaPg(
  userId: string,
  name: string,
  trigger_event: TriggerEvent
): Promise<DedupCandidate[]> {
  const res = await client.query(
    `SELECT id, conditions, actions FROM automation_rules
     WHERE created_by = $1 AND name = $2 AND trigger_event = $3`,
    [userId, name, trigger_event]
  );
  return res.rows.map((r) => ({
    id: r.id as string,
    conditions: r.conditions as Condition[],
    actions: r.actions as Action[],
  }));
}

describe("sculptor-dedup Live-DB (V7.5 SLC-752 MT-7)", () => {
  it("MIG-036 created_via='nl_sculptor' Insert funktioniert + Default-Check", async () => {
    // Insert one rule, verify created_via persists
    const insertedId = await insertTestRule();
    const res = await client.query(
      "SELECT created_via FROM automation_rules WHERE id = $1",
      [insertedId]
    );
    expect(res.rows[0].created_via).toBe("nl_sculptor");
  });

  it("identische Rule -> DuplicateRuleError nach Re-Insert-Versuch", async () => {
    await insertTestRule();
    const candidates = await fetchCandidatesViaPg(TEST_USER_ID, TEST_RULE_NAME, SAMPLE_TRIGGER);
    expect(candidates.length).toBe(1);
    expect(() =>
      assertNotDuplicateRule(
        candidates,
        {
          name: TEST_RULE_NAME,
          trigger_event: SAMPLE_TRIGGER,
          conditions: SAMPLE_CONDITIONS,
          actions: SAMPLE_ACTIONS,
        },
        TEST_USER_ID
      )
    ).toThrow(DuplicateRuleError);
  });

  it("distinct Rule (verschiedene actions) -> kein Duplicate", async () => {
    await insertTestRule();
    const candidates = await fetchCandidatesViaPg(TEST_USER_ID, TEST_RULE_NAME, SAMPLE_TRIGGER);
    const distinctActions: Action[] = [
      {
        type: "create_task",
        params: { title: "Anderer Task-Title", due_in_days: 7 },
      },
    ];
    expect(() =>
      assertNotDuplicateRule(
        candidates,
        {
          name: TEST_RULE_NAME,
          trigger_event: SAMPLE_TRIGGER,
          conditions: SAMPLE_CONDITIONS,
          actions: distinctActions,
        },
        TEST_USER_ID
      )
    ).not.toThrow();
  });

  it("Fetcher returnt leer fuer fremden User", async () => {
    await insertTestRule();
    const candidates = await fetchCandidatesViaPg(
      "11111111-1111-1111-1111-111111111111",
      TEST_RULE_NAME,
      SAMPLE_TRIGGER
    );
    expect(candidates.length).toBe(0);
  });
});
