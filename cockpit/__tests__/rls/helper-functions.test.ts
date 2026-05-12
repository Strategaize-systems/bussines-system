/**
 * SLC-701 MT-4 — Helper-Function-Tests (V7).
 *
 * Verifiziert is_admin / is_teamlead / get_my_team_id / can_see_owner gegen
 * Coolify-DB. Voraussetzung: MIG-033 + MIG-034 + MIG-035 appliedet, Seed-Script
 * (`npm run seed:multi-user`) gelaufen.
 *
 * Auth-Simulation: SET LOCAL ROLE authenticated + SET LOCAL request.jwt.claim.sub
 * — auth.uid() liest current_setting('request.jwt.claim.sub'), siehe GoTrue.
 *
 * Pattern: BEGIN -> SET LOCAL -> SELECT -> ROLLBACK pro Test (Test-Isolation).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

const TEST_TEAM_ID = "00000000-0000-0000-0000-000000000077";
const TEST_TEAMLEAD_ID = "00000000-0000-0000-0000-000000000078";
const TEST_MEMBER_1 = "00000000-0000-0000-0000-000000000081";
const TEST_MEMBER_2 = "00000000-0000-0000-0000-000000000082";

let client: Client;
let realAdminId: string;

async function setSession(userId: string): Promise<void> {
  await client.query("SET LOCAL ROLE authenticated");
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${userId}'`);
}

async function withSession<T>(
  userId: string,
  fn: () => Promise<T>,
): Promise<T> {
  await client.query("BEGIN");
  try {
    await setSession(userId);
    return await fn();
  } finally {
    await client.query("ROLLBACK");
  }
}

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL nicht gesetzt");
  client = new Client({ connectionString: url });
  await client.connect();

  // Smoke: Test-Daten muessen vorhanden sein.
  const { rows: profileRows } = await client.query(
    `SELECT id, role FROM profiles WHERE id = ANY($1::uuid[])`,
    [[TEST_TEAMLEAD_ID, TEST_MEMBER_1, TEST_MEMBER_2]],
  );
  if (profileRows.length !== 3) {
    throw new Error(
      `Seed-Daten fehlen: erwarte 3 Test-Profiles, gefunden ${profileRows.length}. Vorher 'npm run seed:multi-user' ausfuehren.`,
    );
  }

  // Realen Admin holen (= echter Production-User aus profiles, NICHT Test-Daten).
  const { rows: adminRows } = await client.query(
    `SELECT id FROM profiles WHERE role = 'admin' AND id NOT IN ($1, $2, $3, $4, $5, $6)
       ORDER BY created_at ASC LIMIT 1`,
    [
      TEST_TEAMLEAD_ID,
      TEST_MEMBER_1,
      TEST_MEMBER_2,
      "00000000-0000-0000-0000-000000000083",
      "00000000-0000-0000-0000-000000000084",
      "00000000-0000-0000-0000-000000000085",
    ],
  );
  if (adminRows.length === 0) {
    throw new Error("Kein admin-Profile vorhanden — MIG-034 Backfill noetig.");
  }
  realAdminId = adminRows[0].id as string;
});

afterAll(async () => {
  if (client) await client.end();
});

describe("V7 RLS Helper Functions", () => {
  describe("is_admin()", () => {
    it("returns true fuer admin-Session", async () => {
      await withSession(realAdminId, async () => {
        const { rows } = await client.query<{ is_admin: boolean }>(
          "SELECT is_admin() AS is_admin",
        );
        expect(rows[0].is_admin).toBe(true);
      });
    });

    it("returns false fuer teamlead-Session", async () => {
      await withSession(TEST_TEAMLEAD_ID, async () => {
        const { rows } = await client.query<{ is_admin: boolean }>(
          "SELECT is_admin() AS is_admin",
        );
        expect(rows[0].is_admin).toBe(false);
      });
    });

    it("returns false fuer member-Session", async () => {
      await withSession(TEST_MEMBER_1, async () => {
        const { rows } = await client.query<{ is_admin: boolean }>(
          "SELECT is_admin() AS is_admin",
        );
        expect(rows[0].is_admin).toBe(false);
      });
    });
  });

  describe("is_teamlead()", () => {
    it("returns false fuer admin", async () => {
      await withSession(realAdminId, async () => {
        const { rows } = await client.query<{ is_teamlead: boolean }>(
          "SELECT is_teamlead() AS is_teamlead",
        );
        expect(rows[0].is_teamlead).toBe(false);
      });
    });

    it("returns true fuer teamlead", async () => {
      await withSession(TEST_TEAMLEAD_ID, async () => {
        const { rows } = await client.query<{ is_teamlead: boolean }>(
          "SELECT is_teamlead() AS is_teamlead",
        );
        expect(rows[0].is_teamlead).toBe(true);
      });
    });

    it("returns false fuer member", async () => {
      await withSession(TEST_MEMBER_1, async () => {
        const { rows } = await client.query<{ is_teamlead: boolean }>(
          "SELECT is_teamlead() AS is_teamlead",
        );
        expect(rows[0].is_teamlead).toBe(false);
      });
    });
  });

  describe("get_my_team_id()", () => {
    it("returns admin-team", async () => {
      await withSession(realAdminId, async () => {
        const { rows } = await client.query<{ team_id: string }>(
          "SELECT get_my_team_id() AS team_id",
        );
        // Admin sitzt im Strategaize-Default-Team (per MIG-034).
        expect(rows[0].team_id).toBeTruthy();
      });
    });

    it("returns Test-Team fuer Test-Teamlead", async () => {
      await withSession(TEST_TEAMLEAD_ID, async () => {
        const { rows } = await client.query<{ team_id: string }>(
          "SELECT get_my_team_id() AS team_id",
        );
        expect(rows[0].team_id).toBe(TEST_TEAM_ID);
      });
    });

    it("returns Test-Team fuer Test-Member", async () => {
      await withSession(TEST_MEMBER_1, async () => {
        const { rows } = await client.query<{ team_id: string }>(
          "SELECT get_my_team_id() AS team_id",
        );
        expect(rows[0].team_id).toBe(TEST_TEAM_ID);
      });
    });
  });

  describe("can_see_owner(target_owner)", () => {
    it("admin sieht jeden", async () => {
      await withSession(realAdminId, async () => {
        const { rows } = await client.query<{ can: boolean }>(
          "SELECT can_see_owner($1::uuid) AS can",
          [TEST_MEMBER_1],
        );
        expect(rows[0].can).toBe(true);
      });
    });

    it("teamlead sieht Member im eigenen Team", async () => {
      await withSession(TEST_TEAMLEAD_ID, async () => {
        const { rows } = await client.query<{ can: boolean }>(
          "SELECT can_see_owner($1::uuid) AS can",
          [TEST_MEMBER_1],
        );
        expect(rows[0].can).toBe(true);
      });
    });

    it("member sieht nur sich selbst, nicht andere Member", async () => {
      await withSession(TEST_MEMBER_1, async () => {
        const ownView = await client.query<{ can: boolean }>(
          "SELECT can_see_owner($1::uuid) AS can",
          [TEST_MEMBER_1],
        );
        const otherView = await client.query<{ can: boolean }>(
          "SELECT can_see_owner($1::uuid) AS can",
          [TEST_MEMBER_2],
        );
        expect(ownView.rows[0].can).toBe(true);
        expect(otherView.rows[0].can).toBe(false);
      });
    });
  });
});
