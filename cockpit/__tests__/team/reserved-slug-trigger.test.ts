/**
 * SLC-851 MT-2 — Reserved-Slug-Trigger RLS-Tests (MIG-039).
 *
 * Coverage:
 *   - AC3 Positive: INSERT eines non-reserved Slugs erfolgreich
 *   - AC4 Negative INSERT: Reserved-Slug wirft 23514 mit "reserved"-Message
 *   - AC5 Negative UPDATE: UPDATE auf Reserved-Slug wirft 23514
 *
 * Voraussetzung:
 *   - TEST_DATABASE_URL gesetzt
 *   - MIG-038 + MIG-039 applied
 *
 * Pattern aus coolify-test-setup.md:
 *   - node:20 (NICHT alpine, glibc-Pflicht)
 *   - SAVEPOINT um erwartete Trigger-Rejections (sonst Tx-Abort)
 *   - Cleanup im afterEach via ROLLBACK (kein Schema-Drift)
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Client } from "pg";

const TEST_SUFFIX = "851";

let client: Client;
const createdTeamIds: string[] = [];

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL nicht gesetzt");
  client = new Client({ connectionString: url });
  await client.connect();
});

afterEach(async () => {
  // Cleanup: erzeugte Test-Teams entfernen.
  if (createdTeamIds.length > 0) {
    await client.query("DELETE FROM teams WHERE id = ANY($1::uuid[])", [
      createdTeamIds,
    ]);
    createdTeamIds.length = 0;
  }
});

afterAll(async () => {
  await client.end();
});

describe("MIG-039 Reserved-Slug Trigger", () => {
  it("AC3 positive — INSERT eines non-reserved Slugs erfolgreich", async () => {
    const slug = `slc-${TEST_SUFFIX}-positive-${Date.now()}`;
    const res = await client.query(
      "INSERT INTO teams (name, slug) VALUES ($1, $2) RETURNING id, slug",
      [`Test ${TEST_SUFFIX}`, slug],
    );
    expect(res.rows[0].slug).toBe(slug);
    createdTeamIds.push(res.rows[0].id);
  });

  it("AC4 negative INSERT — Reserved-Slug 'admin' wirft 23514", async () => {
    await client.query("BEGIN");
    await client.query("SAVEPOINT try_insert");
    let errCode: string | null = null;
    let errMessage: string | null = null;
    try {
      await client.query(
        "INSERT INTO teams (name, slug) VALUES ($1, $2)",
        [`Test ${TEST_SUFFIX} Negative`, "admin"],
      );
    } catch (e) {
      errCode = (e as { code?: string }).code ?? null;
      errMessage = (e as Error).message;
    }
    await client.query("ROLLBACK TO SAVEPOINT try_insert");
    await client.query("ROLLBACK");

    expect(errCode).toBe("23514");
    expect(errMessage).toMatch(/reserved/i);
  });

  it("AC5 negative UPDATE — UPDATE existing slug auf 'strategaize' wirft 23514", async () => {
    // Setup: erst ein non-reserved Team anlegen.
    const initialSlug = `slc-${TEST_SUFFIX}-update-${Date.now()}`;
    const insertRes = await client.query(
      "INSERT INTO teams (name, slug) VALUES ($1, $2) RETURNING id",
      [`Test ${TEST_SUFFIX} Update`, initialSlug],
    );
    const teamId = insertRes.rows[0].id;
    createdTeamIds.push(teamId);

    // UPDATE-Versuch auf Reserved-Slug.
    await client.query("BEGIN");
    await client.query("SAVEPOINT try_update");
    let errCode: string | null = null;
    let errMessage: string | null = null;
    try {
      await client.query("UPDATE teams SET slug=$1 WHERE id=$2", [
        "strategaize",
        teamId,
      ]);
    } catch (e) {
      errCode = (e as { code?: string }).code ?? null;
      errMessage = (e as Error).message;
    }
    await client.query("ROLLBACK TO SAVEPOINT try_update");
    await client.query("ROLLBACK");

    expect(errCode).toBe("23514");
    expect(errMessage).toMatch(/reserved/i);

    // Verify: Slug wurde nicht geaendert.
    const verifyRes = await client.query(
      "SELECT slug FROM teams WHERE id=$1",
      [teamId],
    );
    expect(verifyRes.rows[0].slug).toBe(initialSlug);
  });

  it("AC1+AC2 sanity — is_reserved_slug() function returns korrekt", async () => {
    const res = await client.query(
      "SELECT is_reserved_slug('admin') AS r1, is_reserved_slug('ADMIN') AS r2, is_reserved_slug('strategaize-transition-bv') AS r3, is_reserved_slug('mein-tag') AS r4",
    );
    expect(res.rows[0].r1).toBe(true); // reserved
    expect(res.rows[0].r2).toBe(true); // case-insensitive
    expect(res.rows[0].r3).toBe(false); // not reserved
    expect(res.rows[0].r4).toBe(true); // reserved (BS-App-Path)
  });
});
