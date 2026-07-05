/**
 * V8.16 SLC-914 MT-2 — MIG-054 DB-Verification (Multi-Parent-Class-C WITH-CHECK-Härtung,
 * ISSUE-132 cross-tenant Row-Injection über nicht-geprüften FK-Zweig).
 *
 * Lauf-Pattern: Coolify-Test-Setup via node:20 im business-net, raw pg-Client mit
 * TEST_DATABASE_URL (siehe .claude/rules/coolify-test-setup.md). Liegt unter
 * cockpit/__tests__/ und ist daher NICHT im default `vitest run` (include: src/**)
 * — wird explizit im /deploy-Fenster gegen die Coolify-DB gefahren (AC-914-2),
 * NACHDEM MIG-054 appliziert wurde:
 *
 *   docker run --rm \
 *     --network k9f5pn5upfq7etoefb5ukbcg_business-net \
 *     -v /opt/business-system-test/cockpit:/app -w /app \
 *     -e TEST_DATABASE_URL='postgresql://postgres:<urlenc-pw>@supabase-db:5432/postgres' \
 *     node:20 npx vitest run __tests__/migrations/054-v816-class-c-withcheck.test.ts
 *
 * Seed-Modell (im login-Superuser = postgres, RLS-bypass; alles in EINER Transaction
 * die in afterAll komplett zurückgerollt wird):
 *   - ownDeal / ownContact      -> owner = member (sichtbar für member via owner=auth.uid())
 *   - foreignContact            -> owner = admin  (unsichtbar für member: kein admin, kein teamlead)
 *
 * Verhalten (signals = created_by-Shape, email_threads = KEIN-created_by-Shape):
 *   1. NEG signals {deal=own, contact=fremd}  -> RLS-Reject (der ISSUE-132-Exploit; unter
 *      OLD OR-Policy hätte der deal-Zweig durchgelassen).
 *   2. POS signals {deal=own, contact=own}     -> ok.
 *   3. POS signals {alle FK NULL, created_by=self} -> ok (all-NULL-Self-Zweig).
 *   4. NEG signals {alle FK NULL, created_by=fremd} -> Reject (created_by-Spoof blockiert).
 *   5. Admin-Bypass signals {deal=own(member), contact=fremd} als admin -> ok (is_admin unverändert).
 *   6. NEG email_threads {deal=own, contact=fremd} -> Reject.
 *   7. POS email_threads {deal=own, contact=own}   -> ok.
 *   8. NEG email_threads {alle FK NULL} als member -> Reject (kein created_by -> Orphan nur admin).
 *   9. POS email_threads {alle FK NULL} als admin  -> ok (Orphan-Semantik wie Bestand).
 *  10. Struktur: alle 9 Multi-Parent-Tabellen haben INSERT+UPDATE WITH CHECK in der
 *      neuen Conjunction-Shape (`<col> IS NULL) OR (EXISTS` pro FK-Spalte).
 *
 * Voraussetzung: MIG-054 applied auf der TEST_DATABASE_URL-DB. Je ein Profil mit
 * role='member' und role='admin' vorhanden (Founder-DB erfüllt das).
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

async function asAuthenticated(c: Client, sub: string): Promise<void> {
  await c.query(`SET LOCAL request.jwt.claim.sub = '${sub}'`);
  await c.query(
    `SET LOCAL request.jwt.claims = '{"sub":"${sub}","role":"authenticated"}'`
  );
  await c.query("SET LOCAL ROLE authenticated");
}

const NOW = "2026-01-01T00:00:00Z";

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

  // Gültigen signal_type aus Bestand ziehen (CHECK/enum-sicher), sonst Fallback.
  const st = await client.query<{ signal_type: string }>(
    `SELECT signal_type FROM signals WHERE signal_type IS NOT NULL LIMIT 1`
  );
  signalType = st.rows[0]?.signal_type ?? "engagement";

  // Seed im Superuser (RLS-bypass). Transaction bleibt bis afterAll offen.
  await client.query("BEGIN");
  const d = await client.query<{ id: string }>(
    `INSERT INTO deals (title, owner_user_id) VALUES ('MIG-054 own deal', $1) RETURNING id`,
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
});

afterAll(async () => {
  if (client) {
    await client.query("ROLLBACK"); // verwirft alle Seeds
    await client.end();
  }
});

describe("MIG-054 — Class-C Multi-Parent WITH CHECK (ISSUE-132)", () => {
  // -- signals: created_by-Shape -------------------------------------------

  it("NEG signals {deal=own, contact=fremd} -> RLS-Reject (ISSUE-132-Exploit)", async () => {
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
    expect(err?.code).toBe("42501"); // new row violates row-level security policy
  });

  it("POS signals {deal=own, contact=own} -> ok", async () => {
    await client.query("SAVEPOINT s");
    await asAuthenticated(client, memberId);
    const res = await client.query(
      `INSERT INTO signals (signal_type, deal_id, contact_id, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
      [signalType, ownDeal, ownContact, memberId]
    );
    expect(res.rowCount).toBe(1);
    await client.query("ROLLBACK TO SAVEPOINT s");
  });

  it("POS signals {alle FK NULL, created_by=self} -> ok", async () => {
    await client.query("SAVEPOINT s");
    await asAuthenticated(client, memberId);
    const res = await client.query(
      `INSERT INTO signals (signal_type, created_by) VALUES ($1, $2) RETURNING id`,
      [signalType, memberId]
    );
    expect(res.rowCount).toBe(1);
    await client.query("ROLLBACK TO SAVEPOINT s");
  });

  it("NEG signals {alle FK NULL, created_by=fremd} -> Reject (created_by-Spoof blockiert)", async () => {
    await client.query("SAVEPOINT s");
    await asAuthenticated(client, memberId);
    let err: { code?: string } | null = null;
    try {
      await client.query(
        `INSERT INTO signals (signal_type, created_by) VALUES ($1, $2)`,
        [signalType, adminId]
      );
    } catch (e) {
      err = e as { code?: string };
    }
    await client.query("ROLLBACK TO SAVEPOINT s");
    expect(err).not.toBeNull();
    expect(err?.code).toBe("42501");
  });

  it("Admin-Bypass signals {deal=own(member), contact=fremd} als admin -> ok", async () => {
    await client.query("SAVEPOINT s");
    await asAuthenticated(client, adminId);
    const res = await client.query(
      `INSERT INTO signals (signal_type, deal_id, contact_id, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
      [signalType, ownDeal, foreignContact, adminId]
    );
    expect(res.rowCount).toBe(1);
    await client.query("ROLLBACK TO SAVEPOINT s");
  });

  // -- email_threads: KEIN-created_by-Shape (Orphan nur via admin) ----------

  it("NEG email_threads {deal=own, contact=fremd} als member -> Reject", async () => {
    await client.query("SAVEPOINT s");
    await asAuthenticated(client, memberId);
    let err: { code?: string } | null = null;
    try {
      await client.query(
        `INSERT INTO email_threads (subject, first_message_at, last_message_at, deal_id, contact_id)
         VALUES ('t', $1, $1, $2, $3)`,
        [NOW, ownDeal, foreignContact]
      );
    } catch (e) {
      err = e as { code?: string };
    }
    await client.query("ROLLBACK TO SAVEPOINT s");
    expect(err).not.toBeNull();
    expect(err?.code).toBe("42501");
  });

  it("POS email_threads {deal=own, contact=own} als member -> ok", async () => {
    await client.query("SAVEPOINT s");
    await asAuthenticated(client, memberId);
    const res = await client.query(
      `INSERT INTO email_threads (subject, first_message_at, last_message_at, deal_id, contact_id)
       VALUES ('t', $1, $1, $2, $3) RETURNING id`,
      [NOW, ownDeal, ownContact]
    );
    expect(res.rowCount).toBe(1);
    await client.query("ROLLBACK TO SAVEPOINT s");
  });

  it("NEG email_threads {alle FK NULL} als member -> Reject (Orphan nur admin)", async () => {
    await client.query("SAVEPOINT s");
    await asAuthenticated(client, memberId);
    let err: { code?: string } | null = null;
    try {
      await client.query(
        `INSERT INTO email_threads (subject, first_message_at, last_message_at) VALUES ('t', $1, $1)`,
        [NOW]
      );
    } catch (e) {
      err = e as { code?: string };
    }
    await client.query("ROLLBACK TO SAVEPOINT s");
    expect(err).not.toBeNull();
    expect(err?.code).toBe("42501");
  });

  it("POS email_threads {alle FK NULL} als admin -> ok (Orphan-Semantik)", async () => {
    await client.query("SAVEPOINT s");
    await asAuthenticated(client, adminId);
    const res = await client.query(
      `INSERT INTO email_threads (subject, first_message_at, last_message_at) VALUES ('t', $1, $1) RETURNING id`,
      [NOW]
    );
    expect(res.rowCount).toBe(1);
    await client.query("ROLLBACK TO SAVEPOINT s");
  });

  // -- Struktur: pattern-weiter Satz (alle 9 Tabellen) ---------------------

  it("Struktur: alle 9 Multi-Parent-Tabellen INSERT+UPDATE WITH CHECK = Conjunction-Shape", async () => {
    const fkMap: Record<string, { policyBase: string; cols: string[] }> = {
      tasks: { policyBase: "tasks", cols: ["deal_id", "contact_id", "company_id"] },
      signals: {
        policyBase: "signals",
        cols: ["deal_id", "contact_id", "company_id", "activity_id"],
      },
      calendar_events: {
        policyBase: "calendar_events",
        cols: ["deal_id", "contact_id", "company_id", "meeting_id"],
      },
      handoffs: { policyBase: "handoffs", cols: ["deal_id", "company_id"] },
      cadence_enrollments: {
        policyBase: "cadence_enrollments",
        cols: ["deal_id", "contact_id"],
      },
      documents: {
        policyBase: "documents_table",
        cols: ["contact_id", "company_id", "deal_id"],
      },
      email_threads: {
        policyBase: "email_threads",
        cols: ["deal_id", "contact_id", "company_id"],
      },
      referrals: {
        policyBase: "referrals",
        cols: [
          "deal_id",
          "referrer_id",
          "referred_company_id",
          "referred_contact_id",
        ],
      },
      email_attachments: {
        policyBase: "email_attachments",
        cols: ["email_id", "proposal_id"],
      },
    };

    for (const [table, { policyBase, cols }] of Object.entries(fkMap)) {
      for (const cmd of ["INSERT", "UPDATE"]) {
        const res = await client.query<{ with_check: string | null }>(
          `SELECT with_check FROM pg_policies
            WHERE schemaname='public' AND tablename=$1 AND policyname=$2 AND cmd=$3`,
          [table, `${policyBase}_${cmd.toLowerCase()}`, cmd]
        );
        expect(
          res.rows[0]?.with_check,
          `${table} ${cmd} policy fehlt`
        ).toBeTruthy();
        const wc = (res.rows[0]!.with_check as string).replace(/\s+/g, " ");
        for (const col of cols) {
          expect(
            wc,
            `${table} ${cmd}: FK ${col} nicht als Conjunction-Zweig`
          ).toContain(`${col} IS NULL) OR (EXISTS`);
        }
      }
    }
  });
});
