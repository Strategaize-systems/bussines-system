/**
 * SLC-707 MT-1 — Bulk-Reassign Core (Types, Konstanten, Pure-Helper, SQL-Executor).
 *
 * Dieses File enthaelt KEINE Server Actions — alle Server Actions liegen in
 * `bulk-reassign-actions.ts` (mit "use server" am File-Top). Trennung noetig,
 * weil "use server" alle Exporte zwingend als async Server Actions
 * deklariert; Pure-Helper waeren damit illegal.
 *
 * Sicherheit (AC2b) und Two-Phase-Audit (AC2c) sind in `bulk-reassign-actions.ts`
 * implementiert — dieses File liefert die wiederverwendbaren Bausteine.
 */

import type { PoolClient } from "pg";

import { getPgClient } from "@/lib/db/pg";

// ─────────────────────────────────────────────────────────────────────────────
// Konstanten
// ─────────────────────────────────────────────────────────────────────────────

export const CORE_TABLES = [
  "companies",
  "contacts",
  "deals",
  "activities",
  "meetings",
  "proposals",
  "email_messages",
  "calls",
] as const;

export type CoreTable = (typeof CORE_TABLES)[number];

/**
 * Welche Filter-Spalte auf welche Tabelle anwendbar ist.
 * Tabellen ohne die Spalte ignorieren den Filter (keine WHERE-Klausel hinzu).
 */
export const TABLE_FILTER_SUPPORT: Record<
  CoreTable,
  { pipeline_id: boolean; status: boolean; created_at: boolean }
> = {
  companies: { pipeline_id: false, status: false, created_at: true },
  contacts: { pipeline_id: false, status: false, created_at: true },
  deals: { pipeline_id: true, status: true, created_at: true },
  activities: { pipeline_id: false, status: false, created_at: true },
  meetings: { pipeline_id: false, status: true, created_at: true },
  proposals: { pipeline_id: false, status: true, created_at: true },
  email_messages: { pipeline_id: false, status: false, created_at: true },
  calls: { pipeline_id: false, status: true, created_at: true },
};

/**
 * Erlaubte Status-Werte (Whitelist). Wird in validateInput erzwungen,
 * unbekannte Werte → Validation-Error.
 *
 * Pro Tabelle gibt es zwar unterschiedliche Status-Konventionen, aber die
 * UI-Auswahl ist auf "deals-Status"-Semantik beschraenkt (AC3). Filter wird
 * per Tabelle nur angewandt, wenn TABLE_FILTER_SUPPORT[table].status=true.
 */
const ALLOWED_STATUS_VALUES = new Set([
  "open",
  "active",
  "won",
  "lost",
  "planned",
  "done",
  "canceled",
  "draft",
  "sent",
  "accepted",
  "declined",
]);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type BulkReassignFilter = {
  pipeline_id?: string;
  status?: string;
  created_at_from?: string;
  created_at_to?: string;
};

export type BulkReassignArgs = {
  from: string;
  to: string;
  filter?: BulkReassignFilter;
};

export type PreviewSuccess = {
  ok: true;
  tables: Array<{ name: CoreTable; count: number }>;
  total: number;
};

export type ApplySuccess = {
  ok: true;
  audit_initiated_id: string;
  tables: Array<{ name: CoreTable; affected_rows: number }>;
  total: number;
};

export type ErrorCode = "forbidden" | "validation" | "db" | "not_authenticated";

export type Failure = {
  ok: false;
  code: ErrorCode;
  error: string;
};

export type PreviewResult = PreviewSuccess | Failure;
export type ApplyResult = ApplySuccess | Failure;

