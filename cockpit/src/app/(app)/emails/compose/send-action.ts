"use server";

// =============================================================
// sendComposedEmail — Server Action fuer das Composing-Studio (SLC-534 MT-4)
// =============================================================
// 1. Validiert Pflichtfelder
// 2. Laedt Branding + Deal-Vars serverseitig (authoritative — kein Client-Trust)
// 3. Rendert HTML via renderBrandedHtml (DEC-095 Single-Source-of-Truth)
// 4. Ruft sendEmailWithTracking mit pre-built html
// 5. Auto-Follow-up-Task analog zu actions.ts.sendEmail
//
// HTML wird hier server-seitig gerendert. Tracking-Pixel + Link-Wrapping
// werden in sendEmailWithTracking via injectTracking ergaenzt — Live-Preview
// rendert ohne Tracking, finale Mail mit. Dadurch Bit-Identitaet-Garantie aus
// DEC-095 ohne den Tracking-Layer.

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBrandingForSend } from "@/app/(app)/settings/branding/actions";
import { renderBrandedHtml } from "@/lib/email/render";
import { sendEmailWithTracking } from "@/lib/email/send";
import { resolveVarsFromDeal } from "@/lib/email/variables";
import { createFollowUpTask } from "@/app/(app)/aufgaben/actions";
import {
  validateAttachment,
  type AttachmentMeta,
} from "@/lib/email/attachments-whitelist";
import { transitionProposalStatus } from "@/app/(app)/proposals/actions";

export type SendComposedEmailInput = {
  to: string;
  subject: string;
  body: string;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  templateId?: string | null;
  followUpDate?: string | null;
  /** SLC-542: Anhang-Liste aus Compose-Form. Default leer = V5.3-Verhalten. */
  attachments?: AttachmentMeta[];
};

export type SendComposedEmailResult = {
  success: boolean;
  emailId?: string;
  trackingId?: string;
  warning?: string;
  error?: string;
};

async function loadVarsForDeal(dealId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select(
      `
      title,
      contact:contacts(first_name, last_name, position),
      company:companies(name)
    `,
    )
    .eq("id", dealId)
    .maybeSingle();

  if (error || !data) return null;

  const contact = (data.contact as unknown as {
    first_name: string | null;
    last_name: string | null;
    position: string | null;
  } | null) ?? null;
  const company = (data.company as unknown as { name: string | null } | null) ?? null;

  return resolveVarsFromDeal(
    { title: (data.title as string | null) ?? null, name: null },
    contact,
    company,
  );
}

