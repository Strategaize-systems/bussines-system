// SLC-706 MT-1 — view_as Audit-Helper
//
// Schreibt einen Drilldown-Zugriff in audit_log. Genutzt vom Drilldown-Layout
// `/team/[user_id]/layout.tsx` als Side-Effect nach Page-Guard, BEVOR Children
// gerendert werden.
//
// Schema-Mapping (audit_log nach MIG-033):
//   - actor_id           = viewer user_id (Teamlead/Admin)
//   - action             = 'view_as'
//   - entity_type        = 'profile'
//   - entity_id          = target_user_id
//   - view_as_target_user_id = target_user_id (Index-Spalte aus MIG-033 fuer
//                               schnelle Filter "wer hat wen angeschaut")
//   - context            = JSON-String mit { path }
//
// Risk-Mitigation R3 (Audit-Spam): Wir akzeptieren bewusst 1 Eintrag pro
// Page-Load. Volumen ist im Internal-Test-Mode vernachlaessigbar (<20 Drilldowns/
// Tag). Cache-Optimierung wird erst noetig wenn Audit-Volume waechst.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface LogViewAsArgs {
  viewerUserId: string;
  targetUserId: string;
  path: string;
}

export async function logViewAs(
  supabase: SupabaseClient,
  args: LogViewAsArgs,
): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({
    actor_id: args.viewerUserId,
    action: "view_as",
    entity_type: "profile",
    entity_id: args.targetUserId,
    view_as_target_user_id: args.targetUserId,
    context: JSON.stringify({ path: args.path }),
  });

  if (error) {
    // Audit-Insert-Fail darf den Drilldown nicht blockieren — Audit ist
    // Beobachtungs-, kein Sicherheits-Mechanismus (RLS + can_see_owner sind
    // die Sicherheits-Layer). Log-Hinweis bleibt im Server-Stdout.
    console.warn(
      `logViewAs failed (viewer=${args.viewerUserId}, target=${args.targetUserId}, path=${args.path}): ${error.message}`,
    );
  }
}
