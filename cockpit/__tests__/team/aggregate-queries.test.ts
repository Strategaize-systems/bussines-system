/**
 * SLC-705 MT-1 — Aggregate-Query-Layer Test gegen Coolify-DB.
 *
 * Pattern uebernommen von __tests__/rls/v7-rls-matrix.test.ts:
 *   - pg.Client direkt (NICHT supabase-js)
 *   - BEGIN/ROLLBACK pro Test
 *   - SET LOCAL ROLE 'authenticated'
 *   - SET LOCAL "request.jwt.claim.sub" = <TEST_TEAMLEAD_ID>
 *
 * Wir testen hier nicht die TypeScript-Funktionen direkt (die brauchen einen
 * Next.js-Server-Context-Client), sondern die SQL-Logik, die in
 * aggregate-queries.ts steckt. Die Logik wird 1:1 als pg-Query repliziert und
 * gegen die geseedeten Test-Records gepruefte. Geht eine Diskrepanz zwischen
 * dem Funktions-SQL und dem Test-SQL ein, ist das ein Bug — Test und
 * Production-Code muessen daher synchron gehalten werden (TODO: spaeter
 * potenziell durch eine SQL-Helper-Funktion ersetzen, die beide aufrufen).
 *
 * Voraussetzung:
 *   - TEST_DATABASE_URL gesetzt
 *   - MIG-033..035 appliedet
 *   - `npm run seed:multi-user` gelaufen (1 Team + 1 Teamlead + 5 Members
 *     + 100 Deals + 500 Activities)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

const TEST_TEAM_ID = "00000000-0000-0000-0000-000000000077";
const TEST_TEAMLEAD_ID = "00000000-0000-0000-0000-000000000078";
const TEST_MEMBER_IDS = [
  "00000000-0000-0000-0000-000000000081",
  "00000000-0000-0000-0000-000000000082",
  "00000000-0000-0000-0000-000000000083",
  "00000000-0000-0000-0000-000000000084",
  "00000000-0000-0000-0000-000000000085",
];

let client: Client;

async function setTeamleadSession(): Promise<void> {
  await client.query("SET LOCAL ROLE authenticated");
  await client.query(
    `SET LOCAL "request.jwt.claim.sub" = '${TEST_TEAMLEAD_ID}'`,
  );
}

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL nicht gesetzt");
  client = new Client({ connectionString: url });
  await client.connect();
});

afterAll(async () => {
  if (client) await client.end();
});

describe("SLC-705 MT-1 — Aggregate Queries (RLS-gefiltert, Teamlead-Session)", () => {
  it("getTeamMembers liefert genau 5 Members fuer Test-Team (Teamlead nicht in Liste)", async () => {
    await client.query("BEGIN");
    try {
      await setTeamleadSession();

      // Spiegelt die Production-SQL-Logik aus getTeamMembers:
      //   profiles WHERE team_id = caller.team_id AND id != caller.id
      // Der Teamlead taucht NICHT in seiner eigenen Mitarbeiter-Tabelle auf.
      const { rows } = await client.query<{ id: string }>(
        `SELECT p.id
           FROM profiles p
          WHERE p.team_id = (SELECT team_id FROM profiles WHERE id = $1)
            AND p.id != $1`,
        [TEST_TEAMLEAD_ID],
      );

      const memberIds = rows.map((r) => r.id).sort();
      const expected = [...TEST_MEMBER_IDS].sort();
      expect(memberIds).toEqual(expected);
      expect(memberIds.length).toBe(5);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("getTeamKPIs.pipelineSum entspricht hand-berechnetem Seed-Wert", async () => {
    await client.query("BEGIN");
    try {
      await setTeamleadSession();

      // Hand-berechneter Erwartungswert: Seed verteilt 100 Deals (i = 0..99)
      // mit value = 1000 + i*50 auf 5 Member round-robin. Status default 'active'.
      // pipelineSum = SUM(1000 + i*50) fuer i = 0..99 = 100*1000 + 50*sum(0..99)
      //             = 100000 + 50*4950 = 100000 + 247500 = 347500
      const expectedSum = 347500;

      const { rows } = await client.query<{ sum: string }>(
        `SELECT COALESCE(SUM(value), 0)::TEXT AS sum
           FROM deals
          WHERE status = 'active'
            AND owner_user_id = ANY($1::uuid[])`,
        [TEST_MEMBER_IDS],
      );

      const sum = Number(rows[0].sum);
      expect(sum).toBe(expectedSum);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("getTeamKPIs.openActivitiesCount: alle 500 seed-activities sind offen (completed_at IS NULL)", async () => {
    await client.query("BEGIN");
    try {
      await setTeamleadSession();

      // Spec: openActivitiesCount = COUNT WHERE completed_at IS NULL AND due_date < tomorrow_midnight
      // Seed setzt due_date NICHT — bleibt NULL. Predicate "due_date < X" eliminiert NULL-Rows.
      // Daher: openActivitiesCount = 0 fuer geseedete Daten (die haben kein due_date).
      // Wir verifizieren stattdessen: COUNT(activities WHERE completed_at IS NULL) = 500.
      const { rows: openRows } = await client.query<{ count: string }>(
        `SELECT COUNT(*)::TEXT AS count
           FROM activities
          WHERE completed_at IS NULL
            AND owner_user_id = ANY($1::uuid[])`,
        [TEST_MEMBER_IDS],
      );
      expect(Number(openRows[0].count)).toBe(500);

      // openActivitiesCount im Sinne der Funktion (mit due_date-Filter) waere 0:
      const { rows: dueRows } = await client.query<{ count: string }>(
        `SELECT COUNT(*)::TEXT AS count
           FROM activities
          WHERE completed_at IS NULL
            AND due_date < (CURRENT_DATE + INTERVAL '1 day')
            AND owner_user_id = ANY($1::uuid[])`,
        [TEST_MEMBER_IDS],
      );
      expect(Number(dueRows[0].count)).toBe(0);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("getTeamKPIs.conversionRate30d ist 0 (keine won/lost Deals in 30d im Seed)", async () => {
    await client.query("BEGIN");
    try {
      await setTeamleadSession();

      // Seed setzt status default 'active' — keine won/lost Rows.
      const { rows } = await client.query<{ count: string }>(
        `SELECT COUNT(*)::TEXT AS count
           FROM deals
          WHERE status IN ('won', 'lost')
            AND updated_at >= NOW() - INTERVAL '30 days'
            AND owner_user_id = ANY($1::uuid[])`,
        [TEST_MEMBER_IDS],
      );

      // Denominator = 0 -> Rate = 0 (defensive default)
      expect(Number(rows[0].count)).toBe(0);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("getTeamBedrockContext.members.length === 5", async () => {
    // Logisch identisch zu getTeamMembers — Bedrock-Context wraps die gleiche
    // Liste (caller-Self filtered out).
    await client.query("BEGIN");
    try {
      await setTeamleadSession();

      const { rows } = await client.query<{ id: string }>(
        `SELECT p.id
           FROM profiles p
          WHERE p.team_id = $1
            AND p.id != $2`,
        [TEST_TEAM_ID, TEST_TEAMLEAD_ID],
      );

      expect(rows.length).toBe(5);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  it("Edge: getTeamKPIs.backlogMemberCount = 0 (keine Activity hat due_date < NOW())", async () => {
    await client.query("BEGIN");
    try {
      await setTeamleadSession();

      // Seed setzt due_date nicht (= NULL). NULL < NOW() ist NULL (kein Match).
      // backlogMemberCount im Sinne der Funktion = 0.
      const { rows } = await client.query<{ count: string }>(
        `SELECT COUNT(DISTINCT owner_user_id)::TEXT AS count
           FROM activities
          WHERE completed_at IS NULL
            AND due_date < NOW()
            AND owner_user_id = ANY($1::uuid[])`,
        [TEST_MEMBER_IDS],
      );

      expect(Number(rows[0].count)).toBe(0);
    } finally {
      await client.query("ROLLBACK");
    }
  });

  // TODO: Edge-Case "no deals exist for owner" ist nicht-trivial gegen den
  // Live-Seed zu testen, weil seed:multi-user immer Deals/Activities erzeugt.
  // Sollte ein dezidierter "leeres Team"-Test gebraucht werden, muesste ein
  // separates Test-Team ohne Member-Records aufgesetzt werden.
});
