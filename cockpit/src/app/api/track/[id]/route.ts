/**
 * Tracking-API-Route — /api/track/[id] (FEAT-506, DEC-066)
 *
 * Oeffentlicher Endpoint (kein Auth) fuer Open- und Click-Tracking.
 * - GET ?t=open → 1x1 transparent GIF + DB-INSERT
 * - GET ?t=click&url=X&idx=N → DB-INSERT + 302 Redirect
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// 1x1 transparent GIF (43 bytes)
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: trackingId } = await params;
  const { searchParams } = request.nextUrl;
  const eventType = searchParams.get("t");

  if (!trackingId || !eventType) {
    return new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: { "Content-Type": "image/gif", "Cache-Control": "no-cache, no-store" },
    });
  }

  const supabase = createAdminClient();

  // Lookup email_id by tracking_id
  const { data: email } = await supabase
    .from("emails")
    .select("id")
    .eq("tracking_id", trackingId)
    .single();

  if (email) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               request.headers.get("x-real-ip") ||
               "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    if (eventType === "open") {
      await supabase.from("email_tracking_events").insert({
        tracking_id: trackingId,
        email_id: email.id,
        event_type: "open",
        ip_address: ip,
        user_agent: userAgent,
      });
    } else if (eventType === "click") {
      const linkUrl = searchParams.get("url");
      const linkIndex = searchParams.get("idx");

      await supabase.from("email_tracking_events").insert({
        tracking_id: trackingId,
        email_id: email.id,
        event_type: "click",
        link_url: linkUrl || null,
        link_index: linkIndex ? parseInt(linkIndex, 10) : null,
        ip_address: ip,
        user_agent: userAgent,
      });

      // Redirect to original URL
      if (linkUrl) {
        return NextResponse.redirect(linkUrl, 302);
      }
    }
  }

  // Default: return tracking pixel (for open events, or fallback)
  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
