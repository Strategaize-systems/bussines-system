// SLC-705 MT-4 — Team-Bedrock-Context-Loader.
//
// Wraps SA-1 getTeamBedrockContext mit Supabase-Server-Client und Rollen-Gate.
// Defense-in-depth: nur admin/teamlead duerfen den Team-Snapshot laden — RLS
// filtert ohnehin, aber der Rollen-Check hier verhindert, dass member-Sessions
// (die per RLS nur ihre eigenen Records sehen wuerden) versehentlich Team-
// Reports ausloesen koennen.

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import { getTeamBedrockContext, type TeamBedrockContext } from "@/lib/team/aggregate-queries";

export async function loadTeamContext(): Promise<TeamBedrockContext> {
  const profile = await getProfile();
  if (profile.role !== "admin" && profile.role !== "teamlead") {
    throw new Error("Nicht autorisiert: Team-Kontext nur fuer admin oder teamlead");
  }
  const supabase = await createClient();
  return getTeamBedrockContext(supabase);
}
