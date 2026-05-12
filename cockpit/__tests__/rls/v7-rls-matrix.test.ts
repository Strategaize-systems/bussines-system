/**
 * SLC-701 MT-6 — V7 RLS-Matrix: 96 Cross-Owner-Leak-Tests.
 *
 * Matrix: 8 Kerntabellen × 3 Rollen × 4 Operationen = 96 Tests.
 *
 * Boundary-Pattern: Test-Member-1 ist Owner einer Fixture pro Tabelle.
 *   - admin     (sessioniert als realer Production-Admin): erwartet allowed
 *   - teamlead  (sessioniert als Test-Teamlead, gleiches Team)     : erwartet allowed
 *   - member    (sessioniert als Test-Member-2, gleiches Team aber andere uid): erwartet denied
 *
 * "Denied" bedeutet:
 *   - SELECT:    0 Rows zurueck (RLS filtert, kein Error)
 *   - INSERT:    Postgres-Error 'row-level security policy' (SAVEPOINT-Pattern)
 *   - UPDATE:    0 affected Rows (RLS filtert WHERE)
 *   - DELETE:    0 affected Rows
 *
 * Voraussetzung: MIG-033 + MIG-034 + MIG-035 appliedet, Seed-Script gelaufen.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

type Role = "admin" | "teamlead" | "member";
type Op = "SELECT" | "INSERT" | "UPDATE" | "DELETE";
type Table =
  | "companies"
  | "contacts"
  | "deals"
  | "activities"
  | "meetings"
  | "proposals"
  | "email_messages"
  | "calls";

const TEST_TEAMLEAD_ID = "00000000-0000-0000-0000-000000000078";
const TEST_MEMBER_1 = "00000000-0000-0000-0000-000000000081";
const TEST_MEMBER_2 = "00000000-0000-0000-0000-000000000082";

const TABLES: Table[] = [
  "companies",
  "contacts",
  "deals",
  "activities",
  "meetings",
  "proposals",
  "email_messages",
  "calls",
];
const OPS: Op[] = ["SELECT", "INSERT", "UPDATE", "DELETE"];

interface InsertFixture {
  columns: string[];
  values: unknown[];
}

const INSERT_FIXTURES: Record<Table, () => InsertFixture> = {
  companies: () => ({
    columns: ["name"],
    values: ["[TEST] RLS Insert"],
  }),
  contacts: () => ({
    columns: ["first_name", "last_name"],
    values: ["[TEST]", "RLS Insert"],
  }),
  deals: () => ({
    columns: ["title"],
    values: ["[TEST] Deal RLS Insert"],
  }),
  activities: () => ({
    columns: ["type", "title"],
    values: ["note", "[TEST] Activity RLS Insert"],
  }),
  meetings: () => ({
    columns: ["title", "scheduled_at"],
    values: ["[TEST] Meeting RLS Insert", new Date()],
  }),
  proposals: () => ({
    columns: ["title"],
    values: ["[TEST] Proposal RLS Insert"],
  }),
  email_messages: () => ({
    columns: ["message_id", "from_address", "to_addresses", "received_at"],
    values: [
      `rls-insert-${Date.now()}-${Math.random()}@test.local`,
      "rls-test@test.local",
      ["rls-target@test.local"],
      new Date(),
    ],
  }),
  calls: () => ({
    columns: [],
    values: [],
  }),
};

const UPDATE_SETTERS: Record<Table, string> = {
  companies: "updated_at = NOW()",
  contacts: "updated_at = NOW()",
  deals: "updated_at = NOW()",
  activities: "title = '[TEST] rls-update'",
  meetings: "title = '[TEST] rls-update'",
  proposals: "updated_at = NOW()",
  email_messages: "subject = '[TEST] rls-update'",
  calls: "updated_at = NOW()",
};

let client: Client;
let realAdminId: string;
const targetIds: Partial<Record<Table, string>> = {};

async function bootstrapTargets(): Promise<void> {
  for (const table of TABLES) {
    const { rows } = await client.query<{ id: string }>(
      `SELECT id FROM ${table} WHERE owner_user_id = $1 LIMIT 1`,
      [TEST_MEMBER_1],
    );
    if (rows.length === 0) {
      throw new Error(
        `Seed-Daten fehlen: ${table} hat keine Records mit owner=${TEST_MEMBER_1}. 'npm run seed:multi-user' ausfuehren.`,
      );
    }
    targetIds[table] = rows[0].id;
  }
}

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL nicht gesetzt");
  client = new Client({ connectionString: url });
  await client.connect();

  const adminRows = await client.query<{ id: string }>(
    `SELECT id FROM profiles WHERE role = 'admin' AND id NOT IN ($1, $2, $3, $4, $5, $6, $7)
       ORDER BY created_at ASC LIMIT 1`,
    [
      TEST_TEAMLEAD_ID,
      TEST_MEMBER_1,
      TEST_MEMBER_2,
      "00000000-0000-0000-0000-000000000083",
      "00000000-0000-0000-0000-000000000084",
      "00000000-0000-0000-0000-000000000085",
      "00000000-0000-0000-0000-000000000077",
    ],
  );
  if (adminRows.rows.length === 0) {
    throw new Error("Kein admin-Profile vorhanden — MIG-034 Backfill noetig.");
  }
  realAdminId = adminRows.rows[0].id;

  await bootstrapTargets();
});

afterAll(async () => {
  if (client) await client.end();
});

interface MatrixCase {
  table: Table;
  role: Role;
  op: Op;
  expectedAllowed: boolean;
}

const MATRIX: MatrixCase[] = TABLES.flatMap((table) =>
  OPS.flatMap((op) => [
    { table, role: "admin" as Role,    op, expectedAllowed: true  },
    { table, role: "teamlead" as Role, op, expectedAllowed: true  },
    { table, role: "member" as Role,   op, expectedAllowed: false },
  ]),
);

function userIdFor(role: Role): string {
  switch (role) {
    case "admin":    return realAdminId;
    case "teamlead": return TEST_TEAMLEAD_ID;
    case "member":   return TEST_MEMBER_2; // != owner-of-target (= TEST_MEMBER_1)
  }
}

async function runOperation(
  table: Table,
  op: Op,
  targetId: string,
): Promise<{ affected: number; error: string | null }> {
  await client.query("SAVEPOINT op_test");
  try {
    if (op === "SELECT") {
      const r = await client.query(`SELECT id FROM ${table} WHERE id = $1`, [targetId]);
      await client.query("RELEASE SAVEPOINT op_test");
      return { affected: r.rowCount ?? 0, error: null };
    }
    if (op === "INSERT") {
      const fixture = INSERT_FIXTURES[table]();
      const allCols = ["owner_user_id", ...fixture.columns];
      const allVals = [TEST_MEMBER_1, ...fixture.values];
      const placeholders = allVals.map((_, i) => `$${i + 1}`).join(", ");
      const sql = `INSERT INTO ${table} (${allCols.join(", ")}) VALUES (${placeholders})`;
      const r = await client.query(sql, allVals);
      await client.query("RELEASE SAVEPOINT op_test");
      return { affected: r.rowCount ?? 0, error: null };
    }
    if (op === "UPDATE") {
      const r = await client.query(
        `UPDATE ${table} SET ${UPDATE_SETTERS[table]} WHERE id = $1`,
        [targetId],
      );
      await client.query("RELEASE SAVEPOINT op_test");
      return { affected: r.rowCount ?? 0, error: null };
    }
    // DELETE
    const r = await client.query(`DELETE FROM ${table} WHERE id = $1`, [targetId]);
    await client.query("RELEASE SAVEPOINT op_test");
    return { affected: r.rowCount ?? 0, error: null };
  } catch (e) {
    const msg = (e as Error).message;
    await client.query("ROLLBACK TO SAVEPOINT op_test");
    return { affected: 0, error: msg };
  }
}

describe("V7 RLS Matrix — 96 Cross-Owner-Cases", () => {
  it.each(MATRIX)(
    "table=$table role=$role op=$op allowed=$expectedAllowed",
    async ({ table, role, op, expectedAllowed }) => {
      const targetId = targetIds[table]!;
      await client.query("BEGIN");
      try {
        await client.query("SET LOCAL ROLE authenticated");
        await client.query(`SET LOCAL "request.jwt.claim.sub" = '${userIdFor(role)}'`);

        const { affected, error } = await runOperation(table, op, targetId);

        if (expectedAllowed) {
          expect(error, `unerwarteter Error: ${error}`).toBeNull();
          if (op === "INSERT") {
            expect(affected).toBe(1);
          } else {
            // SELECT/UPDATE/DELETE auf existierende Fixture: 1 Row betroffen.
            expect(affected).toBeGreaterThanOrEqual(1);
          }
        } else {
          if (op === "INSERT") {
            // Member darf NICHT fremden Owner setzen → RLS WITH CHECK schlaegt fehl.
            expect(error).toMatch(/row-level security/i);
          } else {
            // RLS filtert die Row → 0 affected.
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