export async function sendComposedEmail(
  input: SendComposedEmailInput,
): Promise<SendComposedEmailResult> {
  const to = input.to?.trim() ?? "";
  const subject = input.subject?.trim() ?? "";
  const body = input.body ?? "";

  if (!to) return { success: false, error: "Empfaenger fehlt." };
  if (!subject) return { success: false, error: "Betreff fehlt." };

  const branding = await getBrandingForSend();
  const vars = input.dealId ? (await loadVarsForDeal(input.dealId)) ?? {} : {};
  const html = renderBrandedHtml(body, branding, vars);

  // SLC-542 + SLC-555: Anhang-Liste defensiv re-validieren (Server-Trust
  // nicht 100% Client). Diskriminator-Pattern (DEC-108):
  //   - source_type='upload' (Default) → MIME/Ext/Size-Whitelist re-checken
  //   - source_type='proposal' → MIME muss application/pdf sein, proposalId
  //     ist Pflicht, kein Re-Whitelist-Check (PDFs sind ohnehin whitelisted,
  //     sizeBytes ist 0/unbekannt)
  const safeAttachments: AttachmentMeta[] = [];
  let runningTotal = 0;
  if (Array.isArray(input.attachments)) {
    for (const att of input.attachments) {
      if (
        !att ||
        typeof att.storagePath !== "string" ||
        typeof att.filename !== "string" ||
        typeof att.mimeType !== "string" ||
        typeof att.sizeBytes !== "number"
      ) {
        return { success: false, error: "Anhang-Metadaten ungueltig." };
      }
      const sourceType = att.source_type ?? "upload";
      if (sourceType === "proposal") {
        if (typeof att.proposalId !== "string" || !att.proposalId) {
          return {
            success: false,
            error: "Proposal-Anhang ohne proposalId — Datenintegritaet verletzt.",
          };
        }
        if (att.mimeType !== "application/pdf") {
          return {
            success: false,
            error: "Proposal-Anhang muss MIME-Type application/pdf haben.",
          };
        }
        // Total-Size mitlaufen lassen, falls Send-Pipeline spaeter Limits
        // einfuehrt — bei sizeBytes=0 (unbekannt) hat das keinen Effekt.
        runningTotal += att.sizeBytes;
        safeAttachments.push(att);
        continue;
      }
      const v = validateAttachment(
        { type: att.mimeType, size: att.sizeBytes, name: att.filename },
        runningTotal,
      );
      if (!v.ok) {
        return { success: false, error: v.error };
      }
      runningTotal += att.sizeBytes;
      safeAttachments.push(att);
    }
  }

  const result = await sendEmailWithTracking({
    to,
    subject,
    body,
    html,
    contactId: input.contactId ?? null,
    companyId: input.companyId ?? null,
    dealId: input.dealId ?? null,
    followUpDate: input.followUpDate ?? null,
    templateUsed: input.templateId ?? null,
    trackingEnabled: true,
    attachments: safeAttachments.length > 0
      ? safeAttachments.map((a) => ({
          storagePath: a.storagePath,
          filename: a.filename,
          mimeType: a.mimeType,
          source_type: a.source_type ?? "upload",
        }))
      : undefined,
  });

  if (!result.success) {
    return { success: false, error: result.error ?? "Unbekannter Fehler beim Senden." };
  }

  // SLC-542 + SLC-555: Junction-Rows fuer den erfolgreichen Send anlegen
  // (DEC-097, DEC-108). source_type + proposal_id werden jetzt aus den
  // Anhang-Metadaten geschrieben — der CHECK-Constraint aus MIG-026
  // verhindert invalid Kombinationen (upload+proposal_id oder proposal+NULL).
  // Bei Insert-Fehler: Mail ist schon raus, deshalb nur Warning loggen,
  // nicht den Send-Erfolg invalidieren.
  if (safeAttachments.length > 0 && result.emailId) {
    try {
      const admin = createAdminClient();
      const rows = safeAttachments.map((a) => {
        const sourceType = a.source_type ?? "upload";
        return {
          email_id: result.emailId,
          storage_path: a.storagePath,
          filename: a.filename,
          mime_type: a.mimeType,
          size_bytes: a.sizeBytes,
          source_type: sourceType,
          proposal_id: sourceType === "proposal" ? a.proposalId ?? null : null,
        };
      });
      const { error } = await admin.from("email_attachments").insert(rows);
      if (error) {
        // Warning, kein Hard-Fail — die Mail ist schon erfolgreich raus.
        console.error("[sendComposedEmail] Junction-Insert fehlgeschlagen:", error.message);
      }
    } catch (err) {
      console.error("[sendComposedEmail] Junction-Insert exception:", err);
    }

    // SLC-555: Status-Auto-Sent fuer alle Proposal-Anhaenge (DEC-108
    // idempotent — wenn Status schon `sent`/`accepted`, kein zusaetzlicher
    // Audit-Eintrag, kein Throw). Reihenfolge: erst Mail erfolgreich (oben
    // verifiziert), dann Status-Transition. Bei Transition-Error: nur Log,
    // Mail-Erfolg bleibt — User kann Status manuell setzen.
    const proposalAtts = safeAttachments.filter(
      (a) => a.source_type === "proposal" && typeof a.proposalId === "string",
    );
    if (proposalAtts.length > 1) {
      console.warn(
        `[sendComposedEmail] Mehrfach-Proposal-Anhang (count=${proposalAtts.length}) — alle erhalten Status-Sent.`,
      );
    }
    for (const att of proposalAtts) {
      try {
        const tr = await transitionProposalStatus(att.proposalId as string, "sent");
        if (!tr.ok) {
          console.warn(
            `[sendComposedEmail] transitionProposalStatus(${att.proposalId},'sent') failed: ${tr.error}`,
          );
        }
      } catch (e) {
        console.error(
          `[sendComposedEmail] transitionProposalStatus(${att.proposalId},'sent') exception:`,
          e,
        );
      }
    }
  }

  if (input.followUpDate) {
    const supabase = await createClient();
    const contactName = input.contactId
      ? await getContactName(supabase, input.contactId)
      : null;
    await createFollowUpTask({
      title: contactName
        ? `Follow-up: ${contactName} (${subject})`
        : `Follow-up: ${subject}`,
      description: `Automatische Wiedervorlage nach E-Mail "${subject}"`,
      due_date: input.followUpDate,
      contact_id: input.contactId ?? null,
      company_id: input.companyId ?? null,
      deal_id: input.dealId ?? null,
    });
  }

  if (input.contactId) revalidatePath(`/contacts/${input.contactId}`);
  if (input.dealId) revalidatePath(`/deals/${input.dealId}`);
  revalidatePath("/emails");

  return {
    success: true,
    emailId: result.emailId,
    trackingId: result.trackingId,
    warning: result.warning,
  };
}

async function getContactName(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  contactId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("contacts")
    .select("first_name, last_name")
    .eq("id", contactId)
    .single();
  if (!data) return null;
  return `${data.first_name} ${data.last_name}`.trim();
}
