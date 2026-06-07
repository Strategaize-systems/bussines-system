/**
 * SLC-903 MT-5 Block 1 — V8.11 Klasse-C RLS-Matrix: 96 Multi-Parent-Tests.
 *
 * Matrix: 8 Block-1-Tabellen × 3 Rollen × 4 Operationen = 96 Tests.
 *
 * Pattern-Quelle: cockpit/__tests__/rls/v8-11-slc-902-rls-matrix.test.ts (DEC-268, BLOCKING per
 * strategaize-pattern-reuse.md). Klasse-C-Drift vs Klasse-B: pro Tabelle Multi-Parent OR EXISTS
 * mit can_see_owner(parent.owner_user_id) + optional created_by NULL-Fallback + is_admin().
 *
 * V7-can_see_owner-Logik (per public.can_see_owner):
 *   is_admin() OR target_owner = auth.uid() OR (is_teamlead() AND same team_id)
 *
 * Erwartungs-Matrix (Fixture-Row IMMER mit Parent-FK zu TEST_MEMBER_1-owned Deal):
 *   - admin (realer Admin-Profile != Test-IDs): ALLOWED alle 32 Ops (is_admin)
 *   - teamlead (TEST_TEAMLEAD_ID 078): ALLOWED alle 32 Ops (is_teamlead + same team)
 *   - member_2 (TEST_MEMBER_2 082): DENIED alle 32 Ops (nicht owner, nicht teamlead, nicht admin)
 *
 * "Denied" bedeutet:
 *   - SELECT:  0 Rows (RLS filtert, kein Error)
 *   - INSERT:  Postgres 'row-level security policy' Error (SAVEPOINT-Pattern)
 *   - UPDATE:  0 affected
 *   - DELETE:  0 affected
 *
 * Pre-Apply Done-Gate (loose): 26.  Post-MIG-047a Done-Gate: 18.
 *
 * Voraussetzung: MIG-047a applied, V7-Helper LIVE, V5.3-Seed mit
 * 6 Test-Profiles + Team + per-Member-Stammdaten.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

type Role = "admin" | "teamlead" | "member";
type Op = "SELECT" | "INSERT" | "UPDATE" | "DELETE";
type Table =
  | "tasks"
  | "signals"
  | "calendar_events"
  | "email_threads"
  | "handoffs"
  | "deal_products"
  | "auto_winloss_runs"
  | "referrals";

const TEST_TEAMLEAD_ID = "00000000-0000-0000-0000-000000000078";
const TEST_MEMBER_1 = "00000000-0000-0000-0000-000000000081";
const TEST_MEMBER_2 = "00000000-0000-0000-0000-000000000082";

const TABLES: Table[] = [
  "tasks",
  "signals",
  "calendar_events",
  "email_threads",
  "handoffs",
  "deal_products",
  "auto_winloss_runs",
  "referrals",
];
const OPS: Op[] = ["SELECT", "INSERT", "UPDATE", "DELETE"];

const PK_COLUMN: Record<Table, string> = {
  tasks: "id",
  signals: "id",
  calendar_events: "id",
  email_threads: "id",
  handoffs: "id",
  deal_products: "id",
  auto_winloss_runs: "id",
  referrals: "id",
};

const UPDATE_SETTERS: Record<Table, string> = {
  tasks: "title = title",
  signals: "signal_type = signal_type",
  calendar_events: "title = title",
  email_threads: "subject = subject",
  handoffs: "id = id",
  deal_products: "quantity = COALESCE(quantity, 1)",
  auto_winloss_runs: "status = status",
  referrals: "id = id",
};

interface InsertFixture {
  columns: string[];
  values: unknown[];
}

let client: Client;
let realAdminId: string;
let memberDealId: string;
let memberProductId: string;
let insertOnlyProductId: string;
const targetIds: Partial<Record<Table, string>> = {};
const bootstrappedIds: Partial<Record<Table, string>> = {};

function makeInsertFixture(table: Table): InsertFixture {
  const rand = `SLC903a_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  switch (table) {
    case "tasks":
      return {
        columns: ["title", "deal_id"],
        values: [rand, "__DEAL_ID__"],
      };
    case "signals":
      return {
        columns: ["signal_type", "deal_id"],
        values: [rand, "__DEAL_ID__"],
      };
    case "calendar_events":
      return {
        columns: ["title", "start_time", "end_time", "deal_id"],
        values: [
          rand,
          new Date(Date.now() + 86_400_000).toISOString(),
          new Date(Date.now() + 90_000_000).toISOString(),
          "__DEAL_ID__",
        ],
      };
    case "email_threads":
      return {
        columns: ["subject", "first_message_at", "last_message_at", "deal_id"],
        values: [
          rand,
          new Date().toISOString(),
          new Date().toISOString(),
          "__DEAL_ID__",
        ],
      };
    case "handoffs":
      return {
        columns: ["deal_id"],
        values: ["__DEAL_ID__"],
      };
    case "deal_products":
      return {
        columns: ["deal_id", "product_id"],
        values: ["__DEAL_ID__", "__PRODUCT_ID__"],
      };
    case "auto_winloss_runs":
      return {
        columns: ["deal_id", "target_status", "triggered_at", "triggered_by_system", "status"],
        values: ["__DEAL_ID__", "won", new Date().toISOString(), true, "succeeded"],
      };
    case "referrals":
      return {
        columns: ["deal_id"],
        values: ["__DEAL_ID__"],
      };
  }
}

function substitute(values: unknown[], opts?: { useInsertProduct?: boolean }): unknown[] {
  return values.map((v) => {
    if (v === "__DEAL_ID__") return memberDealId;
    if (v === "__PRODUCT_ID__") {
      // deal_products hat UNIQUE(deal_id, product_id) — INSERT-Tests brauchen ein
      // anderes product als das Bootstrap-Target, sonst kollidieren wir.
      return opts?.useInsertProduct ? insertOnlyProductId : memberProductId;
    }
    return v;
  });
}

async function bootstrapFixtures(): Promise<void> {
  // Member-1-owned Deal (V5.3 Seed sollte das haben — sonst create defensive)
  const dealRows = await client.query<{ id: string }>(
    `SELECT id::TEXT AS id FROM deals
       WHERE owner_user_id = $1
       ORDER BY created_at ASC LIMIT 1`,
    [TEST_MEMBER_1],
  );
  if (dealRows.rows.length === 0) {
    const created = await client.query<{ id: string }>(
      `INSERT INTO deals (title, owner_user_id, value, status)
         VALUES ($1, $2, 0, 'open') RETURNING id::TEXT AS id`,
      [`SLC903a_BOOTSTRAP_DEAL`, TEST_MEMBER_1],
    );
    memberDealId = created.rows[0].id;
  } else {
    memberDealId = dealRows.rows[0].id;
  }

  // Beliebiges Product fuer deal_products (kein owner-Konzept)
  const prodRows = await client.query<{ id: string }>(
    `SELECT id::TEXT AS id FROM products ORDER BY created_at ASC LIMIT 1`,
  );
  if (prodRows.rows.length === 0) {
    const created = await client.query<{ id: string }>(
      `INSERT INTO products (name) VALUES ($1) RETURNING id::TEXT AS id`,
      [`SLC903a_BOOTSTRAP_PRODUCT`],
    );
    memberProductId = created.rows[0].id;
  } else {
    memberProductId = prodRows.rows[0].id;
  }

  // Zweites Product fuer deal_products INSERT-Tests (UNIQUE-Konflikt-Vermeidung).
  const insertCreated = await client.query<{ id: string }>(
    `INSERT INTO products (name) VALUES ($1) RETURNING id::TEXT AS id`,
    [`SLC903a_INSERT_PRODUCT_${Date.now()}`],
  );
  insertOnlyProductId = insertCreated.rows[0].id;

  // Pro Klasse-C-Tabelle: 1 persistente Bootstrap-Row mit deal_id=memberDealId.
  // Verwendet INSERT als service_role (kein RLS-Filter) — wir verifizieren spaeter
  // pro Rolle die RLS-Sichtbarkeit.
  for (const table of TABLES) {
    const fixture = makeInsertFixture(table);
    const realValues = substitute(fixture.values);
    const placeholders = realValues.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO ${table} (${fixture.columns.join(", ")}) VALUES (${placeholders}) RETURNING id::TEXT AS id`;
    const r = await client.query<{ id: string }>(sql, realValues);
    bootstrappedIds[table] = r.rows[0].id;
    targetIds[table] = r.rows[0].id;
  }
}

async function cleanupFixtures(): Promise<void> {
  // Bootstrap-Rows entfernen (alle 8 Tabellen)
  for (const table of TABLES) {
    const id = bootstrappedIds[table];
    if (id) {
      await client
        .query(`DELETE FROM ${table} WHERE ${PK_COLUMN[table]} = $1`, [id])
        .catch(() => {});
    }
  }
  // SLC903a-Test-Inserts ueber afterAll-Marker-Cleanup (falls aus failenden Tx-Tests persistiert)
  await client.query(`DELETE FROM tasks WHERE title LIKE 'SLC903a_%'`).catch(() => {});
  await client.query(`DELETE FROM signals WHERE signal_type LIKE 'SLC903a_%'`).catch(() => {});
  await client.query(`DELETE FROM calendar_events WHERE title LIKE 'SLC903a_%'`).catch(() => {});
  await client.query(`DELETE FROM email_threads WHERE subject LIKE 'SLC903a_%'`).catch(() => {});
  // Defensive: SLC903a_BOOTSTRAP_DEAL + PRODUCT (wenn von uns angelegt)
  await client.query(`DELETE FROM deals WHERE title = 'SLC903a_BOOTSTRAP_DEAL'`).catch(() => {});
  await client.query(`DELETE FROM products WHERE name LIKE 'SLC903a_%'`).catch(() => {});
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

// Klasse-C-Standard: alle 8 Tabellen via can_see_owner(parent.owner_user_id) — Team-Pattern.
// admin + teamlead: allowed. member_2 (anderer Member, owner ist member_1): denied.
const MATRIX: MatrixCase[] = TABLES.flatMap((table) =>
  OPS.flatMap((op) => [
    { table, role: "admin" as Role, op, expectedAllowed: true },
    { table, role: "teamlead" as Role, op, expectedAllowed: true },
    { table, role: "member" as Role, op, expectedAllowed: false },
  ]),
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
      const realValues = substitute(fixture.values, { useInsertProduct: table === "deal_products" });
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

describe("V8.11 SLC-903 Block 1 — Klasse-C RLS Matrix (96 Multi-Parent-Cases)", () => {
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
