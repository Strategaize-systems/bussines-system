// V6.2 SLC-625 — Public Tracking-Link Redirect (DEC-137 + DEC-138)
//
// Public Endpoint OHNE Auth. 302-Redirect zu target_url, asynchroner
// Click-Log + click_count-Increment. Latency-Ziel <100ms (await link-select,
// void log+update).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidCampaignToken } from "@/lib/campaigns/token";
import { extractClientIp, hashIp } from "@/lib/campaigns/ip-hash";
import { appendUtmIfMissing } from "@/lib/campaigns/utm-helpers";

const FALLBACK_URL = "https://strategaize.com/404";
const USER_AGENT_MAX = 200;
const REFERER_MAX = 500;

interface CampaignLinkRow {
  id: string;
  target_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string | null;
  utm_term: string | null;
}

function trunc(s: string | null, max: number): string | null {
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

async function logClick(
  linkId: string,
  ipHash: string | null,
  userAgent: string | null,
  referer: string | null
): Promise<void> {
  try {
    const supabase = createAdminClient();
    // Click-Insert + Counter-Increment parallel.
    // Read-Modify-Write fuer click_count ist V1-akzeptabel — Race-Condition
    // bei concurrent clicks fuehrt zu eventual-consistency, kein Constraint.
    await Promise.all([
      supabase.from("campaign_link_clicks").insert({
        link_id: linkId,
        ip_hash: ipHash,
        user_agent: userAgent,
        referer,
      }),
      supabase
        .from("campaign_links")
        .select("click_count")
        .eq("id", linkId)
        .maybeSingle()
        .then((r) => {
          if (!r.data) return;
          return supabase
            .from("campaign_links")
            .update({ click_count: (r.data.click_count ?? 0) + 1 })
            .eq("id", linkId);
        }),
    ]);
  } catch {
    // Silent — Click-Log darf den Redirect nie brechen
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!isValidCampaignToken(token)) {
    return NextResponse.redirect(FALLBACK_URL, {
      status: 302,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("campaign_links")
    .select("id, target_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.redirect(FALLBACK_URL, {
      status: 302,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const link = data as CampaignLinkRow;

  // Async Click-Log — kein await, fire-and-forget
  const ip = extractClientIp(request.headers);
  const ipHash = hashIp(ip);
  const ua = trunc(request.headers.get("user-agent"), USER_AGENT_MAX);
  const ref = trunc(request.headers.get("referer"), REFERER_MAX);
  void logClick(link.id, ipHash, ua, ref);

  let redirectUrl: string;
  try {
    redirectUrl = appendUtmIfMissing(link.target_url, {
      utm_source: link.utm_source,
      utm_medium: link.utm_medium,
      utm_campaign: link.utm_campaign,
      utm_content: link.utm_content,
      utm_term: link.utm_term,
    });
  } catch {
    redirectUrl = link.target_url;
  }

  return NextResponse.redirect(redirectUrl, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
