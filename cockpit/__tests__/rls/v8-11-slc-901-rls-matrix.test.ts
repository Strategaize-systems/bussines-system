/**
 * SLC-901 MT-3 — V8.11 Klasse-A RLS-Matrix: 48 Cross-User-Leak-Tests.
 *
 * Matrix: 4 Per-User-Stammdaten-Tabellen × 3 Rollen × 4 Operationen = 48 Tests.
 *
 * Pattern-Quelle: cockpit/__tests__/rls/v7-rls-matrix.test.ts (DEC-268).
 * Klasse-A-Drift vs V7 (per DEC-270):
 *   - kein can_see_owner()-Wrap, reines user_id = auth.uid() OR is_admin()
 *   - kein teamlead-Bypass → teamlead-Erwartung = DENIED (V7 erwartet allowed)
 *   - Per-User-Stammdaten sind privat
 *
 * Boundary-Pattern:
 *   - admin (realer Admin): erwartet allowed fuer alle 16 Ops
 *   - teamlead (TEST_TEAMLEAD_ID): erwartet denied (Klasse-A-Drift)
 *   - member-2 (TEST_MEMBER_2 != fixture-owner TEST_MEMBER_1): erwartet denied
 *
 * "Denied" bedeutet:
 *   - SELECT:    0 Rows zurueck (RLS filtert, kein Error)
 *   - INSERT:    Postgres-Error 'row-level security policy' (SAVEPOINT-Pattern)
 *   - UPDATE:    0 affected Rows
 *   - DELETE:    0 affected Rows
 *
 * Pre-Apply Done-Gate (loose): 41
 * Post-MIG-045 Done-Gate (loose): 37
 *
 * Voraussetzung: MIG-045 applied, V7-Helper LIVE, Seed-Script gelaufen.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

type Role = "admin" | "teamlead" | "member";
type Op = "SELECT" | "INSERT" | "UPDATE" | "DELETE";
type Table = "user_settings" | "kpi_snapshots" | "goals" | "activity_kpi_targets";

const TEST_TEAMLEAD_ID = "00000000-0000-0000-0000-000000000078";
const TEST_MEMBER_1 = "00000000-0000-0000-0000-000000000081";
const TEST_MEMBER_2 = "00000000-0000-0000-0000-000000000082";

// Marker fuer Bootstrap-Fixtures, erkennbar fuer Cleanup
const BOOTSTRAP_MARKER = "SLC901_BOOTSTRAP";
const BOOTSTRAP_DATE = "1900-01-01";

// SLC-901-only dummy profile fuer user_settings INSERT-Test (FK profiles.id Pflicht).
// Wird in beforeAll erzeugt, in afterAll geloescht.
const INSERT_TEST_PROFILE_ID = "00000000-0000-0000-0000-00000000c901";

const TABLES: Table[] = ["user_settings", "kpi_snapshots", "goals", "activity_kpi_targets"];
const OPS: Op[] = ["SELECT", "INSERT", "UPDATE", "DELETE"];

// PK-Spalte pro Tabelle (user_settings hat user_id als PK, andere id)
const PK_COLUMN: Record<Table, string> = {
  user_settings: "user_id",
  kpi_snapshots: "id",
  goals: "id",
  activity_kpi_targets: "id",
};

interface InsertFixture {
  columns: string[];
  values: unknown[];
  /** Wenn null: nutze TEST_MEMBER_1 als user_id. Wenn UUID: nutze gegebene UUID (fresh). */
  userIdOverride: string | null;
}

/**
 * Test-INSERT-Fixtures pro Tabelle. Werte so gewaehlt, dass sie NICHT mit dem
 * Bootstrap-Row kollidieren (unique-Constraint-Kollision waere RLS-Test-False-Pass).
 *
 * user_settings hat PK auf user_id — daher fresh UUID fuer INSERT-Test:
 *   - admin: WITH CHECK is_admin() trifft → allowed (PK-Konflikt vermieden)
 *   - teamlead/member-2: WITH CHECK schlaegt fehl → denied (RLS, nicht PK)
 *
 * Andere 3 Tabellen: user_id=TEST_MEMBER_1, distinct fixture values:
 *   - admin: WITH CHECK is_admin() → allowed (unique-Werte != Bootstrap)
 *   - teamlead/member-2: WITH CHECK schlaegt fehl → denied (RLS)
 */
const INSERT_FIXTURES: Record<Table, () => InsertFixture> = {
  user_settings: () => ({
    columns: [],
    values: [],
    userIdOverride: INSERT_TEST_PROFILE_ID,
  }),
  kpi_snapshots: () => ({
    columns: ["snapshot_date", "kpi_type", "kpi_value", "period"],
    values: [
      new Date(Date.now() - Math.floor(Math.random() * 100000) * 86400000).toISOString().slice(0, 10),
      `SLC901_TEST_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      0,
      "day",
    ],
    userIdOverride: null,
  }),
  goals: () => ({
    columns: ["type", "period", "period_start", "target_value"],
    values: [
      `SLC901_TEST_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      "month",
      "1899-01-01",
      0,
    ],
    userIdOverride: null,
  }),
  activity_kpi_targets: () => ({
    columns: ["kpi_key", "daily_target"],
    values: [`SLC901_TEST_${Date.now()}_${Math.floor(Math.random() * 1000)}`, 0],
    userIdOverride: null,
  }),
};

const UPDATE_SETTERS: Record<Table, string> = {
  user_settings: "updated_at = NOW()",
  kpi_snapshots: "kpi_value = 0",
  goals: "updated_at = NOW()",
  activity_kpi_targets: "updated_at = NOW()",
};

let client: Client;
let realAdminId: string;
const targetIds: Partial<Record<Table, string>> = {};

