/**
 * Proposal-PDF Server-Proxy (FEAT-553, SLC-553 Hotfix nach QA-Smoke 2026-04-30).
 *
 * Holt eine generierte Proposal-PDF aus dem `proposal-pdfs`-Storage-Bucket
 * via service_role und liefert sie inline aus. Auth-Check: User muss
 * angemeldet sein und Lesezugriff auf das Proposal haben (RLS via
 * SELECT auf proposals).
 *
 * Hintergrund: Supabase-Kong ist extern nicht via Coolify-Proxy erreichbar
 * (`http://supabase-kong:8000` ist Container-DNS). Signed-URLs aus
 * createSignedUrl zeigen auf den internen Hostname und brechen im Browser
 * mit Mixed-Content / DNS-Fehler. Pattern analog `/api/branding/logo`.
 */
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeProposalFilename } from "@/lib/pdf/filename-helper";

const BUCKET = "proposal-pdfs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: proposalId } = await context.params;
  if (!proposalId) {
    return new NextResponse("proposalId fehlt", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return new NextResponse("Nicht angemeldet", { status: 401 });
  }

  const { data: proposal, error: pErr } = await supabase
    .from("proposals")
    .select("id, title, version, pdf_storage_path")
    .eq("id", proposalId)
    .maybeSingle();
  if (pErr || !proposal) {
    return new NextResponse("Angebot nicht gefunden", { status: 404 });
  }
  if (!proposal.pdf_storage_path) {
    return new NextResponse("Kein PDF generiert", { status: 404 });
  }

  const admin = createAdminClient();
  const { data: blob, error: dlErr } = await admin.storage
    .from(BUCKET)
    .download(proposal.pdf_storage_path);
  if (dlErr || !blob) {
    return new NextResponse("PDF-Download fehlgeschlagen", { status: 500 });
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const isTestMode = proposal.pdf_storage_path.endsWith(".testmode.pdf");
  const filename = sanitizeProposalFilename(
    proposal.title,
    proposal.version,
    isTestMode,
  );

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
