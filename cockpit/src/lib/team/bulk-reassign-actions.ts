/**
 * SLC-707 MT-1 — Bulk-Reassign Server Actions (Wrapper).
 *
 * Trennung von `bulk-reassign.ts` (Pure-Core) noetig wegen "use server"-
 * Direktive: alle Exporte in diesem File MUESSEN async Server Actions sein.
 *
 * 4-Gate-Defense-in-Depth + Two-Phase-Audit aus AC2b/AC2c implementiert hier.
 */

"use server";

import { assertNotReadOnlyContext } from "@/lib/auth/read-only-context";
import { getPgClient } from "@/lib/db/pg";
import { getProfile } from "@/lib/auth/get-profile";

import {
  applyReassignPerTable,
  assertCanReassign,
  countAffectedPerTable,
  getUserTeamIds,
  validateBulkReassignInput,
  writeAppliedAudit,
  writeInitiatedAudit,
  type ApplyResult,
  type BulkReassignArgs,
  type CallerProfile,
  type PreviewResult,
} from "./bulk-reassign";

/**
 * AC1 — Preview (read-only).
 */
export async function bulkReassignPreview(args: BulkReassignArgs): Promise<PreviewResult> {
  const validation = validateBulkReassignInput(args);
  if (!validation.ok) return validation;

  const profile = await getProfile();
  const caller: CallerProfile | null = profile
    ? { user_id: profile.user_id, role: profile.role, team_id: profile.team_id }
    : null;

  const client = await getPgClient();
  try {
    const teamMap = await getUserTeamIds(client, [validation.value.from, validation.value.to]);
    const fromTeamId = teamMap.get(validation.value.from) ?? null;
    const toTeamId = teamMap.get(validation.value.to) ?? null;

    const authz = assertCanReassign(caller, fromTeamId, toTeamId);
    if (!authz.ok) return authz;

    const tables = await countAffectedPerTable(client, validation.value.from, validation.value.filter);
    const total = tables.reduce((sum, t) => sum + t.count, 0);

    return { ok: true, tables, total };
  } catch (err) {
    return {
      ok: false,
      code: "db",
      error: err instanceof Error ? err.message : "Preview-DB-Error",
    };
  } finally {
    client.release();
  }
}

/**
 * AC2 + AC2b + AC2c — Apply mit Two-Phase-Audit.
 *
 * 4 Gates (in Reihenfolge):
 *  1. validateBulkReassignInput     — UUID-Shape + Filter-Whitelist
 *  2. Role-Check (admin/teamlead)   — BEFORE jede DB-Connection
 *  3. Team-Scope-Check (teamlead)   — within-Team enforced
 *  4. writeInitiatedAudit (Pre-Tx)  — Forensik-Trail vor Privileg-Eskalation
 *
 * Phase-Logic (AC2c):
 *  - Phase 1 (Initiated, ausserhalb Tx): bleibt bei Rollback erhalten
 *  - Phase 2 (Applied, innerhalb Tx):    wird bei Rollback mit-zurueckgerollt
 */
export async function bulkReassignApply(args: BulkReassignArgs): Promise<ApplyResult> {
  await assertNotReadOnlyContext();

  const validation = validateBulkReassignInput(args);
  if (!validation.ok) return validation;

  const profile = await getProfile();
  const caller: CallerProfile | null = profile
    ? { user_id: profile.user_id, role: profile.role, team_id: profile.team_id }
    : null;

  // Gate 2: Role-Check (BEFORE jede DB-Connection)
  if (!caller) return { ok: false, code: "not_authenticated", error: "Nicht angemeldet" };
  if (caller.role === "member") {
    return {
      ok: false,
      code: "forbidden",
      error: "Nur Admin oder Teamlead duerfen Bulk-Reassign starten",
    };
  }

  // Gate 3: Team-Scope-Check (teamlead only)
  const scopeClient = await getPgClient();
  let fromTeamId: string | null;
  let toTeamId: string | null;
  try {
    const teamMap = await getUserTeamIds(scopeClient, [validation.value.from, validation.value.to]);
    fromTeamId = teamMap.get(validation.value.from) ?? null;
    toTeamId = teamMap.get(validation.value.to) ?? null;
  } finally {
    scopeClient.release();
  }

  const authz = assertCanReassign(caller, fromTeamId, toTeamId);
  if (!authz.ok) return authz;

  // Gate 4 / Phase 1: Initiated-Audit ausserhalb Tx
  let initiatedAuditId: string;
  try {
    initiatedAuditId = await writeInitiatedAudit(caller.user_id, validation.value);
  } catch (err) {
    return {
      ok: false,
      code: "db",
      error: `Audit-Init fehlgeschlagen: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  // Phase 2: Tx mit SET LOCAL ROLE postgres + 8x UPDATE + 8x Applied-Audit
  const txClient = await getPgClient();
  try {
    await txClient.query("BEGIN");
    await txClient.query("SET LOCAL ROLE postgres");

    const tables = await applyReassignPerTable(
      txClient,
      validation.value.from,
      validation.value.to,
      validation.value.filter,
    );

    for (const t of tables) {
      await writeAppliedAudit(txClient, caller.user_id, initiatedAuditId, t.name, {
        from: validation.value.from,
        to: validation.value.to,
        filter: validation.value.filter,
        affected_rows: t.affected_rows,
      });
    }

    await txClient.query("COMMIT");

    const total = tables.reduce((sum, t) => sum + t.affected_rows, 0);
    return { ok: true, audit_initiated_id: initiatedAuditId, tables, total };
  } catch (err) {
    await txClient.query("ROLLBACK").catch(() => {});
    return {
      ok: false,
      code: "db",
      error: `Bulk-Reassign-Tx fehlgeschlagen (Rollback ausgefuehrt, Initiated-Audit-Eintrag bleibt): ${err instanceof Error ? err.message : "unknown"}`,
    };
  } finally {
    txClient.release();
  }
}