async function bootstrapFixtures(): Promise<void> {
  // Dummy-Profile fuer user_settings INSERT-Test (FK profiles.id Pflicht).
  // Idempotent via ON CONFLICT.
  await client.query(
    `INSERT INTO profiles (id, role) VALUES ($1, 'member') ON CONFLICT (id) DO NOTHING`,
    [INSERT_TEST_PROFILE_ID],
  );

  // Auto-Trigger trg_create_user_settings legt user_settings-Row automatisch an.
  // Fuer den INSERT-Test muss die Zeile vor dem Test-Lauf wieder weg.
  await client.query(`DELETE FROM user_settings WHERE user_id = $1`, [INSERT_TEST_PROFILE_ID]);

  // Cleanup vorheriger Test-Runs (falls vorhanden, idempotent)
  await client.query(
    `DELETE FROM kpi_snapshots WHERE user_id = $1 AND kpi_type = $2`,
    [TEST_MEMBER_1, BOOTSTRAP_MARKER],
  );
  await client.query(
    `DELETE FROM goals WHERE user_id = $1 AND type = $2`,
    [TEST_MEMBER_1, BOOTSTRAP_MARKER],
  );
  await client.query(
    `DELETE FROM activity_kpi_targets WHERE user_id = $1 AND kpi_key = $2`,
    [TEST_MEMBER_1, BOOTSTRAP_MARKER],
  );

  // user_settings: ON CONFLICT DO NOTHING (PK auf user_id)
  await client.query(
    `INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [TEST_MEMBER_1],
  );

  // kpi_snapshots Bootstrap-Row
  await client.query(
    `INSERT INTO kpi_snapshots (user_id, snapshot_date, kpi_type, kpi_value, period)
     VALUES ($1, $2, $3, 0, 'day')`,
    [TEST_MEMBER_1, BOOTSTRAP_DATE, BOOTSTRAP_MARKER],
  );

  // goals Bootstrap-Row
  await client.query(
    `INSERT INTO goals (user_id, type, period, period_start, target_value, status)
     VALUES ($1, $2, 'month', $3, 0, 'active')`,
    [TEST_MEMBER_1, BOOTSTRAP_MARKER, BOOTSTRAP_DATE],
  );

  // activity_kpi_targets Bootstrap-Row
  await client.query(
    `INSERT INTO activity_kpi_targets (user_id, kpi_key, daily_target, active)
     VALUES ($1, $2, 0, true)`,
    [TEST_MEMBER_1, BOOTSTRAP_MARKER],
  );

  // Target-IDs ermitteln
  targetIds.user_settings = TEST_MEMBER_1; // PK ist user_id

  for (const table of ["kpi_snapshots", "goals", "activity_kpi_targets"] as const) {
    const markerCol =
      table === "kpi_snapshots" ? "kpi_type" : table === "goals" ? "type" : "kpi_key";
    const { rows } = await client.query<{ id: string }>(
      `SELECT id FROM ${table} WHERE user_id = $1 AND ${markerCol} = $2 LIMIT 1`,
      [TEST_MEMBER_1, BOOTSTRAP_MARKER],
    );
    if (rows.length === 0) {
      throw new Error(`Bootstrap-Row fuer ${table} fehlt nach INSERT.`);
    }
    targetIds[table] = rows[0].id;
  }
}

async function cleanupFixtures(): Promise<void> {
  await client.query(
    `DELETE FROM kpi_snapshots WHERE user_id = $1 AND kpi_type = $2`,
    [TEST_MEMBER_1, BOOTSTRAP_MARKER],
  );
  await client.query(
    `DELETE FROM goals WHERE user_id = $1 AND type = $2`,
    [TEST_MEMBER_1, BOOTSTRAP_MARKER],
  );
  await client.query(
    `DELETE FROM activity_kpi_targets WHERE user_id = $1 AND kpi_key = $2`,
    [TEST_MEMBER_1, BOOTSTRAP_MARKER],
  );
  // user_settings nicht loeschen — TEST_MEMBER_1-Row koennte pre-existing sein.
  // Dummy-Profile-Cleanup mit Cascade auf user_settings (kein FK Cascade — explizit DELETE).
  await client.query(`DELETE FROM user_settings WHERE user_id = $1`, [INSERT_TEST_PROFILE_ID]);
  await client.query(`DELETE FROM profiles WHERE id = $1`, [INSERT_TEST_PROFILE_ID]);
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
  OPS.flatMap((op) => [
    { table, role: "admin" as Role, op, expectedAllowed: true },
    // Klasse-A-Drift (DEC-270): teamlead = denied (V7 erlaubt teamlead-Bypass)
    { table, role: "teamlead" as Role, op, expectedAllowed: false },
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
      const r = await client.query(`SELECT ${pk} FROM ${table} WHERE ${pk} = $1`, [
        targetIdValue,
      ]);
      await client.query("RELEASE SAVEPOINT op_test");
      return { affected: r.rowCount ?? 0, error: null };
    }
    if (op === "INSERT") {
      const fixture = INSERT_FIXTURES[table]();
      const userIdToUse = fixture.userIdOverride ?? TEST_MEMBER_1;
      const allCols = ["user_id", ...fixture.columns];
      const allVals = [userIdToUse, ...fixture.values];
      const placeholders = allVals.map((_, i) => `$${i + 1}`).join(", ");
      const sql = `INSERT INTO ${table} (${allCols.join(", ")}) VALUES (${placeholders})`;
      const r = await client.query(sql, allVals);
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

describe("V8.11 SLC-901 Klasse-A RLS Matrix — 48 Cross-User-Cases", () => {
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
            // WITH CHECK schlaegt fehl → RLS-Error
            expect(error).toMatch(/row-level security/i);
          } else {
            // RLS filtert die Row → 0 affected
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
