/**
 * SLC-902 MT-3 — V8.11 Klasse-B RLS-Matrix: 132 Team-Templates-Tests.
 *
 * Matrix: 11 Team-Templates-Tabellen × 3 Rollen × 4 Operationen = 132 Tests.
 *
 * Pattern-Quelle: cockpit/__tests__/rls/v8-11-slc-901-rls-matrix.test.ts (DEC-268).
 * Klasse-B-Pattern (DEC-271):
 *   - SELECT: USING(true) — alle 3 Rollen lesen
 *   - INSERT: WITH CHECK is_admin() — nur admin schreibt
 *   - UPDATE: USING + WITH CHECK is_admin() — nur admin
 *   - DELETE: USING is_admin() — nur admin
 *
 * Expected-Matrix:
 *   - admin: 44 / 44 allowed (alle Ops)
 *   - teamlead: 11 SELECT allowed, 33 INSERT/UPDATE/DELETE denied
 *   - member: 11 SELECT allowed, 33 INSERT/UPDATE/DELETE denied
 *
 * "Denied" bedeutet:
 *   - INSERT: Postgres-Error 'row-level security policy' (SAVEPOINT-Pattern)
 *   - UPDATE: 0 affected Rows
 *   - DELETE: 0 affected Rows
 *
 * Pre-Apply Done-Gate (helper-function): NICHT verfuegbar pre-MIG-046
 * Post-MIG-046 Done-Gate: 26 (37 - 11)
 *
 * Voraussetzung: MIG-046 applied, V7-Helper LIVE, Klasse-B-Seed-Rows aus V2-V5.3.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

type Role = "admin" | "teamlead" | "member";
type Op = "SELECT" | "INSERT" | "UPDATE" | "DELETE";
type Table =
  | "branding_settings"
  | "email_templates"
  | "payment_terms_templates"
  | "compliance_templates"
  | "vat_id_validations"
  | "pipelines"
  | "pipeline_stages"
  | "products"
  | "automation_rules"
  | "cadences"
  | "cadence_steps";

const TEST_TEAMLEAD_ID = "00000000-0000-0000-0000-000000000078";
const TEST_MEMBER_2 = "00000000-0000-0000-0000-000000000082";

const TABLES: Table[] = [
  "branding_settings",
  "email_templates",
  "payment_terms_templates",
  "compliance_templates",
  "vat_id_validations",
  "pipelines",
  "pipeline_stages",
  "products",
  "automation_rules",
  "cadences",
  "cadence_steps",
];
const OPS: Op[] = ["SELECT", "INSERT", "UPDATE", "DELETE"];

// PK-Spalten je Tabelle (compliance_templates hat template_key als PK)
const PK_COLUMN: Record<Table, string> = {
  branding_settings: "id",
  email_templates: "id",
  payment_terms_templates: "id",
  compliance_templates: "template_key",
  vat_id_validations: "id",
  pipelines: "id",
  pipeline_stages: "id",
  products: "id",
  automation_rules: "id",
  cadences: "id",
  cadence_steps: "id",
};

// UPDATE-Setter pro Tabelle (sicher, idempotent, kein Constraint-Violation)
const UPDATE_SETTERS: Record<Table, string> = {
  branding_settings: "updated_at = NOW()",
  email_templates: "title = title", // kein updated_at — Touch reicht
  payment_terms_templates: "updated_at = NOW()",
  compliance_templates: "updated_at = NOW()",
  vat_id_validations: "validated_at = NOW()",
  pipelines: "name = name", // pipelines hat kein updated_at
  pipeline_stages: "sort_order = sort_order",
  products: "updated_at = NOW()",
  automation_rules: "updated_at = NOW()",
  cadences: "updated_at = NOW()",
  cadence_steps: "step_order = step_order", // cadence_steps hat kein updated_at
};

interface InsertFixture {
  columns: string[];
  values: unknown[];
}

// compliance_templates Snapshot+Restore Strategy
const COMPLIANCE_RESTORE_KEY = "meeting_invitation";
let complianceSnapshot: {
  body_markdown: string;
  default_body_markdown: string;
  updated_by: string | null;
} | null = null;

const INSERT_FIXTURES: Record<Table, () => InsertFixture> = {
  branding_settings: () => ({
    columns: ["business_country"],
    values: ["DE"],
  }),
  email_templates: () => ({
    columns: ["title", "language"],
    values: [`SLC902_TEST_${Date.now()}_${Math.floor(Math.random() * 1000)}`, "de"],
  }),
  payment_terms_templates: () => ({
    columns: ["label", "body"],
    values: [
      `SLC902_TEST_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      "30 Tage netto",
    ],
  }),
  compliance_templates: () => ({
    // INSERT nur moeglich wenn meeting_invitation in bootstrap geloescht.
    // CHECK constraint laesst nur 3 Werte zu; meeting_invitation ist reserviert
    // fuer Snapshot-Restore-Strategy.
    columns: ["template_key", "body_markdown", "default_body_markdown"],
    values: ["meeting_invitation", "SLC902 test body", "SLC902 default body"],
  }),
  vat_id_validations: () => {
    const randomNum = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 50);
    return {
      columns: ["country", "number", "is_valid", "source", "expires_at"],
      values: ["DE", randomNum, false, "format_only", new Date(Date.now() + 86400000).toISOString()],
    };
  },
  pipelines: () => ({
    columns: ["name"],
    values: [`SLC902_TEST_${Date.now()}_${Math.floor(Math.random() * 1000)}`],
  }),
  pipeline_stages: () => ({
    columns: ["pipeline_id", "name"],
    // pipeline_id wird in beforeAll aus existing pipeline gelesen, dann hier substituiert
    values: ["__PIPELINE_ID__", `SLC902_TEST_${Date.now()}_${Math.floor(Math.random() * 1000)}`],
  }),
  products: () => ({
    columns: ["name"],
    values: [`SLC902_TEST_${Date.now()}_${Math.floor(Math.random() * 1000)}`],
  }),
  automation_rules: () => ({
    columns: ["name", "trigger_event", "created_by"],
    values: [
      `SLC902_TEST_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      "deal.created",
      "__ADMIN_ID__",
    ],
  }),
  cadences: () => ({
    columns: ["name"],
    values: [`SLC902_TEST_${Date.now()}_${Math.floor(Math.random() * 1000)}`],
  }),
  cadence_steps: () => ({
    columns: ["cadence_id", "step_order", "step_type"],
    values: ["__CADENCE_ID__", 999, "email"],
  }),
};

let client: Client;
let realAdminId: string;
let existingPipelineId: string;
let existingCadenceId: string;
let bootstrappedPipelineId: string | null = null;
const targetIds: Partial<Record<Table, string>> = {};

async function bootstrapFixtures(): Promise<void> {
  // pipelines: dedizierte SLC902-Bootstrap-Pipeline ohne deals/stages — verhindert
  // Cascade-Errors bei admin-DELETE-Test (existing seed-pipelines haben 104 deals
  // mit downstream-FK-Constraints in proposals/email_attachments etc.).
  const pipeBoot = await client.query<{ id: string }>(
    `INSERT INTO pipelines (name) VALUES ('SLC902_BOOTSTRAP_PIPELINE')
       RETURNING id::TEXT AS id`,
  );
  bootstrappedPipelineId = pipeBoot.rows[0].id;
  targetIds.pipelines = bootstrappedPipelineId;

  // Bestehende Seed-Row-IDs sammeln (V2-V5.3 Seed-Rows existieren bereits)
  // pipelines wird oben gesondert behandelt.
  const tablesNeedingTarget: { table: Table; orderBy: string }[] = [
    { table: "branding_settings", orderBy: "updated_at" },
    { table: "email_templates", orderBy: "created_at" },
    { table: "payment_terms_templates", orderBy: "created_at" },
    { table: "vat_id_validations", orderBy: "validated_at" },
    { table: "pipeline_stages", orderBy: "created_at" },
    { table: "products", orderBy: "created_at" },
    { table: "automation_rules", orderBy: "created_at" },
    { table: "cadences", orderBy: "created_at" },
    { table: "cadence_steps", orderBy: "created_at" },
  ];
  for (const { table, orderBy } of tablesNeedingTarget) {
    const { rows } = await client.query<{ id: string }>(
      `SELECT id::TEXT AS id FROM ${table} ORDER BY ${orderBy} ASC LIMIT 1`,
    );
    if (rows.length === 0) {
      throw new Error(
        `Bootstrap: ${table} hat keine Seed-Row — V2/V5.3-Backfill fehlt? Test braucht mind. 1 Row.`,
      );
    }
    targetIds[table] = rows[0].id;
  }

  // compliance_templates: 'email_footer' als Target (bleibt persistent, wird nie geloescht)
  // 'meeting_invitation' wird snapshot-deleted fuer INSERT-Test.
  const compRows = await client.query<{ template_key: string }>(
    `SELECT template_key FROM compliance_templates WHERE template_key='email_footer'`,
  );
  if (compRows.rows.length === 0) {
    throw new Error("compliance_templates 'email_footer' Seed fehlt — V8 Compliance-Backfill?");
  }
  targetIds.compliance_templates = "email_footer";

  // 'meeting_invitation' Snapshot + Delete fuer INSERT-Test
  const snap = await client.query<{
    body_markdown: string;
    default_body_markdown: string;
    updated_by: string | null;
  }>(
    `SELECT body_markdown, default_body_markdown, updated_by::TEXT
       FROM compliance_templates WHERE template_key = $1`,
    [COMPLIANCE_RESTORE_KEY],
  );
  if (snap.rows.length > 0) {
    complianceSnapshot = snap.rows[0];
    await client.query(`DELETE FROM compliance_templates WHERE template_key = $1`, [
      COMPLIANCE_RESTORE_KEY,
    ]);
  }

  // existing pipeline_id + cadence_id fuer FK-Fixtures (NICHT die Bootstrap-Pipeline,
  // damit pipeline_stages INSERT-Test mit der echten Seed-Pipeline laeuft).
  const pipe = await client.query<{ id: string }>(
    `SELECT id::TEXT AS id FROM pipelines
       WHERE name <> 'SLC902_BOOTSTRAP_PIPELINE'
       ORDER BY created_at ASC LIMIT 1`,
  );
  existingPipelineId = pipe.rows[0].id;

  const cad = await client.query<{ id: string }>(
    `SELECT id::TEXT AS id FROM cadences ORDER BY created_at ASC LIMIT 1`,
  );
  existingCadenceId = cad.rows[0].id;
}

async function cleanupFixtures(): Promise<void> {
  // SLC902-Test-Inserts koennten ueber ROLLBACK hinaus persistiert sein wenn
  // Test ausserhalb Tx etwas inserted hat — Defensive Cleanup nach SLC902_TEST-Marker.
  await client.query(`DELETE FROM email_templates WHERE title LIKE 'SLC902_TEST_%'`);
  await client.query(`DELETE FROM payment_terms_templates WHERE label LIKE 'SLC902_TEST_%'`);
  await client.query(`DELETE FROM pipelines WHERE name LIKE 'SLC902_TEST_%'`);
  await client.query(`DELETE FROM pipeline_stages WHERE name LIKE 'SLC902_TEST_%'`);
  await client.query(`DELETE FROM products WHERE name LIKE 'SLC902_TEST_%'`);
  await client.query(`DELETE FROM automation_rules WHERE name LIKE 'SLC902_TEST_%'`);
  await client.query(`DELETE FROM cadences WHERE name LIKE 'SLC902_TEST_%'`);

  // SLC902_BOOTSTRAP_PIPELINE: explicit cleanup (eigener Marker, sicher zu loeschen)
  if (bootstrappedPipelineId) {
    await client.query(`DELETE FROM pipelines WHERE id = $1`, [bootstrappedPipelineId]);
  }

  // compliance_templates: Restore 'meeting_invitation'
  if (complianceSnapshot) {
    await client.query(
      `INSERT INTO compliance_templates (template_key, body_markdown, default_body_markdown, updated_by)
       VALUES ($1, $2, $3, $4::uuid)
       ON CONFLICT (template_key) DO NOTHING`,
      [
        COMPLIANCE_RESTORE_KEY,
        complianceSnapshot.body_markdown,
        complianceSnapshot.default_body_markdown,
        complianceSnapshot.updated_by,
      ],
    );
  }
}

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL nicht gesetzt");
  client = new Client({ connectionString: url });
  await client.connect();

  const adminRows = await client.query<{ id: string }>(
    `SELECT id FROM profiles WHERE role = 'admin' AND id NOT IN ($1, $2)
       ORDER BY created_at ASC LIMIT 1`,
    [TEST_TEAMLEAD_ID, TEST_MEMBER_2],
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

// Klasse-B-Erwartung: SELECT all allowed, INSERT/UPDATE/DELETE Admin-only
const MATRIX: MatrixCase[] = TABLES.flatMap((table) =>
  OPS.flatMap((op) => {
    const cases: MatrixCase[] = [
      { table, role: "admin" as Role, op, expectedAllowed: true },
    ];
    // teamlead + member: SELECT allowed, sonst denied
    const nonAdminAllowed = op === "SELECT";
    cases.push({ table, role: "teamlead" as Role, op, expectedAllowed: nonAdminAllowed });
    cases.push({ table, role: "member" as Role, op, expectedAllowed: nonAdminAllowed });
    return cases;
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

function substituteFixturePlaceholders(values: unknown[]): unknown[] {
  return values.map((v) => {
    if (v === "__PIPELINE_ID__") return existingPipelineId;
    if (v === "__CADENCE_ID__") return existingCadenceId;
    if (v === "__ADMIN_ID__") return realAdminId;
    return v;
  });
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
      const r = await client.query(`SELECT ${pk} FROM ${table} WHERE ${pk} = $1`, [
        targetIdValue,
      ]);
      await client.query("RELEASE SAVEPOINT op_test");
      return { affected: r.rowCount ?? 0, error: null };
    }
    if (op === "INSERT") {
      const fixture = INSERT_FIXTURES[table]();
      const realValues = substituteFixturePlaceholders(fixture.values);
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
    // DELETE
    const r = await client.query(`DELETE FROM ${table} WHERE ${pk} = $1`, [targetIdValue]);
    await client.query("RELEASE SAVEPOINT op_test");
    return { affected: r.rowCount ?? 0, error: null };
  } catch (e) {
    const msg = (e as Error).message;
    await client.query("ROLLBACK TO SAVEPOINT op_test");
    return { affected: 0, error: msg };
  }
}

describe("V8.11 SLC-902 Klasse-B RLS Matrix — 132 Team-Templates-Cases", () => {
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
            // WITH CHECK is_admin() schlaegt fehl -> RLS-Error
            expect(error).toMatch(/row-level security/i);
          } else {
            // RLS-Filter -> 0 affected (kein Error, USING is_admin() haelt Row zurueck)
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
