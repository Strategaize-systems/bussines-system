/**
 * SLC-903 MT-5 Block 3 — V8.11 Klasse-C RLS-Matrix: 108 Polymorph/Special-Cases-Tests.
 *
 * Matrix: 9 Block-3-Tabellen × 3 Rollen × 4 Operationen = 108 Tests.
 *
 * Pattern-Quelle: v8-11-slc-903a + 903b. Block-3 hat 5 unterschiedliche Sub-Pattern:
 *   - STANDARD (can_see_owner via Parent): ai_action_queue, ai_feedback, documents
 *   - KLASSE-A-STIL (created_by/assessed_by = auth.uid() OR is_admin): campaigns, fit_assessments
 *   - TRANSITIVE-CREATED-BY: campaign_links (campaigns.created_by-Pfad)
 *   - ADMIN-ONLY-READ+DELETE / SERVICE-ROLE-ONLY-WRITE: campaign_link_clicks, automation_runs, email_sync_state
 *
 * Erwartungs-Matrix:
 *   - STANDARD: admin/teamlead allowed (Team-can_see_owner via member_1-Parent), member_2 denied
 *   - KLASSE-A-STIL: admin allowed (is_admin), teamlead/member_2 denied
 *   - ADMIN-ONLY: admin SELECT+DELETE allowed, admin INSERT denied (WITH CHECK false),
 *                 admin UPDATE 0-affected (USING false), teamlead/member denied alle 4 Ops
 *
 * Pre-Apply Done-Gate (post-MIG-047b): 11.  Post-MIG-047c Done-Gate: 2.
 *
 * Voraussetzung: MIG-047a + MIG-047b + MIG-047c applied, V7-Helper LIVE, V5.3-Seed.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

type Role = "admin" | "teamlead" | "member";
type Op = "SELECT" | "INSERT" | "UPDATE" | "DELETE";
type Table =
  | "ai_action_queue"
  | "ai_feedback"
  | "campaigns"
  | "campaign_links"
  | "campaign_link_clicks"
  | "automation_runs"
  | "fit_assessments"
  | "documents"
  | "email_sync_state";

const TEST_TEAMLEAD_ID = "00000000-0000-0000-0000-000000000078";
const TEST_MEMBER_1 = "00000000-0000-0000-0000-000000000081";
const TEST_MEMBER_2 = "00000000-0000-0000-0000-000000000082";

const TABLES: Table[] = [
  "ai_action_queue",
  "ai_feedback",
  "campaigns",
  "campaign_links",
  "campaign_link_clicks",
  "automation_runs",
  "fit_assessments",
  "documents",
  "email_sync_state",
];
const OPS: Op[] = ["SELECT", "INSERT", "UPDATE", "DELETE"];

const PK_COLUMN: Record<Table, string> = {
  ai_action_queue: "id",
  ai_feedback: "id",
  campaigns: "id",
  campaign_links: "id",
  campaign_link_clicks: "id",
  automation_runs: "id",
  fit_assessments: "id",
  documents: "id",
  email_sync_state: "id",
};

const UPDATE_SETTERS: Record<Table, string> = {
  ai_action_queue: "type = type",
  ai_feedback: "feedback_type = feedback_type",
  campaigns: "name = name",
  campaign_links: "target_url = target_url",
  campaign_link_clicks: "link_id = link_id",
  automation_runs: "status = status",
  fit_assessments: "entity_type = entity_type",
  documents: "name = name",
  email_sync_state: "folder = folder",
};

type Expected = { admin: boolean; teamlead: boolean; member: boolean };

const STANDARD: Record<Op, Expected> = {
  SELECT: { admin: true, teamlead: true, member: false },
  INSERT: { admin: true, teamlead: true, member: false },
  UPDATE: { admin: true, teamlead: true, member: false },
  DELETE: { admin: true, teamlead: true, member: false },
};
const KLASSE_A_STIL: Record<Op, Expected> = {
  SELECT: { admin: true, teamlead: false, member: false },
  INSERT: { admin: true, teamlead: false, member: false },
  UPDATE: { admin: true, teamlead: false, member: false },
  DELETE: { admin: true, teamlead: false, member: false },
};
const ADMIN_ONLY: Record<Op, Expected> = {
  SELECT: { admin: true, teamlead: false, member: false },
  INSERT: { admin: false, teamlead: false, member: false }, // WITH CHECK false
  UPDATE: { admin: false, teamlead: false, member: false }, // USING false
  DELETE: { admin: true, teamlead: false, member: false },
};

const EXPECTED_PER_TABLE: Record<Table, Record<Op, Expected>> = {
  ai_action_queue: STANDARD,
  ai_feedback: STANDARD,
  campaigns: KLASSE_A_STIL,
  campaign_links: KLASSE_A_STIL,
  campaign_link_clicks: ADMIN_ONLY,
  automation_runs: ADMIN_ONLY,
  fit_assessments: KLASSE_A_STIL,
  documents: STANDARD,
  email_sync_state: ADMIN_ONLY,
};

interface InsertFixture {
  columns: string[];
  values: unknown[];
}

let client: Client;
let realAdminId: string;
let memberDealId: string;
let memberCampaignId: string;
let memberCampaignLinkId: string;
let memberAutomationRuleId: string;
let memberAiActionQueueId: string;
let memberFitAssessmentId: string;
const targetIds: Partial<Record<Table, string>> = {};
const bootstrappedIds: Partial<Record<Table, string>> = {};

function makeInsertFixture(table: Table): InsertFixture {
  const rand = `SLC903c_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  switch (table) {
    case "ai_action_queue":
      return {
        columns: ["type", "action_description", "entity_type", "entity_id", "source"],
        values: ["follow_up", rand, "deal", "__DEAL_ID__", "signal"],
      };
    case "ai_feedback":
      return {
        columns: ["feedback_type", "action_queue_id"],
        values: ["accepted", "__AI_ACTION_QUEUE_ID__"],
      };
    case "campaigns":
      return {
        columns: ["name", "type", "start_date", "status", "created_by"],
        values: [rand, "email", new Date().toISOString().slice(0, 10), "draft", "__MEMBER_1__"],
      };
    case "campaign_links":
      return {
        columns: ["campaign_id", "token", "target_url", "utm_source", "utm_medium", "utm_campaign", "click_count"],
        values: ["__CAMPAIGN_ID__", rand.slice(0, 32), "https://x", "test", "test", "test", 0],
      };
    case "campaign_link_clicks":
      return {
        columns: ["link_id", "clicked_at"],
        values: ["__CAMPAIGN_LINK_ID__", new Date().toISOString()],
      };
    case "automation_runs":
      return {
        columns: ["rule_id", "trigger_event", "trigger_entity_type", "trigger_entity_id", "status", "started_at", "action_results"],
        values: ["__AUTOMATION_RULE_ID__", "deal.created", "deal", "__DEAL_ID__", "pending", new Date().toISOString(), "[]"],
      };
    case "fit_assessments":
      return {
        columns: ["entity_type", "entity_id", "assessed_by"],
        values: ["deal", "__DEAL_ID__", "__MEMBER_1__"],
      };
    case "documents":
      return {
        columns: ["name", "file_path", "deal_id"],
        values: [rand, `slc903c/${rand}`, "__DEAL_ID__"],
      };
    case "email_sync_state":
      return {
        columns: ["folder"],
        values: [rand],
      };
  }
}

function substitute(values: unknown[]): unknown[] {
  return values.map((v) => {
    if (v === "__DEAL_ID__") return memberDealId;
    if (v === "__CAMPAIGN_ID__") return memberCampaignId;
    if (v === "__CAMPAIGN_LINK_ID__") return memberCampaignLinkId;
    if (v === "__AUTOMATION_RULE_ID__") return memberAutomationRuleId;
    if (v === "__AI_ACTION_QUEUE_ID__") return memberAiActionQueueId;
    if (v === "__MEMBER_1__") return TEST_MEMBER_1;
    return v;
  });
}

async function getOrCreate(
  sql: string,
  params: unknown[],
  fallback: () => Promise<string>,
): Promise<string> {
  const r = await client.query<{ id: string }>(sql, params);
  if (r.rows.length > 0) return r.rows[0].id;
  return await fallback();
}

async function bootstrapFixtures(): Promise<void> {
  // Member-1-owned Deal
  memberDealId = await getOrCreate(
    `SELECT id::TEXT AS id FROM deals WHERE owner_user_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [TEST_MEMBER_1],
    async () => {
      const r = await client.query<{ id: string }>(
        `INSERT INTO deals (title, owner_user_id, value, status)
           VALUES ('SLC903c_BOOTSTRAP_DEAL', $1, 0, 'open') RETURNING id::TEXT AS id`,
        [TEST_MEMBER_1],
      );
      return r.rows[0].id;
    },
  );

  // Member-1-created Campaign
  memberCampaignId = await getOrCreate(
    `SELECT id::TEXT AS id FROM campaigns WHERE created_by = $1 ORDER BY created_at ASC LIMIT 1`,
    [TEST_MEMBER_1],
    async () => {
      const r = await client.query<{ id: string }>(
        `INSERT INTO campaigns (name, type, start_date, status, created_by)
           VALUES ('SLC903c_BOOTSTRAP_CAMPAIGN', 'email', CURRENT_DATE, 'draft', $1)
           RETURNING id::TEXT AS id`,
        [TEST_MEMBER_1],
      );
      return r.rows[0].id;
    },
  );

  // Campaign-Link unter member_1's Campaign (fuer campaign_link_clicks-Test als FK-Target)
  memberCampaignLinkId = await getOrCreate(
    `SELECT id::TEXT AS id FROM campaign_links WHERE campaign_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [memberCampaignId],
    async () => {
      const r = await client.query<{ id: string }>(
        `INSERT INTO campaign_links (campaign_id, token, target_url, utm_source, utm_medium, utm_campaign)
           VALUES ($1, $2, 'https://x', 'test', 'test', 'test') RETURNING id::TEXT AS id`,
        [memberCampaignId, `SLC903c_BOOT_${Date.now()}`.slice(0, 32)],
      );
      return r.rows[0].id;
    },
  );

  // Automation-Rule (member_1 created) als FK-Target fuer automation_runs
  memberAutomationRuleId = await getOrCreate(
    `SELECT id::TEXT AS id FROM automation_rules WHERE created_by = $1 ORDER BY created_at ASC LIMIT 1`,
    [TEST_MEMBER_1],
    async () => {
      const r = await client.query<{ id: string }>(
        `INSERT INTO automation_rules (name, trigger_event, created_by)
           VALUES ('SLC903c_BOOTSTRAP_RULE', 'deal.created', $1) RETURNING id::TEXT AS id`,
        [TEST_MEMBER_1],
      );
      return r.rows[0].id;
    },
  );

  // Pro Tabelle persistente Bootstrap-Row anlegen.
  // Reihenfolge: ai_action_queue VOR ai_feedback (FK-Abhaengigkeit)
  const order: Table[] = [
    "ai_action_queue",
    "ai_feedback",
    "campaigns",
    "campaign_links",
    "campaign_link_clicks",
    "automation_runs",
    "fit_assessments",
    "documents",
    "email_sync_state",
  ];
  for (const table of order) {
    const fixture = makeInsertFixture(table);
    const realValues = substitute(fixture.values);
    const placeholders = realValues.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO ${table} (${fixture.columns.join(", ")}) VALUES (${placeholders}) RETURNING id::TEXT AS id`;
    const r = await client.query<{ id: string }>(sql, realValues);
    bootstrappedIds[table] = r.rows[0].id;
    targetIds[table] = r.rows[0].id;
    if (table === "ai_action_queue") {
      memberAiActionQueueId = r.rows[0].id;
    }
    if (table === "fit_assessments") {
      memberFitAssessmentId = r.rows[0].id;
    }
  }
}

async function cleanupFixtures(): Promise<void> {
  // Inverse Reihenfolge (children first)
  const cleanupOrder: Table[] = [
    "ai_feedback",
    "ai_action_queue",
    "campaign_link_clicks",
    "campaign_links",
    "campaigns",
    "automation_runs",
    "fit_assessments",
    "documents",
    "email_sync_state",
  ];
  for (const table of cleanupOrder) {
    const id = bootstrappedIds[table];
    if (id) {
      await client
        .query(`DELETE FROM ${table} WHERE ${PK_COLUMN[table]} = $1`, [id])
        .catch(() => {});
    }
  }
  // Marker-Cleanup
  await client.query(`DELETE FROM ai_action_queue WHERE action_description LIKE 'SLC903c_%'`).catch(() => {});
  await client.query(`DELETE FROM campaigns WHERE name LIKE 'SLC903c_%' OR name = 'SLC903c_BOOTSTRAP_CAMPAIGN'`).catch(() => {});
  await client.query(`DELETE FROM campaign_links WHERE token LIKE 'SLC903c_%' OR token LIKE 'SLC903c_BOOT_%'`).catch(() => {});
  await client.query(`DELETE FROM automation_rules WHERE name = 'SLC903c_BOOTSTRAP_RULE'`).catch(() => {});
  await client.query(`DELETE FROM documents WHERE name LIKE 'SLC903c_%'`).catch(() => {});
  await client.query(`DELETE FROM email_sync_state WHERE folder LIKE 'SLC903c_%'`).catch(() => {});
  await client.query(`DELETE FROM deals WHERE title = 'SLC903c_BOOTSTRAP_DEAL'`).catch(() => {});
}

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL nicht gesetzt");
  client = new Client({ connectionString: url });
  await client.connect();

  const adminRows = await client.query<{ id: string }>(
    `SELECT id FROM profiles WHERE role = 'admin' AND id NOT IN ($1, $2, $3)
       ORDER BY created_at ASC LIMIT 1`,
    [TEST_TEAMLEAD_ID, TEST_MEMBER_1, TEST_MEMBER_2],
  );
  if (adminRows.rows.length === 0) {
    throw new Error("Kein admin-Profile vorhanden — V7-Backfill fehlt?");
  }
  realAdminId = adminRows.rows[0].id;

  await bootstrapFixtures();
});

afterAll(async () => {
  try {
    await cleanupFixtures();
  } finally {
    if (client) await client.end();
  }
});

interface MatrixCase {
  table: Table;
  role: Role;
  op: Op;
  expectedAllowed: boolean;
}

const MATRIX: MatrixCase[] = TABLES.flatMap((table) =>
  OPS.flatMap((op) => {
    const ex = EXPECTED_PER_TABLE[table][op];
    return [
      { table, role: "admin" as Role, op, expectedAllowed: ex.admin },
      { table, role: "teamlead" as Role, op, expectedAllowed: ex.teamlead },
      { table, role: "member" as Role, op, expectedAllowed: ex.member },
    ];
  }),
);

function userIdFor(role: Role): string {
  switch (role) {
    case "admin":
      return realAdminId;
    case "teamlead":
      return TEST_TEAMLEAD_ID;
    case "member":
      return TEST_MEMBER_2;
  }
}

async function runOperation(
  table: Table,
  op: Op,
  targetIdValue: string,
): Promise<{ affected: number; error: string | null }> {
  await client.query("SAVEPOINT op_test");
  const pk = PK_COLUMN[table];
  try {
    if (op === "SELECT") {
      const r = await client.query(`SELECT ${pk} FROM ${table} WHERE ${pk} = $1`, [targetIdValue]);
      await client.query("RELEASE SAVEPOINT op_test");
      return { affected: r.rowCount ?? 0, error: null };
    }
    if (op === "INSERT") {
      const fixture = makeInsertFixture(table);
      const realValues = substitute(fixture.values);
      const placeholders = realValues.map((_, i) => `$${i + 1}`).join(", ");
      const sql = `INSERT INTO ${table} (${fixture.columns.join(", ")}) VALUES (${placeholders})`;
      const r = await client.query(sql, realValues);
      await client.query("RELEASE SAVEPOINT op_test");
      return { affected: r.rowCount ?? 0, error: null };
    }
    if (op === "UPDATE") {
      const r = await client.query(
        `UPDATE ${table} SET ${UPDATE_SETTERS[table]} WHERE ${pk} = $1`,
        [targetIdValue],
      );
      await client.query("RELEASE SAVEPOINT op_test");
      return { affected: r.rowCount ?? 0, error: null };
    }
    const r = await client.query(`DELETE FROM ${table} WHERE ${pk} = $1`, [targetIdValue]);
    await client.query("RELEASE SAVEPOINT op_test");
    return { affected: r.rowCount ?? 0, error: null };
  } catch (e) {
    const msg = (e as Error).message;
    await client.query("ROLLBACK TO SAVEPOINT op_test");
    return { affected: 0, error: msg };
  }
}

describe("V8.11 SLC-903 Block 3 — Klasse-C Polymorph/Admin-only/Klasse-A-Stil (108 Cases)", () => {
  it.each(MATRIX)(
    "table=$table role=$role op=$op allowed=$expectedAllowed",
    async ({ table, role, op, expectedAllowed }) => {
      const targetIdValue = targetIds[table]!;
      await client.query("BEGIN");
      try {
        await client.query("SET LOCAL ROLE authenticated");
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${userIdFor(role)}'`);

        const { affected, error } = await runOperation(table, op, targetIdValue);

        if (expectedAllowed) {
          expect(error, `unerwarteter Error: ${error}`).toBeNull();
          if (op === "INSERT") {
            expect(affected).toBe(1);
          } else {
            expect(affected).toBeGreaterThanOrEqual(1);
          }
        } else {
          if (op === "INSERT") {
            expect(error).toMatch(/row-level security/i);
          } else if (op === "UPDATE") {
            if (error) {
              expect(error).toMatch(/row-level security/i);
            } else {
              expect(affected).toBe(0);
            }
          } else {
            expect(error, `unerwarteter Error: ${error}`).toBeNull();
            expect(affected).toBe(0);
          }
        }
      } finally {
        await client.query("ROLLBACK");
      }
    },
  );
});
