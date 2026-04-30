"use server";

// =============================================================
// SLC-555 — Composing-Studio Proposal-Anhang Server Action
// =============================================================
// `attachProposalToCompose` haengt ein bestehendes Angebot-PDF (aus dem
// `proposal-pdfs`-Bucket) als E-Mail-Anhang an die laufende Compose-Session.
// Es passiert noch KEIN Junction-Insert — der Insert in `email_attachments`
// laeuft erst beim Send (consistent zum V5.4 PC-Upload-Pfad).
//
// Validierungen:
//   - Auth (Login)
//   - Proposal existiert (RLS implicit — User sieht nur eigene)
//   - PDF wurde generiert (`pdf_storage_path != NULL`); sonst klare
//     Fehlermeldung an User: "PDF noch nicht generiert"
//
// Filename folgt SLC-553 Pattern via `sanitizeProposalFilename` —
// Single-Source-of-Truth, identisch zum Workspace-Download. Test-Mode
// wird aus dem persistierten Pfad (`.testmode.pdf`-Suffix) abgeleitet.
//
// Cross-Deal-Block ist NICHT explizit hier — RLS auf `proposals` deckt
// den Cross-Tenant-/Cross-User-Schutz ab. Defensive `if (!proposal)`
// genuegt fuer den User-flow.

import { createClient } from "@/lib/supabase/server";
import { sanitizeProposalFilename } from "@/lib/pdf/filename-helper";
import { parseProposalPdfPath } from "@/lib/pdf/proposal-pdf-path";
import type { AttachmentMeta } from "@/lib/email/attachments-whitelist";

export type AttachProposalInput = {
  composeSessionId: string;
  proposalId: string;
};

export type AttachProposalResult =
  | { ok: true; attachment: AttachmentMeta }
  | { ok: false; error: string };

export async function attachProposalToCompose(
  input: AttachProposalInput,
): Promise<AttachProposalResult> {
  const composeSessionId = (input.composeSessionId ?? "").trim();
  const proposalId = (input.proposalId ?? "").trim();

  if (!composeSessionId) {
    return { ok: false, error: "composeSessionId fehlt." };
  }
  if (!proposalId) {
    return { ok: false, error: "proposalId fehlt." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Nicht angemeldet." };
  }

  const { data: proposal, error: pErr } = await supabase
    .from("proposals")
    .select("id, deal_id, title, version, pdf_storage_path")
    .eq("id", proposalId)
    .maybeSingle();

  if (pErr || !proposal) {
    return { ok: false, error: "Angebot nicht gefunden." };
  }

  if (!proposal.pdf_storage_path) {
    return {
      ok: false,
      error:
        "PDF wurde noch nicht generiert. Bitte zuerst im Workspace PDF generieren.",
    };
  }

  // Filename basiert primaer auf Deal-Title (Empfaenger-freundlicher), faellt
  // auf Proposal-Title zurueck wenn kein Deal verknuepft ist.
  let filenameBaseTitle: string | null = proposal.title as string | null;
  if (proposal.deal_id) {
    const { data: deal } = await supabase
      .from("deals")
      .select("title")
      .eq("id", proposal.deal_id)
      .maybeSingle();
    if (deal?.title) filenameBaseTitle = deal.title as string;
  }

  // Test-Mode aus persistiertem Storage-Pfad ableiten — Filename muss zu
  // tatsaechlich vorliegender PDF passen (Pfad und Filename sind beide an
  // den `.testmode`-Suffix gebunden, siehe SLC-553).
  const parsed = parseProposalPdfPath(proposal.pdf_storage_path as string);
  const isTestMode = parsed?.isTestMode ?? false;

  const filename = sanitizeProposalFilename(
    filenameBaseTitle,
    proposal.version as number,
    isTestMode,
  );

  return {
    ok: true,
    attachment: {
      storagePath: proposal.pdf_storage_path as string,
      filename,
      mimeType: "application/pdf",
      // SizeBytes ist beim Anhaengen nicht trivial verfuegbar (Storage-
      // Metadata-Roundtrip waere extra Latenz, ohne echten Mehrwert —
      // Send-Pipeline laedt den Buffer ohnehin frisch). 0 ist "unknown".
      sizeBytes: 0,
      source_type: "proposal",
      proposalId: proposal.id as string,
    },
  };
}
