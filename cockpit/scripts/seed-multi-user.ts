#!/usr/bin/env tsx
/**
 * SLC-701 MT-1 — Seed-Script fuer Multi-User Performance-Smoke (V7).
 *
 * Erzeugt gegen TEST_DATABASE_URL (= dieselbe Coolify-DB, isoliert durch
 * Test-Team-UUID + [TEST]-Display-Name-Prefix) folgendes Datenmodell:
 *   - 1 Team "Test-Team"        (id = TEST_TEAM_ID)
 *   - 1 Teamlead-Profile        (id = TEST_TEAMLEAD_ID)
 *   - 5 Member-Profiles         (ids = TEST_MEMBER_IDS[0..4])
 *   - 50 companies              (owner zufaellig auf 5 Member verteilt)
 *   - 200 contacts              (jeweils einer Company zugeordnet)
 *   - 100 deals                 (jeweils einem Contact/Company zugeordnet)
 *   - 500 activities            (jeweils einem Deal zugeordnet)
 *
 * Idempotent: zweiter Run ueberschreibt ohne Fehler.
 * Reset:      `npm run seed:multi-user -- --reset` loescht alle [TEST]-Records.
 *
 * Usage:
 *   TEST_DATABASE_URL=postgresql://postgres:...@host:5432/postgres \
 *     npx tsx cockpit/scripts/seed-multi-user.ts          (seed)
 *   TEST_DATABASE_URL=... npx tsx cockpit/scripts/seed-multi-user.ts --reset
 */

import { Client } from "pg";
import { randomUUID } from "node:crypto";

const TEST_TEAM_ID = "00000000-0000-0000-0000-000000000077";
const TEST_TEAMLEAD_ID = "00000000-0000-0000-0000-000000000078";
const TEST_MEMBER_IDS: ReadonlyArray<string> = [
  "00000000-0000-0000-0000-000000000081",
  "00000000-0000-0000-0000-000000000082",
  "00000000-0000-0000-0000-000000000083",
  "00000000-0000-0000-0000-000000000084",
  "00000000-0000-0000-0000-000000000085",
];

const TARGET = {
  companies: 50,
  contacts: 200,
  deals: 100,
  activities: 500,
};

function isResetMode(): boolean {
  return process.argv.includes("--reset");
}

function pickMemberId(i: number): string {
  return TEST_MEMBER_IDS[i % TEST_MEMBER_IDS.length];
}

async function reset(client: Client): Promise<void> {
  const owners = [...TEST_MEMBER_IDS, TEST_TEAMLEAD_ID];
  // Reihenfolge: child tables zuerst (FK-Cascade nicht ueberall vorhanden).
  for (const table of [
    "activities",
    "calls",
    "email_messages",
    "proposals",
    "meetings",
    "deals",
    "contacts",
    "companies",
  ]) {
    await client.query(
      `DELETE FROM ${table} WHERE owner_user_id = ANY($1::uuid[])`,
      [owners],
    );
  }
  await client.query(`DELETE FROM profiles WHERE id = ANY($1::uuid[])`, [owners]);
  await client.query(`DELETE FROM teams WHERE id = $1`, [TEST_TEAM_ID]);
}

async function seedTeamAndProfiles(client: Client): Promise<void> {
  await client.query(
    `INSERT INTO teams (id, name) VALUES ($1, '[TEST] Test-Team')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [TEST_TEAM_ID],
  );

  await client.query(
    `INSERT INTO profiles (id, display_name, role, team_id)
       VALUES ($1, '[TEST] Test-Teamlead', 'teamlead', $2)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         role         = EXCLUDED.role,
         team_id      = EXCLUDED.team_id`,
    [TEST_TEAMLEAD_ID, TEST_TEAM_ID],
  );

  for (let i = 0; i < TEST_MEMBER_IDS.length; i++) {
    await client.query(
      `INSERT INTO profiles (id, display_name, role, team_id)
         VALUES ($1, $2, 'member', $3)
         ON CONFLICT (id) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           role         = EXCLUDED.role,
           team_id      = EXCLUDED.team_id`,
      [TEST_MEMBER_IDS[i], `[TEST] Test-Member ${i + 1}`, TEST_TEAM_ID],
    );
  }
}

async function seedCompanies(client: Client): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < TARGET.companies; i++) {
    const id = randomUUID();
    ids.push(id);
    await client.query(
      `INSERT INTO companies (id, name, owner_user_id)
         VALUES ($1, $2, $3)`,
      [id, `[TEST] Company ${i + 1}`, pickMemberId(i)],
    );
  }
  return ids;
}

async function seedContacts(client: Client, companyIds: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < TARGET.contacts; i++) {
    const id = randomUUID();
    ids.push(id);
    await client.query(
      `INSERT INTO contacts (id, first_name, last_name, company_id, owner_user_id)
         VALUES ($1, $2, $3, $4, $5)`,
      [
        id,
        `[TEST] First${i + 1}`,
        `[TEST] Last${i + 1}`,
        companyIds[i % companyIds.length],
        pickMemberId(i),
      ],
    );
  }
  return ids;
}

async function seedDeals(
  client: Client,
  companyIds: string[],
  contactIds: string[],
): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < TARGET.deals; i++) {
    const id = randomUUID();
    ids.push(id);
    await client.query(
      `INSERT INTO deals (id, title, value, company_id, contact_id, owner_user_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        `[TEST] Deal ${i + 1}`,
        1000 + i * 50,
        companyIds[i % companyIds.length],
        contactIds[i % contactIds.length],
        pickMemberId(i),
      ],
    );
  }
  return ids;
}

