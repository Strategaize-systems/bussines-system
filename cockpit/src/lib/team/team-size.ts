import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/types";

/**
 * V8.1 SLC-821 — Server-only Helper fuer Solopreneur-Detection (DEC-227).
 *
 * - Pattern-Reuse: `cockpit/src/lib/auth/get-profile.ts` (React `cache()`).
 * - Single-Source: zaehlt Profiles in der gleichen `team_id`.
 * - Edge-Case: `profile.team_id === null` → return 1 (Solo-Admin ohne Team).
 *
 * Wird in `app/(app)/layout.tsx` aufgerufen, um die TEAM-Sidebar-Section bei
 * `team_size === 1` zu unterdruecken (Solopreneur-Mode).
 */
export const getTeamSize = cache(async (profile: Profile): Promise<number> => {
  if (profile.team_id === null) {
    return 1;
  }

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("team_id", profile.team_id);

  if (error) {
    throw new Error(
      `getTeamSize: count failed for team_id=${profile.team_id} (${error.message})`,
    );
  }

  return count ?? 0;
});
