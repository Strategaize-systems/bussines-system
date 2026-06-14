/**
 * Per-Tenant Export-Key-Aufloesung (V8.15 SLC-913 MT-7, ISSUE-116, DEC-302).
 *
 * Loest den Bearer-Token gegen die export_api_keys-Tabelle (MIG-053) auf und
 * liefert die Tenant-Identitaet (owner_user_id + team-expandierte Member-Liste).
 * Die Read-APIs scopen ihre Queries dann auf diese Identitaet — statt wie zuvor
 * via einem geteilten EXPORT_API_KEY alle Owner-Rows zu dumpen.
 *
 * Auth-Vergleich ist konstant-zeit-unkritisch: der Roh-Token wird gehasht und
 * per Index-Lookup (key_hash) verglichen — kein byte-weiser String-Compare im
 * App-Code (anders als lib/export/auth.ts, daher kein timingSafeEqual noetig;
 * der Hash leakt nichts ueber den Roh-Key).
 */

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ExportIdentity = {
  ownerUserId: string;
  /** owner_user_id + alle Profile mit demselben team_id (team-expandiert, matcht can_see_owner). */
  teamMemberIds: string[];
};

export function hashExportKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

function unauthorized(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Loest die Tenant-Identitaet aus dem Authorization-Header auf.
 * Rueckgabe: ExportIdentity bei gueltigem Key, sonst NextResponse (401).
 */
export async function resolveExportIdentity(
  request: Request
): Promise<ExportIdentity | NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return unauthorized("Missing Authorization header");

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;
  if (!token) return unauthorized("Missing API key");

  const admin = createAdminClient();
  const keyHash = hashExportKey(token);

  const { data: keyRow, error: keyErr } = await admin
    .from("export_api_keys")
    .select("owner_user_id")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (keyErr) {
    return NextResponse.json(
      { error: "Key lookup failed" },
      { status: 500 }
    );
  }
  if (!keyRow) return unauthorized("Invalid API key");

  const ownerUserId = (keyRow as { owner_user_id: string }).owner_user_id;

  // Team-Expansion: alle Profile mit demselben team_id sehen sich gegenseitig
  // (can_see_owner). Solo (team_id NULL) -> nur der Owner selbst.
  const { data: me } = await admin
    .from("profiles")
    .select("team_id")
    .eq("id", ownerUserId)
    .maybeSingle();

  let teamMemberIds = [ownerUserId];
  const teamId = (me as { team_id: string | null } | null)?.team_id ?? null;
  if (teamId) {
    const { data: members } = await admin
      .from("profiles")
      .select("id")
      .eq("team_id", teamId);
    const ids = (members ?? []).map((m) => (m as { id: string }).id);
    if (ids.length > 0) teamMemberIds = ids;
  }

  return { ownerUserId, teamMemberIds };
}
