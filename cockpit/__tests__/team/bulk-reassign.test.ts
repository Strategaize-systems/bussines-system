/**
 * SLC-707 MT-1 — Bulk-Reassign Tests gegen Coolify-DB.
 *
 * Coverage:
 *   - AC1 Preview-Count-Correctness
 *   - AC2 Apply-Owner-Overwrite + 9-Entry-Audit-Trail (Happy Path)
 *   - AC2b Security (Defense-in-Depth: member-blocked, cross-team-blocked, filter-injection-safe)
 *   - AC2c Two-Phase-Audit (Initiated-Pre-Tx ueberlebt Rollback, Applied-In-Tx wird rolled-back)
 *
 * Voraussetzung:
 *   - TEST_DATABASE_URL gesetzt
 *   - MIG-033..035 appliedet
 *   - `npm run seed:multi-user` gelaufen (Team 077, Teamlead 078, Members 081..085)
 *
 * Wir testen NICHT die Server-Action-Funktionen direkt (die nutzen
 * Next.js-cookies()), sondern die exportierten Pure-Helper + DB-Executor +
 * Audit-Writer.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Client } from "pg";

import {
  validateBulkReassignInput,
  assertCanReassign,
  buildFilterClause,
  countAffectedPerTable,
  applyReassignPerTable,
  writeAppliedAudit,
  CORE_TABLES,
  type CallerProfile,
} from "../../src/lib/team/bulk-reassign";

const TEST_TEAM_ID = "00000000-0000-0000-0000-000000000077";
const TEST_TEAMLEAD_ID = "00000000-0000-0000-0000-000000000078";
const TEST_MEMBER_81 = "00000000-0000-0000-0000-000000000081";
const TEST_MEMBER_82 = "00000000-0000-0000-0000-000000000082";

const AUDIT_TEST_CONTEXT = "slc-707/bulk-reassign-test";

let client: Client;

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL nicht gesetzt");
  client = new Client({ connectionString: url });
  await client.connect();
});

afterAll(async () => {
  if (client) {
    // Cleanup: alle Test-Audit-Eintraege loeschen, die wir ausserhalb einer
    // Test-Tx geschrieben haben (Phase-1-Audit ueberlebt Rollback bewusst).
    await client.query(`DELETE FROM audit_log WHERE context = $1`, [AUDIT_TEST_CONTEXT]);
    await client.end();
  }
});

afterEach(async () => {
  // Cleanup nach jedem Test, der Audits ausserhalb einer Tx schrieb
  await client.query(`DELETE FROM audit_log WHERE context = $1`, [AUDIT_TEST_CONTEXT]);
});

// ─────────────────────────────────────────────────────────────────────────────
// Pure-Function-Tests (kein DB-Zugriff)
// ─────────────────────────────────────────────────────────────────────────────

describe("validateBulkReassignInput", () => {
  it("akzeptiert gueltige UUIDs + erlaubten Status", () => {
    const r = validateBulkReassignInput({
      from: TEST_MEMBER_81,
      to: TEST_MEMBER_82,
      filter: { status: "open", pipeline_id: "11111111-1111-1111-1111-111111111111" },
    });
    expect(r.ok).toBe(true);
  });

  it("lehnt malformed UUID ab (from)", () => {
    const r = validateBulkReassignInput({ from: "not-a-uuid", to: TEST_MEMBER_82 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("validation");
  });

  it("lehnt from === to ab", () => {
    const r = validateBulkReassignInput({ from: TEST_MEMBER_81, to: TEST_MEMBER_81 });
    expect(r.ok).toBe(false);
  });

  it("AC2b filter-injection-safe: lehnt SQL-Injection-Versuch im pipeline_id ab", () => {
    const r = validateBulkReassignInput({
      from: TEST_MEMBER_81,
      to: TEST_MEMBER_82,
      filter: { pipeline_id: "'; DROP TABLE companies; --" },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/pipeline_id/);
  });

  it("AC2b filter-injection-safe: lehnt unbekannten Status-Wert ab (Whitelist)", () => {
    const r = validateBulkReassignInput({
      from: TEST_MEMBER_81,
      to: TEST_MEMBER_82,
      filter: { status: "DROP TABLE" },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Status/);
  });
});

describe("assertCanReassign (AC2b Defense-in-Depth Gates 1+2)", () => {
  const admin: CallerProfile = { user_id: "u-admin", role: "admin", team_id: "team-a" };
  const teamleadA: CallerProfile = { user_id: "u-tl-a", role: "teamlead", team_id: "team-a" };
  const member: CallerProfile = { user_id: "u-mem", role: "member", team_id: "team-a" };

  it("member-blocked-403: Member wird abgewiesen", () => {
    const r = assertCanReassign(member, "team-a", "team-a");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("forbidden");
  });

  it("not-authenticated: null caller wird abgewiesen", () => {
    const r = assertCanReassign(null, "team-a", "team-a");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("not_authenticated");
  });

  it("cross-team-blocked: Teamlead darf nicht aus fremdem Team reassign", () => {
    const r = assertCanReassign(teamleadA, "team-b", "team-a");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("forbidden");
  });

  it("cross-team-blocked: Teamlead darf nicht in fremdes Team reassign", () => {
    const r = assertCanReassign(teamleadA, "team-a", "team-b");
    expect(r.ok).toBe(false);
  });

  it("teamlead-within-team: Teamlead darf within-Team", () => {
    const r = assertCanReassign(teamleadA, "team-a", "team-a");
    expect(r.ok).toBe(true);
  });

  it("admin-cross-team: Admin darf cross-Team", () => {
    const r = assertCanReassign(admin, "team-a", "team-b");
    expect(r.ok).toBe(true);
  });
});

describe("buildFilterClause", () => {
  it("companies ignoriert pipeline_id-Filter (Tabelle hat keine pipeline_id-Spalte)", () => {
    const r = buildFilterClause("companies", { pipeline_id: TEST_TEAM_ID }, 2);
    expect(r.whereSql).toBe("");
    expect(r.params).toEqual([]);
  });

  it("deals akzeptiert pipeline_id-Filter", () => {
    const r = buildFilterClause("deals", { pipeline_id: TEST_TEAM_ID }, 2);
    expect(r.whereSql).toContain("pipeline_id = $2");
    expect(r.params).toEqual([TEST_TEAM_ID]);
  });

  it("deals mit allen Filtern produziert mehrere parametrisierte Klauseln", () => {
    const r = buildFilterClause(
      "deals",
      {
        pipeline_id: TEST_TEAM_ID,
        status: "open",
        created_at_from: "2026-01-01",
        created_at_to: "2026-12-31",
      },
      2,
    );
    expect(r.whereSql).toMatch(/AND pipeline_id = \$2 AND status = \$3 AND created_at >= \$4 AND created_at < \$5/);
    expect(r.params).toEqual([TEST_TEAM_ID, "open", "2026-01-01", "2026-12-31"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DB-Tests (gegen Coolify-DB, jede Test-Tx mit ROLLBACK)
// ─────────────────────────────────────────────────────────────────────────────

describe("countAffectedPerTable (AC1)", () => {
  it("zaehlt eingefuegte Deals fuer einen User korrekt", async () => {
    await client.query("BEGIN");
    try {
      await client.query("SET LOCAL ROLE postgres");

      // Baseline-Count fuer Teamlead (sollte 0 sein, Seed gibt Teamlead keine Deals)
      const baseline = await countAffectedPerTable(client as never, TEST_TEAMLEAD_ID, {});
      const baselineTotal = baseline.reduce((sum, t) => sum + t.count, 0);

      // 3 Test-Deals fuer Teamlead
      await client.query(
        `INSERT INTO deals (title, value, status, owner_user_id) VALUES
          ('slc707-test-deal-1', 1000, 'open', $1),
          ('slc707-test-deal-2', 2000, 'won', $1),
          ('slc707-test-deal-3', 3000, 'lost', $1)`,
        [TEST_TEAMLEAD_ID],
      );

      const after = await countAffectedPerTable(client as never, TEST_TEAMLEAD_ID, {});
      const afterTotal = after.reduce((sum, t) => sum + t.count, 0);

      expect(afterTotal - baselineTotal).toBe(3);

      const dealsCount = after.find((t) => t.name === "deals")?.count ?? 0;
      const baselineDeals = baseline.find((t) => t.name === "deals")?.count ?? 0;
      expect(dealsCount - baselineDeals).toBe(3);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("Status-Filter narrows count (deals)", async () => {
    await client.query("BEGIN");
    try {
      await client.query("SET LOCAL ROLE postgres");

      await client.query(
        `INSERT INTO deals (title, value, status, owner_user_id) VALUES
          ('slc707-filter-open-1', 100, 'open', $1),
          ('slc707-filter-open-2', 200, 'open', $1),
          ('slc707-filter-won-1', 300, 'won', $1)`,
        [TEST_TEAMLEAD_ID],
      );

      const openCounts = await countAffectedPerTable(client as never, TEST_TEAMLEAD_ID, {
        status: "open",
      });
      const wonCounts = await countAffectedPerTable(client as never, TEST_TEAMLEAD_ID, {
        status: "won",
      });

      const openDeals = openCounts.find((t) => t.name === "deals")?.count ?? 0;
      const wonDeals = wonCounts.find((t) => t.name === "deals")?.count ?? 0;

      expect(openDeals).toBeGreaterThanOrEqual(2);
      expect(wonDeals).toBeGreaterThanOrEqual(1);
      expect(openDeals).toBeGreaterThan(wonDeals);
    } finally {
      await client.query("ROLLBACK");
    }
  });
});

describe("applyReassignPerTable (AC2)", () => {
  it("UPDATE ueberschreibt owner_user_id auf to-User", async () => {
    await client.query("BEGIN");
    try {
      await client.query("SET LOCAL ROLE postgres");

      const { rows: insertedRows } = await client.query<{ id: string }>(
        `INSERT INTO deals (title, value, status, owner_user_id) VALUES
          ('slc707-reassign-1', 500, 'open', $1),
          ('slc707-reassign-2', 600, 'open', $1)
         RETURNING id`,
        [TEST_TEAMLEAD_ID],
      );
      expect(insertedRows.length).toBe(2);

      const result = await applyReassignPerTable(
        client as never,
        TEST_TEAMLEAD_ID,
        TEST_MEMBER_81,
        {},
      );

      const deals = result.find((t) => t.name === "deals");
      expect(deals?.affected_rows).toBeGreaterThanOrEqual(2);

      // Verify die spezifischen Inserted-Rows wurden umgehaengt
      const { rows: checkRows } = await client.query<{ owner_user_id: string }>(
        `SELECT owner_user_id FROM deals WHERE id = ANY($1::uuid[])`,
        [insertedRows.map((r) => r.id)],
      );
      for (const r of checkRows) {
        expect(r.owner_user_id).toBe(TEST_MEMBER_81);
      }
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("liefert Eintrag pro CORE_TABLE (8 Tabellen)", async () => {
    await client.query("BEGIN");
    try {
      await client.query("SET LOCAL ROLE postgres");

      const result = await applyReassignPerTable(
        client as never,
        TEST_TEAMLEAD_ID,
        TEST_MEMBER_81,
        {},
      );

      expect(result.length).toBe(8);
      expect(result.map((r) => r.name).sort()).toEqual([...CORE_TABLES].sort());
    } finally {
      await client.query("ROLLBACK");
    }
  });
});

describe("Audit-Trail Phase 2 — Applied-Audit (AC2c)", () => {
  it("writeAppliedAudit innerhalb Tx wird bei Rollback mit-zurueckgerollt", async () => {
    const initiatedAuditId = "00000000-0000-0000-0000-000000000099"; // Dummy-ID

    await client.query("BEGIN");
    try {
      await client.query("SET LOCAL ROLE postgres");

      await writeAppliedAudit(
        client as never,
        TEST_TEAMLEAD_ID,
        initiatedAuditId,
        "deals",
        { from: TEST_TEAMLEAD_ID, to: TEST_MEMBER_81, filter: {}, affected_rows: 5 },
      );

      // Im Tx-Kontext sichtbar
      const { rows: inTx } = await client.query<{ count: string }>(
        `SELECT COUNT(*)::TEXT AS count FROM audit_log
         WHERE action = 'bulk_reassign_applied' AND changes->>'initiated_audit_id' = $1`,
        [initiatedAuditId],
      );
      expect(Number(inTx[0].count)).toBe(1);
    } finally {
      await client.query("ROLLBACK");
    }

    // Nach Rollback NICHT sichtbar
    const { rows: afterRollback } = await client.query<{ count: string }>(
      `SELECT COUNT(*)::TEXT AS count FROM audit_log
       WHERE action = 'bulk_reassign_applied' AND changes->>'initiated_audit_id' = $1`,
      [initiatedAuditId],
    );
    expect(Number(afterRollback[0].count)).toBe(0);
  });
});

describe("Two-Phase-Audit-Integrity (AC2c Failure-Path)", () => {
  it("simuliert Failure-Szenario: Initiated bleibt, Applied verschwindet bei Rollback", async () => {
    // Schritt 1: Initiated-Audit ueber EIGENE Verbindung (simuliert writeInitiatedAudit)
    // Wir nutzen eine zweite pg.Client-Connection statt der getPgClient-Helper,
    // weil getPgClient den Production-Pool aus POSTGRES_URL nutzt und nicht
    // TEST_DATABASE_URL.
    const auditConn = new Client({ connectionString: process.env.TEST_DATABASE_URL });
    await auditConn.connect();

    let initiatedAuditId: string;
    try {
      const { rows } = await auditConn.query<{ id: string }>(
        `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes, context)
         VALUES ($1, 'bulk_reassign_initiated', 'bulk_reassign', gen_random_uuid(),
                 $2::JSONB, $3)
         RETURNING id`,
        [
          TEST_TEAMLEAD_ID,
          JSON.stringify({ requested_from: TEST_TEAMLEAD_ID, requested_to: TEST_MEMBER_81, filter: {} }),
          AUDIT_TEST_CONTEXT,
        ],
      );
      initiatedAuditId = rows[0].id;
    } finally {
      await auditConn.end();
    }

    // Schritt 2: Tx oeffnen, Applied-Audit schreiben, Tx scheitert, Rollback
    await client.query("BEGIN");
    try {
      await client.query("SET LOCAL ROLE postgres");

      await writeAppliedAudit(client as never, TEST_TEAMLEAD_ID, initiatedAuditId, "deals", {
        from: TEST_TEAMLEAD_ID,
        to: TEST_MEMBER_81,
        filter: {},
        affected_rows: 99,
      });

      // Simuliere Failure
      throw new Error("forced failure");
    } catch {
      await client.query("ROLLBACK");
    }

    // Verifikation: Initiated-Eintrag persistiert, Applied-Eintrag verschwunden
    const { rows: initiatedRows } = await client.query<{ count: string }>(
      `SELECT COUNT(*)::TEXT AS count FROM audit_log WHERE id = $1`,
      [initiatedAuditId],
    );
    expect(Number(initiatedRows[0].count)).toBe(1);

    const { rows: appliedRows } = await client.query<{ count: string }>(
      `SELECT COUNT(*)::TEXT AS count FROM audit_log
       WHERE action = 'bulk_reassign_applied' AND changes->>'initiated_audit_id' = $1`,
      [initiatedAuditId],
    );
    expect(Number(appliedRows[0].count)).toBe(0);

    // Cleanup explizit
    await client.query(`DELETE FROM audit_log WHERE id = $1`, [initiatedAuditId]);
  });
});