async function seedActivities(client: Client, dealIds: string[]): Promise<void> {
  const types: ReadonlyArray<string> = ["call", "email", "task", "note", "meeting"];
  for (let i = 0; i < TARGET.activities; i++) {
    const id = randomUUID();
    await client.query(
      `INSERT INTO activities (id, type, title, deal_id, owner_user_id)
         VALUES ($1, $2, $3, $4, $5)`,
      [id, types[i % types.length], `[TEST] Activity ${i + 1}`, dealIds[i % dealIds.length], pickMemberId(i)],
    );
  }
}

/**
 * Mini-Fixtures fuer RLS-Matrix-Tests (SLC-701 MT-6): pro Tabelle 1 Record
 * pro Test-Member, damit SELECT/UPDATE/DELETE-Tests Daten finden. Klein
 * gehalten — Volumen-Daten leben in companies/contacts/deals/activities.
 */
async function seedAuxiliaryFixtures(client: Client): Promise<void> {
  for (const memberId of TEST_MEMBER_IDS) {
    await client.query(
      `INSERT INTO meetings (id, title, scheduled_at, owner_user_id)
         VALUES ($1, $2, NOW(), $3)`,
      [randomUUID(), `[TEST] Meeting fuer ${memberId.slice(-2)}`, memberId],
    );
    await client.query(
      `INSERT INTO proposals (id, title, owner_user_id)
         VALUES ($1, $2, $3)`,
      [randomUUID(), `[TEST] Proposal fuer ${memberId.slice(-2)}`, memberId],
    );
    await client.query(
      `INSERT INTO email_messages
         (id, message_id, from_address, to_addresses, received_at, owner_user_id)
         VALUES ($1, $2, 'rls-test@example.de', ARRAY['rls-target@example.de'], NOW(), $3)`,
      [randomUUID(), `[TEST] rls-${memberId.slice(-2)}@local`, memberId],
    );
    await client.query(
      `INSERT INTO calls (id, owner_user_id) VALUES ($1, $2)`,
      [randomUUID(), memberId],
    );
  }
}

async function main(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.error("[seed] TEST_DATABASE_URL ist nicht gesetzt — abort.");
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  const t0 = Date.now();
  try {
    await client.query("BEGIN");

    // Idempotenz: vorhandene [TEST]-Records zuerst aufraeumen.
    await reset(client);

    if (isResetMode()) {
      await client.query("COMMIT");
      console.log(`[seed] Reset abgeschlossen in ${Date.now() - t0}ms`);
      return;
    }

    await seedTeamAndProfiles(client);
    const companyIds = await seedCompanies(client);
    const contactIds = await seedContacts(client, companyIds);
    const dealIds = await seedDeals(client, companyIds, contactIds);
    await seedActivities(client, dealIds);
    await seedAuxiliaryFixtures(client);

    await client.query("COMMIT");
    const auxiliary = TEST_MEMBER_IDS.length * 4; // meetings + proposals + email_messages + calls
    const total =
      TARGET.companies + TARGET.contacts + TARGET.deals + TARGET.activities + auxiliary + 1 + 1 + 5;
    console.log(
      `[seed] Seeded ${total} rows (1 team + 6 profiles + ${TARGET.companies} companies + ${TARGET.contacts} contacts + ${TARGET.deals} deals + ${TARGET.activities} activities + ${auxiliary} auxiliary fixtures) in ${Date.now() - t0}ms`,
    );
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[seed] ERROR:", e);
  process.exit(1);
});
