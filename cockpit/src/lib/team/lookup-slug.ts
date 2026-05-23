/**
 * Tenant-Slug-Aufloesung via owner_user_id → profiles.team_id → teams.slug.
 *
 * Server-only helper. Used by `/consent/[token]/page.tsx` (SLC-845) and any
 * future surface that needs to link to a tenant's public DSE without already
 * holding the team_id.
 *
 * Returns `null` when:
 * - the owner profile is missing
 * - the profile has no team_id
 * - the team row is missing or has no slug
 *
 * Callers must treat `null` as "no link" (graceful degradation), not error.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export async function getTenantSlugByOwnerUserId(
  ownerUserId: string,
): Promise<string | null> {
  if (!ownerUserId) return null;

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("team_id")
    .eq("id", ownerUserId)
    .maybeSingle();

  if (!profile?.team_id) return null;

  const { data: team } = await admin
    .from("teams")
    .select("slug")
    .eq("id", profile.team_id)
    .maybeSingle();

  return team?.slug ?? null;
}
