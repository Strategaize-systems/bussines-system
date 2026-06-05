/**
 * SLC-903 MT-5 Block 2 — V8.11 Klasse-C RLS-Matrix: 84 Proposal/Email/Cadence-FK-Tests.
 *
 * Matrix: 7 Block-2-Tabellen × 3 Rollen × 4 Operationen = 84 Tests.
 *
 * Pattern-Quelle: cockpit/__tests__/rls/v8-11-slc-903a-rls-matrix.test.ts.
 * Block-2-Drift: emails ist V7-Direct (owner_user_id-Spalte) — INSERT/UPDATE-CHECK/DELETE
 * per owner_user_id=auth.uid() OR is_admin() statt can_see_owner.
 *
 * Erwartungs-Matrix (Fixture-Rows mit Parent-FK zu TEST_MEMBER_1-owned):
 *   - admin: alle 4 Ops × 7 Tabellen allowed (is_admin).
 *   - teamlead: STANDARD-Tabellen allowed (can_see_owner via is_teamlead + same team).
 *               SPECIAL emails: SELECT/UPDATE-USING allowed (can_see_owner), aber
 *               INSERT/UPDATE-WITH-CHECK/DELETE denied (owner_user_id != teamlead).
 *   - member_2: alle denied (nicht owner, nicht teamlead, nicht admin).
 *
 * Pre-Apply Done-Gate (post-MIG-047a): 18.  Post-MIG-047b Done-Gate: 11.
 *
 * Voraussetzung: MIG-047a + MIG-047b applied, V7-Helper LIVE, V5.3-Seed + cadences.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

type Role = "admin" | "teamlead" | "member";
type Op = "SELECT" | "INSERT" | "UPDATE" | "DELETE";
type Table =
  | "proposal_items"
  | "proposal_payment_milestones"
  | "email_attachments"
  | "emails"
  | "cadence_enrollments"
  | "cadence_executions"
  | "email_tracking_events";

const TEST_TEAMLEAD_ID = "00000000-0000-0000-0000-000000000078";
const TEST_MEMBER_1 = "00000000-0000-0000-0000-000000000081";
const TEST_MEMBER_2 = "00000000-0000-0000-0000-000000000082";

const TABLES: Table[] = [
  "proposal_items",
  "proposal_payment_milestones",
  "email_attachments",
  "emails",
  "cadence_enrollments",
  "cadence_executions",
  "email_tracking_events",
];
const OPS: Op[] = ["SELECT", "INSERT", "UPDATE", "DELETE"];

const PK_COLUMN: Record<Table, string> = {
  proposal_items: "id",
  proposal_payment_milestones: "id",
  email_attachments: "id",
  emails: "id",
  cadence_enrollments: "id",
  cadence_executions: "id",
  email_tracking_events: "id",
};

const UPDATE_SETTERS: Record<Table, string> = {
  proposal_items: "snapshot_name = snapshot_name",
  proposal_payment_milestones: "due_trigger = due_trigger",
  email_attachments: "filename = filename",
  emails: "direction = direction",
  cadence_enrollments: "status = status",
  cadence_executions: "step_type = step_type",
  email_tracking_events: "event_type = event_type",
};

// Pro Tabelle × Op × Rolle: erwartete Erlaubnis. Default ist Klasse-C-Standard.
// emails ist Spezialfall (V7-Direct).
type Expected = { admin: boolean; teamlead: boolean; member: boolean };
const STANDARD_EXPECTED: Record<Op, Expected> = {
  SELECT: { admin: true, teamlead: true, member: false },
  INSERT: { admin: true, teamlead: true, member: false },
  UPDATE: { admin: true, teamlead: true, member: false },
  DELETE: { admin: true, teamlead: true, member: false },
};
const EMAILS_EXPECTED: Record<Op, Expected> = {
  // V7-Direct: USING per can_see_owner, INSERT/UPDATE-CHECK/DELETE per owner_user_id=auth.uid()
  SELECT: { admin: true, teamlead: true, member: false },
  INSERT: { admin: true, teamlead: false, member: false }, // WITH CHECK fails fuer teamlead
  UPDATE: { admin: true, teamlead: false, member: false }, // WITH CHECK fails fuer teamlead
  DELETE: { admin: true, teamlead: false, member: false }, // USING fails fuer teamlead
};
const EXPECTED_PER_TABLE: Record<Table, Record<Op, Expected>> = {
  proposal_items: STANDARD_EXPECTED,
  proposal_payment_milestones: STANDARD_EXPECTED,
  email_attachments: STANDARD_EXPECTED,
  emails: EMAILS_EXPECTED,
  cadence_enrollments: STANDARD_EXPECTED,
  cadence_executions: STANDARD_EXPECTED,
  email_tracking_events: STANDARD_EXPECTED,
};

interface InsertFixture {
  columns: string[];
  values: unknown[];
}

let client: Client;
let realAdminId: string;
let memberDealId: string;
let memberContactId: string;
let memberProposalId: string;
let memberEmailId: string;
let memberEmailAttachmentEmailId: string;
let memberCadenceEnrollmentId: string;
let memberCadenceStepId: string;
let memberEmailTrackingId: string;
const targetIds: Partial<Record<Table, string>> = {};
const bootstrappedIds: Partial<Record<Table, string>> = {};

function makeInsertFixture(table: Table): InsertFixture {
  const rand = `SLC903b_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  switch (table) {
    case "proposal_items":
      return {
        columns: ["proposal_id", "position_order", "quantity", "unit_price_net", "discount_pct", "snapshot_name"],
        values: ["__PROPOSAL_ID__", 999, 1, 0, 0, rand],
      };
    case "proposal_payment_milestones":
      return {
        columns: ["proposal_id", "sequence", "percent", "due_trigger"],
        // due_trigger CHECK: ('on_signature','on_completion','days_after_signature','on_milestone')
        // percent CHECK: percent > 0 AND percent <= 100
        values: ["__PROPOSAL_ID__", 900_000 + Math.floor(Math.random() * 100_000), 10, "on_signature"],
      };
    case "email_attachments":
      // CHECK: (source_type='upload' AND proposal_id IS NULL) OR (source_type='proposal' AND proposal_id NOT NULL).
      // Wir nutzen 'upload' + kein proposal_id (Multi-Parent-Test ueber email_id-Pfad).
      return {
        columns: ["email_id", "storage_path", "filename", "mime_type", "size_bytes", "source_type"],
        values: ["__EMAIL_ID__", `slc903b/${rand}`, rand, "text/plain", 0, "upload"],
      };
    case "emails":
      return {
        columns: ["direction", "owner_user_id"],
        values: ["outbound", "__MEMBER_1__"],
      };
    case "cadence_enrollments":
      return {
        columns: ["cadence_id", "status", "current_step_order", "next_execute_at", "deal_id"],
        values: ["__CADENCE_ID__", "active", 1, new Date(Date.now() + 86_400_000).toISOString(), "__DEAL_ID__"],
      };
    case "cadence_executions":
      return {
        columns: ["enrollment_id", "step_id", "step_order", "step_type", "status"],
        values: ["__ENROLLMENT_ID__", "__STEP_ID__", 1, "email", "pending"],
      };
    case "email_tracking_events":
      return {
        columns: ["tracking_id", "email_id", "event_type"],
        values: ["__TRACKING_ID__", "__EMAIL_ID__", "open"],
      };
  }
}

function substitute(values: unknown[]): unknown[] {
  return values.map((v) => {
    if (v === "__PROPOSAL_ID__") return memberProposalId;
    if (v === "__EMAIL_ID__") return memberEmailId;
    if (v === "__DEAL_ID__") return memberDealId;
    if (v === "__CADENCE_ID__") return memberCadenceStepId; // wird in bootstrap ueberschrieben
    if (v === "__ENROLLMENT_ID__") return memberCadenceEnrollmentId;
    if (v === "__STEP_ID__") return memberCadenceStepId;
    if (v === "__TRACKING_ID__") return memberEmailTrackingId;
    if (v === "__MEMBER_1__") return TEST_MEMBER_1;
    return v;
  });
}

async function getOrCreate<T extends string>(
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
           VALUES ('SLC903b_BOOTSTRAP_DEAL', $1, 0, 'open') RETURNING id::TEXT AS id`,
        [TEST_MEMBER_1],
      );
      return r.rows[0].id;
    },
  );

  // Member-1-owned Contact (fuer cadence_enrollments-Pfad)
  memberContactId = await getOrCreate(
    `SELECT id::TEXT AS id FROM contacts WHERE owner_user_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [TEST_MEMBER_1],
    async () => {
      const r = await client.query<{ id: string }>(
        `INSERT INTO contacts (first_name, last_name, owner_user_id)
           VALUES ('SLC903b', 'Bootstrap', $1) RETURNING id::TEXT AS id`,
        [TEST_MEMBER_1],
      );
      return r.rows[0].id;
    },
  );

  // Member-1-owned Proposal — entweder existing oder neu (via deal)
  memberProposalId = await getOrCreate(
    `SELECT id::TEXT AS id FROM proposals WHERE owner_user_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [TEST_MEMBER_1],
    async () => {
      const r = await client.query<{ id: string }>(
        `INSERT INTO proposals (deal_id, title, owner_user_id, status)
           VALUES ($1, 'SLC903b_BOOTSTRAP_PROPOSAL', $2, 'draft') RETURNING id::TEXT AS id`,
        [memberDealId, TEST_MEMBER_1],
      );
      return r.rows[0].id;
    },
  );

  // Member-1-owned Email
  memberEmailId = await getOrCreate(
    `SELECT id::TEXT AS id FROM emails WHERE owner_user_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [TEST_MEMBER_1],
    async () => {
      const r = await client.query<{ id: string }>(
        `INSERT INTO emails (direction, owner_user_id)
           VALUES ('outbound', $1) RETURNING id::TEXT AS id`,
        [TEST_MEMBER_1],
      );
      return r.rows[0].id;
    },
  );
  memberEmailAttachmentEmailId = memberEmailId;

  // Bestehende cadence_steps row als step_id-Quelle
  const stepRows = await client.query<{ id: string; cadence_id: string }>(
    `SELECT id::TEXT AS id, cadence_id::TEXT AS cadence_id FROM cadence_steps
       ORDER BY created_at ASC LIMIT 1`,
  );
  if (stepRows.rows.length === 0) {
    throw new Error("cadence_steps Seed fehlt — V8.4 Cadence-Seed nicht angewendet?");
  }
  memberCadenceStepId = stepRows.rows[0].id;
  const memberCadenceId = stepRows.rows[0].cadence_id;

  // Pro Tabelle persistente Bootstrap-Row anlegen (service_role bypasst RLS).
  // Reihenfolge wichtig wegen FK-Abhaengigkeiten:
  //   cadence_enrollments → cadence_executions
  //   emails → email_attachments → email_tracking_events
  for (const table of TABLES) {
    const fixture = makeInsertFixture(table);
    // cadence_enrollments: cadence_id Override
    if (table === "cadence_enrollments") {
      fixture.values = [
        memberCadenceId,
        "active",
        1,
        new Date(Date.now() + 86_400_000).toISOString(),
        memberDealId,
      ];
    }
    // email_tracking_events: tracking_id wird in bootstrap-Pre-Step gesetzt
    if (table === "email_tracking_events") {
      // Wenn kein tracking_id-Wert dann pre-generate
      fixture.values = [crypto.randomUUID(), memberEmailId, "open"];
      memberEmailTrackingId = fixture.values[0] as string;
    }
    const realValues = substitute(fixture.values);
    const placeholders = realValues.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO ${table} (${fixture.columns.join(", ")}) VALUES (${placeholders}) RETURNING id::TEXT AS id`;
    const r = await client.query<{ id: string }>(sql, realValues);
    bootstrappedIds[table] = r.rows[0].id;
    targetIds[table] = r.rows[0].id;
    // Bootstrap-Enrollment-ID puffern fuer cadence_executions
    if (table === "cadence_enrollments") {
      memberCadenceEnrollmentId = r.rows[0].id;
    }
  }
}

async function cleanupFixtures(): Promise<void> {
  // Reihenfolge invers: children zuerst
  const cleanupOrder: Table[] = [
    "cadence_executions",
    "cadence_enrollments",
    "email_tracking_events",
    "email_attachments",
    "proposal_items",
    "proposal_payment_milestones",
    "emails",
  ];
  for (const table of cleanupOrder) {
    const id = bootstrappedIds[table];
    if (id) {
      await client
        .query(`DELETE FROM ${table} WHERE ${PK_COLUMN[table]} = $1`, [id])
        .catch(() => {});
    }
  }
  // SLC903b-Test-Inserts Marker-Cleanup
  await client.query(`DELETE FROM proposal_items WHERE snapshot_name LIKE 'SLC903b_%'`).catch(() => {});
  await client.query(`DELETE FROM proposal_payment_milestones WHERE due_trigger LIKE 'SLC903b_%'`).catch(() => {});
  await client.query(`DELETE FROM email_attachments WHERE filename LIKE 'SLC903b_%'`).catch(() => {});
  // Defensive Bootstrap-Cleanup
  await client.query(`DELETE FROM proposals WHERE title = 'SLC903b_BOOTSTRAP_PROPOSAL'`).catch(() => {});
  await client.query(`DELETE FROM deals WHERE title = 'SLC903b_BOOTSTRAP_DEAL'`).catch(() => {});
  await client.query(`DELETE FROM contacts WHERE first_name = 'SLC903b' AND last_name = 'Bootstrap'`).catch(() => {});
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
      // cadence_enrollments + email_tracking_events brauchen runtime-Werte.
      // INSERT-Test status='paused' (Bootstrap-Row hat status='active' und
      // idx_cadence_enrollments_unique ist Partial WHERE status='active').
      if (table === "cadence_enrollments") {
        const cad = await client.query<{ cadence_id: string }>(
          `SELECT cadence_id::TEXT FROM cadence_steps WHERE id = $1`,
          [memberCadenceStepId],
        );
        fixture.values = [
          cad.rows[0].cadence_id,
          "paused",
          1,
          new Date(Date.now() + 86_400_000).toISOString(),
          memberDealId,
        ];
      }
      if (table === "email_tracking_events") {
        fixture.values = [crypto.randomUUID(), memberEmailId, "open"];
      }
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

describe("V8.11 SLC-903 Block 2 — Klasse-C Proposal/Email/Cadence (84 Cases)", () => {
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
            // Denied UPDATE kann zwei Wege gehen:
            //  - USING-Filter trifft nicht (0 affected, kein Error)
            //  - USING trifft (can_see_owner), aber WITH CHECK fail (Error "new row violates")
            // Beide validieren "denied".
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
