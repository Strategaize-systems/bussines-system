/**
 * V8.17 SLC-915 MT-4 — MIG-055 DB-Verification (Class-C changed-FK-only BEFORE-UPDATE-Trigger
 * + UPDATE-`WITH CHECK` zurueck auf OR, ISSUE-140).
 *
 * Lauf-Pattern: Coolify-Test-Setup via node:20 im business-net, raw pg-Client mit
 * TEST_DATABASE_URL (siehe .claude/rules/coolify-test-setup.md / Playbook). Liegt unter
 * cockpit/__tests__/ und ist daher NICHT im default `vitest run` (include: src/**)
 * — wird explizit im /deploy-Fenster gegen die Coolify-DB gefahren (AC-915-5),
 * NACHDEM MIG-055 appliziert wurde:
 *
 *   docker run --rm \
 *     --network k9f5pn5upfq7etoefb5ukbcg_business-net \
 *     -v /opt/business-system-test/cockpit:/app -w /app \
 *     -e TEST_DATABASE_URL='postgresql://postgres:<urlenc-pw>@supabase-db:5432/postgres' \
 *     node:20 npx vitest run __tests__/migrations/055-v817-class-c-changed-fk-trigger.test.ts
 *
 * Seed-Modell (im login-Superuser = postgres, RLS-bypass; alles in EINER Transaction
 * die in afterAll komplett zurueckgerollt wird). Seeds sind INSERTs -> feuern den
 * BEFORE-UPDATE-Trigger NICHT; Superuser umgeht RLS -> mixed-owner-Row seedbar:
 *   - ownDeal / ownContact      -> owner = member (sichtbar fuer member via owner=auth.uid())
 *   - foreignContact            -> owner = admin  (unsichtbar fuer member: kein admin, kein teamlead)
 *   - mixedSignal {deal=ownDeal, contact=foreignContact}  -> "Alt-Row aus der OR-Aera" /
 *      admin-erstellte mixed-owner-Row; member sieht sie (deal-Zweig), darf sie statusen.
 *   - ownSignal   {deal=ownDeal, contact=ownContact}      -> voll eigene Row.
 *
 * Kern-Verhalten (ISSUE-140-Fix):
 *   POS: Status-Update (kein FK geaendert) auf mixed-owner-Row als member -> PASS
 *        (MIG-054-AND haette 42501 geworfen -> genau der behobene False-Positive-Freeze).
 *   NEG: FK-Change auf unsichtbaren Parent als member -> BLOCK insufficient_privilege
 *        (Trigger; Cross-Tenant-Injection auf UPDATE-Pfad weiter zu).
 *   INSERT strikt bleibt: Cross-Tenant-FK-Insert als member -> BLOCK (MIG-054-AND, unangetastet).
 *   service_role / admin: Trigger-Bypass -> FK-Change PASS.
 *
 * Voraussetzung: MIG-055 applied auf der TEST_DATABASE_URL-DB. Je ein Profil mit
 * role='member' und role='admin' vorhanden (Founder-DB erfuellt das).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

let client: Client;
let memberId: string;
let adminId: string;
let ownDeal: string;
let ownContact: string;
let foreignContact: string;
let signalType: string;
let mixedSignal: string;
let ownSignal: string;

async function asAuthenticated(c: Client, sub: string): Promise<void> {
  await c.query(`SET LOCAL request.jwt.claim.sub = '${sub}'`);
  await c.query(
    `SET LOCAL request.jwt.claims = '{"sub":"${sub}","role":"authenticated"}'`
  );
  await c.query("SET LOCAL ROLE authenticated");
}

async function asServiceRole(c: Client): Promise<void> {
  await c.query("SET LOCAL ROLE service_role");
}

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL nicht gesetzt — Setup laut .claude/rules/coolify-test-setup.md noetig."
    );
  }
  client = new Client({ connectionString: url });
  await client.connect();

  const m = await client.query<{ id: string }>(
    `SELECT id FROM profiles WHERE role = 'member' ORDER BY created_at LIMIT 1`
  );
  const a = await client.query<{ id: string }>(
    `SELECT id FROM profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1`
  );
  if (!m.rows[0] || !a.rows[0]) {
    throw new Error("Test-DB braucht je ein member- und ein admin-Profil.");
  }
  memberId = m.rows[0].id;
  adminId = a.rows[0].id;

  const st = await client.query<{ signal_type: string }>(
    `SELECT signal_type FROM signals WHERE signal_type IS NOT NULL LIMIT 1`
  );
  signalType = st.rows[0]?.signal_type ?? "engagement";

  // Seed im Superuser (RLS-bypass). Transaction bleibt bis afterAll offen.
  await client.query("BEGIN");
  const d = await client.query<{ id: string }>(
    `INSERT INTO deals (title, owner_user_id) VALUES ('MIG-055 own deal', $1) RETURNING id`,
    [memberId]
  );
  ownDeal = d.rows[0].id;
  const oc = await client.query<{ id: string }>(
    `INSERT INTO contacts (first_name, last_name, owner_user_id) VALUES ('Own', 'Contact', $1) RETURNING id`,
    [memberId]
  );
  ownContact = oc.rows[0].id;
  const fc = await client.query<{ id: string }>(
    `INSERT INTO contacts (first_name, last_name, owner_user_id) VALUES ('Foreign', 'Contact', $1) RETURNING id`,
    [adminId]
  );
  foreignContact = fc.rows[0].id;

  // mixed-owner-Row: deal sichtbar (member), contact unsichtbar (admin).
  const ms = await client.query<{ id: string }>(
    `INSERT INTO signals (signal_type, deal_id, contact_id, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
    [signalType, ownDeal, foreignContact, memberId]
  );
  mixedSignal = ms.rows[0].id;

  // voll eigene Row.
  const os = await client.query<{ id: string }>(
    `INSERT INTO signals (signal_type, deal_id, contact_id, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
    [signalType, ownDeal, ownContact, memberId]
  );
  ownSignal = os.rows[0].id;
});

afterAll(async () => {
  if (client) {
    await client.query("ROLLBACK"); // verwirft alle Seeds
    await client.end();
  }
});

describe("MIG-055 — Class-C changed-FK-only Trigger + UPDATE-WITH-CHECK OR (ISSUE-140)", () => {
  // -- Kern: der behobene False-Positive-Freeze -----------------------------

  it("POS member Status-Update (kein FK geaendert) auf mixed-owner-Row -> PASS (ISSUE-140-Fix)", async () => {
    await client.query("SAVEPOINT s");
    await asAuthenticated(client, memberId);
    const res = await client.query(
      `UPDATE signals SET signal_type = signal_type WHERE id = $1`,
      [mixedSignal]
    );
    expect(res.rowCount).toBe(1); // MIG-054-AND haette hier 42501 geworfen
    await client.query("ROLLBACK TO SAVEPOINT s");
  });

  it("POS member UPDATE mit unveraendertem Fremd-FK explizit gesetzt (contact_id=contact_id) -> PASS", async () => {
    await client.query("SAVEPOINT s");
    await asAuthenticated(client, memberId);
    const res = await client.query(
      `UPDATE signals SET contact_id = contact_id WHERE id = $1`,
      [mixedSignal]
    );
    expect(res.rowCount).toBe(1); // NEW.contact_id IS NOT DISTINCT FROM OLD -> Trigger no-op
    await client.query("ROLLBACK TO SAVEPOINT s");
  });

  // -- Injection-Schutz auf dem UPDATE-Pfad (Trigger) ----------------------

  it("NEG member aendert FK auf unsichtbaren Parent (contact_id -> foreign) -> BLOCK insufficient_privilege", async () => {
    await client.query("SAVEPOINT s");
    await asAuthenticated(client, memberId);
    let err: { code?: string } | null = null;
    try {
      await client.query(`UPDATE signals SET contact_id = $1 WHERE id = $2`, [
        foreignContact,
        ownSignal,
      ]);
    } catch (e) {
      err = e as { code?: string };
    }
    await client.query("ROLLBACK TO SAVEPOINT s");
    expect(err).not.toBeNull();
    expect(err?.code).toBe("42501"); // insufficient_privilege (Trigger-RAISE)
  });

  it("POS member aendert FK auf SICHTBAREN Parent (contact_id -> own) -> PASS", async () => {
    await client.query("SAVEPOINT s");
    await asAuthenticated(client, memberId);
    const res = await client.query(
      `UPDATE signals SET contact_id = $1 WHERE id = $2`,
      [ownContact, mixedSignal]
    );
    expect(res.rowCount).toBe(1); // sichtbarer Ziel-Parent -> Trigger laesst durch
    await client.query("ROLLBACK TO SAVEPOINT s");
  });

  // -- INSERT strikt bleibt (MIG-054-AND, von MIG-055 unangetastet) --------

  it("NEG member INSERT {deal=own, contact=fremd} -> BLOCK (INSERT-AND strikt geblieben)", async () => {
    await client.query("SAVEPOINT s");
    await asAuthenticated(client, memberId);
    let err: { code?: string } | null = null;
    try {
      await client.query(
        `INSERT INTO signals (signal_type, deal_id, contact_id, created_by) VALUES ($1, $2, $3, $4)`,
        [signalType, ownDeal, foreignContact, memberId]
      );
    } catch (e) {
      err = e as { code?: string };
    }
    await client.query("ROLLBACK TO SAVEPOINT s");
    expect(err).not.toBeNull();
    expect(err?.code).toBe("42501");
  });

  // -- Bypass-Pfade (Trigger service_role-aware; admin via can_see_owner) ---

  it("POS service_role aendert FK auf unsichtbaren Parent -> PASS (Trigger-Bypass)", async () => {
    await client.query("SAVEPOINT s");
    await asServiceRole(client);
    const res = await client.query(
      `UPDATE signals SET contact_id = $1 WHERE id = $2`,
      [foreignContact, ownSignal]
    );
    expect(res.rowCount).toBe(1); // current_user = 'service_role' -> Guard uebersprungen
    await client.query("ROLLBACK TO SAVEPOINT s");
  });

  it("POS admin aendert FK auf member-Parent -> PASS (can_see_owner enthaelt is_admin)", async () => {
    await client.query("SAVEPOINT s");
    await asAuthenticated(client, adminId);
    // admin aendert ownSignal.contact_id auf ownContact (member-owned, fuer admin sichtbar)
    const res = await client.query(
      `UPDATE signals SET contact_id = $1 WHERE id = $2`,
      [ownContact, ownSignal]
    );
    expect(res.rowCount).toBe(1);
    await client.query("ROLLBACK TO SAVEPOINT s");
  });

  // -- Struktur: pattern-weiter Satz (alle 9 Tabellen) ---------------------

  it("Struktur: 9 changed-FK-Guard-Trigger existieren (BEFORE UPDATE)", async () => {
    const tables = [
      "tasks",
      "signals",
      "calendar_events",
      "handoffs",
      "cadence_enrollments",
      "documents",
      "email_threads",
      "referrals",
      "email_attachments",
    ];
    const res = await client.query<{ tbl: string; tgname: string }>(
      `SELECT c.relname AS tbl, t.tgname
         FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
        WHERE t.tgname LIKE '%_changed_fk_guard' AND NOT t.tgisinternal
        ORDER BY c.relname`
    );
    const seen = new Set(res.rows.map((r) => r.tbl));
    for (const t of tables) {
      expect(seen.has(t), `Trigger auf ${t} fehlt`).toBe(true);
    }
    expect(res.rows.length).toBe(9);
  });

  it("Struktur: 9 _update-Policies WITH CHECK = OR-Shape; 9 _insert-Policies = AND-Conjunction", async () => {
    const policyBase: Record<string, string> = {
      tasks: "tasks",
      signals: "signals",
      calendar_events: "calendar_events",
      handoffs: "handoffs",
      cadence_enrollments: "cadence_enrollments",
      documents: "documents_table",
      email_threads: "email_threads",
      referrals: "referrals",
      email_attachments: "email_attachments",
    };

    for (const [table, base] of Object.entries(policyBase)) {
      // UPDATE = OR: darf die MIG-054-Conjunction-Marker NICHT (mehr) tragen.
      const upd = await client.query<{ with_check: string | null }>(
        `SELECT with_check FROM pg_policies
          WHERE schemaname='public' AND tablename=$1 AND policyname=$2 AND cmd='UPDATE'`,
        [table, `${base}_update`]
      );
      expect(upd.rows[0]?.with_check, `${table} UPDATE-Policy fehlt`).toBeTruthy();
      const uwc = (upd.rows[0]!.with_check as string).replace(/\s+/g, " ");
      expect(
        uwc.includes("IS NULL) OR (EXISTS"),
        `${table} UPDATE WITH CHECK sollte OR-Shape sein (keine per-FK-Conjunction)`
      ).toBe(false);

      // INSERT = AND-Conjunction: MIG-054-Marker MUSS bleiben.
      const ins = await client.query<{ with_check: string | null }>(
        `SELECT with_check FROM pg_policies
          WHERE schemaname='public' AND tablename=$1 AND policyname=$2 AND cmd='INSERT'`,
        [table, `${base}_insert`]
      );
      expect(ins.rows[0]?.with_check, `${table} INSERT-Policy fehlt`).toBeTruthy();
      const iwc = (ins.rows[0]!.with_check as string).replace(/\s+/g, " ");
      expect(
        iwc.includes("IS NULL) OR (EXISTS"),
        `${table} INSERT WITH CHECK muss AND-Conjunction bleiben (MIG-054 unangetastet)`
      ).toBe(true);
    }
  });
});
