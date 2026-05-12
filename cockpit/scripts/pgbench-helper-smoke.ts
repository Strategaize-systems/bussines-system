#!/usr/bin/env tsx
/**
 * SLC-701 MT-7 — Helper-Performance-Smoke.
 *
 * Misst die Latenz von SELECT auf activities mit can_see_owner()-RLS-Helper
 * fuer eine Member-Session. AC6 fordert p95 < 100ms.
 *
 * Pgbench wuerde tps + avg liefern, fuer p50/p95/p99 ist ein node-basierter
 * Bench einfacher und braucht keine Postgres-CLI im Container.
 *
 * Verwendung:
 *   TEST_DATABASE_URL=postgresql://... npx tsx cockpit/scripts/pgbench-helper-smoke.ts
 *   TEST_DATABASE_URL=...              ITERATIONS=500 npx tsx ... pgbench-helper-smoke.ts
 *
 * Voraussetzung: MIG-033..035 appliedet, Seed-Script gelaufen.
 */

import { Client } from "pg";
import { performance } from "node:perf_hooks";

const TEST_MEMBER_1 = "00000000-0000-0000-0000-000000000081";
const ITERATIONS = Number(process.env.ITERATIONS ?? 200);
const P95_LIMIT_MS = Number(process.env.P95_LIMIT_MS ?? 100);

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1),
  );
  return sortedAsc[idx];
}

async function benchAsMember(client: Client): Promise<number[]> {
  const samples: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE authenticated");
    await client.query(`SET LOCAL "request.jwt.claim.sub" = '${TEST_MEMBER_1}'`);

    const t0 = performance.now();
    // Realistisches Member-Listing: nimmt alle activities — RLS filtert.
    // ORDER BY zwingt einen vollen Tabellen-Scan plus Sort, was den
    // Helper-Function-Cost sichtbar macht.
    const r = await client.query(
      `SELECT id, title, type FROM activities ORDER BY created_at DESC LIMIT 1000`,
    );
    const t1 = performance.now();

    samples.push(t1 - t0);
    void r.rowCount; // touch to avoid V8 dead-code elim
    await client.query("ROLLBACK");
  }

  return samples;
}

async function main(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.error("[pgbench] TEST_DATABASE_URL nicht gesetzt");
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    // Warmup
    await benchAsMember({ ...client, query: client.query.bind(client) } as Client);

    const samples = await benchAsMember(client);
    const sorted = [...samples].sort((a, b) => a - b);
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const p50 = percentile(sorted, 50);
    const p95 = percentile(sorted, 95);
    const p99 = percentile(sorted, 99);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    console.log(`[pgbench] Iterations: ${samples.length}`);
    console.log(`[pgbench] min:  ${min.toFixed(2)} ms`);
    console.log(`[pgbench] avg:  ${avg.toFixed(2)} ms`);
    console.log(`[pgbench] p50:  ${p50.toFixed(2)} ms`);
    console.log(`[pgbench] p95:  ${p95.toFixed(2)} ms  (limit: ${P95_LIMIT_MS} ms)`);
    console.log(`[pgbench] p99:  ${p99.toFixed(2)} ms`);
    console.log(`[pgbench] max:  ${max.toFixed(2)} ms`);

    if (p95 > P95_LIMIT_MS) {
      console.error(
        `[pgbench] FAIL — p95 (${p95.toFixed(2)} ms) ueber Limit (${P95_LIMIT_MS} ms).`,
      );
      console.error(
        `[pgbench] Fallback-Empfehlungen: (a) can_see_owner als inline-Subquery in Policies statt Helper-Call; (b) Materialized Cache fuer is_admin/is_teamlead/get_my_team_id per User-Session; (c) BTREE-Cover-Index auf (owner_user_id, created_at DESC).`,
      );
      process.exit(2);
    }

    console.log(`[pgbench] OK — p95 ${p95.toFixed(2)} ms <= ${P95_LIMIT_MS} ms.`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[pgbench] ERROR:", e);
  process.exit(1);
});
