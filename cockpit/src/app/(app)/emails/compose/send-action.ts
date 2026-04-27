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
import { getBrandingForSend } from "@/app/(app)/settings/branding/actions";
import { renderBrandedHtml } from "@/lib/email/render";
import { sendEmailWithTracking } from "@/lib/email/send";
import { resolveVarsFromDeal } from "@/lib/email/variables";
import { createFollowUpTask } from "@/app/(app)/aufgaben/actions";

export type SendComposedEmailInput = {
  to: string;
  subject: string;
  body: string;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  templateId?: string | null;
  followUpDate?: string | null;
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
  });

  if (!result.success) {
    return { success: false, error: result.error ?? "Unbekannter Fehler beim Senden." };
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
