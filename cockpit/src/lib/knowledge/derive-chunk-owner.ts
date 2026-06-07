// =============================================================
// Knowledge Indexer — Pure-Function deriveChunkOwner (SLC-905 MT-5)
// =============================================================
// Owner-Derivation aus Parent-Source bei chunk-INSERT.
//
// Pattern-Quelle: V8.10 SLC-893 buildDocumentStoragePath (Pure-Function-Lib-Pattern)
// Slice-Spec L229-240 (Spec-Drift D-905-1: source_type 'email'/'deal_activity').
//
// Wird von indexer.ts:embedAndStore VOR jedem Upsert gerufen, damit owner_user_id
// und team_id korrekt aus der Parent-Source abgeleitet werden (MIG-049 Klasse-D-RLS).

import type { SupabaseClient } from "@supabase/supabase-js";

export type ChunkSourceType = "meeting" | "email" | "deal_activity" | "document";

export interface ChunkOwner {
  owner_user_id: string;
  team_id: string | null;
}

/**
 * Schluessel-Source-Maps:
 *   meeting       → meetings.owner_user_id
 *   email         → email_messages.owner_user_id
 *   deal_activity → activities.owner_user_id
 *   document      → documents.created_by  (KEINE owner_user_id-Spalte!)
 *
 * team_id wird in einem 2. Hop via profiles.team_id geholt (kein direkter JOIN noetig).
 */
const SOURCE_TABLE_MAP: Record<ChunkSourceType, { table: string; column: string }> = {
  meeting:       { table: "meetings",       column: "owner_user_id" },
  email:         { table: "email_messages", column: "owner_user_id" },
  deal_activity: { table: "activities",     column: "owner_user_id" },
  document:      { table: "documents",      column: "created_by"    },
};

/**
 * Holt owner_user_id + team_id aus der Parent-Source.
 *
 * @param admin    service_role-Client (BYPASSRLS, weil indexer.ts cron-pfad cross-tenant lesen darf)
 * @param sourceType  Live-Code-Convention 'meeting' / 'email' / 'deal_activity' / 'document'
 * @param sourceId    Parent-Row-ID
 *
 * @returns ChunkOwner mit owner_user_id (Pflicht) und team_id (kann NULL sein bei Profile ohne team_id)
 * @throws  Error wenn sourceType unbekannt, Parent nicht gefunden, oder owner-Spalte NULL.
 */
export async function deriveChunkOwner(
  admin: SupabaseClient,
  sourceType: string,
  sourceId: string,
): Promise<ChunkOwner> {
  const mapping = SOURCE_TABLE_MAP[sourceType as ChunkSourceType];
  if (!mapping) {
    throw new Error(
      `deriveChunkOwner: unbekannter sourceType '${sourceType}'. Erlaubt: meeting | email | deal_activity | document`,
    );
  }

  const { data: parent, error } = await admin
    .from(mapping.table)
    .select(mapping.column)
    .eq("id", sourceId)
    .single();

  if (error || !parent) {
    throw new Error(
      `deriveChunkOwner: Parent-Source ${mapping.table}[${sourceId}] nicht gefunden: ${error?.message ?? "no data"}`,
    );
  }

  const ownerUserId = (parent as unknown as Record<string, unknown>)[mapping.column] as string | null;
  if (!ownerUserId) {
    throw new Error(
      `deriveChunkOwner: ${mapping.table}[${sourceId}].${mapping.column} ist NULL — kann owner_user_id nicht ableiten`,
    );
  }

  // Hop 2: team_id aus profiles. NULL ist erlaubt (Profile ohne team).
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("team_id")
    .eq("id", ownerUserId)
    .single();

  if (profileError || !profile) {
    throw new Error(
      `deriveChunkOwner: profiles[${ownerUserId}] nicht gefunden: ${profileError?.message ?? "no data"}`,
    );
  }

  return {
    owner_user_id: ownerUserId,
    team_id: (profile as { team_id: string | null }).team_id,
  };
}
