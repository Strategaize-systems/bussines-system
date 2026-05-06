// V6.2 SLC-625 — UTM -> Campaign Mapping (DEC-135 hybrid)
//
// Priority 1: external_ref Match (utm_source='system4' AND utm_content set)
// Priority 2: campaigns.name = utm_campaign (case-insensitive trim)
// Returnt campaign.id oder null.

import { createClient } from "@/lib/supabase/server";
import type { UtmParams } from "@/types/campaign";

export async function resolveCampaignFromUtm(
  utm: UtmParams
): Promise<string | null> {
  const supabase = await createClient();

  // Priority 1: external_ref Match
  if (utm.utm_source === "system4" && utm.utm_content) {
    const ref = utm.utm_content.trim();
    if (ref) {
      const { data } = await supabase
        .from("campaigns")
        .select("id")
        .eq("external_ref", ref)
        .maybeSingle();
      if (data?.id) return data.id;
    }
  }

  // Priority 2: utm_campaign matching campaigns.name (case-insensitive)
  if (utm.utm_campaign) {
    const name = utm.utm_campaign.trim();
    if (name) {
      // Postgres-Index ist auf LOWER(name) — ilike mit exakt-Match-Pattern.
      const { data } = await supabase
        .from("campaigns")
        .select("id")
        .ilike("name", name)
        .limit(1)
        .maybeSingle();
      if (data?.id) return data.id;
    }
  }

  return null;
}
