/**
 * Inbound-E-Mail-Body-Route (SLC-915 MT-6, ISSUE-139 / DEC-306).
 *
 * Liefert das sanitisierte HTML einer Inbound-Mail MIT Remote-Bildern als
 * eigenstaendiges Dokument mit route-scoped CSP aus — Ziel des iframe-`src` im
 * loaded-State (opt-in „Bilder laden"). Kein Server-Proxy: der Browser laedt
 * die Bilder direkt; wir laden keine Tracking-Pixel serverseitig. Die globale
 * App-CSP (SLC-910 enforce) bleibt unberuehrt, weil die Bild-Lockerung nur in
 * diesem einen Response-Header lebt.
 *
 * Auth: User muss angemeldet sein; body_html wird RLS-scoped ueber den
 * User-Client geladen (fremde email_messages.id -> kein Body -> 404).
 * Quelle = `email_messages` (Inbound-Viewer-Entity, InboxEmail extends
 * EmailMessage; getInboxEmails/getEmailDetail selektieren aus email_messages).
 *
 * GET /api/emails/[id]/body -> 200 text/html | 400 | 401 | 404
 */
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { sanitizeEmailHtml } from "@/lib/email/sanitize-email-html";
import { buildEmailDocument } from "@/lib/email/email-frame";

// Route-scoped CSP: nur Bilder (https/data/blob/cid) + Inline-Styles fuer die
// Frame-Styles; kein Script, keine sonstige Origin. Verschaerft, nicht globaler.
const BODY_CSP =
  "default-src 'none'; img-src https: data: blob: cid:; style-src 'unsafe-inline'; font-src 'self'";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return new NextResponse("id fehlt", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return new NextResponse("Nicht angemeldet", { status: 401 });
  }

  const { data: email, error } = await supabase
    .from("email_messages")
    .select("body_html")
    .eq("id", id)
    .maybeSingle();
  if (error || !email) {
    return new NextResponse("E-Mail nicht gefunden", { status: 404 });
  }

  const sanitized = sanitizeEmailHtml(email.body_html ?? "", {
    blockRemoteImages: false,
  });
  const doc = buildEmailDocument(sanitized);

  return new NextResponse(doc, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": BODY_CSP,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
