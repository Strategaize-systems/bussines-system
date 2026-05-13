#!/usr/bin/env tsx
/**
 * SLC-705 MT-6 — Performance Smoke fuer Team-Aggregat-Queries.
 *
 * Misst 100 Iterationen von getTeamKPIs-Logic und getTeamMembers-Logic
 * gegen die Coolify-Test-DB. Druckt p50/p95/p99/mean. Exit-Code 1 wenn
 * p95 > 500ms fuer eine der beiden Funktionen.
 *
 * Inline-SQL (NICHT-Import aus aggregate-queries.ts):
 *   Die Production-Funktionen nutzen den Next.js-Server-Supabase-Client. Dieser
 *   ist nicht standalone aufrufbar (cookies()-Dependency). Wir replizieren die
 *   SQL-Logik daher hier inline mit pg.Client. ACHTUNG: bei Aenderungen an
 *   aggregate-queries.ts muss dieses Script entsprechend mitgezogen werden.
 *
 * Usage:
 *   TEST_DATABASE_URL=postgresql://postgres:...@host:5432/postgres \
 *     npx tsx cockpit/scripts/aggregate-perf-smoke.ts
 */

import { Client } from "pg";
import { performance } from "node:perf_hooks";

const TEST_TEAMLEAD_ID = "00000000-0000-0000-0000-000000000078";
const TEST_TEAM_ID = "00000000-0000-0000-0000-000000000077";
const ITERATIONS = 100;
const P95_TARGET_MS = 500;

interface Stats {
  p50: number;
  p95: number;
  p99: number;
  mean: number;
}

function computeStats(samples: number[]): Stats {
  const sorted = [...samples].sort((a, b) => a - b);
  const pick = (p: number): number => {
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return sorted[idx];
  };
  const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
  return {
    p50: pick(50),
    p95: pick(95),
    p99: pick(99),
    mean,
  };
}

function fmt(n: number): string {
  return `${n.toFixed(1)}ms`;
}

async function setTeamleadSession(client: Client): Promise<void> {
  // pg-Pattern aus v7-rls-matrix.test.ts: SET LOCAL erfordert Transaction.
  await client.query("BEGIN");
  await client.query("SET LOCAL ROLE authenticated");
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${TEST_TEAMLEAD_ID}'`);
}

async function endSession(client: Client): Promise<void> {
  await client.query("ROLLBACK");
}

// ── KPIs Inline ────────────────────────────────────────────────────────────

async function runGetTeamKPIs(client: Client): Promise<void> {
  // Alle 5 Sub-Queries parallel — entspricht Promise.all() in der Production-
  // Function. pg.Client ist single-connection (kein Pool), daher fuehren wir
  // sie sequentiell aus. Bei einer Pool-Implementation wuerden sie parallel
  // laufen. Wir messen die Aggregat-Latenz so wie sie ein Single-Request sieht.
  await client.query(
    `SELECT value, owner_user_id FROM deals WHERE status = 'active'`,
  );
  await client.query(
    `SELECT COUNT(*) FROM activities
      WHERE completed_at IS NULL
        AND due_date < (CURRENT_DATE + INTERVAL '1 day')`,
  );
  await client.query(
    `SELECT COUNT(*) FROM deals
      WHERE status = 'won' AND updated_at >= NOW() - INTERVAL '30 days'`,
  );
  await client.query(
    `SELECT COUNT(*) FROM deals
      WHERE status = 'lost' AND updated_at >= NOW() - INTERVAL '30 days'`,
  );
  await client.query(
    `SELECT owner_user_id FROM activities
      WHERE completed_at IS NULL AND due_date < NOW()`,
  );
}

// ── Members Inline ─────────────────────────────────────────────────────────

async function runGetTeamMembers(client: Client): Promise<void> {
  const { rows: callerRows } = await client.query<{ team_id: string | null }>(
    `SELECT team_id FROM profiles WHERE id = $1`,
    [TEST_TEAMLEAD_ID],
  );
  const teamId = callerRows[0]?.team_id ?? TEST_TEAM_ID;

  const { rows: profileRows } = await client.query<{ id: string }>(
    `SELECT id, display_name, role, last_login_at, team_id
       FROM profiles
      WHERE team_id = $1`,
    [teamId],
  );
  const memberIds = profileRows.map((p) => p.id);
  if (memberIds.length === 0) return;

  await client.query(
    `SELECT owner_user_id, value FROM deals
      WHERE status = 'active' AND owner_user_id = ANY($1::uuid[])`,
    [memberIds],
  );
  await client.query(
    `SELECT owner_user_id FROM activities
      WHERE completed_at IS NULL AND owner_user_id = ANY($1::uuid[])`,
    [memberIds],
  );
  await client.query(
    `SELECT owner_user_id FROM activities
      WHERE completed_at IS NULL
        AND due_date < NOW()
        AND owner_user_id = ANY($1::uuid[])`,
    [memberIds],
  );
}

// ── Driver ──────────────────────────────────────────────────────────────────

async function measure(
  client: Client,
  label: string,
  fn: () => Promise<void>,
): Promise<Stats> {
  const samples: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    await setTeamleadSession(client);
    const t0 = performance.now();
    try {
      await fn();
    } finally {
      const t1 = performance.now();
      samples.push(t1 - t0);
      await endSession(client);
    }
  }
  const stats = computeStats(samples);
  const status =
    stats.p95 <= P95_TARGET_MS
      ? `OK (target <${P95_TARGET_MS}ms)`
      : `FAIL (target <${P95_TARGET_MS}ms)`;
  console.log(
    `Aggregate ${label} p50: ${fmt(stats.p50)}  p95: ${fmt(stats.p95)}  p99: ${fmt(stats.p99)}  mean: ${fmt(stats.mean)}  — ${status}`,
  );
  return stats;
}

async function main(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.error("[perf-smoke] TEST_DATABASE_URL nicht gesetzt — abort.");
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    // Warmup: 5 Iterationen ohne Messung, um Connection/Plan-Cache aufzuwaermen.
    for (let i = 0; i < 5; i++) {
      await setTeamleadSession(client);
      await runGetTeamKPIs(client);
      await runGetTeamMembers(client);
      await endSession(client);
    }

    const kpisStats = await measure(client, "getTeamKPIs", () =>
      runGetTeamKPIs(client),
    );
    const membersStats = await measure(client, "getTeamMembers", () =>
      runGetTeamMembers(client),
    );

    const failed =
      kpisStats.p95 > P95_TARGET_MS || membersStats.p95 > P95_TARGET_MS;
    if (failed) {
      console.error(`[perf-smoke] FAIL — p95-Target ${P95_TARGET_MS}ms verletzt.`);
      process.exit(1);
    } else {
      console.log("[perf-smoke] PASS — beide Aggregat-Queries unter p95-Target.");
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[perf-smoke] ERROR:", e);
  process.exit(1);
});