export type CallerProfile = {
  user_id: string;
  role: "admin" | "teamlead" | "member";
  team_id: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Pure Helper (exportiert fuer Tests)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validiert Inputs. Filter-Whitelist + UUID-Format + ISO-Date-Format.
 * Schuetzt vor SQL-Injection-Versuchen im Filter (alle Werte werden gegen
 * strikte Regexes/Whitelist gepruefft).
 */
export function validateBulkReassignInput(args: BulkReassignArgs):
  | { ok: true; value: Required<Omit<BulkReassignArgs, "filter">> & { filter: BulkReassignFilter } }
  | { ok: false; code: "validation"; error: string } {
  const { from, to, filter = {} } = args;

  if (!UUID_REGEX.test(from)) {
    return { ok: false, code: "validation", error: `Ungueltige from-UUID: ${from}` };
  }
  if (!UUID_REGEX.test(to)) {
    return { ok: false, code: "validation", error: `Ungueltige to-UUID: ${to}` };
  }
  if (from === to) {
    return { ok: false, code: "validation", error: "from und to muessen unterschiedliche User sein" };
  }

  if (filter.pipeline_id !== undefined && !UUID_REGEX.test(filter.pipeline_id)) {
    return { ok: false, code: "validation", error: `Ungueltige pipeline_id: ${filter.pipeline_id}` };
  }
  if (filter.status !== undefined && !ALLOWED_STATUS_VALUES.has(filter.status)) {
    return { ok: false, code: "validation", error: `Status-Wert nicht in Whitelist: ${filter.status}` };
  }
  if (filter.created_at_from !== undefined && !ISO_DATE_REGEX.test(filter.created_at_from)) {
    return { ok: false, code: "validation", error: `Ungueltiges created_at_from-Format` };
  }
  if (filter.created_at_to !== undefined && !ISO_DATE_REGEX.test(filter.created_at_to)) {
    return { ok: false, code: "validation", error: `Ungueltiges created_at_to-Format` };
  }

  return { ok: true, value: { from, to, filter } };
}

/**
 * Prueft, ob Caller-Profil bulk-reassign erlauben darf. Wirft strukturierte
 * Errors fuer Tests, in Server Actions wird der Fehler als Failure-Result
 * zurueckgegeben.
 */
export function assertCanReassign(
  caller: CallerProfile | null,
  fromTeamId: string | null,
  toTeamId: string | null,
): { ok: true } | { ok: false; code: "forbidden" | "not_authenticated"; error: string } {
  if (!caller) {
    return { ok: false, code: "not_authenticated", error: "Nicht angemeldet" };
  }
  if (caller.role === "member") {
    return { ok: false, code: "forbidden", error: "Nur Admin oder Teamlead duerfen Bulk-Reassign starten" };
  }
  if (caller.role === "teamlead") {
    if (!caller.team_id) {
      return { ok: false, code: "forbidden", error: "Teamlead ohne Team-Zuordnung" };
    }
    if (fromTeamId !== caller.team_id || toTeamId !== caller.team_id) {
      return {
        ok: false,
        code: "forbidden",
        error: "Teamlead darf nur within-Team reassign (from + to muessen im eigenen Team sein)",
      };
    }
  }
  return { ok: true };
}

/**
 * Baut die parametrisierte WHERE-Klausel pro Tabelle. Startet bei Param-Index
 * `startIndex` (caller-controlled, weil `$1` und `$2` fuer owner_user_id-Werte
 * reserviert sind).
 */
export function buildFilterClause(
  table: CoreTable,
  filter: BulkReassignFilter,
  startIndex: number,
): { whereSql: string; params: unknown[] } {
  const support = TABLE_FILTER_SUPPORT[table];
  const clauses: string[] = [];
  const params: unknown[] = [];
  let idx = startIndex;

  if (filter.pipeline_id !== undefined && support.pipeline_id) {
    clauses.push(`pipeline_id = $${idx}`);
    params.push(filter.pipeline_id);
    idx++;
  }
  if (filter.status !== undefined && support.status) {
    clauses.push(`status = $${idx}`);
    params.push(filter.status);
    idx++;
  }
  if (filter.created_at_from !== undefined && support.created_at) {
    clauses.push(`created_at >= $${idx}`);
    params.push(filter.created_at_from);
    idx++;
  }
  if (filter.created_at_to !== undefined && support.created_at) {
    clauses.push(`created_at < $${idx}`);
    params.push(filter.created_at_to);
    idx++;
  }

  const whereSql = clauses.length > 0 ? ` AND ${clauses.join(" AND ")}` : "";
  return { whereSql, params };
}

// ─────────────────────────────────────────────────────────────────────────────
// SQL-Executor (exportiert fuer Tests)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * COUNT(*) pro Tabelle fuer die Records, die der Bulk-Reassign betreffen
 * wuerde. Read-only, kein UPDATE, kein Audit.
 */
export async function countAffectedPerTable(
  client: PoolClient,
  from: string,
  filter: BulkReassignFilter,
): Promise<Array<{ name: CoreTable; count: number }>> {
  const results: Array<{ name: CoreTable; count: number }> = [];

  for (const table of CORE_TABLES) {
    const { whereSql, params } = buildFilterClause(table, filter, 2);
    const sql = `SELECT COUNT(*)::INT AS count FROM ${table} WHERE owner_user_id = $1${whereSql}`;
    const { rows } = await client.query<{ count: number }>(sql, [from, ...params]);
    results.push({ name: table, count: rows[0]?.count ?? 0 });
  }

  return results;
}

/**
 * UPDATE pro Tabelle. MUSS innerhalb einer Transaction mit SET LOCAL ROLE
 * postgres aufgerufen werden (RLS-Bypass). Caller managed BEGIN/COMMIT.
 */
export async function applyReassignPerTable(
  client: PoolClient,
  from: string,
  to: string,
  filter: BulkReassignFilter,
): Promise<Array<{ name: CoreTable; affected_rows: number }>> {
  const results: Array<{ name: CoreTable; affected_rows: number }> = [];

  for (const table of CORE_TABLES) {
    const { whereSql, params } = buildFilterClause(table, filter, 3);
    const sql = `UPDATE ${table} SET owner_user_id = $1 WHERE owner_user_id = $2${whereSql}`;
    const result = await client.query(sql, [to, from, ...params]);
    results.push({ name: table, affected_rows: result.rowCount ?? 0 });
  }

  return results;
}

/**
 * Schreibt den Phase-1-Audit-Eintrag (`bulk_reassign_initiated`) ueber eine
 * EIGENE Connection — bewusst NICHT die Tx-Connection, damit der Eintrag bei
 * Tx-Rollback erhalten bleibt (Forensik-Trail).
 *
 * Returnt die audit_log.id der erzeugten Zeile.
 */
export async function writeInitiatedAudit(
  actorId: string,
  args: { from: string; to: string; filter: BulkReassignFilter },
): Promise<string> {
  const client = await getPgClient();
  try {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes, context)
       VALUES ($1, 'bulk_reassign_initiated', 'bulk_reassign', gen_random_uuid(), $2, $3)
       RETURNING id`,
      [
        actorId,
        JSON.stringify({
          requested_from: args.from,
          requested_to: args.to,
          filter: args.filter,
        }),
        "slc-707/bulk-reassign",
      ],
    );
    return rows[0].id;
  } finally {
    client.release();
  }
}

/**
 * Schreibt den Phase-2-Audit-Eintrag (`bulk_reassign_applied`) pro Tabelle
 * INNERHALB der Tx-Connection — bei Rollback verschwinden diese Eintraege.
 *
 * `initiatedAuditId` verlinkt zurueck zum Phase-1-Eintrag (im changes-JSONB).
 */
export async function writeAppliedAudit(
  client: PoolClient,
  actorId: string,
  initiatedAuditId: string,
  table: CoreTable,
  args: { from: string; to: string; filter: BulkReassignFilter; affected_rows: number },
): Promise<void> {
  await client.query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes, context)
     VALUES ($1, 'bulk_reassign_applied', $2, gen_random_uuid(), $3, $4)`,
    [
      actorId,
      table,
      JSON.stringify({
        initiated_audit_id: initiatedAuditId,
        from: args.from,
        to: args.to,
        filter: args.filter,
        affected_rows: args.affected_rows,
      }),
      "slc-707/bulk-reassign",
    ],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper fuer Server Actions (kein Server-Action-Export — laeuft im Pool)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Liest team_id fuer einen User direkt aus profiles. Read-only, dient als
 * Vorpruefung fuer das Team-Scope-Gate.
 */
export async function getUserTeamIds(
  client: PoolClient,
  userIds: string[],
): Promise<Map<string, string | null>> {
  const { rows } = await client.query<{ id: string; team_id: string | null }>(
    `SELECT id, team_id FROM profiles WHERE id = ANY($1::uuid[])`,
    [userIds],
  );
  return new Map(rows.map((r) => [r.id, r.team_id]));
}
